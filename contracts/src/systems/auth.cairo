use starknet::ContractAddress;
use starknet::{get_caller_address, get_contract_address};
use starknet::contract_address::ContractAddressZeroable;


#[starknet::interface]
trait IAuth<T> {
    fn add_authorized(ref self: T, signature: Array<felt252>);
    fn remove_authorized(ref self: T, address: ContractAddress);
    fn set_verifier(ref self: T, new_verifier: felt252);
    fn lock_actions(ref self: T);
    fn unlock_actions(ref self: T);

    //getter
    fn can_take_action(self: @T, address: ContractAddress) -> bool;
    fn get_owner(self: @T) -> ContractAddress;
}


#[dojo::contract]
pub mod auth {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
    };
    use core::ecdsa::check_ecdsa_signature;
    use core::poseidon::poseidon_hash_span;

    use dojo::world::WorldStorage;
    use dojo::event::EventStorage;

    use super::IAuth;

    #[derive(Drop, Serde)]
    #[dojo::event]
    struct AddressAuthorizedEvent {
        #[key]
        address: ContractAddress,
        authorized_at: u64,
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    struct AddressRemovedEvent {
        #[key]
        address: ContractAddress,
        removed_at: u64
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    struct VerifierUpdatedEvent {
        #[key]
        new_verifier: felt252,
        old_verifier: felt252,
    }


    #[storage]
    struct Storage {
        authorized_addresses: Map::<ContractAddress, bool>,
        //has to be the public key
        verifier: felt252,
        owner: ContractAddress,
        actions_locked: bool,
    }


    fn dojo_init(ref self: ContractState, owner: ContractAddress, verifier: felt252) {
        self.owner.write(owner);
        self.verifier.write(verifier);
        self.actions_locked.write(false);
    }

    #[abi(embed_v0)]
    impl AuthImpl of IAuth<ContractState> {
        fn add_authorized(ref self: ContractState, signature: Array<felt252>) {
            let mut world = self.world_default();
            let address = get_caller_address();
            // Verify the signature is from the authorized verifier
            assert(self.verify_signature(address, signature), 'Invalid signature');
            self.authorized_addresses.write(address, true);
            world
                .emit_event(
                    @AddressAuthorizedEvent { address, authorized_at: get_block_timestamp() }
                );
        }

        fn remove_authorized(ref self: ContractState, address: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can remove');

            self.authorized_addresses.write(address, false);
            world.emit_event(@AddressRemovedEvent { address, removed_at: get_block_timestamp() });
        }

        fn set_verifier(ref self: ContractState, new_verifier: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can change verifier');

            let old_verifier = self.verifier.read();
            self.verifier.write(new_verifier);

            world.emit_event(@VerifierUpdatedEvent { new_verifier, old_verifier });
        }

        fn lock_actions(ref self: ContractState) {
            assert(self.owner.read() == get_caller_address(), 'not the owner');
            self.actions_locked.write(true);
        }

        fn unlock_actions(ref self: ContractState) {
            assert(self.owner.read() == get_caller_address(), 'not the owner');
            self.actions_locked.write(false);
        }

        //getter
        fn get_owner(self: @ContractState) -> ContractAddress {
            return self.owner.read();
        }

        fn can_take_action(self: @ContractState, address: ContractAddress) -> bool {
            let authorized = self.authorized_addresses.read(address);
            let actions_locked = self.actions_locked.read();
            return authorized && !actions_locked;
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }

        fn verify_signature(
            self: @ContractState, address: ContractAddress, signature: Array<felt252>
        ) -> bool {
            let verifier = self.verifier.read();
            let signature_r = *signature[0];
            let signature_s = *signature[1];
            let message: felt252 = address.try_into().unwrap();
            return check_ecdsa_signature(message, verifier, signature_r, signature_s);
        }
    }
}
