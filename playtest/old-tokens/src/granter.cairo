use starknet::{ContractAddress, ClassHash};
use super::{AccessControl};

#[derive(Clone, Drop, Serde, starknet::Store, PartialEq)]
enum TokenType {
    #[default]
    eSTRK,
}

use super::IPlaytestTokenDispatcher;

fn get_dispatcher(token: TokenType) -> IPlaytestTokenDispatcher {
    let contract_address = match token {
        TokenType::eSTRK => 0x056893df1e063190aabda3c71304e9842a1b3d638134253dd0f69806a4f106eb
            .try_into()
            .unwrap(),
    };

    IPlaytestTokenDispatcher { contract_address }
}

#[starknet::interface]
trait IPlaytestMinter<TContractState> {
    fn mint_player(ref self: TContractState, address: ContractAddress);
    fn has_minted(self: @TContractState, address: ContractAddress) -> bool;
    fn set_access(ref self: TContractState, address: ContractAddress, access: AccessControl);
    fn set_mint_status(
        ref self: TContractState, address: ContractAddress, status: Option<TokenType>,
    );
    fn upgrade(ref self: TContractState, impl_hash: ClassHash);
}

#[starknet::contract]
mod PlayTestToken {
    use super::{TokenType, get_dispatcher};
    use super::super::{AccessControl, IPlaytestTokenDispatcherTrait};
    use starknet::{ContractAddress, get_caller_address, ClassHash};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map,
    };
    use core::num::traits::Zero;

    #[storage]
    struct Storage {
        access_control: Map<ContractAddress, AccessControl>,
        minted: Map<ContractAddress, Option<TokenType>>,
    }

    #[event]
    #[derive(Copy, Drop, Debug, PartialEq, starknet::Event)]
    pub enum Event {
        Upgraded: Upgraded,
    }

    #[derive(Copy, Drop, Debug, PartialEq, starknet::Event)]
    pub struct Upgraded {
        pub implementation: ClassHash,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.access_control.entry(owner).write(AccessControl::Owner);
    }

    #[abi(embed_v0)]
    impl PlaytestMinter of super::IPlaytestMinter<ContractState> {
        fn mint_player(ref self: ContractState, address: ContractAddress) {
            assert(
                self.access_control.entry(get_caller_address()).read() != AccessControl::None,
                'Users cannot mint tokens',
            );
            assert(!self.has_minted(address), 'Token already minted');

            // Give out the tokens (18 decimals)
            get_dispatcher(TokenType::eSTRK).mint(address, 1500_000000000000000000);

            self.minted.entry(address).write(Option::Some(TokenType::eSTRK));
        }

        fn set_access(ref self: ContractState, address: ContractAddress, access: AccessControl) {
            assert(
                self.access_control.entry(get_caller_address()).read() == AccessControl::Owner,
                'Not the owner',
            );

            self.access_control.entry(address).write(access);
        }

        fn has_minted(self: @ContractState, address: ContractAddress) -> bool {
            return self.minted.entry(address).read().is_some();
        }

        fn set_mint_status(
            ref self: ContractState, address: ContractAddress, status: Option<TokenType>,
        ) {
            assert(
                self.access_control.entry(get_caller_address()).read() == AccessControl::Owner,
                'Not the owner',
            );

            self.minted.entry(address).write(status);
        }

        fn upgrade(ref self: ContractState, impl_hash: ClassHash) {
            assert(impl_hash.is_non_zero(), 'Class hash cannot be zero');
            starknet::syscalls::replace_class_syscall(impl_hash).unwrap();
            self.emit(Event::Upgraded(Upgraded { implementation: impl_hash }))
        }
    }
}
