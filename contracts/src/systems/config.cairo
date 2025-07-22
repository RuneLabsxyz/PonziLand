// @notice Configuration system interface for PonziLand.
// Allows the contract owner to update global economic and gameplay parameters.
// Each setter updates a specific field in the Config model, which is then used by core game logic
// in systems such as actions, taxes, and staking.
#[starknet::interface]
trait IConfigSystem<T> {
    /// @notice Set the full config.
    /// @param the entire config model.
    /// Only the owner can call it.
    fn set_full_config(
        ref self: T,
        grid_width: u8,
        tax_rate: u8,
        base_time: u16,
        price_decrease_rate: u8,
        time_speed: u8,
        max_auctions: u8,
        max_auctions_from_bid: u8,
        decay_rate: u16,
        floor_price: u256,
        liquidity_safety_multiplier: u8,
        min_auction_price: u256,
        min_auction_price_multiplier: u8,
        center_location: u16,
        auction_duration: u32,
        scaling_factor: u8,
        linear_decay_time: u16,
        drop_rate: u8,
        rate_denominator: u8,
        max_circles: u16,
    );

    /// @notice Sets the grid width, which determines the size of the land map.
    /// @param value The new grid width (number of tiles per row/column).
    /// Used throughout the game to validate land positions and compute neighbor relationships (see
    /// actions.cairo).
    fn set_grid_width(ref self: T, value: u16);

    /// @notice Sets the tax rate applied to land and transaction operations.
    /// @param value The new tax rate (percent).
    /// Used in tax calculation logic in helpers/taxes.cairo and components/taxes.cairo.
    fn set_tax_rate(ref self: T, value: u16);

    /// @notice Sets the base time parameter, which is used as a reference for time-based mechanics.
    /// @param value The new base time (in seconds).
    /// Controls the base time
    fn set_base_time(ref self: T, value: u16);

    /// @notice Sets the price decrease rate for auctions.
    /// @param value The new price decrease rate.
    /// Determines how quickly auction prices decay over time (see auction.cairo).
    fn set_price_decrease_rate(ref self: T, value: u16);

    /// @notice Sets the global time speed factor.
    /// @param value The new time speed multiplier.
    /// Used to accelerate or decelerate all time-based events in the game (affects claims,
    /// auctions, etc.).
    fn set_time_speed(ref self: T, value: u32);

    /// @notice Sets the maximum number of auctions allowed simultaneously.
    /// @param value The new maximum number of concurrent auctions.
    /// Used to limit auction activity and manage game pacing.
    fn set_max_auctions(ref self: T, value: u8);

    /// @notice Sets the maximum number of auctions that can be created from a single bid.
    /// @param value The new maximum auctions from bid.
    /// Used in advanced auction logic to prevent abuse or excessive expansion.
    fn set_max_auctions_from_bid(ref self: T, value: u8);

    /// @notice Sets the decay rate for land price or yield.
    /// @param value The new decay rate.
    /// Used in land value/yield calculations, affecting how quickly land becomes less valuable if
    /// unclaimed (see actions.cairo, helpers/taxes.cairo).
    fn set_decay_rate(ref self: T, value: u16);

    /// @notice Sets the global floor price for auctions and land.
    /// @param value The new minimum price.
    /// Ensures that land/auction prices do not fall below a certain threshold.
    fn set_floor_price(ref self: T, value: u256);

    /// @notice Sets the liquidity safety multiplier, used in staking and liquidity pool
    /// calculations.
    /// @param value The new liquidity safety multiplier.
    /// Used in staking logic to determine minimum required liquidity for actions (see
    /// components/stake.cairo).
    fn set_liquidity_safety_multiplier(ref self: T, value: u8);

    /// @notice Sets the minimum auction price.
    /// @param value The new minimum auction price (as u256).
    /// Used to prevent auctions from being created with too low a starting price.
    fn set_min_auction_price(ref self: T, value: u256);

    /// @notice Sets the multiplier used to determine the minimum asking price for new auctions.
    /// @param value The new multiplier (as an integer).
    /// This value is used to compute the minimum price for new auctions based on the last sale
    /// price.
    /// If the calculated price is below the configured minimum auction price, the minimum is used
    /// instead.
    /// This helps prevent underpriced auctions and stabilizes the in-game economy.
    fn set_min_auction_price_multiplier(ref self: T, value: u8);

