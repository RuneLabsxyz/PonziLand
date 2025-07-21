// Core lib imports.
use starknet::ContractAddress;
use core::cmp::{min, max};
use starknet::syscalls::call_contract_syscall;

// Haiko imports.
use haiko_lib::math::{math, price_math, liquidity_math};
use haiko_lib::constants::{OFFSET, MAX_LIMIT, MAX_SCALED, ONE};
use haiko_lib::interfaces::IMarketManager::{
    IMarketManager, IMarketManagerDispatcher, IMarketManagerDispatcherTrait
};
use haiko_lib::types::core::MarketState;
use haiko_lib::types::i128::{i128, I128Trait};
use haiko_lib::helpers::actions::{
    market_manager::{deploy_market_manager, create_market, modify_position, swap},
    token::{deploy_token, fund, approve}, quoter::deploy_quoter
};
use haiko_lib::helpers::params::{
    owner, alice, treasury, default_token_params, default_market_params, modify_position_params,
    swap_params
};
use haiko_lib::helpers::utils::{
    to_e18, to_e28, to_e28_u128, encode_sqrt_price, approx_eq, approx_eq_pct
};

// External imports.\
use snforge_std::declare;
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// TYPES
////////////////////////////////

#[derive(Drop, Clone)]
struct MarketStateCase {
    description: ByteArray,
    width: u32,
    swap_fee_rate: u16,
    start_limit: u32,
    liquidity: u128, // used to calculate ratio of liquidity to amount
    positions: Span<Position>,
    skip_cases: Span<felt252>,
    exp: Span<(u256, u256, u256)>,
}

#[derive(Drop, Copy)]
struct Position {
    lower_limit: u32,
    upper_limit: u32,
    liquidity: i128,
}

#[derive(Drop, Copy)]
struct SwapCase {
    is_buy: bool,
    exact_input: bool,
    amount: u256,
    threshold_sqrt_price: Option<u256>,
}

////////////////////////////////
// SETUP
////////////////////////////////

fn before() -> (IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher) {
    // Deploy market manager.
    let market_manager_class = declare("MarketManager");
    let market_manager = deploy_market_manager(market_manager_class, owner());

    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(5000000000000000000000000000000000000000000);
    let initial_quote_amount = to_e28(100000000000000000000000000000000000000000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);
    approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
    approve(quote_token, alice(), market_manager.contract_address, initial_quote_amount);

    (market_manager, base_token, quote_token)
}

fn before_with_market() -> (
    IMarketManagerDispatcher, ERC20ABIDispatcher, ERC20ABIDispatcher, felt252
) {
    let (market_manager, base_token, quote_token) = before();

    // Create the market.
    let mut params = default_market_params();
    params.base_token = base_token.contract_address;
    params.quote_token = quote_token.contract_address;
    params.start_limit = price_math::offset(10) - 0;
    params.width = 10;
    let market_id = create_market(market_manager, params);

    (market_manager, base_token, quote_token, market_id)
}

fn deploy_tokens() -> (ERC20ABIDispatcher, ERC20ABIDispatcher) {
    // Deploy tokens.
    let (_treasury, base_token_params, quote_token_params) = default_token_params();
    let erc20_class = declare("ERC20");
    let base_token = deploy_token(erc20_class, base_token_params);
    let quote_token = deploy_token(erc20_class, quote_token_params);

    // Fund LP with initial token balances and approve market manager as spender.
    let initial_base_amount = to_e28(5000000000000000000000000000000000000000000);
    let initial_quote_amount = to_e28(100000000000000000000000000000000000000000000);
    fund(base_token, alice(), initial_base_amount);
    fund(quote_token, alice(), initial_quote_amount);

    (base_token, quote_token)
}

