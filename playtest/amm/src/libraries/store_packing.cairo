// Core lib imports.
use starknet::storage_access::StorePacking;

// Haiko imports.
use haiko_lib::constants::MAX_FEE_FACTOR;
use haiko_lib::types::core::{
    MarketInfo, MarketState, MarketConfigs, Config, ConfigOption, ValidLimits, LimitInfo, Position,
    OrderBatch, LimitOrder, PackedMarketInfo, PackedMarketState, PackedLimitInfo, PackedPosition,
    PackedOrderBatch, PackedLimitOrder, PackedMarketConfigs
};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::types::i256::I256Trait;

////////////////////////////////
// CONSTANTS
////////////////////////////////

const TWO_POW_4: felt252 = 0x10;
const TWO_POW_5: felt252 = 0x20;
const TWO_POW_6: felt252 = 0x40;
const TWO_POW_16: felt252 = 0x10000;
const TWO_POW_32: felt252 = 0x100000000;
const TWO_POW_38: felt252 = 0x4000000000;
const TWO_POW_64: felt252 = 0x10000000000000000;
const TWO_POW_96: felt252 = 0x1000000000000000000000000;
const TWO_POW_124: felt252 = 0x10000000000000000000000000000000;
const TWO_POW_128: felt252 = 0x100000000000000000000000000000000;
const TWO_POW_160: felt252 = 0x10000000000000000000000000000000000000000;
const TWO_POW_161: felt252 = 0x20000000000000000000000000000000000000000;
const TWO_POW_192: felt252 = 0x1000000000000000000000000000000000000000000000000;
const TWO_POW_196: felt252 = 0x10000000000000000000000000000000000000000000000000;
const TWO_POW_200: felt252 = 0x100000000000000000000000000000000000000000000000000;
const TWO_POW_204: felt252 = 0x1000000000000000000000000000000000000000000000000000;
const TWO_POW_208: felt252 = 0x10000000000000000000000000000000000000000000000000000;
const TWO_POW_212: felt252 = 0x100000000000000000000000000000000000000000000000000000;
const TWO_POW_216: felt252 = 0x1000000000000000000000000000000000000000000000000000000;
const TWO_POW_217: felt252 = 0x2000000000000000000000000000000000000000000000000000000;
const TWO_POW_218: felt252 = 0x4000000000000000000000000000000000000000000000000000000;
const TWO_POW_219: felt252 = 0x8000000000000000000000000000000000000000000000000000000;
const TWO_POW_220: felt252 = 0x10000000000000000000000000000000000000000000000000000000;
const TWO_POW_221: felt252 = 0x20000000000000000000000000000000000000000000000000000000;
const TWO_POW_222: felt252 = 0x40000000000000000000000000000000000000000000000000000000;
const TWO_POW_251: felt252 = 0x800000000000000000000000000000000000000000000000000000000000000;

const MASK_1: u256 = 0x1;
const MASK_2: u256 = 0x3;
const MASK_4: u256 = 0xf;
const MASK_16: u256 = 0xffff;
const MASK_32: u256 = 0xffffffff;
const MASK_128: u256 = 0xffffffffffffffffffffffffffffffff;
const MASK_251: felt252 = 0x7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

////////////////////////////////
// IMPLS
////////////////////////////////

pub(crate) impl MarketInfoStorePacking of StorePacking<MarketInfo, PackedMarketInfo> {
    fn pack(value: MarketInfo) -> PackedMarketInfo {
        let slab0 = value.width.into() + value.swap_fee_rate.into() * TWO_POW_32;

        PackedMarketInfo {
            base_token: value.base_token.into(),
            quote_token: value.quote_token.into(),
            strategy: value.strategy.into(),
            fee_controller: value.fee_controller.into(),
            controller: value.controller.into(),
            slab0,
        }
    }

    fn unpack(value: PackedMarketInfo) -> MarketInfo {
        let slab0: u256 = value.slab0.into();
        let width: u32 = (slab0 & MASK_32).try_into().unwrap();
        let swap_fee_rate: u16 = ((slab0 / TWO_POW_32.into()) & MASK_16).try_into().unwrap();

        MarketInfo {
            base_token: value.base_token.try_into().unwrap(),
            quote_token: value.quote_token.try_into().unwrap(),
            width,
            strategy: value.strategy.try_into().unwrap(),
            swap_fee_rate,
            fee_controller: value.fee_controller.try_into().unwrap(),
            controller: value.controller.try_into().unwrap(),
        }
    }
}

