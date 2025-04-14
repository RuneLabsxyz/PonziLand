use starknet::get_block_timestamp;
use ponzi_land::consts::{
    PRICE_DECREASE_RATE, TIME_SPEED, DECIMALS_FACTOR, AUCTION_DURATION, SCALING_FACTOR,
    RATE_DENOMINATOR, LINEAR_DECAY_TIME, DROP_RATE,
};

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Auction {
    // id:u64 // this can be the key with location, we have to see if we prefer this or with the
    // start_time
    #[key]
    pub land_location: u16, // 64 x 64 land
    //the start_time can be the other key
    pub start_time: u64,
    pub start_price: u256,
    pub floor_price: u256,
    pub is_finished: bool,
    pub decay_rate: u16,
    pub sold_at_price: Option<u256>,
}

#[generate_trait]
impl AuctionImpl of AuctionTrait {
    #[inline(always)]
    fn new(
        land_location: u16,
        start_price: u256,
        floor_price: u256,
        is_finished: bool,
        decay_rate: u16,
    ) -> Auction {
        Auction {
            land_location,
            start_time: get_block_timestamp(),
            start_price,
            floor_price,
            is_finished,
            decay_rate,
            sold_at_price: Option::None,
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
        if time_passed >= AUCTION_DURATION.into() {
            return 0;
        }

        let mut current_price: u256 = self.start_price;

        //for the first minutes we use a linear decay
        if time_passed <= LINEAR_DECAY_TIME.into() {
            let time_fraction = time_passed.into() * DECIMALS_FACTOR / LINEAR_DECAY_TIME.into();

            let linear_factor = DECIMALS_FACTOR
                - (DROP_RATE.into() * time_fraction / RATE_DENOMINATOR.into()).into();

            current_price = self.start_price * linear_factor / DECIMALS_FACTOR;
        } else {
            // Scale the time passed by DECIMALS_FACTOR to maintain precision in integer math
            let remaining_rate = RATE_DENOMINATOR - DROP_RATE;
            let price_after_linear = self.start_price
                * remaining_rate.into()
                / RATE_DENOMINATOR.into();

            let progress__time: u256 = (time_passed.into()
                * DECIMALS_FACTOR
                / AUCTION_DURATION.into())
                .into();

            // k is the decay rate (adjusted by DECIMALS_FACTOR for scaling)
            let k: u256 = (self.decay_rate.into() * DECIMALS_FACTOR)
                / SCALING_FACTOR.into(); // 4 * 10^18 / 50

            // Calculate the denominator (1 + k * t) using scaled values for precision
            let denominator = DECIMALS_FACTOR + (k * progress__time / DECIMALS_FACTOR);

            // Calculate the decay factor using the formula (1 / (1 + k * t))^2
            // Ensure denominator is not zero to avoid division by zero errors
            let decay_factor = if denominator != 0 {
                let temp = (DECIMALS_FACTOR * DECIMALS_FACTOR) / denominator;
                (temp * temp) / DECIMALS_FACTOR
            } else {
                0
            };

            current_price = price_after_linear * decay_factor / DECIMALS_FACTOR;
        }

        if current_price > self.floor_price {
            current_price
        } else {
            self.floor_price
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{Auction, AuctionTrait, AUCTION_DURATION};
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
            2 * 60, //2min
            5 * 60, //5min
            8 * 60, //8min
            10 * 60, //10min
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
            // While the tests are dependent on constants, use the following code to get the price
            // points:
            // print!("idx: {}, Price: {}\n", i, price);

            price_points.append((time * TIME_SPEED.into(), price));
            i += 1;
        };
        price_points
    }


    #[test]
    fn test_price() {
        let price_points = simulate_price_points();
        //                                      time, price
        assert_eq!(*price_points[0], (0, 1000000), "err in the first price");
        //                                        2min
        assert_eq!(*price_points[1], (2 * 60, 991000), "err in the 2nd price");
        //                                        5min
        assert_eq!(*price_points[2], (5 * 60, 977500), "err in the 3rd price");
        //                                        8min
        assert_eq!(*price_points[3], (8 * 60, 964000), "err in the 4th price");
        //                                        10min
        assert_eq!(*price_points[4], (10 * 60, 955000), "err in the 5th price");
        //                                        1h
        assert_eq!(*price_points[5], (1 * 60 * 60, 730000), "err in the 6th price");
        //                                        6h
        assert_eq!(*price_points[6], (6 * 60 * 60, 87111), "err in the 7th price");
        //                                        12h
        assert_eq!(*price_points[7], (12 * 60 * 60, 76562), "err in the 8th price");
        //                                        1day
        assert_eq!(*price_points[8], (24 * 60 * 60, 60493), "err in the 9th price");

        assert_eq!(*price_points[9], (36 * 60 * 60, 49000), "err in the 10th price");
        //                                        2days
        assert_eq!(*price_points[10], (48 * 60 * 60, 40495), "err in the 11th price");
        //                                        3days
        assert_eq!(*price_points[11], (72 * 60 * 60, 28994), "err in the 12th price");
        //                                        5days
        assert_eq!(*price_points[12], (120 * 60 * 60, 16955), "err in the 13th price");
        //                                         1week
        assert_eq!(*price_points[13], (7 * 24 * 60 * 60, 0), "err in the 14th price");
    }
}