fn market_state_test_cases_set1() -> Array<MarketStateCase> {
    let mut markets = ArrayTrait::<MarketStateCase>::new();

    //  0.05% swap fee, 1 width, 1:1 price, 2e28 liquidity over entire range
    markets
        .append(
            MarketStateCase {
                description: "1) .05% 1 1:1 2e28(max range)",
                width: 1,
                swap_fee_rate: 5,
                start_limit: OFFSET + 0,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: 0,
                        upper_limit: OFFSET + MAX_LIMIT,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![15, 16].span(),
                exp: array![
                    (1000000000000000000, 999499999950049987, 500000000000000),
                    (1000000000000000000, 999499999950049987, 500000000000000),
                    (1000500250175087543, 1000000000000000000, 500250125087543),
                    (1000500250175087543, 999999999999999999, 500250125087543),
                    (1000000000000000000, 999499999950049987, 500000000000000),
                    (1000000000000000000, 999499999950049987, 500000000000000),
                    (1000500250175087543, 1000000000000000000, 500250125087543),
                    (1000500250175087543, 1000000000000000000, 500250125087543),
                    (100000, 99949, 50),
                    (100000, 99949, 50),
                    (100050, 100000, 50),
                    (100050, 100000, 50),
                    (
                        11628590897132359499749874937,
                        7350889359326482672008851644,
                        5814295448566179749874937
                    ),
                    (
                        11628590897132359499727734756,
                        7350889359326482672000000000,
                        5814295448566179749863867
                    ),
                    (0, 0, 0), // skipped
                    (0, 0, 0), // skipped
                ]
                    .span(),
            }
        );

    // 0.25% swap fee, 10 width, 1:1 price, 2e28 liquidity over entire range
    markets
        .append(
            MarketStateCase {
                description: "2) .25% 10 1:1 2e28(max range)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) + 0,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![15, 16].span(),
                exp: array![
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1002506265714285714, 1000000000000000000, 2506265664285714),
                    (1002506265714285714, 999999999999999999, 2506265664285714),
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1002506265714285714, 1000000000000000000, 2506265664285714),
                    (1002506265714285714, 999999999999999999, 2506265664285714),
                    (100000, 99749, 250),
                    (100000, 99749, 250),
                    (100250, 100000, 250),
                    (100250, 100000, 250),
                    (
                        11651906367602800320779820439,
                        7350889359326482672000000000,
                        29129765919007000801949551
                    ),
                    (
                        11651906367602800320779820439,
                        7350889359326482672000000000,
                        29129765919007000801949551
                    ),
                    (0, 0, 0), // skipped
                    (0, 0, 0), // skipped
                ]
                    .span()
            }
        );

    // 1% swap fee, 100 width, 1:1 price, 2e28 liquidity over entire range
    markets
        .append(
            MarketStateCase {
                description: "3) 1% 100 1:1 2e28(max range)",
                width: 100,
                swap_fee_rate: 100,
                start_limit: price_math::offset(100) + 0,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(100) - 7906600,
                        upper_limit: price_math::offset(100) + 7906600,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![15, 16].span(),
                exp: array![
                    (1000000000000000000, 989999999950995000, 10000000000000000),
                    (1000000000000000000, 989999999950995000, 10000000000000000),
                    (1010101010151515151, 1000000000000000000, 10101010101515151),
                    (1010101010151515151, 999999999999999999, 10101010101515151),
                    (1000000000000000000, 989999999950995000, 10000000000000000),
                    (1000000000000000000, 989999999950995000, 10000000000000000),
                    (1010101010151515151, 1000000000000000000, 10101010101515151),
                    (1010101010151515151, 999999999999999999, 10101010101515151),
                    (100000, 98999, 1000),
                    (100000, 98999, 1000),
                    (101010, 100000, 1010),
                    (101010, 100000, 1010),
                    (
                        11740178385539185171694819079,
                        7350889359326482672000000000,
                        117401783855391851716948190
                    ),
                    (
                        11740178385539185171694819079,
                        7350889359326482672000000000,
                        117401783855391851716948190
                    ),
                    (0, 0, 0), // skipped
                    (0, 0, 0), // skipped
                ]
                    .span()
            }
        );

    // 0.25% swap fee, 10 width, 10:1 price, 2e28 liquidity over entire range
    markets
        .append(
            MarketStateCase {
                description: "4) .25% 10 10:1 2e28(max range)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) + 230260,
                liquidity: to_e28_u128(20),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(20), false)
                    }
                ]
                    .span(),
                skip_cases: array![6, 8, 13, 15, 16].span(),
                exp: array![
                    (1000000000000000000, 9975033855875133011, 2500000000000000),
                    (1000000000000000000, 99749661440667195, 2500000000000000),
                    (100250286308233979, 1000000000000000000, 250625715770584),
                    (10025096682749658623, 999999999999999999, 25062741706874146),
                    (999999999999999999, 9975033855875133011, 2499999999999999),
                    (0, 0, 0), // 6 - skipped
                    (100250286308233979, 1000000000000000000, 250625715770584),
                    (0, 0, 0), // 8 - skipped
                    (100000, 997503, 250),
                    (100000, 9974, 250),
                    (10025, 100000, 25),
                    (1002509, 100000, 2506),
                    (0, 0, 0), // 13 - skipped
                    (
                        253616361046314273729383440146,
                        505965498931043547874305559909,
                        634040902615785684323458600
                    ),
                    (0, 0, 0), // skipped
                    (
                        253616361046314273729383440146,
                        505965498931043547874305559909,
                        634040902615785684323458600
                    ),
                ]
                    .span()
            }
        );

    // 0.25% swap fee, 10 width, 1:10 price, 2e28 liquidity over entire range
    markets
        .append(
            MarketStateCase {
                description: "5) .25% 10 1:10 2e28(max range)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) - 230260,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![5, 7, 14, 15, 16].span(),
                exp: array![
                    (999999999999999999, 99749661439251283, 2499999999999999),
                    (1000000000000000000, 9975033854459207087, 2500000000000000),
                    (10025096684176257312, 1000000000000000000, 25062741710440643),
                    (100250286309660564, 1000000000000000000, 250625715774151),
                    (0, 0, 0), // 5 - skipped
                    (1000000000000000000, 9975033854459207087, 2500000000000000),
                    (0, 0, 0), // 7 - skipped
                    (100250286309660564, 1000000000000000000, 250625715774151),
                    (99999, 9974, 249),
                    (100000, 997503, 250),
                    (1002509, 100000, 2506),
                    (10025, 100000, 25),
                    (
                        25361636104631427372960528587,
                        50596549893104354787439407635,
                        63404090261578568432401321
                    ),
                    (0, 0, 0), // 14 - skipped
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    markets
}

fn market_state_test_cases_set2() -> Array<MarketStateCase> {
    let mut markets = ArrayTrait::<MarketStateCase>::new();

    // 0.25% swap fee, 10 width, 1:1 price, 4e28 liquidity around (excluding) curr price
    markets
        .append(
            MarketStateCase {
                description: "6) .25% 10 1:1 4e28 curr P",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) - 0,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) - 10,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    },
                    Position {
                        lower_limit: price_math::offset(10) + 10,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![15, 16].span(),
                exp: array![
                    (999999999999999999, 997400255436287706, 2499999999999999),
                    (1000000000000000000, 997400255436287706, 2500000000000000),
                    (1002606520852258147, 1000000000000000000, 2506516302130645),
                    (1002606520852258147, 999999999999999999, 2506516302130645),
                    (999999999999999999, 997400255436287706, 2499999999999999),
                    (1000000000000000000, 997400255436287706, 2500000000000000),
                    (1002606520852258147, 1000000000000000000, 2506516302130645),
                    (1002606520852258147, 999999999999999999, 2506516302130645),
                    (99999, 99740, 249),
                    (100000, 99740, 250),
                    (100260, 100000, 250),
                    (100260, 100000, 250),
                    (
                        11650903841286810344862153383,
                        7349889389325782686008599648,
                        29127259603217025862155383
                    ),
                    (
                        11650903841286810344839968810,
                        7349889389325782685999748004,
                        29127259603217025862099922
                    ),
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    // 0.25% swap fee, 10 width, 1:1 price, liquidity around curr price and entire range
    markets
        .append(
            MarketStateCase {
                description: "7) .25% 10 1:1 6e28 (curr P)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) - 0,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    },
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) - 10,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    },
                    Position {
                        lower_limit: price_math::offset(10) + 10,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![15, 16].span(),
                exp: array![
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1002506265714285714, 1000000000000000000, 2506265664285714),
                    (1002506265714285714, 999999999999999999, 2506265664285714),
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1000000000000000000, 997499999950249687, 2500000000000000),
                    (1002506265714285714, 1000000000000000000, 2506265664285714),
                    (1002506265714285714, 999999999999999999, 2506265664285714),
                    (100000, 99749, 250),
                    (100000, 99749, 250),
                    (100250, 100000, 250),
                    (100250, 100000, 250),
                    (
                        23302810208889610665664158395,
                        14700778748652265358017451293,
                        58257025522224026664160395
                    ),
                    (
                        23302810208889610665619789250,
                        14700778748652265357999748004,
                        58257025522224026664049473
                    ),
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    // 0.05% swap fee, 1 width, 1:1 price, 2e28 liquidity around current price (stable)
    markets
        .append(
            MarketStateCase {
                description: "8) .05% 1 1:1 2e28 (stable)",
                width: 1,
                swap_fee_rate: 5,
                start_limit: price_math::offset(1) - 0,
                liquidity: to_e28_u128(100),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(1) - 10,
                        upper_limit: price_math::offset(1) + 10,
                        liquidity: I128Trait::new(to_e28_u128(100), false)
                    }
                ]
                    .span(),
                skip_cases: array![15, 16].span(),
                exp: array![
                    (1000000000000000001, 999499999999000999, 500000000000001),
                    (1000000000000000000, 999499999999000999, 500000000000000),
                    (1000500250126063032, 1000000000000000000, 500250125062533),
                    (1000500250126063032, 999999999999999999, 500250125062533),
                    (1000000000000000000, 999499999999000999, 500000000000000),
                    (1000000000000000000, 999499999999000999, 500000000000000),
                    (1000500250126063032, 1000000000000000000, 500250125063032),
                    (1000500250126063032, 999999999999999999, 500250125063032),
                    (100001, 99949, 51),
                    (100000, 99949, 50),
                    (100051, 100000, 50),
                    (100051, 100000, 50),
                    (
                        50026013016508304152176089,
                        49998500034999300012599790,
                        25013006508254152076089
                    ),
                    (
                        50026013016508304152176089,
                        49998500034999300012599790,
                        25013006508254152076089
                    ),
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    // 0.25% swap fee, 10 width, 1:1 price, 2e28 quote liquidity only
    markets
        .append(
            MarketStateCase {
                description: "9) .25% 10 1:1 2e28 (quote liq)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) - 0,
                liquidity: to_e28_u128(20),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 20000,
                        upper_limit: price_math::offset(10) - 0,
                        liquidity: I128Trait::new(to_e28_u128(20), false)
                    }
                ]
                    .span(),
                skip_cases: array![2, 4, 6, 8, 10, 12, 13, 15, 16].span(),
                exp: array![
                    (1000000000000000000, 997499999995024968, 2500000000000000),
                    (0, 0, 0), // 2 - skipped
                    (1002506265669172932, 1000000000000000000, 2506265664172932),
                    (0, 0, 0), // 4 - skipped
                    (1000000000000000000, 997499999995024968, 2500000000000000),
                    (0, 0, 0), // 6 - skipped
                    (1002506265669172932, 1000000000000000000, 2506265664172932),
                    (0, 0, 0), // 8 - skipped
                    (100000, 99949, 250),
                    (0, 0, 0), // 10 - skipped
                    (100250, 100000, 250),
                    (0, 0, 0), // 12 - skipped
                    (0, 0, 0), // 13 - skipped
                    (
                        21086790073987089106546287552,
                        19032425909646881554787506359,
                        52716975184967722766365718
                    ),
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    // 0.25% swap fee, 10 width, 1:1 price, 2e28 base liquidity only
    markets
        .append(
            MarketStateCase {
                description: "10) .25% 10 1:1 2e28 (base liq)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) - 0,
                liquidity: to_e28_u128(20),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 0,
                        upper_limit: price_math::offset(10) + 20000,
                        liquidity: I128Trait::new(to_e28_u128(20), false)
                    }
                ]
                    .span(),
                skip_cases: array![1, 3, 5, 7, 9, 11, 14, 15, 16].span(),
                exp: array![
                    (0, 0, 0), // 1 - skipped
                    (1000000000000000000, 997499999995024968, 2500000000000000),
                    (0, 0, 0), // 3 - skipped
                    (1002506265669172932, 1000000000000000000, 2506265664172932),
                    (0, 0, 0), // 5 - skipped
                    (1000000000000000000, 997499999995024968, 2500000000000000),
                    (0, 0, 0), // 7 - skipped
                    (1002506265669172932, 1000000000000000000, 2506265664172932),
                    (0, 0, 0), // 9 - skipped
                    (100000, 99949, 250),
                    (0, 0, 0), // 11 - skipped
                    (100250, 100000, 250),
                    (
                        21086790073987089106546287552,
                        19032425909646881554787506359,
                        52716975184967722766365718
                    ),
                    (0, 0, 0), // 14 - skipped
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    markets
}

fn market_state_test_cases_set3() -> Array<MarketStateCase> {
    let mut markets = ArrayTrait::<MarketStateCase>::new();

    // 0.25% swap fee, 10 width, near max price, 2e28 liquidity over entire range
    markets
        .append(
            MarketStateCase {
                description: "11) .25% 10 2e28 (near max P)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) + 7906500,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![4, 6, 8, 13, 15].span(),
                exp: array![
                    (
                        1000000000000000000,
                        2949108149691712599060461905658989437293111180,
                        2500000000000000
                    ),
                    (1000000000000000000, 0, 2500000000000000),
                    (1, 1000000000000000000, 0),
                    (
                        0, 0, 0
                    ), // 4 - skipped (runs out of liquidity, which is valid but model doesnt handle)
                    (
                        1000000000000000000,
                        2949108149691712599060461905658989437293111180,
                        2500000000000000
                    ),
                    (0, 0, 0), // 6 - skipped
                    (1, 1000000000000000000, 0),
                    (0, 0, 0), // 8 - skipped
                    (100001, 2168872940104215547356291842882542686826, 251),
                    (100000, 0, 250),
                    (1, 100000, 0),
                    (
                        2179761317308093225783475672365225264549,
                        100000,
                        5449403293270233064458689180913063162
                    ),
                    (0, 0, 0), // 13 - skipped
                    (
                        31702031680886008204855803272,
                        2949108550694164326111003358682796642998343735,
                        79255079202215020512139509
                    ),
                    (0, 0, 0), // 15 - skipped
                    (
                        31702031680886008204855803272,
                        2949108550694164326111003358682796642998343735,
                        79255079202215020512139509
                    ),
                ]
                    .span()
            }
        );

    // 0.25% swap fee, 10 width, near min price, 2e28 liquidity over entire range
    markets
        .append(
            MarketStateCase {
                description: "12) .25% 10 2e28 (near min P)",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) - 7906500,
                liquidity: to_e28_u128(2),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(to_e28_u128(2), false)
                    }
                ]
                    .span(),
                skip_cases: array![3, 5, 7, 14, 15, 16].span(),
                exp: array![
                    (1000000000000000001, 0, 2500000000000001),
                    (
                        1000000000000000000,
                        2949108149691712599060461905658989437293111180,
                        2500000000000000
                    ),
                    (
                        0, 0, 0
                    ), // 3 - skipped (runs out of liquidity, which is valid but model doesnt handle)
                    (1, 999999999999999999, 0),
                    (
                        0, 0, 0
                    ), // 5 - skipped (runs out of liquidity, which is valid but model doesnt handle)
                    (
                        1000000000000000000,
                        2949108149691712599060461905658989437293111180,
                        2500000000000000
                    ),
                    (
                        0, 0, 0
                    ), // 7 - skipped (runs out of liquidity, which is valid but model doesnt handle)
                    (1, 999999999999999999, 0),
                    (100001, 0, 251),
                    (100001, 2168872940104215547356291842882542686826, 250),
                    (
                        2179761317308093225783475672365225264549,
                        100000,
                        5449403293270233064458689180913063162
                    ),
                    (1, 100000, 0),
                    (
                        31702031680886008204877987845,
                        2949108550694164326111003358682796643007195380,
                        79255079202215020512194970
                    ),
                    (0, 0, 0), // 14 - skipped
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    // 0.25% swap fee, 10 width, 1:1 price, max full range liquidity
    markets
        .append(
            MarketStateCase {
                description: "13) .25% 10 1:1 max full",
                width: 10,
                swap_fee_rate: 25,
                start_limit: price_math::offset(10) - 0,
                liquidity: liquidity_math::max_liquidity_per_limit(10),
                positions: array![
                    Position {
                        lower_limit: price_math::offset(10) - 7906620,
                        upper_limit: price_math::offset(10) + 7906620,
                        liquidity: I128Trait::new(
                            liquidity_math::max_liquidity_per_limit(10), false
                        )
                    }
                ]
                    .span(),
                skip_cases: array![15, 16].span(),
                exp: array![
                    (1000000000000000001, 997499999999999999, 2500000000000001),
                    (1000000000000000000, 997499999999999999, 2500000000000001),
                    (1002506265664160402, 1000000000000000000, 2506265664160402),
                    (1002506265664160402, 999999999999999999, 2506265664160402),
                    (1000000000000000001, 997499999999999999, 2500000000000001),
                    (1000000000000000000, 997499999999999999, 2500000000000000),
                    (1002506265664160402, 1000000000000000000, 2506265664160402),
                    (1002506265664160402, 999999999999999999, 2506265664160402),
                    (100001, 99749, 251),
                    (100000, 99749, 250),
                    (100251, 100000, 251),
                    (100251, 100000, 251),
                    (
                        125367516815287783416687142135285,
                        79091156098285756439692673096276,
                        313418792038219458541717855338
                    ),
                    (
                        125367516815287783416687142135285,
                        79091156098285756439692673096276,
                        313418792038219458541717855338
                    ),
                    (0, 0, 0), // 15 - skipped
                    (0, 0, 0), // 16 - skipped
                ]
                    .span()
            }
        );

    markets
}

fn swap_test_cases() -> Array<SwapCase> {
    let mut cases = ArrayTrait::<SwapCase>::new();

    // Large amounts with no price limit.
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: true,
                amount: to_e18(1),
                threshold_sqrt_price: Option::None(()),
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: true,
                amount: to_e18(1),
                threshold_sqrt_price: Option::None(()),
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: false,
                amount: to_e18(1),
                threshold_sqrt_price: Option::None(())
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: false,
                amount: to_e18(1),
                threshold_sqrt_price: Option::None(())
            }
        );

    // Large amounts with price limit.
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: true,
                amount: to_e18(1),
                threshold_sqrt_price: Option::Some(encode_sqrt_price(50, 100))
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: true,
                amount: to_e18(1),
                threshold_sqrt_price: Option::Some(encode_sqrt_price(200, 100))
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: false,
                amount: to_e18(1),
                threshold_sqrt_price: Option::Some(encode_sqrt_price(50, 100))
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: false,
                amount: to_e18(1),
                threshold_sqrt_price: Option::Some(encode_sqrt_price(200, 100))
            }
        );

    // Small amounts with no price limit.
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: true,
                amount: 100000,
                threshold_sqrt_price: Option::None(())
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: true,
                amount: 100000,
                threshold_sqrt_price: Option::None(())
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: false,
                amount: 100000,
                threshold_sqrt_price: Option::None(())
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: false,
                amount: 100000,
                threshold_sqrt_price: Option::None(())
            }
        );

    // Max possible within price limit.
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: true,
                amount: MAX_SCALED,
                threshold_sqrt_price: Option::Some(encode_sqrt_price(5, 2))
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: true,
                amount: MAX_SCALED,
                threshold_sqrt_price: Option::Some(encode_sqrt_price(2, 5))
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: true,
                exact_input: false,
                amount: MAX_SCALED,
                threshold_sqrt_price: Option::Some(encode_sqrt_price(5, 2))
            }
        );
    cases
        .append(
            SwapCase {
                is_buy: false,
                exact_input: false,
                amount: MAX_SCALED,
                threshold_sqrt_price: Option::Some(encode_sqrt_price(2, 5))
            }
        );

    cases
}

