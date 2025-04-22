use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

#[starknet::component]
mod TaxesComponent {
    //use dojo imports
    use dojo::model::{ModelStorage, ModelValueStorage};

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
    use ponzi_land::models::land::Land;
    use ponzi_land::consts::{TAX_RATE, BASE_TIME, TIME_SPEED};
    use ponzi_land::store::{Store, StoreTrait};
    use ponzi_land::utils::get_neighbors::{neighbors_with_their_neighbors};
    use ponzi_land::utils::level_up::calculate_discount_for_level;
    use ponzi_land::components::payable::{PayableComponent, IPayable};
    use ponzi_land::utils::common_strucs::{TokenInfo};
    use ponzi_land::helpers::taxes::{get_taxes_per_neighbor, get_tax_rate_per_neighbor};

    // Local imports
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    mod errors {
        const ERC20_TRANSFER_CLAIM_FAILED: felt252 = 'Transfer for claim failed';
    }

    #[storage]
    struct Storage {
        //  land_owner,location,token_address -> amount
        pending_taxes_for_land: Map<(ContractAddress, u16, ContractAddress), u256>,
        //land_owner,location ->  token_addresses
        pending_tokens_for_land: Map<(ContractAddress, u16), Vec<ContractAddress>>,
        last_claim_time: Map<(u16, u16), u64>,
    }

    // Events

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {}

    #[generate_trait]
    impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +Drop<TContractState>,
        impl Payable: PayableComponent::HasComponent<TContractState>,
    > of InternalTrait<TContractState> {
        fn _calculate_and_distribute(
            ref self: ComponentState<TContractState>,
            mut store: Store,
            ref land: Land,
            ref neighbors: Array<Land>,
        ) -> Array<bool> {
            let current_time = get_block_timestamp();
            let mut is_nuke: Array<bool> = ArrayTrait::new();

            for i in 0
                ..neighbors
                    .len() {
                        let mut neighbor = *neighbors.at(i);
                        let pair = (land.location, neighbor.location);

                        let last_time = self.last_claim_time.read(pair);
                        let last_time = if last_time == 0 {
                            land.block_date_bought
                        } else {
                            last_time
                        };
                        let elapsed_time = (current_time - last_time) * TIME_SPEED.into();

                        if elapsed_time == 0 {
                            continue;
                        }

                        let rate = get_tax_rate_per_neighbor(land);
                        let mut tax_to_distribute = (rate * elapsed_time.into())
                            / (100 * BASE_TIME.into());

                        if neighbor.stake_amount <= tax_to_distribute {
                            tax_to_distribute = neighbor.stake_amount;
                            neighbor.stake_amount = 0;
                            is_nuke.append(true);
                        } else {
                            neighbor.stake_amount -= tax_to_distribute;
                            is_nuke.append(false);
                        };

                        if tax_to_distribute > 0 {
                            let mut payable = get_dep_component_mut!(ref self, Payable);
                            let validation = payable
                                .validate(neighbor.token_used, neighbor.owner, tax_to_distribute);

                            let success = payable.transfer(land.owner, validation);
                            assert(success, 'ERC20_TRANSFER_CLAIM_FAILED');

                            self.last_claim_time.write(pair, current_time);
                        }
                        neighbor.last_pay_time = current_time;
                        store.set_land(neighbor);
                    };

            store.set_land(land);

            is_nuke
        }


        fn _add_taxes(
            ref self: ComponentState<TContractState>,
            tax_payer: Land,
            tax_recipient: Land,
            amount: u256,
            mut store: Store,
        ) {
            let token_addresses = self
                .pending_tokens_for_land
                .entry((tax_recipient.owner, tax_recipient.location));

            let mut exists = false;
            for mut i in 0
                ..token_addresses
                    .len() {
                        if token_addresses.at(i).read() == tax_payer.token_used {
                            exists = true;
                            break;
                        };
                    };

            if !exists {
                token_addresses.append().write(tax_payer.token_used);
            };

            let key = (tax_recipient.owner, tax_recipient.location, tax_payer.token_used);
            let current_tax_amount = self.pending_taxes_for_land.read(key);
            self.pending_taxes_for_land.write(key, current_tax_amount + amount);
        }

        fn _claim(
            ref self: ComponentState<TContractState>,
            taxes: Array<TokenInfo>,
            owner_land: ContractAddress,
            land_location: u16,
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);
            for token_info in taxes {
                if token_info.amount > 0 {
                    let validation_result = payable
                        .validate(
                            token_info.token_address, get_contract_address(), token_info.amount,
                        );

                    let status = payable.transfer(owner_land, validation_result);
                    assert(status, errors::ERC20_TRANSFER_CLAIM_FAILED);
                    self._remove_pending_taxes(owner_land, land_location, token_info);
                }
            }
        }

        fn _remove_pending_taxes(
            ref self: ComponentState<TContractState>,
            owner_land: ContractAddress,
            land_location: u16,
            token_info: TokenInfo,
        ) {
            let key = (owner_land, land_location, token_info.token_address);
            let current_tax_amount = self.pending_taxes_for_land.read(key);
            if current_tax_amount > 0 {
                self.pending_taxes_for_land.write(key, current_tax_amount - token_info.amount);
            } else {
                self.pending_taxes_for_land.write(key, 0);
            }
        }

        fn _get_pending_taxes(
            self: @ComponentState<TContractState>, owner_land: ContractAddress, land_location: u16,
        ) -> Array<TokenInfo> {
            let mut taxes: Array<TokenInfo> = ArrayTrait::new();
            let token_addresses = self.pending_tokens_for_land.entry((owner_land, land_location));
            for mut i in 0
                ..token_addresses
                    .len() {
                        let token_address = token_addresses.at(i).read();
                        let amount = self
                            .pending_taxes_for_land
                            .read((owner_land, land_location, token_address));
                        if amount > 0 {
                            taxes.append(TokenInfo { token_address, amount });
                        }
                    };
            taxes
        }
    }
}
