use starknet::get_block_timestamp;
use ponzi_land::consts::PRICE_DECREASE_RATE;
#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Auction {
    // id:u64 // this can be the key with location, we have to see if we prefer this or with the
    // start_time
    #[key]
    pub land_location: u64, // 64 x 64 land
    //the start_time can be the other key
    pub start_time: u64,
    pub start_price: u64,
    pub floor_price: u64,
    pub is_finished: bool,
}

#[generate_trait]
impl AuctionImpl of AuctionTrait {
    #[inline(always)]
    fn new(land_location: u64, start_price: u64, floor_price: u64, is_finished: bool,) -> Auction {
        Auction {
            land_location, start_time: get_block_timestamp(), start_price, floor_price, is_finished,
        }
    }

    #[inline(always)]
    fn get_current_price(self: Auction) -> u64 {
        let current_time = get_block_timestamp();

        let time_passed = if current_time > self.start_time {
            current_time - self.start_time
        } else {
            0
        };

        //the price will decrease 2% every 2 minutes (for tests)
        let total_decrease = self.start_price * PRICE_DECREASE_RATE * time_passed / (100 * 120);

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
}
