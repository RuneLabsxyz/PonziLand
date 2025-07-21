// Core lib imports.
use starknet::contract_address_const;
use core::integer::BoundedInt;

// Haiko imports.
use haiko_lib::math::price_math;
use haiko_lib::constants::{OFFSET, MIN_LIMIT, MAX_LIMIT, MAX_WIDTH};
use haiko_lib::types::core::MarketConfigs;
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::params::{
    owner, alice, default_token_params, default_market_params, valid_limits, config
};
use haiko_lib::helpers::utils::{to_e18_u128, to_e28};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::{deploy_token, fund, approve},
};

// External imports.
use snforge_std::{declare, start_prank, stop_prank, CheatTarget};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher) {
    // Get default owner.
    let owner = owner();

    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner);

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Fund LPs with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(500000);
    let initial_quote_amount = to_e28(10000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);

    (market_manager, base_token, quote_token)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_enable_concentrated() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create linear market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    let valid_limits = valid_limits(
        OFFSET - MIN_LIMIT,
        OFFSET - MIN_LIMIT,
        OFFSET + MAX_LIMIT,
        OFFSET + MAX_LIMIT,
        1,
        BoundedInt::max()
    );
    let mut market_configs: MarketConfigs = Default::default();
    market_configs.limits = config(valid_limits, false);
    params.market_configs = Option::Some(market_configs);
    params.controller = owner();
    let market_id = create_market(market_manager, params);

    // Place positions across whole range.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let lower_limit = OFFSET - MIN_LIMIT;
    let upper_limit = OFFSET + MAX_LIMIT;
    let liquidity = I128Trait::new(to_e18_u128(100000), false);
    market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity);

    // Enable concentrated by removing constraint.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    market_configs.limits = config(Default::default(), false);
    market_manager.set_market_configs(market_id, market_configs);
}

#[test]
#[should_panic(expected: ('OnlyController',))]
fn test_enable_concentrated_not_owner() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create linear market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    let valid_limits = valid_limits(
        OFFSET - MIN_LIMIT,
        OFFSET - MIN_LIMIT,
        OFFSET + MAX_LIMIT,
        OFFSET + MAX_LIMIT,
        1,
        BoundedInt::max()
    );
    let mut market_configs: MarketConfigs = Default::default();
    market_configs.limits = config(valid_limits, false);
    params.market_configs = Option::Some(market_configs);
    params.controller = owner();
    let market_id = create_market(market_manager, params);

    // Enable concentrated.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_configs.limits = config(Default::default(), false);
    market_manager.set_market_configs(market_id, market_configs);
}

#[test]
#[should_panic(expected: ('NoChange',))]
fn test_enable_concentrated_already_concentrated() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.owner = owner();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.controller = owner();
    let market_id = create_market(market_manager, params);

    // Try set concentrated.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let market_configs = market_manager.market_configs(market_id);
    market_manager.set_market_configs(market_id, market_configs);
}
