// Note: This contract is used for testnet demonstration only and is not audited.

use starknet::ContractAddress;
use starknet::class_hash::ClassHash;

#[starknet::interface]
pub trait IFaucet<TContractState> {
    fn token(self: @TContractState, slot: u32) -> ContractAddress;
    fn length(self: @TContractState) -> u32;
    fn amount(self: @TContractState, token: ContractAddress) -> u256;
    fn is_claimed(self: @TContractState, address: ContractAddress) -> bool;
    fn balance(self: @TContractState, token: ContractAddress) -> u256;
    fn set_token(ref self: TContractState, slot: u32, token: ContractAddress);
    fn set_length(ref self: TContractState, length: u32);
    fn claim(ref self: TContractState);
    fn set_claimed(ref self: TContractState, user: ContractAddress, claimed: bool);
    fn withdraw(ref self: TContractState, token: ContractAddress, amount: u256);
    fn set_amount(ref self: TContractState, token: ContractAddress, amount: u256);
    fn set_owner(ref self: TContractState, owner: ContractAddress);
    fn upgrade(ref self: TContractState, new_class_hash: ClassHash);
}

#[starknet::contract]
pub mod Faucet {
    // Core lib imports.
    use starknet::ContractAddress;
    use starknet::{get_caller_address, get_contract_address};
    use starknet::syscalls::replace_class_syscall;
    use starknet::class_hash::ClassHash;

    // Local imports.
    use super::IFaucet;

    // External imports.
    use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

    #[storage]
    struct Storage {
        // List of tokens to be distributed
        tokens: LegacyMap::<u32, ContractAddress>,
        length: u32,
        // Mapping of token to amounts to be distributed
        amounts: LegacyMap::<ContractAddress, u256>,
        claimed: LegacyMap::<ContractAddress, bool>,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Claim: Claim,
        ChangeOwner: ChangeOwner,
        SetAmount: SetAmount,
        SetClaimed: SetClaimed,
        Withdraw: Withdraw,
        SetToken: SetToken,
        Upgraded: Upgraded,
    }

    #[derive(Drop, starknet::Event)]
    struct Claim {
        caller: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ChangeOwner {
        owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct SetToken {
        slot: u32,
        token: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct SetAmount {
        token: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct SetClaimed {
        user: ContractAddress,
        claimed: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct Withdraw {
        token: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Upgraded {
        class_hash: ClassHash,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl Faucet of IFaucet<ContractState> {
        fn token(self: @ContractState, slot: u32) -> ContractAddress {
            self.tokens.read(slot)
        }

        fn length(self: @ContractState) -> u32 {
            self.length.read()
        }

        fn amount(self: @ContractState, token: ContractAddress) -> u256 {
            self.amounts.read(token)
        }

        fn balance(self: @ContractState, token: ContractAddress) -> u256 {
            let token_contract = ERC20ABIDispatcher { contract_address: token };
            let contract = get_contract_address();
            token_contract.balanceOf(contract)
        }

        fn is_claimed(self: @ContractState, address: ContractAddress) -> bool {
            self.claimed.read(address)
        }

        fn set_token(ref self: ContractState, slot: u32, token: ContractAddress) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
            self.tokens.write(slot, token);
            self.emit(Event::SetToken(SetToken { slot, token }));
        }

        fn set_length(ref self: ContractState, length: u32) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
            self.length.write(length);
        }

        fn claim(ref self: ContractState,) {
            let caller = get_caller_address();
            let claimed = self.claimed.read(caller);
            assert(!claimed, 'Claimed');

            let mut index = 0;
            let length = self.length.read();
            let contract = get_contract_address();
            loop {
                if index == length {
                    break ();
                }
                let token = self.tokens.read(index);
                let amount = self.amounts.read(token);
                let token_contract = ERC20ABIDispatcher { contract_address: token };
                assert(token_contract.balanceOf(contract) >= amount, 'InsuffBalance');
                token_contract.transfer(caller, amount);
                index += 1;
            };

            self.claimed.write(caller, true);

            self.emit(Event::Claim(Claim { caller }))
        }

        // Can be used to reset claim status of a user.
        fn set_claimed(ref self: ContractState, user: ContractAddress, claimed: bool) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
            self.claimed.write(user, claimed);
            self.emit(Event::SetClaimed(SetClaimed { user, claimed }));
        }

        fn set_amount(ref self: ContractState, token: ContractAddress, amount: u256) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
            self.amounts.write(token, amount);
            self.emit(Event::SetAmount(SetAmount { token, amount }));
        }

        fn withdraw(ref self: ContractState, token: ContractAddress, amount: u256) {
            let owner = self.owner.read();
            assert(owner == get_caller_address(), 'OnlyOwner');
            let token_contract = ERC20ABIDispatcher { contract_address: token };
            token_contract.transfer(owner, amount);
            self.emit(Event::Withdraw(Withdraw { token, amount }));
        }

        fn set_owner(ref self: ContractState, owner: ContractAddress) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
            self.owner.write(owner);
            self.emit(Event::ChangeOwner(ChangeOwner { owner }))
        }

        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
            replace_class_syscall(new_class_hash).unwrap();
            self.emit(Event::Upgraded(Upgraded { class_hash: new_class_hash }));
        }
    }
}
