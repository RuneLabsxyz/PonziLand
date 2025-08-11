// Core lib imports.
use cmp::{min, max};
use starknet::syscalls::call_contract_syscall;
use starknet::deploy_syscall;

// Local imports.
use haiko_lib::constants::{
    OFFSET, MIN_LIMIT, MIN_SQRT_PRICE, MAX_SQRT_PRICE, MAX_NUM_LIMITS, MAX_LIMIT
};
use haiko_lib::math::fee_math;
use haiko_lib::types::core::SwapParams;
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::{
    IMarketManager::{IMarketManagerDispatcher, IMarketManagerDispatcherTrait},
    IStrategy::{IStrategyDispatcher, IStrategyDispatcherTrait},
    IQuoter::{IQuoterDispatcher, IQuoterDispatcherTrait}
};
use haiko_amm::contracts::mocks::manual_strategy::{
    ManualStrategy, IManualStrategyDispatcher, IManualStrategyDispatcherTrait
};
use haiko_lib::helpers::params::{
    owner, treasury, token_params, default_market_params, modify_position_params, swap_params,
    swap_multiple_params, default_token_params
};
use haiko_lib::helpers::utils::{to_e28, to_e18, encode_sqrt_price};
use haiko_amm::tests::helpers::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap, swap_multiple},
    token::{deploy_token, fund, approve}, quoter::deploy_quoter
};
use haiko_amm::tests::helpers::strategy::{deploy_strategy, initialise_strategy};

