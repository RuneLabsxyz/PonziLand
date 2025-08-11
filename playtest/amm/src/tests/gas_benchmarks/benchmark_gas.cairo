// Core lib imports.
use starknet::ContractAddress;

// Local imports.
use haiko_lib::constants::OFFSET;
use haiko_lib::id;
use haiko_lib::math::{fee_math, price_math};
use haiko_lib::types::i128::I128Trait;
use haiko_amm::contracts::{
    market_manager::MarketManager,
    mocks::manual_strategy::{IManualStrategyDispatcher, IManualStrategyDispatcherTrait},
};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_amm::tests::helpers::{
    market_manager::{deploy_market_manager, create_market}, token::{deploy_token, fund, approve},
    strategy::{deploy_strategy, initialise_strategy},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, token_params, default_market_params, default_token_params
};
use haiko_lib::helpers::utils::{to_e28, to_e18, to_e18_u128, to_e28_u128, encode_sqrt_price};

// External imports.
use snforge_std::{start_prank, declare, spy_events, SpyOn, EventSpy, EventAssertions, CheatTarget};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn setup_deploy_and_approve() -> (
    IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher
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

    (market_manager, base_token, quote_token)
}

fn setup_and_deploy_strategy(
    market_manager: IMarketManagerDispatcher,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher
) -> (IManualStrategyDispatcher, felt252) {
    // Deploy and initialise strategy.
    let strategy = deploy_strategy(owner());
    let market_id = setup_strategy_market(market_manager, base_token, quote_token, strategy);
    initialise_strategy(
        strategy, owner(), 'Manual', 'MANU', '1.0.0', market_manager.contract_address, market_id
    );

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(500000000000000);
    let initial_quote_amount = to_e28(10000000000000000000000000);
    approve(base_token, alice(), strategy.contract_address, initial_base_amount);
    approve(quote_token, alice(), strategy.contract_address, initial_quote_amount);

    // Allow strategy to swap via market manager.
    fund(base_token, strategy.contract_address, initial_base_amount);
    fund(quote_token, strategy.contract_address, initial_quote_amount);
    approve(
        base_token, strategy.contract_address, market_manager.contract_address, initial_base_amount
    );
    approve(
        quote_token,
        strategy.contract_address,
        market_manager.contract_address,
        initial_quote_amount
    );

    (strategy, market_id)
}

fn setup_create_market(
    market_manager: IMarketManagerDispatcher,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher
) -> felt252 {
    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET;
    params.width = 1;

    create_market(market_manager, params)
}

fn setup_strategy_market(
    market_manager: IMarketManagerDispatcher,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher,
    strategy: IManualStrategyDispatcher
) -> felt252 {
    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.strategy = strategy.contract_address;
    params.start_limit = OFFSET;
    params.width = 1;

    create_market(market_manager, params)
}

////////////////////////////////
// TESTS
////////////////////////////////

// Benchmark cases
// Note: each benchmark case should deduct the gas cost of the before_* function from the total gas cost.
// 1. Create market
// 2. Add liquidity at previously uninitialised limit
// 3. Add liquidity at previously initialised limit
// 4. Add liquidity at prev. initialised lower + uninitialised upper limit
// 5. Remove partial liquidity from position (no fees)
// 6. Remove all liquidity from position (no fees)
// 7. Remove all liquidity from position (with fees)
// 8. Collect fees from position
// 9. Swap with zero liquidity
// 10. Swap within 1 tick
// 11. Swap with 1 tick crossed
// 12. Swap with 2 ticks crossed
// 13. Swap with 4 ticks crossed
// 14. Swap with 4 ticks crossed (wide interval)
// 15. Swap with 6 ticks crossed 
// 16. Swap with 6 ticks crossed (wide interval)
// 17. Swap with 9 ticks crossed
// 18. Swap with 9 ticks crossed (wide interval)
// 19. Swap across a limit order, partial fill (cross 1 tick)
// 20. Swap across a limit order, full fill (cross 1 tick)
// 21. Create limit order
// 22. Collect unfilled limit order
// 23. Collect partially filled limit order
// 24. Collect fully filled limit order
// 25. Swap with strategy enabled, no position updates (within 1 tick)
// 26. Swap with strategy enabled, one position update (within 1 tick)
// 27. Swap with strategy enabled, both position updates (within 1 tick)

