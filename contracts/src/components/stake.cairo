use starknet::ContractAddress;
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};


#[starknet::component]
mod StakeComponent {
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
    use ponzi_land::consts::{TAX_RATE, BASE_TIME, TIME_SPEED};
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::components::payable::{PayableComponent, IPayable};
    use ponzi_land::utils::common_strucs::{TokenInfo};

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
    }
}
