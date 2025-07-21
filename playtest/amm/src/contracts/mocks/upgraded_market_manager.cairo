use starknet::ContractAddress;

#[starknet::interface]
pub trait IUpgradedMarketManager<TContractState> {
    fn owner(self: @TContractState) -> ContractAddress;
    fn foo(self: @TContractState) -> u32;
}

#[starknet::contract]
pub mod UpgradedMarketManager {
    // Core lib imports.
    use starknet::ContractAddress;
    use starknet::get_caller_address;

    // Local imports.
    use super::IUpgradedMarketManager;
    use haiko_lib::types::core::{
        MarketInfo, MarketState, OrderBatch, Position, LimitInfo, LimitOrder
    };
    use haiko_amm::libraries::store_packing::{
        MarketInfoStorePacking, MarketStateStorePacking, LimitInfoStorePacking,
        OrderBatchStorePacking, PositionStorePacking, LimitOrderStorePacking
    };

    ////////////////////////////////
    // STORAGE
    ////////////////////////////////

    #[storage]
    struct Storage {
        // Ownable
        owner: ContractAddress,
        // Global information
        // Indexed by asset
        reserves: LegacyMap::<ContractAddress, u256>,
        // Indexed by asset
        protocol_fees: LegacyMap::<ContractAddress, u256>,
        // Indexed by asset
        flash_loan_fee: LegacyMap::<ContractAddress, u16>,
        // Market information
        // Indexed by market_id = hash(quote_token, base_token, width, strategy, fee_controller)
        market_info: LegacyMap::<felt252, MarketInfo>,
        // Indexed by market_id
        market_state: LegacyMap::<felt252, MarketState>,
        // Indexed by (market_id: felt252, limit: u32)
        limit_info: LegacyMap::<(felt252, u32), LimitInfo>,
        // Indexed by market_id
        limit_tree_l0: LegacyMap::<felt252, u256>,
        // Indexed by (market_id: felt252, seg_index_l1: u32)
        limit_tree_l1: LegacyMap::<(felt252, u32), u256>,
        // Indexed by (market_id: felt252, seg_index_l2: u32)
        limit_tree_l2: LegacyMap::<(felt252, u32), u256>,
        // Indexed by position id = hash(market_id: felt252, owner: ContractAddress, lower_limit: u32, upper_limit: u32)
        positions: LegacyMap::<felt252, Position>,
        // Indexed by batch_id = hash(market_id: felt252, limit: u32, nonce: u128)
        batches: LegacyMap::<felt252, OrderBatch>,
        // Indexed by order_id = hash(market_id: felt252, nonce: u128, owner: ContractAddress)
        orders: LegacyMap::<felt252, LimitOrder>,
        // Swap id
        multi_swap_id: u128,
    }

    #[abi(embed_v0)]
    impl UpgradedMarketManager of IUpgradedMarketManager<ContractState> {
        ////////////////////////////////
        // VIEW FUNCTIONS
        ////////////////////////////////

        fn owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn foo(self: @ContractState) -> u32 {
            1
        }
    }
}
