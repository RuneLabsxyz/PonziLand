// Haiko imports.
use haiko_lib::constants::{OFFSET};
use haiko_lib::id;
use haiko_lib::types::core::{MarketConfigs, ConfigOption};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, swap},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, bob, treasury, default_token_params, default_market_params, swap_params
};
use haiko_lib::helpers::utils::{to_e18, to_e18_u128, to_e28, approx_eq};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252) {
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
    params.start_limit = OFFSET - 0; // initial limit
    let market_id = create_market(market_manager, params);

    // Fund LPs with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(500000);
    let initial_quote_amount = to_e28(10000000);

    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);

    fund(base_token, bob(), initial_base_amount);
    fund(quote_token, bob(), initial_quote_amount);
    approve(base_token, bob(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, bob(), market_manager.contract_address, initial_quote_amount);

    (market_manager, base_token, quote_token, market_id)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_amounts_inside_order_bid() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create order.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let limit = OFFSET - 1000;
    let liquidity = to_e18_u128(10000);
    let order_id = market_manager.create_order(market_id, true, limit, liquidity);

    // Create second order at same limit.
    start_prank(CheatTarget::One(market_manager.contract_address), bob());
    market_manager.create_order(market_id, true, limit, liquidity);

    // Partially fill order.
    let mut params = swap_params(
        alice(),
        market_id,
        false,
        true,
        5000000000000000,
        Option::None(()),
        Option::None(()),
        Option::None(())
    );
    let (amount_in, amount_out, _fees) = swap(market_manager, params);

    // Check amounts inside order. Expect fees earned on partial fill to be paid.
    let (base_amount, quote_amount) = market_manager.amounts_inside_order(order_id, market_id);
    assert(approx_eq(base_amount, amount_in / 2, 10), 'Base amount 1');
    assert(approx_eq(quote_amount, (99501001654900617 - amount_out) / 2, 10), 'Quote amount 1');

    // Fully fill order.
    params.amount = to_e18(1);
    let (amount_in_2, amount_out_2, _fees_2) = swap(market_manager, params);

    // Check amounts inside order. Expect fees to be included.
    let (base_amount_2, quote_amount_2) = market_manager.amounts_inside_order(order_id, market_id);
    assert(approx_eq(base_amount_2, (amount_in + amount_in_2) / 2, 10), 'Base amount 2');
    assert(
        approx_eq(quote_amount_2, (99501001654900617 - amount_out - amount_out_2) / 2, 10),
        'Quote amount 2'
    );
}

#[test]
fn test_amounts_inside_order_ask() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create order.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let limit = OFFSET + 1000;
    let liquidity = to_e18_u128(10000);
    let order_id = market_manager.create_order(market_id, false, limit, liquidity);

    // Create second order at same limit.
    start_prank(CheatTarget::One(market_manager.contract_address), bob());
    market_manager.create_order(market_id, false, limit, liquidity);

    // Partially fill order.
    let mut params = swap_params(
        alice(),
        market_id,
        true,
        true,
        5000000000000000,
        Option::None(()),
        Option::None(()),
        Option::None(())
    );
    let (amount_in, amount_out, _fees) = swap(market_manager, params);

    // Check amounts inside order. Expect fees earned on partial fill to be paid.
    let (base_amount, quote_amount) = market_manager.amounts_inside_order(order_id, market_id);
    assert(approx_eq(base_amount, (99500504153623599 - amount_out) / 2, 10), 'Base amount 1');
    assert(approx_eq(quote_amount, amount_in / 2, 10), 'Quote amount 1');

    // Fully fill order.
    params.amount = to_e18(1);
    let (amount_in_2, amount_out_2, _fees_2) = swap(market_manager, params);

    // Check amounts inside order. Expect fees to be included.
    let (base_amount_2, quote_amount_2) = market_manager.amounts_inside_order(order_id, market_id);
    assert(
        approx_eq(base_amount_2, (99500504153623599 - amount_out - amount_out_2) / 2, 10),
        'Base amount 2'
    );
    assert(approx_eq(quote_amount_2, (amount_in + amount_in_2) / 2, 10), 'Quote amount 2');
}

#[test]
fn test_amounts_inside_order_empty_position() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create order.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let limit = OFFSET - 1000;
    let liquidity = to_e18_u128(10000);
    let order_id = market_manager.create_order(market_id, true, limit, liquidity);

    // Collect order.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager.collect_order(market_id, order_id);

    // Check amounts inside order. Expect 0.
    let (base_amount, quote_amount) = market_manager.amounts_inside_order(order_id, market_id);
    assert(base_amount == 0, 'Base amount');
    assert(quote_amount == 0, 'Quote amount');
}
