// Core Cairo imports
use core::ec::{EcPointTrait, EcStateTrait};
use core::ec::stark_curve::{GEN_X, GEN_Y};
use core::poseidon::poseidon_hash_span;

// Starknet imports
use starknet::{contract_address_const, ContractAddress, get_block_timestamp};
use starknet::contract_address::ContractAddressZeroable;
use starknet::testing::{
    set_contract_address, set_block_timestamp, set_caller_address, set_block_number,
};
use starknet::{testing, get_tx_info};
use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry};

// Dojo imports
use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait, WorldStorageTrait, WorldStorage};
use dojo::model::{ModelStorage, ModelValueStorage, ModelStorageTest};
use dojo::world::world::Event;
use dojo::utils::hash::{selector_from_namespace_and_name, selector_from_names};

// External dependencies
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};

// Internal systems
use ponzi_land::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
use ponzi_land::systems::actions::actions::{InternalImpl};
use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};
use ponzi_land::systems::token_registry::{ITokenRegistryDispatcher, ITokenRegistryDispatcherTrait};
use ponzi_land::systems::config::{IConfigSystemDispatcher, IConfigSystemDispatcherTrait};

// Models
use ponzi_land::models::land::{Land, LandStake, LandTrait, Level, PoolKeyConversion, PoolKey};
use ponzi_land::models::auction::{Auction};

// Constants
use ponzi_land::consts::{
    BASE_TIME, TIME_SPEED, MAX_AUCTIONS, TWO_DAYS_IN_SECONDS, MIN_AUCTION_PRICE, CENTER_LOCATION,
    MAX_CIRCLES, OUR_CONTRACT_FOR_FEE,
};

// Store
use ponzi_land::store::{Store, StoreTrait};

// Helpers
use ponzi_land::helpers::coord::{left, right, up, down, up_left, up_right, down_left, down_right};
use ponzi_land::helpers::taxes::{get_tax_rate_per_neighbor, get_taxes_per_neighbor};
use ponzi_land::helpers::circle_expansion::{generate_circle, get_random_index};

// Events
use ponzi_land::events::{NewAuctionEvent};

// Test setup and mocks
use ponzi_land::tests::setup::{
    setup, setup::{create_setup, deploy_erc20, RECIPIENT, deploy_mock_ekubo_core},
};
use ponzi_land::mocks::ekubo_core::{IEkuboCoreTestingDispatcher, IEkuboCoreTestingDispatcherTrait};

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
                neighbor_pool_key(main_currency, erc20_neighbor_1.contract_address),
            ),
            1000000,
        );

    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(
                neighbor_pool_key(main_currency, erc20_neighbor_2.contract_address),
            ),
            1000000,
        );

    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(
                neighbor_pool_key(main_currency, erc20_neighbor_3.contract_address),
            ),
            1000000,
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
        extension: ContractAddressZeroable::zero(),
    }
}


// Signature struct
#[derive(Drop, Copy)]
struct Signature {
    r: felt252,
    s: felt252,
}


fn authorize_token(dispatcher: ITokenRegistryDispatcher, token_address: ContractAddress) {
    // We need to temporarily mock ourselves to the 0x0 contract
    // to have ownership over the world.
    let prev_address = starknet::get_contract_address();

    set_contract_address(0x0.try_into().unwrap());

    dispatcher.register_token(token_address);

    set_contract_address(prev_address);
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
                s: 0x41ac046404bd42a971a04f39cc887868df51b2d1fd36c4b458d6f93d1e81be0,
            },
        ),
        (
            FIRST_OWNER(),
            Signature {
                r: 0x15455111f634471af0d2b92cf1bea5952572c7698e7c0bfaef775b085ad9ad4, // Replace from script
                s: 0x1ec03c2cec3fd613c39c01c3b2914aa6c14a32577d5aff3120ae55cd61807c8 // Replace from script
            },
        ),
        (
            NEIGHBOR_1(),
            Signature {
                r: 0x3090f3bab984fd8a5f7e2aeb68445a576c6d27f2cf8271e9a09b2c4ef5cb2, // Replace from script
                s: 0x1e4f1f0eb4ecd88ca956bbdbc975c583b9c67aafcd61d35e327b5e86d0c9ab1 // Replace from script
            },
        ),
        (
            NEIGHBOR_2(),
            Signature {
                r: 0x29319b4850a57bdb26b3c0da2263c37453a331f99edc53fc449f7fbe04788ab,
                s: 0x1df852dbfdbfdb03797f38913f767bd017d0429131e028434231a6ef5f03e4d,
            },
        ),
        (
            NEIGHBOR_3(),
            Signature {
                r: 0x6cd54871db709fb53080256364565fdd5f1d059f6237b61ef15e9869d20aabb,
                s: 0x2fbd16550e59cb61476c952cd2873f5ce207535ad268615f42cfecd9962fe47,
            },
        ),
        (
            NEW_BUYER(),
            Signature {
                r: 0x6816c59001073c4b45ca2bb90062c77ff228817ee1859ff4362c000ac0e96bb,
                s: 0x77d582bd4740d95bba36bb9a366bcc5494103b210287125b4b6848d41b10fbf,
            },
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
    land_locations: Span<u16>,
    tokens: Span<IERC20CamelDispatcher>,
    should_have_balance: bool,
) {
    let mut i = 0;
    while i < land_locations.len() {
        let location = *land_locations.at(i);
        let land_stake = store.land_stake(location);
        let token = *tokens.at(i);
        let balance = token.balanceOf(contract_address);
        if should_have_balance {
            assert(land_stake.amount > 0, 'Stake > 0 expected');
            assert(balance > 0, 'Balance > 0 expected');
        } else {
            assert(land_stake.amount == 0, 'Stake == 0 expected');
            assert(balance == 0, 'Balance == 0 expected');
        }

        i += 1;
    };
}

