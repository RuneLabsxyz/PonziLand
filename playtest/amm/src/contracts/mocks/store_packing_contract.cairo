use haiko_lib::types::core::{
    MarketInfo, MarketState, LimitInfo, OrderBatch, Position, LimitOrder, MarketConfigs
};

#[starknet::interface]
pub trait IStorePackingContract<TContractState> {
    fn get_market_info(self: @TContractState, market_id: felt252) -> MarketInfo;
    fn get_market_state(self: @TContractState, market_id: felt252) -> MarketState;
    fn get_market_configs(self: @TContractState, market_id: felt252) -> MarketConfigs;
    fn get_limit_info(self: @TContractState, limit_id: felt252) -> LimitInfo;
    fn get_position(self: @TContractState, position_id: felt252) -> Position;
    fn get_order_batch(self: @TContractState, batch_id: felt252) -> OrderBatch;
    fn get_limit_order(self: @TContractState, order_id: felt252) -> LimitOrder;

    fn set_market_info(ref self: TContractState, market_id: felt252, market_info: MarketInfo);
    fn set_market_state(ref self: TContractState, market_id: felt252, market_state: MarketState);
    fn set_market_configs(
        ref self: TContractState, market_id: felt252, market_configs: MarketConfigs
    );
    fn set_limit_info(ref self: TContractState, limit_id: felt252, limit_info: LimitInfo);
    fn set_position(ref self: TContractState, position_id: felt252, position: Position);
    fn set_order_batch(ref self: TContractState, batch_id: felt252, batch: OrderBatch);
    fn set_limit_order(ref self: TContractState, order_id: felt252, order: LimitOrder);
}

#[starknet::contract]
pub mod StorePackingContract {
    use haiko_lib::types::core::{
        MarketInfo, MarketState, LimitInfo, OrderBatch, Position, LimitOrder, MarketConfigs
    };
    use haiko_amm::libraries::store_packing::{
        MarketInfoStorePacking, MarketStateStorePacking, MarketConfigsStorePacking,
        LimitInfoStorePacking, OrderBatchStorePacking, PositionStorePacking, LimitOrderStorePacking
    };
    use super::IStorePackingContract;

    ////////////////////////////////
    // STORAGE
    ////////////////////////////////

    #[storage]
    struct Storage {
        market_info: LegacyMap::<felt252, MarketInfo>,
        market_state: LegacyMap::<felt252, MarketState>,
        market_configs: LegacyMap::<felt252, MarketConfigs>,
        limit_info: LegacyMap::<felt252, LimitInfo>,
        positions: LegacyMap::<felt252, Position>,
        batches: LegacyMap::<felt252, OrderBatch>,
        orders: LegacyMap::<felt252, LimitOrder>,
    }

    #[constructor]
    fn constructor(ref self: ContractState,) {}

    #[abi(embed_v0)]
    impl StorePackingContract of IStorePackingContract<ContractState> {
        ////////////////////////////////
        // VIEW FUNCTIONS
        ////////////////////////////////

        fn get_market_info(self: @ContractState, market_id: felt252) -> MarketInfo {
            self.market_info.read(market_id)
        }

        fn get_market_state(self: @ContractState, market_id: felt252) -> MarketState {
            self.market_state.read(market_id)
        }

        fn get_market_configs(self: @ContractState, market_id: felt252) -> MarketConfigs {
            self.market_configs.read(market_id)
        }

        fn get_limit_info(self: @ContractState, limit_id: felt252) -> LimitInfo {
            self.limit_info.read(limit_id)
        }

        fn get_position(self: @ContractState, position_id: felt252) -> Position {
            self.positions.read(position_id)
        }

        fn get_order_batch(self: @ContractState, batch_id: felt252) -> OrderBatch {
            self.batches.read(batch_id)
        }

        fn get_limit_order(self: @ContractState, order_id: felt252) -> LimitOrder {
            self.orders.read(order_id)
        }

        ////////////////////////////////
        // EXTERNAL FUNCTIONS
        ////////////////////////////////

        fn set_market_info(ref self: ContractState, market_id: felt252, market_info: MarketInfo) {
            self.market_info.write(market_id, market_info);
        }

        fn set_market_state(
            ref self: ContractState, market_id: felt252, market_state: MarketState
        ) {
            self.market_state.write(market_id, market_state);
        }

        fn set_market_configs(
            ref self: ContractState, market_id: felt252, market_configs: MarketConfigs
        ) {
            self.market_configs.write(market_id, market_configs);
        }

        fn set_limit_info(ref self: ContractState, limit_id: felt252, limit_info: LimitInfo) {
            self.limit_info.write(limit_id, limit_info);
        }

        fn set_position(ref self: ContractState, position_id: felt252, position: Position) {
            self.positions.write(position_id, position);
        }

        fn set_order_batch(ref self: ContractState, batch_id: felt252, batch: OrderBatch) {
            self.batches.write(batch_id, batch);
        }

        fn set_limit_order(ref self: ContractState, order_id: felt252, order: LimitOrder) {
            self.orders.write(order_id, order);
        }
    }
}
