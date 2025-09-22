use openzeppelin_security::reentrancyguard::ReentrancyGuardComponent;
use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess};
/// @title Liquidity Reinjector Contract
/// @notice Authorized contract for reinjecting liquidity into PonziLand
/// @dev This contract can only call bid and buy functions on the main Actions contract
/// It cannot directly write to the World state, maintaining security boundaries

use starknet::{ContractAddress, get_caller_address, get_contract_address};

#[starknet::interface]
trait ILiquidityReinjector<T> {
    /// @notice Add an authorized address that can execute liquidity reinjection
    /// @param address The address to authorize
    fn add_authorized(ref self: T, address: ContractAddress);

    /// @notice Remove an authorized address
    /// @param address The address to remove authorization from
    fn remove_authorized(ref self: T, address: ContractAddress);

    /// @notice Check if an address is authorized
    /// @param address The address to check
    /// @return True if authorized, false otherwise
    fn is_authorized(self: @T, address: ContractAddress) -> bool;

    /// @notice Set the actions contract address
    /// @param actions_contract The address of the main Actions contract
    fn set_actions_contract(ref self: T, actions_contract: ContractAddress);

    /// @notice Execute a buy operation on behalf of the contract
    /// @param land_location The location ID of the land
    /// @param token_for_sale The token address being used for the sale
    /// @param sell_price The agreed sale price
    /// @param amount_to_stake The amount of tokens to stake with purchase
    fn execute_buy(
        ref self: T,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    );

    /// @notice Execute a bid operation on behalf of the contract
    /// @param land_location The location ID of the land
    /// @param token_for_sale The token address being used for the sale
    /// @param sell_price The new price of the land with the new owner
    /// @param amount_to_stake The amount of tokens to stake with the bid
    fn execute_bid(
        ref self: T,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    );

    /// @notice Withdraw tokens from the contract (admin only)
    /// @param token The token address to withdraw
    /// @param recipient The recipient of the tokens
    /// @param amount The amount to withdraw
    fn withdraw_tokens(
        ref self: T, token: ContractAddress, recipient: ContractAddress, amount: u256,
    );

    /// @notice Transfer ownership of the contract
    /// @param new_owner The new owner address
    fn transfer_ownership(ref self: T, new_owner: ContractAddress);

    /// @notice Get the current owner
    /// @return The owner's address
    fn get_owner(self: @T) -> ContractAddress;

    /// @notice Get the actions contract address
    /// @return The actions contract address
    fn get_actions_contract(self: @T) -> ContractAddress;
}

#[starknet::interface]
trait IActions<T> {
    fn bid(
        ref self: T,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    );

    fn buy(
        ref self: T,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    );
}

#[starknet::contract]
mod LiquidityReinjector {
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::{
        ContractAddress, IActions, IActionsDispatcher, IActionsDispatcherTrait,
        IERC20CamelDispatcher, IERC20CamelDispatcherTrait, ILiquidityReinjector,
        ReentrancyGuardComponent, get_caller_address, get_contract_address,
    };

