// Core lib imports.
use core::cmp::{min, max};
use core::integer::BoundedInt;
use core::dict::Felt252DictTrait;
use core::nullable::{match_nullable, FromNullableResult, NullableTrait};

// Local imports.
use haiko_amm::libraries::tree;
use haiko_amm::libraries::swap_lib::{
    compute_swap_amounts, next_sqrt_price_input, next_sqrt_price_output
};
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
use haiko_lib::types::core::{MarketState, PositionInfo};
use haiko_lib::types::i128::{i128, I128Trait};

// Iteratively simulate swap up to next initialised limit price.
//
// # Arguments
// * `market_id` - market id
// * `market_state` - market state
// * `amount_rem` - amount remaining to be swapped
// * `amount_calc` - amount out if exact input or amount in if exact output
// * `queued_deltas` - liquidity deltas from strategy position updates
// * `target_limits` - additional target limits from queued strategy position updates
// * `threshold_sqrt_price` - price threshold
// * `fee_rate` - fee rate
// * `width` - limit width
// * `is_buy` - whether swap is a buy or sell
// * `exact_input` - whether swap amount is exact input or output
pub fn quote_iter(
    self: @ContractState,
    market_id: felt252,
    ref market_state: MarketState,
    ref amount_rem: u256,
    ref amount_calc: u256,
    ref queued_deltas: Felt252Dict<Nullable<i128>>,
    target_limits: Span<u32>,
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

    // Get next initialised limit from bitmap, and from queued strategies.
    let target_limit_opt = tree::next_limit(
        self, market_id, is_buy, width, market_state.curr_limit
    );
    let target_limit_strat = next_limit(target_limits, is_buy, market_state.curr_limit);

    // If running out of liquidity, we stop the swap execution.
    if target_limit_opt.is_none() && target_limit_strat.is_none() {
        return;
    }
    // Otherwise, take the closer of the two possible target limits.
    let mut target_limit = if target_limit_opt.is_some() && target_limit_strat.is_some() {
        if is_buy {
            min(target_limit_opt.unwrap(), target_limit_strat.unwrap())
        } else {
            max(target_limit_opt.unwrap(), target_limit_strat.unwrap())
        }
    } else {
        if target_limit_opt.is_some() {
            target_limit_opt.unwrap()
        } else {
            target_limit_strat.unwrap()
        }
    };

    // Constrain target limit to max limit.
    target_limit = min(target_limit, price_math::max_limit(width));

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
    if exact_input {
        amount_rem -= min(amount_in_iter + fee_iter, amount_rem);
        amount_calc += amount_out_iter;
    } else {
        amount_rem -= min(amount_out_iter, amount_rem);
        amount_calc += amount_in_iter + fee_iter;
    }

    // Move to the next iteration if price target reached.
    if market_state.curr_sqrt_price == uncapped_target_sqrt_price {
        // Initiate cumulative liquidity delta. Unlike a regular swap, we need to apply both
        // sets of liquidity deltas. Updating liquidity directly can cause sub overflow.
        let mut cumul_liquidity_delta = I128Trait::new(0, false);

        // Calculate liquidity deltas from queued strategy positions.
        let mut queued_delta = unbox_delta(ref queued_deltas, target_limit);
        if !is_buy {
            queued_delta.sign = !queued_delta.sign;
        }
        cumul_liquidity_delta += queued_delta;

        // Calculate regular liquidity delta.
        let limit_info = self.limit_info.read((market_id, target_limit));
        let mut liquidity_delta = limit_info.liquidity_delta;
        if !is_buy {
            liquidity_delta.sign = !liquidity_delta.sign;
        }
        cumul_liquidity_delta += liquidity_delta;

        // Finally, apply cumulative liquidity delta.
        liquidity_math::add_delta(ref market_state.liquidity, cumul_liquidity_delta);

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
        quote_iter(
            self,
            market_id,
            ref market_state,
            ref amount_rem,
            ref amount_calc,
            ref queued_deltas,
            target_limits,
            threshold_sqrt_price,
            fee_rate,
            width,
            is_buy,
            exact_input,
        )
    }
}

// Finds next limit from the array of initialised limits from queued strategy position updates.
// 
// # Arguments
// * `target_limits` - array of initialised limits
// * `is_buy` - whether swap is a buy or sell
// * `curr_limit` - current limit
//
// # Returns
// * `next_limit` - next limit (or None if no next limit)
pub fn next_limit(target_limits: Span<u32>, is_buy: bool, curr_limit: u32,) -> Option<u32> {
    let mut next_limit = if is_buy {
        BoundedInt::max()
    } else {
        0
    };
    let mut exists = false;

    // Iterate through limits and return the closest one to the current limit, 
    // higher for bids and lower for asks.
    let mut i = 0;
    loop {
        if i >= target_limits.len() {
            break;
        }
        let target_limit = *target_limits.at(i);
        if is_buy {
            if target_limit > curr_limit && target_limit < next_limit {
                next_limit = target_limit;
                exists = true;
            }
        } else {
            if target_limit < curr_limit && target_limit > next_limit {
                next_limit = target_limit;
                exists = true;
            }
        }
        i += 1;
    };

    if exists {
        Option::Some(next_limit)
    } else {
        Option::None(())
    }
}

// Internal function used to populate two arrays used for tracking the liquidity deltas
// and initialised limits for queued strategy positions updates. Used by `unsafe_quote`.
//
// # Arguments
// * `queued_deltas` - ref to mapping of limit of liquidity deltas
// * `target_limits` - ref to array of initialised limits
// * `market_state` - ref to market state
// * `positions` - list of queued positions to update
// * `is_placed` - whether positions are placed or queued
pub fn populate_limit(
    ref queued_deltas: Felt252Dict<Nullable<i128>>,
    ref target_limits: Array<u32>,
    ref market_state: MarketState,
    position: PositionInfo,
    is_placed: bool,
) {
    let curr_limit = market_state.curr_limit;
    if position.lower_limit <= curr_limit && position.upper_limit > curr_limit {
        if is_placed {
            market_state.liquidity -= position.liquidity;
        } else {
            market_state.liquidity += position.liquidity;
        }
    }
    let mut lower_liq_delta = unbox_delta(ref queued_deltas, position.lower_limit);
    let mut upper_liq_delta = unbox_delta(ref queued_deltas, position.upper_limit);
    lower_liq_delta += I128Trait::new(position.liquidity, is_placed);
    upper_liq_delta += I128Trait::new(position.liquidity, !is_placed);

    let lower_liq = NullableTrait::new(lower_liq_delta);
    let upper_liq = NullableTrait::new(upper_liq_delta);
    queued_deltas.insert(position.lower_limit.into(), lower_liq);
    queued_deltas.insert(position.upper_limit.into(), upper_liq);
    target_limits.append(position.lower_limit);
    target_limits.append(position.upper_limit);
}

// Helper function to unbox liquidity delta from dictionary.
//
// # Arguments
// * `queued_deltas` - ref to mapping of limit to liquidity deltas
// * `target_limit` - target limit to unbox
pub fn unbox_delta(ref queued_deltas: Felt252Dict<Nullable<i128>>, target_limit: u32) -> i128 {
    let queued_delta = queued_deltas.get(target_limit.into());
    match match_nullable(queued_delta) {
        FromNullableResult::Null => I128Trait::new(0, false),
        FromNullableResult::NotNull(queued_delta) => { queued_delta.unbox() }
    }
}
