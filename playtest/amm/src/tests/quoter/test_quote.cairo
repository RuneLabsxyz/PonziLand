// Core lib imports.
use starknet::syscalls::call_contract_syscall;

// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, default_token_params, default_market_params, modify_position_params, swap_params
};
use haiko_lib::helpers::utils::{to_e18, to_e18_u128, to_e28, encode_sqrt_price};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// TYPES
////////////////////////////////

#[derive(Drop, Copy)]
struct SwapCase {
    is_buy: bool,
    exact_input: bool,
    amount: u256,
}

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(5000000000000000000000000000000000000000000);
    let initial_quote_amount = to_e28(100000000000000000000000000000000000000000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);

    (market_manager, base_token, quote_token)
}

fn swap_test_cases() -> Array<SwapCase> {
    let mut cases = ArrayTrait::<SwapCase>::new();

    cases.append(SwapCase { is_buy: false, exact_input: true, amount: to_e18(1), });
    cases.append(SwapCase { is_buy: true, exact_input: true, amount: to_e18(1), });
    cases.append(SwapCase { is_buy: false, exact_input: false, amount: to_e18(1), });
    cases.append(SwapCase { is_buy: true, exact_input: false, amount: to_e18(1), });
    cases.append(SwapCase { is_buy: true, exact_input: true, amount: to_e18(1), });

    cases
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_quote_cases() {
    let (market_manager, base_token, quote_token) = before();

    // Create the market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    let market_id = create_market(market_manager, params);

    // Mint positions.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut params = modify_position_params(
        alice(),
        market_id,
        OFFSET + 749000,
        OFFSET + 750000,
        I128Trait::new(to_e18_u128(100000), false),
    );
    modify_position(market_manager, params);

    // Iterate through swap test cases.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let swap_cases = swap_test_cases();
    let mut swap_index = 0;
    loop {
        if swap_index >= swap_cases.len() {
            break ();
        }

        // Fetch swap test case.
        let swap_case: SwapCase = *swap_cases[swap_index];

        // Extract quote from error message.
        let res = call_contract_syscall(
            address: market_manager.contract_address,
            entry_point_selector: selector!("quote"),
            calldata: array![
                market_id,
                swap_case.is_buy.into(),
                swap_case.amount.low.into(),
                swap_case.amount.high.into(),
                swap_case.exact_input.into()
            ]
                .span(),
        );
        let quote = match res {
            Result::Ok(_) => {
                assert(false, 'QuoteResultOk');
                0
            },
            Result::Err(error) => {
                let quote_msg = *error.at(0);
                assert(quote_msg == 'quote', 'QuoteInvalid');
                let low: u128 = (*error.at(1)).try_into().expect('QuoteLowOF');
                let high: u128 = (*error.at(2)).try_into().expect('QuoteHighOF');
                u256 { low, high }
            },
        };

        // Execute swap.
        let mut params = swap_params(
            alice(),
            market_id,
            swap_case.is_buy,
            swap_case.exact_input,
            swap_case.amount,
            Option::None(()),
            Option::None(()),
            Option::None(()),
        );
        let (amount_in, amount_out, _) = swap(market_manager, params);
        let amount = if swap_case.exact_input {
            amount_out
        } else {
            amount_in
        };

        // Check that the quote is correct.
        assert(quote == amount, 'Incorrect quote: Case 1' + swap_index.into());

        swap_index += 1;
    };
}
