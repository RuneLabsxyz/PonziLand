use ponzi_land::utils::level_up::calculate_discount_for_level;
use ponzi_land::helpers::coord::max_neighbors;
use ponzi_land::models::land::{Land, LandStake};
use ponzi_land::consts::{TAX_RATE, BASE_TIME, TIME_SPEED, DECIMALS_FACTOR};
use starknet::{get_block_timestamp};


#[inline(always)]
pub fn get_taxes_per_neighbor(land: @Land, elapsed_time: u64) -> u256 {
    let tax_rate_per_neighbor = get_tax_rate_per_neighbor(land);

    let tax_per_neighbor: u256 = (tax_rate_per_neighbor * elapsed_time.into()) / (BASE_TIME.into());

    tax_per_neighbor
}


pub fn get_tax_rate_per_neighbor(land: @Land) -> u256 {
    let max_n = max_neighbors(*land.location);
    if max_n == 0 {
        return 0;
    }

    let discount_for_level = calculate_discount_for_level(*land.level);
    let base_tax_rate = (*land.sell_price * TAX_RATE.into() * TIME_SPEED.into())
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

