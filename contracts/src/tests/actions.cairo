// Starknet imports
use starknet::contract_address::ContractAddressZeroable;
use starknet::testing::{set_contract_address, set_block_timestamp, set_caller_address};
use starknet::{contract_address_const, ContractAddress, get_block_timestamp};
use core::ec::{EcPointTrait, EcStateTrait};
use core::ec::stark_curve::{GEN_X, GEN_Y};
use core::poseidon::poseidon_hash_span;
use starknet::{testing, get_tx_info};
// Dojo imports

use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait, WorldStorageTrait, WorldStorage};
use dojo::model::{ModelStorage, ModelValueStorage, ModelStorageTest};

//Internal imports

use ponzi_land::tests::setup::{
    setup, setup::{create_setup, deploy_erc20, RECIPIENT, deploy_mock_ekubo_core}
};
use ponzi_land::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};
use ponzi_land::models::land::{Land, Level, PoolKeyConversion, PoolKey};
use ponzi_land::models::auction::{Auction};
use ponzi_land::consts::{TIME_SPEED, MAX_AUCTIONS};
use ponzi_land::helpers::coord::{left, right, up, down, up_left, up_right, down_left, down_right};
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::mocks::ekubo_core::{IEkuboCoreTestingDispatcher, IEkuboCoreTestingDispatcherTrait};

// External dependencies
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};

const BROTHER_ADDRESS: felt252 = 0x07031b4db035ffe8872034a97c60abd4e212528416f97462b1742e1f6cf82afe;
const STARK_ADDRESS: felt252 = 0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0;

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

fn neighbor_pool_key(base_address: ContractAddress, erc20_address: ContractAddress) -> PoolKey {
    let fee: u128 = 170141183460469235273462165868118016;

    let (first, second) = if base_address > erc20_address {
        (erc20_address, base_address)
    } else {
        (base_address, erc20_address)
    };

    let pool_key = PoolKey {
        token0: first,
        token1: second,
        fee: fee,
        tick_spacing: 1000,
        extension: ContractAddressZeroable::zero(),
    };

    pool_key
}

fn deploy_erc20_with_pool(
    ekubo_testing_dispatcher: IEkuboCoreTestingDispatcher,
    main_currency: ContractAddress,
    address: ContractAddress,
) -> IERC20CamelDispatcher {
    let erc20_neighbor = deploy_erc20(address);

    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(
                neighbor_pool_key(main_currency, erc20_neighbor.contract_address)
            ),
            1000000
        );

    erc20_neighbor
}

fn pool_key(erc20_address: ContractAddress) -> PoolKey {
    let fee: u128 = 170141183460469235273462165868118016;
    let pool_key = PoolKey {
        token0: BROTHER_ADDRESS.try_into().unwrap(),
        token1: erc20_address,
        fee: fee,
        tick_spacing: 1000,
        extension: ContractAddressZeroable::zero(),
    };

    pool_key
}

fn deleted_pool_key() -> PoolKey {
    PoolKey {
        token0: ContractAddressZeroable::zero(),
        token1: ContractAddressZeroable::zero(),
        fee: 0,
        tick_spacing: 0,
        extension: ContractAddressZeroable::zero()
    }
}


// Signature struct
#[derive(Drop, Copy)]
struct Signature {
    r: felt252,
    s: felt252,
}

