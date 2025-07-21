// Core lib imports.
use starknet::syscalls::deploy_syscall;

// Local imports.
use haiko_amm::contracts::mocks::manual_strategy::{
    ManualStrategy, IManualStrategyDispatcher, IManualStrategyDispatcherTrait
};
use haiko_amm::tests::helpers::strategy::deploy_strategy;

// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::math::{price_math, liquidity_math};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManager, IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::interfaces::IStrategy::{IStrategyDispatcher, IStrategyDispatcherTrait};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, default_token_params, default_market_params
};
use haiko_lib::helpers::utils::{encode_sqrt_price, to_e18, approx_eq};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    felt252,
    IManualStrategyDispatcher,
) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Deploy strategy.
    let strategy = deploy_strategy(owner());

    // Create market.
    let mut params = default_market_params();
    params.width = 1;
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET + 741930; // initial limit
    params.strategy = strategy.contract_address;
    let market_id = create_market(market_manager, params);

    // Initialise strategy.
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy
        .initialise(
            'Manual Strategy', 'MANU', '1.0.0', market_manager.contract_address, market_id,
        );

    // Fund owner with initial token balances and approve strategy and market manager as spenders.
    let base_amount = to_e18(5000000);
    let quote_amount = to_e18(1000000000000);
    fund(base_token, owner(), base_amount);
    fund(quote_token, owner(), quote_amount);
    approve(base_token, owner(), market_manager.contract_address, base_amount);
    approve(quote_token, owner(), market_manager.contract_address, quote_amount);
    approve(base_token, owner(), strategy.contract_address, base_amount);
    approve(quote_token, owner(), strategy.contract_address, quote_amount);

    // Fund LP with initial token balances and approve market manager as spender.
    fund(base_token, strategy.contract_address, base_amount);
    fund(quote_token, strategy.contract_address, quote_amount);
    approve(base_token, strategy.contract_address, market_manager.contract_address, base_amount);
    approve(quote_token, strategy.contract_address, market_manager.contract_address, quote_amount);

    (market_manager, base_token, quote_token, market_id, strategy)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_strategy() {
    let (market_manager, base_token, quote_token, market_id, strategy) = before();

    // Snapshot initial balances.
    let base_balance_start = base_token.balanceOf(owner());
    let quote_balance_start = quote_token.balanceOf(owner());

    // Set positions and deposit liquidity.
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET + 721930, OFFSET + 741930, OFFSET + 742550, OFFSET + 762550);
    let base_amount = to_e18(10000);
    let quote_amount = to_e18(125000000);
    strategy.deposit(base_amount, quote_amount);

    // Execute swap as strategy. 
    // This must be done to overcome a limitation with `prank` that causes tx to revert for a 
    // non-strategy caller. Particularly, when `update_positions` is called and the strategy 
    // re-enters the market manager to place positions, market manager continues to think that 
    // caller is the strategy due to the prank.
    start_prank(CheatTarget::One(market_manager.contract_address), strategy.contract_address);
    start_prank(CheatTarget::One(strategy.contract_address), market_manager.contract_address);
    let amount = to_e18(10);
    let (amount_in, amount_out, fees) = market_manager
        .swap(market_id, true, amount, true, Option::None(()), Option::None(()), Option::None(()));

    // Check swap amounts and position.
    let placed_positions = IStrategyDispatcher { contract_address: strategy.contract_address }
        .placed_positions(market_id);
    let bid = *placed_positions.at(0);
    let ask = *placed_positions.at(1);

    let base_amount_exp = 5940973053462648;
    let quote_amount_exp = 10000000000000000000;
    assert(amount_in == amount, 'Amount in');
    assert(approx_eq(amount_out, base_amount_exp, 10), 'Amount out');
    assert(approx_eq(fees, 29999999999999999, 10), 'Fees');
    assert(approx_eq(bid.liquidity.into(), 32164247211318427176429769, 10), 'Bid: liquidity');
    assert(approx_eq(ask.liquidity.into(), 4304816299654341048944538, 10), 'Ask: liquidity');
    assert(bid.lower_limit == OFFSET + 721930, 'Bid: lower limit');
    assert(bid.upper_limit == OFFSET + 741930, 'Bid: upper limit');
    assert(ask.lower_limit == OFFSET + 742550, 'Ask: lower limit');
    assert(ask.upper_limit == OFFSET + 762550, 'Ask: upper limit');

    // Withdraw liquidity.
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.withdraw();

    // Snapshot end balances.
    let base_balance_end = base_token.balanceOf(owner());
    let quote_balance_end = quote_token.balanceOf(owner());

    // Check balances.
    assert(approx_eq(base_balance_start - base_balance_end, base_amount_exp, 10), 'Base balance');
    assert(
        approx_eq(quote_balance_end - quote_balance_start, quote_amount_exp, 10), 'Quote balance'
    );
}
