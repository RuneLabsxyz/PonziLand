// Core lib imports.
use starknet::ContractAddress;

// Local imports.
use haiko_amm::contracts::market_manager::MarketManager;

// Haiko imports.
use haiko_lib::constants::OFFSET;
use haiko_lib::math::{fee_math, price_math, liquidity_math};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::types::i256::I256Trait;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, token_params, default_market_params, default_token_params,
};
use haiko_lib::helpers::utils::{to_e28, to_e28_u128, to_e18, to_e18_u128, encode_sqrt_price};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::{deploy_token, fund, approve},
};

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

// Event emission tests for following cases:
//  1. Creating an order - should fire `ModifyPosition` and `CreateOrder` 
//  2. Collecting an unfilled order - should fire `ModifyPosition` and `CollectOrder`
//  3. Collecting a partially filled order - should fire `ModifyPosition` and `CollectOrder`
//  4. Collecting a fully filled order - should fire `CollectOrder`

#[test]
fn test_collect_unfilled_order_events() {
    let (market_manager, market_id, _base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Creating an order should fire an event.
    let width = 1;
    let is_bid = true;
    let limit = OFFSET - 1000;
    let liquidity_delta = to_e18_u128(10000);
    let order_id = market_manager.create_order(market_id, is_bid, limit, liquidity_delta);
    let order = market_manager.order(order_id);

    let amount = liquidity_math::liquidity_to_quote(
        price_math::limit_to_sqrt_price(limit, width),
        price_math::limit_to_sqrt_price(limit + width, width),
        I128Trait::new(liquidity_delta, false),
        true
    );

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::CreateOrder(
                        MarketManager::CreateOrder {
                            caller: alice(),
                            market_id,
                            order_id,
                            limit,
                            batch_id: order.batch_id,
                            is_bid,
                            amount: amount.val,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: order.batch_id.try_into().unwrap(),
                            market_id,
                            lower_limit: limit,
                            upper_limit: limit + width,
                            liquidity_delta: I128Trait::new(liquidity_delta, false),
                            base_amount: I256Trait::new(0, false),
                            quote_amount: amount,
                            base_fees: 0,
                            quote_fees: 0,
                            is_limit_order: true,
                        }
                    )
                )
            ]
        );

    // Collect order should fire an event.
    let (_base_amount, quote_amount) = market_manager.collect_order(market_id, order_id);
    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: order.batch_id.try_into().unwrap(),
                            market_id,
                            lower_limit: limit,
                            upper_limit: limit + width,
                            liquidity_delta: I128Trait::new(liquidity_delta, true),
                            base_amount: I256Trait::new(0, false),
                            quote_amount: I256Trait::new(quote_amount, true),
                            base_fees: 0,
                            quote_fees: 0,
                            is_limit_order: true,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::CollectOrder(
                        MarketManager::CollectOrder {
                            caller: alice(),
                            market_id,
                            order_id,
                            limit,
                            batch_id: order.batch_id,
                            is_bid,
                            base_amount: 0,
                            quote_amount: quote_amount,
                        }
                    )
                ),
            ]
        );
}

