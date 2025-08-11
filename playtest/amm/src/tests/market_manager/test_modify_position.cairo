// Core lib imports.
use starknet::ContractAddress;
use starknet::contract_address_const;

// Haiko imports.
use haiko_lib::math::price_math;
use haiko_lib::constants::{OFFSET, MAX_LIMIT, MIN_LIMIT, MAX_LIMIT_SHIFTED, MAX_WIDTH};
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::types::core::{LimitInfo, MarketConfigs, Config, ConfigOption};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::types::i256::{i256, I256Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::utils::{approx_eq, to_e28, to_e28_u128};
use haiko_lib::helpers::params::{
    owner, alice, bob, treasury, default_token_params, default_market_params,
    modify_position_params, valid_limits, config
};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// TYPES
////////////////////////////////

#[derive(Drop, Copy)]
struct TestCase {
    lower_limit: u32,
    upper_limit: u32,
    liquidity: u256,
    base_exp: u256,
    quote_exp: u256,
}

////////////////////////////////
// SETUP
////////////////////////////////

fn _before(
    width: u32, allow_positions: bool, is_concentrated: bool
) -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = width;
    params.start_limit = OFFSET - 230260; // initial limit
    let mut market_configs: MarketConfigs = Default::default();
    if !allow_positions {
        market_configs.add_liquidity = config(ConfigOption::Disabled, true);
        params.market_configs = Option::Some(market_configs);
        params.controller = owner();
    }
    if !is_concentrated {
        let valid_limits = valid_limits(0, 0, MAX_LIMIT_SHIFTED, MAX_LIMIT_SHIFTED, 1, MAX_WIDTH);
        market_configs.limits = config(valid_limits, true);
        params.market_configs = Option::Some(market_configs);
        params.controller = owner();
    }
    let market_id = create_market(market_manager, params);

    // Fund LPs with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(500000);
    let initial_quote_amount = to_e28(10000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    fund(base_token, bob(), initial_base_amount);
    fund(quote_token, bob(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);
    approve(base_token, bob(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, bob(), market_manager.contract_address, initial_quote_amount);

    (market_manager, base_token, quote_token, market_id)
}

fn before(
    width: u32
) -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252) {
    _before(width, true, true)
}

fn before_no_positions() -> (
    IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252
) {
    _before(1, false, true)
}

fn before_linear() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252) {
    _before(1, true, false)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_modify_position_above_curr_price_cases() {
    let (market_manager, base_token, quote_token, market_id) = before(width: 1);

    // Create position
    let mut lower_limit = OFFSET - 229760;
    let mut upper_limit = OFFSET - 0;
    let mut liquidity = I128Trait::new(10000, false);
    let mut base_exp = I256Trait::new(21544, false);
    let mut quote_exp = I256Trait::new(0, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        1
    );

    // Create another position with different end limit
    lower_limit = OFFSET - 229760;
    upper_limit = OFFSET - 123000;
    liquidity = I128Trait::new(10000, false);
    base_exp = I256Trait::new(13048, false);
    quote_exp = I256Trait::new(0, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        2
    );

    // Create another position at different price range (max limit)
    lower_limit = OFFSET + MAX_LIMIT - 1;
    upper_limit = OFFSET + MAX_LIMIT;
    liquidity = I128Trait::new(100000000000000000000000000000, false);
    base_exp = I256Trait::new(3388729, false);
    quote_exp = I256Trait::new(0, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        3
    );

    // Remove partial liquidity from first position
    lower_limit = OFFSET - 229760;
    upper_limit = OFFSET - 0;
    liquidity = I128Trait::new(5000, true);
    base_exp = I256Trait::new(10771, true);
    quote_exp = I256Trait::new(0, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        4
    );

    // Remove remaining liquidity from first position, check end limit is empty
    lower_limit = OFFSET - 229760;
    upper_limit = OFFSET - 0;
    liquidity = I128Trait::new(5000, true);
    base_exp = I256Trait::new(10771, true);
    quote_exp = I256Trait::new(0, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        5
    );
    assert(
        market_manager.limit_info(market_id, upper_limit).liquidity == 0,
        'Create pos: end limit liq=0 5'
    );
    assert(
        market_manager.limit_info(market_id, upper_limit).liquidity_delta.val == 0,
        'Create pos: end limit liq D=0 5'
    );
    assert(
        market_manager.limit_info(market_id, lower_limit).liquidity != 0,
        'Create pos: start liq !=0 5'
    );

    // Remove liquidity from second position, check start limit is empty
    lower_limit = OFFSET - 229760;
    upper_limit = OFFSET - 123000;
    liquidity = I128Trait::new(10000, true);
    base_exp = I256Trait::new(13047, true);
    quote_exp = I256Trait::new(0, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        6
    );
    assert(
        market_manager.limit_info(market_id, lower_limit).liquidity == 0,
        'Create pos: start liq=0 6'
    );
    assert(
        market_manager.limit_info(market_id, lower_limit).liquidity_delta.val == 0,
        'Create pos: start liq D=0 6'
    );
}

#[test]
fn test_modify_position_wraps_curr_price_cases() {
    let (market_manager, base_token, quote_token, market_id) = before(width: 1);

    // Create position
    let mut lower_limit = OFFSET - 236000;
    let mut upper_limit = OFFSET - 224000;
    let mut liquidity = I128Trait::new(50000, false);
    let mut base_exp = I256Trait::new(4873, false);
    let mut quote_exp = I256Trait::new(448, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        1
    );

    // Create second position that spans entire range (min limit to max limit)
    lower_limit = OFFSET - MIN_LIMIT;
    upper_limit = OFFSET + MAX_LIMIT;
    liquidity = I128Trait::new(50000, false);
    base_exp = I256Trait::new(158115, false);
    quote_exp = I256Trait::new(15812, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        2
    );

    // Remove liquidity from second position, check start and end limits are empty
    lower_limit = OFFSET - MIN_LIMIT;
    upper_limit = OFFSET + MAX_LIMIT;
    liquidity = I128Trait::new(50000, true);
    base_exp = I256Trait::new(158114, true);
    quote_exp = I256Trait::new(15811, true);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        3
    );
    assert(
        market_manager.limit_info(market_id, lower_limit).liquidity == 0,
        'Create pos: start liq=0 3'
    );
    assert(
        market_manager.limit_info(market_id, upper_limit).liquidity == 0, 'Create pos: end liq=0 3'
    );
}

#[test]
fn test_modify_position_below_curr_price_cases() {
    let (market_manager, base_token, quote_token, market_id) = before(width: 1);

    // Create position
    let mut lower_limit = OFFSET - 460000;
    let mut upper_limit = OFFSET - 235000;
    let mut liquidity = I128Trait::new(20000, false);
    let mut base_exp = I256Trait::new(0, false);
    let mut quote_exp = I256Trait::new(4172, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        1
    );

    // Create second position at exact same price range
    liquidity = I128Trait::new(15000, false);
    base_exp = I256Trait::new(0, false);
    quote_exp = I256Trait::new(3129, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        2
    );

    // Create third position at different price range (min limit)
    lower_limit = OFFSET - MIN_LIMIT;
    upper_limit = OFFSET - MIN_LIMIT + 1;
    liquidity = I128Trait::new(100000000000000000000000000000, false);
    base_exp = I256Trait::new(0, false);
    quote_exp = I256Trait::new(3388729, false);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        3
    );

    // Remove all liquidity from first and second positions, check start and end limits are empty
    lower_limit = OFFSET - 460000;
    upper_limit = OFFSET - 235000;
    liquidity = I128Trait::new(35000, true);
    base_exp = I256Trait::new(0, false);
    quote_exp = I256Trait::new(7299, true);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        4
    );
    assert(
        market_manager.limit_info(market_id, lower_limit).liquidity == 0,
        'Create pos: start liq=0 4'
    );
    assert(
        market_manager.limit_info(market_id, upper_limit).liquidity == 0, 'Create pos: end liq=0 4'
    );
    assert(
        market_manager.limit_info(market_id, lower_limit).liquidity_delta.val == 0,
        'Create pos: start liqD=0 4'
    );
    assert(
        market_manager.limit_info(market_id, upper_limit).liquidity_delta.val == 0,
        'Create pos: end liqD=0 4'
    );

    // Remove liquidity from third position
    lower_limit = OFFSET - MIN_LIMIT;
    upper_limit = OFFSET - MIN_LIMIT + 1;
    liquidity = I128Trait::new(40000000000000000000000000000, true);
    base_exp = I256Trait::new(0, false);
    quote_exp = I256Trait::new(1355491, true);
    _modify_position_and_run_checks(
        market_manager,
        market_id,
        base_token,
        quote_token,
        lower_limit,
        upper_limit,
        liquidity,
        base_exp,
        quote_exp,
        5
    );
}

