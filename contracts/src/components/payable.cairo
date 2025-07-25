use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
use starknet::ContractAddress;

#[derive(Drop, Serde, Debug, Copy)]
pub struct ValidationResult {
    status: bool,
    token_address: ContractAddress,
    amount: u256,
}

#[starknet::interface]
trait IPayable<TContractState> {
    fn initialize(ref self: TContractState, token_address: ContractAddress);
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
    fn pay_to_us(
        self: @TContractState, sender: ContractAddress, validation_result: ValidationResult,
    ) -> bool;
    fn proccess_payment_with_fee_for_buy(
        self: @TContractState,
        buyer: ContractAddress,
        seller: ContractAddress,
        fee_rate: u128,
        our_contract_for_fee: ContractAddress,
        validation_result: ValidationResult,
    ) -> bool;


    fn balance_of(
        ref self: TContractState, token_address: ContractAddress, owner: ContractAddress,
    ) -> u256;
}

#[starknet::component]
mod PayableComponent {
    use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
    use starknet::ContractAddress;
    use super::ValidationResult;
    use ponzi_land::consts::{OUR_CONTRACT_SEPOLIA_ADDRESS, SCALE_FACTOR_FOR_FEE};
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::helpers::taxes::{calculate_and_return_taxes_with_fee};

    //TODO:move this to a file for errors
    mod errors {
        const ERC20_PAY_FAILED: felt252 = 'ERC20: pay failed';
        const DIFFERENT_ERC20_TOKEN_DISPATCHER: felt252 = 'Different token_dispatcher';
    }

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
                errors::DIFFERENT_ERC20_TOKEN_DISPATCHER,
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
                errors::DIFFERENT_ERC20_TOKEN_DISPATCHER,
            );
            token_dispatcher.transfer(recipient, validation_result.amount)
        }

        fn pay_to_us(
            self: @ComponentState<TContractState>,
            sender: ContractAddress,
            validation_result: ValidationResult,
        ) -> bool {
            let token_dispatcher = self.token_dispatcher.read();
            assert(
                token_dispatcher.contract_address == validation_result.token_address,
                errors::DIFFERENT_ERC20_TOKEN_DISPATCHER,
            );
            token_dispatcher
                .transferFrom(
                    sender,
                    OUR_CONTRACT_SEPOLIA_ADDRESS.try_into().unwrap(),
                    validation_result.amount,
                )
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
            assert(
                token_dispatcher.contract_address == validation_result.token_address,
                errors::DIFFERENT_ERC20_TOKEN_DISPATCHER,
            );

            let (amount_for_seller, fee_amount) = calculate_and_return_taxes_with_fee(
                validation_result.amount, fee_rate,
            );

            // Perform the first transfer and check if it was successful
            let fee_transfer_success = token_dispatcher
                .transferFrom(buyer, our_contract_for_fee, fee_amount.try_into().unwrap());
            if !fee_transfer_success {
                return false; // Exit early if the fee transfer fails
            }

            token_dispatcher.transferFrom(buyer, seller, amount_for_seller)
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