    component!(
        path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent,
    );
    impl InternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        owner: ContractAddress,
        actions_contract: ContractAddress,
        authorized_addresses: Map<ContractAddress, bool>,
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AuthorizedAdded: AuthorizedAdded,
        AuthorizedRemoved: AuthorizedRemoved,
        BuyExecuted: BuyExecuted,
        BidExecuted: BidExecuted,
        TokensWithdrawn: TokensWithdrawn,
        OwnershipTransferred: OwnershipTransferred,
        ActionsContractSet: ActionsContractSet,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    struct AuthorizedAdded {
        #[key]
        address: ContractAddress,
        added_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct AuthorizedRemoved {
        #[key]
        address: ContractAddress,
        removed_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct BuyExecuted {
        #[key]
        executor: ContractAddress,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct BidExecuted {
        #[key]
        executor: ContractAddress,
        land_location: u16,
        token_for_sale: ContractAddress,
        sell_price: u256,
        amount_to_stake: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct TokensWithdrawn {
        token: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct OwnershipTransferred {
        previous_owner: ContractAddress,
        new_owner: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ActionsContractSet {
        actions_contract: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        assert(owner.is_non_zero(), 'Owner cannot be zero');
        self.owner.write(owner);
        self.authorized_addresses.write(owner, true);
        self.emit(AuthorizedAdded { address: owner, added_by: owner });
    }

    #[abi(embed_v0)]
    impl LiquidityReinjectorImpl of ILiquidityReinjector<ContractState> {
        fn add_authorized(ref self: ContractState, address: ContractAddress) {
            self.assert_only_owner();
            assert(address.is_non_zero(), 'Address cannot be zero');
            assert(!self.authorized_addresses.read(address), 'Address already authorized');

            self.authorized_addresses.write(address, true);
            self.emit(AuthorizedAdded { address, added_by: get_caller_address() });
        }

        fn remove_authorized(ref self: ContractState, address: ContractAddress) {
            self.assert_only_owner();
            assert(self.authorized_addresses.read(address), 'Address not authorized');

            self.authorized_addresses.write(address, false);
            self.emit(AuthorizedRemoved { address, removed_by: get_caller_address() });
        }

        fn is_authorized(self: @ContractState, address: ContractAddress) -> bool {
            self.authorized_addresses.read(address)
        }

        fn set_actions_contract(ref self: ContractState, actions_contract: ContractAddress) {
            self.assert_only_owner();
            assert(actions_contract.is_non_zero(), 'Actions contract cannot be zero');

            self.actions_contract.write(actions_contract);
            self.emit(ActionsContractSet { actions_contract });
        }

        fn execute_buy(
            ref self: ContractState,
            land_location: u16,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
        ) {
            self.reentrancy_guard.start();
            self.assert_only_authorized();
            self.assert_actions_contract_set();

            let total_amount = sell_price + amount_to_stake;

            // Check contract has sufficient balance
            let token = IERC20CamelDispatcher { contract_address: token_for_sale };
            let balance = token.balanceOf(get_contract_address());
            assert(balance >= total_amount, 'Insufficient token balance');

            // Approve the actions contract to spend our tokens
            token.approve(self.actions_contract.read(), total_amount);

            // Execute buy on the actions contract
            let actions = IActionsDispatcher { contract_address: self.actions_contract.read() };
            actions.buy(land_location, token_for_sale, sell_price, amount_to_stake);

            self
                .emit(
                    BuyExecuted {
                        executor: get_caller_address(),
                        land_location,
                        token_for_sale,
                        sell_price,
                        amount_to_stake,
                    },
                );

            self.reentrancy_guard.end();
        }

        fn execute_bid(
            ref self: ContractState,
            land_location: u16,
            token_for_sale: ContractAddress,
            sell_price: u256,
            amount_to_stake: u256,
        ) {
            self.reentrancy_guard.start();
            self.assert_only_authorized();
            self.assert_actions_contract_set();

            let total_amount = sell_price + amount_to_stake;

            // Check contract has sufficient balance
            let token = IERC20CamelDispatcher { contract_address: token_for_sale };
            let balance = token.balanceOf(get_contract_address());
            assert(balance >= total_amount, 'Insufficient token balance');

            // Approve the actions contract to spend our tokens
            token.approve(self.actions_contract.read(), total_amount);

            // Execute bid on the actions contract
            let actions = IActionsDispatcher { contract_address: self.actions_contract.read() };
            actions.bid(land_location, token_for_sale, sell_price, amount_to_stake);

            self
                .emit(
                    BidExecuted {
                        executor: get_caller_address(),
                        land_location,
                        token_for_sale,
                        sell_price,
                        amount_to_stake,
                    },
                );

            self.reentrancy_guard.end();
        }

        fn withdraw_tokens(
            ref self: ContractState,
            token: ContractAddress,
            recipient: ContractAddress,
            amount: u256,
        ) {
            self.reentrancy_guard.start();
            self.assert_only_owner();
            assert(recipient.is_non_zero(), 'Recipient cannot be zero');

            let token_dispatcher = IERC20CamelDispatcher { contract_address: token };
            let success = token_dispatcher.transfer(recipient, amount);
            assert(success, 'Token transfer failed');

            self.emit(TokensWithdrawn { token, recipient, amount });

            self.reentrancy_guard.end();
        }

        fn transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            self.assert_only_owner();
            assert(new_owner.is_non_zero(), 'New owner cannot be zero');

            let previous_owner = self.owner.read();
            self.owner.write(new_owner);
            self.authorized_addresses.write(new_owner, true);  
            self.emit(OwnershipTransferred { previous_owner, new_owner });
        }

        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn get_actions_contract(self: @ContractState) -> ContractAddress {
            self.actions_contract.read()
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn assert_only_owner(self: @ContractState) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can call');
        }

        fn assert_only_authorized(self: @ContractState) {
            let caller = get_caller_address();
            assert(self.authorized_addresses.read(caller), 'Not authorized');
        }

        fn assert_actions_contract_set(self: @ContractState) {
            assert(self.actions_contract.read().is_non_zero(), 'Actions contract not set');
        }
    }
}