// Drop all events from the given contract address
pub fn clear_events(address: ContractAddress) {
    loop {
        match starknet::testing::pop_log_raw(address) {
            core::option::Option::Some(_) => {},
            core::option::Option::None => { break; },
        };
    }
}


fn capture_location_of_new_auction(address: ContractAddress) -> Option<u16> {
    let selector_from_names = selector_from_names(@"ponzi_land", @"NewAuctionEvent");
    let mut location = Option::None;
    loop {
        match starknet::testing::pop_log::<Event>(address) {
            Option::Some(event) => {
                match event {
                    Event::EventEmitted(event) => {
                        if event.selector == selector_from_names {
                            let key = *event.keys.at(0).try_into().unwrap();
                            location = Option::Some(key.try_into().unwrap());
                            break;
                        }
                    },
                    _ => {},
                }
            },
            Option::None => { break; },
        }
    };

    location
}


// Helper functions for common test setup and actions

// Helper to setup liquidity pool with standard amount
fn setup_liquidity_pool(
    ekubo_testing: IEkuboCoreTestingDispatcher, main_currency: IERC20CamelDispatcher, amount: u128,
) {
    ekubo_testing
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), amount,
        );
}

// Helper to deploy and authorize a neighbor token
fn deploy_and_authorize_neighbor_token(
    ekubo_testing: IEkuboCoreTestingDispatcher,
    main_currency: IERC20CamelDispatcher,
    token_registry: ITokenRegistryDispatcher,
    neighbor_address: ContractAddress,
) -> IERC20CamelDispatcher {
    let (erc20_neighbor, _, _) = deploy_erc20_with_pool(
        ekubo_testing, main_currency.contract_address, neighbor_address,
    );
    authorize_token(token_registry, erc20_neighbor.contract_address);
    erc20_neighbor
}

// Helper to setup basic test environment (block number/timestamp/address)
fn setup_test_block_env(block_number: u64, block_timestamp: u64) {
    set_block_number(block_number);
    set_block_timestamp(block_timestamp);
    set_contract_address(RECIPIENT());
}

// Helper to initialize land and capture next auction in one step
fn initialize_land_and_capture_next_auction(
    store: Store,
    actions_system: IActionsDispatcher,
    main_currency: IERC20CamelDispatcher,
    owner: ContractAddress,
    location: u16,
    sell_price: u256,
    stake_amount: u256,
    token_for_sale: IERC20CamelDispatcher,
) -> u16 {
    clear_events(store.world.dispatcher.contract_address);
    initialize_land(
        actions_system, main_currency, owner, location, sell_price, stake_amount, token_for_sale,
    );
    let next_auction_location = capture_location_of_new_auction(
        store.world.dispatcher.contract_address,
    );
    assert(next_auction_location.is_some(), 'No new auction location found');
    next_auction_location.unwrap()
}

