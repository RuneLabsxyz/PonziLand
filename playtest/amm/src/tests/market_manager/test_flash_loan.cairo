// Core lib imports.
use starknet::ContractAddress;
use starknet::contract_address::contract_address_const;

// Local imports.
use haiko_amm::contracts::mocks::loan_receiver;
use haiko_amm::contracts::mocks::loan_stealer::{
    ILoanStealerDispatcher, ILoanStealerDispatcherTrait
};
use haiko_amm::tests::helpers::loan_receiver::deploy_loan_stealer;

// Haiko imports.
use haiko_lib::constants::OFFSET;
use haiko_lib::interfaces::{
    IMarketManager::{IMarketManager, IMarketManagerDispatcher, IMarketManagerDispatcherTrait},
    ILoanReceiver::{ILoanReceiver, ILoanReceiverDispatcher, ILoanReceiverDispatcherTrait},
};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position},
    loan_receiver::deploy_loan_receiver, token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, default_token_params, default_market_params, modify_position_params
};
use haiko_lib::helpers::utils::{to_e28, to_e18_u128};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before(
    fund_lp: bool, use_stealer: bool,
) -> (
    IMarketManagerDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    felt252,
    ILoanReceiverDispatcher
) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Deploy loan receiver.
    let loan_receiver = if use_stealer {
        deploy_loan_stealer(market_manager.contract_address)
    } else {
        deploy_loan_receiver(market_manager.contract_address)
    };

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET - 0; // initial limit
    let market_id = create_market(market_manager, params);

    // Fund LP with initial token balances and approve market manager as spender. Fund loan receiver.
    let initial_base_amount = to_e28(500000);
    let initial_quote_amount = to_e28(10000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);
    if fund_lp {
        fund(base_token, loan_receiver.contract_address, initial_base_amount);
        fund(quote_token, loan_receiver.contract_address, initial_quote_amount);
    }

    (market_manager, base_token, quote_token, market_id, loan_receiver)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_flash_loan() {
    let (market_manager, base_token, quote_token, market_id, loan_receiver) = before(true, false);

    // Create position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut lower_limit = OFFSET - 10000;
    let mut upper_limit = OFFSET + 10000;
    let mut liquidity = I128Trait::new(to_e18_u128(10000), false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);

    // Borrow non-zero amount of both assets. Works if flash loan fee has not been set.
    start_prank(CheatTarget::One(market_manager.contract_address), loan_receiver.contract_address);
    market_manager.flash_loan(base_token.contract_address, 10000000000);
    market_manager.flash_loan(quote_token.contract_address, 10000000000);

    // Set flash loan fee.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    market_manager.set_flash_loan_fee_rate(base_token.contract_address, 10);
    market_manager.set_flash_loan_fee_rate(quote_token.contract_address, 25);

    // Borrow max amount of both assets. 
    start_prank(CheatTarget::One(market_manager.contract_address), loan_receiver.contract_address);
    let base_start = base_token.balanceOf(loan_receiver.contract_address);
    let quote_start = quote_token.balanceOf(loan_receiver.contract_address);
    market_manager.flash_loan(base_token.contract_address, 487703376934855106884);
    market_manager.flash_loan(quote_token.contract_address, 487703376934855106884);
    let base_end = base_token.balanceOf(loan_receiver.contract_address);
    let quote_end = quote_token.balanceOf(loan_receiver.contract_address);

    // Check that fee is deducted.
    let base_fee_exp = 487703376934855107;
    let quote_fee_exp = 1219258442337137768;
    assert(base_end == base_start - base_fee_exp, 'Base loan fee');
    assert(quote_end == quote_start - quote_fee_exp, 'Quote loan fee');

    // Collect fee via sweep.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let base_collected = market_manager.sweep(owner(), base_token.contract_address, base_fee_exp);
    let quote_collected = market_manager
        .sweep(owner(), quote_token.contract_address, quote_fee_exp);
    assert(base_collected == base_fee_exp, 'Base collected');
    assert(quote_collected == quote_fee_exp, 'Quote collected');
}

