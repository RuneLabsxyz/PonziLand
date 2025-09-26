use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct QuestDetails {
    #[key]
    pub id: u64,
    pub location: u16,
    pub capacity: u16,
    pub participant_count: u16,
    pub entry_price: u256,
    pub target_score: u32,
    pub creator_address: ContractAddress,
    pub game_id: u64,

}

#[derive(Copy, Drop, Serde, Introspect)]
pub enum QuestType {
    None,
    Minigame,
    OneOnOne,
}

#[derive(Clone, Drop, Serde, Introspect)]
#[dojo::model]
pub struct QuestGame {
    #[key]
    pub id: u64,
    pub world_address: ContractAddress,
    pub namespace: ByteArray,
    pub game_contract_name: ByteArray,
    pub settings_contract_name: ByteArray,
    pub settings_id: u32,
    pub target_score: u32,
    pub quest_type: QuestType,
}

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct QuestGameCounter {
    #[key]
    pub key: felt252,
    pub count: u64,
}

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct Quest {
    #[key]
    pub id: u64,
    pub details_id: u64,
    pub player_address: ContractAddress,
    pub game_token_id: u64,
    pub completed: bool,
    pub expires_at: u64,
}

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct PlayerRegistrations {
    #[key]
    pub details_id: u64,
    #[key]
    pub player_address: ContractAddress,
    pub quest_id: u64,
}

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct QuestCounter {
    #[key]
    pub key: felt252,
    pub count: u64,
}

#[derive(Copy, Drop, Serde, IntrospectPacked)]
#[dojo::model]
pub struct QuestDetailsCounter {
    #[key]
    pub key: felt252,
    pub count: u64,
}
///
/// Model
///

#[dojo::model]
#[derive(Drop, Serde)]
pub struct GameMetadata {
    #[key]
    pub contract_address: ContractAddress,
    pub creator_address: ContractAddress,
    pub name: felt252,
    pub description: ByteArray,
    pub developer: felt252,
    pub publisher: felt252,
    pub genre: felt252,
    pub image: ByteArray,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct GameCounter {
    #[key]
    pub key: felt252,
    pub count: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TokenMetadata {
    #[key]
    pub token_id: u64,
    pub minted_by: ContractAddress,
    pub player_name: felt252,
    pub settings_id: u32,
    pub lifecycle: Lifecycle,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Score {
    #[key]
    pub game_id: u64,
    pub score: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Settings {
    #[key]
    pub id: u32,
    #[key]
    pub name: felt252,
    pub value: felt252,
}

// part of Settings Component
// add_settings(Array<Settings>, SettingsDetails)
// - assert length of Settings matches number of settings for the game
// - iterate over Settings and verify each name matches a known setting name for the game
// - add Settings and SettingsDetails to the store
// - increment SettingsCounter
#[dojo::model]
#[derive(Drop, Serde)]
pub struct SettingsDetails {
    #[key]
    pub id: u32,
    pub name: felt252,
    pub description: ByteArray,
    pub exists: bool,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SettingsCounter {
    #[key]
    pub key: felt252,
    pub count: u32,
}

#[derive(Copy, Drop, Serde, Introspect)]
pub struct Lifecycle {
    pub mint: u64,
    pub start: Option<u64>,
    pub end: Option<u64>,
}
