// Core lib imports.
use starknet::ContractAddress;
use starknet::contract_address::contract_address_const;

// Haiko imports.
use haiko_lib::math::price_math;
use haiko_lib::id;
use haiko_lib::constants::{OFFSET, MAX_LIMIT, MIN_LIMIT};
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::types::core::LimitInfo;
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::utils::{approx_eq, to_e18, to_e18_u128, to_e28};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, bob, treasury, default_token_params, default_market_params, modify_position_params
};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};
use openzeppelin::token::erc721::interface::{ERC721ABIDispatcher, ERC721ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.width = 1;
    params.start_limit = OFFSET - 0; // initial limit
    let market_id = create_market(market_manager, params);

    // Fund LPs with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(500000);
    let initial_quote_amount = to_e28(10000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);

    (market_manager, base_token, quote_token, market_id)
}

////////////////////////////////
// TESTS - mint
////////////////////////////////

// #[test]
// fn test_mint_position() {
//     let (market_manager, base_token, quote_token, market_id) = before();

//     // Create position
//     let lower_limit = OFFSET - 1000;
//     let upper_limit = OFFSET + 1000;
//     let liquidity = I128Trait::new(to_e18_u128(1000000), false);
//     let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
//     modify_position(market_manager, params);

//     // Mint position.
//     let position_id = id::position_id(market_id, alice().into(), lower_limit, upper_limit);
//     market_manager.mint(position_id);

//     // Fetch ERC721 position and check info.
//     let collection = ERC721ABIDispatcher { contract_address: market_manager.contract_address };
//     let position_info = market_manager.ERC721_position_info(position_id);
//     let market_info = market_manager.market_info(market_id);
//     assert(collection.balanceOf(alice()) == 1, 'ERC721 balance');
//     assert(collection.ownerOf(position_id.into()) == alice(), 'ERC721 owner');
//     assert(position_info.base_token == base_token.contract_address, 'Base token');
//     assert(position_info.quote_token == quote_token.contract_address, 'Quote token');
//     assert(position_info.lower_limit == lower_limit, 'Lower limit');
//     assert(position_info.upper_limit == upper_limit, 'Upper limit');
//     assert(position_info.liquidity == liquidity.val, 'Liquidity');
//     assert(position_info.base_amount != 0, 'Base amount');
//     assert(position_info.quote_amount != 0, 'Quote amount');
//     assert(position_info.width == market_info.width, 'Width');
//     assert(position_info.strategy == market_info.strategy, 'Strategy');
//     assert(position_info.swap_fee_rate == market_info.swap_fee_rate, 'Swap fee');
//     assert(position_info.fee_controller == market_info.fee_controller, 'Fee controller');
// }

#[test]
#[should_panic(expected: ('PositionNull',))]
fn test_mint_empty_position() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Mint non-existent position.
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    market_manager.mint(market_id, lower_limit, upper_limit);
}

////////////////////////////////
// TESTS - burn
////////////////////////////////

#[test]
fn test_burn_position() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create position
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let liquidity = I128Trait::new(to_e18_u128(1000000), false);
    let mut params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, liquidity
    );
    modify_position(market_manager, params);

    // Mint position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let position_id = market_manager.mint(market_id, lower_limit, upper_limit);

    // Remove position.
    params.liquidity_delta = I128Trait::new(to_e18_u128(1000000), true);
    modify_position(market_manager, params);

    // Fetch ERC721 position and check info.
    let collection = ERC721ABIDispatcher { contract_address: market_manager.contract_address };
    let position_info = market_manager
        .position(market_id, alice().into(), lower_limit, upper_limit);
    assert(collection.balanceOf(alice()) == 1, 'ERC721 balance');
    assert(collection.ownerOf(position_id.into()) == alice(), 'ERC721 owner');
    assert(position_info.liquidity == 0, 'Liquidity');

    // Burn position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    market_manager.burn(position_id);

    // Check position was removed.
    assert(collection.balanceOf(alice()) == 0, 'ERC721 balance');
}

#[test]
fn test_burn_position_allowed_by_approved() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create position
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let liquidity = I128Trait::new(to_e18_u128(1000000), false);
    let mut params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, liquidity
    );
    modify_position(market_manager, params);

    // Mint position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let position_id = market_manager.mint(market_id, lower_limit, upper_limit);

    // Remove position.
    params.liquidity_delta = I128Trait::new(to_e18_u128(1000000), true);
    modify_position(market_manager, params);

    // Approve bob to burn position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let collection = ERC721ABIDispatcher { contract_address: market_manager.contract_address };
    collection.approve(bob(), position_id.into());

    // Burn position as bob.
    start_prank(CheatTarget::One(market_manager.contract_address), bob());
    market_manager.burn(position_id);

    // Check position was removed.
    assert(collection.balanceOf(alice()) == 0, 'ERC721 balance');
}

#[test]
#[should_panic(expected: ('NotApprovedOrOwner',))]
fn test_burn_position_not_owner() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create position
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let liquidity = I128Trait::new(to_e18_u128(1000000), false);
    let mut params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, liquidity
    );
    modify_position(market_manager, params);

    // Mint position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let position_id = market_manager.mint(market_id, lower_limit, upper_limit);

    // Burn position as bob.
    start_prank(CheatTarget::One(market_manager.contract_address), bob());
    market_manager.burn(position_id);
}

#[test]
#[should_panic(expected: ('NotCleared',))]
fn test_burn_position_not_cleared() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create position
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let liquidity = I128Trait::new(to_e18_u128(1000000), false);
    let mut params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, liquidity
    );
    modify_position(market_manager, params);

    // Mint position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let position_id = market_manager.mint(market_id, lower_limit, upper_limit);

    // Burn position without clearing.
    market_manager.burn(position_id);
}

#[test]
#[should_panic(expected: ('ERC721: invalid token ID',))]
fn test_burn_position_nonexistent_token() {
    let (market_manager, _base_token, _quote_token, _market_id) = before();

    market_manager.burn(1);
}
