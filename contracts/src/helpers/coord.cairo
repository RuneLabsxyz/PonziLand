// This module handles map extraction and coordinate management for a 64x64 grid.
// Each coordinate (row, col) represents the unique ID of a piece of land on the grid.
// The functions allow for conversion between position-based coordinates and linear indices,
// as well as directional movement logic (left, right, up, down) within the grid bounds.
use ponzi_land::store::{Store, StoreTrait};

const TWO_POW_8: u16 = 256; // 2^8
const MASK_8: u16 = 0xFF; // 8 bits
const MAX_GRID_SIZE: u8 = 254;

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

fn is_valid_position(index: u16, grid_width: u8) -> bool {
    let (row, col) = index_to_position(index);
    row < grid_width && col < grid_width
}


fn left(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if col == 0 {
        Option::None
    } else {
        let new_col = col - 1;
        if row < grid_width && new_col < grid_width {
            Option::Some(position_to_index(row, new_col))
        } else {
            Option::None
        }
    }
}

fn right(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if col + 1 >= grid_width {
        Option::None
    } else {
        Option::Some(position_to_index(row, col + 1))
    }
}

fn up(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == 0 {
        Option::None
    } else {
        let new_row = row - 1;
        if new_row < grid_width && col < grid_width {
            Option::Some(position_to_index(new_row, col))
        } else {
            Option::None
        }
    }
}

fn down(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row + 1 >= grid_width {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col))
    }
}

fn up_left(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == 0 || col == 0 {
        Option::None
    } else {
        let new_row = row - 1;
        let new_col = col - 1;
        if new_row < grid_width && new_col < grid_width {
            Option::Some(position_to_index(new_row, new_col))
        } else {
            Option::None
        }
    }
}

fn up_right(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == 0 || col + 1 >= grid_width {
        Option::None
    } else {
        let new_row = row - 1;
        let new_col = col + 1;
        if new_row < grid_width && new_col < grid_width {
            Option::Some(position_to_index(new_row, new_col))
        } else {
            Option::None
        }
    }
}

fn down_left(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row + 1 >= grid_width || col == 0 {
        Option::None
    } else {
        let new_row = row + 1;
        let new_col = col - 1;
        if new_row < grid_width && new_col < grid_width {
            Option::Some(position_to_index(new_row, new_col))
        } else {
            Option::None
        }
    }
}

fn down_right(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row + 1 >= grid_width || col + 1 >= grid_width {
        Option::None
    } else {
        let new_row = row + 1;
        let new_col = col + 1;
        if new_row < grid_width && new_col < grid_width {
            Option::Some(position_to_index(new_row, new_col))
        } else {
            Option::None
        }
    }
}


fn get_all_neighbors(index: u16, grid_width: u8) -> Array<u16> {
    let mut neighbors = ArrayTrait::new();

    if left(index, grid_width).is_some() {
        neighbors.append(left(index, grid_width).unwrap());
    }
    if right(index, grid_width).is_some() {
        neighbors.append(right(index, grid_width).unwrap());
    }
    if up(index, grid_width).is_some() {
        neighbors.append(up(index, grid_width).unwrap());
    }
    if down(index, grid_width).is_some() {
        neighbors.append(down(index, grid_width).unwrap());
    }
    if up_left(index, grid_width).is_some() {
        neighbors.append(up_left(index, grid_width).unwrap());
    }
    if up_right(index, grid_width).is_some() {
        neighbors.append(up_right(index, grid_width).unwrap());
    }
    if down_left(index, grid_width).is_some() {
        neighbors.append(down_left(index, grid_width).unwrap());
    }
    if down_right(index, grid_width).is_some() {
        neighbors.append(down_right(index, grid_width).unwrap());
    }

    neighbors
}

fn max_neighbors(index: u16, grid_width: u8) -> u8 {
    let mut count = 0;

    if left(index, grid_width).is_some() {
        count += 1;
    }
    if right(index, grid_width).is_some() {
        count += 1;
    }
    if up(index, grid_width).is_some() {
        count += 1;
    }
    if down(index, grid_width).is_some() {
        count += 1;
    }
    if up_left(index, grid_width).is_some() {
        count += 1;
    }
    if up_right(index, grid_width).is_some() {
        count += 1;
    }
    if down_left(index, grid_width).is_some() {
        count += 1;
    }
    if down_right(index, grid_width).is_some() {
        count += 1;
    }

    return count;
}

