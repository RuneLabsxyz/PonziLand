use ponzi_land::utils::level_up::calculate_discount_for_level;
use ponzi_land::helpers::coord::max_neighbors;
use ponzi_land::models::land::{Land, LandStake};
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::consts::{DECIMALS_FACTOR, SCALE_FACTOR_FOR_FEE};
use starknet::{get_block_timestamp};


#[inline(always)]
pub fn get_taxes_per_neighbor(land: @Land, elapsed_time: u64, store: Store) -> u256 {
    let tax_rate_per_neighbor = get_tax_rate_per_neighbor(land, store);

    let tax_per_neighbor: u256 = (tax_rate_per_neighbor * elapsed_time.into())
        / (store.get_base_time().into());

    tax_per_neighbor
}


pub fn get_tax_rate_per_neighbor(land: @Land, store: Store) -> u256 {
    let max_n = max_neighbors(*land.location);
    if max_n == 0 {
        return 0;
    }

    let discount_for_level = calculate_discount_for_level(*land.level);
    let base_tax_rate = (*land.sell_price
        * store.get_tax_rate().into()
        * store.get_time_speed().into())
        / (max_n.into() * 100); // Base rate per neighbor

    let discounted_tax_rate = if discount_for_level > 0 {
        (base_tax_rate * (100 - discount_for_level).into()) / 100 // Apply 10% or 15% discount
    } else {
        base_tax_rate
    };

    discounted_tax_rate
}


#[inline(always)]
fn calculate_share_for_nuke(
    individual_elapsed_time: u64, total_elapsed_time: u64, stake_amount: u256,
) -> u256 {
    let numerator = individual_elapsed_time.into() * stake_amount * DECIMALS_FACTOR;
    let scaled_share = numerator / total_elapsed_time.into();
    scaled_share / DECIMALS_FACTOR
}


//TODO: here also we can pass a ref of landStake and after do only 1 write with everything updated
#[inline(always)]
pub fn calculate_and_return_taxes_with_fee(
    total_taxes_amount: u256, fee_rate: u128,
) -> (u256, u128) {
    let fee_amount = total_taxes_amount * fee_rate.into() / SCALE_FACTOR_FOR_FEE.into();
    let amount_for_claimer = total_taxes_amount - fee_amount;
    (amount_for_claimer, fee_amount.try_into().unwrap())
}