// Benchmark 1: Create market

// #[test]
// fn before_benchmark_1_create_market() {
//     setup_deploy_and_approve();
//     assert(true, 'Test complete');
// }

// #[test]
// fn benchmark_1_create_market() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();

//     // Create market.
//     let mut params = default_market_params();
//     params.base_token = base_token.contract_address;
//     params.quote_token = quote_token.contract_address;
//     params.start_limit = OFFSET;
//     params.width = 1;

//     create_market(market_manager, params);
// }

// // Benchmark 2: Add liquidity at previously uninitialised limit

// #[test]
// fn before_benchmark_2_add_liquidity_at_prev_uninitialised_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     // Initialise top layer of tree with a nearby position. This layer will already be initialised 
//     // the majority of the time, assuming an existing initialised limit exists between 50-200% of 
//     // the new limit, so we exclude it from the benchmark.
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 11200, OFFSET - 11100, I128Trait::new(to_e18_u128(10000), false)
//         );
// }

// #[test]
// fn benchmark_2_add_liquidity_at_prev_uninitialised_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     // Initialise top layer of tree with a nearby position. This layer will already be initialised 
//     // the majority of the time, assuming an existing initialised limit exists between 50-200% of 
//     // the new limit, so we exclude it from the benchmark.
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 11200, OFFSET - 11100, I128Trait::new(to_e18_u128(10000), false)
//         );

//     // Place the position.
//     let lower_tick = OFFSET - 1000;
//     let upper_tick = OFFSET + 1000;
//     let liquidity_delta = I128Trait::new(to_e18_u128(10000), false);
//     market_manager.modify_position(market_id, lower_tick, upper_tick, liquidity_delta);
// }

// // Benchmark 3: Add liquidity at previously initialised limit

// #[test]
// fn before_benchmark_3_add_liquidity_at_prev_initialised_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
// }

// #[test]
// fn benchmark_3_add_liquidity_at_prev_initialised_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );

//     let lower_tick = OFFSET - 1000;
//     let upper_tick = OFFSET + 1000;
//     let liquidity_delta = I128Trait::new(to_e18_u128(10000), false);
//     market_manager.modify_position(market_id, lower_tick, upper_tick, liquidity_delta);
// }

// // Benchmark 4: Add liquidity at prev. initialised lower + uninitialised upper limit

// #[test]
// fn before_benchmark_4_add_liquidity_at_prev_initialised_lower_uninitialised_upper_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
// }

// #[test]
// fn benchmark_4_add_liquidity_at_prev_initialised_lower_uninitialised_upper_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );

//     let lower_tick = OFFSET - 1000;
//     let upper_tick = OFFSET + 900;
//     let liquidity_delta = I128Trait::new(to_e18_u128(10000), false);
//     market_manager.modify_position(market_id, lower_tick, upper_tick, liquidity_delta);
// }

// // Benchmark 5: Remove partial liquidity from position (no fees)

// #[test]
// fn before_benchmark_5_remove_partial_liquidity_no_fees() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());

//     // Initialise top layer of tree with a nearby position. This layer will already be initialised
//     // the majority of the time, assuming an existing initialised limit exists between 50-200% of
//     // the new limit, so we exclude it from the benchmark.
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1200, OFFSET - 1100, I128Trait::new(to_e18_u128(10000), false)
//         );

//     // Place the position.
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
// }

// #[test]
// fn benchmark_5_remove_partial_liquidity_no_fees() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());

//     // Initialise top layer of tree with a nearby position. This layer will already be initialised
//     // the majority of the time, assuming an existing initialised limit exists between 50-200% of
//     // the new limit, so we exclude it from the benchmark.
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1200, OFFSET - 1100, I128Trait::new(to_e18_u128(10000), false)
//         );

//     // Place the position.
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );

