// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::interfaces::IQuoter::{IQuoterDispatcher, IQuoterDispatcherTrait};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve}, quoter::deploy_quoter
};
use haiko_lib::helpers::params::{
    owner, alice, default_token_params, default_market_params, modify_position_params, swap_params
};
use haiko_lib::helpers::utils::{to_e18, to_e18_u128, to_e28, encode_sqrt_price};

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, IQuoterDispatcher
) {
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

    // Deploy quoter.
    let quoter = deploy_quoter(owner(), market_manager.contract_address);

    (market_manager, base_token, quote_token, quoter)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_amounts_inside_order_array() {
    let (market_manager, base_token, quote_token, quoter) = before();

    // Create the market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET - 0;
    let market_id = create_market(market_manager, params);

    // Create order 1.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let order_id_1 = market_manager
        .create_order(market_id, true, OFFSET - 1000, to_e18_u128(10000));

    // Create order 2.
    let order_id_2 = market_manager.create_order(market_id, true, OFFSET - 500, to_e18_u128(10000));

    // Execute a swap.
    market_manager
        .swap(
            market_id,
            false,
            to_e18(1) / 10,
            true,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );

    // Create order 3.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let order_id_3 = market_manager
        .create_order(market_id, false, OFFSET + 500, to_e18_u128(10000));

    // Fetch amounts inside each order. 
    let (base_amount_1, quote_amount_1) = market_manager
        .amounts_inside_order(order_id_1, market_id);
    let (base_amount_2, quote_amount_2) = market_manager
        .amounts_inside_order(order_id_2, market_id);
    let (base_amount_3, quote_amount_3) = market_manager
        .amounts_inside_order(order_id_3, market_id);

    // Fetch amounts from array.
    let order_ids = array![order_id_1, order_id_2, order_id_3].span();
    let market_ids = array![market_id, market_id, market_id].span();
    let amounts = quoter.amounts_inside_order_array(order_ids, market_ids);
    let (base_amount_1a, quote_amount_1a) = *amounts.at(0);
    let (base_amount_2a, quote_amount_2a) = *amounts.at(1);
    let (base_amount_3a, quote_amount_3a) = *amounts.at(2);

    // Check that amounts are correct.
    assert(base_amount_1 == base_amount_1a, 'Base amount 1');
    assert(quote_amount_1 == quote_amount_1a, 'Quote amount 1');
    assert(base_amount_2 == base_amount_2a, 'Base amount 2');
    assert(quote_amount_2 == quote_amount_2a, 'Quote amount 2');
    assert(base_amount_3 == base_amount_3a, 'Base amount 3');
    assert(quote_amount_3 == quote_amount_3a, 'Quote amount 3');
}
