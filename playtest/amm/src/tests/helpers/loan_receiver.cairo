// Core lib imports.
use starknet::ContractAddress;

// Haiko imports.
use haiko_lib::interfaces::ILoanReceiver::{ILoanReceiverDispatcher, ILoanReceiverDispatcherTrait};

// External imports.
use snforge_std::{declare, ContractClassTrait};

pub fn deploy_loan_stealer(market_manager: ContractAddress) -> ILoanReceiverDispatcher {
    let contract = declare("LoanStealer");
    let contract_address = contract.deploy(@array![market_manager.into()]).unwrap();
    ILoanReceiverDispatcher { contract_address }
}