// Helper to create multiple sequential lands (reduces the repetitive pattern in test_claim_all,
// test_time_to_nuke)
fn create_multiple_lands(
    store: Store,
    actions_system: IActionsDispatcher,
    main_currency: IERC20CamelDispatcher,
    count: u32,
    owner: ContractAddress,
    sell_price: u256,
    stake_amount: u256,
    token: IERC20CamelDispatcher,
) -> Array<u16> {
    let mut locations = array![];
    let mut i = 0;
    while i < count {
        let next_location = capture_location_of_new_auction(
            store.world.dispatcher.contract_address,
        );
        assert(next_location.is_some(), 'No new auction location found');
        let location = next_location.unwrap();
        initialize_land(
            actions_system, main_currency, owner, location, sell_price, stake_amount, token,
        );
        locations.append(location);
        i += 1;
    };
    locations
}
fn setup_test() -> (
    Store,
    IActionsDispatcher,
    IERC20CamelDispatcher,
    IEkuboCoreTestingDispatcher,
    ITokenRegistryDispatcher,
    IConfigSystemDispatcher,
) {
    let (
        world,
        actions_system,
        erc20,
        _,
        testing_dispatcher,
        auth_system,
        token_registry,
        config_system,
    ) =
        create_setup();
    set_contract_address(RECIPIENT());
    // Setup authorization
    authorize_all_addresses(auth_system);

    // Setup initial ERC20 approval
    erc20.approve(actions_system.contract_address, 10000);
    let allowance = erc20.allowance(RECIPIENT(), actions_system.contract_address);
    assert(allowance >= 1000, 'Approval failed');

    let store = StoreTrait::new(world);

    (store, actions_system, erc20, testing_dispatcher, token_registry, config_system)
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
    location: u16,
    sell_price: u256,
    stake_amount: u256,
    token_for_sale: IERC20CamelDispatcher,
) {
    // Instead of creating an auction directly, we'll use one of the initial lands
    // or wait for spiral auctions to reach the desired location
    let auction_value = actions_system.get_current_auction_price(location);
    setup_buyer_with_tokens(
        main_currency, actions_system, RECIPIENT(), owner, auction_value + stake_amount,
    );

    token_for_sale.approve(actions_system.contract_address, auction_value + stake_amount);

    let allowance = token_for_sale.allowance(owner, actions_system.contract_address);
    assert(allowance >= stake_amount, 'Buyer approval failed');
    actions_system.bid(location, token_for_sale.contract_address, sell_price, stake_amount);
}

// Helper function for setting up a buyer with tokens
fn setup_buyer_with_tokens(
    erc20: IERC20CamelDispatcher,
    actions_system: IActionsDispatcher,
    from: ContractAddress,
    to: ContractAddress,
    amount: u256,
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


// Helper function for land verification
fn verify_land(
    store: Store,
    location: u16,
    expected_owner: ContractAddress,
    expected_price: u256,
    expected_stake: u256,
    expected_block_date_bought: u64,
    expected_token_used: ContractAddress,
) {
    let land = store.land(location);
    let land_stake = store.land_stake(location);
    assert(land.owner == expected_owner, 'incorrect owner');
    assert(land.sell_price == expected_price, 'incorrect price');
    assert(land_stake.amount == expected_stake, 'incorrect stake');
    assert(land.block_date_bought == expected_block_date_bought, 'incorrect date bought');
    assert(land.token_used == expected_token_used, 'incorrect token used');
}

fn bid_and_verify_next_auctions(
    actions_system: IActionsDispatcher,
    store: Store,
    main_currency: IERC20CamelDispatcher,
    locations: Array<u16>,
    next_direction: u8 // 0=left, 1=up, 2=right, 3=down
) {
    // Bid on all locations
    let mut i = 0;
    loop {
        if i >= locations.len() {
            break;
        }
        let location = *locations.at(i);
        actions_system.bid(location, main_currency.contract_address, 2, 10);
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
            _ => panic_with_felt252('Invalid direction'),
        };
        assert(next_auction.start_price > 0, 'auction not started');
        assert(next_auction.start_time > 0, 'auction not started');
        i += 1;
    };
}


