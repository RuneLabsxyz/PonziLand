// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_WIDTH};
use haiko_lib::types::core::{MarketConfigs, ConfigOption};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::params::{
    owner, alice, default_token_params, default_market_params, valid_limits, config
};
use haiko_lib::helpers::utils::{to_e18, to_e18_u128, to_e28};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::{deploy_token, fund, approve},
};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Fund LPs and owner with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(500000);
    let initial_quote_amount = to_e28(10000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);
    fund(base_token, owner(), initial_base_amount);
    fund(quote_token, owner(), initial_quote_amount);
    approve(base_token, owner(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, owner(), market_manager.contract_address, initial_quote_amount);

    // Create dutch action market.
    // Set valid price range of $0.5 (-69310) to $20 (299570).
    let mut params = default_market_params();
    let valid_limits = valid_limits(
        7906620 - 69310, 7906620 + 299570, 7906620 - 69310, 7906620 + 299570, 10, 10
    );

    let market_configs = MarketConfigs {
        limits: config(valid_limits, true),
        add_liquidity: config(ConfigOption::Enabled, false),
        remove_liquidity: config(ConfigOption::Enabled, false),
        // make this upgradeable so we can disable bids after auction ends
        create_bid: config(ConfigOption::Disabled, true),
        create_ask: config(ConfigOption::Disabled, true),
        // make this upgradeable so we can disable order collection during order fill period
        collect_order: config(ConfigOption::Disabled, true),
        swap: config(ConfigOption::OnlyOwner, false),
    };

    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = 10;
    params.swap_fee_rate = 0; // disable swap fees
    params.market_configs = Option::Some(market_configs);
    params.controller = owner();
    let market_id = create_market(market_manager, params);

    (market_manager, base_token, quote_token, market_id)
}
////////////////////////////////
// TESTS
////////////////////////////////
#[test]
fn test_dutch_auction() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Auction sell amount.
    let sell_amount = to_e18(10);

    // Place some bids.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager
        .modify_position(
            market_id, 7906620 + 0, 7906620 + 10, I128Trait::new(to_e18_u128(10000), false)
        ); // $1.0
    market_manager
        .modify_position(
            market_id, 7906620 + 91630, 7906620 + 91640, I128Trait::new(to_e18_u128(50000), false)
        ); // $2.5
    market_manager
        .modify_position(
            market_id, 7906620 + 228240, 7906620 + 228250, I128Trait::new(to_e18_u128(37000), false)
        ); // $9.8
    // Should be able to withdraw bid before auction ends.
    market_manager
        .modify_position(
            market_id, 7906620 + 91630, 7906620 + 91640, I128Trait::new(to_e18_u128(50000), true)
        );

    // Market owner closes auction by disabling further bids and temporarily disabling withdrawals.
    // Top bids are filled by swapping sale tokens. If the gas burden is too high, this can be done
    // across multiple swap transactions.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let mut market_configs = market_manager.market_configs(market_id);
    market_configs.add_liquidity = config(ConfigOption::Disabled, true);
    market_configs.remove_liquidity = config(ConfigOption::Disabled, false);
    market_manager.set_market_configs(market_id, market_configs);
    market_manager
        .swap(
            market_id,
            false,
            sell_amount,
            true,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );
    market_configs.remove_liquidity = config(ConfigOption::Enabled, true);
    market_configs.swap = config(ConfigOption::Disabled, true);
    market_manager.set_market_configs(market_id, market_configs);

    // Bidders withdraw sale tokens.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager
        .modify_position(
            market_id, 7906620 + 0, 7906620 + 10, I128Trait::new(to_e18_u128(10000), true)
        );
    market_manager
        .modify_position(
            market_id, 7906620 + 228240, 7906620 + 228250, I128Trait::new(to_e18_u128(37000), true)
        );
}

#[test]
#[should_panic(expected: ('SwapDisabled',))]
fn test_dutch_auction_swap_by_bidder() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token, market_id) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager
        .swap(
            market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
        );
}

#[test]
#[should_panic(expected: ('AddLiqWidthOF',))]
fn test_dutch_auction_range_position() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token, market_id) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager
        .modify_position(
            market_id, 7906620 + 0, 7906620 + 20, I128Trait::new(to_e18_u128(10000), false)
        );
}

#[test]
#[should_panic(expected: ('CreateBidDisabled',))]
fn test_dutch_auction_bid_order() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token, market_id) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager.create_order(market_id, true, 7906620 + 0, to_e18_u128(10000));
}

#[test]
#[should_panic(expected: ('CreateAskDisabled',))]
fn test_dutch_auction_ask_order() {
    // Deploy market manager and tokens.
    let (market_manager, _base_token, _quote_token, market_id) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager.create_order(market_id, false, 7906620 + 0, to_e18_u128(10000));
}

#[test]
#[should_panic(expected: ('AddLiqDisabled',))]
fn test_dutch_auction_bid_after_auction_ends() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let mut market_configs = market_manager.market_configs(market_id);
    market_configs.add_liquidity = config(ConfigOption::Disabled, true);
    market_configs.remove_liquidity = config(ConfigOption::Disabled, false);
    market_manager.set_market_configs(market_id, market_configs);

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager
        .modify_position(
            market_id, 7906620 + 0, 7906620 + 10, I128Trait::new(to_e18_u128(10000), false)
        );
}

#[test]
#[should_panic(expected: ('SwapDisabled',))]
fn test_dutch_auction_swap_by_bidder_after_sale_ends() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let mut market_configs = market_manager.market_configs(market_id);
    market_configs.add_liquidity = config(ConfigOption::Disabled, false);
    market_configs.remove_liquidity = config(ConfigOption::Disabled, false);
    market_configs.swap = config(ConfigOption::Disabled, false);
    market_manager.set_market_configs(market_id, market_configs);

    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager
        .swap(
            market_id, true, to_e18(1), true, Option::None(()), Option::None(()), Option::None(())
        );
}
