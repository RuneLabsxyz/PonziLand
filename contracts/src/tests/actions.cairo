// Core Cairo imports
use core::ec::stark_curve::{GEN_X, GEN_Y};
use core::ec::{EcPointTrait, EcStateTrait};
use core::poseidon::poseidon_hash_span;
use dojo::model::{ModelStorage, ModelStorageTest, ModelValueStorage};
use dojo::utils::hash::{selector_from_names, selector_from_namespace_and_name};
use dojo::world::world::Event;

// Dojo imports
use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait, WorldStorage, WorldStorageTrait};
use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};

// External dependencies
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

// Constants
use ponzi_land::consts::{
    BASE_TIME, CENTER_LOCATION, MAX_AUCTIONS, MAX_CIRCLES, MIN_AUCTION_PRICE, OUR_CONTRACT_FOR_FEE,
    TIME_SPEED, TWO_DAYS_IN_SECONDS,
};

// Events
use ponzi_land::events::{NewAuctionEvent};
use ponzi_land::helpers::auction::get_suggested_sell_price;
use ponzi_land::helpers::circle_expansion::{generate_circle, get_random_index};

// Helpers
use ponzi_land::helpers::coord::{down, down_left, down_right, left, right, up, up_left, up_right};
use ponzi_land::helpers::taxes::{get_tax_rate_per_neighbor, get_taxes_per_neighbor};
use ponzi_land::mocks::ekubo_core::{IEkuboCoreTestingDispatcher, IEkuboCoreTestingDispatcherTrait};
use ponzi_land::models::auction::Auction;

// Models
use ponzi_land::models::land::{Land, LandStake, LandTrait, Level, PoolKey, PoolKeyConversion};

// Store
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::systems::actions::actions::InternalImpl;

// Internal systems
use ponzi_land::systems::actions::{IActionsDispatcher, IActionsDispatcherTrait, actions};
use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};
use ponzi_land::systems::config::{IConfigSystemDispatcher, IConfigSystemDispatcherTrait};
use ponzi_land::systems::token_registry::{ITokenRegistryDispatcher, ITokenRegistryDispatcherTrait};

// Test setup and mocks
use ponzi_land::tests::setup::{
    setup, setup::{RECIPIENT, create_setup, deploy_erc20, deploy_mock_ekubo_core},
};
use starknet::contract_address::ContractAddressZeroable;
use starknet::storage::{Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess};
use starknet::testing::{
    set_block_number, set_block_timestamp, set_caller_address, set_contract_address,
};

// Starknet imports
use starknet::{ContractAddress, contract_address_const, get_block_timestamp};
use starknet::{get_tx_info, testing};

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
    // We need to temporarily mock ourselves as the world owner to call set_verifier
    // Similar pattern to authorize_token function
    let prev_address = starknet::get_contract_address();

    set_contract_address(0x0.try_into().unwrap());

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
    }

    // Restore the original contract address
    set_contract_address(prev_address);
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
    }

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
//TODO: DO THIS FOR THE 3 TOKENS, ERC20_N_1 2 AND 3
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

fn helper_to_initalize_first_n_lands_to_test_edge_case(
    n_lands: u8,
    store: Store,
    actions_system: IActionsDispatcher,
    main_currency: IERC20CamelDispatcher,
    owner: ContractAddress,
    sell_price: u256,
    stake_amount: u256,
    tokens_for_sale: Array<IERC20CamelDispatcher>,
) -> Array<u16> {
    let mut locations = array![CENTER_LOCATION];
    let mut i: u8 = 0;
    while i <= n_lands {
        let mut next_location: u16 = 0;
        if i == n_lands {
            next_location =
                initialize_land_and_capture_next_auction(
                    store,
                    actions_system,
                    main_currency,
                    NEIGHBOR_1(),
                    *locations.at(i.into()),
                    1000000,
                    50,
                    *tokens_for_sale.at(0),
                );
        } else {
            next_location =
                initialize_land_and_capture_next_auction(
                    store,
                    actions_system,
                    main_currency,
                    owner,
                    *locations.at(i.into()),
                    sell_price,
                    stake_amount,
                    main_currency,
                );
        }
        locations.append(next_location);
        i += 1;
    }
    locations
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
    }
    locations
}
fn setup_test() -> (
    Store,
    IActionsDispatcher,
    IERC20CamelDispatcher,
    IEkuboCoreTestingDispatcher,
    ITokenRegistryDispatcher,
    IConfigSystemDispatcher,
    IAuthDispatcher,
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

    (store, actions_system, erc20, testing_dispatcher, token_registry, config_system, auth_system)
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
    }

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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
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
    let (_, actions_system, erc20, _, _, _, _) = setup_test();

    // Attempt to buy land at invalid position (11000)
    actions_system.buy(11000, erc20.contract_address, 10, 12);
}

