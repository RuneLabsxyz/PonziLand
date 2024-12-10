// Starknet imports

use starknet::ContractAddress;
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

// Component

#[starknet::component]
mod PayableComponent {
    // Starknet imports

    use starknet::{ContractAddress};
    use starknet::info::get_contract_address;
    use starknet::storage::{
    Map,StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
};
    // Internal imports

    // Local imports

    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    // Errors

    mod errors {
        //     const ERC20_REWARD_FAILED: felt252 = 'ERC20: reward failed';
        const ERC20_STAKE_FAILED: felt252 = 'ERC20: stake failed';
        const ERC20_PAY_FAILED: felt252 = 'ERC20: pay failed';
        const ERC20_REFUND_FAILED: felt252 = 'ERC20: refund of stake failed';
        const ERC20_NOT_SUFFICIENT_AMOUNT: felt252 = 'ERC20: not sufficient amount';
    }

    #[derive(Drop, Serde, starknet::Store, Debug)]
    pub struct TokenInfo {
        token_address: ContractAddress,
        amount: u64,
    }

    // Storage

    #[storage]
    struct Storage {
        // token_address: ContractAddress,
        token_dispatcher: IERC20CamelDispatcher,
        //this stake_balance can be in another component
        stake_balance: Map<ContractAddress, TokenInfo>,
        pending_taxes:Map<(ContractAddress,u64),TokenInfo>,
        pending_taxes_length:Map<ContractAddress,u64>,

        //this for the current version of cairo don't work
        // pending_taxes:Map<ContractAddress,Vec<TokenInfo>>

    }

    // Events

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    #[generate_trait]
    impl InternalImpl<
        TContractState, +HasComponent<TContractState>
    > of InternalTrait<TContractState> {
        fn _initialize(ref self: ComponentState<TContractState>, token_address: ContractAddress) {
            // Set token_dispatcher
            self.token_dispatcher.write(IERC20CamelDispatcher { contract_address: token_address });
        }

        fn _pay(
            self: @ComponentState<TContractState>,
            buyer: ContractAddress,
            seller: ContractAddress,
            amount: u256
        ) {
            let status = self.token_dispatcher.read().transferFrom(buyer, seller, amount);

            assert(status, errors::ERC20_PAY_FAILED);
        }

        fn _refund_of_stake(ref self: ComponentState<TContractState>, recipient: ContractAddress) {
            let info_of_stake = self.stake_balance.read(recipient);
            self._initialize(info_of_stake.token_address);
            assert(info_of_stake.amount > 0, 'not balance in stake');
            let status = self
                .token_dispatcher
                .read()
                .transfer(recipient, info_of_stake.amount.into());

            assert(status, errors::ERC20_REFUND_FAILED);
        }

        fn _stake(
            ref self: ComponentState<TContractState>,
            staker: ContractAddress,
            token_address: ContractAddress,
            amount: u64
        ) {
            let contract_address = get_contract_address();
            self._initialize(token_address);
            let stake_info = TokenInfo { token_address, amount };

            let status = self.token_dispatcher.read().transferFrom(staker, contract_address, amount.into());
            assert(status, errors::ERC20_STAKE_FAILED);

            self.stake_balance.write(staker, stake_info);
        }

        fn _add_taxes(ref self:ComponentState<TContractState>,owner_land:ContractAddress,token_address:ContractAddress,amount:u64){
            // to see how many of diferents tokens the person can have
            let  taxes_length= self.pending_taxes_length.read(owner_land);
            //to see if the token of new taxes already exists
            let mut found = false;
            //find existing token and sum the amount
            for mut i in 0..taxes_length{
                let mut token_info = self.pending_taxes.read((owner_land,i));
                if token_info.token_address == token_address {
                    token_info.amount += amount;
                    self.pending_taxes.write((owner_land,i),token_info);
                    found = true;
                    break; 
                }
            };

            if !found {
                self.pending_taxes.write((owner_land, taxes_length), TokenInfo {
                    token_address,amount
                });
                self.pending_taxes_length.write(owner_land, taxes_length + 1);
          
            };

        }

        fn _discount_stake_for_taxes(ref self:ComponentState<TContractState>, owner_land:ContractAddress,tax_amount:u64){
            let stake_balance = self.stake_balance.read(owner_land);
            assert(stake_balance.amount > tax_amount,'not sufficient stake for taxes');
            let new_amount = stake_balance.amount - tax_amount;
            self.stake_balance.write(owner_land,TokenInfo{
                token_address:stake_balance.token_address,
                amount:new_amount
            });
        }   



        fn _validate(
            ref self: ComponentState<TContractState>,
            buyer: ContractAddress,
            token_address: ContractAddress,
            amount: u64
        ) {
            self._initialize(token_address);
            let buyer_balance = self.token_dispatcher.read().balanceOf(buyer);

            assert(buyer_balance >= amount.into(), errors::ERC20_NOT_SUFFICIENT_AMOUNT);
        }
    }
}
