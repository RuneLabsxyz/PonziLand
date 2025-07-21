#[starknet::contract]
pub mod LoanReceiver {
    use starknet::ContractAddress;
    use haiko_lib::interfaces::ILoanReceiver::ILoanReceiver;
    use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

    #[storage]
    struct Storage {
        market_manager: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, market_manager: ContractAddress) {
        self.market_manager.write(market_manager);
    }

    #[abi(embed_v0)]
    impl LoanReceiver of ILoanReceiver<ContractState> {
        // Callback function for flash loan.
        // Receiver must approve market manager to transfer back the borrowed tokens plus fees.
        //
        // # Arguments
        // * `token` - address of the token being borrowed
        // * `amount` - amount of the token being borrowed (excludes fee)
        // * `fee` - flash loan fee
        fn on_flash_loan(
            ref self: ContractState, token: ContractAddress, amount: u256, fee: u256,
        ) {
            let dispatcher = ERC20ABIDispatcher { contract_address: token };
            dispatcher.approve(self.market_manager.read(), amount + fee);
        }
    }
}
