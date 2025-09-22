use ponzi_land::models::quest::{Quest, QuestDetails};
use starknet::ContractAddress;

#[starknet::interface]
pub trait IQuestSystems<T> {
    fn start_quest(
        ref self: T, land_location: u16, player_name: felt252,
    ) -> u64;
    fn claim_land(ref self: T, quest_id: u64, token_address: ContractAddress, sell_price: u256, amount_to_stake: u256);
    fn get_quest(self: @T, quest_id: u64) -> (Quest, QuestDetails);
    fn set_land_quest(ref self: T, land_location: u16, game_id: u64);
    fn remove_land_quest(ref self: T, land_location: u16);
    fn get_score(self: @T, quest_id: u64) -> u32;
    fn get_quest_game_token(self: @T, quest_id: u64) -> (ContractAddress, u64);
    fn register_quest_game(ref self: T, world_address: ContractAddress, namespace: ByteArray, game_contract_name: ByteArray, settings_contract_name: ByteArray, settings_id: u32, target_score: u32);
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
        QuestDetailsCounter, PlayerRegistrations, QuestCounter, QuestDetails, Quest, QuestGame, QuestGameCounter,
    };
    use dojo::world::{WorldStorage, WorldStorageTrait, IWorldDispatcher};
    use ponzi_land::models::land::Land;
    use ponzi_land::models::auction::Auction;
    use ponzi_land::store::{Store, StoreTrait};
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
        let mut i = 0;
        while i < valid_games.len() {
            let mut game: QuestGame = valid_games[i].clone();
            quest_game_count.count += 1;
            game.id = quest_game_count.count;
            world.write_model(@game);
            i += 1;
        };
        world.write_model(@quest_game_count);
    }

    #[abi(embed_v0)]
    pub impl QuestSystemsImpl of super::IQuestSystems<ContractState> {
        

        fn set_land_quest(ref self: ContractState, land_location: u16, game_id: u64) {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");


            let mut land: Land = world.read_model(land_location);

            let caller = get_caller_address();

            assert!(land.owner == caller, "Player is not the owner of the land");
            assert!(land.quest_id == 0, "Land already has a quest");

            let quest_game: QuestGame = world.read_model(game_id);

            let id = create_quest(
                ref self,
                quest_game,
                land.location,
                1000000000000000000, // 10 strk
                1,
                caller
            );

            assert!(id > 0, "Failed to create quest");

            land.quest_id = id;
            world.write_model(@land);
        }

        fn remove_land_quest(ref self: ContractState, land_location: u16) {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

            let mut land: Land = world.read_model(land_location);
            assert!(land.owner == get_caller_address(), "Player is not the owner of the land");
            assert!(land.quest_id > 0, "Land does not have a quest");
            land.quest_id = 0;
            world.write_model(@land);
        }

        fn start_quest(
            ref self: ContractState,
            land_location: u16,
            player_name: felt252,
        ) -> u64 {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

            let land: Land = world.read_model(land_location);
            let auction: Auction = world.read_model(land_location);

            assert!(land.quest_id != 0 || auction.quest_id != 0, "Land does not have a quest");

            let mut quest_id = 0;
            let mut to_us = false;
            if land.quest_id != 0 {
                quest_id = land.quest_id;
            }
            else {
                quest_id = auction.quest_id;
                to_us = true;
            }

            let mut quest_details: QuestDetails = world.read_model(quest_id);

            assert(quest_details.id > 0, 'Quest details not found');
            assert(
                quest_details.participant_count < quest_details.capacity, 'Quest is at capacity',
            );

            let player_address = get_caller_address();

            assert!(land.owner != player_address, "Player is the owner of the quest land");

            validate_and_execute_quest_payment(ref self, quest_details, get_caller_address(), store, to_us);
            
            // Check if this realm already has a participant in this quest
            // This is now a simple model query instead of iteration
            let player_participation: PlayerRegistrations = world
                .read_model((quest_details.id, player_address));
            assert!(player_participation.quest_id == 0, "Player has already attempted this quest");

            let mut quest_counter: QuestCounter = world.read_model(VERSION);
            quest_counter.count += 1;
            world.write_model(@quest_counter);

            let mut quest_details: QuestDetails = world.read_model(quest.details_id);
            let quest_game: QuestGame = world.read_model(quest_details.game_id);

            let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
            let (game_token_address, _) = minigame_world.dns(@quest_game.game_contract_name).unwrap();


            let time_to_start = get_block_timestamp();
            let time_to_end = time_to_start + 600000;
            let game_dispatcher = IMinigameDispatcher {
                contract_address: game_token_address,
            };
            let game_token_id: u64 = game_dispatcher
                .mint_game(
                    Option::Some(player_name), //player name
                    Option::Some(quest_game.settings_id), //settings id
                    Option::None, //start
                    Option::Some(time_to_end), //end
                    Option::None, //objective ids
                    Option::None, //context
                    Option::None, //client url
                    Option::None, //renderer address
                    player_address, //to
                    true, //soulbound
                );

            let quest = Quest {
                id: quest_counter.count,
                details_id: quest_details.id,
                player_address,
                game_token_id,
                completed: false,
                expires_at: time_to_end,
            };
            world.write_model(@quest);

            // increment participant count
            quest_details.participant_count += 1;
            world.write_model(@quest_details);

            // Record realm participation with this quest
            let player_participation = PlayerRegistrations {
                details_id: quest_details.id, player_address, quest_id: quest.id,
            };
            world.write_model(@player_participation);

            quest.id
        }

        fn claim_land(ref self: ContractState, quest_id: u64, token_address: ContractAddress, sell_price: u256, amount_to_stake: u256) {
            let mut world = self.world(DEFAULT_NS());
            let store = StoreTrait::new(world);
            assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

            let mut quest: Quest = world.read_model(quest_id);
            let mut quest_details: QuestDetails = world.read_model(quest.details_id);
            let mut land: Land = world.read_model(quest_details.location);

            let quest_game: QuestGame = world.read_model(quest_details.game_id);
            // get score for the token id
            let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
            let (game_token_address, _) = minigame_world.dns(@quest_game.game_contract_name).unwrap();
            let game_dispatcher = IMinigameTokenDataDispatcher {
                contract_address: game_token_address,
            };
            let score: u32 = game_dispatcher.score(quest.game_token_id);

            if score < quest_details.target_score && (game_dispatcher.game_over(quest.game_token_id) || get_block_timestamp() > quest.expires_at) {
                land.quest_id = 0;
                world.write_model(@land);
                quest_details.participant_count -= 1;
                world.write_model(@quest_details);
                quest.completed = true;
                world.write_model(@quest);
                return;
            }

            // check if the score is greater than or equal to the target score
            assert!(
                score >= quest_details.target_score,
                "Quest {} is not completed. Target score: {}, Current score: {}",
                quest_id,
                quest_details.target_score,
                score,
            );

            
            land.quest_id = 0;
            land.owner = quest.player_address;
            world.write_model(@land);

            // set quest as completed
            quest.completed = true;
            world.write_model(@quest);
            // issue reward

            // grant tokens for Reward ??
        // TODO: Add reward logic here
        }

        fn get_quest(self: @ContractState, quest_id: u64) -> (Quest, QuestDetails) {
            let mut world = self.world(DEFAULT_NS());
            let quest: Quest = world.read_model(quest_id);
            let quest_details: QuestDetails = world.read_model(quest.details_id);
            (quest, quest_details)
        }

        fn get_score(self: @ContractState, quest_id: u64) -> u32 {
            let mut world = self.world(DEFAULT_NS());
            let quest: Quest = world.read_model(quest_id);
            let quest_details: QuestDetails = world.read_model(quest.details_id);
            let quest_game: QuestGame = world.read_model(quest_details.game_id);
            let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
            let (game_token_address, _) = minigame_world.dns(@quest_game.game_contract_name).unwrap();
            let game_dispatcher = IMinigameTokenDataDispatcher {
                contract_address: game_token_address,
            };
            game_dispatcher.score(quest.game_token_id)
        }

        fn get_quest_game_token(self: @ContractState, quest_id: u64) -> (ContractAddress, u64) {
            let mut world = self.world(DEFAULT_NS());
            let quest: Quest = world.read_model(quest_id);
            let quest_details: QuestDetails = world.read_model(quest.details_id);
            let quest_game: QuestGame = world.read_model(quest_details.game_id);
            (quest_game.world_address, quest.game_token_id)
        }

        fn register_quest_game(ref self: ContractState, world_address: ContractAddress, namespace: ByteArray, game_contract_name: ByteArray, settings_contract_name: ByteArray, settings_id: u32, target_score: u32) {
            //TODO add permission check
            
            let mut world = self.world(DEFAULT_NS());
            let mut quest_game_count: QuestGameCounter = world.read_model(VERSION);
            quest_game_count.count += 1;
            world.write_model(@quest_game_count);
            let quest_game = @QuestGame { id: quest_game_count.count, world_address, namespace, game_contract_name, settings_contract_name, settings_id, target_score };
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
    ) -> u64 {
        let mut world = self.world(DEFAULT_NS());

        let store = StoreTrait::new(world);

        assert!(store.get_quest_lands_enabled(), "Quests are not enabled");

        let minigame_world_dispatcher = IWorldDispatcher { contract_address: quest_game.world_address };
        let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @quest_game.namespace);
        let (settings_address, _) = minigame_world.dns(@quest_game.settings_contract_name).unwrap();
        let settings_dispatcher = IMinigameSettingsDispatcher { contract_address: settings_address };
        let settings_address_felt: felt252 = settings_address.into();
        let settings_exist = settings_dispatcher.settings_exist(quest_game.settings_id);
        let game_address_felt: felt252 = quest_game.world_address.into();

        assert!(
            settings_exist,
            "Quests: game address {} does not have settings id {}",
            game_address_felt,
            quest_game.settings_id,
        );

        let mut quest_details_counter: QuestDetailsCounter = world.read_model(VERSION);
        quest_details_counter.count += 1;

        let quest_details = @QuestDetails {
            id: quest_details_counter.count,
            location,
            creator_address,
            game_id: quest_game.id,
            settings_id: quest_game.settings_id,
            target_score: quest_game.target_score,
            entry_price,
            capacity,
            participant_count: 0,
        };

        world.write_model(@quest_details_counter);
        world.write_model(quest_details);
        *quest_details.id
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
