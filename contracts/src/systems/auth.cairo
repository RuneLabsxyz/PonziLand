use starknet::ContractAddress;
use starknet::{get_caller_address, get_contract_address};
use starknet::contract_address::ContractAddressZeroable;

#[starknet::interface]
trait IAuth<T> {
    fn is_authorized(self: @T, address: ContractAddress) -> bool;
    fn add_authorized(ref self: T, address: ContractAddress, signature: Array<felt252>);
    fn remove_authorized(ref self: T, address: ContractAddress);
    fn set_verifier(ref self: T, new_verifier: ContractAddress);
}

#[dojo::contract]
pub mod auth {
    use super::IAuth;

    use dojo::world::WorldStorage;
    use dojo::event::EventStorage;

    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
    };

    #[derive(Drop, Serde)]
    #[dojo::event]
    struct AddressAuthorized {
        #[key]
        address: ContractAddress,
        authorized_at: u64,
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    struct AddressRemoved {
        #[key]
        address: ContractAddress,
        removed_at: u64
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    struct VerifierUpdated {
        #[key]
        new_verifier: ContractAddress,
        old_verifier: ContractAddress,
    }

    #[storage]
    struct Storage {
        authorized_addresses: Map::<ContractAddress, bool>,
        verifier: ContractAddress,
        //Here we can put more than one owner
        owner: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, verifier: ContractAddress) {
        self.owner.write(owner);
        self.verifier.write(verifier);
    }

    #[abi(embed_v0)]
    impl AuthImpl of IAuth<ContractState> {
        fn is_authorized(self: @ContractState, address: ContractAddress) -> bool {
            self.authorized_addresses.read(address)
        }

        fn add_authorized(
            ref self: ContractState, address: ContractAddress, signature: Array<felt252>
        ) {
            let mut world = self.world_default();

            // Verify the signature is from the authorized verifier || we can add if the owner is
            // the caller
            assert(self.verify_signature(address, signature), 'Invalid signature');

            self.authorized_addresses.write(address, true);
            world.emit_event(@AddressAuthorized { address, authorized_at: get_block_timestamp() });
        }

        fn remove_authorized(ref self: ContractState, address: ContractAddress) {
            let mut world = self.world_default();
            // Only owner can remove addresses
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can remove');

            self.authorized_addresses.write(address, false);
            world.emit_event(@AddressRemoved { address, removed_at: get_block_timestamp() });
        }

        fn set_verifier(ref self: ContractState, new_verifier: ContractAddress) {
            let mut world = self.world_default();

            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can change verifier');

            let old_verifier = self.verifier.read();
            self.verifier.write(new_verifier);

            world.emit_event(@VerifierUpdated { new_verifier, old_verifier });
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }

        //or one of the owners can be social.ponzi.land
        fn verify_signature(
            self: @ContractState, address: ContractAddress, signature: Array<felt252>
        ) -> bool {
            // Here we have to implement the signature verification logic
            // using the verifier contract address stored in self.verifier based on
            // social.ponzi.land

            true
        }
    }
}