#[test]
fn test_buy_action() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _) =
        setup_test();

    // Setup liquidity pool and neighbor token
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 10000);
    let erc20_neighbor_1 = deploy_and_authorize_neighbor_token(
        ekubo_testing_dispatcher, main_currency, token_dispatcher, NEIGHBOR_1(),
    );

    // Setup test environment
    setup_test_block_env(18710, 100);

    // Initialize center land and neighbor land
    let next_auction_location = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        RECIPIENT(),
        CENTER_LOCATION,
        1000,
        500,
        main_currency,
    );
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        next_auction_location,
        1000,
        500,
        erc20_neighbor_1,
    );

    // Setup buyer and perform buy action
    set_block_timestamp(2000);
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 4000);
    actions_system.buy(CENTER_LOCATION, main_currency.contract_address, 100, 120);

    //verify that we do claim for the neighbors of the land sold
    let balance_neighbor_1_of_main_currency = main_currency.balanceOf(NEIGHBOR_1());
    assert(balance_neighbor_1_of_main_currency > 0, 'has to receive main currency');

    // Verify results
    verify_land(
        store, CENTER_LOCATION, NEW_BUYER(), 100, 120, 2000, main_currency.contract_address,
    );
}

#[test]
#[should_panic]
fn test_invalid_land() {
    let (_, actions_system, erc20, _, _, _) = setup_test();

    // Attempt to buy land at invalid position (11000)
    actions_system.buy(11000, erc20.contract_address, 10, 12);
}

//test for now without auction
#[test]
fn test_bid_and_buy_action() {
    let (store, actions_system, main_currency, _, _, _) = setup_test();

    // Set initial timestamp
    set_block_timestamp(100);
    set_block_number(254);

    // Create initial land with auction and bid
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 100, 50, main_currency,
    );

    // Validate bid/buy updates
    verify_land(store, CENTER_LOCATION, RECIPIENT(), 100, 50, 100, main_currency.contract_address);

    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);

    set_block_timestamp(160);
    actions_system.buy(CENTER_LOCATION, main_currency.contract_address, 300, 500);

    // Validate buy action updates
    verify_land(store, CENTER_LOCATION, NEW_BUYER(), 300, 500, 160, main_currency.contract_address);
}

#[test]
fn test_claim_and_add_taxes() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _) =
        setup_test();

    // Setup liquidity pool and neighbor token
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 10000);
    let erc20_neighbor_1 = deploy_and_authorize_neighbor_token(
        ekubo_testing_dispatcher, main_currency, token_dispatcher, NEIGHBOR_1(),
    );

    // Setup test environment
    setup_test_block_env(234324, 100);

    // Initialize center land and neighbor land
    let next_auction_location = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        RECIPIENT(),
        CENTER_LOCATION,
        1000,
        500,
        main_currency,
    );
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        next_auction_location,
        1000,
        500,
        erc20_neighbor_1,
    );
    let neighbor_land_before_claim = store.land_stake(next_auction_location);
    let accumulated_fee_before_claim = neighbor_land_before_claim.accumulated_taxes_fee;
    let our_contract_for_fee_before_claim = erc20_neighbor_1
        .balanceOf(OUR_CONTRACT_FOR_FEE.try_into().unwrap());
    // Simulate time difference to generate taxes
    let our_contract_for_fee = OUR_CONTRACT_FOR_FEE.try_into().unwrap();
    set_block_timestamp(20000);
    set_contract_address(RECIPIENT());
    actions_system.claim(CENTER_LOCATION);
    let accumulated_fee_after_claim = store.land_stake(next_auction_location).accumulated_taxes_fee;

    assert(accumulated_fee_after_claim > accumulated_fee_before_claim, 'fail in accumalated fees');

    set_block_timestamp(40000);
    set_contract_address(RECIPIENT());
    actions_system.claim(CENTER_LOCATION);
    let our_contract_for_fee_after_claim = erc20_neighbor_1.balanceOf(our_contract_for_fee);
    assert(
        our_contract_for_fee_after_claim > our_contract_for_fee_before_claim, 'fail in pay fees',
    );

    // Get claimer land and verify taxes
    let claimer_land = store.land(CENTER_LOCATION);
    assert(erc20_neighbor_1.balanceOf(claimer_land.owner) > 0, 'fail in pay taxes');

    // Verify the neighbors of the claimer land
    let neighbor_land_after_claim = store.land_stake(next_auction_location);
    assert(
        neighbor_land_after_claim.amount < neighbor_land_before_claim.amount,
        'must have less stake',
    );

    set_block_timestamp(6000);
    // Setup buyer with tokens and approvals
    setup_buyer_with_tokens(erc20_neighbor_1, actions_system, NEIGHBOR_1(), NEW_BUYER(), 2500);
    actions_system.buy(next_auction_location, erc20_neighbor_1.contract_address, 100, 100);
    // verify the claim when occurs a buy
    let our_contract_for_fee_after_buy = erc20_neighbor_1
        .balanceOf(OUR_CONTRACT_FOR_FEE.try_into().unwrap());
    assert(
        our_contract_for_fee_after_buy > our_contract_for_fee_after_claim,
        'fail in pay fees in buy',
    );
}

