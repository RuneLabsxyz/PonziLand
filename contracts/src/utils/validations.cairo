use ponzi_land::models::land::{Land, LandTrait};
use starknet::ContractAddress;

pub fn validate_params(sell_price: u256, amount_to_stake: u256) {
    assert(sell_price > 0, 'sell_price > 0');
    assert(amount_to_stake > 0, 'amount_to_stake > 0');
}

pub fn validate_owner_land_for_buy(land: @Land, caller: ContractAddress) {
    assert(!land.is_owner(caller), 'you already own this land');
    assert(land.has_owner(), 'must have a owner');
}
