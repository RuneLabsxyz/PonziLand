use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

#[starknet::component]
mod TaxesComponent {
    use core::num::traits::Bounded;


    //use dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::event::EventStorage;
    use dojo::world::WorldStorage;

    // Starknet imports
    use starknet::{ContractAddress};
    use starknet::info::{get_block_timestamp};

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
    use ponzi_land::helpers::taxes::{get_taxes_per_neighbor, get_tax_rate_per_neighbor};
    use ponzi_land::utils::get_neighbors::get_land_neighbors;

    // Local imports
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    mod errors {
        const ERC20_TRANSFER_CLAIM_FAILED: felt252 = 'Transfer for claim failed';
    }

    #[storage]
    struct Storage {
        //(tax_payer,tax_reciever) -> timestamp
        last_claim_time: Map<(u16, u16), u64>,
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
        /// Establishes tax relationship between two neighboring lands in both directions
        fn register_bidirectional_tax_relations(
            ref self: ComponentState<TContractState>,
            land_a: Land,
            land_b: Land,
            store: Store,
            current_time: u64,
        ) {
            self._register_unidirectional_tax_relation(land_a, land_b, store, current_time);
            self._register_unidirectional_tax_relation(land_b, land_a, store, current_time);
        }

        fn _register_unidirectional_tax_relation(
            ref self: ComponentState<TContractState>,
            tax_receiver: Land,
            tax_payer: Land,
            store: Store,
            current_time: u64,
        ) {
            self.last_claim_time.write((tax_payer.location, tax_receiver.location), current_time);
        }


        fn get_elapsed_time_since_last_claim(
            self: @ComponentState<TContractState>,
            claimer_location: u16,
            payer_location: u16,
            current_time: u64,
        ) -> u64 {
            let last_claim_time = self.last_claim_time.read((claimer_location, payer_location));
            let elapsed_time = if current_time > last_claim_time {
                current_time - last_claim_time
            } else {
                0
            };
            elapsed_time
        }

        fn claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer: Land,
            tax_payer: Land,
            mut payer_stake: LandStake,
            current_time: u64,
            our_contract_address: ContractAddress,
            ref neighbors_dict: Felt252Dict<Nullable<Array<Land>>>,
        ) -> bool {
            let neighbors_of_tax_payer = neighbors_with_their_neighbors(
                ref neighbors_dict, tax_payer.location,
            );
            let elapsed_earliest_claim_time = if current_time > payer_stake
                .earliest_claim_neighbor_time {
                current_time - payer_stake.earliest_claim_neighbor_time
            } else {
                0
            };
            let theoretical_max_payable = get_taxes_per_neighbor(
                tax_payer, elapsed_earliest_claim_time,
            )
                * payer_stake.num_active_neighbors.into();

            if payer_stake.amount > theoretical_max_payable.into() {
                let elapsed_time = self
                    .get_elapsed_time_since_last_claim(
                        claimer.location, tax_payer.location, current_time,
                    );
                let tax_for_claimer = get_taxes_per_neighbor(tax_payer, elapsed_time);
                self
                    ._execute_claim(
                        store,
                        claimer.location,
                        claimer.owner,
                        tax_payer,
                        tax_for_claimer,
                        payer_stake,
                        neighbors_of_tax_payer,
                        current_time,
                        our_contract_address,
                    );

                return false;
            } else {
                let is_nuke = self
                    ._calculate_taxes_and_verify_nuke(
                        store,
                        claimer,
                        tax_payer,
                        payer_stake,
                        neighbors_of_tax_payer,
                        current_time,
                        our_contract_address,
                    );
                is_nuke
            }
        }

