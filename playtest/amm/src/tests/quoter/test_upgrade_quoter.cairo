// Local imports.
use haiko_amm::contracts::quoter::Quoter;
use haiko_amm::contracts::mocks::upgraded_quoter::{
    IUpgradedQuoterDispatcher, IUpgradedQuoterDispatcherTrait
};

// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::interfaces::IQuoter::{IQuoterDispatcher, IQuoterDispatcherTrait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    quoter::deploy_quoter
};
use haiko_lib::helpers::params::{owner, alice, default_token_params, default_market_params};
use haiko_lib::helpers::utils::{to_e18, to_e18_u128, to_e28, encode_sqrt_price};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, IQuoterDispatcher) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy quoter.
    let quoter = deploy_quoter(owner(), market_manager.contract_address);

    (market_manager, quoter)
}

#[test]
fn test_upgrade_quoter() {
    // Deploy market manager and tokens.
    let (_market_manager, quoter) = before();

    // Upgrade market manager.
    start_prank(CheatTarget::One(quoter.contract_address), owner());
    let upgraded_class = declare("UpgradedQuoter");
    quoter.upgrade(upgraded_class.class_hash);

    // Check if the quoter was upgraded.
    let upgraded_quoter = IUpgradedQuoterDispatcher { contract_address: quoter.contract_address };
    assert(upgraded_quoter.owner() == owner(), 'Upgrade: owner');
    assert(upgraded_quoter.foo() == 1, 'Upgrade: foo');
}

#[test]
#[should_panic(expected: ('OnlyOwner',))]
fn test_upgrade_quoter_not_owner() {
    // Deploy market manager and tokens.
    let (_market_manager, quoter) = before();

    // Upgrade market manager.
    start_prank(CheatTarget::One(quoter.contract_address), alice());
    let upgraded_class = declare("UpgradedQuoter");
    quoter.upgrade(upgraded_class.class_hash);
}
