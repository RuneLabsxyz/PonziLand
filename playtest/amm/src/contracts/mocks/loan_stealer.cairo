// This is a test contract to show a now patched attack vector with flash loans. Previously, a borrower
// was able to borrow funds from the market and deposit the same funds as liquidity to the market.
// Because the market implemented checks on its token balance before and after the loan, the borrower
// was able to withdraw the borrowed funds without returning them. This is no longer possible as 
// `flash_loan` now uses an explicit `transferFrom` operation to retrieve borrowed funds + fees.

#[starknet::interface]
pub trait ILoanStealer<TContractState> {
    // Set the market id for the default market created in `test_flash_loan.cairo`
    fn set_market_id(ref self: TContractState, market_id: felt252);
}

#[starknet::contract]
pub mod LoanStealer {
    // Core lib imports.
    use starknet::ContractAddress;

    // Local imports.
    use super::ILoanStealer;
    use haiko_lib::interfaces::ILoanReceiver::ILoanReceiver;
    use haiko_lib::constants::OFFSET;
    use haiko_lib::interfaces::IMarketManager::{
        IMarketManagerDispatcher, IMarketManagerDispatcherTrait
    };
    use haiko_lib::types::i128::{i128, I128Trait};
    use haiko_lib::helpers::utils::{to_e28, to_e18_u128};

    // Third party imports.
    use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

    #[storage]
    struct Storage {
        market_manager: ContractAddress,
        market_id: felt252,
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
            // Use borrowed funds to deposit liquidity to the market
            let market_manager_addr = self.market_manager.read();
            let market_manager = IMarketManagerDispatcher { contract_address: market_manager_addr };

            // Market id corresponding to the default market created in `test_flash_loan.cairo`
            let market_id = self.market_id.read();

            // Compute liquidity amount by converting to token amount.
            // Place at 1 limit above current so we need to deposit only base token.
            let lower_limit = OFFSET + 10001;
            let upper_limit = OFFSET + 10002;
            let liquidity = market_manager
                .amount_to_liquidity(market_id, false, lower_limit, amount + fee);
            let liquidity_delta = I128Trait::new(liquidity, false);
            market_manager.modify_position(market_id, lower_limit, upper_limit, liquidity_delta);

            // Approve market manager to transfer back borrowed funds plus fees
            let token_dispatcher = ERC20ABIDispatcher { contract_address: token };
            token_dispatcher.approve(market_manager_addr, amount + fee);
        }
    }

    #[abi(embed_v0)]
    impl LoanStealer of ILoanStealer<ContractState> {
        // Set the market id for the default market created in `test_flash_loan.cairo`
        fn set_market_id(ref self: ContractState, market_id: felt252) {
            self.market_id.write(market_id);
        }
    }
}
