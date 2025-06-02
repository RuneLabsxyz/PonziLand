use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

#[starknet::component]
mod TaxesComponent {
    //use dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::event::EventStorage;
    use dojo::world::WorldStorage;

    // Starknet imports
    use starknet::{ContractAddress};
    use starknet::info::{get_contract_address, get_block_timestamp};

    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Vec, VecTrait,
        MutableVecTrait,
    };
    use starknet::contract_address::ContractAddressZeroable;
    // Internal imports
    use ponzi_land::helpers::coord::max_neighbors;
    use ponzi_land::models::land::{Land, LandStake};
    use ponzi_land::consts::{TAX_RATE, BASE_TIME, TIME_SPEED};
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::utils::get_neighbors::{neighbors_with_their_neighbors};
    use ponzi_land::components::payable::{PayableComponent, IPayable};
    use ponzi_land::utils::common_strucs::{TokenInfo};
    use ponzi_land::helpers::taxes::{get_taxes_per_neighbor};

    // Local imports
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    mod errors {
        const ERC20_TRANSFER_CLAIM_FAILED: felt252 = 'Transfer for claim failed';
    }

    #[storage]
    struct Storage {
        //tax_payer,tax_reciever -> timestamp
        last_claim_time: Map<(u16, u16), u64>,
        //               tax_reciever,tax_payer -> amount
        claimed_amount: Map<(u16, u16), u256>,
    }

    // Events

    #[derive(Drop, Serde)]
    #[dojo::event]
    pub struct LandTransferEvent {
        #[key]
        from_location: u16,
        to_location: u16,
        token_address: ContractAddress,
        amount: u256,
    }

    #[generate_trait]
    impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +Drop<TContractState>,
        impl Payable: PayableComponent::HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        fn register_bidirectional_tax_relations(
            ref self: ComponentState<TContractState>, land_a: Land, land_b: Land, store: Store,
        ) {
            self._register_unidirectional_tax_relation(land_a, land_b, store);
            self._register_unidirectional_tax_relation(land_b, land_a, store);
        }

        fn _register_unidirectional_tax_relation(
            ref self: ComponentState<TContractState>,
            tax_receiver: Land,
            tax_payer: Land,
            store: Store,
        ) {
            let current_timestamp = get_block_timestamp();
            self
                .last_claim_time
                .write((tax_payer.location, tax_receiver.location), current_timestamp);
            self.claimed_amount.write((tax_receiver.location, tax_payer.location), 0);
        }


        fn get_elapsed_time_since_last_claim(
            self: @ComponentState<TContractState>, claimer_location: u16, payer_location: u16,
        ) -> u64 {
            let last_claim_time = self.last_claim_time.read((claimer_location, payer_location));
            let elapsed_time = if get_block_timestamp() > last_claim_time {
                get_block_timestamp() - last_claim_time
            } else {
                0
            };
            elapsed_time
        }

        fn calculate_and_distribute_taxes(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer: Land,
            direct_neighbor: Land,
            ref neighbors_dict: Felt252Dict<Nullable<Array<Land>>>,
            from_buy: bool,
        ) -> bool {
            let neighbors_of_direct_neighbor = neighbors_with_their_neighbors(
                ref neighbors_dict, direct_neighbor.location,
            );
            let mut land_stake = store.land_stake(direct_neighbor.location);

            let mut tax_amount_for_neighbor: Array<(u16, ContractAddress, u256)> =
                ArrayTrait::new();
            let total_already_claimed = self
                ._calculate_total_claimed(direct_neighbor, neighbors_of_direct_neighbor.span());

            let (total_taxes, tax_for_claimer) = self
                ._calculate_taxes_for_all_neighbors(
                    claimer,
                    direct_neighbor,
                    neighbors_of_direct_neighbor.span(),
                    land_stake.amount,
                    total_already_claimed,
                    ref tax_amount_for_neighbor,
                );
            let is_nuke = if land_stake.amount <= total_taxes {
                self._process_nuke(store, direct_neighbor, tax_amount_for_neighbor);
                land_stake.amount = 0;
                true
            } else if !from_buy {
                self
                    ._process_claim(
                        store, claimer, direct_neighbor, tax_for_claimer, land_stake.amount,
                    );
                land_stake.amount -= tax_for_claimer;
                false
            } else {
                self._process_buy(store, direct_neighbor, ref land_stake, tax_amount_for_neighbor);
                false
            };

            store.set_land_stake(land_stake);
            is_nuke
        }

        fn _calculate_taxes_for_all_neighbors(
            ref self: ComponentState<TContractState>,
            claimer: Land,
            direct_neighbor: Land,
            neighbors_of_direct_neighbor: Span<Land>,
            land_stake_amount: u256,
            total_already_claimed: u256,
            ref tax_amount_for_neighbor: Array<(u16, ContractAddress, u256)>,
        ) -> (u256, u256) {
            let mut total_taxes: u256 = 0;
            let mut tax_for_claimer: u256 = 0;

            for neighbor in neighbors_of_direct_neighbor {
                let neighbor = *neighbor;
                let last_claim_time = self
                    .last_claim_time
                    .read((neighbor.location, direct_neighbor.location));
                let elapsed_time = if get_block_timestamp() > last_claim_time {
                    get_block_timestamp() - last_claim_time
                } else {
                    0
                };
                if elapsed_time > 0 {
                    let tax_per_neighbor = get_taxes_per_neighbor(direct_neighbor, elapsed_time);
                    total_taxes += tax_per_neighbor;

                    let individual_total_already_claimed = self
                        .claimed_amount
                        .read((neighbor.location, direct_neighbor.location));
                    let estimated_original_stake = land_stake_amount + total_already_claimed;
                    let max_per_neighbor = estimated_original_stake
                        / neighbors_of_direct_neighbor.len().into();

                    // Calculate available tax avoiding overflow
                    let available_tax_for_claimer = if tax_per_neighbor
                        + individual_total_already_claimed > max_per_neighbor {
                        if max_per_neighbor > individual_total_already_claimed {
                            max_per_neighbor - individual_total_already_claimed
                        } else {
                            0
                        }
                    } else {
                        tax_per_neighbor
                    };

                    if available_tax_for_claimer > 0 {
                        tax_amount_for_neighbor
                            .append((neighbor.location, neighbor.owner, available_tax_for_claimer));
                        if neighbor.location == claimer.location {
                            tax_for_claimer += available_tax_for_claimer;
                        }
                    }
                }
            };
            (total_taxes, tax_for_claimer)
        }

        fn _calculate_total_claimed(
            ref self: ComponentState<TContractState>,
            direct_neighbor: Land,
            neighbors_of_direct_neighbor: Span<Land>,
        ) -> u256 {
            let mut total_already_claimed: u256 = 0;
            for neighbor in neighbors_of_direct_neighbor {
                let neighbor = *neighbor;
                let individual_total_already_claimed = self
                    .claimed_amount
                    .read((neighbor.location, direct_neighbor.location));
                total_already_claimed += individual_total_already_claimed;
            };
            total_already_claimed
        }

        fn _process_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            nuked_land: Land,
            neighbors_of_nuked_land: Array<(u16, ContractAddress, u256)>,
        ) {
            for (_, neighbor_address, tax_amount) in neighbors_of_nuked_land {
                self
                    ._transfer_tokens(
                        neighbor_address,
                        nuked_land.owner,
                        TokenInfo { token_address: nuked_land.token_used, amount: tax_amount },
                    );
            }
        }

        fn _process_buy(
            ref self: ComponentState<TContractState>,
            store: Store,
            direct_neighbor: Land,
            ref land_stake: LandStake,
            neighbors_of_direct_neighbor: Array<(u16, ContractAddress, u256)>,
        ) {
            let mut total_real_taxes: u256 = 0;
            for (neighbor_location, neighbor_address, tax_amount) in neighbors_of_direct_neighbor {
                self
                    ._execute_claim(
                        store,
                        neighbor_location,
                        neighbor_address,
                        direct_neighbor,
                        tax_amount,
                        land_stake.amount,
                        true,
                    );
                total_real_taxes += tax_amount;
                self.claimed_amount.write((neighbor_location, direct_neighbor.location), 0);
            };
            land_stake.amount -= total_real_taxes;
        }

        fn _process_claim(
            ref self: ComponentState<TContractState>,
            store: Store,
            claimer: Land,
            direct_neighbor: Land,
            tax_for_claimer: u256,
            land_stake_amount: u256,
        ) {
            self
                ._execute_claim(
                    store,
                    claimer.location,
                    claimer.owner,
                    direct_neighbor,
                    tax_for_claimer,
                    land_stake_amount,
                    false,
                );
        }

        fn _transfer_tokens(
            ref self: ComponentState<TContractState>,
            tax_receiver: ContractAddress,
            tax_payer: ContractAddress,
            token_info: TokenInfo,
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);
            let validation_result = payable
                .validate(token_info.token_address, get_contract_address(), token_info.amount);
            let status = payable.transfer(tax_receiver, validation_result);
            assert(status, errors::ERC20_TRANSFER_CLAIM_FAILED);
        }

        fn _execute_claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer_location: u16,
            claimer_address: ContractAddress,
            direct_neighbor: Land,
            available_tax_for_claimer: u256,
            land_stake_amount: u256,
            from_buy: bool,
        ) {
            if available_tax_for_claimer > 0 && available_tax_for_claimer < land_stake_amount {
                self
                    ._transfer_tokens(
                        claimer_address,
                        direct_neighbor.owner,
                        TokenInfo {
                            token_address: direct_neighbor.token_used,
                            amount: available_tax_for_claimer,
                        },
                    );

                store
                    .world
                    .emit_event(
                        @LandTransferEvent {
                            from_location: direct_neighbor.location,
                            to_location: claimer_location,
                            token_address: direct_neighbor.token_used,
                            amount: available_tax_for_claimer,
                        },
                    );

                if !from_buy {
                    let individual_total_already_claimed = self
                        .claimed_amount
                        .read((claimer_location, direct_neighbor.location));
                    self
                        .claimed_amount
                        .write(
                            (claimer_location, direct_neighbor.location),
                            individual_total_already_claimed + available_tax_for_claimer,
                        );
                }

                self
                    .last_claim_time
                    .write((direct_neighbor.location, claimer_location), get_block_timestamp());
            }
        }
    }
}
