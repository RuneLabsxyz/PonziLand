use ponzi_land::helpers::coord::{
    left, right, up, down, index_to_position, position_to_index, up_left, up_right, down_left,
    down_right,
};
use ponzi_land::store::{Store, StoreTrait};
use starknet::storage::{
    Map, StoragePointerReadAccess, StoragePointerWriteAccess, Vec, VecTrait, MutableVecTrait,
};


#[derive(Copy, Drop, Serde, starknet::Store, Debug)]
struct SpiralState {
    direction: u8, // 0=left, 1=top, 2=right, 3=down
    current_head: u8,
    steps: u64,
    advance: u64,
    steps_remaining: Option<u64>,
}


// Helper function to get next position based on direction
#[inline(always)]
fn get_next_position(direction: u8, location: u16) -> Option<u16> {
    match direction {
        0 => left(location),
        1 => up(location),
        2 => right(location),
        3 => down(location),
        _ => Option::None,
    }
}

