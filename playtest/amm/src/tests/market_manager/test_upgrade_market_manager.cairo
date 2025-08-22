// Core lib imports.
use starknet::contract_address_const;

// Local imports.
use haiko_amm::contracts::mocks::upgraded_market_manager::{
    UpgradedMarketManager, IUpgradedMarketManagerDispatcher, IUpgradedMarketManagerDispatcherTrait
};

// Haiko imports.
use haiko_lib::math::price_math;
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::deploy_token
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

    (market_manager, base_token, quote_token)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_upgrade_market_manager() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token) = before();

    // Upgrade market manager.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let upgraded_class = declare("UpgradedMarketManager");
    market_manager.upgrade(upgraded_class.class_hash);

    // Calling owner returns existing owner.
    let upgraded_market_manager = IUpgradedMarketManagerDispatcher {
        contract_address: market_manager.contract_address
    };
    assert(upgraded_market_manager.owner() == owner(), 'Upgrade: owner');
    assert(upgraded_market_manager.foo() == 1, 'Upgrade: foo');
}

#[test]
#[should_panic(expected: ('OnlyOwner',))]
fn test_upgrade_market_manager_not_owner() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token) = before();

    // Upgrade market manager.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let upgraded_class = declare("UpgradedMarketManager");
    market_manager.upgrade(upgraded_class.class_hash);
}
