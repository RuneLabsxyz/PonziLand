// Core lib imports.
use core::cmp::{min, max};
use core::integer::{u512, u256_wide_mul};

// Local imports.
use haiko_amm::libraries::tree;
use haiko_amm::contracts::market_manager::MarketManager::ContractState;
use haiko_amm::contracts::market_manager::MarketManager::{
    limit_infoContractMemberStateTrait as LimitInfoStateTrait,
    batchesContractMemberStateTrait as BatchStateTrait,
    positionsContractMemberStateTrait as PositionStateTrait,
};
use haiko_amm::contracts::market_manager::MarketManager::MarketManagerInternalTrait;

// Haiko imports.
use haiko_lib::id;
use haiko_lib::math::{math, fee_math, price_math, liquidity_math};
use haiko_lib::constants::{ONE, MAX_SQRT_PRICE};
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::types::core::MarketState;
use haiko_lib::types::i128::I128Trait;

// Iteratively execute swap up to next initialised limit price.
//
// # Arguments
// * `market_id` - market id
// * `market_state` - market state
// * `amount_rem` - amount remaining to be swapped
// * `amount_calc` - amount out if exact input or amount in if exact output
// * `swap_fees` - swap fees
// * `filled_limits` - array of limits filled during swap execution, plus associated batch id
// * `threshold_sqrt_price` - price threshold
// * `fee_rate` - fee rate
// * `width` - limit width
// * `is_buy` - whether swap is a buy or sell
// * `exact_input` - whether swap amount is exact input or output
pub fn swap_iter(
    ref self: ContractState,
    market_id: felt252,
    ref market_state: MarketState,
    ref amount_rem: u256,
    ref amount_calc: u256,
    ref swap_fees: u256,
    ref filled_limits: Array<(u32, felt252)>,
    threshold_sqrt_price: Option<u256>,
    fee_rate: u16,
    width: u32,
    is_buy: bool,
    exact_input: bool,
) {
    // Break loop if amount remaining filled or price threshold reached. 
    if amount_rem == 0
        || (threshold_sqrt_price.is_some()
            && market_state.curr_sqrt_price == threshold_sqrt_price.unwrap()) {
        return;
    }

    // Snapshot starting state (used below).
    let start_sqrt_price = market_state.curr_sqrt_price;
    let start_limit = market_state.curr_limit;

    // Get next limit and constrain to max limit.
    let target_limit_opt = tree::next_limit(
        @self, market_id, is_buy, width, market_state.curr_limit
    );
    // If running out of liquidity, we stop the swap execution.
    if target_limit_opt.is_none() {
        return;
    }
    // assert(target_limit_opt.is_some(), 'NoLiquidity');
    let target_limit = min(target_limit_opt.unwrap(), price_math::max_limit(width));

    // Convert target limit to target sqrt price, and cap it at the threshold.
    let uncapped_target_sqrt_price = price_math::limit_to_sqrt_price(target_limit, width);
    let target_sqrt_price = if threshold_sqrt_price.is_some() {
        if is_buy {
            min(threshold_sqrt_price.unwrap(), uncapped_target_sqrt_price)
        } else {
            max(threshold_sqrt_price.unwrap(), uncapped_target_sqrt_price)
        }
    } else {
        uncapped_target_sqrt_price
    };

    // Compute swap amounts and update for new price and accrued fees.
    let (amount_in_iter, amount_out_iter, fee_iter, next_sqrt_price) = compute_swap_amounts(
        market_state.curr_sqrt_price,
        target_sqrt_price,
        market_state.liquidity,
        amount_rem,
        fee_rate,
        exact_input,
    );
    market_state.curr_sqrt_price = next_sqrt_price;

    // Update amount remaining and amount calc.
    // Amount calc refers to amount out for exact input, and vice versa for exact out.
    // In same cases, rounding errors can cause computed swap amounts to be slightly different
    // from amounts remaining. We handle this by capping at total amount remaining.
    if exact_input {
        amount_rem -= min(amount_in_iter + fee_iter, amount_rem);
        amount_calc += amount_out_iter;
    } else {
        amount_rem -= min(amount_out_iter, amount_rem);
        amount_calc += amount_in_iter + fee_iter;
    }

    // Update swap fee balance.
    swap_fees += fee_iter;

    // Update fee factor.
    // Fee factors are rounded down to ensure LPs can never withdraw more swap fees than
    // accrued over swaps.
    if market_state.liquidity != 0 && fee_iter != 0 {
        let fee_factor = math::mul_div(fee_iter, ONE, market_state.liquidity.into(), false);
        if is_buy {
            market_state.quote_fee_factor += fee_factor;
        } else {
            market_state.base_fee_factor += fee_factor;
        }
    }

    // Move to the next iteration if price target reached.
    if market_state.curr_sqrt_price == uncapped_target_sqrt_price {
        // Update fully filled limits.
        if amount_in_iter != 0 {
            let limit_to_fill = if is_buy {
                start_limit
            } else {
                target_limit
            };
            let nonce = self.limit_info.read((market_id, limit_to_fill)).nonce;
            let batch_id = id::batch_id(market_id, limit_to_fill, nonce);
            let batch = self.batches.read(batch_id);
            if batch.liquidity != 0 {
                filled_limits.append((limit_to_fill, batch_id));
            }
        }

        // Update fee factors.
        let mut limit_info = self.limit_info.read((market_id, target_limit));
        if fee_rate != 0 {
            assert(
                market_state.base_fee_factor >= limit_info.base_fee_factor, 'LimitInfoBaseFeeFactor'
            );
            assert(
                market_state.quote_fee_factor >= limit_info.quote_fee_factor,
                'LimitInfoQuoteFeeFactor'
            );
            limit_info.base_fee_factor = market_state.base_fee_factor - limit_info.base_fee_factor;
            limit_info.quote_fee_factor = market_state.quote_fee_factor
                - limit_info.quote_fee_factor;
            self.limit_info.write((market_id, target_limit), limit_info);
        }

        // Apply liquidity deltas.
        let mut liquidity_delta = limit_info.liquidity_delta;
        if !is_buy {
            liquidity_delta.sign = !liquidity_delta.sign;
        }
        liquidity_math::add_delta(ref market_state.liquidity, liquidity_delta);

        // Handle edge case where target limit is min or max.
        if target_limit == price_math::max_limit(width) || target_limit == 0 {
            return;
        }
        // If selling, we need to reduce the limit by 1 because searching to the left moves us to
        // the next price boundary. 
        if is_buy {
            market_state.curr_limit = target_limit
        } else {
            market_state.curr_limit = target_limit - 1
        };

        // Recursively call swap_iter.
        swap_iter(
            ref self,
            market_id,
            ref market_state,
            ref amount_rem,
            ref amount_calc,
            ref swap_fees,
            ref filled_limits,
            threshold_sqrt_price,
            fee_rate,
            width,
            is_buy,
            exact_input,
        );
    } else if market_state.curr_sqrt_price != start_sqrt_price {
        // If sqrt price has changed, calculate new limit.
        let next_limit = price_math::sqrt_price_to_limit(next_sqrt_price, width);

        // To handle imprecision at limit boundaries, constrain next limit so it is never lower
        // for buys, and never higher for sells.
        let new_limit = if is_buy {
            max(next_limit, start_limit)
        } else {
            min(next_limit, start_limit)
        };

        // Update state.
        market_state.curr_limit = new_limit;
    }
}

