use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

#[starknet::component]
mod TaxesComponent {
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
    use ponzi_land::utils::get_neighbors::{add_neighbors, add_neighbor};
    use ponzi_land::components::payable::{PayableComponent, IPayable};
    use ponzi_land::utils::common_strucs::{TokenInfo};

    // Local imports
    use super::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    mod errors {
        const ERC20_TRANSFER_CLAIM_FAILED: felt252 = 'Transfer for claim failed';
    }

    #[storage]
    struct Storage {
        //                         (land_owner,location) -> token_index
        pending_taxes_length: Map<(ContractAddress, u64), u64>,
        //                 (land_owner,token_index) -> token_info
        pending_taxes: Map<(ContractAddress, u64), TokenInfo>,
        //                         (land_owner,location,token_index) -> token_info
        pending_taxes_for_land: Map<(ContractAddress, u64, u64), TokenInfo>
        //this for the current version of cairo with dojo don't work
    //pending_taxes:Map<ContractAddress,Vec<TokenInfo>>

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
            ref self: ComponentState<TContractState>, mut store: Store, land_location: u64
        ) -> bool {
            let mut land = store.land(land_location);

            //generate taxes for each neighbor of neighbor
            let neighbors: Array<Land> = add_neighbors(store, land_location, true);

            //if we dont have neighbors we dont have to pay taxes
            let neighbors_with_owners = neighbors.len();
            if neighbors_with_owners == 0 {
                land.last_pay_time = get_block_timestamp();
                store.set_land(land);
                return false;
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
            let remainder_tax = tax_to_distribute % neighbors_with_owners.into();

            //for distribute the remainder_tax to the last neighbor
            let mut i = 0;
            let mut last_neighbor = neighbors_with_owners - 1;

            while i < neighbors.len() {
                let neighbor = neighbors[i];
                let extra_amount = if i == last_neighbor {
                    remainder_tax
                } else {
                    0
                };

                self._add_taxes(ref land, *neighbor, tax_per_neighbor + extra_amount, store);

                i += 1;
            };
            land.last_pay_time = current_time;
            store.set_land(land);

            is_nuke
        }


        fn _add_taxes(
            ref self: ComponentState<TContractState>,
            ref tax_payer: Land,
            tax_recipient: Land,
            amount: u256,
            mut store: Store
        ) {
            // to see how many of diferents tokens the person can have in that land_location
            let taxes_length = self
                .pending_taxes_length
                .read((tax_recipient.owner, tax_recipient.location));
            //to see if the token of new taxes already exists
            let mut found = false;
            //find existing token and sum the amount
            for mut i in 0
                ..taxes_length {
                    let mut token_info = self
                        .pending_taxes_for_land
                        .read((tax_recipient.owner, tax_recipient.location, i));

                    if token_info.token_address == tax_payer.token_used {
                        token_info.amount += amount;

                        self
                            .pending_taxes_for_land
                            .write((tax_recipient.owner, tax_recipient.location, i), token_info);

                        found = true;

                        break;
                    }
                };

            if !found {
                let token_info = TokenInfo { token_address: tax_payer.token_used, amount };

                self
                    .pending_taxes_for_land
                    .write((tax_recipient.owner, tax_recipient.location, taxes_length), token_info);
                self
                    .pending_taxes_length
                    .write((tax_recipient.owner, tax_recipient.location), taxes_length + 1);
            };
            tax_payer.stake_amount -= amount;
            store.set_land(tax_payer);
        }

        fn _claim(
            ref self: ComponentState<TContractState>,
            taxes: Array<TokenInfo>,
            owner_land: ContractAddress,
            land_location: u64
        ) {
            let mut payable = get_dep_component_mut!(ref self, Payable);
            for token_info in taxes {
                if token_info.amount > 0 {
                    let validation_result = payable
                        .validate(
                            token_info.token_address, get_contract_address(), token_info.amount
                        );

                    let status = payable.transfer(owner_land, validation_result);
                    assert(status, errors::ERC20_TRANSFER_CLAIM_FAILED);
                    if status {
                        self._discount_pending_taxes(owner_land, land_location, token_info);
                    }
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
            let taxes_length = self.pending_taxes_length.read((owner_land, land_location));

            for mut i in 0
                ..taxes_length {
                    let mut pending_tax = self
                        .pending_taxes_for_land
                        .read((owner_land, land_location, i));

                    if pending_tax.amount > 0
                        && pending_tax.token_address == token_info.token_address {
                        self
                            .pending_taxes_for_land
                            .write(
                                (owner_land, land_location, i),
                                TokenInfo { token_address: pending_tax.token_address, amount: 0 }
                            );
                    }
                };
        }

        fn _get_pending_taxes(
            self: @ComponentState<TContractState>, owner_land: ContractAddress, land_location: u64
        ) -> Array<TokenInfo> {
            let taxes_length = self.pending_taxes_length.read((owner_land, land_location));
            let mut taxes: Array<TokenInfo> = ArrayTrait::new();

            for mut i in 0
                ..taxes_length {
                    let tax = self.pending_taxes_for_land.read((owner_land, land_location, i));
                    if tax.amount > 0 {
                        taxes.append(tax);
                    }
                };
            taxes
        }
    }
}
