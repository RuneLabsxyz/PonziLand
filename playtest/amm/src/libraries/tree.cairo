// Local imports.
use haiko_amm::contracts::market_manager::MarketManager::ContractState;
use haiko_amm::contracts::market_manager::MarketManager::{
    limit_tree_l0ContractMemberStateTrait as treeL0InternalState,
    limit_tree_l1ContractMemberStateTrait as treeL1InternalState,
    limit_tree_l2ContractMemberStateTrait as treeL2InternalState,
};

// Haiko imports.
use haiko_lib::interfaces::IMarketManager::IMarketManager;
use haiko_lib::math::{math, bit_math, price_math};
use haiko_lib::constants::MAX_LIMIT_SHIFTED;

////////////////////////////////
// FUNCTIONS
////////////////////////////////

// Returns true if the tree contains the given limit.
//
// # Arguments
// * `market_id` - market id
// * `width` - width of the market
// * `limit` - limit to fetch
//
// # Returns
// * `initialised` - Whether the limit price is initialised.
pub fn get(self: @ContractState, market_id: felt252, width: u32, limit: u32) -> bool {
    // Compress limit by width.
    let scaled_limit = limit / width;

    let (index_l2, pos_l2) = _get_segment_and_position(scaled_limit);
    let segment_l2 = self.limit_tree_l2.read((market_id, index_l2));
    let mask = math::pow(2, pos_l2.into());
    segment_l2.into() & mask != 0
}

// Flips the given limit in the tree.
//
// # Arguments
// * `market_id` - market id
// * `width` - width of the market
// * `limit` - limit to insert
pub fn flip(ref self: ContractState, market_id: felt252, width: u32, limit: u32) {
    // Compress limit by width.
    let scaled_limit = limit / width;

    let (index_l2, pos_l2) = _get_segment_and_position(scaled_limit);
    let segment_l2 = self.limit_tree_l2.read((market_id, index_l2));
    let mask_l2 = math::pow(2, pos_l2.into());
    let new_segment_l2: felt252 = (segment_l2.into() ^ mask_l2)
        .try_into()
        .unwrap(); // toggle the bit
    self.limit_tree_l2.write((market_id, index_l2), new_segment_l2);

    // If limit first initialised or last uninitialised in L2 segment, propagate to L1.
    if new_segment_l2 != 0 && segment_l2 != 0 {
        return ();
    }
    let (index_l1, pos_l1) = _get_segment_and_position(index_l2);
    let segment_l1 = self.limit_tree_l1.read((market_id, index_l1));
    let mask_l1 = math::pow(2, pos_l1.into());
    let new_segment_l1: felt252 = (segment_l1.into() ^ mask_l1)
        .try_into()
        .unwrap(); // toggle the bit
    self.limit_tree_l1.write((market_id, index_l1), new_segment_l1);

    // If first limit in L1 segment, propagate to L0.
    if new_segment_l1 != 0 && segment_l1 != 0 {
        return ();
    }
    let segment_l0 = self.limit_tree_l0.read(market_id);
    let mask_l0 = math::pow(2, index_l1.into());
    let new_segment_l0: felt252 = (segment_l0.into() ^ mask_l0)
        .try_into()
        .unwrap(); // toggle the bit
    self.limit_tree_l0.write(market_id, new_segment_l0);
}

