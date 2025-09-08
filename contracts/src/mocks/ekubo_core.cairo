use ekubo::types::keys::PoolKey;

#[starknet::interface]
pub trait ICore<TContractState> {
    fn get_pool_liquidity(self: @TContractState, pool_key: PoolKey) -> u128;
}


#[starknet::interface]
pub trait IEkuboCoreTesting<TContractState> {
    fn set_pool_liquidity(ref self: TContractState, pool_key: PoolKey, liquidity: u128);
}

#[starknet::contract]
mod MockEkuboCore {
    use ekubo::types::keys::PoolKey;
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        pool_liquidity: Map<PoolKey, u128>,
    }

    #[constructor]
    fn constructor(ref self: ContractState) { // Inicialización si es necesaria
    }

    #[abi(embed_v0)]
    impl CoreImpl of super::ICore<ContractState> {
        fn get_pool_liquidity(self: @ContractState, pool_key: PoolKey) -> u128 {
            self.pool_liquidity.read(pool_key)
        }
    }

    #[abi(embed_v0)]
    impl EkuboCoreTestingImpl of super::IEkuboCoreTesting<ContractState> {
        fn set_pool_liquidity(ref self: ContractState, pool_key: PoolKey, liquidity: u128) {
            self.pool_liquidity.write(pool_key, liquidity);
        }
    }
}

