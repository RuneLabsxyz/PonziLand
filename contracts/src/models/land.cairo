use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Land {
    #[key]
    pub location: u64, // 64 x 64 land
    pub block_date_bought: u64,
    pub owner: ContractAddress,
    pub sell_price: u256,
    pub token_used: ContractAddress,
    pub pool_key: ContractAddress, // The Liquidity Pool Key
    //we will use this for taxes
    pub last_pay_time: u64,
    pub stake_amount: u256,
    pub level: Level,
}

#[derive(Serde, Drop, Copy, PartialEq, Introspect, Debug)]
pub enum Level {
    None,
    First,
    Second,
}


#[generate_trait]
impl LandImpl of LandTrait {
    #[inline(always)]
    fn new(
        location: u64,
        owner: ContractAddress,
        token_used: ContractAddress,
        sell_price: u256,
        pool_key: ContractAddress,
        last_pay_time: u64,
        block_date_bought: u64,
        stake_amount: u256,
    ) -> Land {
        Land {
            location,
            owner,
            token_used,
            sell_price,
            pool_key,
            last_pay_time,
            block_date_bought,
            stake_amount,
            level: Level::None,
        }
    }
}