#[test]
fn test_nuke_action() {
    // Setup environment
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_registry, _) =
        setup_test();
    //set a liquidity pool with amount for each token
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 1000000,
        );

    let (erc20_neighbor_1, _, _) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );

    // Trust the token
    authorize_token(token_registry, erc20_neighbor_1.contract_address);

    set_block_timestamp(100);
    set_block_number(324);

    clear_events(store.world.dispatcher.contract_address);
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 100, 500, main_currency,
    );

    let neighbor_land_location = capture_location_of_new_auction(
        store.world.dispatcher.contract_address,
    );
    assert(neighbor_land_location.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        neighbor_land_location.unwrap(),
        10000,
        50,
        erc20_neighbor_1,
    );

    let neighbor_land_before_claim = store.land_stake(neighbor_land_location.unwrap());

    let balance_before_claim = erc20_neighbor_1.balanceOf(RECIPIENT());

    // Large time jump to accumulate taxes
    set_block_timestamp(1100);
    set_contract_address(RECIPIENT());
    actions_system.claim(CENTER_LOCATION);

    let neighbor_land_after_claim = store.land_stake(neighbor_land_location.unwrap());
    assert(
        neighbor_land_after_claim.amount < neighbor_land_before_claim.amount,
        'must have less stake',
    );

    let balance_after_claim = erc20_neighbor_1.balanceOf(RECIPIENT());
    assert(balance_after_claim > balance_before_claim, 'should have more balance');

    // Claim more taxes to nuke lands
    set_block_timestamp(200000);
    actions_system.claim(CENTER_LOCATION);

    //verify that the nuked land did a last claim before nuke
    let balance_of_neighbor_land = main_currency.balanceOf(NEIGHBOR_1());
    assert(balance_of_neighbor_land > 0, 'should have more balance');

    // Verify the neighbor land was nuked
    verify_land(
        store,
        neighbor_land_location.unwrap(),
        ContractAddressZeroable::zero(),
        MIN_AUCTION_PRICE,
        0,
        0,
        main_currency.contract_address,
    );
}


#[test]
fn test_increase_price_and_stake() {
    let (store, actions_system, main_currency, _, _, _) = setup_test();

    //create land
    set_block_timestamp(100);
    set_block_number(234);
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 1000, 1000, main_currency,
    );

    //verify the land
    verify_land(
        store, CENTER_LOCATION, RECIPIENT(), 1000, 1000, 100, main_currency.contract_address,
    );

    //increase the price
    actions_system.increase_price(CENTER_LOCATION, 2300);
    let land = store.land(CENTER_LOCATION);
    assert(land.sell_price == 2300, 'has increase to 2300');

    //increase the stake
    main_currency.approve(actions_system.contract_address, 2000);
    let land_stake = store.land_stake(CENTER_LOCATION);
    assert(land_stake.amount == 1000, 'stake has to be 1000');

    actions_system.increase_stake(CENTER_LOCATION, 2000);

    let land_stake = store.land_stake(CENTER_LOCATION);
    assert(land_stake.amount == 3000, 'stake has to be 3000');
}

#[test]
#[ignore]
fn test_detailed_tax_calculation() {
    set_block_timestamp(1000);
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _) = setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 1000000,
        );

    let (erc20_neighbor, _, _) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );

    // timestamp: 1000
    initialize_land(
        actions_system,
        main_currency,
        RECIPIENT(),
        1280, // Central position
        10000, // sell_price
        5000, // stake_amount
        main_currency,
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
        erc20_neighbor,
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

    // Verify stake amount was reduced by correct tax amount
    let land_1281_stake = store.land_stake(1281);
    // assert(land_1281_stake.last_pay_time == 5600, 'Wrong last pay time');
    assert(land_1281_stake.amount == 9717, // 10000 - 283
    'Wrong stake amount after tax');

    assert(erc20_neighbor.balanceOf(RECIPIENT()) == 283, 'Wrong tax amount calculated');
}