//test for now without auction
#[test]
fn test_bid_and_buy_action() {
    let (store, actions_system, main_currency, _, _, _, _) = setup_test();

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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_registry, _, _) =
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
    let (store, actions_system, main_currency, _, _, _, _) = setup_test();

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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _, _) = setup_test();
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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _, _) = setup_test();

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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _, _) = setup_test();

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

#[test]
fn test_withdrawal_functions() {
    let (
        store,
        actions_system,
        main_currency,
        ekubo_testing_dispatcher,
        token_dispatcher,
        _,
        auth_dispatcher,
    ) =
        setup_test();

    set_block_timestamp(10);
    set_block_number(10);
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 10000);
    let (erc20_neighbor_1, erc20_neighbor_2, _) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );
    authorize_token(token_dispatcher, erc20_neighbor_1.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_2.contract_address);

    // RECIPIENT (first owner) - 1 land
    let next_location_1 = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        RECIPIENT(),
        CENTER_LOCATION,
        1000,
        500,
        main_currency,
    );

    // NEIGHBOR_1 (second owner) - 2 lands
    let next_location_2 = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        next_location_1,
        1500,
        600,
        erc20_neighbor_1,
    );
    setup_buyer_with_tokens(erc20_neighbor_2, actions_system, NEIGHBOR_2(), NEIGHBOR_1(), 1000);
    initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        next_location_2,
        2000,
        800,
        erc20_neighbor_2,
    );

    // Execute some claims to test dynamic behavior
    set_block_timestamp(500);
    set_contract_address(RECIPIENT());
    actions_system.claim(CENTER_LOCATION);

    set_block_timestamp(700);
    set_contract_address(NEIGHBOR_1());
    actions_system.claim(next_location_1);

    // Record initial balances before withdrawal
    let initial_main_contract = main_currency.balanceOf(actions_system.contract_address);
    let initial_erc1_contract = erc20_neighbor_1.balanceOf(actions_system.contract_address);
    let initial_erc2_contract = erc20_neighbor_2.balanceOf(actions_system.contract_address);

    let recipient_balance_before = main_currency.balanceOf(RECIPIENT());
    let neighbor1_balance_before = erc20_neighbor_1.balanceOf(NEIGHBOR_1());
    let neighbor1_erc2_balance_before = erc20_neighbor_2.balanceOf(NEIGHBOR_1());

    // End the game
    set_contract_address(0x0.try_into().unwrap());
    auth_dispatcher.end_game_and_enable_withdrawals();

    // Test withdraw_stake for RECIPIENT (single land)
    set_contract_address(RECIPIENT());
    actions_system.withdraw_stake(CENTER_LOCATION);

    // Verify single withdrawal worked
    let center_stake_after = store.land_stake(CENTER_LOCATION);
    let center_land_after = store.land(CENTER_LOCATION);
    assert(center_stake_after.amount == 0, 'stake not cleared');
    assert(center_land_after.sell_price == 0, 'land not deleted');

    // Verify RECIPIENT received refund
    let recipient_balance_after = main_currency.balanceOf(RECIPIENT());
    assert(recipient_balance_after > recipient_balance_before, 'recipient no refund');

    // Test withdraw_stakes_batch for NEIGHBOR_1 (multiple lands)
    set_contract_address(NEIGHBOR_1());
    let neighbor1_locations = array![next_location_1, next_location_2];
    actions_system.withdraw_stakes_batch(neighbor1_locations);

    // Verify batch withdrawal worked
    let location1_stake_after = store.land_stake(next_location_1);
    let location2_stake_after = store.land_stake(next_location_2);
    let location1_land_after = store.land(next_location_1);
    let location2_land_after = store.land(next_location_2);

    assert(location1_stake_after.amount == 0, 'batch stake1 failed');
    assert(location2_stake_after.amount == 0, 'batch stake2 failed');
    assert(location1_land_after.sell_price == 0, 'batch land1 failed');
    assert(location2_land_after.sell_price == 0, 'batch land2 failed');

    // Verify NEIGHBOR_1 received refunds for both tokens
    let neighbor1_balance_after = erc20_neighbor_1.balanceOf(NEIGHBOR_1());
    let neighbor1_erc2_balance_after = erc20_neighbor_2.balanceOf(NEIGHBOR_1());
    assert(neighbor1_balance_after > neighbor1_balance_before, 'neighbor1 no erc1 refund');
    assert(
        neighbor1_erc2_balance_after > neighbor1_erc2_balance_before, 'neighbor1 no erc2 refund',
    );

    // Verify contract released tokens
    let final_main_contract = main_currency.balanceOf(actions_system.contract_address);
    let final_erc1_contract = erc20_neighbor_1.balanceOf(actions_system.contract_address);
    let final_erc2_contract = erc20_neighbor_2.balanceOf(actions_system.contract_address);

    assert(final_main_contract < initial_main_contract, 'main not released');
    assert(final_erc1_contract < initial_erc1_contract, 'erc1 not released');
    assert(final_erc2_contract < initial_erc2_contract, 'erc2 not released');
}

