use ponzi_land::models::quest::{Quest, QuestDetails, QuestType};
use starknet::ContractAddress;

#[starknet::interface]
pub trait IQuestSystems<T> {
    fn start_quest(
        ref self: T, land_location: u16, player_name: felt252,
    ) -> u64;
    fn finish_quest(ref self: T, quest_id: u64, token_address: ContractAddress, sell_price: u256, amount_to_stake: u256);
    fn get_quest(self: @T, quest_id: u64) -> (Quest, QuestDetails);
    fn set_land_quest(ref self: T, land_location: u16, game_id: u64);
    fn remove_land_quest(ref self: T, land_location: u16);
    fn get_score(self: @T, quest_id: u64) -> (u32, bool);
    fn get_quest_game_token(self: @T, quest_id: u64) -> (ContractAddress, u64);
    fn get_quest_entry_price(self: @T, location: u16) -> u256;
    fn register_quest_game(ref self: T, world_address: ContractAddress, namespace: ByteArray, game_contract_name: ByteArray, settings_contract_name: ByteArray, settings_id: u32, target_score: u32, quest_type: QuestType, game_name: ByteArray);
}


#[dojo::contract]
pub mod quests {
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use game_components_minigame::interface::{
        IMinigameDispatcher, IMinigameDispatcherTrait, IMinigameTokenDataDispatcher,
        IMinigameTokenDataDispatcherTrait,
    };
    use game_components_minigame::extensions::settings::interface::{
        IMinigameSettingsDispatcher, IMinigameSettingsDispatcherTrait,
    };
    use ponzi_land::models::quest::{
        QuestDetailsCounter, QuestCounter, QuestDetails, Quest, QuestGame, QuestGameCounter,
    };
    use dojo::world::{WorldStorage, WorldStorageTrait, IWorldDispatcher};
    use ponzi_land::models::land::Land;
    use ponzi_land::models::auction::Auction;
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::models::quest::QuestType;
    use ponzi_land::interfaces::quests::{IOneOnOne, IOneOnOneDispatcher, IOneOnOneDispatcherTrait, Status};
    use super::DEFAULT_NS;

    use ponzi_land::components::payable::PayableComponent;

    use ponzi_land::errors::{ERC20_VALIDATE_AMOUNT_BUY};

    component!(path: PayableComponent, storage: payable, event: PayableEvent);

    impl PayableInternalImpl = PayableComponent::PayableImpl<ContractState>;