#[test]
fn test_level_up() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _) =
        setup_test();

    // Setup liquidity pool and neighbor token
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 100000);
    let erc20_neighbor = deploy_and_authorize_neighbor_token(
        ekubo_testing_dispatcher, main_currency, token_dispatcher, NEIGHBOR_1(),
    );

    // Setup test environment
    setup_test_block_env(234, 100);

    // Initialize center land and neighbor land
    let next_location_1 = initialize_land_and_capture_next_auction(
        store, actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 100, 50, main_currency,
    );
    initialize_land(
        actions_system, main_currency, NEIGHBOR_1(), next_location_1, 20000, 10000, erc20_neighbor,
    );
    set_block_timestamp((TWO_DAYS_IN_SECONDS.into() / TIME_SPEED.into()) + 100);

    set_contract_address(RECIPIENT());
    actions_system.level_up(CENTER_LOCATION);

    let land_CENTER_LOCATION = store.land(CENTER_LOCATION);
    let land_1050 = store.land(1050);
    assert_eq!(
        land_CENTER_LOCATION.level, Level::First, "Land CENTER_LOCATION should be Level::First",
    );
    assert_eq!(land_1050.level, Level::Zero, "Land 1050 should be Level::None");
}

#[test]
fn check_success_liquidity_pool() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _) = setup_test();

    // Setup liquidity pool and test environment
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 100000);
    setup_test_block_env(234, 100);

    // Create initial land
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 100, 50, main_currency,
    );

    // Setup buyer and perform buy action
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);
    actions_system.buy(CENTER_LOCATION, main_currency.contract_address, 100, 120);

    // Verify results
    verify_land(store, CENTER_LOCATION, NEW_BUYER(), 100, 120, 100, main_currency.contract_address);
}

#[test]
#[should_panic]
fn check_invalid_liquidity_pool() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _) = setup_test();

    // Setup low liquidity pool (should cause panic)
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 100);
    set_block_timestamp(100);

    // Create initial land
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 100, 50, main_currency,
    );

    // Setup buyer and perform buy action (should panic due to low liquidity)
    setup_buyer_with_tokens(main_currency, actions_system, RECIPIENT(), NEW_BUYER(), 1000);
    actions_system.buy(CENTER_LOCATION, main_currency.contract_address, 100, 120);

    // Verify results
    verify_land(store, CENTER_LOCATION, NEW_BUYER(), 100, 120, 100, main_currency.contract_address);
}


//TODO:when we have the new expansion for auction we can test with more lands
fn test_reimburse_stakes() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _) = setup_test();

    set_block_timestamp(10);
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 100000,
        );

    set_block_timestamp(200);

    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 100, 500, main_currency,
    );

    let land_locations = array![CENTER_LOCATION];
    let tokens = array![main_currency];

    validate_staking_state(
        store, actions_system.contract_address, land_locations.span(), tokens.span(), true,
    );

    actions_system.reimburse_stakes();

    validate_staking_state(
        store, actions_system.contract_address, land_locations.span(), tokens.span(), false,
    );
}

#[test]
fn test_claim_all() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _) =
        setup_test();

    // Setup liquidity pool and neighbor token
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 10000);
    let erc20_neighbor_1 = deploy_and_authorize_neighbor_token(
        ekubo_testing_dispatcher, main_currency, token_dispatcher, NEIGHBOR_1(),
    );

    // Setup test environment
    setup_test_block_env(234, 100);

    // Initialize center land and first neighbor land
    let next_location_1 = initialize_land_and_capture_next_auction(
        store, actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 100, 50, main_currency,
    );
    initialize_land(
        actions_system, main_currency, NEIGHBOR_1(), next_location_1, 10000, 500, erc20_neighbor_1,
    );

    // Create 6 additional lands for RECIPIENT
    let additional_locations = create_multiple_lands(
        store, actions_system, main_currency, 6, RECIPIENT(), 100, 50, main_currency,
    );

    set_block_timestamp(5000);
    set_contract_address(RECIPIENT());

    let neighbor_land_before_claim = store.land_stake(next_location_1);

    // Build land locations array
    let mut land_locations = array![CENTER_LOCATION];
    let mut i = 0;
    while i < additional_locations.len() {
        land_locations.append(*additional_locations.at(i));
        i += 1;
    };

    actions_system.claim_all(land_locations);

    //Get claimer lands and verify taxes
    let neighbor_land_after_claim = store.land_stake(next_location_1);

    assert(erc20_neighbor_1.balanceOf(RECIPIENT()) > 0, 'has to receive tokens');
    assert(
        neighbor_land_before_claim.amount > neighbor_land_after_claim.amount,
        'stake amount should be less',
    );
}

