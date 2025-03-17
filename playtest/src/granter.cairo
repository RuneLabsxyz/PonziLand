use starknet::{ContractAddress, ClassHash};
use super::{AccessControl};

#[derive(Clone, Drop, Serde, starknet::Store, PartialEq)]
enum TokenType {
    ePAPER,
    eLORDS,
    eBROTHER,
    ePAL,
    eSTRK,
}

use super::IPlaytestTokenDispatcher;

fn get_dispatcher(token: TokenType) -> IPlaytestTokenDispatcher {
    let contract_address = match token {
        TokenType::ePAPER => 0x0335e87d03baaea788b8735ea0eac49406684081bb669535bb7074f9d3f66825
            .try_into()
            .unwrap(),
        TokenType::eLORDS => 0x04230d6e1203e0d26080eb1cf24d1a3708b8fc085a7e0a4b403f8cc4ec5f7b7b
            .try_into()
            .unwrap(),
        TokenType::eBROTHER => 0x07031b4db035ffe8872034a97c60abd4e212528416f97462b1742e1f6cf82afe
            .try_into()
            .unwrap(),
        TokenType::ePAL => 0x01d321fcdb8c0592760d566b32b707a822b5e516e87e54c85b135b0c030b1706
            .try_into()
            .unwrap(),
        TokenType::eSTRK => 0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0
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
        ref self: TContractState, address: ContractAddress, status: Option<TokenType>
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
                'Users cannot mint tokens'
            );
            assert(!self.has_minted(address), 'Token already minted');
            assert(token != TokenType::eSTRK, 'Cannot mint STRK token');

            // Give out the tokens (18 decimals)
            get_dispatcher(token.clone()).mint(address, 500_000000000000000000);
            get_dispatcher(TokenType::eSTRK).mint(address, 150_000000000000000000);

            self.minted.entry(address).write(Option::Some(token));
        }

        fn set_access(ref self: ContractState, address: ContractAddress, access: AccessControl) {
            assert(
                self.access_control.entry(get_caller_address()).read() == AccessControl::Owner,
                'Not the owner'
            );

            self.access_control.entry(address).write(access);
        }

        fn has_minted(self: @ContractState, address: ContractAddress) -> bool {
            return self.minted.entry(address).read().is_some();
        }

        fn set_mint_status(
            ref self: ContractState, address: ContractAddress, status: Option<TokenType>
        ) {
            assert(
                self.access_control.entry(get_caller_address()).read() == AccessControl::Owner,
                'Not the owner'
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
