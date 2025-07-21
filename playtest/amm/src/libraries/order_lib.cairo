// Core lib imports.
use core::cmp::min;
use starknet::{ContractAddress, get_caller_address};
use starknet::contract_address::contract_address_const;

// Local imports.
use haiko_amm::libraries::liquidity_lib;
use haiko_amm::contracts::market_manager::MarketManager::{
    ContractState, MarketManagerInternalTrait
};
use haiko_amm::contracts::market_manager::MarketManager::{
    ordersContractMemberStateTrait as OrderStateTrait,
    limit_infoContractMemberStateTrait as LimitInfoStateTrait,
    batchesContractMemberStateTrait as BatchStateTrait,
    positionsContractMemberStateTrait as PositionStateTrait,
    market_infoContractMemberStateTrait as MarketInfoStateTrait,
    market_stateContractMemberStateTrait as MarketStateStateTrait,
    donationsContractMemberStateTrait as DonationStateTrait,
};

// Haiko imports.
use haiko_lib::id;
use haiko_lib::math::{math, price_math, fee_math, liquidity_math};
use haiko_lib::constants::ONE;
use haiko_lib::types::{core::{OrderBatch, LimitInfo}, i128::{i128, I128Trait}};

// External imports.
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

// Returns total amount of tokens inside of a limit order.
// User's position is calculated based on the liquidity of their order relative to the
//  total liquidity of the batch. Fully filled orders are paid their prorata share of 
// fees (up to the swap fee rate), while unfilled or partially filled orders always 
// forfeit fees. This is to prevent depositors from opportunistically placing orders in
// batches with existing accrued fee balances and withdrawing them immediately. In 
// addition, all orders in markets with a variable fee controller must forfeit fees to 
// prevent potential insolvency from fee rate updates. 
// 
// # Arguments
// * `order_id` - order id
// * `market_id` - market id
//
// # Returns
// * `base_amount` - amount of base tokens inside order
// * `quote_amount` - amount of quote tokens inside order
pub fn amounts_inside_order(
    self: @ContractState, order_id: felt252, market_id: felt252
) -> (u256, u256) {
    // Get order and batch info.
    let market_info = self.market_info.read(market_id);
    let market_state = self.market_state.read(market_id);
    let order = self.orders.read(order_id);
    let batch = self.batches.read(order.batch_id);

    // Handle empty batch.
    if order.liquidity == 0 {
        return (0, 0);
    }

    // Calculate order amounts.
    let (base_amount_excl_fees, quote_amount_excl_fees) = liquidity_math::liquidity_to_amounts(
        I128Trait::new(order.liquidity, true),
        market_state.curr_sqrt_price,
        price_math::limit_to_sqrt_price(batch.limit, market_info.width),
        price_math::limit_to_sqrt_price(batch.limit + market_info.width, market_info.width),
    );
    let mut base_amount = base_amount_excl_fees.val;
    let mut quote_amount = quote_amount_excl_fees.val;

    // Calculate accrued fees on filled portion of order. Note that fees are always forfeited
    // if the market uses a variable fee controller, to avoid potential insolvency from fee
    // rate updates.
    if market_info.fee_controller == contract_address_const::<0x0>() {
        if batch.is_bid {
            base_amount = fee_math::net_to_gross(base_amount, market_info.swap_fee_rate);
        } else {
            quote_amount = fee_math::net_to_gross(quote_amount, market_info.swap_fee_rate);
        }
    }

    (base_amount, quote_amount)
}

// Fully fill orders at the given limits.
// Calling `swap` returns an array of limits that were fully filled. This function iterates through
// this list and removes batch liquidity from the market.
// 
// # Arguments
// * `market_id` - market ID
// * `width` - limit width of market
// * `filled_limits` - list of limits that were fully filled, along with associated batch ids
pub fn fill_limits(
    ref self: ContractState, market_id: felt252, width: u32, filled_limits: Span<(u32, felt252)>,
) {
    let mut i = filled_limits.len();
    loop {
        if i == 0 {
            break;
        }

        // Get batch info.
        let (limit, batch_id) = *filled_limits.at(i - 1);
        let mut batch = self.batches.read(batch_id);

        // Remove liquidity from position.
        let (base_amount, quote_amount, _base_fees, _quote_fees) = self
            ._modify_position(
                batch_id,
                market_id,
                limit,
                limit + width,
                I128Trait::new(batch.liquidity, true),
                true,
            );

        // Update batch info. 
        batch.filled = true;
        batch.base_amount += base_amount.val.try_into().expect('BatchBaseFilledOF');
        batch.quote_amount += quote_amount.val.try_into().expect('BatchQuoteFilledOF');
        self.batches.write(batch_id, batch);

        // Update limit info. Limit info is changed by `modify_position` so must be fetched here.
        let mut limit_info = self.limit_info.read((market_id, limit));
        limit_info.nonce += 1;
        self.limit_info.write((market_id, limit), limit_info);

        // Move to next order.
        i -= 1;
    };
}
