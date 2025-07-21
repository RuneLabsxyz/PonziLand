#[starknet::interface]
pub trait ITestTreeContract<TContractState> {
    fn get(self: @TContractState, market_id: felt252, width: u32, limit: u32) -> bool;

    fn flip(ref self: TContractState, market_id: felt252, width: u32, limit: u32);

    fn next_limit(
        self: @TContractState, market_id: felt252, is_buy: bool, width: u32, limit: u32
    ) -> Option<u32>;

    fn get_segment_and_position(self: @TContractState, limit: u32) -> (u32, u8);
}

#[starknet::contract]
pub mod TestTreeContract {
    use haiko_amm::libraries::tree;
    use haiko_amm::contracts::market_manager::MarketManager;
    use haiko_amm::contracts::market_manager::MarketManager::{
        ContractState as MMContractState, // limit_tree_l0::InternalContractMemberStateTrait as LimittreeL0StateTrait,
    // limit_tree_l1::InternalContractMemberStateTrait as LimittreeL1StateTrait,
    // limit_tree_l2::InternalContractMemberStateTrait as LimittreeL2StateTrait,
    };
    use super::ITestTreeContract;

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl TestTreeContract of ITestTreeContract<ContractState> {
        fn get(self: @ContractState, market_id: felt252, width: u32, limit: u32) -> bool {
            let state: MMContractState = MarketManager::unsafe_new_contract_state();
            tree::get(@state, market_id, width, limit)
        }

        fn flip(ref self: ContractState, market_id: felt252, width: u32, limit: u32) {
            let mut state: MMContractState = MarketManager::unsafe_new_contract_state();
            tree::flip(ref state, market_id, width, limit)
        }

        fn next_limit(
            self: @ContractState, market_id: felt252, is_buy: bool, width: u32, limit: u32
        ) -> Option<u32> {
            let state: MMContractState = MarketManager::unsafe_new_contract_state();
            tree::next_limit(@state, market_id, is_buy, width, limit)
        }

        fn get_segment_and_position(self: @ContractState, limit: u32) -> (u32, u8) {
            tree::_get_segment_and_position(limit)
        }
    }
}
