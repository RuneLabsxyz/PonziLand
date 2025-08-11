// Core lib imports.
use starknet::ContractAddress;
use starknet::contract_address_const;

// Local imports.
use haiko_amm::contracts::market_manager::MarketManager;
use haiko_amm::contracts::mocks::manual_strategy::{
    ManualStrategy, IManualStrategyDispatcher, IManualStrategyDispatcherTrait
};
use haiko_amm::tests::helpers::strategy::{deploy_strategy, initialise_strategy};

// Haiko imports.
use haiko_lib::constants::OFFSET;
use haiko_lib::math::{fee_math, price_math, liquidity_math};
use haiko_lib::types::i128::{I128Trait};
use haiko_lib::types::i256::{I256Trait};
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
use snforge_std::{
    start_prank, stop_prank, declare, spy_events, SpyOn, EventSpy, EventAssertions, CheatTarget
};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn _before(
    deploy_strategy: bool
) -> (
    IMarketManagerDispatcher,
    felt252,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    IManualStrategyDispatcher
) {
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

    let mut params = default_market_params();

    // Deploy strategy.
    if deploy_strategy {
        params.strategy = deploy_strategy(owner()).contract_address;
    }

    // Create market.
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET;
    params.width = 1;
    let market_id = create_market(market_manager, params);

    // Initialise strategy and return.
    let strategy = IManualStrategyDispatcher { contract_address: params.strategy };
    if deploy_strategy {
        initialise_strategy(
            strategy,
            owner(),
            'Manual Strategy',
            'MANU',
            '1.0.0',
            market_manager.contract_address,
            market_id,
        );
    }

    (market_manager, market_id, base_token, quote_token, strategy)
}

fn before() -> (IMarketManagerDispatcher, felt252, ERC20ABIDispatcher, ERC20ABIDispatcher) {
    let (market_manager, market_id, base_token, quote_token, _) = _before(false);
    (market_manager, market_id, base_token, quote_token)
}

fn before_strategy() -> (
    IMarketManagerDispatcher,
    felt252,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    IManualStrategyDispatcher
) {
    let (market_manager, market_id, base_token, quote_token, strategy) = _before(true);
    let base_amount = to_e28(500000000000000);
    let quote_amount = to_e28(10000000000000000000000000);

    // Fund owner with initial token balances and approve strategy as spender.
    fund(base_token, owner(), base_amount);
    fund(quote_token, owner(), quote_amount);
    approve(base_token, owner(), strategy.contract_address, base_amount);
    approve(quote_token, owner(), strategy.contract_address, quote_amount);

    // Fund strategy with initial token balances and approve market manager as spender.
    fund(base_token, strategy.contract_address, base_amount);
    fund(quote_token, strategy.contract_address, quote_amount);
    approve(base_token, strategy.contract_address, market_manager.contract_address, base_amount);
    approve(quote_token, strategy.contract_address, market_manager.contract_address, quote_amount);

    (market_manager, market_id, base_token, quote_token, strategy)
}

////////////////////////////////
// TESTS
////////////////////////////////

// Event emission tests for following cases:
//  1. Swap without strategy, no limit orders filled - should fire `Swap` 
//  2. Swap without strategy, limit order fully filled - should fire `Swap` and `ModifyPosition`
//  3. Swap without strategy, limit order partially filled - should fire `Swap`
//  4. Swap with strategy, positions updated - should fire `Swap` and 2 x `ModifyPosition`

