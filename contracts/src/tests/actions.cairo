// Starknet imports
use starknet::contract_address::ContractAddressZeroable;
use starknet::testing::{set_contract_address, set_block_timestamp, set_caller_address};
use starknet::{contract_address_const, ContractAddress};
// Dojo imports

use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait};
use dojo::model::{ModelStorage, ModelValueStorage, ModelStorageTest};

//Internal imports

use ponzi_land::tests::setup::{setup, setup::{create_setup, deploy_erc20, RECIPIENT}};
use ponzi_land::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
use ponzi_land::models::land::{Land};

// External dependencies
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

fn LIQUIDITY_POOL() -> ContractAddress {
    contract_address_const::<'LIQUIDITY_POOL'>()
}

fn NEW_LIQUIDITY_POOL() -> ContractAddress {
    contract_address_const::<'NEW_LIQUIDITY_POOL'>()
}

fn FIRST_OWNER() -> ContractAddress {
    contract_address_const::<'FIRST_OWNER'>()
}

fn NEIGHBOR_1() -> ContractAddress {
    contract_address_const::<'NEIGHBOR_1'>()
}

fn NEIGHBOR_2() -> ContractAddress {
    contract_address_const::<'NEIGHBOR_2'>()
}

fn NEIGHBOR_3() -> ContractAddress {
    contract_address_const::<'NEIGHBOR_3'>()
}

fn NEW_BUYER() -> ContractAddress {
    contract_address_const::<'NEW_BUYER'>()
}

#[test]
fn test_buy_action() {
    let (mut world, actions_system, erc20) = create_setup();
    set_contract_address(RECIPIENT());

    //permisions for the contract
    erc20.approve(actions_system.contract_address, 1000);
    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 1000, 'Approval failed');

    //creation of the land
    actions_system.auction(11, 100, 50, erc20.contract_address, 2);
    actions_system.bid(11, erc20.contract_address, 10, 12, LIQUIDITY_POOL());

    // Simulate token transfer to new buyer
    erc20.transfer(NEW_BUYER(), 600);
    set_contract_address(NEW_BUYER());
    erc20.approve(actions_system.contract_address, 600);

    // Attempt to buy land at position 11
    actions_system.buy(11, erc20.contract_address, 100, 120, NEW_LIQUIDITY_POOL());
    let stake_balance = actions_system.get_stake_balance(NEW_BUYER());

    let mut land: Land = world.read_model(11);
    assert(land.owner == NEW_BUYER(), 'has to be a new owner');
    assert(land.pool_key == NEW_LIQUIDITY_POOL(), 'has to be a new lp');
    assert(land.sell_price == 100, 'has to be a new price');
    assert(stake_balance == 120, 'error with stake_balance')
}

#[test]
#[should_panic]
fn test_invalid_land() {
    let (mut world, actions_system, erc20) = create_setup();

    set_contract_address(RECIPIENT());
    let mut land: Land = world.read_model(11);

    //permisions for the contract
    erc20.approve(actions_system.contract_address, 10000);
    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= land.sell_price.into(), 'Approval failed');

    //creation of the land
    land.pool_key = LIQUIDITY_POOL();
    land.owner = FIRST_OWNER();
    land.sell_price = 123;
    land.token_used = erc20.contract_address;

    world.write_model_test(@land);

    // Attempt to buy land at invalid position (11000)
    actions_system.buy(11000, erc20.contract_address, 10, 12, NEW_LIQUIDITY_POOL());
}

