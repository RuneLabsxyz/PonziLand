// Core lib imports.
use core::integer::{BoundedInt, u256_wide_mul, u512};

// Local imports.
use haiko_amm::libraries::swap_lib::{
    compute_swap_amounts, next_sqrt_price_input, next_sqrt_price_output
};

// Haiko imports.
use haiko_lib::constants::{MIN_SQRT_PRICE, MAX_SQRT_PRICE};
use haiko_lib::math::math;
use haiko_lib::math::liquidity_math::{liquidity_to_base, liquidity_to_quote};
use haiko_lib::constants::ONE;
use haiko_lib::types::i128::I128Trait;
use haiko_lib::helpers::utils::approx_eq;

// Check following invariants:
// 1. Amount in + fee <= u256 max
// 2. If exact input, amount out <= amount remaining
//    If exact output, amount in <= amount remaining
// 3. If current price = target price, amount in = amount out = fee = 0
// 4. If next price != target price and:
//    - Exact input, amount in + fee == amount remaining
//    - Exact output, amount out == amount remaining
// 5. If target price <= curr price, target price <= next price <= curr price
//    Else if target price > curr price, curr price <= next price <= target price
#[test]
fn test_compute_swap_amounts_invariants(
    curr_sqrt_price: u128,
    target_sqrt_price: u128,
    liquidity: u128,
    amount_rem: u128,
    fee_rate: u8,
    width: u16,
) {
    // Return if invalid
    if curr_sqrt_price.into() < MIN_SQRT_PRICE
        || target_sqrt_price.into() < MIN_SQRT_PRICE
        || width == 0
        || liquidity == 0
        || amount_rem == 0 {
        return;
    }

    // Compute swap amounts
    let exact_input = amount_rem % 2 == 0; // bool fuzzing not supported, so use even/odd for rng
    let (amount_in, amount_out, fees, next_sqrt_price) = compute_swap_amounts(
        curr_sqrt_price.into(),
        target_sqrt_price.into(),
        liquidity.into(),
        amount_rem.into(),
        fee_rate.into(),
        exact_input,
    );

    // Invariant 1
    assert(amount_in + fees <= BoundedInt::max(), 'Invariant 1');

    // Invariant 2
    if exact_input {
        assert(amount_in <= amount_rem.into(), 'Invariant 2a');
    } else {
        assert(amount_out <= amount_rem.into(), 'Invariant 2b');
    }

    // Invariant 3
    if curr_sqrt_price == target_sqrt_price {
        assert(amount_in == 0 && amount_out == 0 && fees == 0, 'Invariant 3');
    }

    // Invariant 4
    if next_sqrt_price != target_sqrt_price.into() {
        if exact_input {
            // Rounding error due to fee calculation which rounds down `amount_rem`
            assert(approx_eq(amount_in + fees, amount_rem.into(), 1), 'Invariant 4a');
        } else {
            assert(approx_eq(amount_out, amount_rem.into(), 1), 'Invariant 4b');
        }
    }

    // Invariant 5
    if target_sqrt_price <= curr_sqrt_price {
        assert(
            target_sqrt_price.into() <= next_sqrt_price
                && next_sqrt_price <= curr_sqrt_price.into(),
            'Invariant 5a'
        );
    } else {
        assert(
            curr_sqrt_price.into() <= next_sqrt_price
                && next_sqrt_price <= target_sqrt_price.into(),
            'Invariant 5b'
        );
    }
}

// Check following invariants:
// 1. If buying, next price >= curr price
//    If selling, next price <= curr price
// 2. If buying, amount in >= liquidity to quote (rounding up)
//    If selling, amount in >= liquidity to base (rounding up)
#[test]
fn test_next_sqrt_price_input_invariants(curr_sqrt_price: u128, liquidity: u128, amount_in: u128,) {
    let is_buy = liquidity % 2 == 0; // bool fuzzing not supported, so use even/odd for rng

    // Return if invalid
    if !is_buy
        && curr_sqrt_price == 0 || curr_sqrt_price.into() < MIN_SQRT_PRICE || liquidity == 0 {
        return;
    }

    // Compute next sqrt price
    let next_sqrt_price = next_sqrt_price_input(
        curr_sqrt_price.into(), liquidity.into(), amount_in.into(), is_buy
    );

    // Invariant 1
    if is_buy {
        assert(curr_sqrt_price.into() <= next_sqrt_price, 'Invariant 1a');
    } else {
        assert(next_sqrt_price <= curr_sqrt_price.into(), 'Invariant 1b');
    }

    // Invariant 2
    let liquidity_i128 = I128Trait::new(liquidity.into(), false);
    if is_buy {
        let quote = liquidity_to_quote(
            curr_sqrt_price.into(), next_sqrt_price, liquidity_i128, true
        );
        assert(amount_in.into() >= quote.val, 'Invariant 2b');
    } else {
        let base = liquidity_to_base(next_sqrt_price, curr_sqrt_price.into(), liquidity_i128, true);
        assert(amount_in.into() >= base.val, 'Invariant 2a');
    }
}

// Check following invariants:
// 1. If buying, next price >= curr price
//    If selling, next price <= curr price
// 2. If buying, amount out <= liquidity to base (rounding down)
//    If selling, amount out <= liquidity to quote (rounding down)
// 3. If selling, next price > 0
#[test]
fn test_next_sqrt_price_output_invariants(
    curr_sqrt_price: u128, liquidity: u128, amount_out: u128,
) {
    let is_buy = liquidity % 2 == 0; // bool fuzzing not supported, so use even/odd for rng

    // Return if invalid
    if !is_buy
        && curr_sqrt_price == 0 || curr_sqrt_price.into() < MIN_SQRT_PRICE || liquidity == 0 {
        return;
    }
    if is_buy {
        let product_wide: u512 = u256_wide_mul(amount_out.into(), curr_sqrt_price.into());
        let product = math::mul_div(amount_out.into(), curr_sqrt_price.into(), ONE, true);
        if product_wide.limb2 != 0 || product_wide.limb3 != 0 || product >= liquidity.into() {
            return;
        }
    }

    // Compute next sqrt price
    let next_sqrt_price = next_sqrt_price_output(
        curr_sqrt_price.into(), liquidity.into(), amount_out.into(), is_buy
    );

    // Invariant 1
    if is_buy {
        assert(curr_sqrt_price.into() <= next_sqrt_price, 'Invariant 1a');
    } else {
        assert(next_sqrt_price <= curr_sqrt_price.into(), 'Invariant 1b');
    }

    // Invariant 2
    let liquidity_i128 = I128Trait::new(liquidity.into(), false);
    if is_buy {
        let base = liquidity_to_base(
            curr_sqrt_price.into(), next_sqrt_price, liquidity_i128, false
        );
        assert(amount_out.into() <= base.val, 'Invariant 2a');
    } else {
        let quote = liquidity_to_quote(
            next_sqrt_price, curr_sqrt_price.into(), liquidity_i128, false
        );
        assert(amount_out.into() <= quote.val, 'Invariant 2b');
    }

    // Invariant 3
    if !is_buy {
        assert(next_sqrt_price > 0, 'Invariant 3');
    }
}
