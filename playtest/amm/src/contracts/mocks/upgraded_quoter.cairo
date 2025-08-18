use starknet::ContractAddress;

#[starknet::interface]
pub trait IUpgradedQuoter<TContractState> {
    fn owner(self: @TContractState) -> ContractAddress;
    fn foo(self: @TContractState) -> u32;
}

#[starknet::contract]
pub mod UpgradedQuoter {
    // Core lib imports.
    use starknet::ContractAddress;

    // Local imports.
    use super::IUpgradedQuoter;

    ////////////////////////////////
    // STORAGE
    ////////////////////////////////

    #[storage]
    struct Storage {
        owner: ContractAddress,
        market_manager: ContractAddress,
    }

    #[abi(embed_v0)]
    impl UpgradedQuoter of IUpgradedQuoter<ContractState> {
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
