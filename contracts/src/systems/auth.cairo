use starknet::ContractAddress;
use starknet::{get_caller_address, get_contract_address};
use starknet::contract_address::ContractAddressZeroable;


#[starknet::interface]
trait IAuth<T> {
    fn is_authorized(self: @T, address: ContractAddress) -> bool;
    fn add_authorized(ref self: T, signature: Array<felt252>);
    fn remove_authorized(ref self: T, address: ContractAddress);
    fn set_verifier(ref self: T, new_verifier: felt252);

    //getter
    fn get_owner(self: @T) -> ContractAddress;
}


#[starknet::contract]
pub mod Auth {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait
    };
    use core::ecdsa::check_ecdsa_signature;
    use core::poseidon::poseidon_hash_span;


    use super::IAuth;

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AddressAuthorizedEvent: AddressAuthorizedEvent,
        AddressRemovedEvent: AddressRemovedEvent,
        VerifierUpdatedEvent: VerifierUpdatedEvent
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct AddressAuthorizedEvent {
        address: ContractAddress,
        authorized_at: u64,
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct AddressRemovedEvent {
        address: ContractAddress,
        removed_at: u64
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct VerifierUpdatedEvent {
        new_verifier: felt252,
        old_verifier: felt252,
    }


    #[storage]
    struct Storage {
        authorized_addresses: Map::<ContractAddress, bool>,
        //has to be the public key
        verifier: felt252,
        owner: ContractAddress,
    }


    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, verifier: felt252) {
        self.owner.write(owner);
        self.verifier.write(verifier);
    }

    #[abi(embed_v0)]
    impl AuthImpl of IAuth<ContractState> {
        fn is_authorized(self: @ContractState, address: ContractAddress) -> bool {
            self.authorized_addresses.read(address)
        }

        fn add_authorized(ref self: ContractState, signature: Array<felt252>) {
            let address = get_caller_address();
            // Verify the signature is from the authorized verifier
            assert(self.verify_signature(address, signature), 'Invalid signature');

            self.authorized_addresses.write(address, true);
            self.emit(AddressAuthorizedEvent { address, authorized_at: get_block_timestamp() });
        }

        fn remove_authorized(ref self: ContractState, address: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can remove');

            self.authorized_addresses.write(address, false);
            self.emit(AddressRemovedEvent { address, removed_at: get_block_timestamp() });
        }

        fn set_verifier(ref self: ContractState, new_verifier: felt252) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can change verifier');

            let old_verifier = self.verifier.read();
            self.verifier.write(new_verifier);

            self.emit(VerifierUpdatedEvent { new_verifier, old_verifier });
        }

        //getter
        fn get_owner(self: @ContractState) -> ContractAddress {
            return self.owner.read();
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        //TODO: See how validate this with in tests
        fn verify_signature(
            self: @ContractState, address: ContractAddress, signature: Array<felt252>
        ) -> bool {
            let verifier = self.verifier.read();
            let signature_r = *signature[0];
            let signature_s = *signature[1];
            let message: felt252 = address.try_into().unwrap();
            // let message_hash = poseidon_hash_span(array![address.into()].span());
            println!("signature_r{:?}", signature_r);
            println!("signature_s{:?}", signature_s);
            println!("message {:?}", message);
            println!("verifier {:?}", verifier);
            return check_ecdsa_signature(message, verifier, signature_r, signature_s);
        }
    }
}
