// Haiko imports.
use haiko_lib::id;
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::interfaces::IQuoter::{IQuoterDispatcher, IQuoterDispatcherTrait};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::params::{
    owner, alice, default_token_params, default_market_params, modify_position_params, swap_params
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve}, quoter::deploy_quoter
};
use haiko_lib::helpers::utils::{to_e18, to_e18_u128, to_e28, encode_sqrt_price};

// External imports.
use snforge_std::declare;
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252, IQuoterDispatcher
) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Create the market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = OFFSET + 0;
    let market_id = create_market(market_manager, params);

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(5000000000000000000000000000000000000000000);
    let initial_quote_amount = to_e28(100000000000000000000000000000000000000000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);

    // Deploy quoter.
    let quoter = deploy_quoter(owner(), market_manager.contract_address);

    (market_manager, base_token, quote_token, market_id, quoter)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_amounts_inside_position_array() {
    let (market_manager, _base_token, _quote_token, market_id, quoter) = before();

    // Mint position 1.
    let params_1 = modify_position_params(
        alice(), market_id, OFFSET - 1000, OFFSET + 1000, I128Trait::new(to_e18_u128(10000), false),
    );
    modify_position(market_manager, params_1);

    // Mint position 2.
    let params_2 = modify_position_params(
        alice(), market_id, OFFSET - 500, OFFSET - 400, I128Trait::new(to_e18_u128(10000), false),
    );
    modify_position(market_manager, params_2);

    // Execute a swap.
    let swap_params = swap_params(
        alice(),
        market_id,
        false,
        true,
        to_e18(30),
        Option::None(()),
        Option::None(()),
        Option::None(()),
    );
    swap(market_manager, swap_params);

    // Mint position 3.
    let params_3 = modify_position_params(
        alice(), market_id, OFFSET + 400, OFFSET + 500, I128Trait::new(to_e18_u128(10000), false),
    );
    modify_position(market_manager, params_3);

    // Fetch amounts inside each position. 
    let (base_amount_1, quote_amount_1, base_fees_1, quote_fees_1) = market_manager
        .amounts_inside_position(
            market_id, alice().into(), params_1.lower_limit, params_1.upper_limit
        );
    let (base_amount_2, quote_amount_2, base_fees_2, quote_fees_2) = market_manager
        .amounts_inside_position(
            market_id, alice().into(), params_2.lower_limit, params_2.upper_limit
        );
    let (base_amount_3, quote_amount_3, base_fees_3, quote_fees_3) = market_manager
        .amounts_inside_position(
            market_id, alice().into(), params_3.lower_limit, params_3.upper_limit
        );

    // Fetch amounts from array.
    let market_ids = array![market_id, market_id, market_id].span();
    let owners = array![alice().into(), alice().into(), alice().into()].span();
    let lower_limits = array![params_1.lower_limit, params_2.lower_limit, params_3.lower_limit]
        .span();
    let upper_limits = array![params_1.upper_limit, params_2.upper_limit, params_3.upper_limit]
        .span();
    let amounts = quoter
        .amounts_inside_position_array(market_ids, owners, lower_limits, upper_limits);
    let (base_amount_1a, quote_amount_1a, base_fees_1a, quote_fees_1a) = *amounts.at(0);
    let (base_amount_2a, quote_amount_2a, base_fees_2a, quote_fees_2a) = *amounts.at(1);
    let (base_amount_3a, quote_amount_3a, base_fees_3a, quote_fees_3a) = *amounts.at(2);

    // Check that amounts are correct.
    assert(base_amount_1a == base_amount_1, 'Base amount 1');
    assert(quote_amount_1a == quote_amount_1, 'Quote amount 1');
    assert(base_fees_1a == base_fees_1, 'Base fees 1');
    assert(quote_fees_1a == quote_fees_1, 'Quote fees 1');
    assert(base_amount_2a == base_amount_2, 'Base amount 2');
    assert(quote_amount_2a == quote_amount_2, 'Quote amount 2');
    assert(base_fees_2a == base_fees_2, 'Base fees 2');
    assert(quote_fees_2a == quote_fees_2, 'Quote fees 2');
    assert(base_amount_3a == base_amount_3, 'Base amount 3');
    assert(quote_amount_3a == quote_amount_3, 'Quote amount 3');
    assert(base_fees_3a == base_fees_3, 'Base fees 3');
    assert(quote_fees_3a == quote_fees_3, 'Quote fees 3');
}