////////////////////////////////
// TESTS
////////////////////////////////

fn _test_swap_cases(set: u32) {
    // Deploy tokens.
    let (base_token, quote_token) = deploy_tokens();
    let market_manager_class = declare("MarketManager");

    // Fetch test cases.
    let market_cases = if set == 1 {
        market_state_test_cases_set1()
    } else if set == 2 {
        market_state_test_cases_set2()
    } else {
        market_state_test_cases_set3()
    };

    // Iterate through pool test cases.
    let mut index = 0;
    loop {
        if index >= market_cases.len() {
            break ();
        }

        // Fetch test cases.
        let market_case: MarketStateCase = market_cases[index].clone();
        let swap_cases = swap_test_cases();

        println!("*** MARKET: {}", (set - 1) * 5 + index + 1);

        // Iterate through swap test cases.
        let mut swap_index = 0;
        loop {
            if swap_index >= swap_cases.len() {
                break ();
            }

            // Fetch swap test case.
            let swap_case: SwapCase = *swap_cases[swap_index];

            if !_contains(market_case.skip_cases, swap_index.into() + 1) {
                // Deploy market manager with salt and approve token spend.
                // let salt: u32 = index * 1000 + swap_index;
                let market_manager = deploy_market_manager(market_manager_class, owner());
                let initial_base_amount = to_e28(5000000000000000000000000000000000000000000);
                let initial_quote_amount = to_e28(100000000000000000000000000000000000000000000);
                approve(base_token, alice(), market_manager.contract_address, initial_base_amount);
                approve(
                    quote_token, alice(), market_manager.contract_address, initial_quote_amount
                );

                // Create the market.
                let mut params = default_market_params();
                params.base_token = base_token.contract_address;
                params.quote_token = quote_token.contract_address;
                params.start_limit = market_case.start_limit;
                params.width = market_case.width;
                params.swap_fee_rate = market_case.swap_fee_rate;

                println!("{}", market_case.description);
                let market_id = create_market(market_manager, params);

                // Mint positions.
                let mut pos_index = 0;
                loop {
                    if pos_index >= market_case.positions.len() {
                        break ();
                    }

                    let position: Position = *market_case.positions[pos_index];
                    let mut params = modify_position_params(
                        alice(),
                        market_id,
                        position.lower_limit,
                        position.upper_limit,
                        position.liquidity
                    );
                    modify_position(market_manager, params);

                    pos_index += 1;
                };

                // // Snapshot state before.
                // let (
                //     market_state_before,
                //     base_balance_before,
                //     quote_balance_before,
                //     liquidity_before,
                //     limit_before,
                //     sqrt_price_before
                // ) =
                //     _snapshot_state(
                //     market_manager, market_id, base_token, quote_token
                // );
                let start_sqrt_price = market_manager.curr_sqrt_price(market_id);
                println!("*** SWAP: {}", swap_index + 1);

                let unsafe_quote = market_manager
                    .unsafe_quote(
                        market_id, swap_case.is_buy, swap_case.amount, swap_case.exact_input, false
                    );

                // Extract quote from error message.
                let res = call_contract_syscall(
                    address: market_manager.contract_address,
                    entry_point_selector: selector!("quote"),
                    calldata: array![
                        market_id,
                        swap_case.is_buy.into(),
                        swap_case.amount.low.into(),
                        swap_case.amount.high.into(),
                        swap_case.exact_input.into()
                    ]
                        .span(),
                );
                let quote = match res {
                    Result::Ok(_) => {
                        assert(false, 'QuoteResultOk');
                        0
                    },
                    Result::Err(error) => {
                        let quote_msg = *error.at(0);
                        assert(quote_msg == 'quote', 'QuoteInvalid');
                        let low: u128 = (*error.at(1)).try_into().expect('QuoteLowOF');
                        let high: u128 = (*error.at(2)).try_into().expect('QuoteHighOF');
                        u256 { low, high }
                    },
                };

                // Check quotes match.
                if unsafe_quote != quote {
                    println!("*** QUOTE MISMATCH: {}", swap_index + 1);
                    println!("unsafe_quote: {}, quote: {}", unsafe_quote, quote);
                    panic!();
                }

                let mut params = swap_params(
                    alice(),
                    market_id,
                    swap_case.is_buy,
                    swap_case.exact_input,
                    swap_case.amount,
                    swap_case.threshold_sqrt_price,
                    // Quotes don't check for threshold prices, so disable threshold amount if we are supply a threshold price.
                    if swap_case.threshold_sqrt_price == Option::None(()) {
                        Option::Some(quote)
                    } else {
                        Option::None(())
                    },
                    Option::None(()),
                );
                let (amount_in, amount_out, fees) = swap(market_manager, params);

                let (amount_in_exp, amount_out_exp, fees_exp) = *market_case.exp.at(swap_index);

                println!("Amount In: {}", amount_in);
                println!("Amount Out: {}", amount_out);
                println!("Fees: {}", fees);

                // When swapping very small amounts relative to available liquidity, there can
                // be large percentage differences in swap amounts due to rounding errors in
                // sqrt prices. 
                //
                // To account for this, if the ratio of liquidity to amount is above THRESHOLD, 
                // we run a different check:
                //  - amount out is always lte expected for exact input
                //  - amount in is always gte expected for exact output
                // The opposing amount is checked for absolute equality within MAX_DEVIATION.
                //
                // If the liquidity / amount ratio is below THRESHOLD, we check for percentage 
                // equality up to a precision of 10 ** PRECISION_PLACES.

                let THRESHOLD = math::pow(10, 22);
                let MAX_DEVIATION = 20;
                let PRECISION_PLACES = 8;

                println!("amount_in: {}, amount_in_exp: {}", amount_in, amount_in_exp);
                if !(if amount_in == 0 || market_case.liquidity.into() / amount_in >= THRESHOLD {
                    if !swap_case.exact_input {
                        amount_in >= amount_in_exp
                    } else {
                        approx_eq(amount_in, amount_in_exp, MAX_DEVIATION)
                    }
                } else {
                    approx_eq_pct(amount_in, amount_in_exp, PRECISION_PLACES)
                }) {
                    println!(
                        "*** AMOUNT IN MISMATCH ({}): {} (amt), {} (exp)",
                        swap_index + 1,
                        amount_in,
                        amount_in_exp
                    );
                    panic!();
                }
                if !(if amount_out == 0 || market_case.liquidity.into() / amount_out >= THRESHOLD {
                    if swap_case.exact_input {
                        amount_out <= amount_out_exp
                    } else {
                        approx_eq(amount_out, amount_out_exp, MAX_DEVIATION)
                    }
                } else {
                    approx_eq_pct(amount_out, amount_out_exp, PRECISION_PLACES)
                }) {
                    println!("*** AMOUNT OUT MISMATCH: {}", swap_index + 1);
                    panic!();
                }
                if !(if amount_in == 0 || market_case.liquidity.into() / amount_in >= THRESHOLD {
                    if swap_case.exact_input {
                        approx_eq(fees, fees_exp, MAX_DEVIATION)
                    } else {
                        fees >= fees_exp
                    }
                } else {
                    approx_eq_pct(fees, fees_exp, PRECISION_PLACES)
                }) {
                    println!("*** FEES MISMATCH: {}", swap_index + 1);
                    panic!();
                }
                // // Snapshot state after.
                // let (
                //     market_state_after,
                //     base_balance_after,
                //     quote_balance_after,
                //     liquidity_after,
                //     limit_after,
                //     sqrt_price_after
                // ) =
                //     _snapshot_state(
                //     market_manager, market_id, base_token, quote_token
                // );

                // Check price change is handled correctly.
                let end_sqrt_price = market_manager.curr_sqrt_price(market_id);
                if !(if swap_case.is_buy {
                    end_sqrt_price >= start_sqrt_price
                } else {
                    end_sqrt_price <= start_sqrt_price
                }) {
                    println!("*** SQRT PRICE MISMATCH: {}", swap_index + 1);
                    panic!();
                }
            }

            swap_index += 1;
        };

        index += 1;
    };
}

