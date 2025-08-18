// Core lib imports.
use core::cmp::{min, max};

// Local imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::math::fee_math;
use haiko_lib::types::i128::I128Trait;
use haiko_lib::types::i256::{i256, I256Trait};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, token_params, default_market_params, modify_position_params,
    swap_params, swap_multiple_params, default_token_params
};
use haiko_lib::helpers::utils::{to_e28, to_e18, encode_sqrt_price};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve},
};

// External imports.
use snforge_std::{start_prank, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// TYPES
////////////////////////////////

#[derive(Drop, Copy)]
struct MarketState {
    curr_limit: u32,
    base_fee_factor: u256,
    quote_fee_factor: u256,
}

#[derive(Drop, Copy)]
struct LimitState {
    base_fee_factor: u256,
    quote_fee_factor: u256,
}

#[derive(Drop, Copy)]
struct PositionState {
    liquidity: u128,
    base_fee_factor: i256,
    quote_fee_factor: i256,
    base_fee_factor_last: i256,
    quote_fee_factor_last: i256,
    lower_limit: LimitState,
    upper_limit: LimitState,
}

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, felt252, ERC20ABIDispatcher, ERC20ABIDispatcher) {
    // Deploy market manager.
    let class = declare("MarketManager");
    let market_manager = deploy_market_manager(class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

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
    params.width = 1;

    let market_id = create_market(market_manager, params);

    (market_manager, market_id, base_token, quote_token)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_fee_factor_invariants(
    pos1_limit1: u16,
    pos1_limit2: u16,
    pos1_liquidity: u32,
    pos1_rem_pct: u8,
    pos2_limit1: u16,
    pos2_limit2: u16,
    pos2_liquidity: u32,
    pos2_rem_pct: u8,
    pos3_limit1: u16,
    pos3_limit2: u16,
    pos3_liquidity: u32,
    pos3_rem_pct: u8,
    pos4_limit1: u16,
    pos4_limit2: u16,
    pos4_liquidity: u32,
    pos4_rem_pct: u8,
    pos5_limit1: u16,
    pos5_limit2: u16,
    pos5_liquidity: u32,
    pos5_rem_pct: u8,
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
    let (market_manager, market_id, _base_token, _quote_token) = before();

    // Initialise position params.
    let pos1_lower_limit: u32 = OFFSET - 32768 + min(pos1_limit1, pos1_limit2).into();
    let pos1_upper_limit: u32 = OFFSET - 32768 + max(pos1_limit1, pos1_limit2).into();
    let pos1_liquidity: u128 = pos1_liquidity.into() * 1000000;
    let pos1_rem_liq = pos1_liquidity * pos1_rem_pct.into() / 256;
    let pos2_lower_limit: u32 = OFFSET - 32768 + min(pos2_limit1, pos2_limit2).into();
    let pos2_upper_limit: u32 = OFFSET - 32768 + max(pos2_limit1, pos2_limit2).into();
    let pos2_liquidity: u128 = pos2_liquidity.into() * 1000000;
    let pos2_rem_liq: u128 = pos2_liquidity * pos2_rem_pct.into() / 256;
    let pos3_lower_limit: u32 = OFFSET - 32768 + min(pos3_limit1, pos3_limit2).into();
    let pos3_upper_limit: u32 = OFFSET - 32768 + max(pos3_limit1, pos3_limit2).into();
    let pos3_liquidity: u128 = pos3_liquidity.into() * 1000000;
    let pos3_rem_liq: u128 = pos3_liquidity * pos3_rem_pct.into() / 256;
    let pos4_lower_limit: u32 = OFFSET - 32768 + min(pos4_limit1, pos4_limit2).into();
    let pos4_upper_limit: u32 = OFFSET - 32768 + max(pos4_limit1, pos4_limit2).into();
    let pos4_liquidity: u128 = pos4_liquidity.into() * 1000000;
    let pos4_rem_liq = pos4_liquidity * pos4_rem_pct.into() / 256;
    let pos5_lower_limit: u32 = OFFSET - 32768 + min(pos5_limit1, pos5_limit2).into();
    let pos5_upper_limit: u32 = OFFSET - 32768 + max(pos5_limit1, pos5_limit2).into();
    let pos5_liquidity: u128 = pos5_liquidity.into() * 1000000;
    let pos5_rem_liq: u128 = pos5_liquidity * pos5_rem_pct.into() / 256;

    let mut position_params = array![
        (pos1_lower_limit, pos1_upper_limit, pos1_liquidity, pos1_rem_liq),
        (pos2_lower_limit, pos2_upper_limit, pos2_liquidity, pos2_rem_liq),
        (pos3_lower_limit, pos3_upper_limit, pos3_liquidity, pos3_rem_liq),
        (pos4_lower_limit, pos4_upper_limit, pos4_liquidity, pos4_rem_liq),
        (pos5_lower_limit, pos5_upper_limit, pos5_liquidity, pos5_rem_liq),
    ]
        .span();

    // Place positions.
    let mut i = 0;
    loop {
        if i >= position_params.len() {
            break;
        }
        // Fetch position params.
        let (lower_limit, upper_limit, liquidity, _) = *position_params.at(i);

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

    // Execute swaps and check fee factor invariants.
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

    // Loop through swaps.
    let mut j = 0;
    loop {
        if j >= swap_amounts.len() {
            break;
        }

        // Snapshot state before.
        let (_market_state_bef, position_states_bef) = snapshot_all(
            market_manager, market_id, position_params
        );

        // Execute swap, skipping fail cases.
        let amount = *swap_amounts.at(j);
        let is_buy = amount % 2 == 0;
        if amount != 0 {
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

            // Snapshot state after.
            let (market_state_aft, position_states_aft) = snapshot_all(
                market_manager, market_id, position_params
            );

            // Check fee factor invariants.
            // Loop through positions.
            let mut k = 0;
            loop {
                if k >= position_params.len() {
                    break;
                }

                // Invariant 1: fee factor inside position is never negative.
                // No actual checks need to be performed here as it would have failed on snapshot.

                // Invariant 2: fee factor inside position always increases after swap.
                let before = *position_states_bef.at(k);
                let after = *position_states_aft.at(k);
                assert(after.base_fee_factor >= before.base_fee_factor, 'Invariant 2: base');
                assert(after.quote_fee_factor >= before.quote_fee_factor, 'Invariant 2: quote');

                // Invariant 3: position fee factor should never exceed global fee factor.
                assert(
                    after
                        .base_fee_factor <= I256Trait::new(market_state_aft.base_fee_factor, false),
                    'Invariant 3: base'
                );
                assert(
                    after
                        .quote_fee_factor <= I256Trait::new(
                            market_state_aft.quote_fee_factor, false
                        ),
                    'Invariant 3: quote'
                );

                // Invariant 4: fee factor inside position should always be gte fee factor last.
                assert(after.base_fee_factor >= before.base_fee_factor_last, 'Invariant 4: base');
                assert(
                    after.quote_fee_factor >= before.quote_fee_factor_last, 'Invariant 4: quote'
                );

                k += 1;
            };
        }
        j += 1;
    };

    // Iteratively remove liquidity from each position and execute swap again. Check invariants.
    let mut m = 0;
    loop {
        if m >= position_params.len() {
            break;
        }

        // Fetch position params.
        let (lower_limit, upper_limit, _, rem_liq) = *position_params.at(m);

        // Snapshot state before.
        let (_before_mkt, before_pos) = snapshot_single(
            market_manager, market_id, lower_limit, upper_limit
        );

        // Skip fail case.
        if lower_limit != upper_limit && rem_liq != 0 {
            let mut params = modify_position_params(
                alice(), market_id, lower_limit, upper_limit, I128Trait::new(rem_liq.into(), true)
            );
            modify_position(market_manager, params);

            // Snapshot state after.
            let (after_mkt, after_pos) = snapshot_single(
                market_manager, market_id, lower_limit, upper_limit
            );

            // Check fee factor invariants again, with a new check for invariant 5 rather than 4.

            // Invariant 1: fee factor inside position is never negative.
            // No actual checks need to be performed here as it would have failed on snapshot.

            // Invariant 2: fee factor inside position always increases after swap.
            assert(after_pos.base_fee_factor >= before_pos.base_fee_factor, 'Invariant 2: base');
            assert(after_pos.quote_fee_factor >= before_pos.quote_fee_factor, 'Invariant 2: quote');

            // Invariant 3: position fee factor should never exceed global fee factor.
            assert(
                after_pos.base_fee_factor <= I256Trait::new(after_mkt.base_fee_factor, false),
                'Invariant 3: base'
            );
            assert(
                after_pos.quote_fee_factor <= I256Trait::new(after_mkt.quote_fee_factor, false),
                'Invariant 3: quote'
            );

            // Invariant 5: removing liquidity should always set last fee factor to fee factor.
            assert(
                after_pos.base_fee_factor == after_pos.base_fee_factor_last, 'Invariant 5: base'
            );
            assert(
                after_pos.quote_fee_factor == after_pos.quote_fee_factor_last, 'Invariant 5: quote'
            );

            // Execute swap to randomise market conditions.
            let amount = *swap_amounts.at(m);
            let is_buy = amount % 2 == 0;
            if amount != 0 {
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
            }
        }

        m += 1;
    };
}

////////////////////////////////
// INTERNAL HELPERS
////////////////////////////////

// Returns global state of market and all positions.
fn snapshot_all(
    market_manager: IMarketManagerDispatcher,
    market_id: felt252,
    position_params: Span<(u32, u32, u128, u128)>
) -> (MarketState, Span<PositionState>) {
    // Fetch market state.
    let market_state_full = market_manager.market_state(market_id);
    let market_state = MarketState {
        curr_limit: market_state_full.curr_limit,
        base_fee_factor: market_state_full.base_fee_factor,
        quote_fee_factor: market_state_full.quote_fee_factor,
    };

    // Fetch position states.
    let mut i = 0;
    let mut position_states = array![];
    loop {
        if i >= position_params.len() {
            break;
        }

        // Fetch position params.
        let (lower_limit, upper_limit, _, _) = *position_params.at(i);

        // Fetch position.
        let position = market_manager.position(market_id, alice().into(), lower_limit, upper_limit);

        // Fetch limit info.
        let lower_limit_info = market_manager.limit_info(market_id, lower_limit);
        let upper_limit_info = market_manager.limit_info(market_id, upper_limit);

        // Fetch fee factors.
        let (_, _, base_fee_factor, quote_fee_factor) = fee_math::get_fee_inside(
            position,
            lower_limit_info,
            upper_limit_info,
            lower_limit,
            upper_limit,
            market_state.curr_limit,
            market_state.base_fee_factor,
            market_state.quote_fee_factor,
        );

        // Append position state.
        position_states
            .append(
                PositionState {
                    liquidity: position.liquidity,
                    base_fee_factor,
                    quote_fee_factor,
                    base_fee_factor_last: position.base_fee_factor_last,
                    quote_fee_factor_last: position.quote_fee_factor_last,
                    lower_limit: LimitState {
                        base_fee_factor: lower_limit_info.base_fee_factor,
                        quote_fee_factor: lower_limit_info.quote_fee_factor,
                    },
                    upper_limit: LimitState {
                        base_fee_factor: upper_limit_info.base_fee_factor,
                        quote_fee_factor: upper_limit_info.quote_fee_factor,
                    },
                }
            );

        i += 1;
    };

    // Return global state and position states.
    (market_state, position_states.span())
}

// Returns global state of market and all positions.
fn snapshot_single(
    market_manager: IMarketManagerDispatcher,
    market_id: felt252,
    lower_limit: u32,
    upper_limit: u32,
) -> (MarketState, PositionState) {
    // Fetch market state.
    let market_state_full = market_manager.market_state(market_id);
    let market_state = MarketState {
        curr_limit: market_state_full.curr_limit,
        base_fee_factor: market_state_full.base_fee_factor,
        quote_fee_factor: market_state_full.quote_fee_factor,
    };

    // Fetch position.
    let position = market_manager.position(market_id, alice().into(), lower_limit, upper_limit);

    // Fetch limit info.
    let lower_limit_info = market_manager.limit_info(market_id, lower_limit);
    let upper_limit_info = market_manager.limit_info(market_id, upper_limit);

    // Fetch fee factors.
    let (_, _, base_fee_factor, quote_fee_factor) = fee_math::get_fee_inside(
        position,
        lower_limit_info,
        upper_limit_info,
        lower_limit,
        upper_limit,
        market_state.curr_limit,
        market_state.base_fee_factor,
        market_state.quote_fee_factor,
    );

    // Append position state.
    let position_state = PositionState {
        liquidity: position.liquidity,
        base_fee_factor,
        quote_fee_factor,
        base_fee_factor_last: position.base_fee_factor_last,
        quote_fee_factor_last: position.quote_fee_factor_last,
        lower_limit: LimitState {
            base_fee_factor: lower_limit_info.base_fee_factor,
            quote_fee_factor: lower_limit_info.quote_fee_factor,
        },
        upper_limit: LimitState {
            base_fee_factor: upper_limit_info.base_fee_factor,
            quote_fee_factor: upper_limit_info.quote_fee_factor,
        },
    };

    // Return global state and position states.
    (market_state, position_state)
}
