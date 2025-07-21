// Core lib imports.
use core::cmp::min;

// Haiko imports.
use haiko_lib::types::core::ValidLimits;
use haiko_lib::math::price_math;
use haiko_lib::constants::{MAX_SQRT_PRICE, MIN_SQRT_PRICE};

// Checks limits are different and properly ordered.
// 
// # Arguments
// * `lower_limit` - lower limit (shifted)
// * `upper_limit` - upper limit (shifted)
// * `width` - market width
// * `valid_limits` - valid limits struct
// * `is_remove` - whether liquidity is being removed
pub fn check_limits(
    lower_limit: u32, upper_limit: u32, width: u32, valid_limits: ValidLimits, is_remove: bool
) {
    let max_limit = price_math::max_limit(width);
    assert(lower_limit < upper_limit, 'LimitsUnordered');
    assert(lower_limit % width == 0 && upper_limit % width == 0, 'NotMultipleOfWidth');

    // If the valid limits struct has not been initialised, or we are removing liquidity, 
    // just perform the default range checks.
    if is_remove
        || (valid_limits.min_lower == 0
            && valid_limits.max_lower == 0
            && valid_limits.min_upper == 0
            && valid_limits.max_upper == 0) {
        assert(upper_limit <= max_limit, 'UpperLimitOF');
    } else {
        assert(
            lower_limit >= valid_limits.min_lower
                && lower_limit <= valid_limits.max_lower
                && upper_limit >= valid_limits.min_upper
                && upper_limit <= min(max_limit, valid_limits.max_upper),
            'LimitsOutOfRange'
        );
    }
}

// Checks price threshold is valid with respect to current price.
//
// # Arguments
// * `threshold_sqrt_price` - threshold sqrt price
// * `curr_sqrt_price` - current sqrt price
// * `is_buy` - whether the price threshold is a buy or sell price
pub fn check_threshold(threshold_sqrt_price: u256, curr_sqrt_price: u256, is_buy: bool) {
    assert(
        if is_buy {
            threshold_sqrt_price > curr_sqrt_price && threshold_sqrt_price <= MAX_SQRT_PRICE
        } else {
            threshold_sqrt_price < curr_sqrt_price && threshold_sqrt_price >= MIN_SQRT_PRICE
        },
        'ThresholdInvalid'
    );
}
