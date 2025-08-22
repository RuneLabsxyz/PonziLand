use starknet::ContractAddress;
use starknet::contract_address_const;
use starknet::syscalls::call_contract_syscall;
use starknet::get_block_timestamp;
use starknet::class_hash::ClassHash;

use haiko_lib::id;
use haiko_lib::types::i128::I128Trait;
use haiko_lib::interfaces::IMarketManager::{
    IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::interfaces::IStrategy::{IStrategyDispatcher, IStrategyDispatcherTrait};
use haiko_lib::helpers::utils::to_e18;

use snforge_std::{start_prank, stop_prank, CheatTarget, declare, ContractClass, ContractClassTrait};
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

// This is a fork test that tests the functionality of the AMM after upgrading to 
// a new class hash.
// It is disabled by default and enabled only for contract upgrades.
// TODO: replace RPC URL with private one before running this test.
#[test]
#[fork("MAINNET")]
fn test_upgrade_market_manager() {
    // Define constants.
    let owner = contract_address_const::<
        0x043777A54D5e36179709060698118f1F6F5553Ca1918D1004b07640dFc425000
    >();
    let lp = contract_address_const::<
        0x0469334529F1414f16B7eC53Ce369e79928847cC6A022993f155B44D3378C50C
    >();
    let market_id = 0x2ed8f2415d626661678b075d24dee9f2853e1bfbd45660ad78d97a0930c6699;
    let old_class_hash: felt252 = 0x731820e650cf7522d36f262b26f8ba0961a916ec647e14a167f95dfd385d83a;
    let market_manager_addr = contract_address_const::<
        0x38925b0bcf4dce081042ca26a96300d9e181b910328db54a6c89e5451503f5
    >();

    // Define dispatchers.
    let market_manager = IMarketManagerDispatcher { contract_address: market_manager_addr };
    let market_info = market_manager.market_info(market_id);
    let base_token = ERC20ABIDispatcher { contract_address: market_info.base_token };
    let quote_token = ERC20ABIDispatcher { contract_address: market_info.quote_token };

    // Declare new class hash and upgrade contract.
    start_prank(CheatTarget::One(market_manager_addr), owner);
    let new_market_manager_class = declare("MarketManager");
    market_manager.upgrade(new_market_manager_class.class_hash);
    println!("Upgraded contracts");

    // Approve the contract to spend the tokens.
    start_prank(CheatTarget::One(market_info.base_token), lp);
    base_token.approve(market_manager_addr, to_e18(10000));
    stop_prank(CheatTarget::One(market_info.base_token));
    start_prank(CheatTarget::One(market_info.quote_token), lp);
    quote_token.approve(market_manager_addr, 10000 * 1000000);
    stop_prank(CheatTarget::One(market_info.quote_token));
    println!("Approved tokens");

    // Swap STRK to get some USDC.
    start_prank(CheatTarget::One(market_manager_addr), lp);
    let mut swap_amount = to_e18(500);
    market_manager
        .swap(
            market_id,
            false,
            to_e18(500),
            true,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );
    println!("Swapped to obtain USDC");

    // Test common ops.

    // 1. Create liquidity position
    let lower_limit = 5170000;
    let upper_limit = 5180000;
    let liquidity = 10000000000000000;
    market_manager
        .modify_position(market_id, lower_limit, upper_limit, I128Trait::new(liquidity, false));
    println!("1. Position created");

    // 2. Partially remove liquidity from position
    market_manager
        .modify_position(market_id, lower_limit, upper_limit, I128Trait::new(liquidity / 2, true));
    println!("2. Position partially removed");

    // 3. Swap to fill position
    market_manager
        .swap(
            market_id, false, to_e18(50), true, Option::None(()), Option::None(()), Option::None(())
        );
    println!("3. Swapped to fill position");

    // 4. Fully remove liquidity from position
    market_manager
        .modify_position(
            market_id, lower_limit, upper_limit, I128Trait::new(liquidity - liquidity / 2, true)
        );
    println!("4. Position fully removed");

    // 5. Create 1st order
    let order_limit = 5150000;
    let order_liquidity = 1000000000000000;
    let order_id_1 = market_manager.create_order(market_id, true, order_limit, order_liquidity);
    println!("5. Order 1 created");

    // 6. Collect 1st order
    market_manager.collect_order(market_id, order_id_1);
    println!("6. Order 1 collected");

    // 7. Create 2nd order
    let order_id_2 = market_manager.create_order(market_id, true, order_limit, order_liquidity);
    println!("7. Order 2 created");

    // 8. Swap to partially fill 2nd order
    swap_amount = to_e18(500);
    market_manager
        .swap(
            market_id,
            false,
            swap_amount,
            true,
            Option::None(()),
            Option::None(()),
            Option::None(())
        );
    println!("8. Swapped to partially fill 2nd order");

    // 9. Collect 2nd order
    market_manager.collect_order(market_id, order_id_2);
    println!("9. Order 2 collected");

    // 10. Downgrade back to old class hash (to test upgrade() function)
    start_prank(CheatTarget::One(market_manager_addr), owner);
    market_manager.upgrade(old_class_hash.try_into().unwrap());
    println!("10. Downgraded to old class hash");
}