#[test]
fn test_claim_all() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
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
    }

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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
        setup_test();
    //set a liquidity pool with amount
    ekubo_testing_dispatcher
        .set_pool_liquidity(
            PoolKeyConversion::to_ekubo(pool_key(main_currency.contract_address)), 100000,
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
        actions_system, main_currency, RECIPIENT(), CENTER_LOCATION, 10000, 1500, main_currency,
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
        50,
        800,
        erc20_neighbor_1,
    );

    set_block_timestamp(6000);
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

    set_block_timestamp(8000);
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

    set_block_timestamp(10000);
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

    set_block_timestamp(12000);
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

    set_block_timestamp(block_timestamp + time_to_nuke - 5);
    let future_auction_price = get_suggested_sell_price(store, CENTER_LOCATION);
    let unclaimed_taxes = actions_system.get_unclaimed_taxes_per_neighbors_total(CENTER_LOCATION);
    assert!(unclaimed_taxes < land_stake.amount, "stake should be > unclaimed taxes");
    assert!(time_to_nuke != get_block_timestamp(), "should be not nukable yet");
    set_block_timestamp(block_timestamp + time_to_nuke);
    let unclaimed_taxes = actions_system.get_unclaimed_taxes_per_neighbors_total(CENTER_LOCATION);
    assert!(unclaimed_taxes >= land_stake.amount, "stake should be <= unclaimed taxes");

    set_contract_address(NEIGHBOR_1());
    actions_system.claim(next_auction_location.unwrap());

    //verify that the land was nuked
    verify_land(
        store,
        CENTER_LOCATION,
        ContractAddressZeroable::zero(),
        future_auction_price,
        0,
        0,
        main_currency.contract_address,
    );
}