//     let lower_tick = OFFSET - 1000;
//     let upper_tick = OFFSET + 1000;
//     let liquidity_delta = I128Trait::new(to_e18_u128(5000), true);
//     market_manager.modify_position(market_id, lower_tick, upper_tick, liquidity_delta);
// }

// // Benchmark 6: Remove all liquidity from position (no fees)

// #[test]
// fn before_benchmark_6_remove_all_liquidity_no_fees() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     // Initialise top layer of tree with a nearby position.
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1200, OFFSET - 1100, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
// }

// #[test]
// fn benchmark_6_remove_all_liquidity_no_fees() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     // Initialise top layer of tree with a nearby position.
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1200, OFFSET - 1100, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );

//     let lower_tick = OFFSET - 1000;
//     let upper_tick = OFFSET + 1000;
//     let liquidity_delta = I128Trait::new(to_e18_u128(10000), true);
//     market_manager.modify_position(market_id, lower_tick, upper_tick, liquidity_delta);
// }

// // Benchmark 7: Remove all liquidity from position (with fees)

// #[test]
// fn before_benchmark_7_remove_all_liquidity_with_fees() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     // Initialise top layer of tree with a nearby position.
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1200, OFFSET - 1100, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );
// }

// #[test]
// fn benchmark_7_remove_all_liquidity_with_fees() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     // Initialise top layer of tree with a nearby position.
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1200, OFFSET - 1100, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let lower_tick = OFFSET - 1000;
//     let upper_tick = OFFSET + 1000;
//     let liquidity_delta = I128Trait::new(to_e18_u128(10000), true);
//     market_manager.modify_position(market_id, lower_tick, upper_tick, liquidity_delta);
// }

// // Benchmark 8: Collect fees from position

// #[test]
// fn before_benchmark_8_collect_fees_from_position() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );
// }

// #[test]
// fn benchmark_8_collect_fees_from_position() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false)
//         );
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(0, false));
// }

// // Benchmark 9: Swap with zero liquidity

// #[test]
// fn before_benchmark_9_swap_with_zero_liquidity() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     setup_create_market(market_manager, base_token, quote_token);
// }

// #[test]
// fn benchmark_9_swap_with_zero_liquidity() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );
// }

// // Benchmark 10: Swap with normal liquidity, within 1 limit

// #[test]
// fn before_benchmark_10_swap_with_within_1_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_10_swap_with_within_1_tick() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     let (amount_in, _, _) = market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );
//     assert(amount_in == to_e18(1), 'Within 1 tick');
// }

// // Benchmark 11: Swap with 1 tick crossed

// #[test]
// fn before_benchmark_11_swap_with_1_tick_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 100, OFFSET + 300, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_11_swap_with_1_tick_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 100, OFFSET + 300, I128Trait::new(to_e18_u128(1000), false)
//         );

//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );

//     let (base_amount, quote_amount, _, _) = market_manager
//         .amounts_inside_position(market_id, alice().into(), OFFSET + 100, OFFSET + 300);
//     assert(base_amount != 0 && quote_amount != 0, '1 tick crossed');
// }

// // Benchmark 12: Swap with 2 ticks crossed

// #[test]
// fn before_benchmark_12_swap_with_2_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 100, OFFSET + 300, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_12_swap_with_2_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 100, OFFSET + 300, I128Trait::new(to_e18_u128(1000), false)
//         );

//     let (_amount_in, _, _) = market_manager
//         .swap(
//             market_id, true, to_e18(3), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 100, OFFSET + 300);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount == 0, '2 ticks crossed A');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 1000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount != 0, '2 ticks crossed B');
// }

// // Benchmark 13: Swap with 4 ticks crossed

// #[test]
// fn before_benchmark_13_swap_with_4_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 1000, OFFSET + 3000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 5000, OFFSET + 7000, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_13_swap_with_4_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 1000, OFFSET + 3000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 5000, OFFSET + 7000, I128Trait::new(to_e18_u128(1000), false)
//         );

//     let (_amount_in, _, _) = market_manager
//         .swap(
//             market_id, true, to_e18(70), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 5000, OFFSET + 7000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount == 0, '4 ticks crossed A');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 10000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount != 0, '4 ticks crossed B');
// }