    /// @notice Sets the center location of the grid, used for special events or calculations.
    /// @param value The new center location (tile index).
    /// Used in expansion logic and initial placement.
    fn set_center_location(ref self: T, value: u16);

    /// @notice Sets the auction duration.
    /// @param value The new auction duration (in seconds or ticks).
    /// Determines how long each auction lasts until become free.
    fn set_auction_duration(ref self: T, value: u32);

    /// @notice Sets the scaling factor for the auction decay rate.
    /// @param value The new scaling factor.
    /// This scales the decay rate (k) in the price decay formula:
    /// k = (decay_rate * DECIMALS_FACTOR) / scaling_factor
    fn set_scaling_factor(ref self: T, value: u8);

    /// @notice Sets the initial linear decay period for auction prices.
    /// @param value The new linear decay time (in seconds).
    /// During this period, auction prices decrease linearly from start_price.
    /// After this period, prices follow an exponential decay curve.
    fn set_linear_decay_time(ref self: T, value: u16);

    /// @notice Sets the drop rate for auction price calculations.
    /// @param value The new drop rate.
    /// This parameter determines the percentage of price reduction during the linear decay phase.
    /// It's used in conjunction with rate_denominator to calculate exact price reductions.
    fn set_drop_rate(ref self: T, value: u8);

    /// @notice Sets the denominator used in auction price calculations.
    /// @param value The new rate denominator.
    /// This parameter is used as the denominator in all auction price calculations.
    /// It's paired with drop_rate to calculate exact percentages:
    /// actual_percentage = drop_rate / rate_denominator
    fn set_rate_denominator(ref self: T, value: u8);

    /// @notice Sets the maximum number of circles that can be created.
    /// @param value The new maximum number of circles.
    /// Used to limit the number of lands that can be created in the game.
    fn set_max_circles(ref self: T, value: u16);

    // Getters
    fn get_grid_width(self: @T) -> u16;
    fn get_tax_rate(self: @T) -> u16;
    fn get_base_time(self: @T) -> u16;
    fn get_price_decrease_rate(self: @T) -> u16;
    fn get_time_speed(self: @T) -> u32;
    fn get_max_auctions(self: @T) -> u8;
    fn get_max_auctions_from_bid(self: @T) -> u8;
    fn get_decay_rate(self: @T) -> u16;
    fn get_floor_price(self: @T) -> u256;
    fn get_liquidity_safety_multiplier(self: @T) -> u8;
    fn get_min_auction_price(self: @T) -> u256;
    fn get_min_auction_price_multiplier(self: @T) -> u8;
    fn get_center_location(self: @T) -> u16;
    fn get_auction_duration(self: @T) -> u32;
    fn get_scaling_factor(self: @T) -> u8;
    fn get_linear_decay_time(self: @T) -> u16;
    fn get_drop_rate(self: @T) -> u8;
    fn get_rate_denominator(self: @T) -> u8;
    fn get_max_circles(self: @T) -> u16;
}