#[test]
fn test_circle_expansion() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, _, _) = setup_test();
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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
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
    let block_timestamp = get_block_timestamp();
    set_block_timestamp(block_timestamp + time_to_nuke_neighbor_2);
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
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, _, config_system, _) =
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
    set_contract_address(0x0.try_into().unwrap());
    let initial_max_circles = store.get_max_circles();
    assert(initial_max_circles == MAX_CIRCLES, 'max circles should be default');

    config_system.set_max_circles(2);
    let actual_max_circles = store.get_max_circles();
    assert(actual_max_circles == 2, 'max circles should be 2');
}

#[test]
fn test_precision_in_nuke_distribution() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
        setup_test();
    let our_contract_for_fee = store.get_our_contract_for_fee();

    // Setup liquidity pool and neighbor tokens
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 10000);
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );
    authorize_token(token_dispatcher, erc20_neighbor_1.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_2.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_3.contract_address);

    setup_test_block_env(1, 1000);

    // Create center land
    let next_location_1 = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        RECIPIENT(),
        CENTER_LOCATION,
        10000,
        5000,
        main_currency,
    );

    // Create first neighbor with very small stake (will be nuked)
    let next_location_2 = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        next_location_1,
        1000000,
        3, // Very small stake
        erc20_neighbor_1,
    );

    // Create second neighbor
    initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        NEIGHBOR_2(),
        next_location_2,
        1000000,
        10000,
        erc20_neighbor_2,
    );

    // Record initial balances
    let initial_balance_center = erc20_neighbor_1.balanceOf(RECIPIENT());
    let initial_balance_n2 = erc20_neighbor_1.balanceOf(NEIGHBOR_2());
    let initial_balance_our_contract_for_fee = erc20_neighbor_1.balanceOf(our_contract_for_fee);
    // Jump forward to accumulate taxes and trigger nuke
    set_block_timestamp(50000);
    set_contract_address(RECIPIENT());

    actions_system.claim(CENTER_LOCATION);

    // Check if neighbor 1 was nuked
    let nuked_land = store.land(next_location_1);
    assert(nuked_land.owner.is_zero(), 'land should be nuked');
    // Land was nuked - check distribution
    let final_balance_center = erc20_neighbor_1.balanceOf(RECIPIENT());
    let final_balance_n2 = erc20_neighbor_1.balanceOf(NEIGHBOR_2());
    let final_balance_our_contract_for_fee = erc20_neighbor_1.balanceOf(our_contract_for_fee);
    let received_center = final_balance_center - initial_balance_center;
    let received_n2 = final_balance_n2 - initial_balance_n2;
    let received_our_contract_for_fee = final_balance_our_contract_for_fee
        - initial_balance_our_contract_for_fee;

    // The sum should equal the original stake (3)
    assert(
        received_center + received_n2 + received_our_contract_for_fee == 3,
        'Distribution overflow detected',
    );

    // Check that at least some distribution occurred
    assert(received_our_contract_for_fee > 0, 'Complete precision loss');
}