#[test]
fn test_swap_events_no_strategy_or_limit_orders_filled() {
    let (market_manager, market_id, _base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    // Create position.
    market_manager
        .modify_position(market_id, OFFSET, OFFSET + 10, I128Trait::new(to_e18_u128(10000), false));

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Swapping should fire an event.
    let is_buy = true;
    let exact_input = true;
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
                            exact_input,
                            amount_in,
                            amount_out,
                            fees,
                            end_limit: market_state.curr_limit,
                            end_sqrt_price: market_state.curr_sqrt_price,
                            market_liquidity: market_state.liquidity,
                            swap_id: 1, // swap id
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_swap_events_no_strategy_limit_orders_fully_filled() {
    let (market_manager, market_id, _base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    // Create ask limit order.
    let limit = OFFSET + 100;
    let width = 1;
    let liquidity = to_e18_u128(10000);
    let order_id = market_manager.create_order(market_id, false, limit, liquidity);
    let order = market_manager.order(order_id);

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Swapping should fire `Swap` and `ModifyPosition`.
    let is_buy = true;
    let exact_input = true;
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
                            liquidity_delta: I128Trait::new(liquidity, true),
                            base_amount: I256Trait::new(0, false),
                            quote_amount: I256Trait::new(50175407285947951, true),
                            base_fees: 0,
                            quote_fees: 150526221857843,
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
                            exact_input,
                            amount_in,
                            amount_out,
                            fees,
                            end_limit: market_state.curr_limit,
                            end_sqrt_price: market_state.curr_sqrt_price,
                            market_liquidity: market_state.liquidity,
                            swap_id: 1, // swap id
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_swap_no_strategy_limit_orders_partially_filled() {
    let (market_manager, market_id, _base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    // Create ask limit order.
    let limit = OFFSET + 100;
    let liquidity = to_e18_u128(10000);
    market_manager.create_order(market_id, false, limit, liquidity);

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Swapping should fire `Swap` and `ModifyPosition`.
    let is_buy = true;
    let exact_input = true;
    let (amount_in, amount_out, fees) = market_manager
        .swap(
            market_id, is_buy, 100000, true, Option::None(()), Option::None(()), Option::None(())
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
                            exact_input,
                            amount_in,
                            amount_out,
                            fees,
                            end_limit: market_state.curr_limit,
                            end_sqrt_price: market_state.curr_sqrt_price,
                            market_liquidity: market_state.liquidity,
                            swap_id: 1, // swap id
                        }
                    )
                )
            ]
        );
}

#[test]
fn test_swap_events_with_strategy() {
    let (market_manager, market_id, _base_token, _quote_token, strategy) = before_strategy();

    // Set positions and deposit liquidity.
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    let bid_lower = OFFSET - 1000;
    let bid_upper = OFFSET - 10;
    let ask_lower = OFFSET + 10;
    let ask_upper = OFFSET + 1000;
    strategy.set_positions(bid_lower, bid_upper, ask_lower, ask_upper);
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);
    stop_prank(CheatTarget::One(strategy.contract_address));

    // Calculate liquidity.
    let width = 1;
    let base_liquidity = liquidity_math::base_to_liquidity(
        price_math::limit_to_sqrt_price(ask_lower, width),
        price_math::limit_to_sqrt_price(ask_upper, width),
        base_amount,
        false
    );
    let quote_liquidity = liquidity_math::quote_to_liquidity(
        price_math::limit_to_sqrt_price(bid_lower, width),
        price_math::limit_to_sqrt_price(bid_upper, width),
        quote_amount,
        false
    );

    // Execute swap as strategy. 
    // This must be done to overcome a limitation with `prank` that causes tx to revert for a 
    // non-strategy caller. Particularly, when `update_positions` is called and the strategy 
    // re-enters the market manager to place positions, market manager continues to think that 
    // caller is the strategy due to the prank.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Swapping should fire `Swap` and 2 x `ModifyPosition`.
    let is_buy = true;
    let exact_input = true;
    let (amount_in, amount_out, fees) = market_manager
        .swap(
            market_id, is_buy, 100000, true, Option::None(()), Option::None(()), Option::None(())
        );
    let market_state = market_manager.market_state(market_id);

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: strategy.contract_address,
                            market_id,
                            lower_limit: bid_lower,
                            upper_limit: bid_upper,
                            liquidity_delta: I128Trait::new(quote_liquidity, false),
                            base_amount: I256Trait::new(0, false),
                            quote_amount: I256Trait::new(quote_amount, false),
                            base_fees: 0,
                            quote_fees: 0,
                            is_limit_order: false,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::ModifyPosition(
                        MarketManager::ModifyPosition {
                            caller: strategy.contract_address,
                            market_id,
                            lower_limit: ask_lower,
                            upper_limit: ask_upper,
                            liquidity_delta: I128Trait::new(base_liquidity, false),
                            base_amount: I256Trait::new(base_amount, false),
                            quote_amount: I256Trait::new(0, false),
                            base_fees: 0,
                            quote_fees: 0,
                            is_limit_order: false,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::Swap(
                        MarketManager::Swap {
                            caller: strategy.contract_address,
                            market_id,
                            is_buy,
                            exact_input,
                            amount_in,
                            amount_out,
                            fees,
                            end_limit: market_state.curr_limit,
                            end_sqrt_price: market_state.curr_sqrt_price,
                            market_liquidity: market_state.liquidity,
                            swap_id: 1, // swap id
                        }
                    )
                )
            ]
        );
}
