// Core lib imports.
use starknet::ContractAddress;

// Local imports.
use haiko_amm::contracts::mocks::manual_strategy::{
    ManualStrategy, IManualStrategyDispatcher, IManualStrategyDispatcherTrait
};

// External imports.
use snforge_std::{declare, ContractClassTrait, start_prank, stop_prank, CheatTarget};

pub fn deploy_strategy(owner: ContractAddress) -> IManualStrategyDispatcher {
    let contract = declare("ManualStrategy");
    let contract_address = contract.deploy(@array![owner.into()]).unwrap();
    IManualStrategyDispatcher { contract_address }
}

pub fn initialise_strategy(
    strategy: IManualStrategyDispatcher,
    owner: ContractAddress,
    name: felt252,
    symbol: felt252,
    version: felt252,
    market_manager: ContractAddress,
    market_id: felt252
) {
    start_prank(CheatTarget::One(strategy.contract_address), owner);
    strategy.initialise(name, symbol, version, market_manager, market_id,);
    stop_prank(CheatTarget::One(strategy.contract_address));
}
