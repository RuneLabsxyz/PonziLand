/// @title Payable Component
/// @notice Handles token transfers and validations

use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
use starknet::ContractAddress;

/// @notice Result of token validation
#[derive(Drop, Serde, Debug, Copy)]
pub struct ValidationResult {
    status: bool,
    token_address: ContractAddress,
    amount: u256,
}

#[starknet::interface]
trait IPayable<TContractState> {
    /// @notice Initialize the token dispatcher with a specific token
    /// @param token_address The address of the ERC20 token to use
    fn initialize(ref self: TContractState, token_address: ContractAddress);

    /// @notice Validate if an account has sufficient token balance
    /// @param token_address The token contract address to check
    /// @param sender The account whose balance is being checked
    /// @param amount The required token amount
    /// @return ValidationResult with status and token details
    fn validate(
        ref self: TContractState,
        token_address: ContractAddress,
        sender: ContractAddress,
        amount: u256,
    ) -> ValidationResult;

    fn transfer_from(
        self: @TContractState,
        from: ContractAddress,
        to: ContractAddress,
        validation_result: ValidationResult,
    ) -> bool;

    fn transfer(
        self: @TContractState, recipient: ContractAddress, validation_result: ValidationResult,
    ) -> bool;

    /// @notice Process a payment with fee deduction
    /// @param buyer The account making the payment
    /// @param seller The account receiving the payment (after fees)
    /// @param fee_rate The fee rate in basis points
    /// @param our_contract_for_fee The address receiving the fee
    /// @param validation_result Pre-validated transfer details
    /// @return bool True if payment was processed successfully
    fn proccess_payment_with_fee_for_buy(
        self: @TContractState,
        buyer: ContractAddress,
        seller: ContractAddress,
        fee_rate: u128,
        our_contract_for_fee: ContractAddress,
        validation_result: ValidationResult,
    ) -> bool;

    fn validate_and_execute_bid_payment(
        ref self: TContractState,
        token_address: ContractAddress,
        payer: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;

    fn balance_of(
        ref self: TContractState, token_address: ContractAddress, owner: ContractAddress,
    ) -> u256;
}

#[starknet::component]
mod PayableComponent {
    // Starknet imports

    // External dependencies
    use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    // Constants
    use ponzi_land::consts::{SCALE_FACTOR_FOR_FEE};

    // Errors
    use ponzi_land::errors::{
        DIFFERENT_ERC20_TOKEN_DISPATCHER, ERC20_PAY_FAILED, ERC20_PAY_FOR_BID_FAILED,
        ERC20_PAY_FOR_BUY_FAILED, ERC20_VALIDATE_AMOUNT_BID,
    };

    // Helpers
    use ponzi_land::helpers::taxes::{calculate_and_return_taxes_with_fee};

    // Store
    use ponzi_land::store::{Store, StoreTrait};
    use starknet::ContractAddress;
    use super::ValidationResult;
    #[storage]
    struct Storage {
        token_dispatcher: IERC20CamelDispatcher,
    }

    impl PayableImpl<
        TContractState, +HasComponent<TContractState>,
    > of super::IPayable<ComponentState<TContractState>> {
        fn initialize(ref self: ComponentState<TContractState>, token_address: ContractAddress) {
            self.token_dispatcher.write(IERC20CamelDispatcher { contract_address: token_address });
        }


        fn validate(
            ref self: ComponentState<TContractState>,
            token_address: ContractAddress,
            sender: ContractAddress,
            amount: u256,
        ) -> ValidationResult {
            self.initialize(token_address);
            let sender_balance = self.token_dispatcher.read().balanceOf(sender);
            let status = sender_balance >= amount;
            let token_address_felt: felt252 = token_address.into();
            ValidationResult { status, token_address, amount }
        }

        fn transfer_from(
            self: @ComponentState<TContractState>,
            from: ContractAddress,
            to: ContractAddress,
            validation_result: ValidationResult,
        ) -> bool {
            let token_dispatcher = self.token_dispatcher.read();
            assert(
                token_dispatcher.contract_address == validation_result.token_address,
                DIFFERENT_ERC20_TOKEN_DISPATCHER,
            );
            token_dispatcher.transferFrom(from, to, validation_result.amount)
        }

        fn transfer(
            self: @ComponentState<TContractState>,
            recipient: ContractAddress,
            validation_result: ValidationResult,
        ) -> bool {
            let token_dispatcher = self.token_dispatcher.read();
            assert(
                token_dispatcher.contract_address == validation_result.token_address,
                DIFFERENT_ERC20_TOKEN_DISPATCHER,
            );
            token_dispatcher.transfer(recipient, validation_result.amount)
        }

        fn proccess_payment_with_fee_for_buy(
            self: @ComponentState<TContractState>,
            buyer: ContractAddress,
            seller: ContractAddress,
            fee_rate: u128,
            our_contract_for_fee: ContractAddress,
            validation_result: ValidationResult,
        ) -> bool {
            let token_dispatcher = self.token_dispatcher.read();

            let token_address_felt: felt252 = token_dispatcher.contract_address.into();
            assert(
                token_dispatcher.contract_address == validation_result.token_address,
                DIFFERENT_ERC20_TOKEN_DISPATCHER,
            );

            let (amount_for_seller, fee_amount) = calculate_and_return_taxes_with_fee(
                validation_result.amount, fee_rate,
            );

            let contract_felt: felt252 = our_contract_for_fee.into();
            // Perform the first transfer and check if it was successful
            let fee_transfer_success = token_dispatcher
                .transferFrom(buyer, our_contract_for_fee, fee_amount.try_into().unwrap());
            if !fee_transfer_success {
                return false; // Exit early if the fee transfer fails
            }

            let status = token_dispatcher.transferFrom(buyer, seller, amount_for_seller);
            assert(status, ERC20_PAY_FOR_BUY_FAILED);
            true
        }

        fn validate_and_execute_bid_payment(
            ref self: ComponentState<TContractState>,
            token_address: ContractAddress,
            payer: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) -> bool {
            let validation_result = self.validate(token_address, payer, amount);
            assert(validation_result.status, ERC20_VALIDATE_AMOUNT_BID);

            let payment_status = self.transfer_from(payer, recipient, validation_result);
            assert(payment_status, ERC20_PAY_FOR_BID_FAILED);

            true
        }

        fn balance_of(
            ref self: ComponentState<TContractState>,
            token_address: ContractAddress,
            owner: ContractAddress,
        ) -> u256 {
            self.initialize(token_address);
            self.token_dispatcher.read().balanceOf(owner)
        }
    }
}
