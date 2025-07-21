// Haiko imports.
use haiko_lib::constants::OFFSET;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::types::core::Depth;
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, bob, treasury, default_token_params, default_market_params,
    modify_position_params, config
};
use haiko_lib::helpers::utils::to_e28;

// External imports.
use snforge_std::{start_prank, stop_prank, CheatTarget, declare};
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

    fund(base_token, bob(), initial_base_amount);
    fund(quote_token, bob(), initial_quote_amount);
    approve(base_token, bob(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, bob(), market_manager.contract_address, initial_quote_amount);

    (market_manager, base_token, quote_token, market_id)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_depth() {
    let (market_manager, _base_token, _quote_token, market_id) = before();

    // Place some positions.
    let mut params = modify_position_params(alice(), market_id, 0, 10, I128Trait::new(1000, false));
    modify_position(market_manager, params);

    params =
        modify_position_params(
            bob(), market_id, OFFSET - 1000, OFFSET + 2000, I128Trait::new(15000, false)
        );
    modify_position(market_manager, params);

    params =
        modify_position_params(
            alice(), market_id, OFFSET + 390000, OFFSET + 400000, I128Trait::new(200, false)
        );
    modify_position(market_manager, params);

    params =
        modify_position_params(
            bob(), market_id, OFFSET + 400000, OFFSET + 500000, I128Trait::new(2000, false)
        );
    modify_position(market_manager, params);

    // We expect the following liquidity_deltas:
    // 1. 0: 1000 [Alice]
    // 2. 10: -1000 [Alice]
    // 3. 7905625: 15000 [Bob]
    // 4. 7908625: -15000 [Bob]
    // 5. 8296625: 200 [Alice]
    // 6. 8306625: 1800 [Alice, Bob]
    // 7. 8406625: -2000 [Bob]

    // Query depth and check it.
    let depth = market_manager.depth(market_id);

    let mut expected = array![
        (0, I128Trait::new(1000, false)),
        (10, I128Trait::new(1000, true)),
        (7905625, I128Trait::new(15000, false)),
        (7908625, I128Trait::new(15000, true)),
        (8296625, I128Trait::new(200, false)),
        (8306625, I128Trait::new(1800, false)),
        (8406625, I128Trait::new(2000, true)),
    ];

    assert(depth.len() == 7, 'length');

    let mut i = 0;
    loop {
        if i >= depth.len() {
            break;
        }
        let data: Depth = *depth.at(i);
        let (exp_limit, exp_liq_delta) = *expected.at(i);
        assert(data.limit == exp_limit, 'limit case 01' + i.into());
        assert(data.liquidity_delta == exp_liq_delta, 'liqD case 01' + i.into());
        i += 1;
    }
}