#[test]
fn test_collect_fees() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Create position
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let lower_limit = OFFSET - MIN_LIMIT;
    let upper_limit = OFFSET + MAX_LIMIT;
    let liquidity = I128Trait::new(to_e28_u128(1), false);
    market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity);

    // Execute some swaps
    let mut is_buy = true;
    let exact_input = true;
    let mut amount = to_e28(1);
    market_manager
        .swap(
            market_id,
            is_buy,
            amount,
            exact_input,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );
    is_buy = false;
    market_manager
        .swap(
            market_id,
            is_buy,
            amount,
            exact_input,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );

    // Poke position to collect fees.
    let (base_amount, quote_amount, _, _) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, I128Trait::new(0, false));

    // Run checks
    let base_fees_exp = 30000000000000000000000000;
    let quote_fees_exp = 30000000000000000000000000;
    let position = market_manager.position(market_id, alice().into(), lower_limit, upper_limit);

    assert(base_amount.val == base_fees_exp, 'Base fees');
    assert(quote_amount.val == quote_fees_exp, 'Quote fees');
    assert(position.liquidity == liquidity.val, 'Liquidity');
    assert(position.base_fee_factor_last.val == base_fees_exp, 'Base fee factor');
    assert(position.quote_fee_factor_last.val == quote_fees_exp, 'Quote fee factor');
}