fn authorize_all_addresses(auth_dispatcher: IAuthDispatcher) {
    //PRIVATE KEY => 0x1234567890987654321
    let public_key: felt252 =
        0x020c29f1c98f3320d56f01c13372c923123c35828bce54f2153aa1cfe61c44f2; // From script
    auth_dispatcher.set_verifier(public_key);

    let addresses: Array<(ContractAddress, Signature)> = array![
        (
            RECIPIENT(),
            Signature {
                r: 0x385afe7f043fd89f119e489f7d955f6302a67d8eea31df1234d9e98ba19edf1,
                s: 0x41ac046404bd42a971a04f39cc887868df51b2d1fd36c4b458d6f93d1e81be0
            }
        ),
        (
            FIRST_OWNER(),
            Signature {
                r: 0x15455111f634471af0d2b92cf1bea5952572c7698e7c0bfaef775b085ad9ad4, // Replace from script
                s: 0x1ec03c2cec3fd613c39c01c3b2914aa6c14a32577d5aff3120ae55cd61807c8 // Replace from script
            }
        ),
        (
            NEIGHBOR_1(),
            Signature {
                r: 0x3090f3bab984fd8a5f7e2aeb68445a576c6d27f2cf8271e9a09b2c4ef5cb2, // Replace from script
                s: 0x1e4f1f0eb4ecd88ca956bbdbc975c583b9c67aafcd61d35e327b5e86d0c9ab1 // Replace from script
            }
        ),
        (
            NEIGHBOR_2(),
            Signature {
                r: 0x29319b4850a57bdb26b3c0da2263c37453a331f99edc53fc449f7fbe04788ab,
                s: 0x1df852dbfdbfdb03797f38913f767bd017d0429131e028434231a6ef5f03e4d
            }
        ),
        (
            NEIGHBOR_3(),
            Signature {
                r: 0x6cd54871db709fb53080256364565fdd5f1d059f6237b61ef15e9869d20aabb,
                s: 0x2fbd16550e59cb61476c952cd2873f5ce207535ad268615f42cfecd9962fe47
            }
        ),
        (
            NEW_BUYER(),
            Signature {
                r: 0x6816c59001073c4b45ca2bb90062c77ff228817ee1859ff4362c000ac0e96bb,
                s: 0x77d582bd4740d95bba36bb9a366bcc5494103b210287125b4b6848d41b10fbf
            }
        ),
    ];

    let mut i = 0;
    while i < addresses.len() {
        let (address, _) = *addresses.at(i);
        auth_dispatcher.add_authorized(address);
        assert(auth_dispatcher.can_take_action(address), 'Authorization failed');
        i += 1;
    };
}


// Helper functions for common test setup and actions
fn setup_test() -> (Store, IActionsDispatcher, IERC20CamelDispatcher, IEkuboCoreTestingDispatcher) {
    let (world, actions_system, erc20, _, testing_dispatcher, auth_system) = create_setup();
    set_contract_address(RECIPIENT());

    authorize_all_addresses(auth_system);

    set_contract_address(RECIPIENT());
    // Setup initial ERC20 approval
    erc20.approve(actions_system.contract_address, 10000);
    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 1000, 'Approval failed');

    let store = StoreTrait::new(world);

    (store, actions_system, erc20, testing_dispatcher)
}

pub enum Direction {
    Left,
    Right,
    Up,
    Down,
}

// Helper function for initializing lands
fn initialize_land(
    actions_system: IActionsDispatcher,
    main_currency: IERC20CamelDispatcher,
    owner: ContractAddress,
    location: u64,
    sell_price: u256,
    stake_amount: u256,
    token_for_sale: IERC20CamelDispatcher
) {
    // Create auction and bid
    actions_system.auction(location, sell_price, sell_price / 2, 2, false);

    set_block_timestamp(get_block_timestamp() / TIME_SPEED.into());

    let auction_value = actions_system.get_current_auction_price(location);
    setup_buyer_with_tokens(
        main_currency, actions_system, RECIPIENT(), owner, auction_value + stake_amount
    );

    token_for_sale.approve(actions_system.contract_address, auction_value + stake_amount);

    let allowance = token_for_sale.allowance(owner, actions_system.contract_address);
    assert(allowance >= stake_amount, 'Buyer approval failed');

    actions_system
        .bid(
            location,
            token_for_sale.contract_address,
            sell_price,
            stake_amount,
            neighbor_pool_key(main_currency.contract_address, token_for_sale.contract_address)
        );
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
fn verify_taxes_and_stake(actions_system: IActionsDispatcher, land_location: u64, store: Store) {
    let land = store.land(land_location);
    let taxes = actions_system.get_pending_taxes_for_land(land_location, land.owner);
    assert(taxes.len() > 0, 'must have pending taxes');
    assert(land.stake_amount < 1000, 'must have less stake');
}

// Helper function for land verification
fn verify_land(
    store: Store,
    location: u64,
    expected_owner: ContractAddress,
    expected_price: u256,
    expected_pool: PoolKey,
    expected_stake: u256,
    expected_block_date_bought: u64,
    expected_token_used: ContractAddress
) {
    let land = store.land(location);
    assert(land.owner == expected_owner, 'incorrect owner');
    assert(land.sell_price == expected_price, 'incorrect price');
    assert(land.pool_key == expected_pool, 'incorrect pool');
    assert(land.stake_amount == expected_stake, 'incorrect stake');
    assert(
        land.block_date_bought * TIME_SPEED.into() == expected_block_date_bought,
        'incorrect date bought'
    );
    assert(land.token_used == expected_token_used, 'incorrect token used');
}

fn bid_and_verify_next_auctions(
    actions_system: IActionsDispatcher,
    store: Store,
    main_currency: IERC20CamelDispatcher,
    locations: Array<u64>,
    next_direction: u8, // 0=left, 1=up, 2=right, 3=down
    pool_key: PoolKey
) {
    // Bid on all locations
    let mut i = 0;
    loop {
        if i >= locations.len() {
            break;
        }
        let location = *locations.at(i);
        actions_system.bid(location, main_currency.contract_address, 2, 10, pool_key);
        i += 1;
    };

    // Verify next auctions were created in the specified direction
    i = 0;
    loop {
        if i >= locations.len() {
            break;
        }
        let location = *locations.at(i);
        let next_auction = match next_direction {
            0 => store.auction(left(location).unwrap()),
            1 => store.auction(up(location).unwrap()),
            2 => store.auction(right(location).unwrap()),
            3 => store.auction(down(location).unwrap()),
            _ => panic_with_felt252('Invalid direction')
        };
        assert(next_auction.start_price > 0, 'auction not started');
        assert(next_auction.start_time > 0, 'auction not started');
        i += 1;
    };
}

#[test]
fn test_buy_action() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000
        );

    set_block_timestamp(100);
    // Create initial land
    initialize_land(actions_system, main_currency, RECIPIENT(), 11, 100, 50, main_currency);

    // Setup new buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    // Perform buy action
    actions_system
        .buy(
            11, main_currency.contract_address, 100, 120, pool_key(main_currency.contract_address)
        );

    // Verify results
    verify_land(
        store,
        11,
        NEW_BUYER(),
        100,
        pool_key(main_currency.contract_address),
        120,
        100,
        main_currency.contract_address
    );
}

