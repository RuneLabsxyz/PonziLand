// Core lib imports.
use starknet::ContractAddress;
use starknet::contract_address_const;

// Local imports.
use haiko_amm::contracts::market_manager::MarketManager;
use haiko_amm::contracts::mocks::manual_strategy::{
    ManualStrategy, IManualStrategyDispatcher, IManualStrategyDispatcherTrait
};

// Haiko imports.
use haiko_lib::constants::OFFSET;
use haiko_lib::math::{fee_math, price_math, liquidity_math};
use haiko_lib::types::i128::{I128Trait};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market}, token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, token_params, default_market_params, default_token_params,
};
use haiko_amm::tests::helpers::strategy::{deploy_strategy, initialise_strategy};
use haiko_lib::helpers::utils::{to_e28, to_e18, to_e18_u128, encode_sqrt_price};

// External imports.
use snforge_std::{
    start_prank, stop_prank, declare, spy_events, SpyOn, EventSpy, EventAssertions, CheatTarget
};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (
    IMarketManagerDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    ERC20ABIDispatcher,
    felt252,
    felt252,
) {
    // Deploy market manager.
    let class = declare("MarketManager");
    let market_manager = deploy_market_manager(class, owner());

    // Deploy tokens.
    let (_treasury, eth_params, usdc_params) = default_token_params();
    let btc_params = token_params(
        'Bitcoin', 'BTC', 18, to_e28(5000000000000000000000000000000000000000000), treasury()
    );
    let erc20_class = declare("ERC20");
    let eth = deploy_token(erc20_class, eth_params);
    let usdc = deploy_token(erc20_class, usdc_params);
    let btc = deploy_token(erc20_class, btc_params);

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_amount = to_e28(100000000000000000000);
    fund(eth, alice(), initial_amount);
    fund(usdc, alice(), initial_amount);
    fund(btc, alice(), initial_amount);
    approve(eth, alice(), market_manager.contract_address, initial_amount);
    approve(usdc, alice(), market_manager.contract_address, initial_amount);
    approve(btc, alice(), market_manager.contract_address, initial_amount);

    let mut params = default_market_params();

    // Create ETH / USDC market.
    params.base_token = eth.contract_address;
    params.quote_token = usdc.contract_address;
    params.start_limit = OFFSET + 737780;
    params.width = 1;
    let eth_usdc_id = create_market(market_manager, params);

    // Create bTC / USDC market.
    params.base_token = btc.contract_address;
    params.quote_token = usdc.contract_address;
    params.start_limit = OFFSET + 1057870;
    params.width = 1;
    let btc_usdc_id = create_market(market_manager, params);

    (market_manager, eth, usdc, btc, eth_usdc_id, btc_usdc_id)
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_multi_swap_events() {
    let (market_manager, eth, _usdc, btc, eth_usdc_id, btc_usdc_id) = before();

    start_prank(CheatTarget::One(market_manager.contract_address), alice());

    // Create position in ETH / USDC market.
    market_manager
        .modify_position(
            eth_usdc_id,
            OFFSET + 737000,
            OFFSET + 738000,
            I128Trait::new(to_e18_u128(100000), false)
        );
    // Create position in BTC / USDC market.
    market_manager
        .modify_position(
            btc_usdc_id,
            OFFSET + 1050000,
            OFFSET + 1060000,
            I128Trait::new(to_e18_u128(100000), false)
        );

    let mut spy = spy_events(SpyOn::One(market_manager.contract_address));

    // Swapping across both markets should fire 2 x `Swap` and 1 x `MultiSwap`
    let swap_amount = to_e18(1);
    let amount_out = market_manager
        .swap_multiple(
            eth.contract_address,
            btc.contract_address,
            swap_amount,
            array![eth_usdc_id, btc_usdc_id].span(),
            Option::None(()),
            Option::None(()),
        );
    let swap_id = 1;

    let eth_usdc_state = market_manager.market_state(eth_usdc_id);
    let btc_usdc_state = market_manager.market_state(btc_usdc_id);

    spy
        .assert_emitted(
            @array![
                (
                    market_manager.contract_address,
                    MarketManager::Event::Swap(
                        MarketManager::Swap {
                            caller: alice(),
                            market_id: eth_usdc_id,
                            is_buy: false,
                            exact_input: true,
                            amount_in: swap_amount,
                            amount_out: 1594570788501650188912,
                            fees: 3000000000000000,
                            end_limit: eth_usdc_state.curr_limit,
                            end_sqrt_price: eth_usdc_state.curr_sqrt_price,
                            market_liquidity: eth_usdc_state.liquidity,
                            swap_id,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::Swap(
                        MarketManager::Swap {
                            caller: alice(),
                            market_id: btc_usdc_id,
                            is_buy: true,
                            exact_input: true,
                            amount_in: 1594570788501650188911,
                            amount_out,
                            fees: 4783712365504950566,
                            end_limit: btc_usdc_state.curr_limit,
                            end_sqrt_price: btc_usdc_state.curr_sqrt_price,
                            market_liquidity: btc_usdc_state.liquidity,
                            swap_id,
                        }
                    )
                ),
                (
                    market_manager.contract_address,
                    MarketManager::Event::MultiSwap(
                        MarketManager::MultiSwap {
                            caller: alice(),
                            swap_id,
                            in_token: eth.contract_address,
                            out_token: btc.contract_address,
                            amount_in: swap_amount,
                            amount_out,
                        }
                    )
                ),
            ]
        );
}
