use starknet::{ContractAddress, ClassHash};
use super::{AccessControl};

#[derive(Clone, Drop, Serde, starknet::Store, PartialEq)]
enum TokenType {
    ePAPER,
    eLORDS,
    eBROTHER,
    ePAL,
    eETH,
    #[default]
    eSTRK,
}

use super::IPlaytestTokenDispatcher;

fn get_dispatcher(token: TokenType) -> IPlaytestTokenDispatcher {
    let contract_address = match token {
        TokenType::ePAPER => 0x0415c058a41cc80e7368562564c96fc4e3c03b23e32ba07a5c8cadc262b50c3c
            .try_into()
            .unwrap(),
        TokenType::eLORDS => 0x04b66d22d3001daad50fb853c0c1cb3b96d1745acb295bae4a6d54b29125ed09
            .try_into()
            .unwrap(),
        TokenType::eBROTHER => 0x01920ef3c5e765454dd3f6aeb5420ef524830e0b5f9a95ec2e1b9ee2073a16d1
            .try_into()
            .unwrap(),
        TokenType::ePAL => 0x079aba4c89e9cc3495318d2479fe93601e1188ff5d9a8823e3dc736d74bb437f
            .try_into()
            .unwrap(),
        TokenType::eETH => 0x038217779933c147320af3239e2dd098312e3074e0898001c79939c2e676fe8c
            .try_into()
            .unwrap(),
        TokenType::eSTRK => 0x05735fa6be5dd248350866644c0a137e571f9d637bb4db6532ddd63a95854b58
            .try_into()
            .unwrap(),
    };

    IPlaytestTokenDispatcher { contract_address }
}

#[starknet::interface]
trait IPlaytestMinter<TContractState> {
    fn mint_player(ref self: TContractState, address: ContractAddress, token: TokenType);
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
        fn mint_player(ref self: ContractState, address: ContractAddress, token: TokenType) {
            assert(
                self.access_control.entry(get_caller_address()).read() != AccessControl::None,
                'Users cannot mint tokens',
            );
            assert(!self.has_minted(address), 'Token already minted');
            assert(token != TokenType::eSTRK, 'Cannot mint STRK token');

            // Give out the tokens (18 decimals)
            get_dispatcher(token.clone()).mint(address, 5000_000000000000000000);
            get_dispatcher(TokenType::eSTRK).mint(address, 1500_000000000000000000);

            self.minted.entry(address).write(Option::Some(token));
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