// Finds the next initialised limit in the tree, searching from a given starting limit.
// The tree is comprised of three layers, with each layer storing a bit that is set if 
// any bit in the corresponding segment of the tree below it is set. 
//
// # Arguments
// * `market_id` - The id of the market
// * `is_buy` - Whether to search to the left (buy) or right (sell) within segment
// * `width` - The width of the limit
// * `start_limit` - The current limit
//
// # Returns
// * `next_limit` - Next limit greater than current limit if buying, or less than if selling, or none
pub fn next_limit(
    self: @ContractState, market_id: felt252, is_buy: bool, width: u32, start_limit: u32
) -> Option<u32> {
    // Compress limit by width.
    let mut scaled_limit = start_limit / width;
    // If selling (searching right), increment by 1 to include current limit in search.
    if !is_buy {
        scaled_limit += 1;
    }

    // Initialise `segment`, a reusable storage value for storing the segment at each level.
    let mut segment: u256 = 0;

    // If next limit is within same L2 segment, return its position.
    let (mut index_l2, pos_l2) = _get_segment_and_position(scaled_limit);
    if (is_buy && pos_l2 != 250) || (!is_buy && pos_l2 != 0) {
        segment = self.limit_tree_l2.read((market_id, index_l2)).into();
        if segment != 0 {
            let next_bit = if is_buy {
                _next_bit_left(segment, pos_l2)
            } else {
                _next_bit_right(segment, pos_l2)
            };
            if next_bit.is_some() {
                return Option::Some((index_l2 * 251 + next_bit.unwrap().into()) * width);
            }
        }
    }

    // If next limit is within same L1 segment, return its position.
    let (mut index_l1, pos_l1) = _get_segment_and_position(index_l2);
    if (is_buy && pos_l1 != 250) || (!is_buy && pos_l1 != 0) {
        segment = self.limit_tree_l1.read((market_id, index_l1)).into();
        if segment != 0 {
            let next_bit = if is_buy {
                _next_bit_left(segment, pos_l1)
            } else {
                _next_bit_right(segment, pos_l1)
            };
            if next_bit.is_some() {
                index_l2 = index_l1 * 251 + next_bit.unwrap().into();
                segment = self.limit_tree_l2.read((market_id, index_l2)).into();
                if is_buy {
                    return Option::Some((index_l2 * 251 + bit_math::lsb(segment).into()) * width);
                } else {
                    return Option::Some((index_l2 * 251 + bit_math::msb(segment).into()) * width);
                }
            }
        }
    }

    // If next limit is within same L0 segment, return its position.
    let pos_l0: u8 = (index_l1 % 251).try_into().unwrap();
    if (is_buy && pos_l0 != 250) || (!is_buy && pos_l0 != 0) {
        segment = self.limit_tree_l0.read(market_id).into();
        let next_bit = if is_buy {
            _next_bit_left(segment, pos_l0)
        } else {
            _next_bit_right(segment, pos_l0)
        };
        if next_bit.is_some() {
            index_l1 = next_bit.unwrap().into();
            segment = self.limit_tree_l1.read((market_id, index_l1)).into();

            index_l2 = index_l1 * 251
                + if is_buy {
                    bit_math::lsb(segment)
                } else {
                    bit_math::msb(segment)
                }.into();
            segment = self.limit_tree_l2.read((market_id, index_l2)).into();

            if is_buy {
                return Option::Some((index_l2 * 251 + bit_math::lsb(segment).into()) * width);
            } else {
                return Option::Some((index_l2 * 251 + bit_math::msb(segment).into()) * width);
            }
        }
    }

    Option::None(())
}

////////////////////////////////
// INTERNAL HELPERS
////////////////////////////////

// Returns the segment and position of the given limit.
// 
// # Arguments
// * `limit` - the limit to get the segment and position of
//
// # Returns
// * `segment` - segment of the limit
// * `position` - position of the limit within the segment
pub(crate) fn _get_segment_and_position(limit: u32) -> (u32, u8) {
    assert(limit <= MAX_LIMIT_SHIFTED, 'SegPosLimitOF');
    let segment: u32 = limit / 251;
    let position: u8 = (limit % 251).try_into().unwrap();
    (segment, position)
}

// Returns the next initialised limit in a segment, searching left from a given starting position.
//
// # Arguments
// * `segment` - The segment to search within
// * `position` - The starting position to search from
//
// # Returns
// * `next_limit` - Next limit or none
fn _next_bit_left(segment: u256, position: u8) -> Option<u8> {
    // Generate mask for all bits to left of current bit, excluding it.
    // e.g. 11111000 for position = 2 (as position is zero-indexed)
    let mask: u256 = if position == 255 {
        0
    } else {
        ~(math::pow(2, position.into() + 1) - 1)
    };
    let masked: u256 = segment & mask;

    // If masked is non-zero, then the next limit is within the same segment.
    // Otherwise, return none.
    if masked != 0 {
        Option::Some(bit_math::lsb(masked))
    } else {
        Option::None(())
    }
}

// Returns the next initialised limit in a segment, searching right from a given starting position.
//
// # Arguments
// * `segment` - The segment to search within
// * `position` - The starting position to search from
//
// # Returns
// * `next_limit` - Next limit or none
fn _next_bit_right(segment: u256, position: u8) -> Option<u8> {
    // Generate mask for all bits to right of current bit, excluding it. 
    // e.g. 00000011 for position = 2 (as position is zero-indexed)
    let mask: u256 = math::pow(2, position.into()) - 1;
    let masked: u256 = segment & mask;

    // If masked is non-zero, then the next limit is within the same segment.
    if masked != 0 {
        Option::Some(bit_math::msb(masked))
    } else {
        Option::None(())
    }
}
