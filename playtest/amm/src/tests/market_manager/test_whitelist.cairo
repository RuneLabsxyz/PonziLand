// Core lib imports.
use starknet::contract_address_const;

// Local imports.
use haiko_amm::contracts::market_manager::MarketManager;

// Haiko imports.
use haiko_lib::id;
use haiko_lib::math::price_math;
use haiko_lib::constants::{OFFSET, MAX_LIMIT, MAX_WIDTH};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManager, IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::types::core::MarketInfo;
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, create_market_without_whitelisting},
    token::deploy_token,
};
use haiko_lib::helpers::params::{owner, alice, default_token_params, default_market_params};

// External imports.
use snforge_std::{
    start_prank, stop_prank, CheatTarget, declare, spy_events, SpyOn, EventSpy, EventAssertions
};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher
) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    let mut new_token_params = base_token_params;
    new_token_params.name_ = 'New Token';
    new_token_params.symbol_ = 'NT';
    let new_token = deploy_token(erc20_class, new_token_params);

    (market_manager, base_token, quote_token, new_token)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_create_regular_market_works() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token, _) = before();

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    create_market_without_whitelisting(market_manager, params);

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::WhitelistToken(
                        MarketManager::WhitelistToken { token: base_token.contract_address }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::WhitelistToken(
                        MarketManager::WhitelistToken { token: quote_token.contract_address }
                    )
                )
            ]
        );
}

#[test]
fn test_create_whitelisted_strategy_market_works() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token, _) = before();

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.strategy = contract_address_const::<0x123>();
    let market_id = create_market(market_manager, params);

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::Whitelist(MarketManager::Whitelist { market_id })
                )
            ]
        );
}

#[test]
fn test_whitelisted_market_for_new_token_emits_event() {
    // Deploy market manager and tokens.
    let (market_manager, _, quote_token, new_token) = before();

    // Whitelist market.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let mut params = default_market_params();
    params.base_token = new_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.strategy = contract_address_const::<0x123>();
    let market_id = id::market_id(
        MarketInfo {
            base_token: new_token.contract_address,
            quote_token: quote_token.contract_address,
            strategy: params.strategy,
            width: params.width,
            swap_fee_rate: params.swap_fee_rate,
            fee_controller: contract_address_const::<0x0>(),
            controller: contract_address_const::<0x0>(),
        }
    );
    market_manager.whitelist_markets(array![market_id]);

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Create market.
    let market_id = create_market(market_manager, params);

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::WhitelistToken(
                        MarketManager::WhitelistToken { token: new_token.contract_address }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::CreateMarket(
                        MarketManager::CreateMarket {
                            market_id,
                            base_token: new_token.contract_address,
                            quote_token: quote_token.contract_address,
                            width: params.width,
                            strategy: params.strategy,
                            swap_fee_rate: params.swap_fee_rate,
                            fee_controller: contract_address_const::<0x0>(),
                            controller: contract_address_const::<0x0>(),
                            start_limit: params.start_limit,
                            start_sqrt_price: price_math::limit_to_sqrt_price(
                                params.start_limit, params.width
                            ),
                        }
                    )
                )
            ]
        );
}

#[test]
#[should_panic(expected: ('NotWhitelisted',))]
fn test_create_market_strategy_not_whitelisted() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token, _) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.strategy = contract_address_const::<0x123>();
    create_market_without_whitelisting(market_manager, params);
}

#[test]
#[should_panic(expected: ('NotWhitelisted',))]
fn test_create_market_fee_controller_not_whitelisted() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token, _) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.fee_controller = contract_address_const::<0x123>();
    create_market_without_whitelisting(market_manager, params);
}

#[test]
#[should_panic(expected: ('NotWhitelisted',))]
fn test_create_market_controller_not_whitelisted() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token, _) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.controller = contract_address_const::<0x123>();
    create_market_without_whitelisting(market_manager, params);
}

#[test]
#[should_panic(expected: ('OnlyOwner',))]
fn test_whitelist_market_not_owner() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token, _) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager.whitelist_markets(array![123]);
}

#[test]
#[should_panic(expected: ('AlreadyWhitelisted',))]
fn test_whitelist_market_twice() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token, _) = before();

    // Create market (whitelist both tokens).
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.strategy = contract_address_const::<0x123>();
    let market_id = create_market(market_manager, params);

    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    market_manager.whitelist_markets(array![market_id]);
}