//test for now without auction
#[test]
fn test_bid_and_buy_action() {
    // Setup test environment
    let (mut world, actions_system, erc20) = create_setup();
    set_contract_address(RECIPIENT());

    //grant ERC20 approval
    erc20.approve(actions_system.contract_address, 1000);

    // Bid on land at position 11
    set_block_timestamp(100);

    actions_system.auction(11, 100, 50, erc20.contract_address, 2);

    set_block_timestamp(600);

    actions_system.auction(11, 100, 50, erc20.contract_address, 2);
    actions_system.bid(11, erc20.contract_address, 10, 12, NEW_LIQUIDITY_POOL());
    let stake_balance = actions_system.get_stake_balance(RECIPIENT());

    // Validate bid/buy updates
    let mut land: Land = world.read_model(11);
    assert(land.owner == RECIPIENT(), 'error in set a owner');
    assert(land.pool_key == NEW_LIQUIDITY_POOL(), 'error in set a lp');
    assert(land.sell_price == 10, 'error in set a price');
    assert(stake_balance == 12, 'error in set a stake_balance');
    assert(land.block_date_bought == 600, 'error in set block time');

    // Simulate token transfer to new buyer
    erc20.transfer(NEW_BUYER(), 20);
    set_contract_address(NEW_BUYER());
    erc20.approve(actions_system.contract_address, 1000);
    let erc20_new_buyer = deploy_erc20(NEW_BUYER());
    set_block_timestamp(160);

    // Approve tokens and perform buy action
    erc20_new_buyer.approve(actions_system.contract_address, 1000);
    actions_system.buy(11, erc20_new_buyer.contract_address, 300, 500, NEW_LIQUIDITY_POOL());

    // Validate buy action updates
    let land: Land = world.read_model(11);
    let stake_balance = actions_system.get_stake_balance(NEW_BUYER());
    assert(land.owner == NEW_BUYER(), 'error in set owner from buy');
    assert(stake_balance == 500, 'error in stake from buy');
    assert(land.sell_price == 300, 'error in set a price from buy');
    assert(land.block_date_bought == 160, 'error in set time from buy');
}


