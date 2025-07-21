// Core lib imports.
use starknet::ContractAddress;
use starknet::contract_address_const;
use core::integer::BoundedInt;

// Local imports.
use haiko_amm::contracts::market_manager::MarketManager;
use haiko_amm::contracts::market_manager::MarketManager::{
    ContractState as MMContractState, positionsContractMemberStateTrait as PositionsInternalState,
};
// Haiko imports.
use haiko_lib::math::{price_math, fee_math};
use haiko_lib::constants::{OFFSET, MAX_LIMIT, MIN_LIMIT};
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::types::core::{LimitInfo, Position};
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::types::i256::{i256, I256Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve},
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, default_token_params, default_market_params, modify_position_params,
    swap_params
};
use haiko_lib::helpers::utils::to_e28;

// External imports.
use snforge_std::declare;
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before(
    width: u32
) -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252) {
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
    params.width = width;
    params.start_limit = OFFSET - 0; // initial limit
    let market_id = create_market(market_manager, params);

    // Fund LP with initial token balances and approve market manager as spender.
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
fn test_reinitialise_fee_factor() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Create position
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let liq_abs = 100000;
    let mut liquidity = I128Trait::new(liq_abs, false);
    let mut params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, liquidity
    );
    modify_position(market_manager, params);

    // Swap so fee factors of position are non-zero.
    let mut is_buy = false;
    let exact_input = true;
    let amount = 100000;
    let mut swap_params = swap_params(
        alice(),
        market_id,
        is_buy,
        exact_input,
        amount,
        Option::None(()),
        Option::None(()),
        Option::None(()),
    );
    swap(market_manager, swap_params);

    // Swap back.
    is_buy = true;
    swap_params =
        swap_params(
            alice(),
            market_id,
            is_buy,
            exact_input,
            amount,
            Option::None(()),
            Option::None(()),
            Option::None(()),
        );
    swap(market_manager, swap_params);
    // print_fee_factors(market_manager, market_id, lower_limit, upper_limit);

    // Remove position.
    liquidity = I128Trait::new(liq_abs, true);
    params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
    // print_fee_factors(market_manager, market_id, lower_limit, upper_limit);

    // Adding liquidity to same limits should re-initialise fee factors.
    liquidity = I128Trait::new(liq_abs, false);
    params = modify_position_params(alice(), market_id, lower_limit, upper_limit, liquidity);
    modify_position(market_manager, params);
// print_fee_factors(market_manager, market_id, lower_limit, upper_limit);
}

#[test]
fn test_negative_position_fee_factor() {
    let (market_manager, _base_token, _quote_token, market_id) = before(width: 1);

    // Create position
    let lower_limit = OFFSET - 1000;
    let upper_limit = OFFSET + 1000;
    let liquidity = I128Trait::new(100000, false);
    let mut params = modify_position_params(
        alice(), market_id, lower_limit, upper_limit, liquidity
    );
    modify_position(market_manager, params);

    // Swap so fee factors of position are non-zero.
    let mut swap_params = swap_params(
        alice(),
        market_id,
        false,
        true,
        100000,
        Option::None(()),
        Option::None(()),
        Option::None(()),
    );
    swap(market_manager, swap_params);

    swap_params.is_buy = true;
    swap(market_manager, swap_params);

    // Create new position at new position below, with top limit overlapping existing. This should 
    // result in position fee factor underflow if negative fee factors not correctly handled.
    params.lower_limit = OFFSET - 2000;
    params.upper_limit = OFFSET - 1000;
    modify_position(market_manager, params);
}

#[test]
#[should_panic(expected: ('BaseFeeFactorLastOF',))]
fn test_fee_factor_store_packing_overflow() {
    before(width: 1);

    // Create position with fee factors > max allowable
    let position = Position {
        liquidity: 10000,
        base_fee_factor_last: I256Trait::new(BoundedInt::max(), false),
        quote_fee_factor_last: I256Trait::new(BoundedInt::max(), false),
    };
    let mut state: MMContractState = MarketManager::unsafe_new_contract_state();
    state.positions.write(1, position);
}

////////////////////////////////
// INTERNAL HELPERS
////////////////////////////////

fn print_fee_factors(
    market_manager: IMarketManagerDispatcher,
    market_id: felt252,
    lower_limit: u32,
    upper_limit: u32,
) {
    let market_state = market_manager.market_state(market_id);
    println!("Global base fee factor: {}", market_state.base_fee_factor);
    println!("Global quote fee factor: {}", market_state.quote_fee_factor);

    let lower_limit_info = market_manager.limit_info(market_id, lower_limit);
    let upper_limit_info = market_manager.limit_info(market_id, upper_limit);
    println!("Lower limit base fee factor: {}", lower_limit_info.base_fee_factor);
    println!("Lower limit quote fee factor: {}", lower_limit_info.quote_fee_factor);
    println!("Upper limit base fee factor: {}", upper_limit_info.base_fee_factor);
    println!("Upper limit quote fee factor: {}", upper_limit_info.quote_fee_factor);

    let position = market_manager.position(market_id, alice().into(), lower_limit, upper_limit);
    println!(
        "Position base fee factor: {} (sign: {})",
        position.base_fee_factor_last.val,
        position.base_fee_factor_last.sign
    );
    println!(
        "Position quote fee factor: {} (sign: {})",
        position.quote_fee_factor_last.val,
        position.quote_fee_factor_last.sign
    );
    let (_, _, pos_base_fee_factor, pos_quote_fee_factor) = fee_math::get_fee_inside(
        position,
        lower_limit_info,
        upper_limit_info,
        lower_limit,
        upper_limit,
        market_state.curr_limit,
        market_state.base_fee_factor,
        market_state.quote_fee_factor,
    );
    println!(
        "Position base fee factor: {} (sign: {})", pos_base_fee_factor.val, pos_base_fee_factor.sign
    );
    println!(
        "Position quote fee factor: {} (sign: {})",
        pos_quote_fee_factor.val,
        pos_quote_fee_factor.sign
    );
}