#[test]
#[should_panic]
fn test_invalid_land() {
    let (_, actions_system, erc20, _) = setup_test();

    // Attempt to buy land at invalid position (11000)
    actions_system.buy(11000, erc20.contract_address, 10, 12, pool_key(erc20.contract_address));
}

//test for now without auction
#[test]
fn test_bid_and_buy_action() {
    let (store, actions_system, main_currency, _ekubo_testing_dispatcher) = setup_test();

    let pool = neighbor_pool_key(main_currency.contract_address, main_currency.contract_address);

    // We do not need to set liquidity pool here as it is between the same currency

    // Set initial timestamp
    set_block_timestamp(100);

    // Create initial land with auction and bid
    initialize_land(actions_system, main_currency, RECIPIENT(), 11, 100, 50, main_currency);

    // Validate bid/buy updates
    verify_land(store, 11, RECIPIENT(), 100, pool, 50, 100, main_currency.contract_address);

    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    set_block_timestamp(160);
    actions_system.buy(11, main_currency.contract_address, 300, 500, pool);

    // Validate buy action updates
    verify_land(
        store,
        11,
        NEW_BUYER(),
        300,
        pool,
        500,
        160 * TIME_SPEED.into(),
        main_currency.contract_address
    );
}

#[test]
fn test_claim_and_add_taxes() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000
        );
    // Deploy ERC20 tokens for neighbors
    let erc20_neighbor_1 = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    let erc20_neighbor_2 = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_2()
    );
    let erc20_neighbor_3 = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_3()
    );

    // Create initial claimer land
    set_block_timestamp(100);
    initialize_land(actions_system, main_currency, RECIPIENT(), 1280, 500, 1000, main_currency);

    // Setup neighbor lands
    set_block_timestamp(300);
    initialize_land(actions_system, main_currency, NEIGHBOR_1(), 1281, 500, 1000, erc20_neighbor_1);

    // Verify timestamps after bids
    let land_1280 = store.land(1280);
    let land_1281 = store.land(1281);
    assert(land_1280.last_pay_time == 300 / TIME_SPEED.into(), 'Err in 1280 last_pay_time');
    assert(land_1281.last_pay_time == 300 / TIME_SPEED.into(), 'Err in 1281 last_pay_time');

    set_block_timestamp(500);
    initialize_land(actions_system, main_currency, NEIGHBOR_2(), 1216, 500, 1000, erc20_neighbor_2);

    set_block_timestamp(600);
    initialize_land(actions_system, main_currency, NEIGHBOR_3(), 1217, 500, 1000, erc20_neighbor_3);

    // Set permissions for ERC20 tokens
    set_contract_address(RECIPIENT());
    erc20_neighbor_1.approve(RECIPIENT(), 100);
    erc20_neighbor_2.approve(RECIPIENT(), 100);
    erc20_neighbor_3.approve(RECIPIENT(), 100);

    // Simulate time difference to generate taxes
    set_block_timestamp(5000);
    actions_system.claim(1280);

    //Get claimer land and verify taxes
    let claimer_land = store.land(1280);
    let claimer_land_taxes = actions_system.get_pending_taxes_for_land(1280, claimer_land.owner);
    assert(claimer_land_taxes.len() == 0, 'have pending taxes');
    assert(erc20_neighbor_1.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');
    assert(erc20_neighbor_2.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');
    assert(erc20_neighbor_3.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');

    // Verify the neighbors of the claimer land
    verify_taxes_and_stake(actions_system, 1281, store);
    verify_taxes_and_stake(actions_system, 1216, store);
    verify_taxes_and_stake(actions_system, 1217, store);

    let land_1281 = store.land(1281);
    assert(land_1281.last_pay_time == 5000, 'Err in 1281 last_pay');

    let land_1216 = store.land(1216);
    assert(land_1216.last_pay_time == 5000, 'Err in 1216 last_pay');

    let land_1217 = store.land(1217);
    assert(land_1217.last_pay_time == 5000, 'Err in 1217 last_pay');

    set_block_timestamp(6000);
    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(erc20_neighbor_1, actions_system, NEIGHBOR_1(), NEW_BUYER(), 1000);

    actions_system
        .buy(
            1281,
            erc20_neighbor_1.contract_address,
            100,
            100,
            neighbor_pool_key(main_currency.contract_address, erc20_neighbor_1.contract_address)
        );
    // verify the claim when occurs a buy
    let land_1280 = store.land(1281);
    assert(land_1280.last_pay_time == 6000, 'Err in 1281 last_pay');
}

#[test]
fn test_nuke_action() {
    // Setup environment
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();
    //set a liquidity pool with amount for each token
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 1000000
        );

    let erc20_neighbor_1 = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    let erc20_neighbor_2 = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_2()
    );

    let erc20_neighbor_3 = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_3()
    );

    set_block_timestamp(100);
    /// Setup permissions for NEIGHBOR_1 (target land that will be nuked)

    // Create target land (1281) with small stake that will be nuked
    initialize_land(
        actions_system, main_currency, NEIGHBOR_1(), 1281, 1000, 1000, erc20_neighbor_1
    );

    // Create surrounding lands that will generate taxes
    set_block_timestamp(1000);
    initialize_land(actions_system, main_currency, RECIPIENT(), 1280, 59900, 2000, main_currency);

    set_block_timestamp(2000);
    initialize_land(
        actions_system, main_currency, NEIGHBOR_2(), 1282, 59900, 2000, erc20_neighbor_2
    );

    set_block_timestamp(3000);
    initialize_land(
        actions_system, main_currency, NEIGHBOR_3(), 1217, 5900, 2000, erc20_neighbor_3
    );

    // Generate taxes by claiming neighbor lands but not land 1281
    set_block_timestamp(11100); // Large time jump to accumulate taxes

    // Claim taxes for surrounding lands
    set_contract_address(RECIPIENT());
    actions_system.claim(1280);

    // Verify pending taxes exist for land 1281 and 1217
    let pending_taxes_neighbor_1 = actions_system.get_pending_taxes_for_land(1281, NEIGHBOR_1());
    assert(pending_taxes_neighbor_1.len() > 0, 'Should have pending taxes');
    // Store initial balance to compare after nuke
    let initial_balance_neighbor_1 = main_currency.balanceOf(NEIGHBOR_1());

    let pending_taxes_neighbor_3 = actions_system.get_pending_taxes_for_land(1217, NEIGHBOR_3());
    assert(pending_taxes_neighbor_3.len() > 0, 'Should have pending taxes');
    // Store initial balance to compare after nuke
    let initial_balance_neighbor_3 = erc20_neighbor_1.balanceOf(NEIGHBOR_3());

    // Generate taxes
    set_block_timestamp(20000 * TIME_SPEED.into());
    set_contract_address(NEIGHBOR_2());
    actions_system.claim(1282);

    set_block_timestamp(200000 * TIME_SPEED.into());
    set_contract_address(NEIGHBOR_2());
    actions_system.claim(1282);

    set_contract_address(RECIPIENT());
    actions_system.claim(1280);

    // Verify the land 1281 was nuked
    //testing get_average_for_sell_price()
    verify_land(
        store,
        1281,
        ContractAddressZeroable::zero(),
        599000,
        deleted_pool_key(),
        0,
        0,
        main_currency.contract_address
    );

    // Verify that pending taxes were paid to the owner during nuke
    let final_balance = main_currency.balanceOf(NEIGHBOR_1());
    assert(final_balance > initial_balance_neighbor_1, 'Should receive pending taxes');
    let pending_taxes_neighbor_1 = actions_system.get_pending_taxes_for_land(1281, NEIGHBOR_1());
    assert(pending_taxes_neighbor_1.len() == 0, 'Should not have pending taxes');

    // Verify the land 1217 was nuked,
    //testing get_average_for_sell_price()
    verify_land(
        store,
        1217,
        ContractAddressZeroable::zero(),
        402660,
        deleted_pool_key(),
        0,
        0,
        main_currency.contract_address
    );

    // Verify that pending taxes were paid to the owner during nuke
    let final_balance = erc20_neighbor_1.balanceOf(NEIGHBOR_3());
    assert(final_balance > initial_balance_neighbor_3, 'Should receive pending taxes');
    let pending_taxes_neighbor_3 = actions_system.get_pending_taxes_for_land(1217, NEIGHBOR_3());
    assert(pending_taxes_neighbor_3.len() == 0, 'Should not have pending taxes');
}


