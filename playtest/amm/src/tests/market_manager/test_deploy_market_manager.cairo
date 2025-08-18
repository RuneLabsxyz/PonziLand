// Haiko imports.
use haiko_lib::helpers::params::owner;
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::market_manager::deploy_market_manager;

// External imports.
use snforge_std::declare;

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_deploy_market_manager_initialises_owner() {
    // Get default owner.
    let owner = owner();

    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Check owner correctly initialised. 
    assert(market_manager.owner() == owner, 'Deploy: incorrect owner');
}
