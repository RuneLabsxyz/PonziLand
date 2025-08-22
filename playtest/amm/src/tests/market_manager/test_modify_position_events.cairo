// Local imports.
use haiko_amm::contracts::market_manager::MarketManager;

// Haiko imports.
use haiko_lib::constants::OFFSET;
use haiko_lib::math::{fee_math, price_math, liquidity_math};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, token_params, default_market_params, default_token_params,
};
use haiko_lib::helpers::utils::{to_e28, to_e18, to_e18_u128, encode_sqrt_price};

// External imports.
use snforge_std::{start_prank, declare, spy_events, SpyOn, EventSpy, EventAssertions, CheatTarget};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

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
    let initial_base_amount = to_e28(500000000000000);
    let initial_quote_amount = to_e28(10000000000000000000000000);
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

// Tests for following cases:
//  1. Creating a position - should fire `ModifyPosition`
//  2. Collecting non-zero fees - should fire `ModifyPosition`
//  3. Collecting zero fees - should not fire an event
//  4. Removing liquidity - should fire `ModifyPosition`
#[test]
fn test_modify_position_events() {
    let (market_manager, market_id, _base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Creating a position should fire an event.
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let mut liquidity_delta = I128Trait::new(to_e18_u128(10000), false);
    let (base_amount, quote_amount, base_fees, quote_fees) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, liquidity_delta);

    let mut events_exp = array![
        (
            market_manager.contract_address,
            MarketManager::Event::ModifyPosition(
                MarketManager::ModifyPosition {
                    caller: alice(),
                    market_id,
                    lower_limit,
                    upper_limit,
                    liquidity_delta,
                    base_amount,
                    quote_amount,
                    base_fees,
                    quote_fees,
                    is_limit_order: false,
                }
            )
        )
    ];

    // Swap so position has some fees.
    market_manager
        .swap(
            market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
        );

    // Collect fees should fire an event.
    liquidity_delta = I128Trait::new(0, false);
    let (base_amount_2, quote_amount_2, base_fees_2, quote_fees_2) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, liquidity_delta);
    events_exp
        .append(
            (
                market_manager.contract_address,
                MarketManager::Event::ModifyPosition(
                    MarketManager::ModifyPosition {
                        caller: alice(),
                        market_id,
                        lower_limit,
                        upper_limit,
                        liquidity_delta,
                        base_amount: base_amount_2,
                        quote_amount: quote_amount_2,
                        base_fees: base_fees_2,
                        quote_fees: quote_fees_2,
                        is_limit_order: false,
                    }
                )
            )
        );

    // Collecting again should not fire an event.
    market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity_delta);

    // Removing liquidity should fire an event.
    liquidity_delta = I128Trait::new(to_e18_u128(10000), true);
    let (base_amount_3, quote_amount_3, base_fees_3, quote_fees_3) = market_manager
        .modify_position(market_id, lower_limit, upper_limit, liquidity_delta);
    events_exp
        .append(
            (
                market_manager.contract_address,
                MarketManager::Event::ModifyPosition(
                    MarketManager::ModifyPosition {
                        caller: alice(),
                        market_id,
                        lower_limit,
                        upper_limit,
                        liquidity_delta,
                        base_amount: base_amount_3,
                        quote_amount: quote_amount_3,
                        base_fees: base_fees_3,
                        quote_fees: quote_fees_3,
                        is_limit_order: false,
                    }
                )
            )
        );

    // Check all events correctly fired.
    spy.assert_emitted(@events_exp);
}
