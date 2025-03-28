
use ponzi_land::utils::level_up::calculate_discount_for_level;
use ponzi_land::helpers::coord::max_neighbors;
use ponzi_land::models::land::Land;
use ponzi_land::consts::{TAX_RATE, BASE_TIME, TIME_SPEED};
use starknet::{get_block_timestamp};

pub fn get_taxes_per_neighbor(land: Land) -> u256 {     

    let current_time = get_block_timestamp();

    let discount_for_level = calculate_discount_for_level(land.level);

    //calculate the total taxes
    let elapsed_time = (current_time - land.last_pay_time) * TIME_SPEED.into();
    let total_taxes: u256 = (land.sell_price * TAX_RATE.into() * elapsed_time.into())
        / (100 * BASE_TIME.into());

    //calculate discount for level
    let total_taxes = if discount_for_level > 0 {
        total_taxes - (total_taxes * discount_for_level.into()) / 100
    } else {
        total_taxes
    };

    // Calculate the tax per neighbor (divided by the maximum possible neighbors)
    let tax_per_neighbor = total_taxes / max_neighbors(land.location).into();

    tax_per_neighbor

}
