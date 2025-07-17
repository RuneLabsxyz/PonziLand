// This module handles map extraction and coordinate management for a 64x64 grid.
// Each coordinate (row, col) represents the unique ID of a piece of land on the grid.
// The functions allow for conversion between position-based coordinates and linear indices,
// as well as directional movement logic (left, right, up, down) within the grid bounds.
use ponzi_land::store::{Store, StoreTrait};


fn position_to_index(row: u16, col: u16, grid_width: u8) -> u16 {
    assert!(row < grid_width.into(), "out of bounds");
    assert!(col < grid_width.into(), "out of bounds");

    return row * grid_width.into() + col;
}

fn index_to_position(index: u16, grid_width: u8) -> (u16, u16) {
    assert!(index < grid_width.into() * grid_width.into(), "out of bounds");

    let row = index / grid_width.into();
    let col = index % grid_width.into();

    return (row, col);
}

fn left(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if col == 0 {
        return Option::None;
    } else {
        return Option::Some(position_to_index(row, col - 1, grid_width));
    }
}

fn right(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if col == grid_width.into() - 1 {
        return Option::None;
    } else {
        return Option::Some(position_to_index(row, col + 1, grid_width));
    }
}

fn up(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if row == 0 {
        return Option::None;
    } else {
        return Option::Some(position_to_index(row - 1, col, grid_width));
    }
}

fn down(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if row == grid_width.into() - 1 {
        return Option::None;
    } else {
        return Option::Some(position_to_index(row + 1, col, grid_width));
    }
}

fn up_left(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if row == 0 || col == 0 {
        Option::None
    } else {
        Option::Some(position_to_index(row - 1, col - 1, grid_width))
    }
}

fn up_right(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if row == 0 || col == grid_width.into() - 1 {
        Option::None
    } else {
        Option::Some(position_to_index(row - 1, col + 1, grid_width))
    }
}

fn down_left(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if row == grid_width.into() - 1 || col == 0 {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col - 1, grid_width))
    }
}

fn down_right(index: u16, grid_width: u8) -> Option<u16> {
    let (row, col) = index_to_position(index, grid_width);
    if row == grid_width.into() - 1 || col == grid_width.into() - 1 {
        Option::None
    } else {
        Option::Some(position_to_index(row + 1, col + 1, grid_width))
    }
}

fn is_valid_position(index: u16, grid_width: u8) -> bool {
    index < grid_width.into() * grid_width.into()
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

    const TEST_GRID_WIDTH: u8 = 64;

    #[test]
    fn test_position_to_index() {
        assert_eq!(position_to_index(0, 0, TEST_GRID_WIDTH), 0);
        assert_eq!(position_to_index(0, 1, TEST_GRID_WIDTH), 1);
        assert_eq!(position_to_index(1, 0, TEST_GRID_WIDTH), TEST_GRID_WIDTH.into());
        assert_eq!(position_to_index(1, 1, TEST_GRID_WIDTH), TEST_GRID_WIDTH.into() + 1);
    }

    #[test]
    fn test_index_to_position() {
        assert_eq!(index_to_position(0, TEST_GRID_WIDTH), (0, 0));
        assert_eq!(index_to_position(1, TEST_GRID_WIDTH), (0, 1));
        assert_eq!(index_to_position(TEST_GRID_WIDTH.into(), TEST_GRID_WIDTH), (1, 0));
        assert_eq!(index_to_position(TEST_GRID_WIDTH.into() + 1, TEST_GRID_WIDTH), (1, 1));
    }

    #[test]
    fn test_move() {
        // Test `left`
        assert_eq!(left(0, TEST_GRID_WIDTH), Option::None);
        assert_eq!(left(1, TEST_GRID_WIDTH), Option::Some(0));
        assert_eq!(left(TEST_GRID_WIDTH.into(), TEST_GRID_WIDTH), Option::None);
        assert_eq!(
            left(TEST_GRID_WIDTH.into() + 1, TEST_GRID_WIDTH), Option::Some(TEST_GRID_WIDTH.into()),
        );

        // Test `right`
        assert_eq!(right(0, TEST_GRID_WIDTH), Option::Some(1));
        assert_eq!(right(1, TEST_GRID_WIDTH), Option::Some(2));
        assert_eq!(right(TEST_GRID_WIDTH.into() - 1, TEST_GRID_WIDTH), Option::None);
        assert_eq!(
            right(TEST_GRID_WIDTH.into(), TEST_GRID_WIDTH),
            Option::Some(TEST_GRID_WIDTH.into() + 1),
        );

        // Test `up`
        assert_eq!(up(0, TEST_GRID_WIDTH), Option::None);
        assert_eq!(up(1, TEST_GRID_WIDTH), Option::None);
        assert_eq!(up(TEST_GRID_WIDTH.into(), TEST_GRID_WIDTH), Option::Some(0));
        assert_eq!(up(TEST_GRID_WIDTH.into() + 1, TEST_GRID_WIDTH), Option::Some(1));

        // Test `down`
        assert_eq!(down(0, TEST_GRID_WIDTH), Option::Some(TEST_GRID_WIDTH.into()));
        assert_eq!(down(1, TEST_GRID_WIDTH), Option::Some(TEST_GRID_WIDTH.into() + 1));
        assert_eq!(
            down(TEST_GRID_WIDTH.into(), TEST_GRID_WIDTH), Option::Some(2 * TEST_GRID_WIDTH.into()),
        );
        assert_eq!(
            down(TEST_GRID_WIDTH.into() + 1, TEST_GRID_WIDTH),
            Option::Some(2 * TEST_GRID_WIDTH.into() + 1),
        );
        assert_eq!(
            down((TEST_GRID_WIDTH.into() - 1) * TEST_GRID_WIDTH.into(), TEST_GRID_WIDTH),
            Option::None,
        );
    }

    #[test]
    fn test_is_valid_position() {
        assert(is_valid_position(10, TEST_GRID_WIDTH), 'has to be true');
        assert(is_valid_position(4095, TEST_GRID_WIDTH), 'has to be true');
        assert(!is_valid_position(4096, TEST_GRID_WIDTH), 'has to be false');
        assert(!is_valid_position(10000, TEST_GRID_WIDTH), 'has to be false');
    }

    #[test]
    fn test_max_neighbors() {
        // Corner positions
        assert_eq!(max_neighbors(position_to_index(0, 0, TEST_GRID_WIDTH), TEST_GRID_WIDTH), 3);
        assert_eq!(
            max_neighbors(
                position_to_index(0, (TEST_GRID_WIDTH - 1).into(), TEST_GRID_WIDTH),
                TEST_GRID_WIDTH,
            ),
            3,
        );
        assert_eq!(
            max_neighbors(
                position_to_index((TEST_GRID_WIDTH - 1).into(), 0, TEST_GRID_WIDTH),
                TEST_GRID_WIDTH,
            ),
            3,
        );
        assert_eq!(
            max_neighbors(
                position_to_index(
                    (TEST_GRID_WIDTH - 1).into(), (TEST_GRID_WIDTH - 1).into(), TEST_GRID_WIDTH,
                ),
                TEST_GRID_WIDTH,
            ),
            3,
        );

        // Edge positions
        assert_eq!(max_neighbors(position_to_index(0, 1, TEST_GRID_WIDTH), TEST_GRID_WIDTH), 5);
        assert_eq!(max_neighbors(position_to_index(1, 0, TEST_GRID_WIDTH), TEST_GRID_WIDTH), 5);

        // Interior position
        assert_eq!(max_neighbors(position_to_index(1, 1, TEST_GRID_WIDTH), TEST_GRID_WIDTH), 8);
    }
}