// // Benchmark 14: Swap with 4 ticks crossed (wide interval)

// #[test]
// fn before_benchmark_14_swap_with_4_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 100000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 10000, OFFSET + 30000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 50000, OFFSET + 70000, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_14_swap_with_4_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 100000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 10000, OFFSET + 30000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 50000, OFFSET + 70000, I128Trait::new(to_e18_u128(1000), false)
//         );

//     let (_amount_in, _, _) = market_manager
//         .swap(
//             market_id, true, to_e18(800), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 50000, OFFSET + 70000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount == 0, '4 ticks crossed wide A');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 100000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount != 0, '4 ticks crossed wide B');
// }

// // Benchmark 15: Swap with 6 ticks crossed

// #[test]
// fn before_benchmark_15_swap_with_6_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 1000, OFFSET + 3000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 4000, OFFSET + 5000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 6000, OFFSET + 7000, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_15_swap_with_6_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 1000, OFFSET + 3000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 4000, OFFSET + 5000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 6000, OFFSET + 7000, I128Trait::new(to_e18_u128(1000), false)
//         );

//     let (_amount_in, _, _) = market_manager
//         .swap(
//             market_id, true, to_e18(65), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 6000, OFFSET + 7000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount == 0, '6 ticks crossed A');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 10000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount != 0, '6 ticks crossed B');
// }

// // Benchmark 16: Swap with 6 ticks crossed (wide interval)

// #[test]
// fn before_benchmark_16_swap_with_6_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 100000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 10000, OFFSET + 30000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 40000, OFFSET + 50000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 60000, OFFSET + 70000, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_16_swap_with_6_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 100000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 10000, OFFSET + 30000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 40000, OFFSET + 50000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 60000, OFFSET + 70000, I128Trait::new(to_e18_u128(1000), false)
//         );

//     let (_amount_in, _, _) = market_manager
//         .swap(
//             market_id, true, to_e18(850), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 60000, OFFSET + 70000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount == 0, '6 ticks crossed A wide');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 100000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount != 0, '6 ticks crossed B wide');
// }

// // Benchmark 17: Swap with 10 ticks crossed

// #[test]
// fn before_benchmark_17_swap_with_10_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 500, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 2000, OFFSET + 3000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 4000, OFFSET + 5000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 6000, OFFSET + 7000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 8000, OFFSET + 9000, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_17_swap_with_10_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 500, OFFSET + 1000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 2000, OFFSET + 3000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 4000, OFFSET + 5000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 6000, OFFSET + 7000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 8000, OFFSET + 9000, I128Trait::new(to_e18_u128(1000), false)
//         );

//     market_manager
//         .swap(
//             market_id, true, to_e18(70), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 8000, OFFSET + 9000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount == 0, '10 ticks crossed A');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 10000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount != 0, '10 ticks crossed B');
// }

// // Benchmark 18: Swap with 10 ticks crossed (wide interval)

// #[test]
// fn before_benchmark_18_swap_with_10_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 100000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 5000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 20000, OFFSET + 30000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 40000, OFFSET + 50000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 60000, OFFSET + 70000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 80000, OFFSET + 90000, I128Trait::new(to_e18_u128(1000), false)
//         );
// }

// #[test]
// fn benchmark_18_swap_with_10_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager
//         .modify_position(
//             market_id, OFFSET - 1000, OFFSET + 100000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 5000, OFFSET + 10000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 20000, OFFSET + 30000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 40000, OFFSET + 50000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 60000, OFFSET + 70000, I128Trait::new(to_e18_u128(1000), false)
//         );
//     market_manager
//         .modify_position(
//             market_id, OFFSET + 80000, OFFSET + 90000, I128Trait::new(to_e18_u128(1000), false)
//         );

//     market_manager
//         .swap(
//             market_id, true, to_e18(900), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 80000, OFFSET + 90000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount == 0, '10 ticks crossed wide A');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 100000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager.amounts_inside_position(position_id);
// // assert(base_amount != 0, '10 ticks crossed wide B');
// }