#[test]
fn test_collect_partially_filled_order_events() {
    let (market_manager, market_id, _base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Creating a bid should fire an event.
    let width = 1;
    let is_bid = true;
    let limit = OFFSET - 1000;
    let liquidity_delta = to_e18_u128(100000);
    let order_id = market_manager.create_order(market_id, is_bid, limit, liquidity_delta);
    let order = market_manager.order(order_id);

    let amount = liquidity_math::liquidity_to_quote(
        price_math::limit_to_sqrt_price(limit, width),
        price_math::limit_to_sqrt_price(limit + width, width),
        I128Trait::new(liquidity_delta, false),
        true
    );

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: order.batch_id.try_into().unwrap(),
                            market_id,
                            lower_limit: limit,
                            upper_limit: limit + width,
                            liquidity_delta: I128Trait::new(liquidity_delta, false),
                            base_amount: I256Trait::new(0, false),
                            quote_amount: amount,
                            base_fees: 0,
                            quote_fees: 0,
                            is_limit_order: true,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::CreateOrder(
                        MarketManager::CreateOrder {
                            caller: alice(),
                            market_id,
                            order_id,
                            limit,
                            batch_id: order.batch_id,
                            is_bid,
                            amount: amount.val,
                        }
                    )
                ),
            ]
        );

    // Partially filling order should emit `Swap`.
    let is_buy = false;
    let (amount_in, amount_out, fees) = market_manager
        .swap(
            market_id, is_buy, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
        );
    let market_state = market_manager.market_state(market_id);
    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::Swap(
                        MarketManager::Swap {
                            caller: alice(),
                            market_id,
                            is_buy,
                            exact_input: true,
                            amount_in,
                            amount_out,
                            fees,
                            end_limit: market_state.curr_limit,
                            end_sqrt_price: market_state.curr_sqrt_price,
                            market_liquidity: market_state.liquidity,
                            swap_id: 1,
                        }
                    )
                )
            ]
        );

    // Collect order should fire both `ModifyPosition` and `CollectOrder` events.
    let (base_amount, _quote_amount) = market_manager.collect_order(market_id, order_id);

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: order.batch_id.try_into().unwrap(),
                            market_id,
                            lower_limit: limit,
                            upper_limit: limit + width,
                            liquidity_delta: I128Trait::new(liquidity_delta, true),
                            // base amount is different because fees are forfeited for partial fills
                            base_amount: I256Trait::new(base_amount - 1, true), // rounding error
                            quote_amount: I256Trait::new(0, true),
                            base_fees: 1512043568009053,
                            quote_fees: 0,
                            is_limit_order: true,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::CollectOrder(
                        MarketManager::CollectOrder {
                            caller: alice(),
                            market_id,
                            order_id,
                            limit,
                            batch_id: order.batch_id,
                            is_bid,
                            base_amount: base_amount,
                            quote_amount: 0,
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_collect_fully_filled_order_events() {
    let (market_manager, market_id, _base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Creating an order should fire an event.
    let width = 1;
    let is_bid = true;
    let limit = OFFSET - 1000;
    let liquidity_delta = to_e18_u128(10000);
    let order_id = market_manager.create_order(market_id, is_bid, limit, liquidity_delta);
    let order = market_manager.order(order_id);

    let amount = liquidity_math::liquidity_to_quote(
        price_math::limit_to_sqrt_price(limit, width),
        price_math::limit_to_sqrt_price(limit + width, width),
        I128Trait::new(liquidity_delta, false),
        true
    );

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: order.batch_id.try_into().unwrap(),
                            market_id,
                            lower_limit: limit,
                            upper_limit: limit + width,
                            liquidity_delta: I128Trait::new(liquidity_delta, false),
                            base_amount: I256Trait::new(0, false),
                            quote_amount: amount,
                            base_fees: 0,
                            quote_fees: 0,
                            is_limit_order: true,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::CreateOrder(
                        MarketManager::CreateOrder {
                            caller: alice(),
                            market_id,
                            order_id,
                            limit,
                            batch_id: order.batch_id,
                            is_bid,
                            amount: amount.val,
                        }
                    )
                ),
            ]
        );

    // Fully filling order should emit `Swap` and `ModifyPosition`.
    let is_buy = false;
    let (amount_in, amount_out, fees) = market_manager
        .swap(
            market_id, is_buy, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
        );

    let market_state = market_manager.market_state(market_id);
    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: order.batch_id.try_into().unwrap(),
                            market_id,
                            lower_limit: limit,
                            upper_limit: limit + width,
                            liquidity_delta: I128Trait::new(liquidity_delta, true),
                            base_amount: I256Trait::new(amount_in - 1, true), // rounding error
                            quote_amount: I256Trait::new(0, true),
                            base_fees: fees,
                            quote_fees: 0,
                            is_limit_order: true,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::Swap(
                        MarketManager::Swap {
                            caller: alice(),
                            market_id,
                            is_buy,
                            exact_input: true,
                            amount_in,
                            amount_out,
                            fees,
                            end_limit: market_state.curr_limit,
                            end_sqrt_price: market_state.curr_sqrt_price,
                            market_liquidity: market_state.liquidity,
                            swap_id: 1,
                        }
                    )
                )
            ]
        );

    // Collect order should fire `CollectOrder` only.
    let (base_amount, quote_amount) = market_manager.collect_order(market_id, order_id);
    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::CollectOrder(
                        MarketManager::CollectOrder {
                            caller: alice(),
                            market_id,
                            order_id,
                            limit,
                            batch_id: order.batch_id,
                            is_bid,
                            base_amount,
                            quote_amount,
                        }
                    )
                )
            ]
        );
}

