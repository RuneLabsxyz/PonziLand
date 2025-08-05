/// @title Taxes Component for PonziLand
/// @notice This component manages the complex tax system that enables yield generation
/// between neighboring lands.
/// The tax system is the core mechanism that creates value flow and incentivizes strategic
/// land positioning.
///
/// Key concepts:
/// - Neighbors generate taxes from each other based on land value and time elapsed
/// - Stakes protect against "nuking" (forced sale when taxes exceed stake)
/// - Tax rates decrease with land level progression to reward long-term holders
/// - Fee system funds protocol operations through claim and nuke fees

use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

#[starknet::component]
mod TaxesComponent {
    // Core Cairo imports
    use core::num::traits::Bounded;
    use core::array::ArrayTrait;

    // Starknet imports
    use starknet::ContractAddress;
    use starknet::info::{get_block_timestamp};
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Vec, VecTrait,
        MutableVecTrait,
    };
    use starknet::contract_address::ContractAddressZeroable;

    // Dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::event::EventStorage;
    use dojo::world::WorldStorage;

    // External dependencies
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    // Models
    use ponzi_land::models::land::{Land, LandStake};

    // Components
    use ponzi_land::components::payable::{PayableComponent, IPayable, ValidationResult};

    // Store
    use ponzi_land::store::{Store, StoreTrait};

    // Utils
    use ponzi_land::utils::common_strucs::{TokenInfo};
    use ponzi_land::utils::math::{u64_saturating_sub, u64_saturating_add};
    use ponzi_land::utils::packing::{pack_neighbors_info, unpack_neighbors_info};
    use ponzi_land::utils::get_neighbors::get_land_neighbors;

    // Helpers
    use ponzi_land::helpers::coord::max_neighbors;
    use ponzi_land::helpers::land::{remove_neighbor};
    use ponzi_land::helpers::taxes::{
        get_taxes_per_neighbor, get_tax_rate_per_neighbor, calculate_share_for_nuke,
        calculate_and_return_taxes_with_fee,
    };

    // Events
    use ponzi_land::events::LandTransferEvent;

    // Errors
    use ponzi_land::errors::{ERC20_TRANSFER_CLAIM_FAILED};

    #[storage]
    struct Storage {
        last_claim_time: Map<(u16, u16), u64>,
    }


    #[generate_trait]
    impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +Drop<TContractState>,
        impl Payable: PayableComponent::HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        /// @notice Establishes bidirectional tax relationships between two neighboring lands
        /// @dev Creates mutual tax obligations between adjacent lands, enabling yield generation.
        /// Called when new land is purchased or when neighbor relationships are established.
        #[inline(always)]
        fn register_bidirectional_tax_relations(
            ref self: ComponentState<TContractState>, land_a: u16, land_b: u16, current_time: u64,
        ) {
            self._register_unidirectional_tax_relation(land_a, land_b, current_time);
            self._register_unidirectional_tax_relation(land_b, land_a, current_time);
        }

        /// @notice Internal function to register a unidirectional tax relationship
        /// @dev Sets the initial claim time for tax calculations between two specific lands.
        /// Uses tuple (payer, receiver) as key to track last claim time per relationship.
        #[inline(always)]
        fn _register_unidirectional_tax_relation(
            ref self: ComponentState<TContractState>,
            tax_receiver_location: u16,
            tax_payer_location: u16,
            current_time: u64,
        ) {
            self.last_claim_time.write((tax_payer_location, tax_receiver_location), current_time);
        }

        /// @notice Calculates time elapsed since the last tax claim between specific lands
        /// @dev Crucial for tax calculation as taxes accumulate over time.
        /// Uses saturating subtraction to prevent underflow if timestamps are inconsistent.
        fn get_elapsed_time_since_last_claim(
            self: @ComponentState<TContractState>,
            claimer_location: u16,
            payer_location: u16,
            current_time: u64,
        ) -> u64 {
            let last_claim_time = self.last_claim_time.read((payer_location, claimer_location));
            let elapsed_time = u64_saturating_sub(current_time, last_claim_time);
            elapsed_time
        }


        /// @notice Main tax claiming function - handles both regular claims and nuke scenarios
        /// @dev Core function that processes tax claims between neighboring lands.
        /// Implements sophisticated algorithm:
        /// 1) Check if land has sufficient stake for max taxes,
        /// 2) If sufficient, process normal claim,
        /// 3) If insufficient, trigger nuke calculation.
        /// @return bool True if claim resulted in nuke (forced auction), false for normal claim
        fn claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer: @Land,
            tax_payer: @Land,
            ref payer_stake: LandStake,
            current_time: u64,
            our_contract_address: ContractAddress,
            claim_fee: u128,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) -> bool {
            // Unpack neighbor information to determine nuke risk
            // This packed data contains the earliest claimable time and neighbor count for
            // efficiency
            let (
                earliest_claim_neighbor_time,
                num_active_neighbors,
                earliest_claim_neighbor_location,
            ) =
                unpack_neighbors_info(
                payer_stake.neighbors_info_packed,
            );
            let elapsed_earliest_claim_time = u64_saturating_sub(
                current_time, earliest_claim_neighbor_time,
            );

            // Calculate theoretical maximum taxes if all neighbors claimed from the earliest time
            // This is used as a quick check to determine if the land is at risk of being nuked
            let theoretical_max_payable = get_taxes_per_neighbor(
                tax_payer, elapsed_earliest_claim_time, store,
            )
                * num_active_neighbors.into();
            // Safe path: land has sufficient stake to handle maximum possible taxes
            if payer_stake.amount > theoretical_max_payable.into() {
                // Calculate actual taxes owed to this specific claimer
                let elapsed_time = self
                    .get_elapsed_time_since_last_claim(
                        *claimer.location, *tax_payer.location, current_time,
                    );

                let total_taxes = get_taxes_per_neighbor(tax_payer, elapsed_time, store);

                // Split taxes between claimer and protocol fee
                let (tax_for_claimer, fee_amount) = calculate_and_return_taxes_with_fee(
                    total_taxes, claim_fee,
                );
                payer_stake.accumulated_taxes_fee += fee_amount;
                self
                    ._execute_claim(
                        store,
                        *claimer.location,
                        *claimer.owner,
                        tax_payer,
                        tax_for_claimer,
                        ref payer_stake,
                        current_time,
                        claim_fee_threshold,
                        our_contract_address,
                        our_contract_for_fee,
                    );

                // Handle different update paths based on claimer position
                if *claimer.location == earliest_claim_neighbor_location {
                    // This claimer was the earliest, so we need to recalculate neighbor timing
                    let neighbors_of_tax_payer = get_land_neighbors(store, *tax_payer.location);
                    self
                        ._update_land_stake_and_earliest_claim_info(
                            store,
                            *claimer.location,
                            ref payer_stake,
                            neighbors_of_tax_payer,
                            current_time,
                            total_taxes,
                        );
                } else {
                    // Regular claim - just reduce stake and update storage
                    payer_stake.amount -= total_taxes;
                    store.set_land_stake(payer_stake);
                }
                return false; // Normal claim, no nuke
            } else {
                // Risk path: land may not have sufficient stake - detailed nuke calculation
                // required
                let neighbors_of_tax_payer = get_land_neighbors(store, *tax_payer.location);
                let is_nuke = self
                    ._calculate_taxes_and_verify_nuke(
                        store,
                        claimer,
                        earliest_claim_neighbor_location,
                        tax_payer,
                        ref payer_stake,
                        neighbors_of_tax_payer,
                        current_time,
                        our_contract_address,
                        claim_fee,
                        claim_fee_threshold,
                        our_contract_for_fee,
                    );
                is_nuke
            }
        }

        /// @notice Performs detailed tax calculation to determine if a land should be nuked
        /// @dev Called when quick nuke check suggests land may be at risk. Calculates exact taxes
        /// owed to all neighbors and determines final nuke outcome based on total stake available.
        fn _calculate_taxes_and_verify_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            claimer: @Land,
            earliest_claimer_location: u16,
            tax_payer: @Land,
            ref payer_stake: LandStake,
            neighbors_of_tax_payer: Span<Land>,
            current_time: u64,
            our_contract_address: ContractAddress,
            claim_fee: u128,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) -> bool {
            let (total_taxes, total_tax_for_claimer, cache_elapased_time, total_elapsed_time) = self
                ._calculate_taxes_for_all_neighbors(
                    claimer,
                    tax_payer,
                    neighbors_of_tax_payer,
                    payer_stake.amount,
                    current_time,
                    store,
                );
            if total_taxes >= payer_stake.amount {
                self
                    ._handle_nuke(
                        store,
                        tax_payer,
                        ref payer_stake,
                        cache_elapased_time,
                        total_elapsed_time,
                        our_contract_address,
                        claim_fee,
                        claim_fee_threshold,
                        our_contract_for_fee,
                    );

                //last claim for nuked land
                for neighbor in neighbors_of_tax_payer {
                    let mut neghbor_stake = store.land_stake(*neighbor.location);

                    self
                        .claim(
                            store,
                            tax_payer,
                            neighbor,
                            ref neghbor_stake,
                            current_time,
                            our_contract_address,
                            claim_fee,
                            claim_fee_threshold,
                            our_contract_for_fee,
                        );
                    store.set_land_stake(neghbor_stake);
                };
                payer_stake.amount = 0;
                store.set_land_stake(payer_stake);

                true
            } else {
                let (tax_for_claimer, fee_amount) = calculate_and_return_taxes_with_fee(
                    total_tax_for_claimer, claim_fee,
                );
                payer_stake.accumulated_taxes_fee += fee_amount;
                self
                    ._execute_claim(
                        store,
                        *claimer.location,
                        *claimer.owner,
                        tax_payer,
                        tax_for_claimer,
                        ref payer_stake,
                        current_time,
                        claim_fee_threshold,
                        our_contract_address,
                        our_contract_for_fee,
                    );
                if *claimer.location == earliest_claimer_location {
                    self
                        ._update_land_stake_and_earliest_claim_info(
                            store,
                            *claimer.location,
                            ref payer_stake,
                            neighbors_of_tax_payer,
                            current_time,
                            total_tax_for_claimer,
                        );
                } else {
                    payer_stake.amount -= total_tax_for_claimer;
                    store.set_land_stake(payer_stake);
                }

                false
            }
        }

        /// @notice Handles the nuke process by distributing remaining stake to neighbors
        /// @dev Calculates proportional shares based on elapsed claim times and processes
        /// distributions.
        /// Each neighbor receives stake proportional to their unclaimed time period.
        fn _handle_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            tax_payer: @Land,
            ref tax_payer_stake: LandStake,
            cache_elapased_time: Array<(u16, ContractAddress, u64)>,
            total_elapsed_time: u64,
            our_contract_address: ContractAddress,
            claim_fee: u128,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) {
            let mut tax_amount_for_neighbor: Array<(u16, ContractAddress, u256)> =
                ArrayTrait::new();
            for (location, neighbor_address, elapsed_time) in cache_elapased_time {
                let share_for_neighbor = calculate_share_for_nuke(
                    elapsed_time, total_elapsed_time, tax_payer_stake.amount,
                );
                let (share_for_neighbor, fee_amount) = calculate_and_return_taxes_with_fee(
                    share_for_neighbor, claim_fee,
                );
                tax_payer_stake.accumulated_taxes_fee += fee_amount;
                tax_amount_for_neighbor.append((location, neighbor_address, share_for_neighbor));
            };

            self
                ._distribute_nuke(
                    store,
                    tax_payer,
                    ref tax_payer_stake,
                    tax_amount_for_neighbor.span(),
                    our_contract_address,
                    claim_fee_threshold,
                    our_contract_for_fee,
                );
        }

        /// @notice Calculates when a land will be nuked if no additional stake is added
        /// @dev Critical function for UI/gameplay - determines exact timestamp when land becomes
        /// vulnerable to nuke. Based on current stake, tax rates, and neighbor claim patterns.
        /// @return u64 Timestamp when land will be nuked, or MAX if safe indefinitely
        fn calculate_nuke_time(
            self: @ComponentState<TContractState>,
            mut store: Store,
            land: @Land,
            land_stake: @LandStake,
            neighbors: Span<Land>,
        ) -> u64 {
            let num_neighbors = neighbors.len();
            let current_time = get_block_timestamp();
            let tax_rate_per_neighbor = get_tax_rate_per_neighbor(land, store);
            let total_tax_rate = tax_rate_per_neighbor * num_neighbors.into();

            if total_tax_rate == 0 || store.get_time_speed() == 0 {
                return 0;
            }

            let remaining_time_units = (*land_stake.amount * store.get_base_time().into())
                / total_tax_rate;
            let mut min_remaining_time = remaining_time_units.try_into().unwrap();

            for neighbor in neighbors {
                let elapsed_time = self
                    .get_elapsed_time_since_last_claim(
                        *neighbor.location, *land.location, current_time,
                    );
                let current_remaining_time = u64_saturating_sub(
                    remaining_time_units.try_into().unwrap(), elapsed_time,
                );

                if current_remaining_time < min_remaining_time {
                    min_remaining_time = current_remaining_time;
                }
            };

            if min_remaining_time == 0 {
                return current_time;
            }

            u64_saturating_add(current_time, min_remaining_time)
        }


        fn _calculate_taxes_for_all_neighbors(
            ref self: ComponentState<TContractState>,
            claimer: @Land,
            tax_payer: @Land,
            neighbors_of_tax_payer: Span<Land>,
            land_stake_amount: u256,
            current_time: u64,
            store: Store,
        ) -> (u256, u256, Array<(u16, ContractAddress, u64)>, u64) {
            let mut total_taxes: u256 = 0;
            let mut tax_for_claimer: u256 = 0;
            let mut cache_elapsed_time: Array<(u16, ContractAddress, u64)> = ArrayTrait::new();
            let mut total_elapsed_time: u64 = 0;
            for neighbor in neighbors_of_tax_payer {
                let neighbor_location = *neighbor.location;
                let elapsed_time = self
                    .get_elapsed_time_since_last_claim(
                        neighbor_location, *tax_payer.location, current_time,
                    );
                total_elapsed_time += elapsed_time;
                cache_elapsed_time.append((neighbor_location, *neighbor.owner, elapsed_time));
                let tax_per_neighbor = get_taxes_per_neighbor(tax_payer, elapsed_time, store);
                total_taxes += tax_per_neighbor;

                if neighbor_location == *claimer.location {
                    tax_for_claimer += tax_per_neighbor;
                }
            };

            (total_taxes, tax_for_claimer, cache_elapsed_time, total_elapsed_time)
        }


        fn _distribute_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            nuked_land: @Land,
            ref nuked_land_stake: LandStake,
            neighbors_of_nuked_land: Span<(u16, ContractAddress, u256)>,
            our_contract_address: ContractAddress,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) {
            for (neighbor_location, neighbor_address, tax_amount) in neighbors_of_nuked_land {
                self
                    ._transfer_tokens(
                        *neighbor_address,
                        *nuked_land.owner,
                        TokenInfo { token_address: *nuked_land.token_used, amount: *tax_amount },
                        ref nuked_land_stake,
                        claim_fee_threshold,
                        our_contract_address,
                        our_contract_for_fee,
                        true,
                    );
                if let Option::Some(updated_stake) =
                    remove_neighbor(store.land_stake(*neighbor_location)) {
                    store.set_land_stake(updated_stake);
                }
            }
        }


        fn _transfer_tokens(
            ref self: ComponentState<TContractState>,
            tax_receiver: ContractAddress,
            tax_payer: ContractAddress,
            token_info: TokenInfo,
            ref land_stake: LandStake,
            claim_fee_threshold: u128,
            our_contract_address: ContractAddress,
            our_contract_for_fee: ContractAddress,
            from_nuke: bool,
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);
            let total_amount_to_validate = token_info.amount
                + land_stake.accumulated_taxes_fee.into();
            let validation_result = payable
                .validate(token_info.token_address, our_contract_address, total_amount_to_validate);

            let validation_result_for_fees = ValidationResult {
                status: validation_result.status,
                token_address: validation_result.token_address,
                amount: land_stake.accumulated_taxes_fee.into(),
            };
            let validation_result_for_claim = ValidationResult {
                status: validation_result.status,
                token_address: validation_result.token_address,
                amount: token_info.amount,
            };

            let mut status_for_transfer_fee = true;
            if from_nuke && land_stake.accumulated_taxes_fee > 0 {
                status_for_transfer_fee = payable
                    .transfer(our_contract_for_fee, validation_result_for_fees);
                land_stake.accumulated_taxes_fee = 0;
            } else if land_stake.accumulated_taxes_fee >= claim_fee_threshold {
                status_for_transfer_fee = payable
                    .transfer(our_contract_for_fee, validation_result_for_fees);
                land_stake.accumulated_taxes_fee = 0;
            }

            let status = payable.transfer(tax_receiver, validation_result_for_claim);
            assert(status && status_for_transfer_fee, ERC20_TRANSFER_CLAIM_FAILED);
        }

        /// @notice Executes the actual claim of taxes
        /// @dev Handles token transfer and updates claim tracking
        fn _execute_claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer_location: u16,
            claimer_address: ContractAddress,
            tax_payer: @Land,
            available_tax_for_claimer: u256,
            ref land_stake: LandStake,
            current_time: u64,
            claim_fee_threshold: u128,
            our_contract_address: ContractAddress,
            our_contract_for_fee: ContractAddress,
        ) {
            if available_tax_for_claimer > 0 && available_tax_for_claimer < land_stake.amount {
                self
                    ._transfer_tokens(
                        claimer_address,
                        *tax_payer.owner,
                        TokenInfo {
                            token_address: *tax_payer.token_used, amount: available_tax_for_claimer,
                        },
                        ref land_stake,
                        claim_fee_threshold,
                        our_contract_address,
                        our_contract_for_fee,
                        false,
                    );

                store
                    .world
                    .emit_event(
                        @LandTransferEvent {
                            from_location: *tax_payer.location,
                            to_location: claimer_location,
                            token_address: *tax_payer.token_used,
                            amount: available_tax_for_claimer,
                        },
                    );

                self.last_claim_time.write((*tax_payer.location, claimer_location), current_time);
            }
        }

        fn _update_land_stake_and_earliest_claim_info(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer_location: u16,
            ref land_stake: LandStake,
            neighbors_of_tax_payer: Span<Land>,
            current_time: u64,
            available_tax_for_claimer: u256,
        ) {
            land_stake.amount -= available_tax_for_claimer;
            let (new_earliest_time, new_earliest_location) = self
                ._find_new_earliest_claim_time(
                    land_stake.location, neighbors_of_tax_payer.clone(), current_time,
                );
            let neighbors_info = pack_neighbors_info(
                new_earliest_time,
                neighbors_of_tax_payer.len().try_into().unwrap(),
                new_earliest_location,
            );
            land_stake.neighbors_info_packed = neighbors_info;

            store.set_land_stake(land_stake);
        }


        fn _find_new_earliest_claim_time(
            ref self: ComponentState<TContractState>,
            payer_location: u16,
            neighbors: Span<Land>,
            current_time: u64,
        ) -> (u64, u16) {
            let mut earliest_claim_time: u64 = 0;
            let mut earliest_claim_location: u16 = 0;
            for neighbor in neighbors {
                let elapsed_time: u64 = self
                    .get_elapsed_time_since_last_claim(
                        *neighbor.location, payer_location, current_time,
                    );

                if earliest_claim_time == 0 || elapsed_time < earliest_claim_time {
                    earliest_claim_time = elapsed_time;
                    earliest_claim_location = *neighbor.location;
                };
            };
            (earliest_claim_time, earliest_claim_location)
        }

        fn initialize_claim_info(
            ref self: ComponentState<TContractState>,
            tax_payer_location: u16,
            neighbors: Span<Land>,
            current_time: u64,
        ) -> (u64, u16) {
            self._find_new_earliest_claim_time(tax_payer_location, neighbors, current_time)
        }
    }
}