#[test]
fn test_increase_price_and_stake() {
    let (store, actions_system, main_currency, _) = setup_test();

    let pool = neighbor_pool_key(main_currency.contract_address, main_currency.contract_address);

    // We are setting up a pool with itself, so no need to setup liquidity

    //create land
    set_block_timestamp(100);
    initialize_land(actions_system, main_currency, RECIPIENT(), 1280, 1000, 1000, main_currency);

    //verify the land
    verify_land(store, 1280, RECIPIENT(), 1000, pool, 1000, 100, main_currency.contract_address);

    //increase the price
    actions_system.increase_price(1280, 2300);
    let land = store.land(1280);
    assert(land.sell_price == 2300, 'has increase to 2300');

    //increase the stake
    main_currency.approve(actions_system.contract_address, 2000);
    let land = store.land(1280);
    assert(land.stake_amount == 1000, 'stake has to be 1000');

    actions_system.increase_stake(1280, 2000);

    let land = store.land(1280);
    assert(land.stake_amount == 3000, 'stake has to be 3000');
}

#[test]
fn test_detailed_tax_calculation() {
    set_block_timestamp(1000);
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 1000000
        );

    let erc20_neighbor = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    // timestamp: 1000
    initialize_land(
        actions_system,
        main_currency,
        RECIPIENT(),
        1280, // Central position
        10000, // sell_price
        5000, // stake_amount
        main_currency
    );

    // Initialize one neighbor to generate taxes
    // timestamp: 2000 / 4 , sell_price: 20000
    set_block_timestamp(2000);
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        1281, // Right neighbor
        20000, // sell_price
        10000, // stake_amount - enough to cover taxes
        erc20_neighbor
    );

    // Calculate expected taxes after 3600 seconds (1 BASE_TIME)
    // Move to timestamp 5600 (500 + 3600)
    set_block_timestamp(5600);

    // For land 1281:
    // elapsed_time = (5600 - 500) * TIME_SPEED = 5100 * 4 = 20400
    // total_taxes = (20000 * 2 * 20400) / (100 * 3600) = 2226
    // tax_per_neighbor = 1600 / 8 = 283 (8 possible neighbors)

    // Trigger tax calculation by claiming
    set_contract_address(RECIPIENT());
    actions_system.claim(1280);

    // Verify the tax calculations
    let land_1281 = store.land(1281);
    assert(land_1281.last_pay_time == 5600, 'Wrong last pay time');

    // Verify stake amount was reduced by correct tax amount
    assert(land_1281.stake_amount == 9717, // 10000 - 283
     'Wrong stake amount after tax');

    // Verify taxes for central land (1280)
    let pending_taxes = actions_system.get_pending_taxes_for_land(1280, RECIPIENT());
    assert(pending_taxes.len() == 0, 'Wrong number of tax entries');

    assert(erc20_neighbor.balanceOf(RECIPIENT()) == 283, 'Wrong tax amount calculated');
}

