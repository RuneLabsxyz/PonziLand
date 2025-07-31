// Starknet imports
use starknet::ContractAddress;

#[starknet::interface]
pub trait ITokenRegistry<T> {
    /// Registers a new token in the registry.
    /// Can only be called by an owner of the world.
    fn register_token(ref self: T, token_address: ContractAddress);

    /// Removes a token in the registry.
    /// Can only be called by an owner of the world.
    /// Doesn't free the id for new tokens
    fn remove_token(ref self: T, token_address: ContractAddress);

    /// Validates both
    /// - the existance of the token in the registry
    /// - if the token is not marked as "missing liquidity"
    ///   (not enough liquidity in any pool). NO CHECKS OF LIQUIDITY HERE
    ///
    /// Panics if either of those conditions are not respected.
    fn ensure_token_authorized(self: @T, token_address: ContractAddress);

    /// Graceful alternative to `ensure_token_authorized`,
    /// That returns a bool instead.
    /// The same validation is done.
    fn is_token_authorized(self: @T, token_address: ContractAddress) -> bool;
}

#[dojo::contract]
pub mod token_registry {
    // Starknet imports
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry,
    };

    // Dojo imports
    use dojo::world::{WorldStorage, IWorldDispatcher, IWorldDispatcherTrait};

    // Local imports
    use super::{ITokenRegistry};


    #[storage]
    struct Storage {
        token_status: Map<ContractAddress, bool>,
    }

    fn dojo_init(ref self: ContractState, tokens: Array<ContractAddress>) {
        // For each token, add it to the trusted tokens list
        for token in tokens.span() {
            self.set_token_status(*token, true);
        }
    }

    #[abi(embed_v0)]
    impl TokenregistryImpl of ITokenRegistry<ContractState> {
        fn register_token(ref self: ContractState, token_address: ContractAddress) {
            let caller = get_caller_address();

            assert!(self.is_owner(caller), "only owner can register token");

            self.set_token_status(token_address, true);
        }

        fn remove_token(ref self: ContractState, token_address: ContractAddress) {
            let caller = get_caller_address();

            assert!(self.is_owner(caller), "only owner can register token");

            self.set_token_status(token_address, false);
        }

        fn ensure_token_authorized(self: @ContractState, token_address: ContractAddress) {
            assert!(self.is_token_authorized(token_address), "unauthorized token used");
        }
        fn is_token_authorized(self: @ContractState, token_address: ContractAddress) -> bool {
            self.token_status.entry(token_address).read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn set_token_status(ref self: ContractState, token_address: ContractAddress, status: bool) {
            self.token_status.entry(token_address).write(status);
        }
        fn is_owner(self: @ContractState, caller: ContractAddress) -> bool {
            // TODO(red): Maybe we could migrate this to
            //            a different ressource once we know what to put.
            self.world_default().dispatcher.is_owner(0x0, caller)
        }
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }
    }
}
