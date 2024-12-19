// Starknet imports

use starknet::ContractAddress;
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

// Component

#[starknet::component]
mod PayableComponent {
    //use dojo imports
    use dojo::world::WorldStorage;
    use dojo::model::{ModelStorage, ModelValueStorage};

    // Starknet imports
    use starknet::{ContractAddress};
    use starknet::info::{get_contract_address, get_block_timestamp};

    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
    };
    use starknet::contract_address::ContractAddressZeroable;
    // Internal imports
    use ponzi_land::helpers::coord::{is_valid_position, up, down, left, right};
    use ponzi_land::models::land::Land;
    use ponzi_land::consts::{TAX_RATE, BASE_TIME};
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
        token_dispatcher: IERC20CamelDispatcher,
        stake_balance: Map<ContractAddress, TokenInfo>,
        pending_taxes: Map<(ContractAddress, u64), TokenInfo>,
        pending_taxes_length: Map<ContractAddress, u64>,
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


        fn _pay(
           ref self: ComponentState<TContractState>,
            sender: ContractAddress,
            recipient: ContractAddress,
            token_address:ContractAddress,
            amount: u64,
        ) {
            self._validate(sender,token_address,amount);
            let status = self.token_dispatcher.read().transferFrom(sender, recipient, amount.into());
            assert(status, errors::ERC20_PAY_FAILED);
        }


        fn _pay_to_us(ref self:ComponentState<TContractState>,sender:ContractAddress,token_address:ContractAddress,amount:u64){
            self._validate(sender,token_address,amount);
            //CONST OUR_CONTRACT = OXOXOXOX;
            // let status = self.token_dispatcher.read().transferFrom(sender,OUR_CONTRACT,amount);
            // assert(status, errors::ERC20_PAY_FAILED);
        }


        fn _pay_from_contract(
            ref self: ComponentState<TContractState>, recipient: ContractAddress, amount: u64
        ) -> bool {
            //   some validation
            // assert(get_contract_address)
            let status = self.token_dispatcher.read().transfer(recipient, amount.into());
            status
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
            self._validate(staker, token_address, amount);
            let stake_info = TokenInfo { token_address, amount };

            let status = self
                .token_dispatcher
                .read()
                .transferFrom(staker, contract_address, amount.into());
            assert(status, errors::ERC20_STAKE_FAILED);

            self.stake_balance.write(staker, stake_info);
        }


        fn _add_taxes(
            ref self: ComponentState<TContractState>,
            owner_land: ContractAddress,
            token_address: ContractAddress,
            amount: u64
        ) {
            // to see how many of diferents tokens the person can have
            let taxes_length = self.pending_taxes_length.read(owner_land);
            //to see if the token of new taxes already exists
            let mut found = false;
            //find existing token and sum the amount
            for mut i in 0
                ..taxes_length {
                    let mut token_info = self.pending_taxes.read((owner_land, i));
                    if token_info.token_address == token_address {
                        token_info.amount += amount;
                        self.pending_taxes.write((owner_land, i), token_info);
                        found = true;
                        break;
                    }
                };

            if !found {
                self
                    .pending_taxes
                    .write((owner_land, taxes_length), TokenInfo { token_address, amount });
                self.pending_taxes_length.write(owner_land, taxes_length + 1);
            };
        }


        fn _discount_stake_for_taxes(
            ref self: ComponentState<TContractState>, owner_land: ContractAddress, tax_amount: u64
        ) {
            let stake_balance = self.stake_balance.read(owner_land);
            if stake_balance.amount <= tax_amount {
                let new_amount = 0;
                self
                    .stake_balance
                    .write(
                        owner_land,
                        TokenInfo { token_address: stake_balance.token_address, amount: new_amount }
                    );
            } else {
                let new_amount = stake_balance.amount - tax_amount;
                self
                    .stake_balance
                    .write(
                        owner_land,
                        TokenInfo { token_address: stake_balance.token_address, amount: new_amount }
                    );
            }
        }


        fn _add_neighbors(
            self: @ComponentState<TContractState>, mut world: WorldStorage, land_location: u64
        ) -> Array<u64> {
            let mut neighbors: Array<u64> = ArrayTrait::new();

            self.add_if_neighbor_exists(world, ref neighbors, left(land_location));
            self.add_if_neighbor_exists(world, ref neighbors, right(land_location));
            self.add_if_neighbor_exists(world, ref neighbors, up(land_location));
            self.add_if_neighbor_exists(world, ref neighbors, down(land_location));

            // For diagonal neighbors, we need to handle nested Options
            match up(land_location) {
                Option::Some(up_location) => {
                    self.add_if_neighbor_exists(world, ref neighbors, left(up_location));
                    self.add_if_neighbor_exists(world, ref neighbors, right(up_location));
                },
                Option::None => {}
            }

            match down(land_location) {
                Option::Some(down_location) => {
                    self.add_if_neighbor_exists(world, ref neighbors, left(down_location));
                    self.add_if_neighbor_exists(world, ref neighbors, right(down_location));
                },
                Option::None => {}
            }

            neighbors
        }


        fn _generate_taxes(
            ref self: ComponentState<TContractState>, mut world: WorldStorage, land_location: u64
        ) -> Result<u64, felt252> {
            let mut land: Land = world.read_model(land_location);
            //generate taxes for each neighbor of neighbor
            let mut neighbors: Array<u64> = self._add_neighbors(world, land_location);

            if neighbors.len() == 0 {
                land.last_pay_time = get_block_timestamp();
                world.write_model(@land);
                return Result::Ok(0);
            }

            let current_balance_stake = self.stake_balance.read(land.owner).amount;

            if current_balance_stake == 0 {
                return Result::Err('Nuke');
            }

            let current_time = get_block_timestamp();
            let elapsed_time = current_time - land.last_pay_time;

            let total_taxes: u64 = (land.sell_price * TAX_RATE * elapsed_time) / (100 * BASE_TIME);

            let (tax_to_distribute, is_nuke) = if current_balance_stake <= total_taxes {
                (current_balance_stake, true)
            } else {
                (total_taxes, false)
            };

            let tax_per_neighbor = tax_to_distribute / neighbors.len().into();
            for location in neighbors
                .span() {
                    let neighbor: Land = world.read_model(*location);
                    self._add_taxes(neighbor.owner, land.token_used, tax_per_neighbor);
                };

            self._discount_stake_for_taxes(land.owner, tax_to_distribute);

            land.last_pay_time = get_block_timestamp();
            world.write_model(@land);
            if is_nuke {
                Result::Err('Nuke')
            } else {
                Result::Ok(self.stake_balance.read(land.owner).amount)
            }
        }


        fn _claim_taxes(
            ref self: ComponentState<TContractState>,
            taxes: Array<TokenInfo>,
            owner_land: ContractAddress
        ) {
            for i in taxes {
                if i.amount > 0 {
                    self._initialize(i.token_address);
                    let status = self._pay_from_contract(owner_land, i.amount);
                    if status {
                        self._discount_pending_taxes(owner_land);
                    }
                }
            }
        }


        fn add_if_neighbor_exists(
            self: @ComponentState<TContractState>,
            mut world: WorldStorage,
            ref neighbors: Array<u64>,
            land_location: Option<u64>,
        ) {
            match land_location {
                Option::Some(x) => {
                    let land: Land = world.read_model(x);
                    if land.owner != ContractAddressZeroable::zero() {
                        neighbors.append(x)
                    }
                },
                Option::None => {}
            }
        }


        fn _discount_pending_taxes(
            ref self: ComponentState<TContractState>, owner_land: ContractAddress
        ) {
            let taxes_length = self.pending_taxes_length.read(owner_land);
            for mut i in 0
                ..taxes_length {
                    let mut pending_tax = self.pending_taxes.read((owner_land, i));
                    if pending_tax.amount > 0 {
                        self
                            .pending_taxes
                            .write(
                                (owner_land, i),
                                TokenInfo { token_address: pending_tax.token_address, amount: 0 }
                            );
                    };
                };
        }
    }
}