pub(crate) impl MarketStateStorePacking of StorePacking<MarketState, PackedMarketState> {
    fn pack(value: MarketState) -> PackedMarketState {
        let curr_sqrt_price: felt252 = value.curr_sqrt_price.try_into().expect('CurrSqrtPriceOF');
        let base_fee_factor: felt252 = value.base_fee_factor.try_into().expect('BaseFeeFactorOF');
        let quote_fee_factor: felt252 = value
            .quote_fee_factor
            .try_into()
            .expect('QuoteFeeFactorOF');

        let mut slab0: u256 = value.curr_limit.into();
        slab0 += value.liquidity.into() * TWO_POW_32.into();

        PackedMarketState {
            curr_sqrt_price, base_fee_factor, quote_fee_factor, slab0: slab0.try_into().unwrap(),
        }
    }

    fn unpack(value: PackedMarketState) -> MarketState {
        let curr_sqrt_price: u256 = value.curr_sqrt_price.into();
        let base_fee_factor: u256 = value.base_fee_factor.into();
        let quote_fee_factor: u256 = value.quote_fee_factor.into();
        let curr_limit: u32 = (value.slab0.into() & MASK_32.into()).try_into().unwrap();
        let liquidity: u256 = value.slab0.into() / TWO_POW_32.into();

        MarketState {
            liquidity: liquidity.try_into().unwrap(),
            curr_sqrt_price,
            base_fee_factor,
            quote_fee_factor,
            curr_limit,
        }
    }
}

pub(crate) impl MarketConfigsStorePacking of StorePacking<MarketConfigs, PackedMarketConfigs> {
    fn pack(value: MarketConfigs) -> PackedMarketConfigs {
        let mut slab: u256 = value.limits.value.min_lower.into();
        slab += value.limits.value.max_lower.into() * TWO_POW_32.into();
        slab += value.limits.value.min_upper.into() * TWO_POW_64.into();
        slab += value.limits.value.max_upper.into() * TWO_POW_96.into();
        slab += value.limits.value.min_width.into() * TWO_POW_128.into();
        slab += value.limits.value.max_width.into() * TWO_POW_160.into();
        slab += status_to_u256(value.add_liquidity.value) * TWO_POW_192.into();
        slab += status_to_u256(value.remove_liquidity.value) * TWO_POW_196.into();
        slab += status_to_u256(value.create_bid.value) * TWO_POW_200.into();
        slab += status_to_u256(value.create_ask.value) * TWO_POW_204.into();
        slab += status_to_u256(value.collect_order.value) * TWO_POW_208.into();
        slab += status_to_u256(value.swap.value) * TWO_POW_212.into();
        slab += bool_to_u256(value.limits.fixed) * TWO_POW_216.into();
        slab += bool_to_u256(value.add_liquidity.fixed) * TWO_POW_217.into();
        slab += bool_to_u256(value.remove_liquidity.fixed) * TWO_POW_218.into();
        slab += bool_to_u256(value.create_bid.fixed) * TWO_POW_219.into();
        slab += bool_to_u256(value.create_ask.fixed) * TWO_POW_220.into();
        slab += bool_to_u256(value.collect_order.fixed) * TWO_POW_221.into();
        slab += bool_to_u256(value.swap.fixed) * TWO_POW_222.into();

        PackedMarketConfigs { slab: slab.try_into().unwrap() }
    }

