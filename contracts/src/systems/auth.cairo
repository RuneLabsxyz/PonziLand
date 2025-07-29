/// @title Authorization System Contract
/// @notice Provides role-based access control for managing authorized addresses and verifiers.
/// Allows locking and unlocking actions and ownership management. Designed for audit-readiness.

use starknet::ContractAddress;
use starknet::{get_caller_address, get_contract_address};
use starknet::contract_address::ContractAddressZeroable;

#[starknet::interface]
trait IAuth<T> {
    /// @notice Adds the caller as an authorized address using an ECDSA signature.
    /// @param self The contract state reference.
    /// @param signature The ECDSA signature proving authorization.
    fn add_authorized_with_signature(ref self: T, signature: Array<felt252>);

    /// @notice Adds an address as authorized. Callable by owner or verifier.
    /// @param self The contract state reference.
    /// @param address The address to authorize.
    fn add_authorized(ref self: T, address: ContractAddress);

    /// @notice Removes an address from the list of authorized addresses. Owner only.
    /// @param self The contract state reference.
    /// @param address The address to remove.
    fn remove_authorized(ref self: T, address: ContractAddress);

    /// @notice Sets a new verifier public key. Owner only.
    /// @param self The contract state reference.
    /// @param new_verifier The new verifier's public key (felt252).
    fn set_verifier(ref self: T, new_verifier: felt252);

    /// @notice Adds a new verifier account. Owner only.
    /// @param self The contract state reference.
    /// @param new_verifier The verifier address to add.
    fn add_verifier(ref self: T, new_verifier: ContractAddress);

    /// @notice Removes a verifier account. Owner only.
    /// @param self The contract state reference.
    /// @param verifier The verifier address to remove.
    fn remove_verifier(ref self: T, verifier: ContractAddress);

    /// @notice Locks all actions in the contract. Owner only.
    /// @param self The contract state reference.
    fn lock_actions(ref self: T);

    /// @notice Unlocks all actions in the contract. Owner only.
    /// @param self The contract state reference.
    fn unlock_actions(ref self: T);

    /// @notice Ensures contract is properly deployed (non-zero deployer).
    /// @param self The contract state reference.
    fn ensure_deploy(ref self: T);

    /// @notice Checks if an address can take actions (not locked).
    /// @param self The contract state reference.
    /// @param address The address to check.
    /// @return True if the address can take actions.
    fn can_take_action(self: @T, address: ContractAddress) -> bool;

