use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

#[starknet::component]
mod TaxComponent {
    mod errors {
        //     const ERC20_REWARD_FAILED: felt252 = 'ERC20: reward failed';
        const ERC20_STAKE_FAILED: felt252 = 'ERC20: stake failed';
        const ERC20_PAY_FAILED: felt252 = 'ERC20: pay failed';
        const ERC20_REFUND_FAILED: felt252 = 'ERC20: refund of stake failed';
        const ERC20_NOT_SUFFICIENT_AMOUNT: felt252 = 'ERC20: not sufficient amount';
    }


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

    #[storage]
    struct Storage {
        token_dispatcher: IERC20CamelDispatcher,
        pending_taxes_length: Map<ContractAddress, u64>,
        //                 (land_owner,token_index) -> token_info
        pending_taxes: Map<(ContractAddress, u64), TokenInfo>,
        //                         (land_owner,location,token_index) -> token_info
        pending_taxes_for_land: Map<(ContractAddress, u64, u64), TokenInfo>
        //this for the current version of cairo with dojo don't work
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

        //TODO:we have to change the return value
        fn _generate_taxes(
            ref self: ComponentState<TContractState>, mut store: Store, land_location: u64
        ) -> Result<u256, felt252> {
            let mut land = store.land(land_location);

            //generate taxes for each neighbor of neighbor
            let mut neighbors: Array<Land> = add_neighbors(store, land_location, true);

            //if we dont have neighbors we dont have to pay taxes
            let neighbors_with_owners = neighbors.len();
            if neighbors_with_owners == 0 {
                land.last_pay_time = get_block_timestamp();
                store.set_land(land);
                return Result::Ok(0);
            }

            //calculate the total taxes
            let current_time = get_block_timestamp();
            let elapsed_time = (current_time - land.last_pay_time) * TIME_SPEED.into();
            let total_taxes: u256 = (land.sell_price * TAX_RATE.into() * elapsed_time.into())
                / (100 * BASE_TIME.into());

            // Calculate the tax per neighbor (divided by the maximum possible neighbors)
            let tax_per_neighbor = total_taxes / max_neighbors(land_location).into();

            // Calculate the total tax to distribute (only to existing neighbors)
            let tax_to_distribute = tax_per_neighbor * neighbors_with_owners.into();

            //if we dont have enough stake to pay the taxes,we distrubute the total amount of stake
            //and after we nuke the land
            let (tax_to_distribute, is_nuke) = if land.stake_amount <= tax_to_distribute {
                (land.stake_amount, true)
            } else {
                (tax_to_distribute, false)
            };

            //distribute the taxes to each neighbor
            let tax_per_neighbor = tax_to_distribute / neighbors_with_owners.into();
            for neighbor in neighbors
                .span() {
                    self
                        ._add_taxes(
                            *neighbor.owner, land.token_used, tax_per_neighbor, *neighbor.location
                        );
                };

            //TODO:has to be into component of stake
            // self._discount_stake_for_taxes(land.owner, tax_to_distribute);

            land.last_pay_time = current_time;
            land.stake_amount = land.stake_amount - tax_to_distribute;
            store.set_land(land);
            //TODO:we have to change this return
            if is_nuke {
                Result::Err('Nuke')
            } else {
                Result::Ok(1)
                // Result::Ok(self.stake_balance.read(land.owner).amount)
            }
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


        fn _claim_taxes(
            ref self: ComponentState<TContractState>,
            taxes: Array<TokenInfo>,
            owner_land: ContractAddress,
            land_location: u64
        ) {
            for token_info in taxes {
                if token_info.amount > 0 {
                    self._initialize(token_info.token_address);
                    //TODO:see where we want do this
                // let status = self._pay_from_contract(owner_land, token_info.amount);
                // if status {
                //     self._discount_pending_taxes(owner_land, land_location, token_info);
                // }
                }
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
