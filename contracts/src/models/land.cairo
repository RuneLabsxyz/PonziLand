use starknet::ContractAddress;
use starknet::contract_address::ContractAddressZeroable;
use ponzi_land::utils::common_strucs::{TokenInfo};


#[derive(Drop, Serde, Debug, Copy)]
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
        }
    }
}
