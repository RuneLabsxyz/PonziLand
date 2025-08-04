// This module handles map extraction and coordinate management for a 64x64 grid.
// Each coordinate (row, col) represents the unique ID of a piece of land on the grid.
// The functions allow for conversion between position-based coordinates and linear indices,
// as well as directional movement logic (left, right, up, down) within the grid bounds.
use ponzi_land::consts::{MAX_GRID_SIZE};
const TWO_POW_8: u16 = 256; // 2^8
const MASK_8: u16 = 0xFF; // 8 bits

// Encode (row, col) as a stable u16 (row in high 8 bits, col in low 8 bits)
fn position_to_index(row: u8, col: u8) -> u16 {
    row.into() * TWO_POW_8 + col.into()
}

// Decode u16 index into (row, col)
fn index_to_position(index: u16) -> (u8, u8) {
    let row: u8 = (index / TWO_POW_8).try_into().unwrap();
    let col: u8 = (index & MASK_8).try_into().unwrap();
    (row, col)
}


fn left(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if col == 0 {
        Option::None
    } else {
        Option::Some(position_to_index(row, col - 1))
    }
}

fn right(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if col >= MAX_GRID_SIZE {
        Option::None
    } else {
        Option::Some(position_to_index(row, col + 1))
    }
}

fn up(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == 0 {
        Option::None
    } else {
        Option::Some(position_to_index(row - 1, col))
    }
}

fn down(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row >= MAX_GRID_SIZE {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col))
    }
}

fn up_left(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == 0 || col == 0 {
        Option::None
    } else {
        Option::Some(position_to_index(row - 1, col - 1))
    }
}

fn up_right(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == 0 || col >= MAX_GRID_SIZE {
        Option::None
    } else {
        Option::Some(position_to_index(row - 1, col + 1))
    }
}

fn down_left(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row >= MAX_GRID_SIZE || col == 0 {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col - 1))
    }
}

fn down_right(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row >= MAX_GRID_SIZE || col >= MAX_GRID_SIZE {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col + 1))
    }
}


fn get_all_neighbors(index: u16) -> Array<u16> {
    let mut neighbors = ArrayTrait::new();

    if left(index).is_some() {
        neighbors.append(left(index).unwrap());
    }
    if right(index).is_some() {
        neighbors.append(right(index).unwrap());
    }
    if up(index).is_some() {
        neighbors.append(up(index).unwrap());
    }
    if down(index).is_some() {
        neighbors.append(down(index).unwrap());
    }
    if up_left(index).is_some() {
        neighbors.append(up_left(index).unwrap());
    }
    if up_right(index).is_some() {
        neighbors.append(up_right(index).unwrap());
    }
    if down_left(index).is_some() {
        neighbors.append(down_left(index).unwrap());
    }
    if down_right(index).is_some() {
        neighbors.append(down_right(index).unwrap());
    }

    neighbors
}

fn max_neighbors(index: u16) -> u8 {
    let mut count = 0;

    if left(index).is_some() {
        count += 1;
    }
    if right(index).is_some() {
        count += 1;
    }
    if up(index).is_some() {
        count += 1;
    }
    if down(index).is_some() {
        count += 1;
    }
    if up_left(index).is_some() {
        count += 1;
    }
    if up_right(index).is_some() {
        count += 1;
    }
    if down_left(index).is_some() {
        count += 1;
    }
    if down_right(index).is_some() {
        count += 1;
    }

    return count;
}

#[cfg(test)]
mod coord_test {
    use super::{position_to_index, index_to_position, left, right, up, down, max_neighbors};
    #[test]
    fn test_position_to_index() {
        assert_eq!(position_to_index(0, 0), 0);
        assert_eq!(position_to_index(0, 1), 1);
        assert_eq!(position_to_index(1, 0), 256);
        assert_eq!(position_to_index(1, 1), 257);
        assert_eq!(position_to_index(253, 253), 65021);
    }

    #[test]
    fn test_index_to_position() {
        assert_eq!(index_to_position(0), (0, 0));
        assert_eq!(index_to_position(1), (0, 1));
        assert_eq!(index_to_position(256), (1, 0));
        assert_eq!(index_to_position(257), (1, 1));
        assert_eq!(index_to_position(65021), (253, 253));
    }

    #[test]
    fn test_move() {
        // Test `left`
        assert_eq!(left(0), Option::None);
        assert_eq!(left(1), Option::Some(0));
        assert_eq!(left(256), Option::None);
        assert_eq!(left(257), Option::Some(256));

        // Test `right`
        assert_eq!(right(0), Option::Some(1));
        assert_eq!(right(1), Option::Some(2));
        assert_eq!(right(256), Option::Some(257));
        assert_eq!(right(257), Option::Some(258));

        // Test `up`
        assert_eq!(up(0), Option::None);
        assert_eq!(up(1), Option::None);
        assert_eq!(up(256), Option::Some(0));
        assert_eq!(up(257), Option::Some(1));

        // Test `down`
        assert_eq!(down(0), Option::Some(256));
        assert_eq!(down(1), Option::Some(257));
        assert_eq!(down(256), Option::Some(512));
        assert_eq!(down(257), Option::Some(513));
        assert_eq!(down(64781), Option::Some(65037));
    }

    #[test]
    fn test_max_neighbors() {
        // Corner positions
        assert_eq!(max_neighbors(position_to_index(0, 0)), 3);
        assert_eq!(max_neighbors(position_to_index(0, 1)), 5);
        assert_eq!(max_neighbors(position_to_index(1, 0)), 5);

        // Edge positions
        assert_eq!(max_neighbors(position_to_index(0, 254)), 5);
        assert_eq!(max_neighbors(position_to_index(254, 0)), 5);

        // Interior position
        assert_eq!(max_neighbors(position_to_index(1, 1)), 8);
        assert_eq!(max_neighbors(position_to_index(127, 127)), 8);
    }
}