// Core lib imports.
use core::cmp::{min, max};
use starknet::ContractAddress;
use core::dict::{Felt252Dict, Felt252DictTrait};

// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::math::fee_math;
use haiko_lib::id;
use haiko_lib::types::core::{MarketState, LimitInfo};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap, swap_multiple},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, token_params, default_market_params, modify_position_params,
    swap_params, swap_multiple_params, default_token_params
};
use haiko_lib::helpers::utils::{to_e28, to_e18, approx_eq};

// External imports.
use snforge_std::{start_prank, declare, ContractClass, ContractClassTrait};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// TYPES
////////////////////////////////

#[derive(Drop, Copy)]
struct State {
    curr_limit: u32,
    liquidity: u128, // market liquidity
    lower_liq: u128,
    upper_liq: u128,
    lower_liq_delta: i128,
    upper_liq_delta: i128,
}

#[derive(Drop, Copy)]
struct Market {
    base_reserves: u256,
    quote_reserves: u256,
    liquidity: u128,
}

#[derive(Drop, Copy)]
struct Balances {
    base: u256,
    quote: u256,
}

#[derive(Drop, Copy)]
struct FeeFactors {
    market_base: u256,
    market_quote: u256,
    below_base: u256,
    below_quote: u256,
    above_base: u256,
    above_quote: u256,
}

////////////////////////////////
// SETUP
////////////////////////////////

