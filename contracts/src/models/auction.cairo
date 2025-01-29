use starknet::get_block_timestamp;
use ponzi_land::consts::{PRICE_DECREASE_RATE, TIME_SPEED};


const SECONDS_IN_WEEK: u256 = 7 * 24 * 60 * 60; // 1 week in seconds
const INITIAL_MULTIPLIER: u256 = 1_000_000_000_000_000_000; // 10^18
const SCALING_FACTOR: u8 = 50;

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Auction {
    // id:u64 // this can be the key with location, we have to see if we prefer this or with the
    // start_time
    #[key]
    pub land_location: u64, // 64 x 64 land
    //the start_time can be the other key
    pub start_time: u64,
    pub start_price: u256,
    pub floor_price: u256,
    pub is_finished: bool,
    pub decay_rate: u64
}

#[generate_trait]
impl AuctionImpl of AuctionTrait {
    #[inline(always)]
    fn new(
        land_location: u64, start_price: u256, floor_price: u256, is_finished: bool, decay_rate: u64
    ) -> Auction {
        Auction {
            land_location,
            start_time: get_block_timestamp(),
            start_price,
            floor_price,
            is_finished,
            decay_rate
        }
    }

    //TODO:REMOVE THIS AFTER TESTS
    #[inline(always)]
    fn get_current_price(self: Auction) -> u256 {
        let current_time = get_block_timestamp();

        let time_passed = if current_time > self.start_time {
            (current_time - self.start_time) * TIME_SPEED.into()
        } else {
            0
        };

        //the price will decrease 2% every 2 minutes (for tests)
        let total_decrease = self.start_price
            * PRICE_DECREASE_RATE.into()
            * time_passed.into()
            / (100 * 120);

        let decremented_price = if self.start_price > total_decrease {
            self.start_price - total_decrease
        } else {
            0
        };

        if decremented_price <= self.floor_price {
            return self.floor_price;
        }

        decremented_price
    }

    // Formula: P(t) = P0 * (1 / (1 + k*t))^2

    // P0:(start_price)
    // m: (floor_price)
    // k: (decay_rate)
    // t: (progress__time)

    #[inline(always)]
    fn get_current_price_decay_rate(self: Auction) -> u256 {
        let current_time = get_block_timestamp();
        let time_passed = if current_time > self.start_time {
            (current_time - self.start_time) * TIME_SPEED.into()
        } else {
            0
        };

        // if the auction has passed a week, the price is 0
        if time_passed.into() >= SECONDS_IN_WEEK {
            return 0;
        }

        // Scale the time passed by INITIAL_MULTIPLIER to maintain precision in integer math
        let progress__time: u256 = (time_passed.into() * INITIAL_MULTIPLIER / SECONDS_IN_WEEK)
            .into();

        // k is the decay rate (adjusted by INITIAL_MULTIPLIER for scaling)
        let k: u256 = (self.decay_rate.into() * INITIAL_MULTIPLIER)
            / SCALING_FACTOR.into(); // 4 * 10^18 / 50

        // Calculate the denominator (1 + k * t) using scaled values for precision
        let denominator = INITIAL_MULTIPLIER + (k * progress__time / INITIAL_MULTIPLIER);

        // Calculate the decay factor using the formula (1 / (1 + k * t))^2
        // Ensure denominator is not zero to avoid division by zero errors
        let decay_factor = if denominator != 0 {
            let temp = (INITIAL_MULTIPLIER * INITIAL_MULTIPLIER) / denominator;
            (temp * temp) / INITIAL_MULTIPLIER
        } else {
            0
        };

        // current price
        self.start_price * decay_factor / INITIAL_MULTIPLIER
    }
}

#[cfg(test)]
mod tests {
    use super::{Auction, AuctionTrait, SECONDS_IN_WEEK};
    use starknet::testing::{set_contract_address, set_block_timestamp, set_caller_address};
    use ponzi_land::consts::TIME_SPEED;

    // Simulate the price points of an auction over time with a decay rate of 2
    fn simulate_price_points() -> Array<(u64, u256)> {
        set_block_timestamp(0);
        let auction = AuctionTrait::new(1, 1000000, 0, false, 100);

        let mut price_points: Array<(u64, u256)> = ArrayTrait::new();

        // Time points to check the price
        let time_points = array![
            0,
            1 * 60 * 60, // 1h
            6 * 60 * 60, // 6hs
            12 * 60 * 60, // 12hs
            24 * 60 * 60, // 1 days
            36 * 60 * 60, // 1.5 days
            48 * 60 * 60, // 2 days
            72 * 60 * 60, // 3 days
            120 * 60 * 60, // 5 days
            7 * 24 * 60 * 60 // 1 week
        ];

        let mut i = 0;
        while i < time_points.len() {
            let time: u64 = *time_points[i] / TIME_SPEED.into();
            set_block_timestamp(time);
            let price = auction.get_current_price_decay_rate();

            price_points.append((time * TIME_SPEED.into(), price));
            i += 1;
        };
        price_points
    }


    #[test]
    fn test_price() {
        //                                      time, price
        assert_eq!(*simulate_price_points()[0], (0, 1000000), "err in the first price");
        //                                        1h
        assert_eq!(*simulate_price_points()[1], (1 * 60 * 60, 976608), "err in the 2dn price");
        //                                        6h
        assert_eq!(*simulate_price_points()[2], (6 * 60 * 60, 871111), "err in the 3rd price");
        //                                        12h
        assert_eq!(*simulate_price_points()[3], (12 * 60 * 60, 765625), "err in the 4th price");
        //                                        1day
        assert_eq!(*simulate_price_points()[4], (24 * 60 * 60, 604938), "err in the 5th price");
        assert_eq!(*simulate_price_points()[5], (36 * 60 * 60, 490000), "err in the 6th price");
        //                                        2days
        assert_eq!(*simulate_price_points()[6], (48 * 60 * 60, 404958), "err in the 7th price");
        //                                        3days
        assert_eq!(*simulate_price_points()[7], (72 * 60 * 60, 289940), "err in the 8th price");
        //                                        5days
        assert_eq!(*simulate_price_points()[8], (120 * 60 * 60, 169550), "err in the 9th price");
        //                                         1week
        assert_eq!(*simulate_price_points()[9], (7 * 24 * 60 * 60, 0));
    }
}
