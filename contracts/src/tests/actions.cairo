// Starknet imports
use starknet::contract_address::ContractAddressZeroable;
use starknet::testing::{set_contract_address, set_block_timestamp, set_caller_address};
use starknet::{contract_address_const, ContractAddress};
// Dojo imports

use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait, WorldStorageTrait, WorldStorage};
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

// Helper functions for common test setup and actions
fn setup_test() -> (WorldStorage, IActionsDispatcher, IERC20CamelDispatcher) {
    let (world, actions_system, erc20) = create_setup();
    set_contract_address(RECIPIENT());

    // Setup initial ERC20 approval
    erc20.approve(actions_system.contract_address, 10000);
    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 1000, 'Approval failed');

    (world, actions_system, erc20)
}

// Helper function for initializing lands
fn initialize_land(
    actions_system: IActionsDispatcher,
    erc20: IERC20CamelDispatcher,
    owner: ContractAddress,
    location: u64,
    sell_price: u256,
    stake_amount: u256,
) {
    set_contract_address(owner);
    erc20.approve(actions_system.contract_address, sell_price + stake_amount);

    let allowance = erc20.allowance(owner, actions_system.contract_address);
    assert(allowance >= sell_price + stake_amount, 'Initialize land approval failed');

    // Create auction and bid
    actions_system.auction(location, sell_price, sell_price / 2, erc20.contract_address, 2);

    let auction_value = actions_system.get_current_auction_price(location);
    assert(auction_value == sell_price, 'Err in auction value');

    actions_system
        .bid(location, erc20.contract_address, sell_price, stake_amount, LIQUIDITY_POOL());
}

// Helper function for setting up a buyer with tokens
fn setup_buyer_with_tokens(
    erc20: IERC20CamelDispatcher,
    actions_system: IActionsDispatcher,
    from: ContractAddress,
    to: ContractAddress,
    amount: u256
) {
    // Transfer tokens from seller to buyer
    set_contract_address(from);
    erc20.transfer(to, amount);

    // Approve spending for the buyer
    set_contract_address(to);
    erc20.approve(actions_system.contract_address, amount);

    let allowance = erc20.allowance(to, actions_system.contract_address);
    assert(allowance >= amount, 'Buyer approval failed');
}

// Helper function for verifying taxes and stake after a claim
fn verify_taxes_and_stake(actions_system: IActionsDispatcher, neighbor: ContractAddress) {
    let taxes_neighbor = actions_system.get_pending_taxes(neighbor);
    assert(taxes_neighbor.len() > 0, 'must have pending taxes');

    let stake_balance_after_taxes = actions_system.get_stake_balance(neighbor);
    assert(stake_balance_after_taxes < 1000, 'must have less stake');
}

// Helper function for land verification
fn verify_land(
    world: WorldStorage,
    location: u64,
    expected_owner: ContractAddress,
    expected_price: u256,
    expected_pool: ContractAddress,
    expected_stake: u256,
    expected_block_date_bought: u64
) {
    let land: Land = world.read_model(location);
    assert(land.owner == expected_owner, 'incorrect owner');
    assert(land.sell_price == expected_price, 'incorrect price');
    assert(land.pool_key == expected_pool, 'incorrect pool');
    assert(land.stake_amount == expected_stake, 'incorrect stake');
    assert(land.block_date_bought == expected_block_date_bought, 'incorrect date bought');
}

