// Core lib imports.
use core::integer::BoundedInt;
use starknet::syscalls::call_contract_syscall;

// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::interfaces::IQuoter::{IQuoterDispatcher, IQuoterDispatcherTrait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap, swap_multiple},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, token_params, default_market_params, modify_position_params,
    swap_params, swap_multiple_params
};
use haiko_lib::helpers::utils::{to_e18_u128, to_e18, encode_sqrt_price};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher,
) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let max: u256 = BoundedInt::max();
    let eth_params = token_params('Ethereum', 'ETH', 18, max, treasury());
    let btc_params = token_params('Bitcoin', 'BTC', 18, max, treasury());
    let usdc_params = token_params('USDC', 'USDC', 18, max, treasury());
    let erc20_class = declare("ERC20");
    let eth = deploy_token(erc20_class, eth_params);
    let btc = deploy_token(erc20_class, btc_params);
    let usdc = deploy_token(erc20_class, usdc_params);

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_eth = max;
    let initial_btc = max;
    let initial_usdc = max;
    fund(eth, alice(), initial_eth);
    fund(btc, alice(), initial_btc);
    fund(usdc, alice(), initial_usdc);
    approve(eth, alice(), market_manager.contract_address, initial_eth);
    approve(btc, alice(), market_manager.contract_address, initial_btc);
    approve(usdc, alice(), market_manager.contract_address, initial_usdc);

    (market_manager, eth, btc, usdc)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_quote_multiple() {
    let (market_manager, eth, btc, usdc) = before();

    // Create ETH/USDC market.
    let mut eth_usdc_market_params = default_market_params();
    eth_usdc_market_params.base_token = eth.contract_address;
    eth_usdc_market_params.quote_token = usdc.contract_address;
    eth_usdc_market_params.start_limit = OFFSET + 737780;
    let eth_usdc_market_id = create_market(market_manager, eth_usdc_market_params);

    // Create BTC/USDC market.
    let mut btc_usdc_market_params = default_market_params();
    btc_usdc_market_params.base_token = btc.contract_address;
    btc_usdc_market_params.quote_token = usdc.contract_address;
    btc_usdc_market_params.start_limit = OFFSET + 1016590;
    let btc_usdc_market_id = create_market(market_manager, btc_usdc_market_params);

    // Add liquidity positions.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut eth_usdc_position_params = modify_position_params(
        alice(),
        eth_usdc_market_id,
        OFFSET + 730000,
        OFFSET + 740000,
        I128Trait::new(to_e18_u128(20000000), false)
    );
    modify_position(market_manager, eth_usdc_position_params);

    let mut btc_usdc_position_params = modify_position_params(
        alice(),
        btc_usdc_market_id,
        OFFSET + 1010000,
        OFFSET + 1020000,
        I128Trait::new(to_e18_u128(1000000), false)
    );
    modify_position(market_manager, btc_usdc_position_params);

    // Fetch quote for ETH -> BTC swap.
    // let quote = quoter
    //     .quote_multiple(
    //         eth.contract_address,
    //         btc.contract_address,
    //         to_e18(1),
    //         array![eth_usdc_market_id, btc_usdc_market_id].span(),
    //     );

    // Extract quote from error message.
    let res = call_contract_syscall(
        address: market_manager.contract_address,
        entry_point_selector: selector!("quote_multiple"),
        calldata: array![
            eth.contract_address.into(),
            btc.contract_address.into(),
            to_e18(1).try_into().unwrap(),
            0.into(),
            2,
            eth_usdc_market_id,
            btc_usdc_market_id,
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
            assert(quote_msg == 'quote_multiple', 'QuoteInvalid');
            let low: u128 = (*error.at(1)).try_into().expect('QuoteLowOF');
            let high: u128 = (*error.at(2)).try_into().expect('QuoteHighOF');
            u256 { low, high }
        },
    };

    // Swap ETH for BTC.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut swap_params = swap_multiple_params(
        alice(),
        eth.contract_address,
        btc.contract_address,
        to_e18(1),
        array![eth_usdc_market_id, btc_usdc_market_id].span(),
        Option::None(()),
        Option::None(()),
    );
    let amount_out = swap_multiple(market_manager, swap_params);

    // Check amount out.
    assert(amount_out == quote, 'Quote multiple: amount out');
}