#[test]
#[should_panic(expected: ('LoanInsufficient',))]
fn test_flash_loan_no_liquidity() {
    let (market_manager, base_token, _quote_token, _market_id, loan_receiver) = before(true, false);

    start_prank(CheatTarget::One(market_manager.contract_address), loan_receiver.contract_address);
    market_manager.flash_loan(base_token.contract_address, 10000000000);
}

#[test]
#[should_panic(expected: ('u256_sub Overflow',))]
fn test_flash_loan_insufficient_balance() {
    let (market_manager, base_token, quote_token, market_id, loan_receiver) = before(false, false);

    // Create position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut lower_limit = OFFSET - 10000;
    let mut upper_limit = OFFSET + 10000;
    let mut liquidity = I128Trait::new(to_e18_u128(10000), false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);

    // Set flash loan fee.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    market_manager.set_flash_loan_fee_rate(base_token.contract_address, 10);
    market_manager.set_flash_loan_fee_rate(quote_token.contract_address, 25);

    // Flash loan and don't return amount.
    start_prank(CheatTarget::One(market_manager.contract_address), loan_receiver.contract_address);
    market_manager.flash_loan(base_token.contract_address, 10000000000);
}

// This test case tests a now patched attack vector using flash loans. Previously, a borrower
// was able to borrow funds from the market and deposit the same funds as liquidity to the market.
// Because the market implemented checks on its token balance before and after the loan, the borrower
// was able to withdraw the borrowed funds without returning them. This is no longer possible as 
// `flash_loan` now uses an explicit `transferFrom` operation to retrieve borrowed funds + fees.
#[test]
#[should_panic(expected: ('u256_sub Overflow',))]
fn test_flash_loan_stealer() {
    let (market_manager, base_token, quote_token, market_id, loan_receiver) = before(true, true);

    // Create position.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut lower_limit = OFFSET - 10000;
    let mut upper_limit = OFFSET + 10000;
    let mut liquidity = I128Trait::new(to_e18_u128(10000), false);
    let params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);

    // Set flash loan fee.
    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    market_manager.set_flash_loan_fee_rate(base_token.contract_address, 10);
    market_manager.set_flash_loan_fee_rate(quote_token.contract_address, 25);

    // Set market id in loan receiver.
    ILoanStealerDispatcher { contract_address: loan_receiver.contract_address }
        .set_market_id(market_id);

    // Flash loan and try to deposit the amount as liquidity.
    start_prank(CheatTarget::One(market_manager.contract_address), loan_receiver.contract_address);
    market_manager.flash_loan(base_token.contract_address, 10000000000);
}


#[test]
#[should_panic(expected: ('LoanAmtZero',))]
fn test_flash_loan_amount_zero() {
    let (market_manager, base_token, _quote_token, _market_id, loan_receiver) = before(true, false);

    start_prank(CheatTarget::One(market_manager.contract_address), loan_receiver.contract_address);
    market_manager.flash_loan(base_token.contract_address, 0);
}

#[test]
#[should_panic(expected: ('OnlyOwner',))]
fn test_set_flash_loan_fee_not_owner() {
    let (market_manager, base_token, _quote_token, _market_id, loan_receiver) = before(true, false);

    start_prank(CheatTarget::One(market_manager.contract_address), loan_receiver.contract_address);
    market_manager.set_flash_loan_fee_rate(base_token.contract_address, 10);
}

#[test]
#[should_panic(expected: ('SameFee',))]
fn test_set_flash_loan_fee_unchanged() {
    let (market_manager, base_token, _quote_token, _market_id, _loan_receiver) = before(
        true, false
    );

    start_prank(CheatTarget::One(market_manager.contract_address), owner());
    let flash_loan_fee_rate = market_manager.flash_loan_fee_rate(base_token.contract_address);
    market_manager.set_flash_loan_fee_rate(base_token.contract_address, flash_loan_fee_rate);
}