        fn _calculate_taxes_and_verify_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            claimer: Land,
            tax_payer: Land,
            mut payer_stake: LandStake,
            neighbors_of_tax_payer: Array<Land>,
            current_time: u64,
            our_contract_address: ContractAddress,
        ) -> bool {
            let (total_taxes, tax_for_claimer, cache_elapased_time, total_elapsed_time) = self
                ._calculate_taxes_for_all_neighbors(
                    claimer,
                    tax_payer,
                    neighbors_of_tax_payer.span(),
                    payer_stake.amount,
                    current_time,
                );

            if total_taxes > payer_stake.amount {
                self
                    ._distribute_for_nuke(
                        tax_payer,
                        payer_stake.amount,
                        cache_elapased_time,
                        total_elapsed_time,
                        our_contract_address,
                    );
                payer_stake.amount = 0;
                store.set_land_stake(payer_stake);
                true
            } else {
                self
                    ._execute_claim(
                        store,
                        claimer.location,
                        claimer.owner,
                        tax_payer,
                        tax_for_claimer,
                        payer_stake,
                        neighbors_of_tax_payer,
                        current_time,
                        our_contract_address,
                    );
                false
            }
        }


        fn _distribute_for_nuke(
            ref self: ComponentState<TContractState>,
            tax_payer: Land,
            tax_payer_stake_amount: u256,
            cache_elapased_time: Array<(u16, ContractAddress, u64)>,
            total_elapsed_time: u64,
            our_contract_address: ContractAddress,
        ) {
            let mut tax_amount_for_neighbor: Array<(u16, ContractAddress, u256)> =
                ArrayTrait::new();

            for (location, neighbor_address, elapsed_time) in cache_elapased_time {
                let share_for_neighbor = (elapsed_time / total_elapsed_time).into()
                    * tax_payer_stake_amount;
                tax_amount_for_neighbor.append((location, neighbor_address, share_for_neighbor));
            };

            self._process_nuke(tax_payer, tax_amount_for_neighbor, our_contract_address)
        }

        fn calculate_nuke_time(
            ref self: ComponentState<TContractState>, mut store: Store, land: Land,
        ) -> u64 {
            let land_stake = store.land_stake(land.location);

            let neighbors = get_land_neighbors(store, land.location);
            let num_neighbors = neighbors.len();

            let current_time = get_block_timestamp();

            let tax_rate_per_neighbor = get_tax_rate_per_neighbor(land);
            let total_tax_rate = tax_rate_per_neighbor * num_neighbors.into();

            if total_tax_rate == 0 || TIME_SPEED == 0 {
                let max_u64 = Bounded::<u64>::MAX;
                return current_time + max_u64;
            }

            let remaining_time_units = (land_stake.amount * BASE_TIME.into()) / total_tax_rate;
            let mut min_remaining_time = 0;

            let mut i = 0;
            loop {
                if i == num_neighbors {
                    break;
                }

                let neighbor = *neighbors.at(i);
                let last_claim_time = self.last_claim_time.read((neighbor.location, land.location));

                let time_since_last_claim = current_time - last_claim_time;

                let current_remaining_time = remaining_time_units - time_since_last_claim.into();

                if current_remaining_time < min_remaining_time {
                    min_remaining_time = current_remaining_time;
                }

                i += 1;
            };

            let nuke_time = current_time + min_remaining_time.try_into().unwrap();

            nuke_time
        }


        /// Calculates tax distribution among all neighbors of a land
        /// Returns (total_taxes, tax_for_claimer)
        fn _calculate_taxes_for_all_neighbors(
            ref self: ComponentState<TContractState>,
            claimer: Land,
            tax_payer: Land,
            neighbors_of_tax_payer: Span<Land>,
            land_stake_amount: u256,
            current_time: u64,
        ) -> (u256, u256, Array<(u16, ContractAddress, u64)>, u64) {
            let mut total_taxes: u256 = 0;
            let mut tax_for_claimer: u256 = 0;
            let mut cache_elapsed_time: Array<(u16, ContractAddress, u64)> = ArrayTrait::new();
            let mut total_elapsed_time: u64 = 0;
            for neighbor in neighbors_of_tax_payer {
                let neighbor = *neighbor;
                let elapsed_time = self
                    .get_elapsed_time_since_last_claim(
                        neighbor.location, tax_payer.location, current_time,
                    );
                total_elapsed_time += elapsed_time;
                cache_elapsed_time.append((neighbor.location, neighbor.owner, elapsed_time));
                let tax_per_neighbor = get_taxes_per_neighbor(tax_payer, elapsed_time);
                total_taxes += tax_per_neighbor;

                if neighbor.location == claimer.location {
                    tax_for_claimer += tax_per_neighbor;
                }
            };

            (total_taxes, tax_for_claimer, cache_elapsed_time, total_elapsed_time)
        }


        //TODO:verify if here we have to call the function of execute claim
        fn _process_nuke(
            ref self: ComponentState<TContractState>,
            nuked_land: Land,
            neighbors_of_nuked_land: Array<(u16, ContractAddress, u256)>,
            our_contract_address: ContractAddress,
        ) {
            for (_, neighbor_address, tax_amount) in neighbors_of_nuked_land {
                self
                    ._transfer_tokens(
                        neighbor_address,
                        nuked_land.owner,
                        TokenInfo { token_address: nuked_land.token_used, amount: tax_amount },
                        our_contract_address,
                    );
            }
        }


        fn _transfer_tokens(
            ref self: ComponentState<TContractState>,
            tax_receiver: ContractAddress,
            tax_payer: ContractAddress,
            token_info: TokenInfo,
            our_contract_address: ContractAddress,
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);
            let validation_result = payable
                .validate(token_info.token_address, our_contract_address, token_info.amount);
            let status = payable.transfer(tax_receiver, validation_result);
            assert(status, errors::ERC20_TRANSFER_CLAIM_FAILED);
        }

        /// Executes the actual claim of taxes
        /// Handles token transfer and updates claim tracking
        fn _execute_claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer_location: u16,
            claimer_address: ContractAddress,
            tax_payer: Land,
            available_tax_for_claimer: u256,
            mut land_stake: LandStake,
            neighbors_of_tax_payer: Array<Land>,
            current_time: u64,
            our_contract_address: ContractAddress,
        ) {
            if available_tax_for_claimer > 0 && available_tax_for_claimer < land_stake.amount {
                self
                    ._transfer_tokens(
                        claimer_address,
                        tax_payer.owner,
                        TokenInfo {
                            token_address: tax_payer.token_used, amount: available_tax_for_claimer,
                        },
                        our_contract_address,
                    );

                store
                    .world
                    .emit_event(
                        @LandTransferEvent {
                            from_location: tax_payer.location,
                            to_location: claimer_location,
                            token_address: tax_payer.token_used,
                            amount: available_tax_for_claimer,
                        },
                    );

                self.last_claim_time.write((tax_payer.location, claimer_location), current_time);
                land_stake.amount -= available_tax_for_claimer;
                store.set_land_stake(land_stake);
                self
                    .update_earliest_claim_time(
                        store, land_stake, neighbors_of_tax_payer, current_time,
                    );
            }
        }

        fn update_earliest_claim_time(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            mut payer_stake: LandStake,
            neighbors: Array<Land>,
            current_time: u64,
        ) {
            let mut earliest_claim_time: u64 = 0;
            for neighbor in neighbors {
                let elapsed_time: u64 = self
                    .get_elapsed_time_since_last_claim(
                        neighbor.location, payer_stake.location, current_time,
                    );

                if earliest_claim_time == 0 || elapsed_time < earliest_claim_time {
                    earliest_claim_time = elapsed_time;
                };
            };
            payer_stake.earliest_claim_neighbor_time = earliest_claim_time;
            store.set_land_stake(payer_stake);
        }
    }
}
