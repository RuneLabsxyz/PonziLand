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
use ponzi_land::models::land::{Land, LandTrait, Level, PoolKeyConversion, PoolKey};
use ponzi_land::models::auction::{Auction};
use ponzi_land::consts::{TIME_SPEED, MAX_AUCTIONS, TWO_DAYS_IN_SECONDS};
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
) -> (IERC20CamelDispatcher, IERC20CamelDispatcher, IERC20CamelDispatcher) {
    let erc20_neighbor_1 = deploy_erc20(NEIGHBOR_1());
    let erc20_neighbor_2 = deploy_erc20(NEIGHBOR_2());
    let erc20_neighbor_3 = deploy_erc20(NEIGHBOR_3());

    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(
                neighbor_pool_key(main_currency, erc20_neighbor_1.contract_address)
            ),
            1000000
        );

    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(
                neighbor_pool_key(main_currency, erc20_neighbor_2.contract_address)
            ),
            1000000
        );

    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(
                neighbor_pool_key(main_currency, erc20_neighbor_3.contract_address)
            ),
            1000000
        );

    (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3)
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

fn validate_staking_state(
    store: Store,
    contract_address: ContractAddress,
    land_locations: Span<u64>,
    tokens: Span<IERC20CamelDispatcher>,
    should_have_balance: bool
) {
    let mut i = 0;
    while i < land_locations.len() {
        let location = *land_locations.at(i);
        let land = store.land(location);
        let token = *tokens.at(i);
        let balance = token.balanceOf(contract_address);

        if should_have_balance {
            assert(land.stake_amount > 0, 'Stake > 0 expected');
            assert(balance > 0, 'Balnce > 0 expected');
        } else {
            assert(land.stake_amount == 0, 'Stake == 0 expected');
            assert(balance == 0, 'Balance == 0 expected');
        }

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
    // Instead of creating an auction directly, we'll use one of the initial lands
    // or wait for spiral auctions to reach the desired location

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

// Helper function to create a land with its neighbors
fn create_land_with_neighbors(
    mut store: Store,
    actions_system: IActionsDispatcher,
    location: u64,
    owner: ContractAddress,
    token_used: IERC20CamelDispatcher,
    sell_price: u256,
    last_pay_time: u64,
    block_date_bought: u64,
    stake_amount: u256,
    token_used_neighbor_1: IERC20CamelDispatcher,
    token_used_neighbor_2: IERC20CamelDispatcher,
    token_used_neighbor_3: IERC20CamelDispatcher,
) -> Array<u64> {
    // Create the main land
    let land = LandTrait::new(
        location,
        owner,
        token_used.contract_address,
        sell_price,
        pool_key(token_used.contract_address),
        last_pay_time,
        block_date_bought,
        stake_amount
    );
    setup_buyer_with_tokens(
        token_used, actions_system, owner, actions_system.contract_address, stake_amount
    );

    store.world.write_model_test(@land);

    // Create neighbors
    let mut neighbors = array![];
    if let Option::Some(left_loc) = left(location) {
        neighbors.append(left_loc);
        let left_land = LandTrait::new(
            left_loc,
            NEIGHBOR_1(),
            token_used_neighbor_1.contract_address,
            sell_price,
            neighbor_pool_key(token_used.contract_address, token_used_neighbor_1.contract_address),
            last_pay_time,
            block_date_bought,
            stake_amount
        );
        setup_buyer_with_tokens(
            token_used_neighbor_1,
            actions_system,
            NEIGHBOR_1(),
            actions_system.contract_address,
            stake_amount
        );
        store.world.write_model_test(@left_land);
    }
    if let Option::Some(right_loc) = right(location) {
        neighbors.append(right_loc);
        let right_land = LandTrait::new(
            right_loc,
            NEIGHBOR_2(),
            token_used_neighbor_2.contract_address,
            sell_price,
            neighbor_pool_key(token_used.contract_address, token_used_neighbor_2.contract_address),
            last_pay_time,
            block_date_bought,
            stake_amount
        );
        setup_buyer_with_tokens(
            token_used_neighbor_2,
            actions_system,
            NEIGHBOR_2(),
            actions_system.contract_address,
            stake_amount
        );
        store.world.write_model_test(@right_land);
    }
    if let Option::Some(up_loc) = up(location) {
        neighbors.append(up_loc);
        let up_land = LandTrait::new(
            up_loc,
            NEIGHBOR_3(),
            token_used_neighbor_3.contract_address,
            sell_price,
            neighbor_pool_key(token_used.contract_address, token_used_neighbor_3.contract_address),
            last_pay_time,
            block_date_bought,
            stake_amount
        );
        setup_buyer_with_tokens(
            token_used_neighbor_3,
            actions_system,
            NEIGHBOR_3(),
            actions_system.contract_address,
            stake_amount
        );
        store.world.write_model_test(@up_land);
    }
    if let Option::Some(down_loc) = down(location) {
        neighbors.append(down_loc);
        let down_land = LandTrait::new(
            down_loc,
            NEIGHBOR_1(),
            token_used_neighbor_1.contract_address,
            sell_price,
            neighbor_pool_key(token_used.contract_address, token_used_neighbor_1.contract_address),
            last_pay_time,
            block_date_bought,
            stake_amount
        );
        setup_buyer_with_tokens(
            token_used_neighbor_1,
            actions_system,
            NEIGHBOR_1(),
            actions_system.contract_address,
            stake_amount
        );
        store.world.write_model_test(@down_land);
    }

    neighbors
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
    initialize_land(actions_system, main_currency, RECIPIENT(), 1080, 100, 50, main_currency);

    // Setup new buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    // Perform buy action
    actions_system
        .buy(
            1080, main_currency.contract_address, 100, 120, pool_key(main_currency.contract_address)
        );

    // Verify results
    verify_land(
        store,
        1080,
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
    initialize_land(actions_system, main_currency, RECIPIENT(), 1080, 100, 50, main_currency);

    // Validate bid/buy updates
    verify_land(store, 1080, RECIPIENT(), 100, pool, 50, 100, main_currency.contract_address);

    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    set_block_timestamp(160);
    actions_system.buy(1080, main_currency.contract_address, 300, 500, pool);

    // Validate buy action updates
    verify_land(
        store,
        1080,
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
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    set_block_timestamp(100 / TIME_SPEED.into());

    // Setup claimer and neighbor lands
    let neighbors_location = create_land_with_neighbors(
        store,
        actions_system,
        1080,
        RECIPIENT(),
        main_currency,
        1000,
        get_block_timestamp(),
        get_block_timestamp(),
        1000,
        erc20_neighbor_1,
        erc20_neighbor_2,
        erc20_neighbor_3
    );

    set_contract_address(RECIPIENT());

    // Simulate time difference to generate taxes
    set_block_timestamp(5000 / TIME_SPEED.into());
    actions_system.claim(1080);

    // Get claimer land and verify taxes
    let claimer_land = store.land(1080);
    let claimer_land_taxes = actions_system.get_pending_taxes_for_land(1080, claimer_land.owner);
    assert(claimer_land_taxes.len() == 0, 'have pending taxes');
    assert(erc20_neighbor_1.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');
    assert(erc20_neighbor_3.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');

    // Verify the neighbors of the claimer land
    verify_taxes_and_stake(actions_system, *neighbors_location[0], store);
    verify_taxes_and_stake(actions_system, *neighbors_location[1], store);
    verify_taxes_and_stake(actions_system, *neighbors_location[2], store);
    verify_taxes_and_stake(actions_system, *neighbors_location[3], store);

    let land_neighbor_1 = store.land(*neighbors_location[0]);
    assert(land_neighbor_1.last_pay_time == 5000 / TIME_SPEED.into(), 'Err in 1015 last_pay');

    let land_neighbor_2 = store.land(*neighbors_location[1]);
    assert(land_neighbor_2.last_pay_time == 5000 / TIME_SPEED.into(), 'Err in 1079 last_pay');

    set_block_timestamp(6000 / TIME_SPEED.into());
    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(erc20_neighbor_1, actions_system, NEIGHBOR_1(), NEW_BUYER(), 2500);
    actions_system
        .buy(
            *neighbors_location[0],
            erc20_neighbor_1.contract_address,
            100,
            100,
            neighbor_pool_key(main_currency.contract_address, erc20_neighbor_1.contract_address)
        );
    // verify the claim when occurs a buy
    let claimer_land = store.land(1080);
    assert(claimer_land.last_pay_time == 6000 / TIME_SPEED.into(), 'Err in 1080 last_pay');
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

    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    set_block_timestamp(100 / TIME_SPEED.into());

    let neighbors_location = create_land_with_neighbors(
        store,
        actions_system,
        1080,
        RECIPIENT(),
        main_currency,
        5000,
        get_block_timestamp(),
        get_block_timestamp(),
        100,
        erc20_neighbor_1,
        erc20_neighbor_2,
        erc20_neighbor_3
    );

    // Generate taxes by claiming neighbor lands but not land 1281
    set_block_timestamp(1100 / TIME_SPEED.into()); // Large time jump to accumulate taxes

    // Claim taxes for surrounding lands
    set_contract_address(RECIPIENT());
    actions_system.claim(1080);

    // Verify pending taxes exist for neighbors
    let pending_taxes_neighbor_1 = actions_system
        .get_pending_taxes_for_land(*neighbors_location[0], NEIGHBOR_1());
    assert(pending_taxes_neighbor_1.len() > 0, 'must have pending taxes');
    // Store initial balance to compare after nuke
    let initial_balance_neighbor_1 = erc20_neighbor_2.balanceOf(NEIGHBOR_1());

    let pending_taxes_neighbor_2 = actions_system
        .get_pending_taxes_for_land(*neighbors_location[1], NEIGHBOR_2());
    assert(pending_taxes_neighbor_2.len() > 0, 'must have pending taxes');
    // Store initial balance to compare after nuke
    let initial_balance_neighbor_2 = erc20_neighbor_1.balanceOf(NEIGHBOR_2());

    // Claim more taxes to nuke lands
    set_block_timestamp(200000 / TIME_SPEED.into());
    actions_system.claim(1080);

    // Verify the land 1079 was nuked
    //testing get_average_for_sell_price()
    verify_land(
        store,
        *neighbors_location[0],
        ContractAddressZeroable::zero(),
        50000000000000000000,
        deleted_pool_key(),
        0,
        0,
        main_currency.contract_address
    );

    // Verify that pending taxes were paid to the owner during nuke
    let pending_taxes_recipient = actions_system.get_pending_taxes_for_land(1080, RECIPIENT());
    assert(pending_taxes_recipient.len() == 0, 'Should not have pending taxes');

    // Verify the land 1015 was nuked,
    //testing get_average_for_sell_price()
    verify_land(
        store,
        *neighbors_location[1],
        ContractAddressZeroable::zero(),
        50000000000000000000,
        deleted_pool_key(),
        0,
        0,
        main_currency.contract_address
    );

    // Verify that pending taxes were paid to the owner during nuke
    let final_balance_neighbor_1 = erc20_neighbor_2.balanceOf(NEIGHBOR_1());
    assert(final_balance_neighbor_1 > initial_balance_neighbor_1, 'Should receive pending taxes');
    let final_balance_neighbor_2 = erc20_neighbor_1.balanceOf(NEIGHBOR_2());
    assert(final_balance_neighbor_2 > initial_balance_neighbor_2, 'Should receive pending taxes');
}


#[test]
fn test_increase_price_and_stake() {
    let (store, actions_system, main_currency, _) = setup_test();

    let pool = neighbor_pool_key(main_currency.contract_address, main_currency.contract_address);

    // We are setting up a pool with itself, so no need to setup liquidity

    //create land
    set_block_timestamp(100);
    initialize_land(actions_system, main_currency, RECIPIENT(), 1080, 1000, 1000, main_currency);

    //verify the land
    verify_land(store, 1080, RECIPIENT(), 1000, pool, 1000, 100, main_currency.contract_address);

    //increase the price
    actions_system.increase_price(1080, 2300);
    let land = store.land(1080);
    assert(land.sell_price == 2300, 'has increase to 2300');

    //increase the stake
    main_currency.approve(actions_system.contract_address, 2000);
    let land = store.land(1080);
    assert(land.stake_amount == 1000, 'stake has to be 1000');

    actions_system.increase_stake(1080, 2000);

    let land = store.land(1080);
    assert(land.stake_amount == 3000, 'stake has to be 3000');
}

#[test]
#[ignore]
fn test_detailed_tax_calculation() {
    set_block_timestamp(1000);
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 1000000
        );

    let (erc20_neighbor, _, _) = deploy_erc20_with_pool(
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

    let (erc20_neighbor, _, _) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    set_block_timestamp(100);

    initialize_land(actions_system, main_currency, RECIPIENT(), 1080, 10000, 5000, main_currency);

    set_block_timestamp(200);
    initialize_land(
        actions_system, main_currency, NEIGHBOR_1(), 1050, 20000, 10000, erc20_neighbor
    );
    set_block_timestamp((TWO_DAYS_IN_SECONDS / TIME_SPEED.into()) + 100);

    set_contract_address(RECIPIENT());
    actions_system.level_up(1080);

    let land_1080 = store.land(1080);
    let land_1050 = store.land(1050);
    assert_eq!(land_1080.level, Level::First, "Land 1080 should be Level::First");
    assert_eq!(land_1050.level, Level::Zero, "Land 1050 should be Level::None");
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
    initialize_land(actions_system, main_currency, RECIPIENT(), 1080, 100, 50, main_currency);

    // Setup new buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    // Perform buy action
    actions_system
        .buy(
            1080, main_currency.contract_address, 100, 120, pool_key(main_currency.contract_address)
        );

    // Verify results
    verify_land(
        store,
        1080,
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
    initialize_land(actions_system, main_currency, RECIPIENT(), 1080, 100, 50, main_currency);

    // Setup new buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    // Perform buy action
    actions_system
        .buy(
            1080, main_currency.contract_address, 100, 120, pool_key(main_currency.contract_address)
        );

    // Verify results
    verify_land(
        store,
        1080,
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

    setup_buyer_with_tokens(
        main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 900_000_000_000_000_000_000_000
    );

    // Initial head locations
    let heads: Array<u64> = array![1080, 1050, 1002, 1007];

    let pool = pool_key(main_currency.contract_address);
    set_block_timestamp(10000);
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
    set_block_timestamp(100000);

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
    set_block_timestamp(100000);

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

#[test]
#[available_gas(900000000000)]
#[ignore]
fn test_reimburse_stakes() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();

    set_block_timestamp(10);
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000
        );

    // Deploy ERC20 tokens for neighbors
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    // Create initial claimer land
    set_block_timestamp(100);
    initialize_land(actions_system, main_currency, RECIPIENT(), 1080, 500, 1000, main_currency);

    // Setup neighbor lands
    set_block_timestamp(300);
    initialize_land(actions_system, main_currency, NEIGHBOR_1(), 1050, 500, 1000, erc20_neighbor_1);

    set_block_timestamp(500);
    initialize_land(actions_system, main_currency, NEIGHBOR_2(), 1002, 500, 1000, erc20_neighbor_2);

    set_block_timestamp(600);
    initialize_land(actions_system, main_currency, NEIGHBOR_3(), 1007, 500, 1000, erc20_neighbor_3);

    set_block_timestamp(5000);
    set_contract_address(RECIPIENT());

    actions_system.claim(1080);

    initialize_land(actions_system, main_currency, RECIPIENT(), 1079, 500, 130, main_currency);

    initialize_land(actions_system, main_currency, RECIPIENT(), 1251, 500, 157, main_currency);

    let land_locations = array![1080, 1050, 1002, 1007, 1250, 1079];
    let tokens = array![
        main_currency, // erc20_neighbor_1,
        erc20_neighbor_2,
        erc20_neighbor_3,
        main_currency,
        main_currency
    ];

    validate_staking_state(
        store, actions_system.contract_address, land_locations.span(), tokens.span(), true
    );

    actions_system.reimburse_stakes();

    validate_staking_state(
        store, actions_system.contract_address, land_locations.span(), tokens.span(), false
    );
}

#[test]
fn test_claim_all() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher) = setup_test();

    set_block_timestamp(10);
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000
        );

    let pool = neighbor_pool_key(main_currency.contract_address, main_currency.contract_address);
    // Deploy ERC20 tokens for neighbors
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1()
    );

    set_block_timestamp(100 / TIME_SPEED.into());

    let neighbors_location = create_land_with_neighbors(
        store,
        actions_system,
        1080,
        RECIPIENT(),
        main_currency,
        1000,
        get_block_timestamp(),
        get_block_timestamp(),
        400,
        erc20_neighbor_1,
        erc20_neighbor_2,
        erc20_neighbor_3
    );

    setup_buyer_with_tokens(erc20_neighbor_2, actions_system, NEIGHBOR_2(), RECIPIENT(), 1100);
    actions_system.buy(*neighbors_location[1], main_currency.contract_address, 300, 900, pool);
    setup_buyer_with_tokens(erc20_neighbor_3, actions_system, NEIGHBOR_3(), RECIPIENT(), 1100);
    actions_system.buy(*neighbors_location[2], main_currency.contract_address, 300, 900, pool);
    set_block_timestamp(5000 / TIME_SPEED.into());

    let land_locations = array![*neighbors_location[1], *neighbors_location[2]];
    actions_system.claim_all(land_locations);

    //Get claimer lands and verify taxes
    let first_claimer_land = store.land(*neighbors_location[1]);
    let second_claimer_land = store.land(*neighbors_location[2]);
    let first_land_taxes = actions_system
        .get_pending_taxes_for_land(*neighbors_location[1], first_claimer_land.owner);
    let second_land_taxes = actions_system
        .get_pending_taxes_for_land(*neighbors_location[2], second_claimer_land.owner);

    assert(first_land_taxes.len() == 0, 'first have pending taxes');
    assert(second_land_taxes.len() == 0, 'second have pending taxes');
    assert(erc20_neighbor_2.balanceOf(first_claimer_land.owner) > 0, 'first fail in claim taxes');
    assert(erc20_neighbor_3.balanceOf(first_claimer_land.owner) > 0, 'second fail in claim taxes');
}