#[cfg(test)]
mod coord_test {
    use super::{
        position_to_index, index_to_position, left, right, up, down, is_valid_position,
        max_neighbors,
    };

    const TEST_GRID_WIDTH: u8 = 254;

    #[test]
    fn test_position_to_index() {
        assert_eq!(position_to_index(0, 0), 0);
        assert_eq!(position_to_index(0, 1), 1);
        assert_eq!(position_to_index(1, 0), 256);
        assert_eq!(position_to_index(1, 1), 257);
        assert_eq!(position_to_index(253, 253), 65021); // last valid land
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
        assert_eq!(left(0, TEST_GRID_WIDTH), Option::None);
        assert_eq!(left(1, TEST_GRID_WIDTH), Option::Some(0));
        assert_eq!(left(256, TEST_GRID_WIDTH), Option::None);
        assert_eq!(left(257, TEST_GRID_WIDTH), Option::Some(256));

        // Test `right`
        assert_eq!(right(0, TEST_GRID_WIDTH), Option::Some(1));
        assert_eq!(right(1, TEST_GRID_WIDTH), Option::Some(2));
        assert_eq!(right(256, TEST_GRID_WIDTH), Option::Some(257));
        assert_eq!(right(257, TEST_GRID_WIDTH), Option::Some(258));

        // Test `up`
        assert_eq!(up(0, TEST_GRID_WIDTH), Option::None);
        assert_eq!(up(1, TEST_GRID_WIDTH), Option::None);
        assert_eq!(up(256, TEST_GRID_WIDTH), Option::Some(0));
        assert_eq!(up(257, TEST_GRID_WIDTH), Option::Some(1));

        // Test `down`
        assert_eq!(down(0, TEST_GRID_WIDTH), Option::Some(256));
        assert_eq!(down(1, TEST_GRID_WIDTH), Option::Some(257));
        assert_eq!(down(256, TEST_GRID_WIDTH), Option::Some(512));
        assert_eq!(down(257, TEST_GRID_WIDTH), Option::Some(513));
        assert_eq!(down(64781, TEST_GRID_WIDTH), Option::None);
    }

    #[test]
    fn test_is_valid_position() {
        assert(is_valid_position(position_to_index(0, 10), TEST_GRID_WIDTH), 'has to be true');
        assert(is_valid_position(position_to_index(200, 200), TEST_GRID_WIDTH), 'has to be true');
        assert(!is_valid_position(position_to_index(255, 255), TEST_GRID_WIDTH), 'has to be false');
        assert(!is_valid_position(position_to_index(254, 254), TEST_GRID_WIDTH), 'has to be false');
    }

    #[test]
    fn test_max_neighbors() {
        // Corner positions
        assert_eq!(max_neighbors(position_to_index(0, 0), TEST_GRID_WIDTH), 3);
        assert_eq!(
            max_neighbors(position_to_index(0, (TEST_GRID_WIDTH - 1).into()), TEST_GRID_WIDTH), 3,
        );
        assert_eq!(
            max_neighbors(position_to_index((TEST_GRID_WIDTH - 1).into(), 0), TEST_GRID_WIDTH), 3,
        );
        assert_eq!(
            max_neighbors(
                position_to_index((TEST_GRID_WIDTH - 1).into(), (TEST_GRID_WIDTH - 1).into()),
                TEST_GRID_WIDTH,
            ),
            3,
        );

        // Edge positions
        assert_eq!(max_neighbors(position_to_index(0, 1), TEST_GRID_WIDTH), 5);
        assert_eq!(max_neighbors(position_to_index(1, 0), TEST_GRID_WIDTH), 5);

        // Interior position
        assert_eq!(max_neighbors(position_to_index(1, 1), TEST_GRID_WIDTH), 8);
    }
}

