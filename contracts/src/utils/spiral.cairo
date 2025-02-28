use ponzi_land::helpers::coord::{
    left, right, up, down, index_to_position, position_to_index, up_left, up_right, down_left,
    down_right
};
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::consts::{MAX_AUCTIONS, MAX_NEW_AUCTIONS};

#[derive(Copy, Drop, Serde, starknet::Store)]
struct SpiralState {
    row: u64,
    col: u64,
    advance: u64,
    direction: u8
}


fn should_continue_adding_auctions(added: u8, active_auctions: u8, directions_tried: u8) -> bool {
    added < MAX_NEW_AUCTIONS && active_auctions < MAX_AUCTIONS && directions_tried < 8
}

// Helper function to get next position based on direction
fn get_next_position(direction: u8, center_pos: u64,) -> Option<u64> {
    match direction {
        0 => left(center_pos),
        1 => up_left(center_pos),
        2 => up(center_pos),
        3 => up_right(center_pos),
        4 => right(center_pos),
        5 => down_right(center_pos),
        6 => down(center_pos),
        7 => down_left(center_pos),
        _ => Option::None
    }
}