#[test]
fn test_time_to_nuke() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _) =
        setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000,
        );
    // Deploy ERC20 tokens for neighbors
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );
    authorize_token(token_dispatcher, erc20_neighbor_1.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_2.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_3.contract_address);

    set_block_number(234324);
    set_contract_address(RECIPIENT());

    //first we clear all the events
    clear_events(store.world.dispatcher.contract_address);
    set_block_timestamp(1000);
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 1000, 500, main_currency,
    );
    //and now we can capture NewAuctionEvent
    let next_auction_location = capture_location_of_new_auction(
        store.world.dispatcher.contract_address,
    );
    //TODO:DO A FUNCTION TO REFACTOR THIS
    assert(next_auction_location.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        next_auction_location.unwrap(),
        50,
        800,
        erc20_neighbor_1,
    );

    let next_location_2 = capture_location_of_new_auction(store.world.dispatcher.contract_address);
    assert(next_location_2.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_2(),
        next_location_2.unwrap(),
        1000,
        800,
        erc20_neighbor_2,
    );

    let next_location_3 = capture_location_of_new_auction(store.world.dispatcher.contract_address);
    assert(next_location_3.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_3(),
        next_location_3.unwrap(),
        1000,
        800,
        erc20_neighbor_3,
    );

    let next_location_4 = capture_location_of_new_auction(store.world.dispatcher.contract_address);
    assert(next_location_4.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_3(),
        next_location_4.unwrap(),
        1000,
        800,
        erc20_neighbor_3,
    );

    let next_location_5 = capture_location_of_new_auction(store.world.dispatcher.contract_address);
    assert(next_location_5.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_3(),
        next_location_5.unwrap(),
        1000,
        800,
        erc20_neighbor_3,
    );

    let block_timestamp = get_block_timestamp();
    let land_stake = store.land_stake(CENTER_LOCATION);
    let time_to_nuke = actions_system.get_time_to_nuke(CENTER_LOCATION);

    set_block_timestamp(time_to_nuke - block_timestamp);
    let unclaimed_taxes = actions_system.get_unclaimed_taxes_per_neighbors_total(CENTER_LOCATION);
    assert!(unclaimed_taxes < land_stake.amount, "stake should be > unclaimed taxes");
    assert!(time_to_nuke != get_block_timestamp(), "should be not nukable yet");
    set_block_timestamp(time_to_nuke);

    let unclaimed_taxes = actions_system.get_unclaimed_taxes_per_neighbors_total(CENTER_LOCATION);
    assert!(unclaimed_taxes >= land_stake.amount, "stake should be <= unclaimed taxes");

    let new_time_to_nuke = actions_system.get_time_to_nuke(CENTER_LOCATION);
    assert!(new_time_to_nuke == get_block_timestamp(), "should be nukable now");

    set_contract_address(NEIGHBOR_1());
    actions_system.claim(next_auction_location.unwrap());

    //verify that the land was nuked
    verify_land(
        store,
        CENTER_LOCATION,
        ContractAddressZeroable::zero(),
        5000000000000000000000,
        0,
        0,
        main_currency.contract_address,
    );
}

#[test]
fn test_circle_expansion() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _) = setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000,
        );
    // Deploy ERC20 tokens for neighbors

    let (_, _, _) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );

    let lands_of_circle_1 = generate_circle(1);
    assert!(lands_of_circle_1.len() == 8, "circle 1 should have 8 lands");

    set_block_number(400);
    set_contract_address(RECIPIENT());

    //first we clear all the events
    clear_events(store.world.dispatcher.contract_address);
    //CENTER LOCATION
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 10, 50, main_currency,
    );
    //and now we can capture NewAuctionEvent
    initialize_land(
        actions_system, main_currency, RECIPIENT(), *lands_of_circle_1[0], 10, 50, main_currency,
    );

    initialize_land(
        actions_system, main_currency, RECIPIENT(), *lands_of_circle_1[1], 10, 50, main_currency,
    );

    initialize_land(
        actions_system, main_currency, RECIPIENT(), *lands_of_circle_1[3], 10, 50, main_currency,
    );

    let land_1 = store.land(CENTER_LOCATION);
    let land_2 = store.land(*lands_of_circle_1[0]);
    let land_3 = store.land(*lands_of_circle_1[1]);
    let land_4 = store.land(*lands_of_circle_1[3]);

    assert_eq!(land_1.owner, RECIPIENT(), "land 1 owner");
    assert_eq!(land_2.owner, RECIPIENT(), "land 2 owner");
    assert_eq!(land_3.owner, RECIPIENT(), "land 3 owner");
    assert_eq!(land_4.owner, RECIPIENT(), "land 4 owner");
}