#[test]
fn test_collect_fees_multiple_lps() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Alice creates position
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let lower_limit = OFFSET - MIN_LIMIT;
    let upper_limit = OFFSET + MAX_LIMIT;
    let liquidity = I128Trait::new(to_e28_u128(1), false);
    market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity);

    // Bob creates position at same range
    start_prank(CheatTarget::One(market_manager.contract_address), bob());
    market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity);

    // Execute some swaps
    let mut is_buy = true;
    let exact_input = true;
    let mut amount = to_e28(1);
    market_manager
        .swap(
            market_id,
            is_buy,
            amount,
            exact_input,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );
    is_buy = false;
    market_manager
        .swap(
            market_id,
            is_buy,
            amount,
            exact_input,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );

    // Alice collects fees.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let (base_amount, quote_amount, _, _) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, I128Trait::new(0, false));

    // Run checks
    let base_fees_exp = 15000000000000000000000000;
    let quote_fees_exp = 15000000000000000000000000;
    assert(base_amount.val == base_fees_exp, 'Base fees');
    assert(quote_amount.val == quote_fees_exp, 'Quote fees');
}

#[test]
fn test_collect_fees_intermediate_withdrawal() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Alice creates position
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let lower_limit = OFFSET - MIN_LIMIT;
    let upper_limit = OFFSET + MAX_LIMIT;
    let liquidity = I128Trait::new(to_e28_u128(1), false);
    market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity);

    // Bob creates position at same range
    start_prank(CheatTarget::One(market_manager.contract_address), bob());
    market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity);

    // Execute swap 1.
    let mut is_buy = true;
    let exact_input = true;
    let mut amount = to_e28(1);
    market_manager
        .swap(
            market_id,
            is_buy,
            amount,
            exact_input,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );

    // Alice collects fees.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let (base_amount_a1, quote_amount_a1, _, _) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, I128Trait::new(0, false));

    // Execute swap 2.
    is_buy = false;
    market_manager
        .swap(
            market_id,
            is_buy,
            amount,
            exact_input,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );

    // Alice and Bob both collect fees.
    let (base_amount_a2, quote_amount_a2, _, _) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, I128Trait::new(0, false));
    start_prank(CheatTarget::One(market_manager.contract_address), bob());
    let (base_amount_b, quote_amount_b, _, _) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, I128Trait::new(0, false));

    // Run checks
    let base_fees_exp = 30000000000000000000000000;
    let quote_fees_exp = 30000000000000000000000000;
    assert(
        base_amount_a1.val + base_amount_a2.val + base_amount_b.val == base_fees_exp, 'Base fees'
    );
    assert(
        quote_amount_a1.val + quote_amount_a2.val + quote_amount_b.val == quote_fees_exp,
        'Quote fees'
    );
}