    fn unpack(value: PackedMarketConfigs) -> MarketConfigs {
        let slab: u256 = value.slab.into();
        let min_lower: u32 = (slab & MASK_32).try_into().unwrap();
        let max_lower: u32 = ((slab / TWO_POW_32.into()) & MASK_32).try_into().unwrap();
        let min_upper: u32 = ((slab / TWO_POW_64.into()) & MASK_32).try_into().unwrap();
        let max_upper: u32 = ((slab / TWO_POW_96.into()) & MASK_32).try_into().unwrap();
        let min_width: u32 = ((slab / TWO_POW_128.into()) & MASK_32).try_into().unwrap();
        let max_width: u32 = ((slab / TWO_POW_160.into()) & MASK_32).try_into().unwrap();
        let add_liquidity: ConfigOption = u256_to_status((slab / TWO_POW_192.into()) & MASK_2);
        let remove_liquidity: ConfigOption = u256_to_status((slab / TWO_POW_196.into()) & MASK_2);
        let create_bid: ConfigOption = u256_to_status((slab / TWO_POW_200.into()) & MASK_2);
        let create_ask: ConfigOption = u256_to_status((slab / TWO_POW_204.into()) & MASK_2);
        let collect_order: ConfigOption = u256_to_status((slab / TWO_POW_208.into()) & MASK_2);
        let swap: ConfigOption = u256_to_status((slab / TWO_POW_212.into()) & MASK_2);
        let limits_fixed: bool = u256_to_bool((slab / TWO_POW_216.into()) & MASK_1);
        let add_liquidity_fixed: bool = u256_to_bool((slab / TWO_POW_217.into()) & MASK_1);
        let remove_liquidity_fixed: bool = u256_to_bool((slab / TWO_POW_218.into()) & MASK_1);
        let create_bid_fixed: bool = u256_to_bool((slab / TWO_POW_219.into()) & MASK_1);
        let create_ask_fixed: bool = u256_to_bool((slab / TWO_POW_220.into()) & MASK_1);
        let collect_order_fixed: bool = u256_to_bool((slab / TWO_POW_221.into()) & MASK_1);
        let swap_fixed: bool = u256_to_bool((slab / TWO_POW_222.into()) & MASK_1);
        let limits = ValidLimits {
            min_lower, max_lower, min_upper, max_upper, min_width, max_width
        };

        MarketConfigs {
            limits: Config { value: limits, fixed: limits_fixed },
            add_liquidity: Config { value: add_liquidity, fixed: add_liquidity_fixed },
            remove_liquidity: Config { value: remove_liquidity, fixed: remove_liquidity_fixed },
            create_bid: Config { value: create_bid, fixed: create_bid_fixed },
            create_ask: Config { value: create_ask, fixed: create_ask_fixed },
            collect_order: Config { value: collect_order, fixed: collect_order_fixed },
            swap: Config { value: swap, fixed: swap_fixed },
        }
    }
}

pub(crate) impl LimitInfoStorePacking of StorePacking<LimitInfo, PackedLimitInfo> {
    fn pack(value: LimitInfo) -> PackedLimitInfo {
        let base_fee_factor: felt252 = value.base_fee_factor.try_into().unwrap();
        let quote_fee_factor: felt252 = value.quote_fee_factor.try_into().unwrap();
        let mut slab0: u256 = value.liquidity.into();
        slab0 += (value.liquidity_delta.val.into() % TWO_POW_124.into()) * TWO_POW_128.into();

        let mut slab1: u256 = value.liquidity_delta.val.into() / TWO_POW_124.into();
        slab1 += bool_to_u256(value.liquidity_delta.sign) * TWO_POW_4.into();
        slab1 += value.nonce.into() * TWO_POW_5.into();

        PackedLimitInfo {
            base_fee_factor,
            quote_fee_factor,
            slab0: slab0.try_into().unwrap(),
            slab1: slab1.try_into().unwrap(),
        }
    }

    fn unpack(value: PackedLimitInfo) -> LimitInfo {
        let base_fee_factor: u256 = value.base_fee_factor.into();
        let quote_fee_factor: u256 = value.quote_fee_factor.into();
        let liquidity: u128 = (value.slab0.into() & MASK_128).try_into().unwrap();
        let abs_liquidity_delta: u256 = (value.slab0.into() / TWO_POW_128.into())
            + (value.slab1.into() & MASK_4) * TWO_POW_124.into();
        let sign: bool = ((value.slab1.into() / TWO_POW_4.into()) & MASK_1) == 1;
        let nonce: u128 = ((value.slab1.into() / TWO_POW_5.into()) & MASK_128).try_into().unwrap();

        LimitInfo {
            liquidity,
            liquidity_delta: I128Trait::new(abs_liquidity_delta.try_into().unwrap(), sign),
            base_fee_factor,
            quote_fee_factor,
            nonce,
        }
    }
}

pub(crate) impl OrderBatchStorePacking of StorePacking<OrderBatch, PackedOrderBatch> {
    fn pack(value: OrderBatch) -> PackedOrderBatch {
        let mut slab0: u256 = value.base_amount.into();
        slab0 += (value.quote_amount.into() % TWO_POW_124.into()) * TWO_POW_128.into();

        let mut slab1: u256 = value.quote_amount.into() / TWO_POW_124.into();
        slab1 += bool_to_u256(value.filled) * TWO_POW_4.into();
        slab1 += bool_to_u256(value.is_bid) * TWO_POW_5.into();
        slab1 += value.limit.into() * TWO_POW_6.into();
        slab1 += value.liquidity.into() * TWO_POW_38.into();

        PackedOrderBatch { slab0: slab0.try_into().unwrap(), slab1: slab1.try_into().unwrap(), }
    }

