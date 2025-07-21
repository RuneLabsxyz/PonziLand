// Haiko imports.
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::params::{owner, default_transfer_owner_params, alice, bob};
use haiko_lib::helpers::actions::market_manager::{
    deploy_market_manager, transfer_owner, accept_owner,
};

// External imports.
use snforge_std::declare;

////////////////////////////////
// SETUP
////////////////////////////////

fn _before() -> IMarketManagerDispatcher {
    let market_manager_class = declare("MarketManager");
    deploy_market_manager(market_manager_class, owner())
}

#[test]
fn test_transfer_and_accept_owner() {
    let market_manager = _before();
    let transfer_owner_params = default_transfer_owner_params();

    transfer_owner(market_manager, transfer_owner_params);

    accept_owner(market_manager, transfer_owner_params.new_owner);
    assert(market_manager.owner() == transfer_owner_params.new_owner, 'Owner transferred check');
}

#[test]
fn test_transfer_then_update_owner_before_accepting() {
    let market_manager = _before();
    let mut transfer_owner_params = default_transfer_owner_params();

    transfer_owner(market_manager, transfer_owner_params);

    transfer_owner_params.new_owner = bob(); // new owner changed
    transfer_owner(market_manager, transfer_owner_params); // transfer ownership to another address

    assert(
        market_manager.owner() != transfer_owner_params.new_owner, 'Owner not transferred check 1'
    );
    assert(market_manager.owner() == transfer_owner_params.owner, 'Owner transfer check 2');

    accept_owner(market_manager, transfer_owner_params.new_owner);

    assert(market_manager.owner() != alice(), 'Owner transferred check 3');
    assert(market_manager.owner() == bob(), 'Owner transferred check 4');
}


////////////////////////////////
// TESTS - failure cases
////////////////////////////////

#[test]
#[should_panic(expected: ('OnlyOwner',))]
fn test_transfer_owner_not_owner() {
    let market_manager = _before();
    let mut transfer_owner_params = default_transfer_owner_params();

    transfer_owner_params.owner = alice(); // changing owner
    transfer_owner(market_manager, transfer_owner_params);
}

#[test]
#[should_panic(expected: ('OnlyNewOwner',))]
fn test_accept_owner_not_transferred() {
    let market_manager = _before();

    let transfer_owner_params = default_transfer_owner_params();
    transfer_owner(market_manager, transfer_owner_params);

    accept_owner(market_manager, bob());
}