#[test]
fn test_first_grade_of_nuke_and_dead_land() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
        setup_test();

    // Setup liquidity pool and neighbor tokens
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 10000);
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );
    authorize_token(token_dispatcher, erc20_neighbor_1.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_2.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_3.contract_address);

    setup_test_block_env(1, 1000);
    set_block_timestamp(1000);
    let tokens_for_sale = array![erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3];
    let land_locations = helper_to_initalize_first_n_lands_to_test_edge_case(
        10, store, actions_system, main_currency, RECIPIENT(), 10000, 5, tokens_for_sale,
    );

    // SETUP: Create chain of 11 lands with vulnerable stakes (5 each)
    // Land 8 and 9 are second-degree neighbors of CENTER - they will be crucial for testing
    let land_8 = *land_locations.at(8); // Will be protected initially, then nukeable
    let land_9 = *land_locations.at(9); // Will be protected initially, then nukeable

    let initial_land_8_stake = store.land_stake(land_8).amount;
    let initial_land_9_stake = store.land_stake(land_9).amount;
    let initial_land_8_owner = store.land(land_8).owner;
    let initial_land_9_owner = store.land(land_9).owner;

    // Record initial token balances for validation
    let initial_balance_recipient_main = main_currency.balanceOf(RECIPIENT());
    let initial_balance_recipient_erc1 = erc20_neighbor_1.balanceOf(RECIPIENT());

    // PHASE 1: Trigger massive nuke cascade from CENTER
    // Advance time significantly to accumulate high taxes that will exceed stakes
    set_block_timestamp(80000);
    set_contract_address(RECIPIENT());

    // CENTER claims from all its direct neighbors -> triggers cascade nuke process
    actions_system.claim(CENTER_LOCATION);

    let final_land_8 = store.land(land_8);
    let final_land_8_stake = store.land_stake(land_8);
    let final_land_9 = store.land(land_9);
    let final_land_9_stake = store.land_stake(land_9);

    // PHASE 1 VALIDATIONS: Check first-grade nuke protection worked correctly
    //
    // Expected cascade flow:
    // 1. CENTER claims -> Direct neighbors (1-7) exceed their stakes -> Get nuked
    // 2. Each nuked land does "last claim" with from_nuke=true before deletion
    // 3. Lands 8 & 9 SHOULD be nukeable but are protected by from_nuke=true flag
    // 4. CENTER becomes dead land (no stake, no neighbors) -> Also gets nuked
    //
    // This prevents infinite recursion during cascade nukes

    // Validate that CENTER_LOCATION was nuked (became dead land)
    let final_center_land = store.land(CENTER_LOCATION);
    assert(final_center_land.owner.is_zero(), 'CENTER should be nuked as dead');
    let final_center_stake = store.land_stake(CENTER_LOCATION);
    assert(final_center_stake.amount == 0, 'CENTER stake should be 0');

    // Land 8: Should be nukeable but protected by from_nuke=true during last claim recursion
    assert(!final_land_8.owner.is_zero(), 'Land 8 should NOT be nuked');
    assert(final_land_8.owner == initial_land_8_owner, 'Land 8 owner unchanged');
    assert(final_land_8_stake.amount < initial_land_8_stake, 'Land 8 should have paid taxes');
    assert(final_land_8_stake.amount > 0, 'Land 8 should still have stake');

    // Land 9: Should be nukeable but protected by from_nuke=true during last claim recursion
    assert(!final_land_9.owner.is_zero(), 'Land 9 should NOT be nuked');
    assert(final_land_9.owner == initial_land_9_owner, 'Land 9 owner unchanged');
    assert(final_land_9_stake.amount < initial_land_9_stake, 'Land 9 should have paid taxes');
    assert(final_land_9_stake.amount > 0, 'Land 9 should still have stake');

    // === TOKEN TRANSFER VALIDATIONS ===
    // Record final token balances after the claim and nuke process
    let final_balance_recipient_main = main_currency.balanceOf(RECIPIENT());
    let final_balance_recipient_erc1 = erc20_neighbor_1.balanceOf(RECIPIENT());

    // CENTER (RECIPIENT) should receive tokens from its direct neighbors during claim
    assert(
        final_balance_recipient_main > initial_balance_recipient_main, 'CENTER should receive main',
    );
    assert(
        final_balance_recipient_erc1 > initial_balance_recipient_erc1, 'CENTER should receive erc1',
    );

    // Land 8 and Land 9 owners should receive tokens during the "last claim" process
    // when nuked lands claim from them before being deleted

    // PHASE 2: Test mutual nuke between protected lands
    //
    // Now lands 8 & 9 have reduced stakes and are vulnerable in normal claims
    // Expected flow: Land 8 claims -> Land 9 nuked -> Land 9 last claim -> Land 8 nuked as dead
    set_block_timestamp(80200);
    set_contract_address(initial_land_8_owner);
    actions_system.claim(land_8);

    // Both lands should now be nuked in cascade
    let land_9_after_second_claim = store.land(land_9);
    let stake_9_after_second = store.land_stake(land_9);
    assert(land_9_after_second_claim.owner.is_zero(), 'Land 9 should be nuked');
    assert(stake_9_after_second.amount == 0, 'Land 9 stake should be 0');

    let land_8_after_second_claim = store.land(land_8);
    let stake_8_after_second = store.land_stake(land_8);
    assert(land_8_after_second_claim.owner.is_zero(), 'Land 8 should be nuked');
    assert(stake_8_after_second.amount == 0, 'Land 8 stake should be 0');
}

