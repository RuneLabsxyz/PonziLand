use ponzi_land::models::quest::{Quest, QuestDetails};
use starknet::ContractAddress;

#[starknet::interface]
pub trait IQuestSystems<T> {
    fn create_quest(
        ref self: T,
        game_address: ContractAddress,
        location: u16,
        reward_resource_type: u8,
        reward_amount: u128,
        settings_id: u32,
        target_score: u32,
        capacity: u16,
        expires_at: u64,
    ) -> u64;
    fn start_quest(
        ref self: T, land_location: u16, player_name: felt252,
    ) -> u64;
    fn claim_reward(ref self: T, quest_id: u64);
    fn get_quest_details(ref self: T, details_id: u64) -> QuestDetails;
    fn get_quest(ref self: T, quest_id: u64) -> Quest;
    fn set_land_quest(ref self: T, land_location: u16, settings_id: u32);
    fn remove_land_quest(ref self: T, land_location: u16);
}


#[dojo::contract]
pub mod quests {
    use dojo::model::ModelStorage;
    use starknet::ContractAddress;
    use game_components_minigame::interface::{
        IMinigameDispatcher, IMinigameDispatcherTrait, IMinigameTokenDataDispatcher,
        IMinigameTokenDataDispatcherTrait,
    };
    use game_components_minigame::extensions::settings::interface::{
        IMinigameSettingsDispatcher, IMinigameSettingsDispatcherTrait,
    };
    use ponzi_land::models::quest::{
        QuestDetailsCounter, PlayerRegistrations, QuestCounter, QuestDetails, Quest, Reward,
    };
    use dojo::world::{WorldStorage, WorldStorageTrait, IWorldDispatcher};
    use ponzi_land::models::land::Land;
    use super::DEFAULT_NS;
    use starknet::get_caller_address;

    const VERSION: felt252 = '0.0.1';

    #[abi(embed_v0)]
    pub impl QuestSystemsImpl of super::IQuestSystems<ContractState> {
        fn create_quest(
            ref self: ContractState,
            game_address: ContractAddress,
            location: u16,
            reward_resource_type: u8,
            reward_amount: u128,
            settings_id: u32,
            target_score: u32,
            capacity: u16,
            expires_at: u64,
        ) -> u64 {
            let mut world = self.world(DEFAULT_NS());

            let minigame_world_dispatcher = IWorldDispatcher { contract_address: game_address };
            let mut minigame_world: WorldStorage = WorldStorageTrait::new(minigame_world_dispatcher, @"mock");
            let (settings_address, _) = minigame_world.dns(@"settings").unwrap();
            let settings_dispatcher = IMinigameSettingsDispatcher { contract_address: settings_address };
            let settings_exist = settings_dispatcher.settings_exist(settings_id);
            let game_address_felt: felt252 = game_address.into();
            assert!(
                settings_exist,
                "Quests: game address {} does not have settings id {}",
                game_address_felt,
                settings_id,
            );

            let address_felt: felt252 = game_address.into();

            panic!("settings address: {}", address_felt);

            let mut quest_details_counter: QuestDetailsCounter = world.read_model(VERSION);
            quest_details_counter.count += 1;

            let quest_details = @QuestDetails {
                id: quest_details_counter.count,
                location,
                game_address,
                reward: Reward { resource_type: reward_resource_type, amount: reward_amount },
                settings_id,
                target_score,
                capacity,
                participant_count: 0,
                expires_at,
            };

            world.write_model(@quest_details_counter);
            world.write_model(quest_details);
            *quest_details.id
        }

        fn set_land_quest(ref self: ContractState, land_location: u16, settings_id: u32) {
            let mut world = self.world(DEFAULT_NS());
            let mut land: Land = world.read_model(land_location);

            let caller = get_caller_address();

            assert!(land.owner == caller, "Player is not the owner of the land");
            assert!(land.quest_id == 0, "Land already has a quest");

            let id = self.create_quest(
                starknet::contract_address_const::<0x21e53a100475fc9f7274c005c7878ca318d8e27894123bce47ebc4b6ea79d7>(), //this is the address of the mock for now
                land.location,
                1,
                1,
                settings_id,
                100,
                1,
                10000000000000000,
            );

            assert!(id > 0, "Failed to create quest");

            land.quest_id = id;
            world.write_model(@land);
        }

        fn remove_land_quest(ref self: ContractState, land_location: u16) {
            let mut world = self.world(DEFAULT_NS());
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
            let land: Land = world.read_model(land_location);

            assert!(land.quest_id != 0, "Land does not have a quest");
            let details_id = land.quest_id;
            let mut quest_details: QuestDetails = world.read_model(details_id);
            assert(quest_details.id > 0, 'Quest details not found');
            assert(
                quest_details.participant_count < quest_details.capacity, 'Quest is at capacity',
            );
            let player_address = get_caller_address();

            assert!(land.owner != player_address, "Player is the owner of the quest land");

            // Check if this realm already has a participant in this quest
            // This is now a simple model query instead of iteration
            let player_participation: PlayerRegistrations = world
                .read_model((details_id, player_address));
            assert!(player_participation.quest_id == 0, "Player has already attempted this quest");

            let mut quest_counter: QuestCounter = world.read_model(VERSION);
            quest_counter.count += 1;
            world.write_model(@quest_counter);

            let game_dispatcher = IMinigameDispatcher {
                contract_address: quest_details.game_address,
            };
            let game_token_id: u64 = game_dispatcher
                .mint_game(
                    Option::Some(player_name), //player name
                    Option::Some(quest_details.settings_id), //settings id
                    Option::None, //start
                    Option::Some(quest_details.expires_at), //end
                    Option::None, //objective ids
                    Option::None, //context
                    Option::None, //client url
                    Option::None, //renderer address
                    player_address, //to
                    true, //soulbound
                );

            let quest = Quest {
                id: quest_counter.count,
                details_id,
                player_address,
                game_token_id,
                completed: false,
            };
            world.write_model(@quest);

            // increment participant count
            quest_details.participant_count += 1;
            world.write_model(@quest_details);

            // Record realm participation with this quest
            let player_participation = PlayerRegistrations {
                details_id, player_address, quest_id: quest.id,
            };
            world.write_model(@player_participation);

            quest.id
        }

        fn claim_reward(ref self: ContractState, quest_id: u64) {
            let mut world = self.world(DEFAULT_NS());
            let mut quest: Quest = world.read_model(quest_id);
            let quest_details: QuestDetails = world.read_model(quest.details_id);
            let mut land: Land = world.read_model(quest_details.location);

            // get score for the token id
            let game_dispatcher = IMinigameTokenDataDispatcher {
                contract_address: quest_details.game_address,
            };
            let score: u32 = game_dispatcher.score(quest.game_token_id);

            //TODO: handle quest failed 

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

        fn get_quest(ref self: ContractState, quest_id: u64) -> Quest {
            let mut world = self.world(DEFAULT_NS());
            world.read_model(quest_id)
        }

        fn get_quest_details(ref self: ContractState, details_id: u64) -> QuestDetails {
            let mut world = self.world(DEFAULT_NS());
            world.read_model(details_id)
        }
    }
}


pub fn DEFAULT_NS() -> @ByteArray {
    @"ponzi_land"
}
