/// @title Auction Model for PonziLand
/// @notice Model for representing land auctions in PonziLand.
use starknet::get_block_timestamp;
use ponzi_land::consts::{DECIMALS_FACTOR};
use ponzi_land::store::{Store, StoreTrait};

/// @notice Represents an auction for a land.
/// @dev Used to manage the auction lifecycle, price decay, and record the final sale price for each
/// land.
/// * `land_location` - Unique identifier for the land being auctioned. Used as a key for storage
/// and auction logic.
/// * `start_time` - Timestamp when the auction started. Used for price decay and auction duration.
/// * `start_price` - Initial price of the auction. Used as the starting point for price decay.
/// * `floor_price` - Minimum price the auction can reach. Used as a lower bound for price decay.
/// * `is_finished` - Whether the auction has ended. Used to control auction state and logic.
/// * `decay_rate` - Rate at which the auction price decays over time. Used in price calculation
/// formulas.
/// * `sold_at_price` - The price at which the auction was finalized. Used for price history and to
/// calculate average prices for new auctions.
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Auction {
    #[key]
    pub land_location: u16,
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


    /// @notice Calculates the current price of the auction based on the decay rate and time passed
    #[inline(always)]
    fn get_current_price_decay_rate(self: Auction, store: Store) -> u256 {
        let current_time = get_block_timestamp();
        let time_passed = if current_time > self.start_time {
            (current_time - self.start_time) * store.get_time_speed().into()
        } else {
            0
        };

        // if the auction has passed the duration, the price is 0
        if time_passed >= store.get_auction_duration().into() {
            return 0;
        }

        let mut current_price: u256 = self.start_price;
        let linear_decay_time = store.get_linear_decay_time();
        let drop_rate = store.get_drop_rate();
        let rate_denominator = store.get_rate_denominator();
        let decimals_factor = DECIMALS_FACTOR;

        //for the first minutes we use a linear decay
        if time_passed <= linear_decay_time.into() {
            let time_fraction = time_passed.into() * decimals_factor / linear_decay_time.into();

            let linear_factor = decimals_factor
                - (drop_rate.into() * time_fraction / rate_denominator.into()).into();

            current_price = self.start_price * linear_factor / decimals_factor;
        } else {
            // Scale the time passed by decimals_factor to maintain precision in integer math
            let remaining_rate = rate_denominator - drop_rate;
            let price_after_linear = self.start_price
                * remaining_rate.into()
                / rate_denominator.into();

            let progress__time: u256 = (time_passed.into()
                * decimals_factor
                / store.get_auction_duration().into())
                .into();

            // k is the decay rate (adjusted by decimals_factor for scaling)
            let k: u256 = (self.decay_rate.into() * decimals_factor)
                / store.get_scaling_factor().into();

            // Calculate the denominator (1 + k * t) using scaled values for precision
            let denominator = decimals_factor + (k * progress__time / decimals_factor);

            // Calculate the decay factor using the formula (1 / (1 + k * t))^2
            // Ensure denominator is not zero to avoid division by zero errors
            let decay_factor = if denominator != 0 {
                let temp = (decimals_factor * decimals_factor) / denominator;
                (temp * temp) / decimals_factor
            } else {
                0
            };

            current_price = price_after_linear * decay_factor / decimals_factor;
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
    use super::{Auction, AuctionTrait};
    use starknet::testing::{set_contract_address, set_block_timestamp, set_caller_address};
    use ponzi_land::tests::setup::{setup, setup::{create_setup}};
    use ponzi_land::store::{Store, StoreTrait};


    // Simulate the price points of an auction over time with a decay rate of 2
    fn simulate_price_points() -> Array<(u64, u256)> {
        let (world, _, _, _, _, _, _, _) = create_setup();
        let store = StoreTrait::new(world);
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
            let time: u64 = *time_points[i] / store.get_time_speed().into();
            set_block_timestamp(time);
            let price = auction.get_current_price_decay_rate(store);
            // While the tests are dependent on constants, use the following code to get the price
            // points:
            // print!("idx: {}, Price: {}\n", i, price);

            price_points.append((time * store.get_time_speed().into(), price));
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