// External imports.
use snforge_std::{start_prank, stop_prank, PrintTrait, declare, CheatTarget};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher,
    felt252,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    IQuoterDispatcher,
    IManualStrategyDispatcher
) {
    // Deploy market manager.
    let class = declare("MarketManager");
    let market_manager = deploy_market_manager(class, owner());

    // Deploy tokens.
    let (treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Deploy strategy.
    let strategy = deploy_strategy(owner());

    // Create market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET;
    params.width = 1;
    params.strategy = strategy.contract_address;
    let market_id = create_market(market_manager, params);

    // Initialise strategy.
    initialise_strategy(
        strategy,
        owner(),
        'ETH-USDC Manual 1 0.3%',
        'ETH-USDC MANU-1-0.3%',
        market_manager.contract_address,
        market_id
    );

    // Deploy quoter
    let quoter = deploy_quoter(owner(), market_manager.contract_address);

    // Fund strategy with initial token balances and approve market manager as spender.
    let base_amount = to_e28(500000000000000000);
    let quote_amount = to_e28(10000000000000000000);
    fund(base_token, strategy.contract_address, base_amount);
    fund(quote_token, strategy.contract_address, quote_amount);
    approve(base_token, strategy.contract_address, market_manager.contract_address, base_amount);
    approve(quote_token, strategy.contract_address, market_manager.contract_address, quote_amount);

    // Fund owner and approve spending by strategy and market manager.
    fund(base_token, owner(), base_amount);
    fund(quote_token, owner(), quote_amount);
    approve(base_token, owner(), market_manager.contract_address, base_amount);
    approve(quote_token, owner(), market_manager.contract_address, quote_amount);
    approve(base_token, owner(), strategy.contract_address, base_amount);
    approve(quote_token, owner(), strategy.contract_address, quote_amount);

    // Set strategy positions and deposit.
    start_prank(CheatTarget::One(strategy.contract_address), owner());
    strategy.set_positions(OFFSET - MIN_LIMIT, OFFSET - 1, OFFSET + 1, OFFSET + MAX_LIMIT);
    strategy.deposit(to_e18(100000000), to_e18(1125000000000));
    stop_prank(CheatTarget::One(strategy.contract_address));

    (market_manager, market_id, base_token, quote_token, quoter, strategy)
}

// Note: this test is currently disabled because it panics when run with `snforge`.
// In any case, it is a generalised version of the other quoter tests which pass with no issues
// when run with `cairo-test`. 
// TODO: debug at a later date.
#[test]
fn test_quote_fuzz(
    swap1_price: u128,
    swap1_amount: u128,
    swap2_price: u128,
    swap2_amount: u128,
    swap3_price: u128,
    swap3_amount: u128,
    swap4_price: u128,
    swap4_amount: u128,
    swap5_price: u128,
    swap5_amount: u128,
) {
    let (market_manager, market_id, base_token, quote_token, quoter, strategy) = before();

    // Initialise swap params
    let swap1_exact_input = swap1_price % 2 == 0;
    let swap2_exact_input = swap2_price % 2 == 0;
    let swap3_exact_input = swap3_price % 2 == 0;
    let swap4_exact_input = swap4_price % 2 == 0;
    let swap5_exact_input = swap5_price % 2 == 0;

    let swap1_amount_used = swap1_amount % 1000;
    let swap2_amount_used = swap2_amount % 1000;
    let swap3_amount_used = swap3_amount % 1000;
    let swap4_amount_used = swap4_amount % 1000;
    let swap5_amount_used = swap5_amount % 1000;

    let swap_params = array![
        (swap1_exact_input, swap1_amount_used, swap1_price),
        (swap2_exact_input, swap2_amount_used, swap2_price),
        (swap3_exact_input, swap3_amount_used, swap3_price),
        (swap4_exact_input, swap4_amount_used, swap4_price),
        (swap5_exact_input, swap5_amount_used, swap5_price)
    ]
        .span();

    // Look through and execute swaps.
    let mut j = 0;
    loop {
        if j >= swap_params.len() {
            break;
        }

        // Fetch swap case.
        let (exact_input, amount, threshold_sqrt_price) = *swap_params.at(0);

        // Execute swap, filtering out fail cases.
        if amount != 0 && threshold_sqrt_price != 0 {
            // Initialise swap params.
            let curr_sqrt_price = market_manager.market_state(market_id).curr_sqrt_price;
            let threshold_sqrt_price: u256 = threshold_sqrt_price.into();
            let amount_u256: u256 = amount.into();
            let is_buy = threshold_sqrt_price > curr_sqrt_price;
            let threshold_sqrt_price = if is_buy {
                min(threshold_sqrt_price, MAX_SQRT_PRICE - 1)
            } else {
                max(threshold_sqrt_price, MIN_SQRT_PRICE + 1)
            };

            // Note: we must execute the swap as `ManualStrategy` here because of a limitation with 
            // `snforge` prank. Calling `swap` with a different caller will fail because when
            // re-entering `MarketManager` to update positions, it continues to treat the caller
            // as the non-strategy LP.
            start_prank(
                CheatTarget::One(strategy.contract_address), market_manager.contract_address
            );
            start_prank(
                CheatTarget::One(market_manager.contract_address), strategy.contract_address
            );

            // Fetch quote without using quoter (for the same reasons outlined above).
            let mut calldata = array![
                market_id,
                is_buy.into(),
                amount_u256.low.into(),
                amount_u256.high.into(),
                exact_input.into(),
                0,
                threshold_sqrt_price.low.into(),
                threshold_sqrt_price.high.into()
            ];
            let res = call_contract_syscall(
                address: market_manager.contract_address,
                entry_point_selector: selector!("quote"),
                calldata: calldata.span(),
            );
            let quote: felt252 = match res {
                Result::Ok(_) => {
                    assert(false, 'QuoteResultOk');
                    0
                },
                Result::Err(error) => {
                    let quote = *error.at(0);
                    quote.into()
                },
            };
            'quote'.print();
            quote.print();

            // Execute swap.
            let mut params = swap_params(
                strategy.contract_address,
                market_id,
                is_buy,
                exact_input,
                amount_u256,
                Option::Some(threshold_sqrt_price),
                Option::None(()),
                Option::None(()),
            );
            let (amount_in, amount_out, _) = swap(market_manager, params);

            // Check quote.
            let quote_exp = if exact_input {
                amount_out
            } else {
                amount_in
            };
            'quote_exp'.print();
            quote_exp.print();
            assert(quote.into() == quote_exp, 'quote value not equal');
        }
        j += 1;
    }
}
