use starknet::ContractAddress;

#[derive(Drop, Serde, starknet::Store, Debug, Introspect, Copy)]
pub struct TokenInfo {
    token_address: ContractAddress,
    amount: u256,
}

#[derive(Drop, Serde, Debug, Copy)]
pub struct ClaimInfo {
    token_address: ContractAddress,
    amount: u256,
    land_location: u64,
    can_be_nuked: bool,
}

#[derive(Drop, Serde, Debug)]
pub struct LandYieldInfo {
    remaining_stake_time: u256,
    yield_info: Array<YieldInfo>,
}

#[derive(Drop, Serde, Debug, Copy)]
pub struct YieldInfo {
    token: ContractAddress,
    sell_price: u256,
    percent_rate: u256,
    location: u64,
}
