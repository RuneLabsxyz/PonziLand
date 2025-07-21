// Core lib imports.
use starknet::ContractAddress;

// Haiko imports.
use haiko_lib::types::core::PositionInfo;

////////////////////////////////
// INTERFACE
////////////////////////////////

#[starknet::interface]
pub trait IManualStrategy<TContractState> {
    fn queued_bid(self: @TContractState) -> PositionRange;
    fn queued_ask(self: @TContractState) -> PositionRange;
    fn base_reserves(self: @TContractState) -> u256;
    fn quote_reserves(self: @TContractState) -> u256;
    fn bid(self: @TContractState) -> PositionInfo;
    fn ask(self: @TContractState) -> PositionInfo;

    fn initialise(
        ref self: TContractState,
        name: felt252,
        symbol: felt252,
        version: felt252,
        market_manager: ContractAddress,
        market_id: felt252,
    );

    fn deposit(ref self: TContractState, base_amount: u256, quote_amount: u256);

    fn withdraw(ref self: TContractState);

    fn set_positions(
        ref self: TContractState, bid_lower: u32, bid_upper: u32, ask_lower: u32, ask_upper: u32
    );
}

////////////////////////////////
// TYPES
////////////////////////////////

#[derive(Drop, Copy, Serde, starknet::Store)]
pub struct PositionRange {
    lower_limit: u32,
    upper_limit: u32,
}

////////////////////////////////
// CONTRACT
////////////////////////////////

// Test strategy where positions are set manually.
#[starknet::contract]
pub mod ManualStrategy {
    // Core lib imports.
    use core::integer::BoundedInt;
    use core::cmp::{min, max};
    use starknet::ContractAddress;
    use starknet::{get_caller_address, get_contract_address, get_block_number};
    use starknet::class_hash::ClassHash;
    use starknet::syscalls::replace_class_syscall;

    // Local imports.
    use super::{IManualStrategy, PositionRange};
    use haiko_amm::contracts::market_manager::MarketManager;
    use haiko_amm::contracts::market_manager::MarketManager::ContractState as MMContractState;

    // Haiko imports.
    use haiko_lib::types::core::{MarketState, SwapParams, PositionInfo};
    use haiko_lib::math::{math, price_math, liquidity_math, fee_math};
    use haiko_lib::id;
    use haiko_lib::constants::ONE;
    use haiko_lib::interfaces::IMarketManager::{
        IMarketManagerDispatcher, IMarketManagerDispatcherTrait
    };
    use haiko_lib::interfaces::IStrategy::IStrategy;
    use haiko_lib::types::i128::{I128Trait, i128};

    // External imports.
    use openzeppelin::token::erc20::interface::{
        ERC20ABI, ERC20ABIDispatcher, ERC20ABIDispatcherTrait
    };

    #[storage]
    struct Storage {
        // Immutables
        owner: ContractAddress,
        name: felt252,
        symbol: felt252,
        version: felt252,
        market_manager: IMarketManagerDispatcher,
        market_id: felt252,
        // Strategy state
        base_reserves: u256,
        quote_reserves: u256,
        bid: PositionInfo, // placed bid
        ask: PositionInfo, // placed ask
        queued_bid: PositionRange, // queued bid, placed on next swap
        queued_ask: PositionRange, // queued ask, placed on next swap
    }