#[test]
fn test_buy_action() {
    let (mut world, actions_system, erc20) = setup_test();
    set_block_timestamp(100);
    // Create initial land
    initialize_land(
        actions_system,
        erc20,
        RECIPIENT(),
        11, // location
        100, // sell_price
        50, // stake_amount
    );

    // Setup new buyer with tokens and approvals
    setup_buyer_with_tokens(erc20, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    // Perform buy action
    actions_system.buy(11, erc20.contract_address, 100, 120, NEW_LIQUIDITY_POOL());

    // Verify results
    verify_land(world, 11, NEW_BUYER(), 100, NEW_LIQUIDITY_POOL(), 120, 100);
}

#[test]
#[should_panic]
fn test_invalid_land() {
    let (_, actions_system, erc20) = create_setup();

    // Attempt to buy land at invalid position (11000)
    actions_system.buy(11000, erc20.contract_address, 10, 12, NEW_LIQUIDITY_POOL());
}

//test for now without auction
#[test]
fn test_bid_and_buy_action() {
    let (world, actions_system, erc20) = setup_test();

    // Set initial timestamp
    set_block_timestamp(100);

    // Create initial land with auction and bid
    initialize_land(
        actions_system,
        erc20,
        RECIPIENT(),
        11, // location
        100, // sell_price
        50, // stake_amount
    );

    // Validate bid/buy updates
    verify_land(world, 11, RECIPIENT(), 100, LIQUIDITY_POOL(), 50, 100);

    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(erc20, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    set_block_timestamp(160);
    actions_system.buy(11, erc20.contract_address, 300, 500, NEW_LIQUIDITY_POOL());

    // Validate buy action updates
    verify_land(world, 11, NEW_BUYER(), 300, NEW_LIQUIDITY_POOL(), 500, 160);
}


#[test]
fn test_claim_and_add_taxes() {
    let (mut world, actions_system, erc20) = setup_test();

    // Deploy ERC20 tokens for neighbors
    let erc20_neighbor_1 = deploy_erc20(NEIGHBOR_1());
    let erc20_neighbor_2 = deploy_erc20(NEIGHBOR_2());
    let erc20_neighbor_3 = deploy_erc20(NEIGHBOR_3());

    // Create initial claimer land
    set_block_timestamp(100);
    initialize_land(actions_system, erc20, RECIPIENT(), 1280, 500, 1000);

    // Setup neighbor lands
    set_block_timestamp(300);
    initialize_land(actions_system, erc20_neighbor_1, NEIGHBOR_1(), 1281, 500, 100);

    // Verify timestamps after bids
    let land_1280: Land = world.read_model(1280);
    let land_1281: Land = world.read_model(1281);
    assert(land_1280.last_pay_time == 300, 'Err in 1280 last_pay_time');
    assert(land_1281.last_pay_time == 300, 'Err in 1281 last_pay_time');

    set_block_timestamp(500);
    initialize_land(actions_system, erc20_neighbor_2, NEIGHBOR_2(), 1216, 500, 1000);

    set_block_timestamp(600);
    initialize_land(actions_system, erc20_neighbor_3, NEIGHBOR_3(), 1344, 500, 1000);

    // Set permissions for ERC20 tokens
    set_contract_address(RECIPIENT());
    erc20_neighbor_1.approve(RECIPIENT(), 100);
    erc20_neighbor_2.approve(RECIPIENT(), 100);
    erc20_neighbor_3.approve(RECIPIENT(), 100);

    // Simulate time difference to generate taxes
    set_block_timestamp(5000);
    actions_system.claim(1280);

    // Get claimer land and verify taxes
    let claimer_land: Land = world.read_model(1280);
    let claimer_land_taxes = actions_system.get_pending_taxes(claimer_land.owner);

    assert(claimer_land_taxes.len() == 0, 'have pending taxes');
    assert(erc20_neighbor_1.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');
    assert(erc20_neighbor_2.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');
    assert(erc20_neighbor_3.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');

    // Verify the neighbors of the claimer land
    verify_taxes_and_stake(actions_system, NEIGHBOR_1());
    verify_taxes_and_stake(actions_system, NEIGHBOR_2());
    verify_taxes_and_stake(actions_system, NEIGHBOR_3());

    let land_1281: Land = world.read_model(1281);
    assert(land_1281.last_pay_time == 5000, 'Err in 1281 last_pay');

    let land_1216: Land = world.read_model(1216);
    assert(land_1216.last_pay_time == 5000, 'Err in 1216 last_pay');

    let land_1344: Land = world.read_model(1344);
    assert(land_1344.last_pay_time == 5000, 'Err in 1344 last_pay');

    set_block_timestamp(6000);
    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(erc20_neighbor_1, actions_system, NEIGHBOR_1(), NEW_BUYER(), 1000);

    actions_system.buy(1281, erc20_neighbor_1.contract_address, 100, 100, NEW_LIQUIDITY_POOL());
    // verify the claim when occurs a buy
    let land_1280: Land = world.read_model(1281);
    assert(land_1280.last_pay_time == 6000, 'Err in 1281 last_pay');
}

#[test]
fn test_nuke_action() {
    // Setup environment
    let (mut world, actions_system, erc20) = setup_test();
    let erc20_neighbor_1 = deploy_erc20(NEIGHBOR_1());
    let erc20_neighbor_2 = deploy_erc20(NEIGHBOR_2());
    let erc20_neighbor_3 = deploy_erc20(NEIGHBOR_3());

    set_block_timestamp(100);
    // // Setup permissions for NEIGHBOR_1 (target land that will be nuked)

    // Create target land (1281) with small stake that will be nuked
    initialize_land(actions_system, erc20_neighbor_1, NEIGHBOR_1(), 1281, 1000, 1000);

    // Create surrounding lands that will generate taxes
    set_block_timestamp(1000);
    initialize_land(actions_system, erc20, RECIPIENT(), 1280, 59900, 2000);

    set_block_timestamp(2000);
    initialize_land(actions_system, erc20_neighbor_2, NEIGHBOR_2(), 1282, 59900, 2000);

    set_block_timestamp(3000);
    initialize_land(actions_system, erc20_neighbor_3, NEIGHBOR_3(), 1217, 5900, 1000);

    // Generate taxes by claiming neighbor lands but not land 1281
    set_block_timestamp(11100); // Large time jump to accumulate taxes

    // Claim taxes for surrounding lands
    set_contract_address(RECIPIENT());
    actions_system.claim(1280);

    // Verify pending taxes exist for land 1281 and 1217
    let pending_taxes_neighbor_1 = actions_system.get_pending_taxes_for_land(1281, NEIGHBOR_1());
    assert(pending_taxes_neighbor_1.len() > 0, 'Should have pending taxes');
    // Store initial balance to compare after nuke
    let initial_balance_neighbor_1 = erc20.balanceOf(NEIGHBOR_1());

    let pending_taxes_neighbor_3 = actions_system.get_pending_taxes_for_land(1217, NEIGHBOR_3());
    assert(pending_taxes_neighbor_3.len() > 0, 'Should have pending taxes');
    // Store initial balance to compare after nuke
    let initial_balance_neighbor_3 = erc20_neighbor_1.balanceOf(NEIGHBOR_3());

    // Generate taxes
    set_block_timestamp(20000);
    set_contract_address(NEIGHBOR_2());
    actions_system.claim(1282);

    set_block_timestamp(200000);
    set_contract_address(NEIGHBOR_2());
    actions_system.claim(1282);

    set_contract_address(RECIPIENT());
    actions_system.claim(1280);

    // Verify the land 1281 was nuked
    verify_land(
        world, 1281, ContractAddressZeroable::zero(), 0, ContractAddressZeroable::zero(), 0, 0
    );

    // Verify that pending taxes were paid to the owner during nuke
    let final_balance = erc20.balanceOf(NEIGHBOR_1());
    assert(final_balance > initial_balance_neighbor_1, 'Should receive pending taxes');
    let pending_taxes_neighbor_1 = actions_system.get_pending_taxes_for_land(1281, NEIGHBOR_1());
    assert(pending_taxes_neighbor_1.len() == 0, 'Should not have pending taxes');

    // Verify the land 1217 was nuked
    verify_land(
        world, 1217, ContractAddressZeroable::zero(), 0, ContractAddressZeroable::zero(), 0, 0
    );

    // Verify that pending taxes were paid to the owner during nuke
    let final_balance = erc20_neighbor_1.balanceOf(NEIGHBOR_3());
    assert(final_balance > initial_balance_neighbor_3, 'Should receive pending taxes');
    let pending_taxes_neighbor_3 = actions_system.get_pending_taxes_for_land(1217, NEIGHBOR_3());
    assert(pending_taxes_neighbor_3.len() == 0, 'Should not have pending taxes');
}


#[test]
fn test_increase_price_and_stake() {
    //setup environment
    let (mut world, actions_system, erc20) = create_setup();

    //create land
    set_block_timestamp(100);

    initialize_land(actions_system, erc20, RECIPIENT(), 1280, 1000, 1000);

    //verify the land
    verify_land(world, 1280, RECIPIENT(), 1000, LIQUIDITY_POOL(), 1000, 100);

    //increase the price
    actions_system.increase_price(1280, 2300);
    let land: Land = world.read_model(1280);
    assert(land.sell_price == 2300, 'has increase to 2300');

    //increase the stake
    erc20.approve(actions_system.contract_address, 2000);
    let stake_balance = actions_system.get_stake_balance(land.owner);
    assert(stake_balance == 1000, 'stake has to be 1000');

    actions_system.increase_stake(1280, 2000);

    let stake_balance = actions_system.get_stake_balance(land.owner);
    assert(stake_balance == 3000, 'stake has to be 3000');
}

