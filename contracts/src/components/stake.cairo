/// @title Stake Component
/// @notice This module implements the staking functionality, allowing players to stake tokens on
/// land.
/// It handles staking, refunding, and reimbursement of staked tokens.

use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

#[starknet::component]
mod StakeComponent {
    // Starknet imports
    use starknet::ContractAddress;
    use starknet::info::{get_contract_address, get_caller_address};
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait,
    };
    use starknet::contract_address::ContractAddressZeroable;

    // Dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};

    // External dependencies
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    // Models
    use ponzi_land::models::land::{Land, LandStake};

    // Components
    use ponzi_land::components::payable::{PayableComponent, IPayable};

    // Store
    use ponzi_land::store::{Store, StoreTrait};

    // Utils
    use ponzi_land::utils::{
        common_strucs::{TokenInfo, LandWithTaxes},
        stake::{calculate_refund_ratio, calculate_refund_amount},
    };

    // Helpers
    use ponzi_land::helpers::coord::{max_neighbors};

    // Errors
    use ponzi_land::errors::{
        ERC20_VALIDATE_FOR_STAKE_FAILED, ERC20_STAKE_FAILED, ERC20_VALIDATE_FOR_REFUND_FAILED,
        ERC20_REFUND_FAILED,
    };

    #[storage]
    struct Storage {
        token_stakes: Map<ContractAddress, u256>, // Track total stakes per token
        token_ratios: Map<ContractAddress, u256>,
    }

    #[generate_trait]
    impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +Drop<TContractState>,
        impl Payable: PayableComponent::HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        /// @notice Add stake to a land when a buy or bid is completed
        fn _add(
            ref self: ComponentState<TContractState>,
            amount: u256,
            owner: ContractAddress,
            token_used: ContractAddress,
            mut land_stake: LandStake,
            mut store: Store,
            our_contract_address: ContractAddress,
        ) {
            //initialize and validate token balance
            let mut payable = get_dep_component_mut!(ref self, Payable);
            let validation_result = payable.validate(token_used, owner, amount);
            assert(validation_result.status, ERC20_VALIDATE_FOR_STAKE_FAILED);

            //transfer stake amount to game contract
            let status = payable.transfer_from(owner, our_contract_address, validation_result);
            assert(status, ERC20_STAKE_FAILED);

            let current_total = self.token_stakes.read(token_used);
            self.token_stakes.write(token_used, current_total + amount);

            //update land stake amount
            land_stake.amount = land_stake.amount + amount;
            store.set_land_stake(land_stake);
        }

        /// @notice Refund the stake amount to the owner when the land is sold
        fn _refund(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            land: Land,
            our_contract_address: ContractAddress,
        ) {
            let mut land_stake = store.land_stake(land.location);
            let stake_amount = land_stake.amount;
            assert(stake_amount > 0, 'amount to refund is 0');
            let mut payable = get_dep_component_mut!(ref self, Payable);

            //validate if the contract has sufficient balance for refund stake
            let validation_result = payable
                .validate(land.token_used, our_contract_address, stake_amount);
            assert(validation_result.status, ERC20_VALIDATE_FOR_REFUND_FAILED);

            let status = payable.transfer(land.owner, validation_result);
            assert(status, ERC20_REFUND_FAILED);

            let current_total = self.token_stakes.read(land.token_used);
            if current_total >= stake_amount {
                self.token_stakes.write(land.token_used, current_total - stake_amount);
            } else {
                panic!("Attempting to refund more than what's staked");
            }

            land_stake.amount = 0;
            store.set_land_stake(land_stake);
        }

        /// @notice Reimburse all stakes when game is over (admin function)
        fn _reimburse(
            ref self: ComponentState<TContractState>, mut store: Store, active_lands: Span<Land>,
        ) {
            for mut land in active_lands {
                let land = *land;
                let mut land_stake = store.land_stake(land.location);
                let token_ratio = self.__generate_token_ratio(land.token_used);
                let refund_amount = calculate_refund_amount(land_stake.amount, token_ratio);
                self.__process_refund(land, store, refund_amount, land_stake);
            };
        }

        fn _get_token_ratios(
            self: @ComponentState<TContractState>, token_address: ContractAddress,
        ) -> u256 {
            self.token_ratios.read(token_address)
        }

        fn _discount_stake_for_nuke(
            ref self: ComponentState<TContractState>, token_info: TokenInfo,
        ) {
            let current_total = self.token_stakes.read(token_info.token_address);
            if current_total >= token_info.amount {
                self
                    .token_stakes
                    .write(token_info.token_address, current_total - token_info.amount);
            } else {
                panic!("Attempting to discount more than what's staked");
            }
        }

        fn __generate_token_ratio(
            ref self: ComponentState<TContractState>, token: ContractAddress,
        ) -> u256 {
            let existing_ratio = self.token_ratios.read(token);
            if existing_ratio != 0 {
                return existing_ratio;
            }

            let mut payable = get_dep_component_mut!(ref self, Payable);
            let total_staked = self.token_stakes.read(token);
            let balance = payable.balance_of(token, get_contract_address());
            let ratio = calculate_refund_ratio(total_staked, balance);
            self.token_ratios.write(token, ratio);
            ratio
        }

        fn __process_refund(
            ref self: ComponentState<TContractState>,
            land: Land,
            mut store: Store,
            refund_amount: u256,
            mut land_stake: LandStake,
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);

            let validation_result = payable
                .validate(land.token_used, get_contract_address(), refund_amount);
            let status = payable.transfer(land.owner, validation_result);
            assert(status, ERC20_REFUND_FAILED);

            let current_total = self.token_stakes.read(land.token_used);
            if current_total >= refund_amount {
                let new_total = current_total - refund_amount;
                self.token_stakes.write(land.token_used, new_total);
            } else {
                panic!("Attempting to refund more than what's staked");
            };

            land_stake.amount = 0;
            store.set_land_stake(land_stake);
        }
    }
}
