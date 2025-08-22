// Core lib imports.
use core::integer::BoundedInt;

// Haiko imports.
use haiko_lib::constants::{OFFSET, MAX_LIMIT};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::interfaces::IQuoter::{IQuoterDispatcher, IQuoterDispatcherTrait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap, swap_multiple},
    token::{deploy_token, fund, approve}, quoter::deploy_quoter
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
    IMarketManagerDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    IQuoterDispatcher
) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let max: u256 = BoundedInt::max();
    let eth_params = token_params('Ethereum', 'ETH', 18, max, treasury());
    let btc_params = token_params('Bitcoin', 'BTC', 18, max, treasury());
    let usdc_params = token_params('USDC', 'USDC', 18, max, treasury());
    let usdt_params = token_params('USDT', 'USDT', 18, max, treasury());
    let dai_params = token_params('DAI', 'DAI', 18, max, treasury());
    let erc20_class = declare("ERC20");
    let eth = deploy_token(erc20_class, eth_params);
    let btc = deploy_token(erc20_class, btc_params);
    let usdc = deploy_token(erc20_class, usdc_params);
    let usdt = deploy_token(erc20_class, usdt_params);
    let dai = deploy_token(erc20_class, dai_params);

    // Fund LP with initial token balances and approve market manager as spender.
    fund(eth, alice(), max);
    fund(btc, alice(), max);
    fund(usdc, alice(), max);
    fund(usdt, alice(), max);
    fund(dai, alice(), max);
    approve(eth, alice(), market_manager.contract_address, max);
    approve(btc, alice(), market_manager.contract_address, max);
    approve(usdc, alice(), market_manager.contract_address, max);
    approve(usdt, alice(), market_manager.contract_address, max);
    approve(dai, alice(), market_manager.contract_address, max);

    // Deploy quoter.
    let quoter = deploy_quoter(owner(), market_manager.contract_address);

    (market_manager, eth, btc, usdc, usdt, dai, quoter)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_quote_multiple_array() {
    let (market_manager, eth, btc, usdc, usdt, dai, quoter) = before();

    // Create ETH/USDC market.
    let mut eth_market_params = default_market_params();
    eth_market_params.base_token = eth.contract_address;
    eth_market_params.quote_token = usdc.contract_address;
    eth_market_params.start_limit = OFFSET + 737780;
    let eth_usdc_market_id = create_market(market_manager, eth_market_params);

    // Create BTC/USDC market.
    let mut btc_market_params = default_market_params();
    btc_market_params.base_token = btc.contract_address;
    btc_market_params.quote_token = usdc.contract_address;
    btc_market_params.start_limit = OFFSET + 1016590;
    let btc_usdc_market_id = create_market(market_manager, btc_market_params);

    // Create ETH/USDT market.
    eth_market_params.quote_token = usdt.contract_address;
    eth_market_params.start_limit = OFFSET + 737775;
    let eth_usdt_market_id = create_market(market_manager, eth_market_params);

    // Create BTC/USDT market.
    btc_market_params.quote_token = usdt.contract_address;
    btc_market_params.start_limit = OFFSET + 1016580;
    let btc_usdt_market_id = create_market(market_manager, btc_market_params);

    // Create ETH/DAI market.
    eth_market_params.quote_token = dai.contract_address;
    eth_market_params.start_limit = OFFSET + 737785;
    let eth_dai_market_id = create_market(market_manager, eth_market_params);

    // Create BTC/DAI market.
    btc_market_params.quote_token = dai.contract_address;
    btc_market_params.start_limit = OFFSET + 1016600;
    let btc_dai_market_id = create_market(market_manager, btc_market_params);

    // Add liquidity positions.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut eth_position_params = modify_position_params(
        alice(),
        eth_usdc_market_id,
        OFFSET + 730000,
        OFFSET + 740000,
        I128Trait::new(to_e18_u128(20000000), false)
    );
    modify_position(market_manager, eth_position_params);
    let mut btc_position_params = modify_position_params(
        alice(),
        btc_usdc_market_id,
        OFFSET + 1010000,
        OFFSET + 1020000,
        I128Trait::new(to_e18_u128(1000000), false)
    );
    modify_position(market_manager, btc_position_params);

    eth_position_params.market_id = eth_usdt_market_id;
    eth_position_params.liquidity_delta = I128Trait::new(to_e18_u128(17500000), false);
    modify_position(market_manager, eth_position_params);

    btc_position_params.market_id = btc_usdt_market_id;
    btc_position_params.liquidity_delta = I128Trait::new(to_e18_u128(2000000), false);
    modify_position(market_manager, btc_position_params);

    eth_position_params.market_id = eth_dai_market_id;
    eth_position_params.liquidity_delta = I128Trait::new(to_e18_u128(16200000), false);
    modify_position(market_manager, eth_position_params);

    btc_position_params.market_id = btc_dai_market_id;
    btc_position_params.liquidity_delta = I128Trait::new(to_e18_u128(1700000), false);
    modify_position(market_manager, btc_position_params);

    // Fetch quotes for ETH -> BTC swap.
    let routes = array![
        eth_usdc_market_id,
        btc_usdc_market_id,
        eth_usdt_market_id,
        btc_usdt_market_id,
        eth_dai_market_id,
        btc_dai_market_id,
    ]
        .span();
    let route_lens: Span<u8> = array![2, 2, 2].span();
    let amount = to_e18(1);
    let quotes = quoter
        .unsafe_quote_multiple_array(
            eth.contract_address, btc.contract_address, amount, routes, route_lens
        );

    // Swap ETH for BTC and check amounts out.
    start_prank(CheatTarget::One(market_manager.contract_address), alice());
    let mut i = 0;
    loop {
        if i == route_lens.len() {
            break;
        }
        let swap_params = swap_multiple_params(
            alice(),
            eth.contract_address,
            btc.contract_address,
            amount,
            array![*routes.at((i + 1) * 2 - 2), *routes.at((i + 1) * 2 - 1)].span(),
            Option::None(()),
            Option::None(()),
        );
        let amount_out = swap_multiple(market_manager, swap_params);
        // Check amount out.
        let quote = *quotes.at(i);
        assert(amount_out == quote, 'Quote multiple: amount out');
        i += 1;
    };
}
