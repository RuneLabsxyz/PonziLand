use ponzi_land::consts::{FOUR_DAYS_IN_SECONDS, TWO_DAYS_IN_SECONDS};
use ponzi_land::models::land::Level;

fn calculate_discount_for_level(level: Level) -> u16 {
    let discount_for_level: u16 = match level {
        Level::Zero => 0,
        Level::First => 10,
        Level::Second => 15,
    };
    discount_for_level
}

fn calculate_new_level(elapsed_time: u64) -> Level {
    if elapsed_time >= FOUR_DAYS_IN_SECONDS.into() {
        Level::Second
    } else if elapsed_time >= TWO_DAYS_IN_SECONDS.into() {
        Level::First
    } else {
        Level::Zero
    }
}
