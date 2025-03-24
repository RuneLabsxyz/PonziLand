use starknet::ContractAddress;
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};


#[starknet::component]
mod StakeComponent {
    //core imports
    use core::nullable::{Nullable, NullableTrait, match_nullable, FromNullableResult};
    use core::dict::{Felt252Dict, Felt252DictTrait, Felt252DictEntryTrait};

    //use dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};

    // Starknet imports
    use starknet::{ContractAddress};
    use starknet::info::{get_contract_address, get_block_timestamp, get_caller_address};

    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
    };
    use starknet::contract_address::ContractAddressZeroable;
    // Internal imports
    use ponzi_land::helpers::coord::{max_neighbors};
    use ponzi_land::models::land::Land;
    use ponzi_land::consts::{TAX_RATE, BASE_TIME, TIME_SPEED, GRID_WIDTH,};
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::components::payable::{PayableComponent, IPayable};
    use ponzi_land::utils::{
        common_strucs::{TokenInfo, LandWithTaxes},
        stake::{calculate_refund_ratio, calculate_refund_amount}
    };


    // Local imports
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};


    mod errors {
        const ERC20_STAKE_FAILED: felt252 = 'ERC20: stake failed';
        const ERC20_VALIDATE_FOR_STAKE_FAILED: felt252 = 'Not enough amount for stake';
        const ERC20_VALIDATE_FOR_REFUND_FAILED: felt252 = 'Not enough amount for refund';
        const ERC20_REFUND_FAILED: felt252 = 'ERC20: refund of stake failed';
    }

    #[storage]
    struct Storage {
        token_stakes: Map<ContractAddress, u256>, // Track total stakes per token
    }

    #[generate_trait]
    impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +Drop<TContractState>,
        impl Payable: PayableComponent::HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        fn _add(
            ref self: ComponentState<TContractState>, amount: u256, mut land: Land, mut store: Store
        ) {
            //initialize and validate token balance
            let mut payable = get_dep_component_mut!(ref self, Payable);
            let validation_result = payable.validate(land.token_used, land.owner, amount);
            assert(validation_result.status, errors::ERC20_VALIDATE_FOR_STAKE_FAILED);

            //transfer stake amount to game contract
            let contract_address = get_contract_address();

            let status = payable.transfer_from(land.owner, contract_address, validation_result);
            assert(status, errors::ERC20_STAKE_FAILED);

            assert(land.owner == get_caller_address(), 'only the owner can stake');

            let current_total = self.token_stakes.read(land.token_used);
            self.token_stakes.write(land.token_used, current_total + amount);

            land.stake_amount = land.stake_amount + amount;
            store.set_land(land);
        }


        fn _refund(ref self: ComponentState<TContractState>, mut store: Store, mut land: Land) {
            let stake_amount = land.stake_amount;
            assert(stake_amount > 0, 'amount to refund is 0');

            let mut payable = get_dep_component_mut!(ref self, Payable);

            //validate if the contract has sufficient balance for refund stake
            let contract_address = get_contract_address();
            let validation_result = payable
                .validate(land.token_used, contract_address, stake_amount);
            assert(validation_result.status, errors::ERC20_VALIDATE_FOR_REFUND_FAILED);

            let status = payable.transfer(land.owner, validation_result);
            assert(status, errors::ERC20_REFUND_FAILED);

            let current_total = self.token_stakes.read(land.token_used);
            if current_total > stake_amount {
                self.token_stakes.write(land.token_used, current_total - stake_amount);
            } else {
                self.token_stakes.write(land.token_used, 0);
            }

            land.stake_amount = 0;
            store.set_land(land);
        }

        fn _discount_total_stake(ref self: ComponentState<TContractState>, taxes: Span<TokenInfo>) {
            for token_info in taxes {
                let token_info = *token_info;
                let current_total = self.token_stakes.read(token_info.token_address);
                if current_total > token_info.amount {
                    self
                        .token_stakes
                        .write(token_info.token_address, current_total - token_info.amount);
                } else {
                    self.token_stakes.write(token_info.token_address, 0);
                }
            };
        }

        fn reimburse(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            active_lands: Span<Land>,
            ref token_ratios: Felt252Dict<Nullable<u256>>
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);

            for mut land in active_lands {
                let mut land = *land;
                let token_ratio = match match_nullable(token_ratios.get(land.token_used.into())) {
                    FromNullableResult::Null => 0_u256,
                    FromNullableResult::NotNull(val) => val.unbox(),
                };

                let refund_amount = calculate_refund_amount(land.stake_amount, token_ratio);

                let validation_result = payable
                    .validate(land.token_used, get_contract_address(), refund_amount);

                let status = payable.transfer(land.owner, validation_result);
                assert(status, errors::ERC20_REFUND_FAILED);

                // Update total stakes for this token
                let current_total = self.token_stakes.read(land.token_used);
                if current_total > refund_amount {
                    self.token_stakes.write(land.token_used, current_total - refund_amount);
                } else {
                    self.token_stakes.write(land.token_used, 0);
                }

                land.stake_amount = 0;
                store.set_land(land);
            };
        }

        fn calculate_token_ratios(
            ref self: ComponentState<TContractState>, active_lands: Span<Land>
        ) -> Felt252Dict<Nullable<u256>> {
            let mut payable = get_dep_component_mut!(ref self, Payable);
            let mut token_ratios: Felt252Dict<Nullable<u256>> = Default::default();
            let mut processed_tokens: Felt252Dict<bool> = Default::default();
            for land in active_lands {
                let land = *land;
                let token_address = land.token_used;
                let token_key: felt252 = token_address.into();

                if !processed_tokens.get(token_key) {
                    processed_tokens.insert(token_key, true);

                    // Get total amount for this token from storage
                    let total_staked = self.token_stakes.read(token_address);

                    let balance = payable.balance_of(token_address, get_contract_address());
                    let ratio = calculate_refund_ratio(total_staked, balance);
                    token_ratios.insert(token_key, NullableTrait::new(ratio));
                }
            };

            token_ratios
        }
    }
}
