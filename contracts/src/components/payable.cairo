// Starknet imports

use starknet::ContractAddress;
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

// Component

#[starknet::component]
mod PayableComponent {
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
    use ponzi_land::helpers::coord::{is_valid_position, up, down, left, right, max_neighbors};
    use ponzi_land::models::land::Land;
    use ponzi_land::consts::{TAX_RATE, BASE_TIME};
    use ponzi_land::store::{Store, StoreTrait};
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

    #[derive(Drop, Serde, starknet::Store, Debug, Copy)]
    pub struct TokenInfo {
        token_address: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, Serde, Debug, Copy)]
    pub struct ClaimInfo {
        token_address: ContractAddress,
        amount: u256,
        land_location: u64,
        can_be_nuked: bool,
    }
    // Storage

    #[storage]
    struct Storage {
        token_dispatcher: IERC20CamelDispatcher,
        stake_balance: Map<ContractAddress, TokenInfo>,
        pending_taxes_length: Map<ContractAddress, u64>,
        //                 (land_owner,token_index) -> token_info
        pending_taxes: Map<(ContractAddress, u64), TokenInfo>,
        //                         (land_owner,location,token_index) -> token_info
        pending_taxes_for_land: Map<(ContractAddress, u64, u64), TokenInfo>
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
            amount: u256
        ) {
            self._initialize(token_address);
            let buyer_balance = self.token_dispatcher.read().balanceOf(buyer);
            assert(buyer_balance >= amount.into(), errors::ERC20_NOT_SUFFICIENT_AMOUNT);
        }


        fn _pay(
            ref self: ComponentState<TContractState>,
            sender: ContractAddress,
            recipient: ContractAddress,
            token_address: ContractAddress,
            amount: u256,
        ) {
            self._validate(sender, token_address, amount);
            let status = self
                .token_dispatcher
                .read()
                .transferFrom(sender, recipient, amount.into());
            assert(status, errors::ERC20_PAY_FAILED);
        }


        fn _pay_to_us(
            ref self: ComponentState<TContractState>,
            sender: ContractAddress,
            token_address: ContractAddress,
            amount: u256
        ) {
            self._validate(sender, token_address, amount);
            //CONST OUR_CONTRACT = OXOXOXOX;
        // let status = self.token_dispatcher.read().transferFrom(sender,OUR_CONTRACT,amount);
        // assert(status, errors::ERC20_PAY_FAILED);
        }


        fn _pay_from_contract(
            ref self: ComponentState<TContractState>, recipient: ContractAddress, amount: u256
        ) -> bool {
            //   some validation
            // assert(get_contract_address)
            let status = self.token_dispatcher.read().transfer(recipient, amount.into());
            status
        }


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


        fn _add_taxes(
            ref self: ComponentState<TContractState>,
            owner_land: ContractAddress,
            token_address: ContractAddress,
            amount: u256,
            land_location: u64
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
                        self
                            .pending_taxes_for_land
                            .write((owner_land, land_location, i), token_info);

                        found = true;
                        break;
                    }
                };

            if !found {
                let token_info = TokenInfo { token_address, amount };

                self.pending_taxes.write((owner_land, taxes_length), token_info);

                self
                    .pending_taxes_for_land
                    .write((owner_land, land_location, taxes_length), token_info);

                self.pending_taxes_length.write(owner_land, taxes_length + 1);
            };
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


        fn _add_neighbors(
            self: @ComponentState<TContractState>, mut store: Store, land_location: u64
        ) -> Array<Land> {
            let mut neighbors: Array<Land> = ArrayTrait::new();

            self.add_if_neighbor_exists(store, ref neighbors, left(land_location));
            self.add_if_neighbor_exists(store, ref neighbors, right(land_location));
            self.add_if_neighbor_exists(store, ref neighbors, up(land_location));
            self.add_if_neighbor_exists(store, ref neighbors, down(land_location));

            // For diagonal neighbors, we need to handle nested Options
            match up(land_location) {
                Option::Some(up_location) => {
                    self.add_if_neighbor_exists(store, ref neighbors, left(up_location));
                    self.add_if_neighbor_exists(store, ref neighbors, right(up_location));
                },
                Option::None => {}
            }

            match down(land_location) {
                Option::Some(down_location) => {
                    self.add_if_neighbor_exists(store, ref neighbors, left(down_location));
                    self.add_if_neighbor_exists(store, ref neighbors, right(down_location));
                },
                Option::None => {}
            }

            neighbors
        }


        fn _generate_taxes(
            ref self: ComponentState<TContractState>, mut store: Store, land_location: u64
        ) -> Result<u256, felt252> {
            let mut land = store.land(land_location);
            //generate taxes for each neighbor of neighbor

            let mut neighbors: Array<Land> = self._add_neighbors(store, land_location);
            if neighbors.len() == 0 {
                land.last_pay_time = get_block_timestamp();
                store.set_land(land);
                return Result::Ok(0);
            }

            let current_time = get_block_timestamp();
            let elapsed_time = current_time - land.last_pay_time;

            let total_taxes: u256 = (land.sell_price * TAX_RATE.into() * elapsed_time.into())
                / (100 * BASE_TIME.into());

            //if we dont have enough stake to pay the taxes,we distrubute the total amount of stake
            //and after we nuke the land
            let (tax_to_distribute, is_nuke) = if land.stake_amount <= total_taxes {
                (land.stake_amount, true)
            } else {
                (total_taxes, false)
            };

            let tax_per_neighbor = tax_to_distribute / max_neighbors(land_location).into();

            for neighbor in neighbors
                .span() {
                    self
                        ._add_taxes(
                            *neighbor.owner, land.token_used, tax_per_neighbor, *neighbor.location
                        );
                };

            self._discount_stake_for_taxes(land.owner, tax_to_distribute);

            land.last_pay_time = get_block_timestamp();
            land.stake_amount = land.stake_amount - tax_to_distribute;
            store.set_land(land);
            if is_nuke {
                Result::Err('Nuke')
            } else {
                Result::Ok(self.stake_balance.read(land.owner).amount)
            }
        }


        fn _claim_taxes(
            ref self: ComponentState<TContractState>,
            taxes: Array<TokenInfo>,
            owner_land: ContractAddress,
            land_location: u64
        ) {
            for token_info in taxes {
                if token_info.amount > 0 {
                    self._initialize(token_info.token_address);
                    let status = self._pay_from_contract(owner_land, token_info.amount);
                    if status {
                        self._discount_pending_taxes(owner_land, land_location, token_info);
                    }
                }
            }
        }


        fn add_if_neighbor_exists(
            self: @ComponentState<TContractState>,
            mut store: Store,
            ref neighbors: Array<Land>,
            land_location: Option<u64>,
        ) {
            match land_location {
                Option::Some(location) => {
                    let land = store.land(location);
                    if land.owner != ContractAddressZeroable::zero() {
                        neighbors.append(land)
                    }
                },
                Option::None => {}
            }
        }


        fn _discount_pending_taxes(
            ref self: ComponentState<TContractState>,
            owner_land: ContractAddress,
            land_location: u64,
            token_info: TokenInfo
        ) {
            //to see the quantity of token in total
            let taxes_length = self.pending_taxes_length.read(owner_land);

            for mut i in 0
                ..taxes_length {
                    //we search for tokens for each land
                    let mut pending_tax = self
                        .pending_taxes_for_land
                        .read((owner_land, land_location, i));
                    //when we find the token we discount the amount for the land
                    if pending_tax.amount > 0
                        && pending_tax.token_address == token_info.token_address {
                        self
                            .pending_taxes_for_land
                            .write(
                                (owner_land, land_location, i),
                                TokenInfo { token_address: pending_tax.token_address, amount: 0 }
                            );

                        //now we discount in the global of the owner balance
                        let amount = self.pending_taxes.read((owner_land, i)).amount;
                        if amount > token_info.amount {
                            self
                                .pending_taxes
                                .write(
                                    (owner_land, i),
                                    TokenInfo {
                                        token_address: pending_tax.token_address,
                                        amount: amount - token_info.amount
                                    }
                                );
                        } else {
                            self
                                .pending_taxes
                                .write(
                                    (owner_land, i),
                                    TokenInfo {
                                        token_address: pending_tax.token_address, amount: 0
                                    }
                                );
                        };
                    }
                };
        }

        fn _get_pending_taxes(
            self: @ComponentState<TContractState>,
            owner_land: ContractAddress,
            land_location: Option<u64>
        ) -> Array<TokenInfo> {
            let taxes_length = self.pending_taxes_length.read(owner_land);
            let mut taxes: Array<TokenInfo> = ArrayTrait::new();

            for mut i in 0
                ..taxes_length {
                    match land_location {
                        Option::Some(land_location) => {
                            let tax = self
                                .pending_taxes_for_land
                                .read((owner_land, land_location, i));
                            if tax.amount > 0 {
                                taxes.append(tax);
                            }
                        },
                        Option::None => {
                            let tax = self.pending_taxes.read((owner_land, i));
                            if tax.amount > 0 {
                                taxes.append(tax);
                            }
                        }
                    }
                };
            taxes
        }
    }
}
