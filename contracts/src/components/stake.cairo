use starknet::ContractAddress;
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};


#[starknet::component]
mod StakeComponent {
    //use dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};

    // Starknet imports
    use starknet::{ContractAddress};
    use starknet::info::{get_contract_address, get_block_timestamp};

    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
    };
    use starknet::contract_address::ContractAddressZeroable;
    // Internal imports
    use ponzi_land::helpers::coord::{max_neighbors};
    use ponzi_land::models::land::Land;
    use ponzi_land::consts::{TAX_RATE, BASE_TIME, TIME_SPEED};
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::utils::{add_neighbors, add_neighbor};
    // Local imports
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};


    //TODO:see if put this struct inside of utils
    #[derive(Drop, Serde, starknet::Store, Debug, Copy)]
    pub struct TokenInfo {
        token_address: ContractAddress,
        amount: u256,
    }

    mod errors {
        const ERC20_STAKE_FAILED: felt252 = 'ERC20: stake failed';
        const ERC20_PAY_FAILED: felt252 = 'ERC20: pay failed';
        const ERC20_REFUND_FAILED: felt252 = 'ERC20: refund of stake failed';
        const ERC20_NOT_SUFFICIENT_AMOUNT: felt252 = 'ERC20: not sufficient amount';
    }

    #[storage]
    struct Storage {
        token_dispatcher: IERC20CamelDispatcher,
        stake_balance: Map<ContractAddress, TokenInfo>,
    }

    #[generate_trait]
    impl InternalImpl<
        TContractState, +HasComponent<TContractState>
    > of InternalTrait<TContractState> {
        fn _initialize(ref self: ComponentState<TContractState>, token_address: ContractAddress) {
            // Set token_dispatcher
            self.token_dispatcher.write(IERC20CamelDispatcher { contract_address: token_address });
        }

        fn _validate(
            ref self: ComponentState<TContractState>,
            buyer: ContractAddress,
            token_address: ContractAddress,
            amount: u256
        ) {
            self._initialize(token_address);
            let buyer_balance = self.token_dispatcher.read().balanceOf(buyer);
            assert(buyer_balance >= amount.into(), errors::ERC20_NOT_SUFFICIENT_AMOUNT);
        }

        fn _stake(
            ref self: ComponentState<TContractState>,
            staker: ContractAddress,
            token_address: ContractAddress,
            amount: u256
        ) {
            let contract_address = get_contract_address();
            self._validate(staker, token_address, amount);

            let status = self
                .token_dispatcher
                .read()
                .transferFrom(staker, contract_address, amount.into());
            assert(status, errors::ERC20_STAKE_FAILED);

            let current_stake = self.stake_balance.read(staker).amount;
            let stake_info = TokenInfo { token_address, amount: current_stake + amount };
            self.stake_balance.write(staker, stake_info);
        }
        //or withdraw
        fn _refund_of_stake(
            ref self: ComponentState<TContractState>, recipient: ContractAddress, amount: u256
        ) {
            let info_of_stake = self.stake_balance.read(recipient);
            self._initialize(info_of_stake.token_address);
            assert(info_of_stake.amount > 0, 'not balance in stake');
            assert(amount > 0, 'not enough balance in stake');
            let status = self.token_dispatcher.read().transfer(recipient, amount.into());

            assert(status, errors::ERC20_REFUND_FAILED);
        }

        fn _discount_stake_for_taxes(
            ref self: ComponentState<TContractState>, owner_land: ContractAddress, tax_amount: u256
        ) {
            let stake_balance = self.stake_balance.read(owner_land);
            let new_amount = if stake_balance.amount <= tax_amount {
                0
            } else {
                stake_balance.amount - tax_amount
            };

            self
                .stake_balance
                .write(
                    owner_land,
                    TokenInfo { token_address: stake_balance.token_address, amount: new_amount }
                );
        }
    }
}