#[test]
fn test_level_up() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();

    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 100000
        );

    let erc20_neighbor = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    set_block_timestamp(100);

    initialize_land(actions_system, main_currency, RECIPIENT(), 1280, 10000, 5000, main_currency);

    set_block_timestamp(200);
    initialize_land(
        actions_system, main_currency, NEIGHBOR_1(), 1281, 20000, 10000, erc20_neighbor
    );

    set_block_timestamp(60000);

    set_contract_address(RECIPIENT());
    actions_system.level_up(1280);

    let land_1280 = store.land(1280);
    let land_1281 = store.land(1281);

    assert_eq!(land_1280.level, Level::First, "Land 1280 should be Level::First");
    assert_eq!(land_1281.level, Level::Zero, "Land 1281 should be Level::None");
}

#[test]
fn check_success_liquidity_pool() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();

    set_block_timestamp(100);
    //simulate liquidity pool from ekubo with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 100000
        );

    // Create initial land
    initialize_land(actions_system, main_currency, RECIPIENT(), 11, 100, 50, main_currency);

    // Setup new buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    // Perform buy action
    actions_system
        .buy(
            11, main_currency.contract_address, 100, 120, pool_key(main_currency.contract_address)
        );

    // Verify results
    verify_land(
        store,
        11,
        NEW_BUYER(),
        100,
        pool_key(main_currency.contract_address),
        120,
        100,
        main_currency.contract_address
    );
}

