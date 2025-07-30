/// @title Auction Management Component for PonziLand
/// @notice This component manages the complete auction lifecycle for unowned lands in PonziLand.
/// It implements a Dutch auction system with dynamic price decay, circle-based land expansion,
/// and automated auction generation to maintain game economy balance.
/// The auction system ensures fair land distribution while preventing auction flooding by
/// implementing maximum auction limits and intelligent land selection algorithms.

#[starknet::component]
pub mod AuctionComponent {
    use dojo::world::WorldStorage;
    use dojo::event::EventStorage;
    use starknet::ContractAddress;
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Vec, VecTrait,
        MutableVecTrait,
    };
    use core::dict::{Felt252Dict, Felt252DictTrait, Felt252DictEntryTrait};

    use ponzi_land::models::auction::{Auction, AuctionTrait};
    use ponzi_land::models::land::Land;
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::utils::get_neighbors::{get_average_price};
    use ponzi_land::helpers::auction::{get_sell_price_for_new_auction_from_bid};
    use ponzi_land::helpers::circle_expansion::{
        get_circle_land_position, get_random_available_index, lands_per_section,
    };


    #[storage]
    struct Storage {
        active_auctions: u8,
        active_auction_queue: Map<u16, bool>,
        used_lands_in_circle: Map<(u16, u8), Vec<u16>>,
        current_circle: u16,
        current_section: Map<u16, u8>,
        completed_lands_per_section: Map<(u16, u8), u16>,
    }


    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct NewAuctionEvent {
        #[key]
        land_location: u16,
        start_price: u256,
        floor_price: u256,
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct AuctionFinishedEvent {
        #[key]
        land_location: u16,
        buyer: ContractAddress,
        final_price: u256,
    }

    #[generate_trait]
    impl InternalImpl<TContractState> of InternalTrait<TContractState> {
        /// @notice Initializes circle expansion starting at circle 1, section 0
        /// @dev Circle 0 is reserved for center land, expansion begins outward from there
        fn initialize_circle_expansion(ref self: ComponentState<TContractState>) {
            self.current_circle.write(1);
            self.current_section.write(1, 0);
        }
        /// @notice Creates new auction for unowned land with price validation
        /// @dev Bypasses max auction limit if from nuke to ensure immediate land availability
        /// @param is_from_nuke True if auction created from nuked land, skips auction limit check
        fn create(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            land_location: u16,
            start_price: u256,
            floor_price: u256,
            is_from_nuke: bool,
        ) {
            assert(start_price > 0, 'start_price > 0');
            assert(floor_price > 0, 'floor_price > 0');

            // Don't create auction if max auctions reached (unless from nuke)
            if (!is_from_nuke && self.active_auctions.read() >= store.get_max_auctions()) {
                return;
            }
            let mut land = store.land(land_location);
            assert(land.owner == ContractAddressZeroable::zero(), 'must be without owner');
            let auction = AuctionTrait::new(land_location, start_price, floor_price, false);

            land.sell_price = start_price;
            land.token_used = store.get_main_currency();

            store.set_land(land);
            store.set_auction(auction);
            self.active_auctions.write(self.active_auctions.read() + 1);
            self.active_auction_queue.write(land_location, true);

            store.world.emit_event(@NewAuctionEvent { land_location, start_price, floor_price });
        }

        /// @notice Completes auction by marking as finished and updating counters
        /// @dev Decrements active auction count and removes from queue to free auction slot
        fn finish_auction(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            mut auction: Auction,
            buyer: ContractAddress,
            final_price: u256,
        ) {
            auction.is_finished = true;
            auction.sold_at_price = Option::Some(final_price);
            store.set_auction(auction);

            let mut active_auctions = self.active_auctions.read();
            active_auctions -= 1;
            self.active_auctions.write(active_auctions);
            self.active_auction_queue.write(auction.land_location, false);
            store
                .world
                .emit_event(
                    @AuctionFinishedEvent {
                        land_location: auction.land_location, buyer, final_price,
                    },
                );
        }

        /// @notice Generates new auctions after successful bid to maintain auction availability
        /// @dev Creates auctions using price derived from sold price to maintain economic balance
        fn generate_new_auctions(
            ref self: ComponentState<TContractState>, sold_at_price: u256, store: Store,
        ) {
            let active_auctions = self.active_auctions.read();
            let mut remaining_auctions = store.get_max_auctions() - active_auctions;
            let mut i = 0;
            let current_circle = self.current_circle.read();

            let start_price = get_sell_price_for_new_auction_from_bid(store, sold_at_price);
            while i < store.get_max_auctions_from_bid()
                && remaining_auctions > 0
                && current_circle < store.get_max_circles() {
                let new_auction_location = self.select_next_auction_location(store, current_circle);
                self
                    .create(
                        store, new_auction_location, start_price, store.get_floor_price(), false,
                    );
                i += 1;
                remaining_auctions -= 1;
            }
        }


        /// @notice Selects next land using circle expansion to ensure geographic distribution
        /// @dev Uses random selection within current circle/section to prevent predictability
        fn select_next_auction_location(
            ref self: ComponentState<TContractState>, store: Store, circle: u16,
        ) -> u16 {
            let section = self.current_section.read(circle);
            let section_len = lands_per_section(circle);

            let used_lands = self.get_used_index(circle, section);
            let random_index = get_random_available_index(circle, used_lands);
            self.used_lands_in_circle.entry((circle, section)).append().write(random_index);

            let index = section.into() * section_len + random_index;
            let land_location = get_circle_land_position(circle, index);

            self.handle_circle_completion_and_increment_section(circle, section);
            land_location
        }

        /// @notice Retrieves already used land indices to avoid duplicate selections
        /// @dev Prevents selecting same land twice within a circle section
        fn get_used_index(
            ref self: ComponentState<TContractState>, circle: u16, section: u8,
        ) -> Array<u16> {
            let mut index = array![];
            let vec_len = self.used_lands_in_circle.entry((circle, section)).len();
            let mut i = 0;
            while i < vec_len {
                index.append(self.used_lands_in_circle.entry((circle, section)).at(i).read());
                i += 1;
            };
            index
        }

        /// @notice Manages circle/section progression after land selection
        /// @dev Advances section when full, advances circle when all sections complete
        fn handle_circle_completion_and_increment_section(
            ref self: ComponentState<TContractState>, circle: u16, section: u8,
        ) {
            self.increment_section_count(circle, section);
            self.handle_circle_completion(circle);

            let circle = self.current_circle.read();
            let section = self.current_section.read(circle);
            let section_len = lands_per_section(circle);

            let used_lands = self.get_used_index(circle, section);
            if used_lands.len() == section_len.into() {
                self.advance_section(circle);
            }
        }

        /// @notice Tracks completed lands per section for progression logic
        /// @dev Required to determine when section is full and needs advancement
        fn increment_section_count(
            ref self: ComponentState<TContractState>, circle: u16, section: u8,
        ) {
            let current_section_count = self.completed_lands_per_section.read((circle, section));
            self.completed_lands_per_section.write((circle, section), current_section_count + 1);
        }

        /// @notice Advances to next circle when current circle is fully auctioned
        /// @dev Only advances on section 3 completion (4 sections per circle: 0,1,2,3)
        fn handle_circle_completion(ref self: ComponentState<TContractState>, circle: u16) {
            let section = self.current_section.read(circle);
            let current_section_count = self.completed_lands_per_section.read((circle, section));
            let section_len = lands_per_section(circle);

            if section == 3 && current_section_count >= section_len {
                self.advance_circle(circle);
            }
        }

        /// @notice Moves to next section within current circle
        /// @dev Each circle has 4 sections for balanced land distribution
        fn advance_section(ref self: ComponentState<TContractState>, circle: u16) {
            let section = self.current_section.read(circle);
            self.current_section.write(circle, section + 1);
        }

        /// @notice Moves to next outer circle and resets section to 0
        /// @dev Ensures spiral expansion continues outward from game center
        fn advance_circle(ref self: ComponentState<TContractState>, circle: u16) {
            self.current_circle.write(circle + 1);
            self.current_section.write(circle + 1, 0);
        }

        /// @notice Checks if land currently has active auction
        /// @dev Prevents duplicate auctions and validates auction state
        fn is_auction_active(self: @ComponentState<TContractState>, land_location: u16) -> bool {
            self.active_auction_queue.read(land_location)
        }

        /// @notice Returns current active auction count for limit enforcement
        /// @dev Used to prevent auction flooding and maintain game balance
        fn get_active_auctions_count(self: @ComponentState<TContractState>) -> u8 {
            self.active_auctions.read()
        }
    }
}