#[dojo::contract]
mod config {
    use super::IConfigSystem;
    use ponzi_land::models::config::{Config, ConfigTrait};
    use dojo::world::{WorldStorage};
    use dojo::model::{ModelStorage, ModelValueStorage, Model};
    use dojo::event::EventStorage;
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};
    use ponzi_land::interfaces::systems::{SystemsTrait};


    #[derive(Drop, Serde)]
    #[dojo::event]
    struct ConfigUpdated {
        #[key]
        field: felt252,
        new_value: felt252,
    }

    fn dojo_init(
        ref self: ContractState,
        grid_width: u8,
        tax_rate: u8,
        base_time: u16,
        price_decrease_rate: u8,
        time_speed: u8,
        max_auctions: u8,
        max_auctions_from_bid: u8,
        decay_rate: u16,
        floor_price: u256,
        liquidity_safety_multiplier: u8,
        min_auction_price: u256,
        min_auction_price_multiplier: u8,
        center_location: u16,
        auction_duration: u32,
        scaling_factor: u8,
        linear_decay_time: u16,
        drop_rate: u8,
        rate_denominator: u8,
        max_circles: u16,
    ) {
        let mut world = self.world_default();
        let init_config: Config = ConfigTrait::new(
            grid_width,
            tax_rate,
            base_time,
            price_decrease_rate,
            time_speed,
            max_auctions,
            max_auctions_from_bid,
            decay_rate,
            floor_price,
            liquidity_safety_multiplier,
            min_auction_price,
            min_auction_price_multiplier,
            center_location,
            auction_duration,
            scaling_factor,
            linear_decay_time,
            drop_rate,
            rate_denominator,
            max_circles,
        );
        world.write_model(@init_config);
    }

    #[abi(embed_v0)]
    // Setters
    impl ConfigSystemImpl of IConfigSystem<ContractState> {
        fn set_full_config(
            ref self: ContractState,
            grid_width: u8,
            tax_rate: u8,
            base_time: u16,
            price_decrease_rate: u8,
            time_speed: u8,
            max_auctions: u8,
            max_auctions_from_bid: u8,
            decay_rate: u16,
            floor_price: u256,
            liquidity_safety_multiplier: u8,
            min_auction_price: u256,
            min_auction_price_multiplier: u8,
            center_location: u16,
            auction_duration: u32,
            scaling_factor: u8,
            linear_decay_time: u16,
            drop_rate: u8,
            rate_denominator: u8,
            max_circles: u16,
        ) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            let new_config: Config = ConfigTrait::new(
                grid_width,
                tax_rate,
                base_time,
                price_decrease_rate,
                time_speed,
                max_auctions,
                max_auctions_from_bid,
                decay_rate,
                floor_price,
                liquidity_safety_multiplier,
                min_auction_price,
                min_auction_price_multiplier,
                center_location,
                auction_duration,
                scaling_factor,
                linear_decay_time,
                drop_rate,
                rate_denominator,
                max_circles,
            );
            world.write_model(@new_config);
        }

        fn set_grid_width(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("grid_width"), value);
            world.emit_event(@ConfigUpdated { field: 'grid_width', new_value: value.into() });
        }

        fn set_tax_rate(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("tax_rate"), value);
            world.emit_event(@ConfigUpdated { field: 'tax_rate', new_value: value.into() });
        }

        fn set_base_time(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("base_time"), value);
            world.emit_event(@ConfigUpdated { field: 'base_time', new_value: value.into() });
        }

        fn set_price_decrease_rate(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("price_decrease_rate"), value,
                );
            world
                .emit_event(
                    @ConfigUpdated { field: 'price_decrease_rate', new_value: value.into() },
                );
        }

        fn set_time_speed(ref self: ContractState, value: u32) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("time_speed"), value);
            world.emit_event(@ConfigUpdated { field: 'time_speed', new_value: value.into() });
        }

        fn set_max_auctions(ref self: ContractState, value: u8) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("max_auctions"), value);
            world.emit_event(@ConfigUpdated { field: 'max_auctions', new_value: value.into() });
        }

        fn set_max_auctions_from_bid(ref self: ContractState, value: u8) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("max_auctions_from_bid"), value,
                );
            world
                .emit_event(
                    @ConfigUpdated { field: 'max_auctions_from_bid', new_value: value.into() },
                );
        }

        fn set_decay_rate(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("decay_rate"), value);
            world.emit_event(@ConfigUpdated { field: 'decay_rate', new_value: value.into() });
        }

        fn set_floor_price(ref self: ContractState, value: u256) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("floor_price"), value);
            world
                .emit_event(
                    @ConfigUpdated { field: 'floor_price', new_value: value.try_into().unwrap() },
                );
        }

        fn set_liquidity_safety_multiplier(ref self: ContractState, value: u8) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1),
                    selector!("liquidity_safety_multiplier"),
                    value,
                );
            world
                .emit_event(
                    @ConfigUpdated {
                        field: 'liquidity_safety_multiplier', new_value: value.into(),
                    },
                );
        }

        fn set_min_auction_price(ref self: ContractState, value: u256) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("min_auction_price"), value,
                );
            world
                .emit_event(
                    @ConfigUpdated {
                        field: 'min_auction_price', new_value: value.try_into().unwrap(),
                    },
                );
        }

        fn set_min_auction_price_multiplier(ref self: ContractState, value: u8) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1),
                    selector!("min_auction_price_multiplier"),
                    value,
                );
            world
                .emit_event(
                    @ConfigUpdated {
                        field: 'min_auction_price_multiplier', new_value: value.into(),
                    },
                );
        }

        fn set_center_location(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("center_location"), value,
                );
            world.emit_event(@ConfigUpdated { field: 'center_location', new_value: value.into() });
        }

        fn set_auction_duration(ref self: ContractState, value: u32) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("auction_duration"), value,
                );
            world.emit_event(@ConfigUpdated { field: 'auction_duration', new_value: value.into() });
        }

        fn set_scaling_factor(ref self: ContractState, value: u8) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("scaling_factor"), value,
                );
            world.emit_event(@ConfigUpdated { field: 'scaling_factor', new_value: value.into() });
        }

        fn set_linear_decay_time(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("linear_decay_time"), value,
                );
            world
                .emit_event(@ConfigUpdated { field: 'linear_decay_time', new_value: value.into() });
        }

        fn set_drop_rate(ref self: ContractState, value: u8) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("drop_rate"), value);
            world.emit_event(@ConfigUpdated { field: 'drop_rate', new_value: value.into() });
        }

        fn set_rate_denominator(ref self: ContractState, value: u8) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world
                .write_member(
                    Model::<Config>::ptr_from_keys(1), selector!("rate_denominator"), value,
                );
            world.emit_event(@ConfigUpdated { field: 'rate_denominator', new_value: value.into() });
        }

        fn set_max_circles(ref self: ContractState, value: u16) {
            let mut world = self.world_default();
            assert(world.auth_dispatcher().get_owner() == get_caller_address(), 'not the owner');
            world.write_member(Model::<Config>::ptr_from_keys(1), selector!("max_circles"), value);
            world.emit_event(@ConfigUpdated { field: 'max_circles', new_value: value.into() });
        }

        // Getters implementation
        fn get_grid_width(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("grid_width"))
        }

        fn get_tax_rate(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("tax_rate"))
        }

        fn get_base_time(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("base_time"))
        }

        fn get_price_decrease_rate(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("price_decrease_rate"))
        }

        fn get_time_speed(self: @ContractState) -> u32 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("time_speed"))
        }

        fn get_max_auctions(self: @ContractState) -> u8 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("max_auctions"))
        }

        fn get_max_auctions_from_bid(self: @ContractState) -> u8 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("max_auctions_from_bid"))
        }

        fn get_decay_rate(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("decay_rate"))
        }

        fn get_floor_price(self: @ContractState) -> u256 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("floor_price"))
        }

        fn get_liquidity_safety_multiplier(self: @ContractState) -> u8 {
            let world = self.world_default();
            world
                .read_member(
                    Model::<Config>::ptr_from_keys(1), selector!("liquidity_safety_multiplier"),
                )
        }

        fn get_min_auction_price(self: @ContractState) -> u256 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("min_auction_price"))
        }

        fn get_min_auction_price_multiplier(self: @ContractState) -> u8 {
            let world = self.world_default();
            world
                .read_member(
                    Model::<Config>::ptr_from_keys(1), selector!("min_auction_price_multiplier"),
                )
        }

        fn get_center_location(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("center_location"))
        }

        fn get_auction_duration(self: @ContractState) -> u32 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("auction_duration"))
        }

        fn get_scaling_factor(self: @ContractState) -> u8 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("scaling_factor"))
        }

        fn get_linear_decay_time(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("linear_decay_time"))
        }

        fn get_drop_rate(self: @ContractState) -> u8 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("drop_rate"))
        }

        fn get_rate_denominator(self: @ContractState) -> u8 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("rate_denominator"))
        }

        fn get_max_circles(self: @ContractState) -> u16 {
            let world = self.world_default();
            world.read_member(Model::<Config>::ptr_from_keys(1), selector!("max_circles"))
        }
    }
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }
    }
}
