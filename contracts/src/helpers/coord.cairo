// This module handles map extraction and coordinate management for a 64x64 grid.
// Each coordinate (row, col) represents the unique ID of a piece of land on the grid.
// The functions allow for conversion between position-based coordinates and linear indices,
// as well as directional movement logic (left, right, up, down) within the grid bounds.

use ponzi_land::consts::{GRID_WIDTH};

fn position_to_index(row: u16, col: u16) -> u16 {
    assert!(row < GRID_WIDTH, "out of bounds");
    assert!(col < GRID_WIDTH, "out of bounds");

    return row * GRID_WIDTH + col;
}

fn index_to_position(index: u16) -> (u16, u16) {
    assert!(index < GRID_WIDTH * GRID_WIDTH, "out of bounds");

    let row = index / GRID_WIDTH;
    let col = index % GRID_WIDTH;

    return (row, col);
}

fn left(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if col == 0 {
        // return index;
        return Option::None;
    } else {
        return Option::Some(position_to_index(row, col - 1));
    }
}

fn right(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if col == GRID_WIDTH - 1 {
        //return index
        return Option::None;
    } else {
        return Option::Some(position_to_index(row, col + 1));
    }
}

fn up(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == 0 {
        //return index
        return Option::None;
    } else {
        return Option::Some(position_to_index(row - 1, col));
    }
}

fn down(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == GRID_WIDTH - 1 {
        //return index
        return Option::None;
    } else {
        return Option::Some(position_to_index(row + 1, col));
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
    if row == 0 || col == GRID_WIDTH - 1 {
        Option::None
    } else {
        Option::Some(position_to_index(row - 1, col + 1))
    }
}

fn down_left(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == GRID_WIDTH - 1 || col == 0 {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col - 1))
    }
}

fn down_right(index: u16) -> Option<u16> {
    let (row, col) = index_to_position(index);
    if row == GRID_WIDTH - 1 || col == GRID_WIDTH - 1 {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col + 1))
    }
}

fn is_valid_position(index: u16) -> bool {
    index < GRID_WIDTH * GRID_WIDTH
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

    // Orthogonal neighbors
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

    // Diagonal neighbors
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
    use ponzi_land::consts::GRID_WIDTH;
    use ponzi_land::helpers::coord::{
        position_to_index, index_to_position, left, right, up, down, is_valid_position,
        max_neighbors,
    };

    #[test]
    fn test_position_to_index() {
        assert_eq!(position_to_index(0, 0), 0);
        assert_eq!(position_to_index(0, 1), 1);
        assert_eq!(position_to_index(1, 0), GRID_WIDTH);
        assert_eq!(position_to_index(1, 1), GRID_WIDTH + 1);
    }

    #[test]
    fn test_index_to_position() {
        assert_eq!(index_to_position(0), (0, 0));
        assert_eq!(index_to_position(1), (0, 1));
        assert_eq!(index_to_position(GRID_WIDTH), (1, 0));
        assert_eq!(index_to_position(GRID_WIDTH + 1), (1, 1));
    }

    #[test]
    fn test_move() {
        // Test `left`
        assert_eq!(left(0), Option::None); // Left of top-left corner
        assert_eq!(left(1), Option::Some(0)); // Left of (0, 1)
        assert_eq!(left(GRID_WIDTH), Option::None); // Left of (1, 0)
        assert_eq!(left(GRID_WIDTH + 1), Option::Some(GRID_WIDTH)); // Left of (1, 1)

        // Test `right`
        assert_eq!(right(0), Option::Some(1)); // Right of top-left corner
        assert_eq!(right(1), Option::Some(2)); // Right of (0, 1)
        assert_eq!(right(GRID_WIDTH - 1), Option::None); // Right of last column in row 0
        assert_eq!(right(GRID_WIDTH), Option::Some(GRID_WIDTH + 1)); // Right of (1, 0)

        // Test `up`
        assert_eq!(up(0), Option::None); // Up of top-left corner
        assert_eq!(up(1), Option::None); // Up of (0, 1)
        assert_eq!(up(GRID_WIDTH), Option::Some(0)); // Up of (1, 0)
        assert_eq!(up(GRID_WIDTH + 1), Option::Some(1)); // Up of (1, 1)

        // Test `down`
        assert_eq!(down(0), Option::Some(GRID_WIDTH)); // Down of top-left corner
        assert_eq!(down(1), Option::Some(GRID_WIDTH + 1)); // Down of (0, 1)
        assert_eq!(down(GRID_WIDTH), Option::Some(2 * GRID_WIDTH)); // Down of (1, 0)
        assert_eq!(down(GRID_WIDTH + 1), Option::Some(2 * GRID_WIDTH + 1)); // Down of (1, 1)
        assert_eq!(down((GRID_WIDTH - 1) * GRID_WIDTH), Option::None); // Down of last row
    }

    #[test]
    fn test_is_valid_position() {
        assert(is_valid_position(10), 'has to be true');
        assert(is_valid_position(4095), 'has to be true');
        assert(!is_valid_position(4096), 'has to be false');
        assert(!is_valid_position(10000), 'has to be false');
    }

    #[test]
    fn test_max_neighbors() {
        // Corner positions
        assert_eq!(max_neighbors(position_to_index(0, 0)), 3); // Top-left: right, down, down-right
        assert_eq!(
            max_neighbors(position_to_index(0, GRID_WIDTH - 1)), 3,
        ); // Top-right: left, down, down-left
        assert_eq!(
            max_neighbors(position_to_index(GRID_WIDTH - 1, 0)), 3,
        ); // Bottom-left: up, right, up-right
        assert_eq!(
            max_neighbors(position_to_index(GRID_WIDTH - 1, GRID_WIDTH - 1)), 3,
        ); // Bottom-right: up, left, up-left

        // Edge positions
        assert_eq!(
            max_neighbors(position_to_index(0, 1)), 5,
        ); // Top edge: left, right, down, down-left, down-right
        assert_eq!(
            max_neighbors(position_to_index(1, 0)), 5,
        ); // Left edge: up, down, right, up-right, down-right

        // Interior position
        assert_eq!(
            max_neighbors(position_to_index(1, 1)), 8,
        ); // All directions: up, down, left, right, and all diagonals
    }
}

