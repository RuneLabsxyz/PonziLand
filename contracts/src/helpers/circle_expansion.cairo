use ponzi_land::helpers::coord::{position_to_index};
use starknet::{get_caller_address, get_block_number};
use ponzi_land::consts::GRID_WIDTH;
use keccak::keccak_u256s_le_inputs;
use core::integer::u256_from_felt252;


fn lands_in_circle(circle_number: u64) -> u64 {
    return circle_number * 8;
}

fn lands_per_section(circle_number: u64) -> u64 {
    return lands_in_circle(circle_number) / 4;
}


fn is_section_completed(lands_completed: u64, circle: u64) -> bool {
    return lands_completed == lands_per_section(circle);
}


fn get_circle_land_position(circle: u64, index: u64) -> u64 {
    let center: u64 = GRID_WIDTH / 2;
    let lands_per_section = lands_per_section(circle);
    let total_lands = lands_in_circle(circle);
    assert(index < total_lands, 'Invalid index for circle');
    let section = index / lands_per_section;
    let offset = index % lands_per_section;

    let mut row: u64 = 0;
    let mut col: u64 = 0;
    match section {
        0 => { // Top
            row = center - circle;
            col = center - circle + offset;
        },
        1 => { // Right
            row = center - circle + offset;
            col = center + circle;
        },
        2 => { // Bottom
            row = center + circle;
            col = center + circle - offset;
        },
        3 => { // Left
            row = center + circle - offset;
            col = center - circle;
        },
        _ => panic!("Invalid section"),
    }

    assert(row < GRID_WIDTH, 'Row out of bounds');
    assert(col < GRID_WIDTH, 'Col out of bounds');

    return position_to_index(row, col);
}

fn generate_circle(circle: u64) -> Array<u64> {
    let mut lands: Array<u64> = ArrayTrait::new();
    let lands_per_section = lands_per_section(circle);

    let mut section = 0;
    while section < 4 {
        let mut i = 0;
        while i < lands_per_section {
            let index = section * lands_per_section + i;
            let land_index = get_circle_land_position(circle, index);
            lands.append(land_index);
            i += 1;
        };
        section += 1;
    };
    return lands;
}


fn get_random_index(max: u64) -> u64 {
    let caller = get_caller_address();
    let block = get_block_number() - 1;
    let caller_felt252: felt252 = caller.into();
    let caller_u256: u256 = u256_from_felt252(caller_felt252);
    let mut data: Array<u256> = array![caller_u256, block.into()];
    let data_span = data.span();

    let index = keccak_u256s_le_inputs(data_span) % max.into();
    return index.try_into().unwrap();
}

fn get_random_available_index(circle: u64, used_lands: Array<u64>) -> u64 {
    let section_len = lands_per_section(circle);
    let rand = get_random_index(section_len.into());
    let mut index = rand;
    let mut result = 0;
    let mut tries = 0;

    while tries < section_len {
        let mut found = false;
        for i in 0..used_lands.len() {
            if *used_lands.at(i) == index {
                found = true;
                break;
            };
        };

        if !found {
            result = index;
            break;
        };

        index = (index + 1) % section_len;
        tries += 1;
    };
    return result;
}