// // Benchmark 19: Swap with 20 ticks crossed (wide interval)

// #[test]
// fn before_benchmark_19_swap_with_20_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let positions = array![
//         (OFFSET - 1000, OFFSET + 20000),
//         (OFFSET + 500, OFFSET + 999),
//         (OFFSET + 1000, OFFSET + 1999),
//         (OFFSET + 2000, OFFSET + 2999),
//         (OFFSET + 3000, OFFSET + 3999),
//         (OFFSET + 4000, OFFSET + 4999),
//         (OFFSET + 5000, OFFSET + 5999),
//         (OFFSET + 6000, OFFSET + 6999),
//         (OFFSET + 7000, OFFSET + 7999),
//         (OFFSET + 8000, OFFSET + 8999),
//         (OFFSET + 9000, OFFSET + 9999),
//     ];
//     let mut i = 0;
//     loop {
//         if i >= positions.len() {
//             break;
//         }
//         let (start, end) = *positions.at(i);
//         let delta = if i == 0 {
//             1500
//         } else {
//             1000
//         };
//         market_manager
//             .modify_position(market_id, start, end, I128Trait::new(to_e18_u128(delta), false));
//         i += 1;
//     };
// }

// #[test]
// fn benchmark_19_swap_with_20_ticks_crossed() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     // Place positions
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let positions = array![
//         (OFFSET - 1000, OFFSET + 20000),
//         (OFFSET + 500, OFFSET + 999),
//         (OFFSET + 1000, OFFSET + 1999),
//         (OFFSET + 2000, OFFSET + 2999),
//         (OFFSET + 3000, OFFSET + 3999),
//         (OFFSET + 4000, OFFSET + 4999),
//         (OFFSET + 5000, OFFSET + 5999),
//         (OFFSET + 6000, OFFSET + 6999),
//         (OFFSET + 7000, OFFSET + 7999),
//         (OFFSET + 8000, OFFSET + 8999),
//         (OFFSET + 9000, OFFSET + 9999),
//     ];
//     let mut i = 0;
//     loop {
//         if i >= positions.len() {
//             break;
//         }
//         let (start, end) = *positions.at(i);
//         let delta = if i == 0 {
//             1500
//         } else {
//             1000
//         };
//         market_manager
//             .modify_position(market_id, start, end, I128Trait::new(to_e18_u128(delta), false));
//         i += 1;
//     };

//     // Execute swap.
//     market_manager
//         .swap(
//             market_id, true, to_e18(130), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let mut position_id = id::position_id(market_id, alice().into(), OFFSET + 9000, OFFSET + 9999);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager
// //     .amounts_inside_position(position_id);
// // assert(base_amount == 0, '20 ticks crossed A');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 20000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager
// //     .amounts_inside_position(position_id);
// // assert(base_amount != 0, '20 ticks crossed B');
// }

// // Benchmark 20: Swap with 20 ticks crossed (wide interval)

// #[test]
// fn before_benchmark_20_swap_with_20_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     // Place positions
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let positions = array![
//         (OFFSET - 1000, OFFSET + 200000),
//         (OFFSET + 1, OFFSET + 4999),
//         (OFFSET + 5000, OFFSET + 9999),
//         (OFFSET + 10000, OFFSET + 19999),
//         (OFFSET + 20000, OFFSET + 29999),
//         (OFFSET + 30000, OFFSET + 39999),
//         (OFFSET + 40000, OFFSET + 49999),
//         (OFFSET + 50000, OFFSET + 59999),
//         (OFFSET + 60000, OFFSET + 69999),
//         (OFFSET + 70000, OFFSET + 79999),
//         (OFFSET + 80000, OFFSET + 89999),
//         (OFFSET + 90000, OFFSET + 99999),
//     ];
//     let mut i = 0;
//     loop {
//         if i >= positions.len() {
//             break;
//         }
//         let (start, end) = *positions.at(i);
//         let delta = if i == 0 {
//             1500
//         } else {
//             1000
//         };
//         market_manager
//             .modify_position(market_id, start, end, I128Trait::new(to_e18_u128(delta), false));
//         i += 1;
//     };
// }

// #[test]
// fn benchmark_20_swap_with_20_ticks_crossed_wide_interval() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     // Place positions
//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let positions = array![
//         (OFFSET - 1000, OFFSET + 200000),
//         (OFFSET + 1, OFFSET + 4999),
//         (OFFSET + 5000, OFFSET + 9999),
//         (OFFSET + 10000, OFFSET + 19999),
//         (OFFSET + 20000, OFFSET + 29999),
//         (OFFSET + 30000, OFFSET + 39999),
//         (OFFSET + 40000, OFFSET + 49999),
//         (OFFSET + 50000, OFFSET + 59999),
//         (OFFSET + 60000, OFFSET + 69999),
//         (OFFSET + 70000, OFFSET + 79999),
//         (OFFSET + 80000, OFFSET + 89999),
//         (OFFSET + 90000, OFFSET + 99999),
//     ];
//     let mut i = 0;
//     loop {
//         if i >= positions.len() {
//             break;
//         }
//         let (start, end) = *positions.at(i);
//         let delta = if i == 0 {
//             1500
//         } else {
//             1000
//         };
//         market_manager
//             .modify_position(market_id, start, end, I128Trait::new(to_e18_u128(delta), false));
//         i += 1;
//     };

//     // Execute swap.
//     market_manager
//         .swap(
//             market_id,
//             true,
//             to_e18(1800),
//             true,
//             Option::None(()),
//             Option::None(()),
//             Option::None(())
//         );
// // let mut position_id = id::position_id(
// //     market_id, alice().into(), OFFSET + 90000, OFFSET + 99999
// // );
// // let (mut base_amount, mut quote_amount, _, _) = market_manager
// //     .amounts_inside_position(position_id);
// // assert(base_amount == 0, '20 ticks crossed A wide');
// // position_id = id::position_id(market_id, alice().into(), OFFSET - 1000, OFFSET + 200000);
// // let (mut base_amount, mut quote_amount, _, _) = market_manager
// //     .amounts_inside_position(position_id);
// // assert(base_amount != 0, '20 ticks crossed B wide');
// }

// // Benchmark 21: Swap across a limit order, partial fill (cross 1 tick)

// #[test]
// fn before_benchmark_21_swap_limit_order_partial_fill() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
// }

// #[test]
// fn benchmark_21_swap_limit_order_partial_fill() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let _order_id = market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
//     market_manager
//         .swap(
//             market_id, true, 10000000, true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let (base_amount, quote_amount) = market_manager.amounts_inside_order(order_id, market_id);
// // assert(base_amount != 0 && quote_amount != 0, 'Partial fill');
// }

// // Benchmark 22: Swap across a limit order, full fill (cross 1 tick)

// #[test]
// fn before_benchmark_22_swap_limit_order_full_fill() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
// }

// #[test]
// fn benchmark_22_swap_limit_order_full_fill() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let _order_id = market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );
// // let (base_amount, quote_amount) = market_manager.amounts_inside_order(order_id, market_id);
// // assert(base_amount == 0 && quote_amount != 0, 'Full fill');
// }

// // Benchmark 23: Create limit order

// #[test]
// fn before_benchmark_23_create_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     setup_create_market(market_manager, base_token, quote_token);
// }

// #[test]
// fn benchmark_23_create_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
// }

// // Benchmark 24: Collect unfilled limit order

// #[test]
// fn before_benchmark_24_collect_unfilled_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
// }

// #[test]
// fn benchmark_24_collect_unfilled_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let order_id = market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
//     market_manager.collect_order(market_id, order_id);
// }

// // Benchmark 25: Collect partially filled limit order

// #[test]
// fn before_benchmark_25_collect_partially_filled_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
//     market_manager
//         .swap(
//             market_id, true, 10000000, true, Option::None(()), Option::None(()), Option::None(())
//         );
// }

// #[test]
// fn benchmark_25_collect_partially_filled_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let order_id = market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
//     market_manager
//         .swap(
//             market_id, true, 10000000, true, Option::None(()), Option::None(()), Option::None(())
//         );
//     market_manager.collect_order(market_id, order_id);
// }

// // Benchmark 26: Collect fully filled limit order

// #[test]
// fn before_benchmark_26_collect_fully_filled_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let _order_id = market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );
// }

// #[test]
// fn benchmark_26_collect_fully_filled_limit_order() {
//     let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
//     let market_id = setup_create_market(market_manager, base_token, quote_token);

//     start_prank(CheatTarget::One(market_manager.contract_address), alice());
//     let order_id = market_manager.create_order(market_id, false, OFFSET + 1000, to_e18_u128(1000));
//     market_manager
//         .swap(
//             market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
//         );
//     market_manager.collect_order(market_id, order_id);
// }

// Benchmark 27: Swap within a tick with strategy enabled, no position updates

#[test]
fn before_benchmark_27_swap_within_tick_with_strategy_enabled_no_position_updates() {
    let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
    let (strategy, market_id) = setup_and_deploy_strategy(market_manager, base_token, quote_token);

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 742550, OFFSET + 762550);

    // Deposit liquidity
    start_prank(CheatTarget::One(strategy.contract_address), alice());
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);

    // Execute swap to trigger initial place.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    let amount = to_e18(10);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));
}