#[test]
fn test_new_claim() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _) =
        setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000,
        );
    // Deploy ERC20 tokens for neighbors
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );
    authorize_token(token_dispatcher, erc20_neighbor_1.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_2.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_3.contract_address);

    set_block_number(234324);
    set_block_timestamp(100);
    set_contract_address(RECIPIENT());

    //first we clear all the events
    clear_events(store.world.dispatcher.contract_address);
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 1000, 5000, main_currency,
    );
    //and now we can capture NewAuctionEvent
    let next_auction_location = capture_location_of_new_auction(
        store.world.dispatcher.contract_address,
    );
    assert(next_auction_location.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        next_auction_location.unwrap(),
        1000,
        2000,
        erc20_neighbor_1,
    );

    let next_location_2 = capture_location_of_new_auction(store.world.dispatcher.contract_address);
    assert(next_location_2.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_2(),
        next_location_2.unwrap(),
        1000,
        200,
        erc20_neighbor_2,
    );

    let next_location_3 = capture_location_of_new_auction(store.world.dispatcher.contract_address);
    assert(next_location_3.is_some(), 'No new auction location found');
    initialize_land(
        actions_system,
        main_currency,
        NEIGHBOR_3(),
        next_location_3.unwrap(),
        1000,
        2000,
        erc20_neighbor_3,
    );

    let time_to_nuke_neighbor_2 = actions_system.get_time_to_nuke(next_location_2.unwrap());

    set_block_timestamp(time_to_nuke_neighbor_2);
    set_contract_address(RECIPIENT());
    actions_system.claim(CENTER_LOCATION);

    let balance_of_recipient_erc20_1 = erc20_neighbor_1.balanceOf(RECIPIENT());
    let balance_of_recipient_erc20_2 = erc20_neighbor_2.balanceOf(RECIPIENT());
    let balance_of_recipient_erc20_3 = erc20_neighbor_3.balanceOf(RECIPIENT());
    assert(balance_of_recipient_erc20_1 > 0, 'has to receive tokens');
    assert(balance_of_recipient_erc20_2 > 0, 'has to receive tokens');
    assert(balance_of_recipient_erc20_3 > 0, 'has to receive tokens');

    // Verify that neighbor 2 was nuked
    verify_land(
        store,
        next_location_2.unwrap(),
        ContractAddressZeroable::zero(),
        2500000000000000000000,
        0,
        0,
        main_currency.contract_address,
    );

    // Verify that only the neighbors of the nuked land received the taxes
    let balance_neighbor_1_of_erc20_2 = erc20_neighbor_2.balanceOf(NEIGHBOR_1());
    let balance_neighbor_1_of_erc20_3 = erc20_neighbor_3.balanceOf(NEIGHBOR_1());
    assert(balance_neighbor_1_of_erc20_2 > 0, 'n1 has to receive tokens');
    assert(balance_neighbor_1_of_erc20_3 == 0, 'n1 no claim of erc20-3');

    let balance_neighbor_2_of_erc20_1 = erc20_neighbor_1.balanceOf(NEIGHBOR_2());
    let balance_neighbor_2_of_erc20_3 = erc20_neighbor_3.balanceOf(NEIGHBOR_2());
    assert(balance_neighbor_2_of_erc20_1 > 0, 'n2 no claim of erc20-1');
    assert(balance_neighbor_2_of_erc20_3 == 0, 'n2 no claim of erc20-3');

    let balance_neighbor_3_of_erc20_1 = erc20_neighbor_1.balanceOf(NEIGHBOR_3());
    let balance_neighbor_3_of_erc20_2 = erc20_neighbor_2.balanceOf(NEIGHBOR_3());
    assert(balance_neighbor_3_of_erc20_1 == 0, 'n3 no claim of erc20-1');
    assert(balance_neighbor_3_of_erc20_2 == 0, 'n3 no claim of erc20-2');
}


#[test]
fn test_dynamic_grid() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, config_system) =
        setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 10000,
        );

    set_block_number(400);
    set_contract_address(RECIPIENT());

    clear_events(store.world.dispatcher.contract_address);
    initialize_land(
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 10, 50, main_currency,
    );

    let initial_max_circles = store.get_max_circles();
    assert(initial_max_circles == MAX_CIRCLES, 'max circles should be default');

    config_system.set_max_circles(2);
    let actual_max_circles = store.get_max_circles();
    assert(actual_max_circles == 2, 'max circles should be 2');
}