#[test]
fn test_modify_position_clears_single_limit_if_other_active() {
    let width = 1;
    let (market_manager, _base_token, _quote_token, market_id) = before(width);
    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    // Case 1: Clears lower only if upper still used.

    // Create position 1
    let lower_limit_1 = OFFSET + 1000;
    let upper_limit_1 = OFFSET + 2000;
    let liquidity_add = I128Trait::new(to_e28_u128(1), false);
    market_manager.modify_position(market_id, lower_limit_1, upper_limit_1, liquidity_add);

    // Create position 2
    let lower_limit_2 = OFFSET;
    let upper_limit_2 = OFFSET + 1000;
    market_manager.modify_position(market_id, lower_limit_2, upper_limit_2, liquidity_add);

    // Remove position 1 and check limits
    let liquidity_rem = I128Trait::new(to_e28_u128(1), true);
    market_manager.modify_position(market_id, lower_limit_1, upper_limit_1, liquidity_rem);
    assert(market_manager.is_limit_init(market_id, width, lower_limit_1), 'Case 1: lower');
    assert(!market_manager.is_limit_init(market_id, width, upper_limit_1), 'Case 1: upper');

    // Case 2: Clears upper only if lower still used.

    // Create position 3
    let lower_limit_3 = OFFSET + 1000;
    let upper_limit_3 = OFFSET + 3000;
    market_manager.modify_position(market_id, lower_limit_3, upper_limit_3, liquidity_add);

    // Remove position 2 and check limits
    market_manager.modify_position(market_id, lower_limit_2, upper_limit_2, liquidity_rem);
    assert(!market_manager.is_limit_init(market_id, width, lower_limit_2), 'Case 2: lower');
    assert(market_manager.is_limit_init(market_id, width, upper_limit_2), 'Case 2: upper');
}

////////////////////////////////
// TESTS - Failure cases
////////////////////////////////

#[test]
#[should_panic(expected: ('LimitsUnordered',))]
fn test_modify_position_limits_unordered() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Create position
    let lower_limit = OFFSET + 1235;
    let upper_limit = OFFSET - 1235;
    let liquidity = I128Trait::new(20000, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('NotMultipleOfWidth',))]
fn test_modify_position_lower_limit_not_multiple_of_width() {
    let width = 25;
    let (market_manager, _base_token, _quote_token, market_id) = before(width);

    // Create position
    let lower_limit = OFFSET - 46;
    let upper_limit = OFFSET;
    let liquidity = I128Trait::new(10000000000000000000000000000, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('NotMultipleOfWidth',))]
fn test_modify_position_upper_limit_not_multiple_of_width() {
    let width = 25;
    let (market_manager, _base_token, _quote_token, market_id) = before(width);

    // Create position
    let lower_limit = OFFSET;
    let upper_limit = OFFSET + 49;
    let liquidity = I128Trait::new(10000000000000000000000000000, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('UpperLimitOF',))]
fn test_modify_position_upper_limit_overflow() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Create position
    let lower_limit = OFFSET + 1235;
    let upper_limit = OFFSET + MAX_LIMIT + 1;
    let liquidity = I128Trait::new(10000000000000000000000000000, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('LimitLiqOF',))]
fn test_modify_position_liq_at_limit_overflow_width_1() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Create position
    let lower_limit = OFFSET + 1235;
    let upper_limit = OFFSET + 2500;
    let liquidity = I128Trait::new(21518811465203357833463505223042, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('LimitLiqOF',))]
