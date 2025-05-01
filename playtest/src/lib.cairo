// Play test token
use starknet::{ContractAddress};

mod granter;

#[derive(Drop, Serde, starknet::Store, PartialEq)]
pub enum AccessControl {
    Owner,
    Minter,
    #[default]
    None
}


#[starknet::interface]
trait IPlaytestToken<TContractState> {
    fn set_access(ref self: TContractState, address: ContractAddress, access: AccessControl);
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
}

#[starknet::contract]
mod PlayTestToken {
    use super::AccessControl;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::token::erc20::{ERC20Component};
    use openzeppelin::upgrades::interface::IUpgradeable;
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::security::pausable::PausableComponent;
    use starknet::{ClassHash, ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map,
    };

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    // External
    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl PausableImpl = PausableComponent::PausableImpl<ContractState>;

    // Internal
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        access_control: Map<ContractAddress, AccessControl>,
        setup: bool,
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        #[substorage(v0)]
        pausable: PausableComponent::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        #[flat]
        PausableEvent: PausableComponent::Event,
    }

    impl ERC20HooksImpl of ERC20Component::ERC20HooksTrait<ContractState> {
        fn before_update(
            ref self: ERC20Component::ComponentState<ContractState>,
            from: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) {
            let contract_state = self.get_contract();
            contract_state.pausable.assert_not_paused();
        }
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, owner: ContractAddress, name: ByteArray, symbol: ByteArray
    ) {
        self.erc20.initializer(name, symbol);
        self.ownable.initializer(owner);
        self.access_control.entry(owner).write(AccessControl::Owner);
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        #[external(v0)]
        fn pause(ref self: ContractState) {
            let address = get_caller_address();
            let role = self.access_control.entry(address).read();
            assert(role == AccessControl::Owner, 'Only owner can upgrade');

            self.pausable.pause();
        }

        #[external(v0)]
        fn unpause(ref self: ContractState) {
            let address = get_caller_address();
            let role = self.access_control.entry(address).read();
            assert(role == AccessControl::Owner, 'Only owner can upgrade');

            self.pausable.unpause();
        }
    }

    #[abi(embed_v0)]
    impl PlaytestToken of super::IPlaytestToken<ContractState> {
        fn set_access(ref self: ContractState, address: ContractAddress, access: AccessControl) {
            // TODO: replace this with the proper access controls once we migrated
            self.ownable.assert_only_owner();

            self.access_control.entry(address).write(access);
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            let address = get_caller_address();
            let role = self.access_control.entry(address).read();

            assert(role != AccessControl::None, 'Users cannot mint');

            self.erc20.mint(recipient, amount);
        }
    }

    //
    // Upgradeable
    //

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            let address = get_caller_address();
            let role = self.access_control.entry(address).read();
            assert(role == AccessControl::Owner, 'Only owner can upgrade');
            self.upgradeable.upgrade(new_class_hash);
        }
    }
}
