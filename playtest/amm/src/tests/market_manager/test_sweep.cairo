// Core lib imports.
use starknet::contract_address_const;

// Haiko imports.
use haiko_lib::math::price_math;
use haiko_lib::constants::{OFFSET, MAX_LIMIT, MAX_WIDTH};
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{owner, alice, default_token_params, default_market_params};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Fund LPs with initial token balances and approve market manager as spender.
    let initial_base_amount = 1000;
    fund(base_token, alice(), initial_base_amount);

    (market_manager, base_token, quote_token)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_sweep() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, _quote_token) = before();

    // Snapshot alice starting balance.
    let balance_start = base_token.balanceOf(alice());

    // Transfer tokens into contract.
    start_prank(CheatTarget::One(base_token.contract_address), alice());
    base_token.transfer(market_manager.contract_address, 1000);

    // Sweep tokens.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    start_prank(CheatTarget::One(base_token.contract_address), market_manager.contract_address);
    let amount = market_manager.sweep(alice(), base_token.contract_address, 1000);

    // Snapshot alice ending balance.
    let balance_end = base_token.balanceOf(alice());

    // Check amounts recovered.
    assert(balance_start == balance_end, 'Sweep: user balance');
    assert(amount == 1000, 'Sweep: amount');
}

#[test]
#[should_panic(expected: ('OnlyOwner',))]
fn test_sweep_not_owner() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, _quote_token) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager.sweep(alice(), base_token.contract_address, 1000);
}