fn test_modify_position_liq_at_limit_overflow_width_25() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 25);

    // Create position
    let lower_limit = price_math::offset(25) - 25;
    let upper_limit = price_math::offset(25);
    let liquidity = I128Trait::new(537969470146029939186181558582534, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('UpdateLimitLiq',))]
fn test_modify_position_remove_more_than_position() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 25);

    // Create position
    let lower_limit = price_math::offset(25) - 25;
    let upper_limit = price_math::offset(25);
    let mut liquidity = I128Trait::new(1000000000, false);
    let mut params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, liquidity
    );
    modify_position(market_manager, params);

    // Remove more than position.
    liquidity = I128Trait::new(1000000001, true);
    params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('AddLiqDisabled',))]
fn test_modify_position_in_positions_disabled_market() {
    let (market_manager, _base_token, _quote_token, market_id) = before_no_positions();

    // Create position
    let lower_limit = OFFSET - 25;
    let upper_limit = OFFSET;
    let liquidity = I128Trait::new(100, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('LimitsOutOfRange',))]
fn test_modify_position_concentrated_in_linear_market() {
    let (market_manager, _base_token, _quote_token, market_id) = before_linear();

    // Create position
    let lower_limit = OFFSET - 25;
    let upper_limit = OFFSET;
    let liquidity = I128Trait::new(100, false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
}

////////////////////////////////
// HELPERS
////////////////////////////////

fn _modify_position_and_run_checks(
    market_manager: IMarketManagerDispatcher,
    market_id: felt252,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher,
    lower_limit: u32,
    upper_limit: u32,
    liquidity: i128,
    base_exp: i256,
    quote_exp: i256,
    n: felt252,
) {
    // Snapshot state before
    let (base_bal_bef, quote_bal_bef, lower_limit_bef, upper_limit_bef) = _snapshot_state(
        market_manager, market_id, base_token, quote_token, lower_limit, upper_limit
    );

    // Create position
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);

    // Snapshot state after
    let (base_bal_aft, quote_bal_aft, lower_limit_aft, upper_limit_aft) = _snapshot_state(
        market_manager, market_id, base_token, quote_token, lower_limit, upper_limit
    );

    // Run checks
    assert(
        approx_eq(base_bal_aft, _add_delta_i256(base_bal_bef, base_exp), 1),
        'Create pos: base 0' + n
    );
    assert(
        approx_eq(quote_bal_aft, _add_delta_i256(quote_bal_bef, quote_exp), 1),
        'Create pos: quote 0' + n
    );
    assert(
        lower_limit_aft.liquidity == _add_delta(lower_limit_bef.liquidity, liquidity),
        'Create pos: start limit liq 0' + n
    );
    assert(
        upper_limit_aft.liquidity == _add_delta(upper_limit_bef.liquidity, liquidity),
        'Create pos: end limit liq 0' + n
    );
    assert(
        lower_limit_aft.liquidity_delta == lower_limit_bef.liquidity_delta + liquidity,
        'Create pos: start limit liq D 0' + n
    );
    assert(
        upper_limit_aft.liquidity_delta == upper_limit_bef.liquidity_delta - liquidity,
        'Create pos: end limit liq D 0' + n
    );
}

fn _snapshot_state(
    market_manager: IMarketManagerDispatcher,
    market_id: felt252,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher,
    lower_limit: u32,
    upper_limit: u32
) -> (u256, u256, LimitInfo, LimitInfo) {
    let base_balance = base_token.balanceOf(market_manager.contract_address);
    let quote_balance = quote_token.balanceOf(market_manager.contract_address);
    let lower_limit_info = market_manager.limit_info(market_id, lower_limit);
    let upper_limit_info = market_manager.limit_info(market_id, upper_limit);

    (base_balance, quote_balance, lower_limit_info, upper_limit_info)
}

fn _add_delta_i256(liquidity: u256, delta: i256) -> u256 {
    if delta.sign {
        liquidity - delta.val
    } else {
        liquidity + delta.val
    }
}

fn _add_delta(liquidity: u128, delta: i128) -> u128 {
    if delta.sign {
        liquidity - delta.val
    } else {
        liquidity + delta.val
    }
}
