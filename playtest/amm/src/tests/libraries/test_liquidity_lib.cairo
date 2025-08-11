// Haiko imports.
use haiko_lib::types::i128::I128Trait;
use haiko_lib::constants::{OFFSET};
use haiko_lib::id;
use haiko_lib::types::core::{MarketConfigs, ConfigOption};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManager, IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, bob, treasury, default_token_params, default_market_params,
    modify_position_params, swap_params,
};
use haiko_lib::helpers::utils::{to_e18, to_e18_u128, to_e28, approx_eq};

// External imports.
use snforge_std::declare;
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

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
// TESTS
////////////////////////////////

#[test]
fn test_amounts_inside_position() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Create position.
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, I128Trait::new(to_e18_u128(10000), false)
    );
    modify_position(market_manager, params);

    // Check amounts inside position.
    let (base_amount, quote_amount, base_fees, quote_fees) = market_manager
        .amounts_inside_position(market_id, alice().into(), lower_limit, upper_limit);
    assert(base_amount == 49874959321712300625, 'Base amount 1');
    assert(quote_amount == 49874959321712300625, 'Quote amount 1');
    assert(base_fees == 0, 'Base fees 1');
    assert(quote_fees == 0, 'Quote fees 1');

    // Execute swaps.
    let mut params = swap_params(
        alice(),
        market_id,
        true,
        true,
        to_e18(10),
        Option::None(()),
        Option::None(()),
        Option::None(())
    );
    let (amount_in, amount_out, fees) = swap(market_manager, params);
    params =
        swap_params(
            alice(),
            market_id,
            false,
            true,
            to_e18(10),
            Option::None(()),
            Option::None(()),
            Option::None(())
        );
    let (amount_in_2, amount_out_2, fees_2) = swap(market_manager, params);

    // Recheck amounts inside position.
    let (base_amount_2, quote_amount_2, base_fees_2, quote_fees_2) = market_manager
        .amounts_inside_position(market_id, alice().into(), lower_limit, upper_limit);
    assert(
        approx_eq(base_amount_2, base_amount - amount_out + (amount_in_2 - fees_2), 10),
        'Base amount 2'
    );
    assert(
        approx_eq(quote_amount_2, quote_amount + (amount_in - fees) - amount_out_2, 10),
        'Quote amount 2'
    );
    assert(base_fees_2 == 30000000000000000, 'Base fees 2');
    assert(quote_fees_2 == 30000000000000000, 'Quote fees 2');
}
