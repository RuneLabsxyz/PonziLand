// Core lib imports.
use starknet::syscalls::deploy_syscall;
use starknet::contract_address::contract_address_const;

// Local imports.
use haiko_amm::contracts::mocks::store_packing_contract::StorePackingContract;
use haiko_amm::contracts::mocks::store_packing_contract::{
    IStorePackingContractDispatcher, IStorePackingContractDispatcherTrait,
};

// Haiko imports.
use haiko_lib::types::core::{
    MarketInfo, MarketState, LimitInfo, OrderBatch, Position, LimitOrder, MarketConfigs, Config,
    ValidLimits, ConfigOption
};
use haiko_lib::types::i128::I128Trait;
use haiko_lib::types::i256::I256Trait;

// External imports.
use snforge_std::{declare, ContractClass, ContractClassTrait};

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> IStorePackingContractDispatcher {
    // Deploy store packing contract.
    let class = declare("StorePackingContract");
    let contract_address = class.deploy(@array![]).unwrap();
    IStorePackingContractDispatcher { contract_address }
}

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
fn test_store_packing_market_info() {
    let store_packing_contract = before();

    let market_info = MarketInfo {
        quote_token: contract_address_const::<0x1f23f23f236aded>(),
        base_token: contract_address_const::<0x2d0f111efcce45f>(),
        width: 15025,
        strategy: contract_address_const::<0xccccccccccccccc>(),
        swap_fee_rate: 2000,
        fee_controller: contract_address_const::<0xfffffffffffff>(),
        controller: contract_address_const::<0x123>(),
    };

    store_packing_contract.set_market_info(1, market_info);
    let unpacked = store_packing_contract.get_market_info(1);

    assert(unpacked.quote_token == market_info.quote_token, 'Market info: quote token');
    assert(unpacked.base_token == market_info.base_token, 'Market info: quote token');
    assert(unpacked.width == market_info.width, 'Market info: width');
    assert(unpacked.strategy == market_info.strategy, 'Market info: strategy');
    assert(unpacked.swap_fee_rate == market_info.swap_fee_rate, 'Market info: swap fee rate');
    assert(unpacked.fee_controller == market_info.fee_controller, 'Market info: fee controller');
    assert(unpacked.controller == market_info.controller, 'Market info: controller');
}

#[test]
fn test_store_packing_market_state() {
    let store_packing_contract = before();

    let market_state = MarketState {
        liquidity: 9681239759960500123812389587123,
        curr_sqrt_price: 111111000000000000,
        quote_fee_factor: 7123981237891236712313,
        base_fee_factor: 3650171973094710571238267576572937,
        curr_limit: 11093740
    };

    store_packing_contract.set_market_state(1, market_state);
    let unpacked = store_packing_contract.get_market_state(1);

    assert(unpacked.liquidity == market_state.liquidity, 'Market state: liquidity');
    assert(
        unpacked.curr_sqrt_price == market_state.curr_sqrt_price, 'Market state: curr sqrt price'
    );
    assert(
        unpacked.base_fee_factor == market_state.base_fee_factor, 'Market state: base fee factor'
    );
    assert(
        unpacked.quote_fee_factor == market_state.quote_fee_factor, 'Market state: quote fee factor'
    );
    assert(unpacked.curr_limit == market_state.curr_limit, 'Market state: curr limit');
}