fn before(
    manager: ContractClass, token: ContractClass, swap_fee: u16
) -> (IMarketManagerDispatcher, felt252, ERC20ABIDispatcher, ERC20ABIDispatcher) {
    // Deploy market manager.
    let market_manager = deploy_market_manager(manager, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();

    let base_token = deploy_token(token, base_token_params);
    let quote_token = deploy_token(token, quote_token_params);

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(5000000000000000000000000000000000000000000);
    let initial_quote_amount = to_e28(100000000000000000000000000000000000000000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET;
    params.swap_fee_rate = swap_fee;
    params.width = 1;

    let market_id = create_market(market_manager, params);

    (market_manager, market_id, base_token, quote_token)
}

////////////////////////////////
// TESTS
////////////////////////////////

// Places five positions, executes some swaps, then iteratively removes liquidity from each position.
// Checks for following invariants:
// 1. Add liq: liquidity after is always gt liquidity before if lower <= curr < upper, or equal otherwise.
// 2. Add liq: gross liquidity is always greater than before for lower and upper limits.
// 3. Add liq: net liquidity is always greater than before for lower limit, and lower for upper limit.
// 4. Rem liq: liquidity after is always lt liquidity before if lower <= curr < upper, or equal otherwise.
// 5. Rem liq: gross liquidity is never greater than before for lower and upper limits.
// 6. Rem liq: net liquidity is never greater than before for lower limit, and never lower for upper limit.
// 7. Liquidity delta summed over all limits should be 0
// 8. Market liquidity is equal to sum of liquidity delta for all limits below and including current limit.
// 9. Fee factors of curr_limit-width + fee factors of curr_limit+width <= fee factors of curr_limit
// 10. Swap buy never decreases quote fee factor, and never changes base fee factor.
// 11. Swap sell never decreases base fee factor, and never changes quote fee factor.
// 12. If swap does not change market sqrt price, liquidity is not changed either.
// 13. Amounts inside position are equal to amounts withdrawn.
// 14. Amounts paid out should be lower than or equal to amounts paid in.
// 15. Adding then removing liquidity works, and results in same reserves and liquidity (+ epsilon)
// 16. Removing liquidity on position with amount 0 never fails, and does not change market liquidity.
// 17. Swapping amount in and back out in 0 fee market yields same reserves and liquidity (+ epsilon).
#[test]
fn test_modify_position_and_swap_invariants(
    pos1_limit1: u16,
    pos1_limit2: u16,
    pos1_liquidity: u32,
    pos2_limit1: u16,
    pos2_limit2: u16,
    pos2_liquidity: u32,
    pos3_limit1: u16,
    pos3_limit2: u16,
    pos3_liquidity: u32,
    pos4_limit1: u16,
    pos4_limit2: u16,
    pos4_liquidity: u32,
    pos5_limit1: u16,
    pos5_limit2: u16,
    pos5_liquidity: u32,
    swap1_amount: u32,
    swap2_amount: u32,
    swap3_amount: u32,
    swap4_amount: u32,
    swap5_amount: u32,
    swap6_amount: u32,
    swap7_amount: u32,
    swap8_amount: u32,
    swap9_amount: u32,
    swap10_amount: u32,
) {
    // Initialise position params.
    let pos1_lower_limit: u32 = OFFSET - 32768 + min(pos1_limit1, pos1_limit2).into();
    let pos1_upper_limit: u32 = OFFSET - 32768 + max(pos1_limit1, pos1_limit2).into();
    let pos1_liquidity: u128 = pos1_liquidity.into() * 1000000;
    let pos2_lower_limit: u32 = OFFSET - 32768 + min(pos2_limit1, pos2_limit2).into();
    let pos2_upper_limit: u32 = OFFSET - 32768 + max(pos2_limit1, pos2_limit2).into();
    let pos2_liquidity: u128 = pos2_liquidity.into() * 1000000;
    let pos3_lower_limit: u32 = OFFSET - 32768 + min(pos3_limit1, pos3_limit2).into();
    let pos3_upper_limit: u32 = OFFSET - 32768 + max(pos3_limit1, pos3_limit2).into();
    let pos3_liquidity: u128 = pos3_liquidity.into() * 1000000;
    let pos4_lower_limit: u32 = OFFSET - 32768 + min(pos4_limit1, pos4_limit2).into();
    let pos4_upper_limit: u32 = OFFSET - 32768 + max(pos4_limit1, pos4_limit2).into();
    let pos4_liquidity: u128 = pos4_liquidity.into() * 1000000;
    let pos5_lower_limit: u32 = OFFSET - 32768 + min(pos5_limit1, pos5_limit2).into();
    let pos5_upper_limit: u32 = OFFSET - 32768 + max(pos5_limit1, pos5_limit2).into();
    let pos5_liquidity: u128 = pos5_liquidity.into() * 1000000;

    let position_params = array![
        (pos1_lower_limit, pos1_upper_limit, pos1_liquidity),
        (pos2_lower_limit, pos2_upper_limit, pos2_liquidity),
        (pos3_lower_limit, pos3_upper_limit, pos3_liquidity),
        (pos4_lower_limit, pos4_upper_limit, pos4_liquidity),
        (pos5_lower_limit, pos5_upper_limit, pos5_liquidity),
    ]
        .span();

    let limits_span = array![
        pos1_limit1,
        pos1_limit2,
        pos2_limit1,
        pos2_limit2,
        pos3_limit1,
        pos3_limit2,
        pos4_limit1,
        pos4_limit2,
        pos5_limit1,
        pos5_limit2
    ]
        .span();

    let swap_amounts = array![
        swap1_amount,
        swap2_amount,
        swap3_amount,
        swap4_amount,
        swap5_amount,
        swap6_amount,
        swap7_amount,
        swap8_amount,
        swap9_amount,
        swap10_amount,
    ]
        .span();

    let (manager, token) = test_invariants_set1(position_params, limits_span, swap_amounts);
    test_invariants_set2(manager, token, position_params);
// test_invariants_set3(manager, token, position_params, swap_amounts);
}

// Tests for invariants 1-14.
// 
// # Arguments
// * `position_params` - fuzz test cases for positiions
// * `limits_span` - span of limits used for calculating cumulative liquidity delta
// * `swap_amounts` - fuzz test cases for swaps
fn test_invariants_set1(
    position_params: Span<(u32, u32, u128)>, limits_span: Span<u16>, swap_amounts: Span<u32>,
) -> (ContractClass, ContractClass) {
    let manager_class = declare("MarketManager");
    let erc20_class = declare("ERC20");
    let (market_manager, market_id, base_token, quote_token) = before(
        manager_class, erc20_class, 30
    );

    // Snapshot start state and initialise fee counters.
    let start_bal = _snapshot_balances(market_manager, base_token, quote_token, alice());

    // Place positions.
    let mut i = 0;
    loop {
        if i >= position_params.len() {
            break;
        }
        // Fetch position params.
        let (lower_limit, upper_limit, liquidity) = *position_params.at(i);

        // Place position if not fail case.
        if lower_limit != upper_limit && liquidity != 0 {
            let start_state = _snapshot_state(market_manager, market_id, lower_limit, upper_limit);
            let mut params = modify_position_params(
                alice(),
                market_id,
                lower_limit,
                upper_limit,
                I128Trait::new(liquidity.into(), false)
            );
            modify_position(market_manager, params);
            let end_state = _snapshot_state(market_manager, market_id, lower_limit, upper_limit);
            if lower_limit <= start_state.curr_limit && upper_limit > start_state.curr_limit {
                assert(end_state.liquidity > start_state.liquidity, 'Invariant 1');
            } else {
                assert(end_state.liquidity == start_state.liquidity, 'Invariant 1');
            }
            assert(end_state.lower_liq > start_state.lower_liq, 'Invariant 2a: lower');
            assert(end_state.upper_liq > start_state.upper_liq, 'Invariant 2b: upper');
            assert(end_state.lower_liq_delta > start_state.lower_liq_delta, 'Invariant 3a: lower');
            assert(end_state.upper_liq_delta < start_state.upper_liq_delta, 'Invariant 3b: upper');
        }
        // Move to next position.
        i += 1;
    };

    // Execute swaps, skipping fail cases.
    let mut j = 0;
    loop {
        if j >= swap_amounts.len() {
            break;
        }
        let amount = *swap_amounts.at(j);
        let is_buy = amount % 2 == 0;
        if amount != 0 {
            // Snapshot start state.
            let market_state_start = market_manager.market_state(market_id);
            let fee_factors_start = _snapshot_fee_factors(market_manager, market_id);

            let mut params = swap_params(
                alice(),
                market_id,
                is_buy,
                true,
                amount.into(),
                Option::None(()),
                Option::None(()),
                Option::None(())
            );
            swap(market_manager, params);

            // Snapshot end state.
            let market_state_end = market_manager.market_state(market_id);
            let fee_factors_end = _snapshot_fee_factors(market_manager, market_id);
            let base_total = fee_factors_end.below_base + fee_factors_end.above_base;
            let quote_total = fee_factors_end.below_quote + fee_factors_end.above_quote;

            // Check invariants.
            if market_state_start.curr_sqrt_price == market_state_end.curr_sqrt_price {
                assert(market_state_start.liquidity == market_state_end.liquidity, 'Invariant 12');
            }
            assert(fee_factors_end.market_base >= base_total, 'Invariant 9: base');
            assert(fee_factors_end.market_quote >= quote_total, 'Invariant 9: quote');
            if is_buy {
                assert(
                    fee_factors_end.market_base == fee_factors_start.market_base,
                    'Invariant 10: base'
                );
                assert(
                    fee_factors_end.market_quote >= fee_factors_start.market_quote,
                    'Invariant 10: quote'
                );
            } else {
                assert(
                    fee_factors_end.market_quote == fee_factors_start.market_quote,
                    'Invariant 11: quote'
                );
                assert(
                    fee_factors_end.market_base >= fee_factors_start.market_base,
                    'Invariant 11: base'
                );
            }
        }
        j += 1;
    };

    // Iteratively remove liquidity from each position and check invariants.
    let mut m = 0;
    loop {
        if m >= position_params.len() {
            break;
        }

        // Fetch position params.
        let (lower_limit, upper_limit, liquidity) = *position_params.at(m);

        // Skip fail cases.
        if lower_limit != upper_limit && liquidity != 0 {
            // Calculate amount inside position.
            let (base_amount_exp, quote_amount_exp, base_fees_exp, quote_fees_exp) = market_manager
                .amounts_inside_position(market_id, alice().into(), lower_limit, upper_limit);

            // Remove liquidity.
            let start_state = _snapshot_state(market_manager, market_id, lower_limit, upper_limit);
            let mut params = modify_position_params(
                alice(), market_id, lower_limit, upper_limit, I128Trait::new(liquidity, true)
            );
            let (base_amount, quote_amount, _, _) = modify_position(market_manager, params);
            let end_state = _snapshot_state(market_manager, market_id, lower_limit, upper_limit);

            // Check invariants.
            if lower_limit <= start_state.curr_limit && upper_limit > start_state.curr_limit {
                assert(end_state.liquidity < start_state.liquidity, 'Invariant 4');
            } else {
                assert(end_state.liquidity == start_state.liquidity, 'Invariant 4');
            }
            assert(end_state.lower_liq <= start_state.lower_liq, 'Invariant 5a: lower');
            assert(end_state.upper_liq <= start_state.upper_liq, 'Invariant 5b: upper');
            assert(end_state.lower_liq_delta <= start_state.lower_liq_delta, 'Invariant 6a: lower');
            assert(end_state.upper_liq_delta >= start_state.upper_liq_delta, 'Invariant 6b: upper');
            assert(base_amount_exp + base_fees_exp == base_amount.val, 'Invariant 13: base');
            assert(quote_amount_exp + quote_fees_exp == quote_amount.val, 'Invariant 13: quote');
        }

        m += 1;
    };

    // Snapshot end state and check invariants.
    let end_bal = _snapshot_balances(market_manager, base_token, quote_token, alice());
    let base_diff = max(start_bal.base, end_bal.base) - min(start_bal.base, end_bal.base);
    let quote_diff = max(start_bal.quote, end_bal.quote) - min(start_bal.quote, end_bal.quote);
    assert(base_diff >= 0, 'Invariant 14: base');
    assert(quote_diff >= 0, 'Invariant 14: quote');

    // Sum liquidity delta over limits and check invariants.
    let mut cumul_liquidity = I128Trait::new(0, false);
    let mut cumul_liquidity_below_curr = I128Trait::new(0, false);
    let mut n = 0;
    loop {
        if n >= limits_span.len() {
            break;
        }

        // Fetch limit params.
        let limit = *limits_span.at(n);

        // Sum liquidity delta.
        let limit_info = market_manager.limit_info(market_id, limit.into());
        cumul_liquidity += limit_info.liquidity_delta;
        if limit.into() <= market_manager.market_state(market_id).curr_limit {
            cumul_liquidity_below_curr += limit_info.liquidity_delta;
        }

        n += 1;
    };
    assert(cumul_liquidity.val == 0, 'Invariant 7');
    let liquidity = market_manager.liquidity(market_id);
    assert(cumul_liquidity_below_curr.val == liquidity, 'Invariant 8');

    // Return contract class to be reused in next sets.
    (manager_class, erc20_class)
}

// Tests for invariants 15-16.
//
// # Arguments
// * `class` - contract class for deploying market manager
// * `position_params` - fuzz test cases for positiions
fn test_invariants_set2(
    manager: ContractClass, token: ContractClass, position_params: Span<(u32, u32, u128)>
) {
    let (market_manager, market_id, base_token, quote_token) = before(manager, token, 30);

    // Place positions.
    let mut i = 0;
    loop {
        if i >= position_params.len() {
            break;
        }
        // Fetch position params.
        let (lower_limit, upper_limit, liquidity) = *position_params.at(i);

        // Place position if not fail case.
        if lower_limit != upper_limit && liquidity != 0 {
            // Snapshot start state.
            let start_state = _snapshot_market(market_manager, market_id, base_token, quote_token);

            // Place position.
            let mut params = modify_position_params(
                alice(),
                market_id,
                lower_limit,
                upper_limit,
                I128Trait::new(liquidity.into(), false)
            );
            modify_position(market_manager, params);

            // Call remove with 0 liquidity, snapshot intermediate state before / after and check invariant.
            let inter_before = _snapshot_market(market_manager, market_id, base_token, quote_token);
            params.liquidity_delta = I128Trait::new(0, false);
            modify_position(market_manager, params);
            let inter_after = _snapshot_market(market_manager, market_id, base_token, quote_token);
            assert(inter_after.liquidity == inter_before.liquidity, 'Invariant 16');

            // Finally, remove position.
            params.liquidity_delta = I128Trait::new(liquidity.into(), true);
            modify_position(market_manager, params);

            // Snapshot end state.
            let end_state = _snapshot_market(market_manager, market_id, base_token, quote_token);

            // Check invariants.
            assert(
                approx_eq(end_state.base_reserves, start_state.base_reserves, 10),
                'Invariant 15: base'
            );
            assert(
                approx_eq(end_state.quote_reserves, start_state.quote_reserves, 10),
                'Invariant 15: quote'
            );
            assert(end_state.liquidity == start_state.liquidity, 'Invariant 15: liquidity');
        }
        // Move to next position.
        i += 1;
    };
}

// Test for invariant 17.
//
// # Arguments
// * `class` - contract class for deploying market manager
// * `position_params` - fuzz test cases for positiions
// * `swap_amounts` - fuzz test cases for swaps
fn test_invariants_set3(
    manager: ContractClass,
    token: ContractClass,
    position_params: Span<(u32, u32, u128)>,
    swap_amounts: Span<u32>
) {
    let (market_manager, market_id, base_token, quote_token) = before(manager, token, 0);

    // Place positions.
    let mut i = 0;
    loop {
        if i >= position_params.len() {
            break;
        }
        // Fetch position params.
        let (lower_limit, upper_limit, liquidity) = *position_params.at(i);

        // Place position if not fail case.
        if lower_limit != upper_limit && liquidity != 0 {
            let mut params = modify_position_params(
                alice(),
                market_id,
                lower_limit,
                upper_limit,
                I128Trait::new(liquidity.into(), false)
            );
            modify_position(market_manager, params);
        }
        // Move to next position.
        i += 1;
    };

    // Execute swaps, skipping fail cases.
    let mut j = 0;
    loop {
        if j >= swap_amounts.len() {
            break;
        }
        let amount = *swap_amounts.at(j);
        let is_buy = amount % 2 == 0;
        if amount != 0 {
            // Snapshot start state.
            let state_start = _snapshot_market(market_manager, market_id, base_token, quote_token);

            // Swap in
            let mut params = swap_params(
                alice(),
                market_id,
                is_buy,
                true,
                amount.into(),
                Option::None(()),
                Option::None(()),
                Option::None(())
            );
            let (_amount_in, amount_out, _fees) = swap(market_manager, params);
            // Swap back out.
            params.amount = amount_out;
            params.is_buy = !is_buy;
            swap(market_manager, params);

            // Snapshot end state.
            let state_end = _snapshot_market(market_manager, market_id, base_token, quote_token);

            // Check invariants.
            assert(
                approx_eq(state_end.base_reserves, state_start.base_reserves, 10),
                'Invariant 17: base'
            );
            assert(
                approx_eq(state_end.quote_reserves, state_start.quote_reserves, 10),
                'Invariant 17: quote'
            );
        }
        j += 1;
    };
}

////////////////////////////////
// INTERNAL HELPERS
////////////////////////////////

fn _snapshot_state(
    market_manager: IMarketManagerDispatcher, market_id: felt252, lower_limit: u32, upper_limit: u32
) -> State {
    let market_state = market_manager.market_state(market_id);
    let curr_limit = market_state.curr_limit;
    let liquidity = market_state.liquidity;
    let lower_limit_info = market_manager.limit_info(market_id, lower_limit);
    let upper_limit_info = market_manager.limit_info(market_id, upper_limit);
    let lower_liq = lower_limit_info.liquidity;
    let upper_liq = upper_limit_info.liquidity;
    let lower_liq_delta = lower_limit_info.liquidity_delta;
    let upper_liq_delta = upper_limit_info.liquidity_delta;

    State { curr_limit, liquidity, lower_liq, upper_liq, lower_liq_delta, upper_liq_delta }
}

fn _snapshot_market(
    market_manager: IMarketManagerDispatcher,
    market_id: felt252,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher,
) -> Market {
    Market {
        base_reserves: market_manager.reserves(base_token.contract_address),
        quote_reserves: market_manager.reserves(quote_token.contract_address),
        liquidity: market_manager.liquidity(market_id),
    }
}

fn _snapshot_balances(
    market_manager: IMarketManagerDispatcher,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher,
    lp: ContractAddress,
) -> Balances {
    let base = base_token.balanceOf(lp);
    let quote = quote_token.balanceOf(lp);

    Balances { base, quote }
}

fn _snapshot_fee_factors(
    market_manager: IMarketManagerDispatcher, market_id: felt252,
) -> FeeFactors {
    let width = market_manager.width(market_id);
    let curr_limit = market_manager.curr_limit(market_id);
    let market_state = market_manager.market_state(market_id);
    let below_limit_info = market_manager.limit_info(market_id, curr_limit - width);
    let above_limit_info = market_manager.limit_info(market_id, curr_limit + width);
    FeeFactors {
        market_base: market_state.base_fee_factor,
        market_quote: market_state.quote_fee_factor,
        below_base: below_limit_info.base_fee_factor,
        below_quote: below_limit_info.quote_fee_factor,
        above_base: above_limit_info.base_fee_factor,
        above_quote: above_limit_info.quote_fee_factor,
    }
}
