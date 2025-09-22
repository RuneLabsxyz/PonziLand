// ERC20 interface for token operations
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

// Game constants
use ponzi_land::consts::CENTER_LOCATION;

// LiquidityReinjector contract interface
use ponzi_land::liquidity::liquidity_reinjector::{
    ILiquidityReinjectorDispatcher, ILiquidityReinjectorDispatcherTrait, LiquidityReinjector,
};

// Store for reading game state
use ponzi_land::store::{Store, StoreTrait};

// System interfaces
use ponzi_land::systems::actions::{IActionsDispatcher, IActionsDispatcherTrait};
use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};
use ponzi_land::systems::token_registry::{ITokenRegistryDispatcher, ITokenRegistryDispatcherTrait};

// Test helpers
use ponzi_land::tests::actions::{FIRST_OWNER, authorize_all_addresses};
use ponzi_land::tests::setup::setup::{RECIPIENT, create_setup};

// Starknet types and testing utilities
use starknet::ContractAddress;
use starknet::testing::{set_block_number, set_block_timestamp, set_contract_address};

fn deploy_liquidity_reinjector(owner: ContractAddress) -> ILiquidityReinjectorDispatcher {
    let constructor_calldata = array![owner.into()];
    let (contract_address, _) = starknet::deploy_syscall(
        LiquidityReinjector::TEST_CLASS_HASH.try_into().unwrap(),
        1,
        constructor_calldata.span(),
        false,
    )
        .unwrap();
    ILiquidityReinjectorDispatcher { contract_address }
}

#[test]
fn test_deployment_and_authorization() {
    let owner: ContractAddress = 'owner'.try_into().unwrap();
    let operator: ContractAddress = 'operator'.try_into().unwrap();

    let reinjector = deploy_liquidity_reinjector(owner);
    assert(reinjector.get_owner() == owner, 'Wrong owner');
    assert(reinjector.is_authorized(owner), 'Owner should be authorized');
    set_contract_address(owner);
    reinjector.add_authorized(operator);
    assert(reinjector.is_authorized(operator), 'Operator should be authorized');
}

#[test]
#[should_panic(expected: ('Not authorized', 'ENTRYPOINT_FAILED'))]
fn test_unauthorized_execution() {
    let owner: ContractAddress = 'owner'.try_into().unwrap();
    let unauthorized: ContractAddress = 'unauthorized'.try_into().unwrap();
    let token_addr: ContractAddress = 'token'.try_into().unwrap();

    let reinjector = deploy_liquidity_reinjector(owner);
    set_contract_address(unauthorized);
    reinjector.execute_buy(1, token_addr, 100, 50);
}

#[test]
#[should_panic(expected: ('Only owner can call', 'ENTRYPOINT_FAILED'))]
fn test_only_owner_functions() {
    let owner: ContractAddress = 'owner'.try_into().unwrap();
    let unauthorized: ContractAddress = 'unauthorized'.try_into().unwrap();
    let new_addr: ContractAddress = 'new_addr'.try_into().unwrap();

    let reinjector = deploy_liquidity_reinjector(owner);
    set_contract_address(unauthorized);
    reinjector.add_authorized(new_addr);
}


/// @notice Test liquidity reinjector with working bid execution
#[test]
fn test_full_liquidity_reinjection_flow() {
    // Step 1: Deploy the full game environment
    let (
        world,
        actions_system,
        main_currency,
        _,
        _ekubo_testing_dispatcher,
        auth_system,
        token_registry,
        _config_system,
    ) =
        create_setup();

    let store = StoreTrait::new(world);

    // Set up test environment
    set_block_timestamp(100);
    set_block_number(1);
    set_contract_address(RECIPIENT());

    // Step 2: Deploy and configure the LiquidityReinjector contract
    let reinjector_owner = FIRST_OWNER();
    let authorized_operator =
        FIRST_OWNER(); // Use FIRST_OWNER as authorized operator since it's in authorize_all_addresses

    // Authorize the main currency token
    set_contract_address(0x0.try_into().unwrap());
    token_registry.register_token(main_currency.contract_address);

    // Authorize all test addresses for actions using the helper function
    authorize_all_addresses(auth_system);

    // Deploy the LiquidityReinjector contract
    set_contract_address(reinjector_owner);
    let reinjector = deploy_liquidity_reinjector(reinjector_owner);

    // Set the actions contract address
    reinjector.set_actions_contract(actions_system.contract_address);
    assert(
        reinjector.get_actions_contract() == actions_system.contract_address,
        'Actions contract not set',
    );

    // FIRST_OWNER is already authorized as the owner, no need to add again
    assert(reinjector.is_authorized(authorized_operator), 'Operator not authorized');

    // Step 3: Use the initialize_land approach that works in other tests
    // Instead of trying to bid on CENTER_LOCATION directly, we create a land that works
    set_contract_address(RECIPIENT());

    // Use the helper pattern from actions.cairo that creates land by making a bid
    // This automatically creates an active auction
    let auction_price = actions_system.get_current_auction_price(CENTER_LOCATION);
    let stake_amount = 1000;
    let total_needed = auction_price + stake_amount;

    // Set up the reinjector with tokens
    main_currency.transfer(reinjector.contract_address, total_needed + 10000);

    // Verify the reinjector has the tokens
    let reinjector_balance = main_currency.balanceOf(reinjector.contract_address);
    assert(reinjector_balance >= total_needed, 'Reinjector funding failed');

    // Execute bid through the reinjector as the authorized operator
    set_contract_address(authorized_operator);
    reinjector
        .execute_bid(
            CENTER_LOCATION, main_currency.contract_address, 5000, // sell price
            stake_amount,
        );

    // Verify the bid succeeded - land should now be owned by the reinjector
    let land = store.land(CENTER_LOCATION);
    assert(land.owner == reinjector.contract_address, 'Bid failed - wrong owner');
    assert(land.sell_price == 5000, 'Bid failed - wrong price');

    // Step 4: Test withdrawal functionality
    let owner_balance_before = main_currency.balanceOf(reinjector_owner);
    let reinjector_remaining = main_currency.balanceOf(reinjector.contract_address);

    set_contract_address(reinjector_owner);
    if reinjector_remaining > 0 {
        reinjector.withdraw_tokens(main_currency.contract_address, reinjector_remaining);

        let owner_balance_after = main_currency.balanceOf(reinjector_owner);
        assert(
            owner_balance_after == owner_balance_before + reinjector_remaining, 'Withdrawal failed',
        );
    }
}

#[test]
#[should_panic(expected: ('Actions contract not set', 'ENTRYPOINT_FAILED'))]
fn test_actions_contract_not_set() {
    let owner: ContractAddress = 'owner'.try_into().unwrap();
    let token_addr: ContractAddress = 'token'.try_into().unwrap();

    let reinjector = deploy_liquidity_reinjector(owner);

    // Try to execute bid without setting actions contract
    set_contract_address(owner);
    reinjector.execute_bid(1, token_addr, 100, 50);
}

