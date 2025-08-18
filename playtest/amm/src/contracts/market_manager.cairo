#[starknet::contract]
pub mod MarketManager {
    ////////////////////////////////
    // IMPORTS
    ////////////////////////////////

    // Core lib imports.
    use core::cmp::min;
    use core::dict::Felt252DictTrait;
    use core::nullable::{Nullable, NullableTrait};
    use core::integer::BoundedInt;
    use starknet::ContractAddress;
    use starknet::contract_address::contract_address_const;
    use starknet::{get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::syscalls::replace_class_syscall;
    use starknet::class_hash::ClassHash;

    // Local imports.
    use haiko_amm::libraries::store_packing::{
        MarketInfoStorePacking, MarketStateStorePacking, MarketConfigsStorePacking,
        LimitInfoStorePacking, OrderBatchStorePacking, PositionStorePacking, LimitOrderStorePacking
    };
    use haiko_amm::libraries::{tree, price_lib, liquidity_lib, swap_lib, order_lib, quote_lib};

    // Haiko imports.
    use haiko_lib::id;
    use haiko_lib::math::{math, price_math, fee_math, liquidity_math};
    use haiko_lib::constants::{ONE, MAX_WIDTH, MAX_LIMIT_SHIFTED, MAX_FEE_RATE};
    use haiko_lib::interfaces::{
        IMarketManager::IMarketManager, IStrategy::{IStrategyDispatcher, IStrategyDispatcherTrait},
        IFeeController::{IFeeControllerDispatcher, IFeeControllerDispatcherTrait},
        ILoanReceiver::{ILoanReceiverDispatcher, ILoanReceiverDispatcherTrait},
    };
    use haiko_lib::types::{
        core::{
            MarketInfo, MarketConfigs, MarketState, OrderBatch, Position, LimitInfo, LimitOrder,
            SwapParams, ConfigOption, Config, Depth
        },
        i128::{i128, I128Trait}, i256::{i256, I256Trait},
    };

    // External imports.
    use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};
    use openzeppelin::token::erc721::erc721::ERC721Component;
    use openzeppelin::token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};
    use openzeppelin::introspection::src5::SRC5Component;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    pub impl ERC721Impl = ERC721Component::ERC721Impl<ContractState>;
    #[abi(embed_v0)]
    pub impl ERC721MetadataImpl =
        ERC721Component::ERC721MetadataImpl<ContractState>;
    #[abi(embed_v0)]
    pub impl ERC721CamelOnlyImpl =
        ERC721Component::ERC721CamelOnlyImpl<ContractState>;

    pub impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    #[abi(embed_v0)]
    pub impl SRC5Impl = SRC5Component::SRC5Impl<ContractState>;

    ////////////////////////////////
    // STORAGE
    ////////////////////////////////

    #[storage]
    struct Storage {
        // Ownable
        owner: ContractAddress,
        queued_owner: ContractAddress,
        // Market information
        // Indexed by market_id = hash(base_token, quote_token, width, strategy, fee_controller, controller)
        market_info: LegacyMap::<felt252, MarketInfo>,
        market_state: LegacyMap::<felt252, MarketState>,
        market_configs: LegacyMap::<felt252, MarketConfigs>,
        whitelisted_markets: LegacyMap::<felt252, bool>,
        whitelisted_tokens: LegacyMap::<ContractAddress, bool>,
        // Indexed by (market_id: felt252, limit: u32)
        limit_info: LegacyMap::<(felt252, u32), LimitInfo>,
        // Indexed by position id = hash(market_id: felt252, owner: ContractAddress, lower_limit: u32, upper_limit: u32)
        positions: LegacyMap::<felt252, Position>,
        // Indexed by batch_id = hash(market_id: felt252, limit: u32, nonce: u128)
        batches: LegacyMap::<felt252, OrderBatch>,
        // Indexed by order_id = hash(batch_id: felt252, owner: ContractAddress)
        orders: LegacyMap::<felt252, LimitOrder>,
        // Next assignable swap id
        swap_id: u128,
        // Bitmap of initialised limits arranged as 3-level tree.
        // Indexed by market_id
        limit_tree_l0: LegacyMap::<felt252, felt252>,
        // Indexed by (market_id: felt252, seg_index_l1: u32)
        limit_tree_l1: LegacyMap::<(felt252, u32), felt252>,
        // Indexed by (market_id: felt252, seg_index_l2: u32)
        limit_tree_l2: LegacyMap::<(felt252, u32), felt252>,
        // Global information
        // Indexed by asset
        reserves: LegacyMap::<ContractAddress, u256>,
        donations: LegacyMap::<ContractAddress, u256>,
        flash_loan_fee_rate: LegacyMap::<ContractAddress, u16>,
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
    }

    ////////////////////////////////
    // EVENTS
    ////////////////////////////////

    #[event]
    #[derive(Drop, starknet::Event)]
    pub(crate) enum Event {
        CreateMarket: CreateMarket,
        ModifyPosition: ModifyPosition,
        CreateOrder: CreateOrder,
        CollectOrder: CollectOrder,
        Swap: Swap,
        MultiSwap: MultiSwap,
        FlashLoan: FlashLoan,
        Whitelist: Whitelist,
        WhitelistToken: WhitelistToken,
        Donate: Donate,
        Sweep: Sweep,
        ChangeOwner: ChangeOwner,
        ChangeFlashLoanFee: ChangeFlashLoanFee,
        SetMarketConfigs: SetMarketConfigs,
        Referral: Referral,
        Upgraded: Upgraded,
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct CreateMarket {
        #[key]
        pub market_id: felt252,
        #[key]
        pub base_token: ContractAddress,
        #[key]
        pub quote_token: ContractAddress,
        #[key]
        pub width: u32,
        #[key]
        pub strategy: ContractAddress,
        #[key]
        pub swap_fee_rate: u16,
        #[key]
        pub fee_controller: ContractAddress,
        #[key]
        pub controller: ContractAddress,
        pub start_limit: u32,
        pub start_sqrt_price: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct ModifyPosition {
        #[key]
        pub caller: ContractAddress,
        #[key]
        pub market_id: felt252,
        #[key]
        pub lower_limit: u32,
        #[key]
        pub upper_limit: u32,
        #[key]
        pub is_limit_order: bool,
        pub liquidity_delta: i128,
        pub base_amount: i256,
        pub quote_amount: i256,
        pub base_fees: u256,
        pub quote_fees: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct CreateOrder {
        #[key]
        pub caller: ContractAddress,
        #[key]
        pub market_id: felt252,
        #[key]
        pub order_id: felt252,
        #[key]
        pub limit: u32, // start limit
        #[key]
        pub batch_id: felt252,
        #[key]
        pub is_bid: bool,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct CollectOrder {
        #[key]
        pub caller: ContractAddress,
        #[key]
        pub market_id: felt252,
        #[key]
        pub order_id: felt252,
        #[key]
        pub limit: u32,
        #[key]
        pub batch_id: felt252,
        #[key]
        pub is_bid: bool,
        pub base_amount: u256,
        pub quote_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct MultiSwap {
        #[key]
        pub caller: ContractAddress,
        #[key]
        pub swap_id: u128,
        #[key]
        pub in_token: ContractAddress,
        #[key]
        pub out_token: ContractAddress,
        pub amount_in: u256,
        pub amount_out: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct Swap {
        #[key]
        pub caller: ContractAddress,
        #[key]
        pub market_id: felt252,
        #[key]
        pub is_buy: bool,
        #[key]
        pub exact_input: bool,
        #[key]
        pub swap_id: u128,
        pub amount_in: u256,
        pub amount_out: u256,
        pub fees: u256,
        pub end_limit: u32, // final limit reached after swap
        pub end_sqrt_price: u256, // final sqrt price reached after swap
        pub market_liquidity: u128, // global liquidity after swap
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct FlashLoan {
        #[key]
        pub borrower: ContractAddress,
        #[key]
        pub token: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct Whitelist {
        #[key]
        pub market_id: felt252
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct WhitelistToken {
        #[key]
        pub token: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct Donate {
        #[key]
        pub token: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct Sweep {
        #[key]
        pub receiver: ContractAddress,
        #[key]
        pub token: ContractAddress,
        pub amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct ChangeOwner {
        #[key]
        pub old: ContractAddress,
        #[key]
        pub new: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct ChangeFlashLoanFee {
        #[key]
        pub token: ContractAddress,
        pub fee: u16,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct Referral {
        #[key]
        pub caller: ContractAddress,
        pub referrer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct SetMarketConfigs {
        #[key]
        pub market_id: felt252,
        pub min_lower: u32,
        pub max_lower: u32,
        pub min_upper: u32,
        pub max_upper: u32,
        pub min_width: u32,
        pub max_width: u32,
        pub add_liquidity: ConfigOption,
        pub remove_liquidity: ConfigOption,
        pub create_bid: ConfigOption,
        pub create_ask: ConfigOption,
        pub collect_order: ConfigOption,
        pub swap: ConfigOption,
    }

    #[derive(Drop, starknet::Event)]
    pub(crate) struct Upgraded {
        #[key]
        pub class_hash: ClassHash,
    }

    ////////////////////////////////
    // CONSTRUCTOR
    ////////////////////////////////

    #[constructor]
    fn constructor(
        ref self: ContractState, owner: ContractAddress, name: felt252, symbol: felt252
    ) {
        self.owner.write(owner);
        self.swap_id.write(1);
        self.erc721.initializer(name, symbol);
        self
            .emit(
                Event::ChangeOwner(ChangeOwner { old: contract_address_const::<0x0>(), new: owner })
            );
    }

    #[generate_trait]
    impl ModifierImpl of ModifierTrait {
        fn assert_only_owner(self: @ContractState) {
            assert(self.owner.read() == get_caller_address(), 'OnlyOwner');
        }

        fn enforce_status(
            self: @ContractState, value: ConfigOption, market_info: @MarketInfo, err_msg: felt252,
        ) {
            let caller = get_caller_address();
            match value {
                ConfigOption::Enabled => assert(true, err_msg),
                ConfigOption::Disabled => assert(false, err_msg),
                ConfigOption::OnlyOwner => assert(caller == *market_info.controller, err_msg),
                ConfigOption::OnlyStrategy => assert(caller == *market_info.strategy, err_msg),
            }
        }

        fn enforce_fixed<T, impl TPartialEq: PartialEq<T>, impl TDrop: Drop<T>>(
            self: @ContractState, config: Config<T>, new_config: Config<T>, err_msg: felt252
        ) {
            if config.fixed {
                assert(config == new_config, err_msg);
            }
        }
    }

    #[abi(embed_v0)]
    impl MarketManager of IMarketManager<ContractState> {
        ////////////////////////////////
        // VIEW FUNCTIONS
        ////////////////////////////////

        fn owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn is_market_whitelisted(self: @ContractState, market_id: felt252) -> bool {
            self.whitelisted_markets.read(market_id)
        }

        fn base_token(self: @ContractState, market_id: felt252) -> ContractAddress {
            self.market_info.read(market_id).base_token
        }

        fn quote_token(self: @ContractState, market_id: felt252) -> ContractAddress {
            self.market_info.read(market_id).quote_token
        }

        fn width(self: @ContractState, market_id: felt252) -> u32 {
            self.market_info.read(market_id).width
        }

        fn strategy(self: @ContractState, market_id: felt252) -> ContractAddress {
            self.market_info.read(market_id).strategy
        }

        fn fee_controller(self: @ContractState, market_id: felt252) -> ContractAddress {
            self.market_info.read(market_id).fee_controller
        }

        fn swap_fee_rate(self: @ContractState, market_id: felt252) -> u16 {
            let fee_controller = self.market_info.read(market_id).fee_controller;
            if fee_controller == contract_address_const::<0x0>() {
                self.market_info.read(market_id).swap_fee_rate
            } else {
                IFeeControllerDispatcher { contract_address: fee_controller }.swap_fee_rate()
            }
        }

        fn flash_loan_fee_rate(self: @ContractState, token: ContractAddress) -> u16 {
            self.flash_loan_fee_rate.read(token)
        }

        fn position(
            self: @ContractState,
            market_id: felt252,
            owner: felt252,
            lower_limit: u32,
            upper_limit: u32
        ) -> Position {
            let position_id = id::position_id(market_id, owner, lower_limit, upper_limit);
            self.positions.read(position_id)
        }

        fn order(self: @ContractState, order_id: felt252) -> LimitOrder {
            self.orders.read(order_id)
        }

        fn market_id(
            self: @ContractState,
            base_token: ContractAddress,
            quote_token: ContractAddress,
            width: u32,
            strategy: ContractAddress,
            swap_fee_rate: u16,
            fee_controller: ContractAddress,
            controller: ContractAddress,
        ) -> felt252 {
            let market_info = MarketInfo {
                base_token, quote_token, width, strategy, swap_fee_rate, fee_controller, controller,
            };
            id::market_id(market_info)
        }

        fn market_info(self: @ContractState, market_id: felt252) -> MarketInfo {
            self.market_info.read(market_id)
        }

        fn market_state(self: @ContractState, market_id: felt252) -> MarketState {
            self.market_state.read(market_id)
        }

        fn market_configs(self: @ContractState, market_id: felt252) -> MarketConfigs {
            self.market_configs.read(market_id)
        }

        fn batch(self: @ContractState, batch_id: felt252) -> OrderBatch {
            self.batches.read(batch_id)
        }

        fn liquidity(self: @ContractState, market_id: felt252) -> u128 {
            self.market_state.read(market_id).liquidity
        }

        fn curr_limit(self: @ContractState, market_id: felt252) -> u32 {
            self.market_state.read(market_id).curr_limit
        }

        fn curr_sqrt_price(self: @ContractState, market_id: felt252) -> u256 {
            self.market_state.read(market_id).curr_sqrt_price
        }

        fn limit_info(self: @ContractState, market_id: felt252, limit: u32) -> LimitInfo {
            self.limit_info.read((market_id, limit))
        }

        fn is_limit_init(self: @ContractState, market_id: felt252, width: u32, limit: u32) -> bool {
            tree::get(self, market_id, width, limit)
        }

        fn next_limit(
            self: @ContractState, market_id: felt252, is_buy: bool, width: u32, start_limit: u32
        ) -> Option<u32> {
            tree::next_limit(self, market_id, is_buy, width, start_limit)
        }

        fn donations(self: @ContractState, asset: ContractAddress) -> u256 {
            self.donations.read(asset)
        }

        fn reserves(self: @ContractState, asset: ContractAddress) -> u256 {
            self.reserves.read(asset)
        }

        // Returns total amount of tokens and accrued fees inside of a liquidity position.
        // 
        // # Arguments
        // * `market_id` - market id
        // * `owner` - owner of position
        // * `lower_limit` - lower limit of position
        // * `upper_limit` - upper limit of position
        //
        // # Returns
        // * `base_amount` - amount of base tokens inside position, exclusive of fees
        // * `quote_amount` - amount of quote tokens inside position, exclusive of fees
        // * `base_fees` - base fees accumulated inside position
        // * `quote_fees` - quote fees accumulated inside position
        fn amounts_inside_position(
            self: @ContractState,
            market_id: felt252,
            owner: felt252,
            lower_limit: u32,
            upper_limit: u32
        ) -> (u256, u256, u256, u256) {
            liquidity_lib::amounts_inside_position(self, market_id, owner, lower_limit, upper_limit)
        }

        // Returns total amount of tokens inside of a limit order.
        // 
        // # Arguments
        // * `order_id` - order id
        // * `market_id` - market id
        //
        // # Returns
        // * `base_amount` - amount of base tokens inside order
        // * `quote_amount` - amount of quote tokens inside order
        fn amounts_inside_order(
            self: @ContractState, order_id: felt252, market_id: felt252
        ) -> (u256, u256) {
            order_lib::amounts_inside_order(self, order_id, market_id)
        }

        // Returns the token amounts to be transferred for creating a liquidity position.
        //
        // # Arguments
        // * `market_id` - market id
        // * `lower_limit` - lower limit of position
        // * `upper_limit` - upper limit of position
        // * `liquidity` - liquidity of position
        //
        // # Returns
        // * `base_amount` - amount of base tokens to transfer
        // * `quote_amount` - amount of quote tokens to transfer
        fn liquidity_to_amounts(
            self: @ContractState,
            market_id: felt252,
            lower_limit: u32,
            upper_limit: u32,
            liquidity_delta: u128,
        ) -> (u256, u256) {
            let market_state = self.market_state.read(market_id);
            let market_info = self.market_info.read(market_id);
            let (base_amount, quote_amount) = liquidity_math::liquidity_to_amounts(
                I128Trait::new(liquidity_delta, false),
                market_state.curr_sqrt_price,
                price_math::limit_to_sqrt_price(lower_limit, market_info.width),
                price_math::limit_to_sqrt_price(upper_limit, market_info.width),
            );
            (base_amount.val, quote_amount.val)
        }

        // Convert desired token amount to liquidity for limit orders.
        //
        // # Arguments
        // * `market_id` - market id
        // * `is_buy` - whether order is a bid or ask
        // * `limit` - limit at which limit order is placed
        // * `amount` - amount of tokens to convert
        //
        // # Returns
        // * `liquidity` - equivalent liquidity
        fn amount_to_liquidity(
            self: @ContractState, market_id: felt252, is_bid: bool, limit: u32, amount: u256,
        ) -> u128 {
            let width = self.width(market_id);
            let lower_sqrt_price = price_math::limit_to_sqrt_price(limit, width);
            let upper_sqrt_price = price_math::limit_to_sqrt_price(limit + width, width);
            // Round down to avoid returning a liquidity amount that requires greater token balances
            // than is available to the user.
            if is_bid {
                liquidity_math::quote_to_liquidity(
                    lower_sqrt_price, upper_sqrt_price, amount, false
                )
            } else {
                liquidity_math::base_to_liquidity(lower_sqrt_price, upper_sqrt_price, amount, false)
            }
        }

        // Return pool depth as a list of liquidity deltas for a market.
        //
        // # Arguments
        // * `market_id` - market id
        //
        // # Returns
        // * `depth` - list of limits, prices and liquidity deltas
        fn depth(self: @ContractState, market_id: felt252) -> Span<Depth> {
            // Start search from limit 0. Append it as first limit if it exists.
            let mut limit: u32 = 0;
            let mut depth: Array<Depth> = array![];

            let width = self.width(market_id);

            loop {
                if limit == BoundedInt::max() {
                    break;
                }

                let limit_info = self.limit_info.read((market_id, limit));
                let sqrt_price = price_math::limit_to_sqrt_price(limit, width);
                let price = math::mul_div(sqrt_price, sqrt_price, ONE, false);
                if limit_info.liquidity_delta.val != 0 {
                    depth
                        .append(
                            Depth { limit, price, liquidity_delta: limit_info.liquidity_delta }
                        );
                }

                // If we've reached the end of the tree, stop.
                let next_limit = self.next_limit(market_id, true, width, limit);
                match next_limit {
                    Option::Some(nl) => limit = nl,
                    Option::None => limit = BoundedInt::max(),
                }
            };

            depth.span()
        }

        ////////////////////////////////
        // EXTERNAL FUNCTIONS
        ////////////////////////////////

        // Create a new market. 
        // 
        // # Arguments
        // * `base_token` - base token address
        // * `quote_token` - quote token address
        // * `width` - limit width of market
        // * `strategy` - strategy contract address, or 0 if no strategy
        // * `swap_fee_rate` - swap fee denominated in bps
        // * `fee_controller` - fee controller contract address
        // * `start_limit` - initial limit (shifted)
        // * `controller` - market controller for upgrading market configs, or 0 if none
        // * `configs` - (optional) custom market configurations
        //
        // # Returns
        // * `market_id` - Market ID
        fn create_market(
            ref self: ContractState,
            base_token: ContractAddress,
            quote_token: ContractAddress,
            width: u32,
            strategy: ContractAddress,
            swap_fee_rate: u16,
            fee_controller: ContractAddress,
            start_limit: u32,
            controller: ContractAddress,
            configs: Option<MarketConfigs>,
        ) -> felt252 {
            // Validate inputs.
            assert(
                base_token != contract_address_const::<0x0>()
                    && quote_token != contract_address_const::<0x0>(),
                'TokensNull'
            );
            assert(width != 0, 'WidthZero');
            assert(width <= MAX_WIDTH, 'WidthOF');
            assert(swap_fee_rate <= MAX_FEE_RATE, 'FeeRateOF');
            assert(start_limit < MAX_LIMIT_SHIFTED, 'StartLimitOF');

            // Check tokens exist.
            ERC20ABIDispatcher { contract_address: base_token }.name();
            ERC20ABIDispatcher { contract_address: quote_token }.name();

            // Initialise market info, first checking the market does not already exist.
            // A market is uniquely identified by the base and quote token, market width, swap fee,
            // fee controller and market owner. Duplicate markets are disallowed.
            let new_market_info = MarketInfo {
                base_token, quote_token, width, strategy, swap_fee_rate, fee_controller, controller,
            };
            let market_id = id::market_id(new_market_info);
            let market_info = self.market_info.read(market_id);
            assert(market_info.base_token == contract_address_const::<0x0>(), 'MarketExists');

            // Check market is whitelisted. A market can be explicitly whitelisted via the market id.
            // Alternatively, if both base and quote tokens are whitelisted, any market for the pair
            // can be created as long as it has no attached strategy or controllers.
            let market_white_listed = self.whitelisted_markets.read(market_id);
            if !market_white_listed {
                assert(
                    strategy == contract_address_const::<0x0>()
                        && fee_controller == contract_address_const::<0x0>()
                        && controller == contract_address_const::<0x0>(),
                    'NotWhitelisted'
                );
            }
            let base_whitelisted = self.whitelisted_tokens.read(base_token);
            let quote_whitelisted = self.whitelisted_tokens.read(quote_token);
            if !base_whitelisted {
                self.whitelisted_tokens.write(base_token, true);
                self.emit(Event::WhitelistToken(WhitelistToken { token: base_token }));
            }
            if !quote_whitelisted {
                self.whitelisted_tokens.write(quote_token, true);
                self.emit(Event::WhitelistToken(WhitelistToken { token: quote_token }));
            }

            self.market_info.write(market_id, new_market_info);

            // Initialise market settings.
            if configs.is_some() {
                let configs_uw = configs.unwrap();
                assert(controller != contract_address_const::<0x0>(), 'NoController');
                self.market_configs.write(market_id, configs_uw);
            }

            // Initialise market state.
            let start_sqrt_price = price_math::limit_to_sqrt_price(start_limit, width);
            let mut market_state: MarketState = Default::default();
            market_state.curr_limit = start_limit;
            market_state.curr_sqrt_price = start_sqrt_price;
            self.market_state.write(market_id, market_state);

            // Emit events.
            self
                .emit(
                    Event::CreateMarket(
                        CreateMarket {
                            market_id,
                            base_token,
                            quote_token,
                            width,
                            strategy,
                            swap_fee_rate,
                            fee_controller,
                            controller,
                            start_limit,
                            start_sqrt_price,
                        }
                    )
                );
            if configs.is_some() {
                let configs = configs.unwrap();
                self
                    .emit(
                        Event::SetMarketConfigs(
                            SetMarketConfigs {
                                market_id,
                                min_lower: configs.limits.value.min_lower,
                                max_lower: configs.limits.value.max_lower,
                                min_upper: configs.limits.value.min_upper,
                                max_upper: configs.limits.value.max_upper,
                                min_width: configs.limits.value.min_width,
                                max_width: configs.limits.value.max_width,
                                add_liquidity: configs.add_liquidity.value,
                                remove_liquidity: configs.remove_liquidity.value,
                                create_bid: configs.create_bid.value,
                                create_ask: configs.create_ask.value,
                                collect_order: configs.collect_order.value,
                                swap: configs.swap.value,
                            }
                        )
                    );
            }

            market_id
        }

        // Add or remove liquidity from a position, or collect fees by passing 0 as liquidity delta.
        //
        // # Arguments
        // * `market_id` - Market ID
        // * `lower_limit` - Lower limit at which position starts
        // * `upper_limit` - Higher limit at which position ends
        // * `liquidity_delta` - Amount of liquidity to add or remove
        // * `referrer` - Referrer address, or 0 if none
        //
        // # Returns
        // * `base_amount` - Amount of base tokens transferred in (+ve) or out (-ve), including fees
        // * `quote_amount` - Amount of quote tokens transferred in (+ve) or out (-ve), including fees
        // * `base_fees` - Amount of base tokens collected in fees
        // * `quote_fees` - Amount of quote tokens collected in fees
        fn modify_position(
            ref self: ContractState,
            market_id: felt252,
            lower_limit: u32,
            upper_limit: u32,
            liquidity_delta: i128,
        ) -> (i256, i256, u256, u256) {
            // Run checks.
            let market_info = self.market_info.read(market_id);
            if market_info.controller != contract_address_const::<0x0>() {
                let market_configs = self.market_configs.read(market_id);
                let (config, err_msg) = if liquidity_delta.sign {
                    (market_configs.remove_liquidity.value, 'RemLiqDisabled')
                } else {
                    // If adding liquidity, we check that the width of the position is legal.
                    // This check isn't applied when removing liquidity to prevent market
                    // config changes from inadvertently preventing withdrawals.
                    let width = upper_limit - lower_limit;
                    assert(width >= market_configs.limits.value.min_width, 'AddLiqWidthUF');
                    assert(width <= market_configs.limits.value.max_width, 'AddLiqWidthOF');
                    (market_configs.add_liquidity.value, 'AddLiqDisabled')
                };
                self.enforce_status(config, @market_info, err_msg);
            }

            // The caller of `_modify_position` can either be a user address (formatted as felt252) or 
            // a `batch_id` if it is being modified as part of a limit order. Here, we are dealing with
            // regular positions, so we simply pass in the caller address.
            let caller: felt252 = get_caller_address().into();
            self
                ._modify_position(
                    caller, market_id, lower_limit, upper_limit, liquidity_delta, false
                )
        }

        // As with `modify_position`, but with a referrer.
        //
        // # Arguments
        // * `market_id` - Market ID
        // * `lower_limit` - Lower limit at which position starts
        // * `upper_limit` - Higher limit at which position ends
        // * `liquidity_delta` - Amount of liquidity to add or remove
        // * `referrer` - Referrer address
        //
        // # Returns
        // * `base_amount` - Amount of base tokens transferred in (+ve) or out (-ve), including fees
        // * `quote_amount` - Amount of quote tokens transferred in (+ve) or out (-ve), including fees
        // * `base_fees` - Amount of base tokens collected in fees
        // * `quote_fees` - Amount of quote tokens collected in fees
        fn modify_position_with_referrer(
            ref self: ContractState,
            market_id: felt252,
            lower_limit: u32,
            upper_limit: u32,
            liquidity_delta: i128,
            referrer: ContractAddress,
        ) -> (i256, i256, u256, u256) {
            // Check referrer is non-null.
            assert(referrer != contract_address_const::<0x0>(), 'ReferrerZero');

            // Emit referrer event. 
            let caller = get_caller_address();
            if caller != referrer {
                self.emit(Event::Referral(Referral { caller, referrer, }));
            }

            // Modify position.
            self.modify_position(market_id, lower_limit, upper_limit, liquidity_delta)
        }

        // Create a new limit order.
        // Must be placed below the current limit for bids, or above the current limit for asks.
        // 
        // # Arguments
        // * `market_id` - market id
        // * `is_bid` - whether bid order
        // * `limit` - limit at which order is placed
        // * `liquidity_delta` - amount of liquidity to add or remove
        //
        // # Returns
        // * `order_id` - order id
        fn create_order(
            ref self: ContractState,
            market_id: felt252,
            is_bid: bool,
            limit: u32,
            liquidity_delta: u128,
        ) -> felt252 {
            // Retrieve market info.
            let market_state = self.market_state.read(market_id);
            let market_info = self.market_info.read(market_id);

            // Run checks.
            assert(market_info.width != 0, 'MarketNull');
            if market_info.controller != contract_address_const::<0x0>() {
                let market_configs = self.market_configs.read(market_id);
                let (config, err_msg) = if is_bid {
                    (market_configs.create_bid.value, 'CreateBidDisabled')
                } else {
                    (market_configs.create_ask.value, 'CreateAskDisabled')
                };
                self.enforce_status(config, @market_info, err_msg);
            }
            if is_bid {
                // In markets with `width` > 1, it is possible that the current limit lies
                // between a width interval. Therefore, we need to check that the upper limit
                // of the order, i.e. `limit + width`, is below the current limit.
                assert(limit + market_info.width < market_state.curr_limit, 'NotLimitOrder');
            } else {
                assert(limit > market_state.curr_limit, 'NotLimitOrder');
            }
            assert(liquidity_delta != 0, 'OrderAmtZero');

            // Fetch order and batch info.
            let limit_info = self.limit_info.read((market_id, limit));
            let caller = get_caller_address();
            let batch_id = id::batch_id(market_id, limit, limit_info.nonce);
            let mut batch = self.batches.read(batch_id);
            let order_id = id::order_id(batch_id, caller);

            // Create liquidity position. 
            // Note this step also transfers tokens from caller to contract.
            let (base_amount, quote_amount, _, _) = self
                ._modify_position(
                    batch_id,
                    market_id,
                    limit,
                    limit + market_info.width,
                    I128Trait::new(liquidity_delta, false),
                    true,
                );

            // Update or create order.
            let mut order = self.orders.read(order_id);
            // If this is a new order, initialise batch id.
            if order.batch_id == 0 {
                order.batch_id = batch_id;
            }
            order.liquidity += liquidity_delta;

            // If this is the first order of batch, initialise immutables.
            if batch.limit == 0 {
                batch.limit = limit;
                batch.is_bid = is_bid;
            }
            // Update batch liquidity. Note batch amounts are not updated here as they are only used
            // for storing collected fees and filled balances.
            batch.liquidity += liquidity_delta;

            // Commit state updates.
            self.batches.write(batch_id, batch);
            self.orders.write(order_id, order);

            // Emit event.
            self
                .emit(
                    Event::CreateOrder(
                        CreateOrder {
                            caller,
                            market_id,
                            order_id,
                            limit,
                            batch_id,
                            is_bid,
                            amount: if is_bid {
                                quote_amount
                            } else {
                                base_amount
                            }.val
                        }
                    )
                );

            // Return order id.
            order_id
        }

        // Collect a limit order.
        // Collects filled amount and refunds unfilled portion.
        // 
        // # Arguments
        // * `market_id` - market id
        // * `order_id` - order id
        //
        // # Returns
        // * `base_amount` - amount of base tokens collected
        // * `quote_amount` - amount of quote tokens collected
        fn collect_order(
            ref self: ContractState, market_id: felt252, order_id: felt252,
        ) -> (u256, u256) {
            // Fetch market info, order and batch.
            let market_info = self.market_info.read(market_id);
            let mut order = self.orders.read(order_id);

            // Run checks.
            if market_info.controller != contract_address_const::<0x0>() {
                let market_configs = self.market_configs.read(market_id);
                self
                    .enforce_status(
                        market_configs.collect_order.value, @market_info, 'CollectOrderDisabled'
                    );
            }
            assert(order.liquidity != 0, 'OrderCollected');
            let caller = get_caller_address();
            let order_id_exp = id::order_id(order.batch_id, caller);
            assert(order_id == order_id_exp, 'OrderOwnerOnly');

            // Calculate withdraw amounts. User's position is calculated based on the liquidity
            // of their order relative to the total liquidity of the batch. Fully or partially filled 
            // orders are paid their prorata share of fees (up to the swap fee rate), while unfilled
            // orders forfeit fees. This is to prevent depositors from opportunistically placing orders 
            // in batches with existing accrued fee balances and withdrawing them immediately. In 
            // addition, all orders in markets with a variable fee controller must forfeit fees to 
            // prevent potential insolvency from fee rate updates. 
            let mut batch = self.batches.read(order.batch_id);
            let (mut base_amount, mut quote_amount) = if !batch.filled {
                // If the order has not yet been filled, first withdraw from batch position.
                let (base_amt_incl_fees, quote_amt_incl_fees, base_fees, quote_fees) = self
                    ._modify_position(
                        order.batch_id,
                        market_id,
                        batch.limit,
                        batch.limit + market_info.width,
                        I128Trait::new(order.liquidity, true),
                        true,
                    );

                // Add withdrawn amounts to batch.
                batch.base_amount += base_amt_incl_fees.val.try_into().expect('BatchBaseAmtOF');
                batch.quote_amount += quote_amt_incl_fees.val.try_into().expect('BatchQuoteAmtOF');

                // Return withdraw amount.
                (base_amt_incl_fees.val - base_fees, quote_amt_incl_fees.val - quote_fees)
            } else {
                // If the batch is fully filled, calculate withdraw amounts based on the order's 
                // liquidity and swap fee rate.
                let market_state = self.market_state.read(market_id);
                let (base_amount, quote_amount) = liquidity_math::liquidity_to_amounts(
                    I128Trait::new(order.liquidity, false),
                    market_state.curr_sqrt_price,
                    price_math::limit_to_sqrt_price(batch.limit, market_info.width),
                    price_math::limit_to_sqrt_price(
                        batch.limit + market_info.width, market_info.width
                    ),
                );
                (base_amount.val, quote_amount.val)
            };

            // Amount so far excludes due swap fees. Add swap fees on filled portion of order.
            // Fees are forfeited if market uses a variable fee controller.
            if market_info.fee_controller == contract_address_const::<0x0>() {
                if batch.is_bid {
                    base_amount = fee_math::net_to_gross(base_amount, market_info.swap_fee_rate);
                } else {
                    quote_amount = fee_math::net_to_gross(quote_amount, market_info.swap_fee_rate);
                }
            }

            // Update batch amounts for filled orders. We cap deductions at available 
            // amounts to prevent failures due to rounding errors. 
            let base_amount_u128 = base_amount.try_into().expect('BatchBaseAmtOF');
            let quote_amount_u128 = quote_amount.try_into().expect('BatchQuoteAmtOF');
            batch.base_amount -= min(base_amount_u128, batch.base_amount);
            batch.quote_amount -= min(quote_amount_u128, batch.quote_amount);

            // Finally, if this is the last order of the batch, donate remaining fees.
            if batch.liquidity == order.liquidity {
                if batch.base_amount != 0 {
                    let base_donations = self.donations.read(market_info.base_token);
                    let amount: u256 = batch.base_amount.into();
                    self.donations.write(market_info.base_token, base_donations + amount);
                    self.emit(Event::Donate(Donate { token: market_info.base_token, amount }));
                }
                if batch.quote_amount != 0 {
                    let quote_donations = self.donations.read(market_info.quote_token);
                    let amount: u256 = batch.quote_amount.into();
                    self.donations.write(market_info.quote_token, quote_donations + amount);
                    self.emit(Event::Donate(Donate { token: market_info.quote_token, amount }));
                }
                batch.base_amount = 0;
                batch.quote_amount = 0;
            }

            // Update order and batch.
            batch.liquidity -= order.liquidity;
            order.liquidity = 0;

            // Commit state updates.
            self.batches.write(order.batch_id, batch);
            self.orders.write(order_id, order);

            // Update reserves.
            if base_amount != 0 {
                let base_reserves = self.reserves.read(market_info.base_token);
                self.reserves.write(market_info.base_token, base_reserves - base_amount);
            }
            if quote_amount != 0 {
                let quote_reserves = self.reserves.read(market_info.quote_token);
                self.reserves.write(market_info.quote_token, quote_reserves - quote_amount);
            }

            // Transfer withdrawn amounts to caller.
            let market_info = self.market_info.read(market_id);
            if base_amount > 0 {
                let base_token = ERC20ABIDispatcher { contract_address: market_info.base_token };
                base_token.transfer(caller, base_amount);
            }
            if quote_amount > 0 {
                let quote_token = ERC20ABIDispatcher { contract_address: market_info.quote_token };
                quote_token.transfer(caller, quote_amount);
            }

            self
                .emit(
                    Event::CollectOrder(
                        CollectOrder {
                            caller,
                            market_id,
                            order_id,
                            limit: batch.limit,
                            batch_id: order.batch_id,
                            is_bid: batch.is_bid,
                            base_amount,
                            quote_amount,
                        }
                    )
                );

            // Return collected token amounts.
            (base_amount, quote_amount)
        }

        // Swap tokens through a market.
        //
        // # Arguments
        // * `market_id` - ID of market to execute swap through
        // * `is_buy` - whether swap is a buy or sell
        // * `amount` - amount of tokens to swap
        // * `exact_input` - true if `amount` is exact input, false if exact output
        // * `threshold_sqrt_price` - maximum sqrt price to swap at for buys, minimum for sells
        // * `threshold_amount` - minimum amount out for exact input, or max amount in for exact output
        // * `deadline` - deadline for swap to be executed by
        //
        // # Returns
        // * `amount_in` - amount of tokens swapped in gross of fees
        // * `amount_out` - amount of tokens swapped out net of fees
        // * `fees` - fees paid in token swapped in
        fn swap(
            ref self: ContractState,
            market_id: felt252,
            is_buy: bool,
            amount: u256,
            exact_input: bool,
            threshold_sqrt_price: Option<u256>,
            threshold_amount: Option<u256>,
            deadline: Option<u64>,
        ) -> (u256, u256, u256) {
            // Assign and update swap id.
            // Swap id is used to identify swaps that are part of a multi-hop route.
            let swap_id = self.swap_id.read();
            self.swap_id.write(swap_id + 1);

            self
                ._swap(
                    market_id,
                    is_buy,
                    amount,
                    exact_input,
                    threshold_sqrt_price,
                    threshold_amount,
                    swap_id,
                    deadline,
                    false
                )
        }

        // Swap tokens across multiple markets in a multi-hop route.
        // 
        // # Arguments
        // * `in_token` - in token address
        // * `out_token` - out token address
        // * `amount` - amount of tokens to swap in
        // * `route` - list of market ids defining the route to swap through
        // * `threshold_amount` - minimum amount out
        // * `deadline` - deadline for swap to be executed by
        //
        // # Returns
        // * `amount_out` - amount of tokens swapped out net of fees
        fn swap_multiple(
            ref self: ContractState,
            in_token: ContractAddress,
            out_token: ContractAddress,
            amount: u256,
            route: Span<felt252>,
            threshold_amount: Option<u256>,
            deadline: Option<u64>,
        ) -> u256 {
            // Execute swap.
            let amount_out = self
                ._swap_multiple(in_token, out_token, amount, route, deadline, false);

            // Check amount against threshold.
            if threshold_amount.is_some() && amount_out < threshold_amount.unwrap() {
                panic(array!['ThresholdAmount', amount_out.low.into(), amount_out.high.into()]);
            }

            // Increment swap id.
            let swap_id = self.swap_id.read();
            self.swap_id.write(swap_id + 1);

            // Emit event.
            self
                .emit(
                    Event::MultiSwap(
                        MultiSwap {
                            caller: get_caller_address(),
                            swap_id,
                            in_token,
                            out_token,
                            amount_in: amount,
                            amount_out,
                        }
                    )
                );

            // Return amount out.
            amount_out
        }

        // Obtain quote for a swap between tokens (returned as panic message).
        // This is the safest way to obtain a quote as it does not rely on the strategy to
        // correctly report its queued and placed positions.
        // The first entry in the returned array is 'Quote' to distinguish it from other errors.
        //
        // # Arguments
        // * `market_id` - market id
        // * `is_buy` - whether swap is a buy or sell
        // * `amount` - amount of tokens to swap
        // * `exact_input` - true if `amount` is exact input, or false if exact output
        // 
        // # Returns (as panic message)
        // * `amount` - amount out (if exact input) or amount in (if exact output)
        fn quote(
            ref self: ContractState,
            market_id: felt252,
            is_buy: bool,
            amount: u256,
            exact_input: bool,
        ) {
            let (amount_in, amount_out, _) = self
                ._swap(
                    market_id,
                    is_buy,
                    amount,
                    exact_input,
                    Option::None(()),
                    Option::None(()),
                    1, // mock swap id - unused
                    Option::None(()),
                    true,
                );
            let quote = if exact_input {
                amount_out
            } else {
                amount_in
            };
            // Return amount via panic.
            panic(array!['quote', quote.low.into(), quote.high.into()]);
        }

        // Obtain quote for a swap across multiple markets in a multi-hop route.
        // Returned as error message. This is the safest way to obtain a quote as it does not rely on
        // the strategy to correctly report its queued and placed positions.
        // The first entry in the returned array is 'quote_multiple' to distinguish it from other errors.
        // 
        // # Arguments
        // * `in_token` - in token address
        // * `out_token` - out token address
        // * `amount` - amount of tokens to swap in
        // * `route` - list of market ids defining the route to swap through
        //
        // # Returns (as error message)
        // * `amount_out` - amount of tokens swapped out net of fees
        fn quote_multiple(
            ref self: ContractState,
            in_token: ContractAddress,
            out_token: ContractAddress,
            amount: u256,
            route: Span<felt252>,
        ) {
            let amount_out = self
                ._swap_multiple(in_token, out_token, amount, route, Option::None(()), true);
            // Return amount via panic.
            panic(array!['quote_multiple', amount_out.low.into(), amount_out.high.into()]);
        }

        // Obtain quote for a single swap.
        // Caution: this function returns a correct quote only so long as the strategy correctly
        // reports its queued and placed positions. This function is intended for use by on-chain
        // callers that cannot retrieve `quote` via error message. Alternatively, it can be used 
        // to obtain guaranteed correct quotes for non-strategy markets.
        //
        // # Arguments
        // * `market_id` - market id
        // * `is_buy` - whether swap is a buy or sell
        // * `amount` - amount of tokens to swap
        // * `exact_input` - true if `amount` is exact input, or false if exact output
        // * `ignore_strategy` - whether to ignore strategy positions when fetching quote
        //
        // # Returns
        // * `amount` - amount out (if exact input) or amount in (if exact output)
        fn unsafe_quote(
            self: @ContractState,
            market_id: felt252,
            is_buy: bool,
            amount: u256,
            exact_input: bool,
            ignore_strategy: bool,
        ) -> u256 {
            // Fetch market info and state.
            let market_info = self.market_info.read(market_id);
            let mut market_state = self.market_state.read(market_id);

            // Run checks.
            if market_info.controller != contract_address_const::<0x0>() {
                let market_configs = self.market_configs.read(market_id);
                self.enforce_status(market_configs.swap.value, @market_info, 'SwapDisabled');
            }
            assert(market_info.width != 0, 'MarketNull');
            assert(amount > 0, 'AmtZero');

            // Fetch strategy positions and simulate updates.
            // To account for queued position updates, we update in-memory market liquidity by 
            // removing liquidity from in-range placed positions and adding liquidity to in-range 
            // queued positions. Simultaneously, we extract a set of liquidity deltas and initialised
            // limits from the positions, which we use to augment liquidity when traversing limits. 
            let mut queued_deltas: Felt252Dict<Nullable<i128>> = Default::default();
            let mut target_limits = ArrayTrait::<u32>::new();
            if market_info.strategy != contract_address_const::<0x0>() && !ignore_strategy {
                let strategy = IStrategyDispatcher { contract_address: market_info.strategy };
                let placed_positions = strategy.placed_positions(market_id);
                let swap_params = SwapParams { is_buy, amount, exact_input };
                let queued_positions = strategy
                    .queued_positions(market_id, Option::Some(swap_params));
                // Only populate deltas if positions are updated, otherwise we would be duplicating
                // liquidity already deposited into the market.
                let mut i = 0;
                loop {
                    if i == placed_positions.len() {
                        break;
                    }
                    let placed_position = *placed_positions.at(i);
                    let queued_position = *queued_positions.at(i);
                    if placed_position != queued_position {
                        quote_lib::populate_limit(
                            ref queued_deltas,
                            ref target_limits,
                            ref market_state,
                            placed_position,
                            true
                        );
                        quote_lib::populate_limit(
                            ref queued_deltas,
                            ref target_limits,
                            ref market_state,
                            queued_position,
                            false
                        );
                    }
                    i += 1;
                };
            }

            // Get swap fee. 
            // This is either a fixed swap fee or a variable one set by the external fee controller.
            let fee_rate = if market_info.fee_controller == contract_address_const::<0x0>() {
                market_info.swap_fee_rate
            } else {
                let rate = IFeeControllerDispatcher { contract_address: market_info.fee_controller }
                    .swap_fee_rate();
                assert(rate <= MAX_FEE_RATE, 'FeeRateOF');
                rate
            };

            // Initialise trackers for swap state.
            let mut amount_rem = amount;
            let mut amount_calc = 0;

            // Simulate swap.
            quote_lib::quote_iter(
                self,
                market_id,
                ref market_state,
                ref amount_rem,
                ref amount_calc,
                ref queued_deltas,
                target_limits.span(),
                Option::None(()),
                fee_rate,
                market_info.width,
                is_buy,
                exact_input,
            );

            // Return quote.
            amount_calc
        }

        // Obtain quote for a multi-market swap.
        // Caution: this function returns a correct quote only so long as the strategy correctly
        // reports its queued and placed positions. This function is intended for use by on-chain
        // callers that cannot retrieve `quote_multiple` via error message. Alternatively, it can 
        // be used to obtain guaranteed correct quotes for non-strategy markets.
        //
        // # Arguments
        // * `in_token` - in token address
        // * `out_token` - out token address
        // * `amount` - amount of tokens to swap in
        // * `route` - list of market ids defining the route to swap through
        // * `ignore_strategy` - whether to ignore strategy positions when fetching quote
        //
        // # Returns
        // * `amount_out` - amount of tokens swapped out net of fees
        fn unsafe_quote_multiple(
            self: @ContractState,
            in_token: ContractAddress,
            out_token: ContractAddress,
            amount: u256,
            route: Span<felt252>,
            ignore_strategy: bool,
        ) -> u256 {
            assert(route.len() > 1, 'NotMultiSwap');

            // Initialise swap values.
            let mut i = 0;
            let mut in_token_iter = in_token;
            let mut amount_out = amount;

            loop {
                if i == route.len() {
                    break;
                }

                // Fetch market for current swap iteration.
                let market_id = *route.at(i);
                let market_info = self.market_info.read(market_id);

                // Check that route is valid.
                let is_buy_iter = in_token_iter == market_info.quote_token;
                if !is_buy_iter {
                    assert(in_token_iter == market_info.base_token, 'RouteMismatch');
                }

                // Execute swap and update values.
                let amount_out_iter = self
                    .unsafe_quote(market_id, is_buy_iter, amount_out, true, ignore_strategy,);
                amount_out = amount_out_iter;
                in_token_iter =
                    if is_buy_iter {
                        market_info.base_token
                    } else {
                        market_info.quote_token
                    };

                i += 1;
            };

            // Check that final token is out token.
            assert(in_token_iter == out_token, 'RouteMismatch');

            // Return amount out.
            amount_out
        }

        // Initiates a flash loan.
        //
        // # Arguments
        // * `token` - contract address of the token borrowed
        // * `amount` - borrow amount requested
        fn flash_loan(ref self: ContractState, token: ContractAddress, amount: u256,) {
            // Check amount non-zero.
            assert(amount > 0, 'LoanAmtZero');

            // Calculate flash loan fee.
            let fee_rate = self.flash_loan_fee_rate.read(token);
            let fees = fee_math::calc_fee(amount, fee_rate);

            // Snapshot balance before. Check sufficient tokens to finance loan.
            let token_contract = ERC20ABIDispatcher { contract_address: token };
            let contract = get_contract_address();
            let balance = token_contract.balanceOf(contract);
            assert(amount <= balance, 'LoanInsufficient');

            // Transfer tokens to caller.
            let token_contract = ERC20ABIDispatcher { contract_address: token };
            let borrower = get_caller_address();
            token_contract.transfer(borrower, amount);

            // Ping callback function to execute actions.
            // Borrower must be smart contract that implements `ILoanReceiver` interface.
            ILoanReceiverDispatcher { contract_address: borrower }
                .on_flash_loan(token, amount, fees);

            // Return balance with fees.
            token_contract.transferFrom(borrower, contract, amount + fees);

            // We do not update reserves so that fees can be collected via `sweep`.

            // Emit event.
            self.emit(Event::FlashLoan(FlashLoan { borrower, token, amount }));
        }

        // Mint ERC721 to represent an open liquidity position.
        // Callable by owner only.
        //
        // # Arguments
        // * `market_id` - market id
        // * `lower_limit` - lower limit at which position starts
        // * `upper_limit` - higher limit at which position ends
        //
        // # Returns
        // * `position_id` - id of minted position
        fn mint(
            ref self: ContractState, market_id: felt252, lower_limit: u32, upper_limit: u32
        ) -> felt252 {
            // Fetch position.
            let caller = get_caller_address();
            let position_id = id::position_id(market_id, caller.into(), lower_limit, upper_limit);
            let position = self.positions.read(position_id);

            // Check position exists.
            assert(position.liquidity > 0, 'PositionNull');

            // Mint ERC721 token.
            self.erc721._mint(caller, position_id.into());

            // Return position id
            position_id
        }

        // Burn ERC721 to unlock capital from open liquidity positions.
        //
        // # Arguments
        // * `position_id` - id of position to burn
        fn burn(ref self: ContractState, position_id: felt252) {
            // Verify caller.
            let caller = get_caller_address();
            assert(
                self.erc721._is_approved_or_owner(caller, position_id.into()), 'NotApprovedOrOwner'
            );

            // Check position is empty.
            let position = self.positions.read(position_id);
            assert(position.liquidity == 0, 'NotCleared');

            // Burn ERC721 token.
            self.erc721._burn(position_id.into());
        }

        // Whitelist markets.
        // Callable by owner only.
        //
        // # Arguments
        // * `market_ids` - array of market ids
        fn whitelist_markets(ref self: ContractState, market_ids: Array<felt252>) {
            // Validate caller and inputs.
            self.assert_only_owner();

            // Whitelist markets.
            let mut i = 0;
            loop {
                if i == market_ids.len() {
                    break;
                }
                // Check not already whitelisted.
                let market_id = *market_ids.at(i);
                let whitelisted = self.whitelisted_markets.read(market_id);
                assert(!whitelisted, 'AlreadyWhitelisted');

                // Update whitelist.
                self.whitelisted_markets.write(market_id, true);

                // Emit event.
                self.emit(Event::Whitelist(Whitelist { market_id }));
                i += 1;
            }
        }

        // Sweeps excess tokens from contract.
        // Used to collect donations and tokens sent to contract by mistake.
        //
        // # Arguments
        // * `receiver` - recipient of swept tokens
        // * `token` - token to sweep
        // * `amount` - requested amount of token to sweep
        //
        // # Returns
        // * `amount_collected` - amount of base token swept
        fn sweep(
            ref self: ContractState,
            receiver: ContractAddress,
            token: ContractAddress,
            amount: u256,
        ) -> u256 {
            // Validate caller and inputs.
            self.assert_only_owner();
            assert(receiver != contract_address_const::<0x0>(), 'ReceiverNull');
            assert(token != contract_address_const::<0x0>(), 'MarketNull');
            assert(amount != 0, 'AmountZero');

            // Initialise variables.
            let contract = get_contract_address();
            let token_contract = ERC20ABIDispatcher { contract_address: token };

            // Calculate amounts.
            let reserves = self.reserves.read(token);
            let balance = token_contract.balanceOf(contract);
            let donations = self.donations.read(token);
            let dust = balance - reserves;

            let amount_collected = min(amount, donations + dust);

            // Update donations and reserves.
            let donations_withdrawn = min(amount_collected, donations);
            self.donations.write(token, donations - donations_withdrawn);
            let new_reserves = reserves - min(reserves, donations_withdrawn);
            self.reserves.write(token, new_reserves);

            if amount_collected > 0 {
                // Transfer tokens to receiver.
                token_contract.transfer(receiver, amount_collected);
                // Emit event.
                self.emit(Event::Sweep(Sweep { receiver, token, amount: amount_collected }));
            }

            // Return amount collected.
            amount_collected
        }

        // Request transfer ownership of the contract.
        // Part 1 of 2 step process to transfer ownership.
        //
        // # Arguments
        // * `new_owner` - New owner of the contract
        fn transfer_owner(ref self: ContractState, new_owner: ContractAddress) {
            self.assert_only_owner();
            let old_owner = self.owner.read();
            assert(new_owner != old_owner, 'SameOwner');
            self.queued_owner.write(new_owner);
        }

        // Called by new owner to accept ownership of the contract.
        // Part 2 of 2 step process to transfer ownership.
        fn accept_owner(ref self: ContractState) {
            let queued_owner = self.queued_owner.read();
            assert(get_caller_address() == queued_owner, 'OnlyNewOwner');
            let old_owner = self.owner.read();
            self.owner.write(queued_owner);
            self.queued_owner.write(contract_address_const::<0x0>());
            self.emit(Event::ChangeOwner(ChangeOwner { old: old_owner, new: queued_owner }));
        }

        // Set flash loan fee rate.
        // Callable by owner only.
        //
        // # Arguments
        // * `token` - contract address of the token borrowed
        // * `fee` - flash loan fee denominated in bps
        fn set_flash_loan_fee_rate(ref self: ContractState, token: ContractAddress, fee: u16,) {
            self.assert_only_owner();
            assert(fee <= MAX_FEE_RATE, 'FeeOF');
            let old_fee = self.flash_loan_fee_rate.read(token);
            assert(old_fee != fee, 'SameFee');
            self.flash_loan_fee_rate.write(token, fee);
            self.emit(Event::ChangeFlashLoanFee(ChangeFlashLoanFee { token, fee }));
        }

        // Set market configs.
        // Callable by market owner only. Enforces checks that each config is upgradeable.
        // 
        // # Arguments
        // * `market_id` - market id'
        // * `new_configs` - new market configs
        fn set_market_configs(
            ref self: ContractState, market_id: felt252, new_configs: MarketConfigs
        ) {
            // Fetch market info and configs.
            let market_info = self.market_info.read(market_id);
            let configs = self.market_configs.read(market_id);

            // Check inputs.
            if market_info.controller != contract_address_const::<0x0>() {
                assert(get_caller_address() == market_info.controller, 'OnlyController');
            } else {
                assert(false, 'MarketUnowned');
            }
            self.enforce_fixed(configs.limits, new_configs.limits, 'LimitsFixed');
            self.enforce_fixed(configs.add_liquidity, new_configs.add_liquidity, 'AddLiqFixed');
            self
                .enforce_fixed(
                    configs.remove_liquidity, new_configs.remove_liquidity, 'RemLiqFixed'
                );
            self.enforce_fixed(configs.create_bid, new_configs.create_bid, 'CreateBidFixed');
            self.enforce_fixed(configs.create_ask, new_configs.create_ask, 'CreateAskFixed');
            self
                .enforce_fixed(
                    configs.collect_order, new_configs.collect_order, 'CollectOrderFixed'
                );
            assert(configs != new_configs, 'NoChange');

            // Update configs.
            self.market_configs.write(market_id, new_configs);

            // Emit event.
            self
                .emit(
                    Event::SetMarketConfigs(
                        SetMarketConfigs {
                            market_id,
                            min_lower: new_configs.limits.value.min_lower,
                            max_lower: new_configs.limits.value.max_lower,
                            min_upper: new_configs.limits.value.min_upper,
                            max_upper: new_configs.limits.value.max_upper,
                            min_width: new_configs.limits.value.min_width,
                            max_width: new_configs.limits.value.max_width,
                            add_liquidity: new_configs.add_liquidity.value,
                            remove_liquidity: new_configs.remove_liquidity.value,
                            create_bid: new_configs.create_bid.value,
                            create_ask: new_configs.create_ask.value,
                            collect_order: new_configs.collect_order.value,
                            swap: new_configs.swap.value,
                        }
                    )
                );
        }

        // Upgrade contract class.
        // Callable by owner only.
        //
        // # Arguments
        // * `new_class_hash` - new class hash of contract
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.assert_only_owner();
            replace_class_syscall(new_class_hash).unwrap();
            self.emit(Event::Upgraded(Upgraded { class_hash: new_class_hash }));
        }
    }

    #[abi(per_item)]
    #[generate_trait]
    pub(crate) impl MarketManagerInternalImpl of MarketManagerInternalTrait {
        // Internal function to modify liquidity from a position.
        // Called by `modify_position`, `create_order`, `collect_order` and `fill_limits`.
        //
        // # Arguments
        // * `market_id` - market ID
        // * `owner` - owner of position (or batch id if limit order)
        // * `lower_limit` - lower limit at which position starts
        // * `upper_limit` - higher limit at which position ends
        // * `liquidity_delta` - amount of liquidity to add or remove
        // * `is_limit_order` - whether `modify_position` is being called as part of a limit order
        //
        // # Returns
        // * `base_amount` - amount of base tokens transferred in (+ve) or out (-ve), including fees
        // * `quote_amount` - amount of quote tokens transferred in (+ve) or out (-ve), including fees
        // * `base_fees` - amount of base tokens collected in fees
        // * `quote_fees` - amount of quote tokens collected in fees
        fn _modify_position(
            ref self: ContractState,
            owner: felt252,
            market_id: felt252,
            lower_limit: u32,
            upper_limit: u32,
            liquidity_delta: i128,
            is_limit_order: bool,
        ) -> (i256, i256, u256, u256) {
            // Fetch market info and caller.
            let market_info = self.market_info.read(market_id);
            let valid_limits = self.market_configs.read(market_id).limits.value;
            let caller = get_caller_address();

            // Check inputs.
            assert(market_info.width != 0, 'MarketNull');
            price_lib::check_limits(
                lower_limit, upper_limit, market_info.width, valid_limits, liquidity_delta.sign
            );

            // Update liquidity (without transferring tokens).
            let (base_amount, quote_amount, base_fees, quote_fees) =
                liquidity_lib::update_liquidity(
                ref self, owner, @market_info, market_id, lower_limit, upper_limit, liquidity_delta
            );

            // Update reserves and transfer tokens.
            // That is, unless modifying liquidity as part of a limit order, where instead tokens are 
            // transferred only when the order is collected.
            if !is_limit_order || !liquidity_delta.sign {
                // Update reserves.
                if base_amount.val != 0 {
                    let mut base_reserves = self.reserves.read(market_info.base_token);
                    if base_amount.sign {
                        assert(base_reserves >= base_amount.val, 'ModifyPosBaseReserves');
                    }
                    liquidity_math::add_delta_u256(ref base_reserves, base_amount);
                    self.reserves.write(market_info.base_token, base_reserves);
                }
                if quote_amount.val != 0 {
                    let mut quote_reserves = self.reserves.read(market_info.quote_token);
                    if quote_amount.sign {
                        assert(quote_reserves >= quote_amount.val, 'ModifyPosQuoteReserves');
                    }
                    liquidity_math::add_delta_u256(ref quote_reserves, quote_amount);
                    self.reserves.write(market_info.quote_token, quote_reserves);
                }

                // Transfer tokens from payer to contract.
                let contract = get_contract_address();
                if base_amount.val > 0 {
                    let base_token = ERC20ABIDispatcher {
                        contract_address: market_info.base_token
                    };
                    if base_amount.sign {
                        assert(
                            base_token.balanceOf(contract) >= base_amount.val,
                            'ModifyPosBaseTransfer'
                        );
                        base_token.transfer(caller, base_amount.val);
                    } else {
                        assert(
                            base_token.balanceOf(caller) >= base_amount.val,
                            'ModifyPosBaseTransferFrom'
                        );
                        base_token.transferFrom(caller, contract, base_amount.val);
                    }
                }
                if quote_amount.val > 0 {
                    let quote_token = ERC20ABIDispatcher {
                        contract_address: market_info.quote_token
                    };
                    if quote_amount.sign {
                        assert(
                            quote_token.balanceOf(contract) >= quote_amount.val,
                            'ModifyPosQuoteTransfer'
                        );
                        quote_token.transfer(caller, quote_amount.val);
                    } else {
                        assert(
                            quote_token.balanceOf(caller) >= quote_amount.val,
                            'ModifyPosQuoteTransferFrom'
                        );
                        quote_token.transferFrom(caller, contract, quote_amount.val);
                    }
                }
            }

            // Emit event if position was modified or fees collected.
            if base_amount.val != 0 || quote_amount.val != 0 || base_fees != 0 || quote_fees != 0 {
                self
                    .emit(
                        Event::ModifyPosition(
                            ModifyPosition {
                                caller: owner.try_into().unwrap(),
                                market_id,
                                lower_limit,
                                upper_limit,
                                liquidity_delta,
                                base_amount,
                                quote_amount,
                                base_fees,
                                quote_fees,
                                is_limit_order,
                            }
                        )
                    );
            }

            // Return amounts.
            (base_amount, quote_amount, base_fees, quote_fees)
        }

        // Internal function to swap tokens.
        // Called by `swap`, `swap_multiple` and `quote`.
        //
        // # Arguments
        // * `market_id` - market ID
        // * `is_buy` - whether swap is a buy or sell
        // * `amount` - amount of tokens to swap in
        // * `exact_input` - true if `amount` is exact input, otherwise exact output
        // * `threshold_sqrt_price` - maximum sqrt price to swap at for buys, minimum for sells
        // * `threshold_amount` - minimum amount out for exact input, or max amount in for exact output
        // * `swap_id` - unique swap id
        // * `deadline` - deadline for swap to be executed by
        // * `quote_mode` - if true, does not try to transfer token balances
        //
        // # Returns
        // * `amount_in` - amount of tokens swapped in gross of fees
        // * `amount_out` - amount of tokens swapped out net of fees
        // * `fees` - fees paid in token swapped in
        fn _swap(
            ref self: ContractState,
            market_id: felt252,
            is_buy: bool,
            amount: u256,
            exact_input: bool,
            threshold_sqrt_price: Option<u256>,
            threshold_amount: Option<u256>,
            swap_id: u128,
            deadline: Option<u64>,
            quote_mode: bool,
        ) -> (u256, u256, u256) {
            // Fetch market info and state.
            let market_info = self.market_info.read(market_id);
            let mut market_state = self.market_state.read(market_id);

            // Run checks.
            if market_info.controller != contract_address_const::<0x0>() {
                let market_configs = self.market_configs.read(market_id);
                self.enforce_status(market_configs.swap.value, @market_info, 'SwapDisabled');
            }
            assert(market_info.width != 0, 'MarketNull');
            assert(amount > 0, 'AmtZero');
            if threshold_sqrt_price.is_some() {
                price_lib::check_threshold(
                    threshold_sqrt_price.unwrap(), market_state.curr_sqrt_price, is_buy
                );
            }
            if deadline.is_some() {
                assert(deadline.unwrap() >= get_block_timestamp(), 'Expired');
            }

            // Execute strategy if it exists.
            // Strategy positions are updated before the swap occurs.
            let caller = get_caller_address();
            if market_info.strategy != contract_address_const::<0x0>() {
                IStrategyDispatcher { contract_address: market_info.strategy }
                    .update_positions(market_id, SwapParams { is_buy, amount, exact_input });
            }

            // Get swap fee. 
            // This is either a fixed swap fee or a variable one set by the external fee controller.
            let fee_rate = if market_info.fee_controller == contract_address_const::<0x0>() {
                market_info.swap_fee_rate
            } else {
                let rate = IFeeControllerDispatcher { contract_address: market_info.fee_controller }
                    .swap_fee_rate();
                assert(rate <= MAX_FEE_RATE, 'FeeRateOF');
                rate
            };

            // Initialise trackers for swap state.
            let mut amount_rem = amount;
            let mut amount_calc = 0;
            let mut swap_fees = 0;
            let mut filled_limits: Array<(u32, felt252)> = array![];

            // Execute swap.
            // Market state must be fetched here after strategy execution.
            // If the final limit is partially filled, details of this are returned to correctly
            // update the limit order batch.
            market_state = self.market_state.read(market_id);
            swap_lib::swap_iter(
                ref self,
                market_id,
                ref market_state,
                ref amount_rem,
                ref amount_calc,
                ref swap_fees,
                ref filled_limits,
                threshold_sqrt_price,
                fee_rate,
                market_info.width,
                is_buy,
                exact_input,
            );

            // Calculate swap amounts.
            assert(amount >= amount_rem, 'SwapAmtSubAmtRem');
            let (amount_in, amount_out) = if exact_input {
                (amount - amount_rem, amount_calc)
            } else {
                (amount_calc, amount - amount_rem)
            };

            // Check swap amount against amount threshold.
            if threshold_amount.is_some() {
                let threshold_amount_val = threshold_amount.unwrap();
                if exact_input && (amount_out < threshold_amount_val) {
                    panic(array!['ThresholdAmount', amount_out.low.into(), amount_out.high.into()]);
                }
                if !exact_input && (amount_in > threshold_amount_val) {
                    panic(array!['ThresholdAmount', amount_in.low.into(), amount_in.high.into()]);
                }
            }

            // Return amounts if quote mode.
            if quote_mode {
                return (amount_in, amount_out, swap_fees);
            }

            // Commit update to market state.
            self.market_state.write(market_id, market_state);

            // Identify in and out tokens.
            let (in_token, out_token) = if is_buy {
                (market_info.quote_token, market_info.base_token)
            } else {
                (market_info.base_token, market_info.quote_token)
            };

            // Update reserves.
            let in_reserves = self.reserves.read(in_token);
            let out_reserves = self.reserves.read(out_token);
            self.reserves.write(in_token, in_reserves + amount_in);
            assert(out_reserves >= amount_out, 'SwapOutReservesSubAmtOut');
            self.reserves.write(out_token, out_reserves - amount_out);

            // Handle fully filled limit orders. Must be done after state updates above.
            if filled_limits.len() != 0 {
                order_lib::fill_limits(
                    ref self, market_id, market_info.width, filled_limits.span(),
                );
            }

            // Transfer tokens between payer, receiver and contract.
            let contract = get_contract_address();
            ERC20ABIDispatcher { contract_address: in_token }
                .transferFrom(caller, contract, amount_in);
            ERC20ABIDispatcher { contract_address: out_token }.transfer(caller, amount_out);

            // Emit event.
            self
                .emit(
                    Event::Swap(
                        Swap {
                            caller,
                            market_id,
                            is_buy,
                            exact_input,
                            amount_in,
                            amount_out,
                            fees: swap_fees,
                            end_limit: market_state.curr_limit,
                            end_sqrt_price: market_state.curr_sqrt_price,
                            market_liquidity: market_state.liquidity,
                            swap_id,
                        }
                    )
                );

            // Return amounts.
            (amount_in, amount_out, swap_fees)
        }

        // Internal function to swap tokens across multiple markets in a multi-hop route.
        // Called by `swap_multiple` and `quote_multiple`.
        // 
        // # Arguments
        // * `in_token` - in token address
        // * `out_token` - out token address
        // * `amount` - amount of tokens to swap in
        // * `route` - list of market ids defining the route to swap through
        // * `threshold_amount` - minimum amount out for exact input, or max amount in for exact output
        // * `deadline` - deadline for swap to be executed by
        // * `quote_mode` - if true, does not try to transfer token balances
        //
        // # Returns
        // * `amount_out` - amount of tokens swapped out net of fees
        fn _swap_multiple(
            ref self: ContractState,
            in_token: ContractAddress,
            out_token: ContractAddress,
            amount: u256,
            route: Span<felt252>,
            deadline: Option<u64>,
            quote_mode: bool,
        ) -> u256 {
            assert(route.len() > 1, 'NotMultiSwap');

            // Fetch swap id.
            let swap_id = self.swap_id.read();

            // Initialise swap values.
            let mut i = 0;
            let mut in_token_iter = in_token;
            let mut amount_out = amount;

            loop {
                if i == route.len() {
                    break;
                }

                // Fetch market for current swap iteration.
                let market_id = *route.at(i);
                let market_info = self.market_info.read(market_id);

                // Check that route is valid.
                let is_buy_iter = in_token_iter == market_info.quote_token;
                if !is_buy_iter {
                    assert(in_token_iter == market_info.base_token, 'RouteMismatch');
                }

                // Execute swap and update values.
                let (_, amount_out_iter, _) = self
                    ._swap(
                        market_id,
                        is_buy_iter,
                        amount_out,
                        true,
                        Option::None(()),
                        Option::None(()),
                        swap_id,
                        deadline,
                        quote_mode
                    );
                amount_out = amount_out_iter;
                in_token_iter =
                    if is_buy_iter {
                        market_info.base_token
                    } else {
                        market_info.quote_token
                    };

                i += 1;
            };

            // Check that final token is out token.
            assert(in_token_iter == out_token, 'RouteMismatch');

            // Return amount out.
            amount_out
        }
    }
}