// Compute amounts swapped and new price after swapping between two prices.
//
// # Arguments
// * `curr_sqrt_price` - current sqrt price
// * `target_sqrt_price` - target sqrt price
// * `liquidity` - current liquidity
// * `amount_rem` - amount remaining to be swapped
// * `fee_rate` - fee rate
// * `exact_in` - whether swap amount is exact input or output
//  
// # Returns
// * `amount_in` - amount of tokens swapped in (excluding fees)
// * `amount_out` - amount of tokens swapped out
// * `fees` - amount of fees paid
// * `next_sqrt_price` - next sqrt price
pub fn compute_swap_amounts(
    curr_sqrt_price: u256,
    target_sqrt_price: u256,
    liquidity: u128,
    amount_rem: u256,
    fee_rate: u16,
    exact_input: bool,
) -> (u256, u256, u256, u256) {
    // Determine whether swap is a buy or sell.
    let is_buy = target_sqrt_price > curr_sqrt_price;

    // Calculate amounts in and out.
    // We round up amounts in and round down amounts out to prevent protocol insolvency.
    let liquidity_i128 = I128Trait::new(liquidity, false);
    let mut amount_in = if is_buy {
        liquidity_math::liquidity_to_quote(curr_sqrt_price, target_sqrt_price, liquidity_i128, true)
    } else {
        liquidity_math::liquidity_to_base(target_sqrt_price, curr_sqrt_price, liquidity_i128, true)
    }
        .val;

    let mut amount_out = if is_buy {
        liquidity_math::liquidity_to_base(curr_sqrt_price, target_sqrt_price, liquidity_i128, false)
    } else {
        liquidity_math::liquidity_to_quote(
            target_sqrt_price, curr_sqrt_price, liquidity_i128, false
        )
    }
        .val;

    // Calculate next sqrt price.
    let amount_rem_less_fee = fee_math::gross_to_net(amount_rem, fee_rate);
    let filled_max = if exact_input {
        amount_rem_less_fee < amount_in
    } else {
        amount_rem < amount_out
    };

    let next_sqrt_price = if !filled_max {
        target_sqrt_price
    } else {
        if exact_input {
            next_sqrt_price_input(curr_sqrt_price, liquidity, amount_rem_less_fee, is_buy)
        } else {
            next_sqrt_price_output(curr_sqrt_price, liquidity, amount_rem, is_buy)
        }
    };

    // At this point, amounts in and out are assuming target price was reached.
    // If that isn't the case, recalculate amounts using next sqrt price.
    // Rounding applied as above.
    if filled_max {
        amount_in =
            if exact_input {
                amount_rem_less_fee
            } else {
                if is_buy {
                    liquidity_math::liquidity_to_quote(
                        curr_sqrt_price, next_sqrt_price, liquidity_i128, true
                    )
                } else {
                    liquidity_math::liquidity_to_base(
                        next_sqrt_price, curr_sqrt_price, liquidity_i128, true
                    )
                }
                    .val
            };
        amount_out =
            if !exact_input {
                amount_rem
            } else {
                if is_buy {
                    liquidity_math::liquidity_to_base(
                        curr_sqrt_price, next_sqrt_price, liquidity_i128, false
                    )
                } else {
                    liquidity_math::liquidity_to_quote(
                        next_sqrt_price, curr_sqrt_price, liquidity_i128, false
                    )
                }
                    .val
            };
    }

    // Calculate fees. 
    // Amount in is net of fees because we capped amounts by net amount remaining.
    // Fees are rounded down by default to prevent overflow when transferring amounts.
    // Note that in Uniswap, if target price is not reached, LP takes the remainder 
    // of the maximum input as fee. We don't do that here.
    let fees = fee_math::net_to_fee(amount_in, fee_rate);

    // Return amounts.
    (amount_in, amount_out, fees, next_sqrt_price)
}