#[test]
#[should_panic]
fn check_invalid_liquidity_pool() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();

    set_block_timestamp(100);
    //simulate liquidity pool from ekubo with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 100
        );

    // Create initial land
    initialize_land(actions_system, main_currency, RECIPIENT(), 11, 100, 50, main_currency);

    // Setup new buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    // Perform buy action
    actions_system
        .buy(
            11, main_currency.contract_address, 100, 120, pool_key(main_currency.contract_address)
        );

    // Verify results
    verify_land(
        store,
        11,
        NEW_BUYER(),
        100,
        pool_key(main_currency.contract_address),
        120,
        100,
        main_currency.contract_address
    );
}

#[test]
fn test_organic_auction() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();

    set_block_timestamp(10);
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000
        );

    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 90000);

    // Initial head locations
    let heads: Array<u64> = array![1080, 1050, 1002, 1007];

    let pool = pool_key(main_currency.contract_address);

    // Step 1: Bid on heads and verify LEFT auctions
    bid_and_verify_next_auctions(actions_system, store, main_currency, heads.clone(), 0, pool);

    // Get LEFT locations
    let mut left_locations: Array<u64> = ArrayTrait::new();
    let mut i = 0;
    loop {
        if i >= heads.len() {
            break;
        }
        let left_loc = left(*heads.at(i)).unwrap();
        left_locations.append(left_loc);
        i += 1;
    };

    // Step 2: Bid on LEFT locations and verify UP auctions
    bid_and_verify_next_auctions(
        actions_system, store, main_currency, left_locations.clone(), 1, pool
    );

    // Get UP locations
    let mut up_locations: Array<u64> = ArrayTrait::new();
    i = 0;
    loop {
        if i >= left_locations.len() {
            break;
        }
        let up_loc = up(*left_locations.at(i)).unwrap();
        up_locations.append(up_loc);
        i += 1;
    };

    bid_and_verify_next_auctions(
        actions_system, store, main_currency, up_locations.clone(), 2, pool
    );

    // Get RIGHT locations
    let mut right_locations: Array<u64> = ArrayTrait::new();
    i = 0;
    loop {
        if i >= up_locations.len() {
            break;
        }
        let right_loc = right(*up_locations.at(i)).unwrap();

        right_locations.append(right_loc);
        i += 1;
    };

    // Get second RIGHT locations
    let mut right2_locations: Array<u64> = ArrayTrait::new();
    i = 0;
    loop {
        if i >= right_locations.len() {
            break;
        }
        let right2_loc = right(*right_locations.at(i)).unwrap();

        right2_locations.append(right2_loc);
        i += 1;
    };

    // Step 4: Bid on second RIGHT locations and verify DOWN auctions
    bid_and_verify_next_auctions(
        actions_system, store, main_currency, right2_locations.clone(), 3, pool
    );

    let final_active_auctions = actions_system.get_active_auctions();
    assert(final_active_auctions <= MAX_AUCTIONS, 'Too many active auctions');
}