#[test]
fn test_nuke_cascade() {
    let (store, actions_system, main_currency, ekubo_testing_dispatcher, token_dispatcher, _, _) =
        setup_test();

    // Setup liquidity pool and neighbor tokens
    setup_liquidity_pool(ekubo_testing_dispatcher, main_currency, 10000);
    let (erc20_neighbor_1, erc20_neighbor_2, erc20_neighbor_3) = deploy_erc20_with_pool(
        ekubo_testing_dispatcher, main_currency.contract_address, NEIGHBOR_1(),
    );
    authorize_token(token_dispatcher, erc20_neighbor_1.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_2.contract_address);
    authorize_token(token_dispatcher, erc20_neighbor_3.contract_address);

    setup_test_block_env(1, 1000);

    // Create 4 lands using actions.cairo pattern
    // intialize CENTER land with small stake (will be nuked)
    let neighbor_1_location = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        FIRST_OWNER(),
        CENTER_LOCATION,
        10000,
        5,
        main_currency // Small stake for nuke
    );

    // initialize Neighbor 1 and capture location for neighbor 2
    let neighbor_2_location = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        NEIGHBOR_1(),
        neighbor_1_location,
        10000,
        100,
        erc20_neighbor_1,
    );

    // initialize Neighbor 2 and capture location for neighbor 3
    let neighbor_3_location = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        NEIGHBOR_2(),
        neighbor_2_location,
        10000,
        100,
        erc20_neighbor_2,
    );

    // initialize Neighbor 3 and capture location for neighbor 4
    let neighbor_4_location = initialize_land_and_capture_next_auction(
        store,
        actions_system,
        main_currency,
        NEIGHBOR_3(),
        neighbor_3_location,
        10000,
        100,
        erc20_neighbor_3,
    );

    // Record initial balances for ALL tokens involved in cascade
    let game_contract = actions_system.contract_address;
    let fee_contract = OUR_CONTRACT_FOR_FEE.try_into().unwrap();

    // Track balances for each token type
    let initial_main_balance_first = main_currency.balanceOf(FIRST_OWNER());
    let initial_main_balance_n1 = main_currency.balanceOf(NEIGHBOR_1());
    let initial_main_balance_n2 = main_currency.balanceOf(NEIGHBOR_2());
    let initial_main_balance_n3 = main_currency.balanceOf(NEIGHBOR_3());
    let initial_main_contract_balance = main_currency.balanceOf(game_contract);
    let initial_main_fee_balance = main_currency.balanceOf(fee_contract);

    let initial_erc1_balance_first = erc20_neighbor_1.balanceOf(FIRST_OWNER());
    let initial_erc1_balance_n1 = erc20_neighbor_1.balanceOf(NEIGHBOR_1());
    let initial_erc1_balance_n2 = erc20_neighbor_1.balanceOf(NEIGHBOR_2());
    let initial_erc1_balance_n3 = erc20_neighbor_1.balanceOf(NEIGHBOR_3());
    let initial_erc1_contract_balance = erc20_neighbor_1.balanceOf(game_contract);
    let initial_erc1_fee_balance = erc20_neighbor_1.balanceOf(fee_contract);

    let initial_erc2_balance_first = erc20_neighbor_2.balanceOf(FIRST_OWNER());
    let initial_erc2_balance_n1 = erc20_neighbor_2.balanceOf(NEIGHBOR_1());
    let initial_erc2_balance_n2 = erc20_neighbor_2.balanceOf(NEIGHBOR_2());
    let initial_erc2_balance_n3 = erc20_neighbor_2.balanceOf(NEIGHBOR_3());
    let initial_erc2_contract_balance = erc20_neighbor_2.balanceOf(game_contract);
    let initial_erc2_fee_balance = erc20_neighbor_2.balanceOf(fee_contract);

    let initial_erc3_balance_first = erc20_neighbor_3.balanceOf(FIRST_OWNER());
    let initial_erc3_balance_n1 = erc20_neighbor_3.balanceOf(NEIGHBOR_1());
    let initial_erc3_balance_n2 = erc20_neighbor_3.balanceOf(NEIGHBOR_2());
    let initial_erc3_balance_n3 = erc20_neighbor_3.balanceOf(NEIGHBOR_3());
    let initial_erc3_contract_balance = erc20_neighbor_3.balanceOf(game_contract);
    let initial_erc3_fee_balance = erc20_neighbor_3.balanceOf(fee_contract);

    // Trigger nuke cascade by claiming from a neighbor
    set_block_timestamp(50000); // Large time jump to accumulate taxes
    set_contract_address(NEIGHBOR_1());
    actions_system.claim(neighbor_1_location);

    // Validate nuke occurred
    let center_land = store.land(CENTER_LOCATION);
    assert(center_land.owner.is_zero(), 'Center should be nuked');
    let final_center_stake = store.land_stake(CENTER_LOCATION).amount;
    assert(final_center_stake == 0, 'Center stake should be 0');

    // Record final balances for ALL tokens
    let final_main_balance_first = main_currency.balanceOf(FIRST_OWNER());
    let final_main_balance_n1 = main_currency.balanceOf(NEIGHBOR_1());
    let final_main_balance_n2 = main_currency.balanceOf(NEIGHBOR_2());
    let final_main_balance_n3 = main_currency.balanceOf(NEIGHBOR_3());
    let final_main_contract_balance = main_currency.balanceOf(game_contract);
    let final_main_fee_balance = main_currency.balanceOf(fee_contract);

    let final_erc1_balance_first = erc20_neighbor_1.balanceOf(FIRST_OWNER());
    let final_erc1_balance_n1 = erc20_neighbor_1.balanceOf(NEIGHBOR_1());
    let final_erc1_balance_n2 = erc20_neighbor_1.balanceOf(NEIGHBOR_2());
    let final_erc1_balance_n3 = erc20_neighbor_1.balanceOf(NEIGHBOR_3());
    let final_erc1_contract_balance = erc20_neighbor_1.balanceOf(game_contract);
    let final_erc1_fee_balance = erc20_neighbor_1.balanceOf(fee_contract);

    let final_erc2_balance_first = erc20_neighbor_2.balanceOf(FIRST_OWNER());
    let final_erc2_balance_n1 = erc20_neighbor_2.balanceOf(NEIGHBOR_1());
    let final_erc2_balance_n2 = erc20_neighbor_2.balanceOf(NEIGHBOR_2());
    let final_erc2_balance_n3 = erc20_neighbor_2.balanceOf(NEIGHBOR_3());
    let final_erc2_contract_balance = erc20_neighbor_2.balanceOf(game_contract);
    let final_erc2_fee_balance = erc20_neighbor_2.balanceOf(fee_contract);

    let final_erc3_balance_first = erc20_neighbor_3.balanceOf(FIRST_OWNER());
    let final_erc3_balance_n1 = erc20_neighbor_3.balanceOf(NEIGHBOR_1());
    let final_erc3_balance_n2 = erc20_neighbor_3.balanceOf(NEIGHBOR_2());
    let final_erc3_balance_n3 = erc20_neighbor_3.balanceOf(NEIGHBOR_3());
    let final_erc3_contract_balance = erc20_neighbor_3.balanceOf(game_contract);
    let final_erc3_fee_balance = erc20_neighbor_3.balanceOf(fee_contract);

    // Record final land states (should be nuked/zero)
    let final_land1_stake = store.land_stake(neighbor_1_location).amount;
    let final_land2_stake = store.land_stake(neighbor_2_location).amount;
    let final_land3_stake = store.land_stake(neighbor_3_location).amount;
    let final_land4_stake = store.land_stake(neighbor_4_location).amount;

    // Calculate total initial stakes (tokens in game contract)
    let total_initial_contract_tokens = initial_main_contract_balance
        + initial_erc1_contract_balance
        + initial_erc2_contract_balance
        + initial_erc3_contract_balance;

    // Calculate total final stakes (should be 0 after cascade)
    let total_final_contract_tokens = final_main_contract_balance
        + final_erc1_contract_balance
        + final_erc2_contract_balance
        + final_erc3_contract_balance;

    // Calculate tokens distributed to players (all token types)
    let total_received_first = (final_main_balance_first - initial_main_balance_first)
        + (final_erc1_balance_first - initial_erc1_balance_first)
        + (final_erc2_balance_first - initial_erc2_balance_first)
        + (final_erc3_balance_first - initial_erc3_balance_first);
    let total_received_n1 = (final_main_balance_n1 - initial_main_balance_n1)
        + (final_erc1_balance_n1 - initial_erc1_balance_n1)
        + (final_erc2_balance_n1 - initial_erc2_balance_n1)
        + (final_erc3_balance_n1 - initial_erc3_balance_n1);
    let total_received_n2 = (final_main_balance_n2 - initial_main_balance_n2)
        + (final_erc1_balance_n2 - initial_erc1_balance_n2)
        + (final_erc2_balance_n2 - initial_erc2_balance_n2)
        + (final_erc3_balance_n2 - initial_erc3_balance_n2);
    let total_received_n3 = (final_main_balance_n3 - initial_main_balance_n3)
        + (final_erc1_balance_n3 - initial_erc1_balance_n3)
        + (final_erc2_balance_n3 - initial_erc2_balance_n3)
        + (final_erc3_balance_n3 - initial_erc3_balance_n3);
    let total_distributed_to_players = total_received_first
        + total_received_n1
        + total_received_n2
        + total_received_n3;

    // Calculate fees collected (all token types)
    let total_fees_collected = (final_main_fee_balance - initial_main_fee_balance)
        + (final_erc1_fee_balance - initial_erc1_fee_balance)
        + (final_erc2_fee_balance - initial_erc2_fee_balance)
        + (final_erc3_fee_balance - initial_erc3_fee_balance);

    // Calculate total land stakes (should all be 0)
    let total_final_land_stakes = final_center_stake
        + final_land1_stake
        + final_land2_stake
        + final_land3_stake
        + final_land4_stake;

    // Total accounting: initial tokens = distributed + fees + remaining in contract + remaining in
    // lands
    let total_accounted = total_distributed_to_players
        + total_fees_collected
        + total_final_contract_tokens
        + total_final_land_stakes;

    // CRITICAL: All tokens from contract must be accounted for
    assert(total_accounted == total_initial_contract_tokens, 'Token accounting failed');

    // Verify contract released all staked tokens
    assert(
        total_final_contract_tokens < total_initial_contract_tokens,
        'Contract should release tokens',
    );

    // Verify all lands were nuked
    assert(final_center_stake == 0, 'Center should be nuked');
    assert(final_land1_stake == 0, 'Land1 should be nuked');
    assert(final_land2_stake == 0, 'Land2 should be nuked');
    assert(final_land3_stake == 0, 'Land3 should be nuked');
    assert(final_land4_stake == 0, 'Land4 should be nuked');

    // Verify distribution occurred to players
    assert(total_distributed_to_players > 0, 'No tokens distributed');
    assert(
        total_received_n1 > 0 || total_received_n2 > 0 || total_received_n3 > 0,
        'one player should receive',
    );

    // Verify fees were collected
    assert(total_fees_collected > 0, 'No fees collected');

    // Verify total conservation of tokens
    assert(total_accounted <= total_initial_contract_tokens, 'Cannot create tokens');
}

