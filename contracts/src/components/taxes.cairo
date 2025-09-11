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
    use core::array::ArrayTrait;
    use core::num::traits::Bounded;
    use dojo::event::EventStorage;

    // Dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};
    use dojo::world::WorldStorage;

    // Components
    use ponzi_land::components::payable::{IPayable, PayableComponent, ValidationResult};

    // Errors
    use ponzi_land::errors::{ERC20_TRANSFER_CLAIM_FAILED};

    // Events
    use ponzi_land::events::LandTransferEvent;

    // Helpers
    use ponzi_land::helpers::coord::max_neighbors;
    use ponzi_land::helpers::land::remove_neighbor;
    use ponzi_land::helpers::taxes::{
        calculate_and_return_taxes_with_fee, calculate_share_for_nuke, get_tax_rate_per_neighbor,
        get_taxes_per_neighbor,
    };

    // Models
    use ponzi_land::models::land::{Land, LandStake};

    // Store
    use ponzi_land::store::{Store, StoreTrait};

    // Utils
    use ponzi_land::utils::common_strucs::{TokenInfo};
    use ponzi_land::utils::get_neighbors::get_land_neighbors;
    use ponzi_land::utils::math::{u256_saturating_mul, u64_saturating_add, u64_saturating_sub};
    use ponzi_land::utils::packing::{pack_neighbors_info, unpack_neighbors_info};

    // Starknet imports
    use starknet::ContractAddress;
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::info::get_block_timestamp;
    use starknet::storage::{
        Map, MutableVecTrait, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
        Vec, VecTrait,
    };

    // External dependencies
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    #[storage]
    struct Storage {
        last_claim_time: Map<(u16, u16), u64>,
    }

    /// @notice Comprehensive tax calculation results for claim strategy determination
    #[derive(Drop, Serde, Debug)]
    struct TaxCalculationData {
        total_taxes: u256,
        total_tax_for_claimer: u256,
        elapsed_time_claimer: u64,
        cache_elapsed_time: Span<(ContractAddress, u64)>,
        total_elapsed_time: u64,
    }

    /// @notice Strategy patterns for different claim scenarios based on land stake sufficiency
    #[derive(Drop, Serde, Debug)]
    enum ClaimStrategy {
        Fast,
        Safe: TaxCalculationData,
        Nuke: TaxCalculationData,
        NukeCascadeProtection: TaxCalculationData,
    }

    /// @notice Configuration data bundle for claim processing operations
    #[derive(Drop)]
    struct ClaimConfig {
        claimer: Land,
        tax_payer: Land,
        current_time: u64,
        from_nuke: bool,
        claim_fee: u128,
        claim_fee_threshold: u128,
        our_contract: ContractAddress,
        our_contract_for_fee: ContractAddress,
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
        #[inline(always)]
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


        /// @notice Main entry point for tax claim processing between neighboring lands
        /// @dev Orchestrates the entire claim flow by setting up configuration and delegating
        /// to the appropriate claim strategy. Handles neighbor info unpacking and validation.
        /// @return bool True if land was nuked during claim, false for normal claims
        fn claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            claimer: Land,
            tax_payer: Land,
            ref payer_stake: LandStake,
            current_time: u64,
            our_contract_address: ContractAddress,
            claim_fee: u128,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
            from_nuke: bool,
        ) -> bool {
            let config = ClaimConfig {
                claimer: claimer,
                tax_payer: tax_payer,
                current_time: current_time,
                from_nuke: from_nuke,
                claim_fee: claim_fee,
                claim_fee_threshold: claim_fee_threshold,
                our_contract: our_contract_address,
                our_contract_for_fee: our_contract_for_fee,
            };

            let (
                earliest_claim_neighbor_time,
                num_active_neighbors,
                earliest_claim_neighbor_location,
            ) =
                unpack_neighbors_info(
                payer_stake.neighbors_info_packed,
            );

            let neighbors_info = NeighborsInfo {
                earliest_claim_neighbor_time,
                num_active_neighbors,
                earliest_claim_neighbor_location,
            };

            self._process_claim(store, ref payer_stake, @config, @neighbors_info)
        }

        /// @notice Routes claim processing to the appropriate execution strategy
        /// @dev Central dispatcher that determines claim strategy and delegates to specific
        /// execution functions. Handles the strategy pattern for different claim scenarios.
        /// @return bool True if land was nuked, false for normal claims
        fn _process_claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            ref payer_stake: LandStake,
            config: @ClaimConfig,
            neighbors_info: @NeighborsInfo,
        ) -> bool {
            let claim_strategy = self
                ._assess_claim_strategy(store, @payer_stake, neighbors_info, config);

            match claim_strategy {
                ClaimStrategy::Fast => self
                    ._execute_fast_claim(store, ref payer_stake, neighbors_info, config),
                ClaimStrategy::Safe(tax_data) => {
                    self
                        ._execute_safe_claim(
                            store, ref payer_stake, config, neighbors_info, @tax_data,
                        )
                },
                ClaimStrategy::Nuke(tax_data) => {
                    self._execute_nuke(store, ref payer_stake, config.tax_payer, @tax_data, config)
                },
                ClaimStrategy::NukeCascadeProtection(tax_data) => {
                    self
                        ._execute_nuke_cascade_protection(
                            store, ref payer_stake, config, neighbors_info, @tax_data,
                        )
                },
            }
        }

        /// @notice Determines the optimal claim strategy based on stake amount and tax calculations
        /// @dev Analyzes land vulnerability to determine whether to use fast path, safe claim,
        /// nuke, or cascade protection. Uses theoretical maximum taxes for quick assessment.
        /// @return ClaimStrategy enum indicating the appropriate claim approach
        fn _assess_claim_strategy(
            self: @ComponentState<TContractState>,
            store: Store,
            payer_stake: @LandStake,
            neighbors_info: @NeighborsInfo,
            config: @ClaimConfig,
        ) -> ClaimStrategy {
            let elapsed_earliest_claim_time = u64_saturating_sub(
                *config.current_time, *neighbors_info.earliest_claim_neighbor_time,
            );

            // Calculate theoretical maximum taxes if all neighbors claimed from the earliest time
            // This is used as a quick check to determine if the land is at risk of being nuked
            let tax_per_neighbor = get_taxes_per_neighbor(
                config.tax_payer, elapsed_earliest_claim_time, store,
            );
            let num_active_neighbors = *neighbors_info.num_active_neighbors;
            let theoretical_max_payable = u256_saturating_mul(
                tax_per_neighbor, num_active_neighbors.into(),
            );
            // Fast path: land has sufficient stake to handle maximum possible taxes

            // Fast path: land has sufficient stake to handle maximum possible taxes
            if *payer_stake.amount > theoretical_max_payable {
                return ClaimStrategy::Fast;
            }

            // For all other cases, we need to calculate exact taxes
            let neighbors_of_tax_payer = get_land_neighbors(store, *config.tax_payer.location);
            let tax_calculation_data = self
                ._calculate_taxes_for_all_neighbors(
                    store, config, *payer_stake.amount, neighbors_of_tax_payer,
                );

            // Determine strategy based on actual tax calculation and context
            if tax_calculation_data.total_taxes < *payer_stake.amount {
                ClaimStrategy::Safe(tax_calculation_data)
            } else if *config.from_nuke && num_active_neighbors == 1 {
                ClaimStrategy::Nuke(tax_calculation_data) // Dead land case
            } else if *config.from_nuke {
                ClaimStrategy::NukeCascadeProtection(tax_calculation_data)
            } else {
                ClaimStrategy::Nuke(tax_calculation_data) // Standard nuke
            }
        }


        /// @notice Executes optimized claim path for lands with sufficient stake
        /// @dev Fast path that skips complex tax calculations when land has enough stake
        /// to handle maximum possible taxes. Calculates only actual taxes owed to claimer.
        /// @return bool Always false (no nuke in fast claims)
        fn _execute_fast_claim(
            ref self: ComponentState<TContractState>,
            store: Store,
            ref payer_stake: LandStake,
            neighbors_info: @NeighborsInfo,
            config: @ClaimConfig,
        ) -> bool {
            // Calculate actual taxes owed to this specific claimer
            let elapsed_time = self
                .get_elapsed_time_since_last_claim(
                    *config.claimer.location, *config.tax_payer.location, *config.current_time,
                );

            let total_taxes = get_taxes_per_neighbor(config.tax_payer, elapsed_time, store);

            // Split taxes between claimer and protocol fee
            let (tax_for_claimer, fee_amount) = calculate_and_return_taxes_with_fee(
                total_taxes, *config.claim_fee,
            );
            payer_stake.accumulated_taxes_fee += fee_amount;
            self._execute_claim(store, ref payer_stake, config, tax_for_claimer);

            // Handle different update paths based on claimer position
            self
                ._handle_earliest_neighbor_claim_info(
                    store, ref payer_stake, config, neighbors_info,
                );

            // Safe claim - just reduce stake and update storage
            payer_stake.amount -= total_taxes;
            store.set_land_stake(payer_stake);

            false // Normal claim, no nuke
        }


        /// @notice Executes normal claim when land has sufficient stake for all taxes
        /// @dev Processes claim using pre-calculated tax data when land is not at risk.
        /// Updates neighbor timing information and reduces stake by claimed amount.
        /// @return bool Always false (no nuke in safe claims)
        fn _execute_safe_claim(
            ref self: ComponentState<TContractState>,
            store: Store,
            ref payer_stake: LandStake,
            config: @ClaimConfig,
            neighbors_info: @NeighborsInfo,
            tax_data: @TaxCalculationData,
        ) -> bool {
            let (tax_for_claimer, fee_amount) = calculate_and_return_taxes_with_fee(
                *tax_data.total_tax_for_claimer, *config.claim_fee,
            );
            payer_stake.accumulated_taxes_fee += fee_amount;
            self._execute_claim(store, ref payer_stake, config, tax_for_claimer);

            self
                ._handle_earliest_neighbor_claim_info(
                    store, ref payer_stake, config, neighbors_info,
                );

            payer_stake.amount -= *tax_data.total_tax_for_claimer;
            store.set_land_stake(payer_stake);
            false
        }


        /// @notice Handles the nuke process by distributing remaining stake to neighbors
        /// @dev Calculates proportional shares based on elapsed claim times and processes
        /// distributions.
        /// Each neighbor receives stake proportional to their unclaimed time period.
        fn _execute_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            ref tax_payer_stake: LandStake,
            tax_payer: @Land,
            tax_data: @TaxCalculationData,
            config: @ClaimConfig,
        ) -> bool {
            let mut tax_amount_for_neighbor: Array<(ContractAddress, u256)> = ArrayTrait::new();
            let mut total_shares_calculated: u256 = 0;
            let mut total_fee_amount: u256 = 0;
            for (neighbor_address, individual_elapsed_time) in *tax_data.cache_elapsed_time {
                let share_for_neighbor = calculate_share_for_nuke(
                    *individual_elapsed_time, *tax_data.total_elapsed_time, tax_payer_stake.amount,
                );
                let (share_for_neighbor, fee_amount) = calculate_and_return_taxes_with_fee(
                    share_for_neighbor, *config.claim_fee,
                );

                tax_payer_stake.accumulated_taxes_fee += fee_amount;
                total_fee_amount += fee_amount.into();
                tax_amount_for_neighbor.append((*neighbor_address, share_for_neighbor));
                total_shares_calculated += share_for_neighbor;
            }

            // Add remainder from precision loss to fees
            let distributed_total = total_shares_calculated + total_fee_amount;
            let remainder = tax_payer_stake.amount - distributed_total;
            if remainder > 0 {
                tax_payer_stake.accumulated_taxes_fee += remainder.try_into().unwrap();
            }
            self
                ._distribute_nuke(
                    store, tax_payer, ref tax_payer_stake, tax_amount_for_neighbor.span(), config,
                );

            tax_payer_stake.amount = 0;
            store.set_land_stake(tax_payer_stake);
            return true;
        }


        /// @notice Handles partial payments during cascade protection scenarios
        /// @dev Protects against cascade nuking by allowing partial stake distribution
        /// without fully nuking the land. Used when land has multiple neighbors and
        /// is being claimed during a nuke cascade from another land.
        /// @return bool Always false (cascade protection prevents nuke)
        fn _execute_nuke_cascade_protection(
            ref self: ComponentState<TContractState>,
            store: Store,
            ref tax_payer_stake: LandStake,
            config: @ClaimConfig,
            neighbors_info: @NeighborsInfo,
            tax_data: @TaxCalculationData,
        ) -> bool {
            // Normal cascade protection: partial payment without full nuke
            // Send share for the claimer but not nuked the land because we are in a cascade
            let total_share_for_neighbor = calculate_share_for_nuke(
                *tax_data.elapsed_time_claimer,
                *tax_data.total_elapsed_time,
                tax_payer_stake.amount,
            );
            let (share_for_neighbor, fee_amount) = calculate_and_return_taxes_with_fee(
                total_share_for_neighbor, *config.claim_fee,
            );
            tax_payer_stake.accumulated_taxes_fee += fee_amount;
            self._execute_claim(store, ref tax_payer_stake, config, share_for_neighbor);

            self
                ._handle_earliest_neighbor_claim_info(
                    store, ref tax_payer_stake, config, neighbors_info,
                );

            tax_payer_stake.amount -= total_share_for_neighbor;
            store.set_land_stake(tax_payer_stake);
            false
        }


        /// @notice Executes the actual claim of taxes
        /// @dev Handles token transfer and updates claim tracking
        fn _execute_claim(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            ref payer_stake: LandStake,
            config: @ClaimConfig,
            available_tax_for_claimer: u256,
        ) {
            if available_tax_for_claimer > 0 && available_tax_for_claimer < payer_stake.amount {
                //TODO:ver si podemos mejorar esto
                self
                    ._transfer_tokens(
                        *config.claimer.owner,
                        *config.tax_payer.owner,
                        TokenInfo {
                            token_address: *config.tax_payer.token_used,
                            amount: available_tax_for_claimer,
                        },
                        ref payer_stake,
                        config,
                        false,
                    );

                store
                    .world
                    .emit_event(
                        @LandTransferEvent {
                            from_location: *config.tax_payer.location,
                            to_location: *config.claimer.location,
                            token_address: *config.tax_payer.token_used,
                            amount: available_tax_for_claimer,
                        },
                    );

                self
                    .last_claim_time
                    .write(
                        (*config.tax_payer.location, *config.claimer.location),
                        *config.current_time,
                    );
            }
        }


        /// @notice Distributes nuked land's stake proportionally to all neighbors
        /// @dev Handles the actual token transfers when a land is nuked. Validates
        /// that total distribution doesn't exceed available stake and processes
        /// transfers to each neighbor based on their calculated share.
        fn _distribute_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            nuked_land: @Land,
            ref nuked_land_stake: LandStake,
            neighbors_of_nuked_land: Span<(ContractAddress, u256)>,
            config: @ClaimConfig,
        ) {
            let mut total_to_distribute: u256 = 0;
            for (_, tax_amount) in neighbors_of_nuked_land {
                total_to_distribute += *tax_amount;
            };
            assert(total_to_distribute <= nuked_land_stake.amount, 'Distribution of nuke > stake');

            for (neighbor_address, tax_amount) in neighbors_of_nuked_land {
                self
                    ._transfer_tokens(
                        *neighbor_address,
                        *nuked_land.owner,
                        TokenInfo { token_address: *nuked_land.token_used, amount: *tax_amount },
                        ref nuked_land_stake,
                        config,
                        true,
                    );
            }
        }


        /// @notice Updates neighbor timing information when the earliest claimer claims
        /// @dev Recalculates earliest claim neighbor info after a claim from the earliest neighbor
        #[inline(always)]
        fn _handle_earliest_neighbor_claim_info(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            ref payer_stake: LandStake,
            config: @ClaimConfig,
            neighbors_info: @NeighborsInfo,
        ) {
            if config.claimer.location == neighbors_info.earliest_claim_neighbor_location {
                // This claimer was the earliest, so we need to recalculate neighbor timing
                let neighbors_of_tax_payer = get_land_neighbors(store, *config.tax_payer.location);
                self
                    ._update_earliest_claim_info(
                        store, ref payer_stake, neighbors_of_tax_payer, *config.current_time,
                    );
            }
        }

        /// @notice Updates packed neighbor timing information after claim processing
        /// @dev Recalculates and packs the earliest claim time and location data
        /// into the land stake's packed format for efficient storage.
        #[inline(always)]
        fn _update_earliest_claim_info(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            ref land_stake: LandStake,
            neighbors_of_tax_payer: Span<Land>,
            current_time: u64,
        ) {
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
        }


        /// @notice Finds the neighbor with the shortest elapsed time since last claim
        /// @dev Iterates through all neighbors to identify which one has claimed most recently.
        /// This information is crucial for optimizing tax calculations and nuke timing.
        /// @return (u64, u16) Tuple of (elapsed_time, neighbor_location) for earliest claimer
        #[inline(always)]
        fn _find_new_earliest_claim_time(
            self: @ComponentState<TContractState>,
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


        /// @notice Calculates comprehensive tax data for all neighbors of a land
        /// @dev Computes total taxes, claimer-specific taxes, and elapsed times for all
        /// neighbors. Creates the cache needed for nuke distribution calculations.
        /// Essential for determining exact claim strategies and nuke scenarios.
        /// @return TaxCalculationData Complete tax calculation results for strategy determination
        fn _calculate_taxes_for_all_neighbors(
            self: @ComponentState<TContractState>,
            store: Store,
            config: @ClaimConfig,
            land_stake_amount: u256,
            neighbors_of_tax_payer: Span<Land>,
        ) -> TaxCalculationData {
            let mut total_taxes: u256 = 0;
            let mut total_tax_for_claimer: u256 = 0;
            let mut cache_elapsed_time: Array<(ContractAddress, u64)> = ArrayTrait::new();
            let mut total_elapsed_time: u64 = 0;
            let mut elapsed_time_claimer: u64 = 0;
            for neighbor in neighbors_of_tax_payer {
                let neighbor_location = *neighbor.location;
                let elapsed_time = self
                    .get_elapsed_time_since_last_claim(
                        neighbor_location, *config.tax_payer.location, *config.current_time,
                    );
                total_elapsed_time += elapsed_time;
                cache_elapsed_time.append((*neighbor.owner, elapsed_time));
                let tax_per_neighbor = get_taxes_per_neighbor(
                    config.tax_payer, elapsed_time, store,
                );
                total_taxes += tax_per_neighbor;

                if neighbor_location == *config.claimer.location {
                    total_tax_for_claimer += tax_per_neighbor;
                    elapsed_time_claimer = elapsed_time;
                }
            };
            let cache_elapsed_time = cache_elapsed_time.span();
            TaxCalculationData {
                total_taxes,
                total_tax_for_claimer,
                elapsed_time_claimer,
                cache_elapsed_time,
                total_elapsed_time,
            }
        }


        /// @notice Handles secure token transfers for tax claims and fee collection
        /// @dev Manages both claim transfers and protocol fee collection with proper
        /// validation. Uses PayableComponent for secure ERC20 operations and handles
        /// fee thresholds for gas optimization.
        fn _transfer_tokens(
            ref self: ComponentState<TContractState>,
            tax_receiver: ContractAddress,
            tax_payer: ContractAddress,
            token_info: TokenInfo,
            ref land_stake: LandStake,
            config: @ClaimConfig,
            from_nuke: bool,
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);
            let total_amount_to_validate = token_info.amount
                + land_stake.accumulated_taxes_fee.into();
            let validation_result = payable
                .validate(token_info.token_address, *config.our_contract, total_amount_to_validate);

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
                    .transfer(*config.our_contract_for_fee, validation_result_for_fees);
                land_stake.accumulated_taxes_fee = 0;
            } else if land_stake.accumulated_taxes_fee >= *config.claim_fee_threshold {
                status_for_transfer_fee = payable
                    .transfer(*config.our_contract_for_fee, validation_result_for_fees);
                land_stake.accumulated_taxes_fee = 0;
            }

            let status = payable.transfer(tax_receiver, validation_result_for_claim);
            assert(status && status_for_transfer_fee, ERC20_TRANSFER_CLAIM_FAILED);
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
            }

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
        ) -> (u256, u256, u64, Array<(ContractAddress, u64)>, u64) {
            let mut total_taxes: u256 = 0;
            let mut tax_for_claimer: u256 = 0;
            let mut cache_elapsed_time: Array<(ContractAddress, u64)> = ArrayTrait::new();
            let mut total_elapsed_time: u64 = 0;
            let mut elapsed_time_claimer: u64 = 0;
            for neighbor in neighbors_of_tax_payer {
                let neighbor_location = *neighbor.location;
                let elapsed_time = self
                    .get_elapsed_time_since_last_claim(
                        neighbor_location, *tax_payer.location, current_time,
                    );
                total_elapsed_time += elapsed_time;
                cache_elapsed_time.append((*neighbor.owner, elapsed_time));
                let tax_per_neighbor = get_taxes_per_neighbor(tax_payer, elapsed_time, store);
                total_taxes += tax_per_neighbor;

                if neighbor_location == *claimer.location {
                    tax_for_claimer += tax_per_neighbor;
                    elapsed_time_claimer = elapsed_time;
                }
            }

            (
                total_taxes,
                tax_for_claimer,
                elapsed_time_claimer,
                cache_elapsed_time,
                total_elapsed_time,
            )
        }


        fn _distribute_nuke(
            ref self: ComponentState<TContractState>,
            store: Store,
            nuked_land: @Land,
            ref nuked_land_stake: LandStake,
            neighbors_of_nuked_land: Span<(ContractAddress, u256)>,
            our_contract_address: ContractAddress,
            claim_fee_threshold: u128,
            our_contract_for_fee: ContractAddress,
        ) {
            let mut total_to_distribute: u256 = 0;
            for (_, tax_amount) in neighbors_of_nuked_land {
                total_to_distribute += *tax_amount;
            }
            assert(total_to_distribute <= nuked_land_stake.amount, 'Distribution of nuke > stake');

            for (neighbor_address, tax_amount) in neighbors_of_nuked_land {
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

        fn _update_earliest_claim_info(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            ref land_stake: LandStake,
            neighbors_of_tax_payer: Span<Land>,
            current_time: u64,
        ) {
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
            }
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