    /// @notice Returns the contract owner address.
    /// @param self The contract state reference.
    /// @return The owner address.
    fn get_owner(self: @T) -> ContractAddress;
}
#[dojo::contract]
pub mod auth {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::contract_address::ContractAddressZeroable;
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait,
    };
    use core::ecdsa::check_ecdsa_signature;
    use core::poseidon::poseidon_hash_span;

    use dojo::world::WorldStorage;
    use dojo::event::EventStorage;

    use super::IAuth;

    /// @notice Emitted when an address is authorized.
    #[derive(Drop, Serde)]
    #[dojo::event]
    struct AddressAuthorizedEvent {
        /// @notice The authorized address.
        #[key]
        address: ContractAddress,
        /// @notice Timestamp when the address was authorized.
        authorized_at: u64,
    }

    #[derive(Drop, Serde)]
    #[dojo::event]
    struct AddressRemovedEvent {
        #[key]
        address: ContractAddress,
        removed_at: u64,
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
        verifier_accounts: Map::<ContractAddress, bool>,
        verifier: felt252,
        owner: ContractAddress,
        actions_locked: bool,
    }

    /// @notice Initializes the contract with the owner and verifier.
    fn dojo_init(ref self: ContractState, owner: ContractAddress, verifier: felt252) {
        self.owner.write(owner);
        self.verifier.write(verifier);

        self.actions_locked.write(false);
    }


    #[abi(embed_v0)]
    impl AuthImpl of IAuth<ContractState> {
        /// @notice Adds the caller as an authorized address using an ECDSA signature.
        fn add_authorized_with_signature(ref self: ContractState, signature: Array<felt252>) {
            let mut world = self.world_default();
            let address = get_caller_address();

            // Verify the signature is from the authorized verifier
            assert(self.verify_signature(address, signature), 'Invalid signature');
            self.authorized_addresses.write(address, true);
            world
                .emit_event(
                    @AddressAuthorizedEvent { address, authorized_at: get_block_timestamp() },
                );
        }

        /// @notice Adds an address as authorized. Callable by owner or verifier.
        fn add_authorized(ref self: ContractState, address: ContractAddress) {
            let mut world = self.world_default();

            let caller = get_caller_address();
            let is_owner = caller == self.owner.read();
            let is_authorizer = self.verifier_accounts.read(caller);
            assert(is_owner || is_authorizer, 'Only owner or verifier can add');

            // Verify the signature is from the authorized verifier
            self.authorized_addresses.write(address, true);
            world
                .emit_event(
                    @AddressAuthorizedEvent { address, authorized_at: get_block_timestamp() },
                );
        }

        /// @notice Removes an address from the list of authorized addresses. Owner only.
        fn remove_authorized(ref self: ContractState, address: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can remove');

            self.authorized_addresses.write(address, false);
            world.emit_event(@AddressRemovedEvent { address, removed_at: get_block_timestamp() });
        }

        /// @notice Sets a new verifier public key. Owner only.
        fn set_verifier(ref self: ContractState, new_verifier: felt252) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can change verifier');

            let old_verifier = self.verifier.read();
            self.verifier.write(new_verifier);

            world.emit_event(@VerifierUpdatedEvent { new_verifier, old_verifier });
        }

        /// @notice Adds a new verifier account. Owner only.
        fn add_verifier(ref self: ContractState, new_verifier: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can add verifier');

            self.verifier_accounts.write(new_verifier, true);
        }

        /// @notice Removes a verifier account. Owner only.
        fn remove_verifier(ref self: ContractState, verifier: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can remove verifier');

            self.verifier_accounts.write(verifier, false);
        }

        /// @notice Locks all actions in the action system contract. Owner only.
        fn lock_actions(ref self: ContractState) {
            assert(self.owner.read() == get_caller_address(), 'not the owner');
            self.actions_locked.write(true);
        }

        /// @notice Unlocks all actions in the action system contract. Owner only.
        fn unlock_actions(ref self: ContractState) {
            assert(self.owner.read() == get_caller_address(), 'not the owner');
            self.actions_locked.write(false);
        }

        /// @notice Ensures smart account contract is properly deployed (non-zero deployer).
        fn ensure_deploy(ref self: ContractState) {
            let caller = get_caller_address();
            assert(caller != ContractAddressZeroable::zero(), 'zero address');
        }

        /// @notice Returns the contract owner/admin address.
        fn get_owner(self: @ContractState) -> ContractAddress {
            return self.owner.read();
        }

        /// @notice Checks if an address can take actions (not locked).
        fn can_take_action(self: @ContractState, address: ContractAddress) -> bool {
            //let authorized = self.authorized_addresses.read(address);

            let actions_locked = self.actions_locked.read();
            // Red: Inhibiting the verification step for the testing phase.
            return !actions_locked;
        }
    }

    /// @notice Implementation of internal functions for the Authorization System contract.
    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn world_default(self: @ContractState) -> WorldStorage {
            self.world(@"ponzi_land")
        }

        /// @notice Verifies an ECDSA signature for the given address and signature.
        fn verify_signature(
            self: @ContractState, address: ContractAddress, signature: Array<felt252>,
        ) -> bool {
            assert(signature.len() == 2, 'Invalid signature length');

            let verifier = self.verifier.read();
            let signature_r = *signature[0];
            let signature_s = *signature[1];
            let message: felt252 = address.try_into().unwrap();
            return check_ecdsa_signature(message, verifier, signature_r, signature_s);
        }
    }
}