#[test]
fn test_claim_and_add_taxes() {
    let (mut world, actions_system, erc20) = create_setup();

    // Deploy ERC20 tokens for neighbors
    let erc20_neighbor_1 = deploy_erc20(NEIGHBOR_1());
    let erc20_neighbor_2 = deploy_erc20(NEIGHBOR_2());
    let erc20_neighbor_3 = deploy_erc20(NEIGHBOR_3());

    //Set permissions for ERC20 tokens
    set_contract_address(RECIPIENT());
    erc20.approve(actions_system.contract_address, 10000);
    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 10000, 'Approval failed');

    //create lands
    set_block_timestamp(100);

    //generate taxes for land 1 to neighboors
    //Auction/Bid on land for claimer

    actions_system.auction(1280, 100, 50, erc20.contract_address, 2);
    actions_system.bid(1280, erc20.contract_address, 500, 1000, LIQUIDITY_POOL());
    let claimer_land: Land = world.read_model(1280);
    assert(claimer_land.owner == RECIPIENT(), 'error with the land owner');

    set_block_timestamp(300);

    //Auction/Bid for neighbors
    set_contract_address(NEIGHBOR_1());
    erc20_neighbor_1.approve(actions_system.contract_address, 1000);

    actions_system.auction(1281, 20, 10, erc20_neighbor_1.contract_address, 2);
    actions_system.bid(1281, erc20_neighbor_1.contract_address, 500, 100, LIQUIDITY_POOL());

    set_block_timestamp(500);

    set_contract_address(NEIGHBOR_2());
    erc20_neighbor_2.approve(actions_system.contract_address, 100000);

    actions_system.auction(1216, 20, 10, erc20_neighbor_2.contract_address, 2);
    actions_system.bid(1216, erc20_neighbor_2.contract_address, 500, 1000, LIQUIDITY_POOL());

    set_block_timestamp(600);

    set_contract_address(NEIGHBOR_3());
    erc20_neighbor_3.approve(actions_system.contract_address, 10000);

    actions_system.auction(1344, 100, 50, erc20_neighbor_3.contract_address, 2);
    actions_system.bid(1344, erc20_neighbor_3.contract_address, 500, 1000, LIQUIDITY_POOL());

    // Set permissions for ERC20 tokens
    set_contract_address(RECIPIENT());
    erc20_neighbor_1.approve(RECIPIENT(), 100);
    erc20_neighbor_2.approve(RECIPIENT(), 100);
    erc20_neighbor_3.approve(RECIPIENT(), 100);

    //simulate some time difference to generate taxes
    set_block_timestamp(5000);
    actions_system.claim(1280);

    //verify the claimer land
    let claimer_land_taxes = actions_system.get_pending_taxes(claimer_land.owner);
    assert(claimer_land_taxes.len() == 0, 'have pending taxes');
    assert(erc20_neighbor_1.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');
    assert(erc20_neighbor_2.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');
    assert(erc20_neighbor_3.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');

    //verify the neighbors of the claimer land
    let taxes_neighbor_1 = actions_system.get_pending_taxes(NEIGHBOR_1());
    let taxes_neighbor_2 = actions_system.get_pending_taxes(NEIGHBOR_2());
    let taxes_neighbor_3 = actions_system.get_pending_taxes(NEIGHBOR_3());

    assert(taxes_neighbor_1.len() > 0, 'must have pending taxes');
    assert(taxes_neighbor_2.len() > 0, 'must have pending taxes');
    assert(taxes_neighbor_3.len() > 0, 'must have pending taxes');

    let stake_balance_after_taxes_neighbor_1 = actions_system.get_stake_balance(NEIGHBOR_1());
    let stake_balance_after_taxes_neighbor_2 = actions_system.get_stake_balance(NEIGHBOR_2());
    let stake_balance_after_taxes_neighbor_3 = actions_system.get_stake_balance(NEIGHBOR_3());

    assert(stake_balance_after_taxes_neighbor_1 < 1000, 'must have less stake');
    assert(stake_balance_after_taxes_neighbor_2 < 1000, 'must have less stake');
    assert(stake_balance_after_taxes_neighbor_3 < 1000, 'must have less stake');
}


#[test]
fn test_claim_and_buy_actions() {
    //setup environment
    let (mut world, actions_system, erc20) = create_setup();
    let erc20_neighbor_1 = deploy_erc20(NEIGHBOR_1());

    set_contract_address(RECIPIENT());

    // approve tokens for contract usage
    erc20.approve(actions_system.contract_address, 5000);
    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 1000, 'Approval failed');

    //send tokens for the buyer
    erc20.transfer(NEW_BUYER(), 500);
    assert(erc20.balanceOf(RECIPIENT()) == 999500, 'error in transfer erc20');

    // Set the block timestamp to simulate the passage of time
    set_block_timestamp(100);

    // Auction/Bid on land at position 1280
    actions_system.auction(1280, 100, 50, erc20.contract_address, 2);
    actions_system.bid(1280, erc20.contract_address, 500, 1000, NEW_LIQUIDITY_POOL());

    assert(erc20.balanceOf(RECIPIENT()) == 998000, 'error in stake erc20');
    assert(erc20_neighbor_1.balanceOf(RECIPIENT()) == 0, 'no taxes yet');

    let land_1280: Land = world.read_model(1280);
    assert(land_1280.last_pay_time == 100, 'err in set last_pay_time');

    // Neighbor bids on adjacent land (1281)
    set_block_timestamp(600);

    set_contract_address(NEIGHBOR_1());
    erc20_neighbor_1.approve(actions_system.contract_address, 2000);
    erc20_neighbor_1.transfer(NEW_BUYER(), 1000);

    actions_system.auction(1281, 100, 50, erc20_neighbor_1.contract_address, 2);
    actions_system.bid(1281, erc20_neighbor_1.contract_address, 1000, 100, LIQUIDITY_POOL());
    let land_1280: Land = world.read_model(1280);
    assert(land_1280.last_pay_time == 600, 'err in 1280 last_pay_time');

    let land_1281: Land = world.read_model(1281);
    assert(land_1281.last_pay_time == 600, 'err in set last_pay_time');

    // Set a new block timestamp to simulate time passing (tax generation)
    set_block_timestamp(3000);

    // Perform a buy action for the land
    set_contract_address(NEW_BUYER());
    erc20_neighbor_1.approve(actions_system.contract_address, 1000);
    erc20.approve(actions_system.contract_address, 1000);

    actions_system.buy(1280, erc20_neighbor_1.contract_address, 100, 100, NEW_LIQUIDITY_POOL());

    let land_1280: Land = world.read_model(1280);
    assert(land_1280.last_pay_time == 3000, 'err in 1280 last_pay_time');

    let land_1281: Land = world.read_model(1281);
    assert(land_1281.last_pay_time == 3000, 'err in 1281 last_pay_time');

    // Verify that the seller received tokens from the sale and also refunded amount from stake
    assert(erc20.balanceOf(RECIPIENT()) == 999500, 'error in sell land');

    // Verify taxes were successfully claimed
    assert(erc20_neighbor_1.balanceOf(RECIPIENT()) > 0, 'error in claim taxes');

    set_block_timestamp(5000);

    //Verify claim for the NEW_BUYER
    actions_system.claim(1280);
    assert(erc20_neighbor_1.balanceOf(NEW_BUYER()) > 0, 'error in claim normal taxes');
}

#[test]
fn test_nuke_action() {
    //setup environment
    let (mut world, actions_system, erc20) = create_setup();
    let erc20_neighbor_1 = deploy_erc20(NEIGHBOR_1());

    //permisions for the contract
    set_contract_address(RECIPIENT());
    erc20.approve(actions_system.contract_address, 10000);

    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 10000, 'Approval failed');

    //create lands
    set_block_timestamp(100);

    //land 1
    actions_system.auction(1280, 100, 50, erc20.contract_address, 2);
    actions_system.bid(1280, erc20.contract_address, 500, 1000, LIQUIDITY_POOL());
    let claimer_land: Land = world.read_model(1280);
    assert(claimer_land.owner == RECIPIENT(), 'error with the land owner');

    //neighboors
    set_contract_address(NEIGHBOR_1());
    erc20_neighbor_1.approve(actions_system.contract_address, 10000);

    actions_system.auction(1281, 100, 50, erc20_neighbor_1.contract_address, 2);
    actions_system.bid(1281, erc20_neighbor_1.contract_address, 500, 10, LIQUIDITY_POOL());

    //permisions for transfer tokens
    set_contract_address(RECIPIENT());
    erc20_neighbor_1.approve(RECIPIENT(), 100);

    // Fetch land to check its initial state
    let nuked_land = actions_system.get_land(1281);
    assert(nuked_land.owner != ContractAddressZeroable::zero(), 'owner must exist');
    assert(nuked_land.sell_price != 0, 'sell_price must exist');
    assert(nuked_land.pool_key != ContractAddressZeroable::zero(), 'pool_key must exist');

    // Simulate time progression
    set_block_timestamp(5110);

    actions_system.claim(claimer_land.location);

    // Verify that the land has been nuked
    let nuked_land = actions_system.get_land(1281);

    assert(nuked_land.owner == ContractAddressZeroable::zero(), 'owner must be 0');
    assert(nuked_land.sell_price == 0, 'sell_price must be 0');
    assert(nuked_land.pool_key == ContractAddressZeroable::zero(), 'pool_key must be 0');
}

#[test]
fn test_increase_price_and_stake() {
    //setup environment
    let (mut world, actions_system, erc20) = create_setup();

    //permisions for the contract
    set_contract_address(RECIPIENT());
    erc20.approve(actions_system.contract_address, 10000);

    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 10000, 'Approval failed');

    //create land
    set_block_timestamp(100);

    actions_system.auction(1280, 100, 50, erc20.contract_address, 2);
    actions_system.bid(1280, erc20.contract_address, 500, 1000, LIQUIDITY_POOL());
    let land: Land = world.read_model(1280);

    //verify the land
    assert(land.owner == RECIPIENT(), 'error with the land owner');
    assert(land.sell_price == 500, 'land price has to be 500');

    //increase the price
    actions_system.increase_price(1280, 2300);
    let land: Land = world.read_model(1280);
    assert(land.sell_price == 2300, 'has increase to 2300');

    //increase the stake
    let stake_balance = actions_system.get_stake_balance(land.owner);
    assert(stake_balance == 1000, 'stake has to be 1000');

    actions_system.increase_stake(1280, 2000);

    let stake_balance = actions_system.get_stake_balance(land.owner);
    assert(stake_balance == 3000, 'stake has to be 3000');
}