#[test]
fn benchmark_27_swap_within_tick_with_strategy_enabled_no_position_updates() {
    let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
    let (strategy, market_id) = setup_and_deploy_strategy(market_manager, base_token, quote_token);

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 742550, OFFSET + 762550);

    // Deposit liquidity
    start_prank(CheatTarget::One(strategy.contract_address), alice());
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);

    // Execute swap to trigger initial place.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    let amount = to_e18(10);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));

    // Swap again.
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));
}

// Benchmark 28: Swap within a tick with strategy enabled, ome position update

#[test]
fn before_benchmark_28_swap_within_tick_with_strategy_enabled_one_position_update() {
    let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
    let (strategy, market_id) = setup_and_deploy_strategy(market_manager, base_token, quote_token);

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 742550, OFFSET + 762550);

    // Deposit liquidity
    start_prank(CheatTarget::One(strategy.contract_address), alice());
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);

    // Execute swap to trigger initial place.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    let amount = to_e18(10);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 747550, OFFSET + 767550);
}

#[test]
fn benchmark_28_swap_within_tick_with_strategy_enabled_one_position_update() {
    let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
    let (strategy, market_id) = setup_and_deploy_strategy(market_manager, base_token, quote_token);

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 742550, OFFSET + 762550);

    // Deposit liquidity
    start_prank(CheatTarget::One(strategy.contract_address), alice());
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);

    // Execute swap to trigger initial place.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    let amount = to_e18(10);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 747550, OFFSET + 767550);

    // Execute swap to trigger rebalance.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));
}