// Must be run with `snforge test --max-n-steps 4294967295`
#[test]
fn test_swap_cases_set1() {
    _test_swap_cases(1);
}

// Must be run with `snforge test --max-n-steps 4294967295`
#[test]
fn test_swap_cases_set2() {
    _test_swap_cases(2);
}

// Must be run with `snforge test --max-n-steps 4294967295`
#[test]
fn test_swap_cases_set3() {
    _test_swap_cases(3);
}


#[test]
fn test_swap_threshold_amount_exact_input() {
    let (market_manager, _base_token, _quote_token, market_id) = before_with_market();

    // Mint positions.
    let mut params = modify_position_params(
        alice(),
        market_id,
        price_math::offset(10) - 100,
        price_math::offset(10) + 100,
        I128Trait::new(to_e28_u128(2), false),
    );
    modify_position(market_manager, params);

    // Swap with threshold amount.
    let mut params = swap_params(
        alice(),
        market_id,
        true,
        true,
        to_e18(1),
        Option::None(()),
        Option::Some(996000000000000000),
        Option::None(())
    );
    swap(market_manager, params);
}

#[test]
#[should_panic(expected: ('ThresholdAmount', 996999999950299550, 0))]
fn test_swap_threshold_amount_exact_input_fails() {
    let (market_manager, _base_token, _quote_token, market_id) = before_with_market();

    // Mint positions.
    let mut params = modify_position_params(
        alice(),
        market_id,
        price_math::offset(10) - 100,
        price_math::offset(10) + 100,
        I128Trait::new(to_e28_u128(2), false),
    );
    modify_position(market_manager, params);

    // Swap with threshold amount.
    let mut params = swap_params(
        alice(),
        market_id,
        true,
        true,
        to_e18(1),
        Option::None(()),
        Option::Some(997000000000000000),
        Option::None(())
    );
    swap(market_manager, params);
}