    const VERSION: felt252 = '0.0.1';


    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        PayableEvent: PayableComponent::Event,
    }


    #[storage]
    struct Storage {
        #[substorage(v0)]
        payable: PayableComponent::Storage,
    }

    fn dojo_init(ref self: ContractState, ref valid_games: Array<QuestGame>) {
        let mut world = self.world(DEFAULT_NS());
        let mut quest_game_count: QuestGameCounter = world.read_model(VERSION);
        let store = StoreTrait::new(world);
        let mut i = 0;
        while i < valid_games.len() {
            let mut game: QuestGame = valid_games[i].clone();
            quest_game_count.count += 1;
            game.id = quest_game_count.count;
            world.write_model(@game);
            i += 1;
        };
        world.write_model(@quest_game_count);
        self.payable.initialize(store.get_main_currency());
    }

    #[abi(embed_v0)]
    pub impl QuestSystemsImpl of super::IQuestSystems<ContractState> {
        

        fn set_land_quest(ref self: ContractState, land_location: u16, game_id: u64) {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");


            let mut land: Land = world.read_model(land_location);

            let caller = get_caller_address();

            let quest_details: QuestDetails = world.read_model(land_location);

            assert!(land.owner == caller, "Player is not the owner of the land");
            assert!(quest_details.capacity == 0, "Land already has a quest");

            let quest_game: QuestGame = world.read_model(game_id);

            let success = create_quest(
                ref self,
                quest_game,
                land_location,
                1000000000000000000, // 10 strk
                1,
                caller
            );

            assert!(success, "Failed to create quest");

        }

        fn remove_land_quest(ref self: ContractState, land_location: u16) {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

            let mut land: Land = world.read_model(land_location);
            assert!(land.owner == get_caller_address(), "Player is not the owner of the land");

            let quest_details: QuestDetails = world.read_model(land_location);

            if quest_details.creator_address != land.owner {
                world.erase_model(@quest_details);
                return;
            }

            assert!(quest_details.participant_count == 0, "Quest has an active participant");
            world.erase_model(@quest_details);
        }

        fn start_quest(
            ref self: ContractState,
            land_location: u16,
            player_name: felt252,
        ) -> u64 {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

            let mut quest_details: QuestDetails = world.read_model(land_location);

            assert(quest_details.capacity > 0, 'Quest details not found');
            assert(
                quest_details.participant_count < quest_details.capacity, 'Quest is at capacity',
            );

            let player_address = get_caller_address();

            assert!(quest_details.creator_address != player_address, "Player is the owner of the quest land");

            let to_us = false; //TODO: this should be true for auction quests, which aren't implemented yet

            // no payments if in test mode
            if store.get_quest_rewards_enabled() {
                validate_and_execute_quest_payment(ref self, quest_details, get_caller_address(), store, to_us);
            }
            
            let mut quest_counter: QuestCounter = world.read_model(VERSION);
            quest_counter.count += 1;
            world.write_model(@quest_counter);

            let quest_game: QuestGame = world.read_model(quest_details.game_id);

            let address_felt:felt252 = quest_game.world_address.into();
            let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
            
            let (game_token_address, _) = minigame_world.dns(@quest_game.game_contract_name).unwrap();

            let game_token_address_felt: felt252 = game_token_address.into();

            let time_to_start = get_block_timestamp();
            let time_to_end = time_to_start + 6000000000;

            let mut game_id: u64 = 0;
            match quest_game.quest_type {
                QuestType::Minigame => {
                    let game_dispatcher = IMinigameDispatcher {
                        contract_address: game_token_address,
                    };
                    game_id = game_dispatcher
                        .mint_game(
                            Option::Some(player_name), //player name
                            Option::Some(quest_game.settings_id), //settings id
                            Option::Some(time_to_start), //start
                            Option::Some(time_to_end), //end
                            Option::None, //objective ids
                            Option::None, //context
                            Option::None, //client url
                            Option::None, //renderer address
                            player_address, //to
                            true, //soulbound
                        );
                },
                QuestType::OneOnOne => {
                    let game_dispatcher = IOneOnOneDispatcher {
                        contract_address: game_token_address,
                    };
                    game_id = game_dispatcher.create_match(
                        quest_details.creator_address,
                        player_address,
                        quest_game.settings_id.into(),
                    );
                },
                _ => {
                    game_id = 0;
                }
            }

            assert!(game_id != 0, "Failed to create game");
            
            let quest = Quest {
                id: quest_counter.count,
                location: quest_details.location,
                creator_address: quest_details.creator_address,
                player_address,
                game_token_id: game_id,
                completed: false,
                expires_at: time_to_end,
            };
            world.write_model(@quest);

            // increment participant count
            quest_details.participant_count += 1;
            world.write_model(@quest_details);

            quest.id
        }

        fn finish_quest(ref self: ContractState, quest_id: u64, token_address: ContractAddress, sell_price: u256, amount_to_stake: u256) {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

            let mut quest: Quest = world.read_model(quest_id);

            assert!(quest.completed == false, "Quest is already completed");
            let mut quest_details: QuestDetails = world.read_model(quest.location);
            let mut land: Land = world.read_model(quest_details.location);

            // if the quest has been deleted due to owner changing
            if quest_details.participant_count == 0 {
                world.erase_model(@quest_details);
                quest.completed = true;
                world.write_model(@quest);
                return;
            }

            if land.owner != quest_details.creator_address {
                world.erase_model(@quest_details);
                quest.completed = true;
                world.write_model(@quest);
                return;
            }

            let quest_game: QuestGame = world.read_model(quest_details.game_id);
            // get score for the token id
            let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
            let (game_token_address, _) = minigame_world.dns(@quest_game.game_contract_name).unwrap();
            let mut claimable = false;
            let mut over = false;
            match quest_game.quest_type {
                QuestType::Minigame => {
                    let game_dispatcher = IMinigameTokenDataDispatcher {
                        contract_address: game_token_address,
                    };
                    let score: u32 = game_dispatcher.score(quest.game_token_id);
                    over = game_dispatcher.game_over(quest.game_token_id);
                    claimable = score >= quest_details.target_score;
                },
                QuestType::OneOnOne => {
                    let game_dispatcher = IOneOnOneDispatcher {
                        contract_address: game_token_address,
                    };
                    let status: Status = game_dispatcher.settle_match(quest.game_token_id.into());
                    match status {
                        Status::Winner(winner) => {
                            claimable = winner == quest.player_address;
                            over = true;
                        },
                        Status::Active => {
                            claimable = false;
                        },
                        _ => {
                            claimable = false;
                            over = true;
                        }
                    }
                },
                _ => {
                    claimable = false;
                    over = true;
                }
            }
            if !claimable && (over || get_block_timestamp() > quest.expires_at) {
                quest_details.participant_count -= 1;
                world.write_model(@quest_details);
                quest.completed = true;
                world.write_model(@quest);
                return;
            }

            // check if the score is greater than or equal to the target score
            assert!(
                claimable,
                "Quest {} is not completed",
                quest_id,
            );

            if store.get_quest_rewards_enabled() {
                //TODO: finalize reward logic. If transfering land then make sure to refund stake and verify new sell price/stake
                // or if giving a % of the sell price then make sure to handle that and checking for nuke and everything
                land.owner = quest.player_address;
                world.write_model(@land);
            }
            // set quest as completed
            quest.completed = true;
            world.write_model(@quest);

            // delete quest details
            world.erase_model(@quest_details);

            // grant tokens for Reward ??
        // TODO: Add reward logic here
        }

        fn get_quest(self: @ContractState, quest_id: u64) -> (Quest, QuestDetails) {
            let mut world = self.world(DEFAULT_NS());
            let quest: Quest = world.read_model(quest_id);
            let quest_details: QuestDetails = world.read_model(quest.location);
            (quest, quest_details)
        }

        fn get_score(self: @ContractState, quest_id: u64) -> (u32, bool) {
            let mut world = self.world(DEFAULT_NS());
            let quest: Quest = world.read_model(quest_id);
            let quest_details: QuestDetails = world.read_model(quest.location);
            let quest_game: QuestGame = world.read_model(quest_details.game_id);
            let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
            let (game_token_address, _) = minigame_world.dns(@quest_game.game_contract_name).unwrap();
            let mut over = false;
            let game_token_felt: felt252 = game_token_address.into();
            // Check the minigame type and handle accordingly 🐙 Different scoring systems for different game types!
            match quest_game.quest_type {
                QuestType::Minigame => {
                    let game_dispatcher = IMinigameTokenDataDispatcher {
                        contract_address: game_token_address,
                    };
                    let score: u32 = game_dispatcher.score(quest.game_token_id);
                    over = game_dispatcher.game_over(quest.game_token_id);
                    (score, over)
                },
                QuestType::OneOnOne => {
                    let game_dispatcher = IOneOnOneDispatcher {
                        contract_address: game_token_address,
                    };
                    let status: Status = game_dispatcher.settle_match(quest.game_token_id.into());
                    match status {
                        Status::Winner(winner) => {
                            let score: u32 = 1;
                            let over: bool = true;
                            (score, over)
                        },
                        Status::Active => {
                            // Game still in progress
                            let score: u32 = 0;
                            let over: bool = false;
                            (score, over)
                        },
                        _ => {
                            // Other states (like draw)
                            let score: u32 = 0;
                            let over: bool = true;
                            (score, over)
                        }
                    }
                },
                _ => {
                    // Unknown game type
                    (0, true)
                }
            }
        }

        fn get_quest_entry_price(self: @ContractState, location: u16) -> u256 {
            let mut world = self.world(DEFAULT_NS());
            let quest_details: QuestDetails = world.read_model(location);
            quest_details.entry_price
        }

        fn get_quest_game_token(self: @ContractState, quest_id: u64) -> (ContractAddress, u64) {
            let mut world = self.world(DEFAULT_NS());
            let quest: Quest = world.read_model(quest_id);
            let quest_details: QuestDetails = world.read_model(quest.location);
            let quest_game: QuestGame = world.read_model(quest_details.game_id);

            let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
            let (game_token_address, _) = minigame_world.dns(@quest_game.game_contract_name).unwrap();
            (game_token_address, quest.game_token_id)
        }

        fn register_quest_game(ref self: ContractState, world_address: ContractAddress, namespace: ByteArray, game_contract_name: ByteArray, settings_contract_name: ByteArray, settings_id: u32, target_score: u32, quest_type: QuestType, game_name: ByteArray) {
            //TODO add permission check
            
            let mut world = self.world(DEFAULT_NS());
            let mut quest_game_count: QuestGameCounter = world.read_model(VERSION);
            quest_game_count.count += 1;
            world.write_model(@quest_game_count);
            let quest_game = @QuestGame { id: quest_game_count.count, world_address, namespace, game_contract_name, settings_contract_name, settings_id, target_score, quest_type, game_name };
            world.write_model(quest_game);
        }

    }

    fn create_quest(
        ref self: ContractState,
        quest_game: QuestGame,
        location: u16,
        entry_price: u256,
        capacity: u16,
        creator_address: ContractAddress,
    ) -> bool{
        let mut world = self.world(DEFAULT_NS());

        let store = StoreTrait::new(world);

        assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

        let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
        let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
        
        //let (settings_address, _) = minigame_world.dns(@quest_game.settings_contract_name).unwrap();
        //let settings_address_felt: felt252 = settings_address.into();
        //let settings_exist = settings_dispatcher.settings_exist(quest_game.settings_id);
        let game_address_felt: felt252 = quest_game.world_address.into();

        //remove setting requirement for now, can add back when caps can validate settings
        assert!(
            true,
            //settings_exist,
            "Quests: game address {} does not have settings id {}",
            game_address_felt,
            quest_game.settings_id,
        );

        let mut quest_details_counter: QuestDetailsCounter = world.read_model(VERSION);
        quest_details_counter.count += 1;

        let quest_details = @QuestDetails {
            location,
            creator_address,
            game_id: quest_game.id,
            target_score: quest_game.target_score,
            entry_price,
            capacity,
            participant_count: 0,
        };

        world.write_model(@quest_details_counter);
        world.write_model(quest_details);
        true
    }

    fn validate_and_execute_quest_payment(
        ref self: ContractState,
        quest: QuestDetails,
        caller: ContractAddress,
        store: Store,
        to_us: bool,
    ) {
        let validation_result = self.payable.validate(store.get_main_currency(), caller, quest.entry_price);
        assert(validation_result.status, ERC20_VALIDATE_AMOUNT_BUY);


        // TODO: Fee should be split between us, PG, and the minigame dev
        let buy_fee = store.get_buy_fee();
        let recipient = if to_us { store.get_our_contract_for_auction() } else { quest.creator_address };
        self
            .payable
            .proccess_payment_with_fee_for_buy(
                caller, recipient, buy_fee, store.get_our_contract_for_auction(), validation_result,
            );
    }
}


pub fn DEFAULT_NS() -> @ByteArray {
    @"ponzi_land"
}
