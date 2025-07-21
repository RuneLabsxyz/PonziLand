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
    market_manager::{deploy_market_manager, create_market_without_whitelisting},
    token::deploy_token,
};
use haiko_lib::helpers::params::{owner, default_token_params, default_market_params};

// External imports.
use snforge_std::declare;
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
fn test_create_market_initialises_immutables() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    let market_id = create_market_without_whitelisting(market_manager, params);

    // Check market was initialised with correct immutables.
    let market_info = market_manager.market_info(market_id);
    assert(market_info.base_token == params.base_token, 'Create mkt: base token');
    assert(market_info.quote_token == params.quote_token, 'Create mkt: quote token');
    assert(market_info.width == params.width, 'Create mkt: width');
    assert(market_info.strategy == params.strategy, 'Create mkt: strategy');
    assert(market_info.swap_fee_rate == params.swap_fee_rate, 'Create mkt: swap fee');
    assert(market_info.fee_controller == params.fee_controller, 'Create mkt: fee controller');
}

#[test]
fn test_create_market_initialises_state() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    let market_id = create_market_without_whitelisting(market_manager, params);

    // Check market was initialised with correct state.
    let market_state = market_manager.market_state(market_id);
    assert(market_state.liquidity == 0, 'Create mkt: liquidity');
    assert(market_state.curr_limit == params.start_limit, 'Create mkt: initial limit');
    assert(
        market_state
            .curr_sqrt_price == price_math::limit_to_sqrt_price(params.start_limit, params.width),
        'Create mkt: initial sqrt price'
    );
    assert(market_state.base_fee_factor == 0, 'Create mkt: base fee factor');
    assert(market_state.quote_fee_factor == 0, 'Create mkt: quote fee factor');
}

#[test]
fn test_create_market_min_start_limit() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = 0;

    create_market_without_whitelisting(market_manager, params);
}

#[test]
fn test_create_market_max_start_limit_less_1_width_1() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET + MAX_LIMIT - 1;
    create_market_without_whitelisting(market_manager, params);
}

#[test]
fn test_create_market_max_start_limit_less_1_width_10() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = 10;
    params.start_limit = OFFSET + 7906610;
    create_market_without_whitelisting(market_manager, params);
}

#[test]
fn test_create_market_max_width() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = MAX_WIDTH;
    params.start_limit = OFFSET;
    create_market_without_whitelisting(market_manager, params);
}

#[test]
#[should_panic(expected: ('MarketExists',))]
fn test_create_market_duplicate_market() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    create_market_without_whitelisting(market_manager, params);

    // Create duplicate market.
    create_market_without_whitelisting(market_manager, params);
}

// Disabled: not supported by Foundry.
// #[test]
// #[should_panic(expected: ('CONTRACT_NOT_DEPLOYED',))]
// fn test_create_market_quote_token_undeployed() {
//     // Deploy market manager and tokens.
//     let (market_manager, base_token, _quote_token) = before();

//     // Create market.
//     let mut params = default_market_params();
//     params.base_token = base_token.contract_address;
//     params.quote_token = contract_address_const::<0x12345>(); // random undeployed address
//     create_market(market_manager, params);
// }

// Disabled: not supported by Foundry.
// #[test]
// #[should_panic(expected: ('CONTRACT_NOT_DEPLOYED',))]
// fn test_create_market_base_token_undeployed() {
//     // Deploy market manager and tokens.
//     let (market_manager, _base_token, quote_token) = before();

//     // Create market.
//     let mut params = default_market_params();
//     params.base_token = contract_address_const::<0x12345>(); // random undeployed address
//     params.quote_token = quote_token.contract_address;
//     create_market(market_manager, params);
// }

#[test]
#[should_panic(expected: ('StartLimitOF',))]
fn test_create_market_start_limit_overflow() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = 10;
    params.start_limit = OFFSET + 21901630;

    create_market_without_whitelisting(market_manager, params);
}

#[test]
#[should_panic(expected: ('WidthZero',))]
fn test_create_market_width_zero() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = 0;

    create_market_without_whitelisting(market_manager, params);
}

#[test]
#[should_panic(expected: ('WidthOF',))]
fn test_create_market_width_overflow() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = MAX_WIDTH + 1;

    create_market_without_whitelisting(market_manager, params);
}

#[test]
#[should_panic(expected: ('FeeRateOF',))]
fn test_create_market_fee_rate_overflow() {
    // Deploy market manager and tokens.
    let (market_manager, base_token, quote_token) = before();

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.swap_fee_rate = 10001;

    create_market_without_whitelisting(market_manager, params);
}