// Benchmark 29: Swap within a tick with strategy enabled, both position updates

#[test]
fn before_benchmark_29_swap_within_tick_with_strategy_enabled_both_position_updates() {
    let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
    let (strategy, market_id) = setup_and_deploy_strategy(market_manager, base_token, quote_token);

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 742550, OFFSET + 762550);

    // Deposit liquidity
    start_prank(CheatTarget::One(strategy.contract_address), alice());
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);

    // Set positions
    // Execute swap to trigger initial place.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    let amount = to_e18(10);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 716930, OFFSET + 736930, OFFSET + 747550, OFFSET + 767550);
}

#[test]
fn benchmark_29_swap_within_tick_with_strategy_enabled_both_position_updates() {
    let (market_manager, base_token, quote_token) = setup_deploy_and_approve();
    let (strategy, market_id) = setup_and_deploy_strategy(market_manager, base_token, quote_token);

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 742550, OFFSET + 762550);

    // Deposit liquidity
    start_prank(CheatTarget::One(strategy.contract_address), alice());
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);

    // Set positions
    // Execute swap to trigger initial place.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    let amount = to_e18(10);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));

    // Set positions
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 716930, OFFSET + 736930, OFFSET + 747550, OFFSET + 767550);

    // Execute swap to trigger rebalance.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));
}