#[test]
fn test_store_packing_market_configs() {
    let store_packing_contract = before();

    let market_configs = MarketConfigs {
        limits: Config { value: Default::default(), fixed: false },
        add_liquidity: Config { value: ConfigOption::OnlyOwner, fixed: true },
        remove_liquidity: Config { value: ConfigOption::Disabled, fixed: false },
        create_bid: Config { value: ConfigOption::Enabled, fixed: false },
        create_ask: Config { value: ConfigOption::OnlyOwner, fixed: true },
        collect_order: Config { value: ConfigOption::Enabled, fixed: true },
        swap: Config { value: ConfigOption::OnlyStrategy, fixed: true },
    };

    store_packing_contract.set_market_configs(1, market_configs);
    let unpacked = store_packing_contract.get_market_configs(1);

    assert(unpacked.limits == market_configs.limits, 'Market configs: limits');
    assert(unpacked.add_liquidity == market_configs.add_liquidity, 'Market configs: add liq');
    assert(unpacked.remove_liquidity == market_configs.remove_liquidity, 'Market configs: rem liq');
    assert(unpacked.create_bid == market_configs.create_bid, 'Market configs: create bid');
    assert(unpacked.create_ask == market_configs.create_ask, 'Market configs: create ask');
    assert(unpacked.collect_order == market_configs.collect_order, 'Market configs: collect order');
    assert(unpacked.swap == market_configs.swap, 'Market configs: swap');
}

#[test]
fn test_store_packing_limit_info() {
    let store_packing_contract = before();

    let limit_info = LimitInfo {
        liquidity: 9681239759960500123812389587123,
        liquidity_delta: I128Trait::new(888887777777777666, true),
        quote_fee_factor: 7123981237891236712313,
        base_fee_factor: 3650171973094710571238267576572937,
        nonce: 500,
    };

    store_packing_contract.set_limit_info(1, limit_info);
    let unpacked = store_packing_contract.get_limit_info(1);

    assert(unpacked.liquidity == limit_info.liquidity, 'Limit info: liquidity');
    assert(unpacked.liquidity_delta == limit_info.liquidity_delta, 'Limit info: liquidity delta');
    assert(
        unpacked.quote_fee_factor == limit_info.quote_fee_factor, 'Limit info: quote fee factor'
    );
    assert(unpacked.base_fee_factor == limit_info.base_fee_factor, 'Limit info: base fee factor');
    assert(unpacked.nonce == limit_info.nonce, 'Limit info: nonce');
}

#[test]
fn test_store_packing_order_batch() {
    let store_packing_contract = before();

    let order_batch = OrderBatch {
        liquidity: 28123192319023231239,
        filled: false,
        limit: 8837293,
        is_bid: true,
        quote_amount: 15000000000000000000000000000000,
        base_amount: 750000000000000000000000000000,
    };

    store_packing_contract.set_order_batch(1, order_batch);
    let unpacked = store_packing_contract.get_order_batch(1);

    assert(unpacked.liquidity == order_batch.liquidity, 'Order batch: liquidity');
    assert(unpacked.filled == order_batch.filled, 'Order batch: filled');
    assert(unpacked.limit == order_batch.limit, 'Order batch: limit');
    assert(unpacked.is_bid == order_batch.is_bid, 'Order batch: is bid');
    assert(unpacked.quote_amount == order_batch.quote_amount, 'Order batch: quote amount');
    assert(unpacked.base_amount == order_batch.base_amount, 'Order batch: base amount');
}

#[test]
fn test_store_packing_position() {
    let store_packing_contract = before();

    let position = Position {
        liquidity: 28123192319023231239,
        quote_fee_factor_last: I256Trait::new(31892319283213127389127312831273123123, false),
        base_fee_factor_last: I256Trait::new(9938560381238123811392129756646474789, true),
    };

    store_packing_contract.set_position(1, position);
    let unpacked = store_packing_contract.get_position(1);

    assert(unpacked.liquidity == position.liquidity, 'Position: liquidity');
    assert(
        unpacked.quote_fee_factor_last == position.quote_fee_factor_last,
        'Position: quote fee factor last'
    );
    assert(
        unpacked.base_fee_factor_last == position.base_fee_factor_last,
        'Position: base fee factor last'
    );
}

#[test]
fn test_store_packing_limit_order() {
    let store_packing_contract = before();

    let limit_order = LimitOrder { batch_id: 123, liquidity: 10000500000000000000000000, };

    store_packing_contract.set_limit_order(1, limit_order);
    let unpacked = store_packing_contract.get_limit_order(1);

    assert(unpacked.batch_id == limit_order.batch_id, 'Limit order: batch id');
    assert(unpacked.liquidity == limit_order.liquidity, 'Limit order: liquidity');
}
