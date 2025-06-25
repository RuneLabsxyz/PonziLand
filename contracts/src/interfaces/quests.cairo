use starknet::ContractAddress;
use dojo::world::{WorldStorage, WorldStorageTrait, IWorldDispatcher};

use ponzi_land::models::quest::{TokenMetadata, GameMetadata};


pub const IGAMETOKEN_ID: felt252 =
    0x027fd8d2e685b5a61e4516152831e8730c27b25c9f831ec27c1e48a46e55086a;
pub const IGAME_METADATA_ID: felt252 =
    0xdbe4736acc1847cb2bca994503d50e7fc21daf5cc7b76688ad4d6788c0a9f1;
pub const IERC4906_ID: felt252 = 0x49064906;

#[starknet::interface]
pub trait IGameToken<TState> {
    fn mint(
        ref self: TState,
        player_name: felt252,
        settings_id: u32,
        start: Option<u64>,
        end: Option<u64>,
        to: ContractAddress,
    ) -> u64;
    fn emit_metadata_update(ref self: TState, game_id: u64);
    fn game_metadata(self: @TState) -> GameMetadata;
    fn token_metadata(self: @TState, token_id: u64) -> TokenMetadata;
    fn game_count(self: @TState) -> u64;
    fn namespace(self: @TState) -> ByteArray;
    fn score_model(self: @TState) -> ByteArray;
    fn score_attribute(self: @TState) -> ByteArray;
    fn settings_model(self: @TState) -> ByteArray;
}

#[starknet::interface]
pub trait IGameDetails<TState> {
    fn score(self: @TState, game_id: u64) -> u32;
}

#[starknet::interface]
pub trait ISettings<TState> {
    fn setting_exists(self: @TState, settings_id: u32) -> bool;
}

#[generate_trait]
pub impl WorldImpl of WorldTrait {
    fn contract_address(self: @WorldStorage, contract_name: @ByteArray) -> ContractAddress {
        match self.dns(contract_name) {
            Option::Some((contract_address, _)) => { (contract_address) },
            Option::None => { (starknet::contract_address_const::<0x0>()) },
        }
    }

    // Create a Store from a dispatcher
    // https://github.com/dojoengine/dojo/blob/main/crates/dojo/core/src/contract/components/world_provider.cairo
    // https://github.com/dojoengine/dojo/blob/main/crates/dojo/core/src/world/storage.cairo
    #[inline(always)]
    fn storage(dispatcher: IWorldDispatcher, namespace: @ByteArray) -> WorldStorage {
        (WorldStorageTrait::new(dispatcher, namespace))
    }
}
