use starknet::ContractAddress;
use ponzi_land::models::land::Land;
use ponzi_land::models::auction::Auction;
#[derive(Drop, Serde, starknet::Store, Debug, Introspect, Copy)]
pub struct TokenInfo {
    token_address: ContractAddress,
    amount: u256,
}

#[derive(Drop, Serde, Debug, Copy)]
pub struct ClaimInfo {
    token_address: ContractAddress,
    amount: u256,
    land_location: u16,
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
    per_hour: u256,
    percent_rate: u256,
    location: u16,
}

#[derive(Drop, Serde, Debug)]
pub struct LandWithTaxes {
    land: Land,
    taxes: Option<Array<TokenInfo>>,
}

#[derive(Copy, Drop, Serde, Debug)]
pub enum LandOrAuction {
    None,
    Land: Land,
    Auction: Auction,
}
