// Core lib imports.
use starknet::syscalls::deploy_syscall;

// Local imports.
use haiko_amm::libraries::tree::_get_segment_and_position;
use haiko_amm::contracts::mocks::tree_contract::{
    TestTreeContract, ITestTreeContractDispatcher, ITestTreeContractDispatcherTrait
};

// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT, MIN_LIMIT};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::params::{owner, default_token_params, default_market_params};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::deploy_token,
};

// External imports.
use snforge_std::{ContractClass, ContractClassTrait, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    felt252,
    ITestTreeContractDispatcher
) {
    // Deploy and initialise market.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Create market.
    let mut default_market_params = default_market_params();
    default_market_params.base_token = base_token.contract_address;
    default_market_params.quote_token = quote_token.contract_address;
    let market_id = create_market(market_manager, default_market_params);

    // Deploy test tree contract.
    let class = declare("TestTreeContract");
    let contract_address = class.deploy(@array![]).unwrap();
    let tree_contract = ITestTreeContractDispatcher { contract_address };

    (market_manager, base_token, quote_token, market_id, tree_contract)
}

// Setup test cases.
fn setup_test_cases(tree_contract: ITestTreeContractDispatcher, market_id: felt252) {
    tree_contract.flip(market_id, 1, OFFSET - 250);
    tree_contract.flip(market_id, 1, OFFSET - 100);
    tree_contract.flip(market_id, 1, OFFSET - 24);
    tree_contract.flip(market_id, 1, OFFSET - 1);
    tree_contract.flip(market_id, 1, OFFSET + 10);
    tree_contract.flip(market_id, 1, OFFSET + 125);
    tree_contract.flip(market_id, 1, OFFSET + 126);
    tree_contract.flip(market_id, 1, OFFSET + 149);
    tree_contract.flip(market_id, 1, OFFSET + 210);
    tree_contract.flip(market_id, 1, OFFSET + 375);
    tree_contract.flip(market_id, 1, OFFSET + 660);
    tree_contract.flip(market_id, 1, OFFSET + MAX_LIMIT);
}

////////////////////////////////////
// TESTS - get and flip bit
////////////////////////////////////

#[test]
fn test_get_and_flip_bit() {
    let (_market_manager, _base_token, _quote_token, market_id, tree_contract) = before();

    let mut limit = 1;
    assert(tree_contract.get(market_id, 1, limit) == false, 'get(1, init)');

    tree_contract.flip(market_id, 1, limit);
    assert(tree_contract.get(market_id, 1, limit) == true, 'get(1, T)');

    tree_contract.flip(market_id, 1, limit);
    assert(tree_contract.get(market_id, 1, limit) == false, 'get(1, F)');

    tree_contract.flip(market_id, 1, 2);
    assert(tree_contract.get(market_id, 1, 2) == true, 'get(2, T)');
    assert(tree_contract.get(market_id, 1, 1) == false, 'get(1, F)');

    tree_contract.flip(market_id, 1, 257);
    assert(tree_contract.get(market_id, 1, 257) == true, 'get(257, T)');
    assert(tree_contract.get(market_id, 1, 1) == false, 'get(1, F)');

    limit = OFFSET + 200;
    tree_contract.flip(market_id, 1, limit);

    tree_contract.flip(market_id, 1, OFFSET + 220);
    assert(tree_contract.get(market_id, 1, limit) == true, 'get(OFFSET + 200, T)');

    tree_contract.flip(market_id, 1, OFFSET + 226);
    assert(tree_contract.get(market_id, 1, limit) == true, 'get(OFFSET + 200, T)');
}

////////////////////////////////
// TESTS - next_limit
////////////////////////////////

#[test]
fn test_next_limit_buy_cases_width_1() {
    let (_market_manager, _base_token, _quote_token, market_id, tree_contract) = before();

    // Setup some initial test cases.
    setup_test_cases(tree_contract, market_id);

    // Returns direct next limit if initialised.
    let mut start_limit = OFFSET + 125;
    let next_limit = tree_contract.next_limit(market_id, true, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + 126, 'next_limit(125,1,buy)');

    // Returns next limit if initialised.
    start_limit = OFFSET + 126;
    let next_limit = tree_contract.next_limit(market_id, true, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + 149, 'next_limit(126,1,buy)');

    // Returns next word's initialised limit if on the boundary.
    start_limit = OFFSET + 256;
    let next_limit = tree_contract.next_limit(market_id, true, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + 375, 'next_limit(256,1,buy)');

    // Returns next word's initialised limit.
    start_limit = OFFSET + 510;
    let next_limit = tree_contract.next_limit(market_id, true, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + 660, 'next_limit(640,1,buy)');

    // Returns max.
    start_limit = OFFSET + 660;
    let next_limit = tree_contract.next_limit(market_id, true, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + MAX_LIMIT, 'next_limit(660,1,buy)');
}

#[test]
fn test_next_limit_sell_cases_width_1() {
    let (_market_manager, _base_token, _quote_token, market_id, tree_contract) = before();

    // Setup some initial test cases.
    setup_test_cases(tree_contract, market_id);

    // Returns self if initialised.
    let mut start_limit = OFFSET + 126;
    let next_limit = tree_contract.next_limit(market_id, false, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + 126, 'next_limit(126,1,sell)');

    // Returns next word's initialised limit if on the boundary.
    start_limit = OFFSET + 257;
    let next_limit = tree_contract.next_limit(market_id, false, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + 210, 'next_limit(120,1,sell)');

    // Returns next word's initialised limit.
    start_limit = OFFSET + 550;
    let next_limit = tree_contract.next_limit(market_id, false, 1, start_limit);
    assert(next_limit.unwrap() == OFFSET + 375, 'next_limit(550,1,sell)');
}

////////////////////////////////////
// TESTS - _get_segment_and_position
////////////////////////////////////

#[test]
fn test_get_segment_and_position_cases() {
    let (mut segment, mut position) = _get_segment_and_position(OFFSET - MIN_LIMIT);
    assert(segment == 0 && position == 0, 'seg_pos(MIN)');

    let (segment, position) = _get_segment_and_position(OFFSET - 248100);
    assert(segment == 30512 && position == 13, 'seg_pos(-248100)');

    let (segment, position) = _get_segment_and_position(OFFSET - 1050);
    assert(segment == 31496 && position == 79, 'seg_pos(-1050)');

    let (segment, position) = _get_segment_and_position(OFFSET - 1);
    assert(segment == 31500 && position == 124, 'seg_pos(-1)');

    let (segment, position) = _get_segment_and_position(OFFSET + 9794);
    assert(segment == 31539 && position == 130, 'seg_pos(9794)');

    let (segment, position) = _get_segment_and_position(OFFSET + 254839);
    assert(segment == 32515 && position == 199, 'seg_pos(254839)');

    let (segment, position) = _get_segment_and_position(OFFSET + 1857300);
    assert(segment == 38900 && position == 25, 'seg_pos(1857300)');

    let (segment, position) = _get_segment_and_position(OFFSET + MAX_LIMIT);
    assert(segment == 63000 && position == 250, 'seg_pos(MAX)');
}

#[test]
#[should_panic(expected: ('SegPosLimitOF',))]
fn test_get_segment_and_position_overflow() {
    _get_segment_and_position(OFFSET + MAX_LIMIT + 1);
}