// Calculates next sqrt price after swapping in certain amount of tokens at given starting 
// sqrt price and liquidity.
//
// # Arguments
// * `curr_sqrt_price` - current sqrt price
// * `liquidity` - current liquidity
// * `amount_in` - amount of tokens to swap in
// * `is_buy` - whether swap is a buy or sell
//
// # Returns
// * `next_sqrt_price` - next sqrt price
pub fn next_sqrt_price_input(
    curr_sqrt_price: u256, liquidity: u128, amount_in: u256, is_buy: bool,
) -> u256 {
    // Input validation.
    assert(curr_sqrt_price != 0, 'PriceZero');
    assert(liquidity != 0, 'LiqZero');

    if is_buy {
        // Buy case: sqrt_price + amount * ONE / liquidity.
        // Round down to avoid overflow near max price.
        let next = curr_sqrt_price + math::mul_div(amount_in, ONE, liquidity.into(), false);
        assert(next <= MAX_SQRT_PRICE, 'PriceOF');
        next
    } else {
        // Sell case: switches between a more precise and less precise formula depending on overflow.
        // Round up to avoid underflow near min price.
        if amount_in == 0 {
            return curr_sqrt_price;
        }
        let product: u512 = u256_wide_mul(amount_in, curr_sqrt_price);
        if product.limb2 == 0 && product.limb3 == 0 {
            // Case 1 (more precise): 
            // liquidity * sqrt_price / (liquidity + (amount_in * sqrt_price / ONE))
            let product = u256 { low: product.limb0, high: product.limb1 };
            math::mul_div(liquidity.into(), curr_sqrt_price, liquidity.into() + product / ONE, true)
        } else {
            // Case 2 (less precise): 
            // liquidity * ONE / ((liquidity * ONE / sqrt_price) + amount_in)   
            math::mul_div(
                liquidity.into(),
                ONE,
                math::mul_div(liquidity.into(), ONE, curr_sqrt_price, false) + amount_in,
                true
            )
        }
    }
}

// Calculates next sqrt price after swapping out certain amount of tokens at given starting sqrt price 
// and liquidity.
//
// # Arguments
// * `curr_sqrt_price` - current sqrt price
// * `liquidity` - current liquidity
// * `amount_out` - amount of tokens to swap out
// * `is_buy` - whether swap is a buy or sell
//
// # Returns
// * `next_sqrt_price` - next sqrt price
pub fn next_sqrt_price_output(
    curr_sqrt_price: u256, liquidity: u128, amount_out: u256, is_buy: bool,
) -> u256 {
    // Input validation.
    assert(curr_sqrt_price != 0, 'PriceZero');
    assert(liquidity != 0, 'LiqZero');

    if is_buy {
        // Buy case: liquidity * sqrt_price / (liquidity - (amount_out * sqrt_price / ONE))
        let product_wide: u512 = u256_wide_mul(amount_out, curr_sqrt_price);
        let product = math::mul_div(amount_out, curr_sqrt_price, ONE, true);
        assert(
            product_wide.limb2 == 0 && product_wide.limb3 == 0 && liquidity.into() > product,
            'PriceOF'
        );
        math::mul_div(liquidity.into(), curr_sqrt_price, liquidity.into() - product, true)
    } else {
        // Sell case: sqrt_price - amount * ONE / liquidity
        curr_sqrt_price - math::mul_div(amount_out, ONE, liquidity.into(), true)
    }
}