#[test]
fn test_swap_threshold_amount_exact_output() {
    let (market_manager, _base_token, _quote_token, market_id) = before_with_market();

    // Mint positions.
    let mut params = modify_position_params(
        alice(),
        market_id,
        price_math::offset(10) - 100,
        price_math::offset(10) + 100,
        I128Trait::new(to_e28_u128(2), false),
    );
    modify_position(market_manager, params);

    // Swap with threshold amount.
    let mut params = swap_params(
        alice(),
        market_id,
        true,
        false,
        to_e18(1),
        Option::None(()),
        Option::Some(1004000000000000000),
        Option::None(())
    );
    swap(market_manager, params);
}

#[test]
#[should_panic(expected: ('ThresholdAmount', 1003009027131394184, 0))]
fn test_swap_threshold_amount_exact_output_fails() {
    let (market_manager, _base_token, _quote_token, market_id) = before_with_market();

    // Mint positions.
    let mut params = modify_position_params(
        alice(),
        market_id,
        price_math::offset(10) - 100,
        price_math::offset(10) + 100,
        I128Trait::new(to_e28_u128(2), false),
    );
    modify_position(market_manager, params);

    // Swap with threshold amount.
    let mut params = swap_params(
        alice(),
        market_id,
        true,
        false,
        to_e18(1),
        Option::None(()),
        Option::Some(1003000000000000000),
        Option::None(())
    );
    let (amount_in, _, _) = swap(market_manager, params);
    println!("Amount In: {}", amount_in);
}

////////////////////////////////
// HELPERS
////////////////////////////////

fn _snapshot_state(
    market_manager: IMarketManagerDispatcher,
    market_id: felt252,
    base_token: ERC20ABIDispatcher,
    quote_token: ERC20ABIDispatcher,
) -> (MarketState, u256, u256, u128, u32, u256) {
    let market_state = market_manager.market_state(market_id);
    let base_balance = base_token.balanceOf(market_manager.contract_address);
    let quote_balance = quote_token.balanceOf(market_manager.contract_address);
    let liquidity = market_manager.liquidity(market_id);
    let limit = market_manager.curr_limit(market_id);
    let sqrt_price = market_manager.curr_sqrt_price(market_id);

    (market_state, base_balance, quote_balance, liquidity, limit, sqrt_price)
}

fn _contains(span: Span<felt252>, value: felt252) -> bool {
    let mut index = 0;
    let mut result = false;
    loop {
        if index >= span.len() {
            break (result);
        }

        if *span.at(index) == value {
            break (true);
        }

        index += 1;
    }
}