    fn unpack(value: PackedOrderBatch) -> OrderBatch {
        let base_amount: u128 = (value.slab0.into() & MASK_128).try_into().unwrap();
        let quote_amount: u128 = (value.slab0.into() / TWO_POW_128.into()
            + (value.slab1.into() & MASK_4.into()) * TWO_POW_124.into())
            .try_into()
            .unwrap();
        let filled: bool = ((value.slab1.into() / TWO_POW_4.into()) & MASK_1) == 1;
        let is_bid: bool = ((value.slab1.into() / TWO_POW_5.into()) & MASK_1) == 1;
        let limit: u32 = ((value.slab1.into() / TWO_POW_6.into()) & MASK_32).try_into().unwrap();
        let liquidity: u128 = ((value.slab1.into() / TWO_POW_38.into()) & MASK_128)
            .try_into()
            .unwrap();

        OrderBatch { liquidity, filled, limit, is_bid, base_amount, quote_amount, }
    }
}

pub(crate) impl PositionStorePacking of StorePacking<Position, PackedPosition> {
    fn pack(value: Position) -> PackedPosition {
        assert(value.base_fee_factor_last.val <= MAX_FEE_FACTOR, 'BaseFeeFactorLastOF');
        let mut base_fee_factor_last: u256 = value.base_fee_factor_last.val;
        base_fee_factor_last += bool_to_u256(value.base_fee_factor_last.sign) * TWO_POW_251.into();

        assert(value.quote_fee_factor_last.val <= MAX_FEE_FACTOR, 'QuoteFeeFactorLastOF');
        let mut quote_fee_factor_last: u256 = value.quote_fee_factor_last.val;
        quote_fee_factor_last += bool_to_u256(value.quote_fee_factor_last.sign)
            * TWO_POW_251.into();

        let mut slab0: u256 = value.liquidity.into() * TWO_POW_64.into();

        PackedPosition {
            market_id: 0,
            base_fee_factor_last: base_fee_factor_last.try_into().unwrap(),
            quote_fee_factor_last: quote_fee_factor_last.try_into().unwrap(),
            slab0: slab0.try_into().unwrap()
        }
    }

    fn unpack(value: PackedPosition) -> Position {
        let base_fee_factor_val: u256 = value.base_fee_factor_last.into() & MASK_251.into();
        let base_fee_factor_sign: bool = ((value.base_fee_factor_last.into() / TWO_POW_251.into())
            & MASK_1) == 1;
        let quote_fee_factor_val: u256 = value.quote_fee_factor_last.into() & MASK_251.into();
        let quote_fee_factor_sign: bool = ((value.quote_fee_factor_last.into() / TWO_POW_251.into())
            & MASK_1) == 1;
        let base_fee_factor_last = I256Trait::new(base_fee_factor_val, base_fee_factor_sign);
        let quote_fee_factor_last = I256Trait::new(quote_fee_factor_val, quote_fee_factor_sign);
        let liquidity: u128 = ((value.slab0.into() / TWO_POW_64.into()) & MASK_128)
            .try_into()
            .unwrap();

        Position { liquidity, base_fee_factor_last, quote_fee_factor_last }
    }
}

pub(crate) impl LimitOrderStorePacking of StorePacking<LimitOrder, PackedLimitOrder> {
    fn pack(value: LimitOrder) -> PackedLimitOrder {
        PackedLimitOrder { batch_id: value.batch_id, liquidity: value.liquidity.into(), }
    }

    fn unpack(value: PackedLimitOrder) -> LimitOrder {
        LimitOrder { batch_id: value.batch_id, liquidity: value.liquidity.try_into().unwrap(), }
    }
}

////////////////////////////////
// INTERNAL HELPERS
////////////////////////////////

fn bool_to_u256(value: bool) -> u256 {
    if value {
        1
    } else {
        0
    }
}

fn u256_to_bool(value: u256) -> bool {
    value == 1
}

fn status_to_u256(value: ConfigOption) -> u256 {
    match value {
        ConfigOption::Enabled => 0,
        ConfigOption::Disabled => 1,
        ConfigOption::OnlyOwner => 2,
        ConfigOption::OnlyStrategy => 3,
    }
}

fn u256_to_status(value: u256) -> ConfigOption {
    if value == 0 {
        ConfigOption::Enabled
    } else if value == 1 {
        ConfigOption::Disabled
    } else if value == 2 {
        ConfigOption::OnlyOwner
    } else {
        ConfigOption::OnlyStrategy
    }
}
