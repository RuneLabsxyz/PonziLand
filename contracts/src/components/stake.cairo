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
        stake::{
            summarize_totals, get_total_stake_for_token, get_total_tax_for_token,
            calculate_refund_ratio, calculate_refund_amount, adjust_land_taxes
        }
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
    struct Storage {}

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

            land.stake_amount = 0;
            store.set_land(land);
        }

        fn reimburse(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            active_lands_with_taxes: Span<LandWithTaxes>,
            ref token_ratios: Felt252Dict<Nullable<u256>>
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);

            for mut land_with_taxes in active_lands_with_taxes {
                let mut land = *land_with_taxes.land;
                let token_ratio = match match_nullable(token_ratios.get(land.token_used.into())) {
                    FromNullableResult::Null => 0_u256,
                    FromNullableResult::NotNull(val) => val.unbox(),
                };

                let refund_amount = calculate_refund_amount(land.stake_amount, token_ratio);

                let validation_result = payable
                    .validate(land.token_used, get_contract_address(), refund_amount);

                let status = payable.transfer(land.owner, validation_result);
                assert(status, errors::ERC20_REFUND_FAILED);

                land.stake_amount = 0;
                store.set_land(land);
            };
        }

        fn calculate_token_ratios(
            ref self: ComponentState<TContractState>, active_lands_with_taxes: Span<LandWithTaxes>
        ) -> Felt252Dict<Nullable<u256>> {
            let (mut stake_totals, mut tax_totals, unique_tokens) = summarize_totals(
                active_lands_with_taxes
            );
            let mut payable = get_dep_component_mut!(ref self, Payable);

            let mut token_ratios: Felt252Dict<Nullable<u256>> = Default::default();

            for token_used in unique_tokens
                .span() {
                    let token_address: ContractAddress = *token_used;
                    let token_key: felt252 = token_address.into();

                    let balance = payable.balance_of(*token_used, get_contract_address());

                    let total_staked = get_total_stake_for_token(ref stake_totals, token_key);

                    let total_tax = get_total_tax_for_token(ref tax_totals, token_key);

                    let ratio = calculate_refund_ratio(total_staked + total_tax, balance);

                    token_ratios.insert(token_key, NullableTrait::new(ratio));
                };

            token_ratios
        }
    }
}