    ////////////////////////////////
    // EVENTS
    ///////////////////////////////

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        UpdatePositions: UpdatePositions,
    }

    #[derive(Drop, starknet::Event)]
    struct UpdatePositions {
        bid_lower_limit: u32,
        bid_upper_limit: u32,
        bid_liquidity: u256,
        ask_lower_limit: u32,
        ask_upper_limit: u32,
        ask_liquidity: u256,
    }

    ////////////////////////////////
    // CONSTRUCTOR
    ////////////////////////////////

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    ////////////////////////////////
    // FUNCTIONS
    ////////////////////////////////

    #[generate_trait]
    pub impl ModifierImpl of ModifierTrait {
        fn assert_only_owner(self: @ContractState) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
        }
    }

    #[abi(embed_v0)]
    pub impl Strategy of IStrategy<ContractState> {
        // Get market manager contract address
        fn market_manager(self: @ContractState) -> ContractAddress {
            self.market_manager.read().contract_address
        }

        // Get strategy name
        fn name(self: @ContractState) -> felt252 {
            self.name.read()
        }

        // Get strategy symbol
        fn symbol(self: @ContractState) -> felt252 {
            self.symbol.read()
        }

        // Get strategy symbol
        fn version(self: @ContractState) -> felt252 {
            self.version.read()
        }

        // Get placed positions.
        fn placed_positions(self: @ContractState, market_id: felt252) -> Span<PositionInfo> {
            let bid = self.bid.read();
            let ask = self.ask.read();
            array![bid, ask].span()
        }

        // Get queued positions.
        fn queued_positions(
            self: @ContractState, market_id: felt252, swap_params: Option<SwapParams>
        ) -> Span<PositionInfo> {
            // Fetch strategy state.
            let mut bid = self.bid.read();
            let mut ask = self.ask.read();
            let base_reserves = self.base_reserves.read();
            let quote_reserves = self.quote_reserves.read();

            // Fetch queued positions.
            let next_bid = self.queued_bid.read();
            let next_ask = self.queued_ask.read();

            // Fetch amounts inside existing positions.
            let contract: felt252 = get_contract_address().into();
            let market_id = self.market_id.read();
            let market_manager = self.market_manager.read();
            let (bid_base, bid_quote, bid_base_fees, bid_quote_fees) = market_manager
                .amounts_inside_position(market_id, contract, bid.lower_limit, bid.upper_limit);
            let (ask_base, ask_quote, ask_base_fees, ask_quote_fees) = market_manager
                .amounts_inside_position(market_id, contract, ask.lower_limit, ask.upper_limit);

            let update_bid: bool = next_bid.lower_limit != bid.lower_limit
                || next_bid.upper_limit != bid.upper_limit;
            let update_ask: bool = next_ask.lower_limit != ask.lower_limit
                || next_ask.upper_limit != ask.upper_limit;

            // Calculate liquidity.
            let width = market_manager.width(market_id);
            let quote_amount = quote_reserves
                + if update_bid {
                    bid_quote + bid_quote_fees
                } else {
                    0
                }
                + if update_ask {
                    ask_quote + ask_quote_fees
                } else {
                    0
                };
            let bid_liquidity = if update_bid {
                if quote_amount == 0 {
                    0
                } else {
                    // Rounded down as per convention when depositing liquidity.
                    liquidity_math::quote_to_liquidity(
                        price_math::limit_to_sqrt_price(next_bid.lower_limit, width),
                        price_math::limit_to_sqrt_price(next_bid.upper_limit, width),
                        quote_amount,
                        false
                    )
                }
            } else {
                bid.liquidity
            };
            let base_amount = base_reserves
                + if update_bid {
                    bid_base + bid_base_fees
                } else {
                    0
                }
                + if update_ask {
                    ask_base + ask_base_fees
                } else {
                    0
                };
            let ask_liquidity = if update_ask {
                if base_amount == 0 {
                    0
                } else {
                    // Rounded down as per convention when depositing liquidity.
                    liquidity_math::base_to_liquidity(
                        price_math::limit_to_sqrt_price(next_ask.lower_limit, width),
                        price_math::limit_to_sqrt_price(next_ask.upper_limit, width),
                        base_amount,
                        false
                    )
                }
            } else {
                ask.liquidity
            };

            bid.lower_limit = next_bid.lower_limit;
            bid.upper_limit = next_bid.upper_limit;
            ask.lower_limit = next_ask.lower_limit;
            ask.upper_limit = next_ask.upper_limit;
            bid.liquidity = bid_liquidity;
            ask.liquidity = ask_liquidity;

            let positions = array![bid, ask];
            positions.span()
        }

        // Updates positions. Called by MarketManager upon swap.
        fn update_positions(ref self: ContractState, market_id: felt252, params: SwapParams) {
            // Run checks
            let market_manager = self.market_manager.read();
            assert(get_caller_address() == market_manager.contract_address, 'OnlyMarketManager');

            // Fetch existing state.
            let market_id = self.market_id.read();
            let mut base_reserves = self.base_reserves.read();
            let mut quote_reserves = self.quote_reserves.read();
            let mut bid = self.bid.read();
            let mut ask = self.ask.read();

            // Fetch new bid and ask positions.
            let queued_positions = self.queued_positions(market_id, Option::Some(params));
            let next_bid = *queued_positions.at(0);
            let next_ask = *queued_positions.at(1);
            let update_bid: bool = next_bid.lower_limit != bid.lower_limit
                || next_bid.upper_limit != bid.upper_limit;
            let update_ask: bool = next_ask.lower_limit != ask.lower_limit
                || next_ask.upper_limit != ask.upper_limit;

            // Update positions.
            // If old positions exist at different price ranges, first remove them.
            if bid.liquidity != 0 && update_bid {
                let (base_amount, quote_amount, _, _) = market_manager
                    .modify_position(
                        market_id,
                        bid.lower_limit,
                        bid.upper_limit,
                        I128Trait::new(bid.liquidity, true)
                    );
                base_reserves += base_amount.val;
                quote_reserves += quote_amount.val;
                bid.liquidity = Default::default();
            }
            if ask.liquidity != 0 && update_ask {
                let (base_amount, quote_amount, _, _) = market_manager
                    .modify_position(
                        market_id,
                        ask.lower_limit,
                        ask.upper_limit,
                        I128Trait::new(ask.liquidity, true)
                    );
                base_reserves += base_amount.val;
                quote_reserves += quote_amount.val;
                ask.liquidity = Default::default();
            }

            // Place new positions.
            if next_bid.liquidity != 0 && update_bid {
                let (_, quote_amount, _, _) = market_manager
                    .modify_position(
                        market_id,
                        next_bid.lower_limit,
                        next_bid.upper_limit,
                        I128Trait::new(next_bid.liquidity, false)
                    );
                quote_reserves -= quote_amount.val;
                bid = next_bid;
            };
            if next_ask.liquidity != 0 && update_ask {
                let (base_amount, _, _, _) = market_manager
                    .modify_position(
                        market_id,
                        next_ask.lower_limit,
                        next_ask.upper_limit,
                        I128Trait::new(next_ask.liquidity, false)
                    );
                base_reserves -= base_amount.val;
                ask = next_ask;
            }

            // Commit state updates
            self.base_reserves.write(base_reserves);
            self.quote_reserves.write(quote_reserves);
            self.bid.write(bid);
            self.ask.write(ask);
        }
    }

    #[abi(embed_v0)]
    impl ManualStrategy of IManualStrategy<ContractState> {
        // Initialise strategy. Only callable by contract owner.
        //
        // # Arguments
        // * `name` - name of strategy (also used as token name)
        // * `symbol` - symbol of strategy erc20 token
        // * `market_manager` - contract address of market manager
        // * `market_id` - market id
        fn initialise(
            ref self: ContractState,
            name: felt252,
            symbol: felt252,
            version: felt252,
            market_manager: ContractAddress,
            market_id: felt252,
        ) {
            self.assert_only_owner();
            self.name.write(name);
            self.symbol.write(symbol);
            self.version.write(version);
            self
                .market_manager
                .write(IMarketManagerDispatcher { contract_address: market_manager });
            self.market_id.write(market_id);
        }

        fn deposit(ref self: ContractState, base_amount: u256, quote_amount: u256) {
            // Fetch market info.
            let market_manager = self.market_manager.read();
            let market_info = market_manager.market_info(self.market_id.read());
            let contract = get_contract_address();
            let caller = get_caller_address();

            // Transfer balances and approve market manager as spender.
            let base_token = ERC20ABIDispatcher { contract_address: market_info.base_token };
            let quote_token = ERC20ABIDispatcher { contract_address: market_info.quote_token };
            if base_amount != 0 {
                base_token.transferFrom(caller, contract, base_amount);
                base_token.approve(market_manager.contract_address, BoundedInt::max());
            }
            if quote_amount != 0 {
                quote_token.transferFrom(caller, contract, quote_amount);
                quote_token.approve(market_manager.contract_address, BoundedInt::max());
            }

            // Update reserves.
            let base_reserves = self.base_reserves.read();
            let quote_reserves = self.quote_reserves.read();
            self.base_reserves.write(base_reserves + base_amount);
            self.quote_reserves.write(quote_reserves + quote_amount);
        }

        fn withdraw(ref self: ContractState) {
            // Fetch market info.
            let market_manager = self.market_manager.read();
            let market_id = self.market_id.read();
            let market_info = market_manager.market_info(market_id);

            // Fetch strategy state.
            let mut bid = self.bid.read();
            let mut ask = self.ask.read();
            let mut base_reserves = self.base_reserves.read();
            let mut quote_reserves = self.quote_reserves.read();

            // Withdraw positions.
            if bid.liquidity != 0 {
                let bid_liquidity: i128 = I128Trait::new(bid.liquidity, true);
                let (bid_base, bid_quote, _, _) = market_manager
                    .modify_position(market_id, bid.lower_limit, bid.upper_limit, bid_liquidity);
                base_reserves += bid_base.val;
                quote_reserves += bid_quote.val;
                bid = Default::default();
            }
            if ask.liquidity != 0 {
                let ask_liquidity: i128 = I128Trait::new(ask.liquidity, true);
                let (ask_base, ask_quote, _, _) = market_manager
                    .modify_position(market_id, ask.lower_limit, ask.upper_limit, ask_liquidity);
                base_reserves += ask_base.val;
                quote_reserves += ask_quote.val;
                ask = Default::default();
            }

            // Transfer balances.
            let base_token = ERC20ABIDispatcher { contract_address: market_info.base_token };
            let quote_token = ERC20ABIDispatcher { contract_address: market_info.quote_token };
            let caller = get_caller_address();
            if base_reserves != 0 {
                base_token.transfer(caller, base_reserves);
                base_reserves = 0;
            }
            if quote_reserves != 0 {
                quote_token.transfer(caller, quote_reserves);
                quote_reserves = 0;
            }

            // Commit state updates.
            self.bid.write(bid);
            self.ask.write(ask);
            self.base_reserves.write(base_reserves);
            self.quote_reserves.write(quote_reserves);
        }

        fn set_positions(
            ref self: ContractState, bid_lower: u32, bid_upper: u32, ask_lower: u32, ask_upper: u32
        ) {
            self.assert_only_owner();

            let queued_bid = PositionRange { lower_limit: bid_lower, upper_limit: bid_upper, };
            let queued_ask = PositionRange { lower_limit: ask_lower, upper_limit: ask_upper, };

            self.queued_bid.write(queued_bid);
            self.queued_ask.write(queued_ask);
        }

        fn queued_bid(self: @ContractState) -> PositionRange {
            self.queued_bid.read()
        }

        fn queued_ask(self: @ContractState) -> PositionRange {
            self.queued_ask.read()
        }

        fn base_reserves(self: @ContractState) -> u256 {
            self.base_reserves.read()
        }

        fn quote_reserves(self: @ContractState) -> u256 {
            self.quote_reserves.read()
        }

        fn bid(self: @ContractState) -> PositionInfo {
            self.bid.read()
        }

        fn ask(self: @ContractState) -> PositionInfo {
            self.ask.read()
        }
    }
}
