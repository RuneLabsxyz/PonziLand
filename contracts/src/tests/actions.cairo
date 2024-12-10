// Starknet imports

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

#[test]
fn test_buy_action() {
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

    actions_system.buy(NEW_LIQUIDITY_POOL(), erc20.contract_address, 10, 11, 12);
    let stake_balance = actions_system.get_stake_balance(RECIPIENT());

    let mut land: Land = world.read_model(11);
    assert(land.owner == RECIPIENT(), 'has to be a new owner');
    assert(land.pool_key == NEW_LIQUIDITY_POOL(), 'has to be a new lp');
    assert(land.sell_price == 10, 'has to be a new price');
    assert(stake_balance == 12, 'error with stake_balance')
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

    actions_system.buy(NEW_LIQUIDITY_POOL(), erc20.contract_address, 10, 11000, 12);
}

#[test]
fn test_taxes() {
    let (mut world, actions_system, erc20) = create_setup();

    let erc20_neighbor_1 = deploy_erc20(NEIGHBOR_1());
    let erc20_neighbor_2 = deploy_erc20(NEIGHBOR_2());
    let erc20_neighbor_3 = deploy_erc20(NEIGHBOR_3());

    //permisions for the contract
    set_contract_address(RECIPIENT());
    erc20.approve(actions_system.contract_address, 10000);

    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 10000, 'Approval failed');

    //create lands

    //land 1

    actions_system.create_land(1280, 1251, erc20.contract_address, LIQUIDITY_POOL(), 1950);
    let land_1: Land = world.read_model(1280);
    assert(land_1.owner == RECIPIENT(), 'error with the land owner');
    //neighboors

    set_contract_address(NEIGHBOR_1());
    erc20_neighbor_1.approve(actions_system.contract_address, 10000);
    let neighbor_1_land_1 = actions_system
        .create_land(1281, 1251, erc20_neighbor_1.contract_address, LIQUIDITY_POOL(), 10);

    set_contract_address(NEIGHBOR_2());
    erc20_neighbor_2.approve(actions_system.contract_address, 100000);
    let neighbor_2_land_1 = actions_system
        .create_land(1216, 120, erc20_neighbor_2.contract_address, LIQUIDITY_POOL(), 10);

    set_contract_address(NEIGHBOR_3());
    erc20_neighbor_3.approve(actions_system.contract_address, 10000);
    let neighbor_3_land_1 = actions_system
        .create_land(1344, 120, erc20_neighbor_3.contract_address, LIQUIDITY_POOL(), 10);
    //generate taxes for land 1 to neighboors
    actions_system.generate_taxes(1280);

    let stake_balance_after_taxes_1 = actions_system.get_stake_balance(RECIPIENT());

    assert(stake_balance_after_taxes_1 == 1925, 'error with discount of stake');

    let taxes_neighbor_1 = actions_system.get_pending_taxes(neighbor_1_land_1.owner);
    let taxes_neighbor_2 = actions_system.get_pending_taxes(neighbor_2_land_1.owner);
    let taxes_neighbor_3 = actions_system.get_pending_taxes(neighbor_3_land_1.owner);

    assert(*taxes_neighbor_1[0].token_address == erc20.contract_address, 'missmatch erc20 address');
    assert(*taxes_neighbor_2[0].token_address == erc20.contract_address, 'missmatch erc20 address');
    assert(*taxes_neighbor_3[0].token_address == erc20.contract_address, 'missmatch erc20 address');

    assert(*taxes_neighbor_1[0].amount == 5, 'different tax amount');
    assert(*taxes_neighbor_2[0].amount == 5, 'different tax amount');
    assert(*taxes_neighbor_3[0].amount == 5, 'different tax amount');

    actions_system.generate_taxes(1280);
    let stake_balance_after_taxes_2 = actions_system.get_stake_balance(RECIPIENT());
    assert(stake_balance_after_taxes_2 == 1900, 'error with discount of stake');

    // assert()
    // //second round of taxes
    let taxes_neighbor_1 = actions_system.get_pending_taxes(neighbor_1_land_1.owner);
    let taxes_neighbor_2 = actions_system.get_pending_taxes(neighbor_2_land_1.owner);
    let taxes_neighbor_3 = actions_system.get_pending_taxes(neighbor_3_land_1.owner);

    assert(
        taxes_neighbor_1.len() == 1 && *taxes_neighbor_1[0].amount == 10, 'different tax amount'
    );
    assert(
        taxes_neighbor_1.len() == 1 && *taxes_neighbor_2[0].amount == 10, 'different tax amount'
    );
    assert(
        taxes_neighbor_1.len() == 1 && *taxes_neighbor_3[0].amount == 10, 'different tax amount'
    );
}
// #[test]
// fn create_land_test() {
//     let (mut world, actions_system, erc20) = create_setup();
//     set_contract_address(RECIPIENT());

//     //permisions for the contract
//     erc20.approve(actions_system.contract_address, 10000);
//     let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
//     assert(allowance >= 10000, 'Approval failed');

//     actions_system.create_land(4, 50, erc20.contract_address, LIQUIDITY_POOL(), 100);

//     let mut land: Land = world.read_model(4);
//     let stake_balance = actions_system.get_stake_balance(land.owner);

//     assert(land.owner == RECIPIENT(), 'different owner');
//     assert(land.sell_price == 50, 'different sell price');
//     assert(stake_balance == 100, 'error with stake');
// }

