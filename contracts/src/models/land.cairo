use ekubo::types::keys::PoolKey as EkuboPoolKey;
use ponzi_land::utils::common_strucs::TokenInfo;
use starknet::contract_address::ContractAddressZeroable;
/// @title Land Models for PonziLand
/// @notice Main models for representing land, staking, and pools in the PonziLand game.
use starknet::{ContractAddress, contract_address_const};

/// @notice Represents a unique piece of land in PonziLand.
/// @dev Used to track ownership, price, staking token, and progression level for each land plot.
/// * `location` - Unique identifier for the land. Used as a key for storage and all land-related
/// operations.
/// * `block_date_bought` - Timestamp of the last purchase. Used to calculate elapsed time for
/// level-ups and claims.
/// * `owner` - Current owner of the land. Used for access control and transfer logic.
/// * `sell_price` - Current price set for selling the land. Used in buy/sell/auction logic.
/// * `token_used` - ERC20 token address used for the stake and sell. Used for payment and staking
/// logic.
/// * `level` - Progression level of the land (see Level enum). Used to unlock features and affect
/// tax rates.
#[derive(Drop, Serde, Copy, Debug)]
#[dojo::model]
pub struct Land {
    #[key]
    pub location: u16, // 64 x 64 land
    pub block_date_bought: u64,
    pub owner: ContractAddress,
    pub sell_price: u256,
    pub token_used: ContractAddress,
    pub level: Level,
    pub quest_id: u64,
}

/// @notice Tracks staking and tax information for a land.
/// @dev Used to calculate rewards, taxes, and manage neighbor relationships for each land.
/// * `location` - Land identifier (matches Land.location). Used as a key for storage and staking
/// logic.
/// * `amount` - Amount of tokens staked on this land. Used for yield and claim calculations.
/// * `neighbors_info_packed` - Packed info (u128) containing: earliest claimable neighbor
/// timestamp, number of active neighbors, and location of the earliest claimable neighbor. Used for
/// efficient tax/claim calculations and neighbor management.
/// * `accumulated_taxes_fee` - Total fees accumulated but not paid yet, has to be equal or greater
/// than THRESHOLD.
#[derive(Drop, Serde, Copy)]
#[dojo::model]
pub struct LandStake {
    #[key]
    pub location: u16,
    pub amount: u256,
    pub neighbors_info_packed: u128,
    pub accumulated_taxes_fee: u128,
}


/// @notice Enum representing the progression level of a land to pay less tax.
/// @dev Used to determine tax rate and unlock features as land is upgraded.
/// * `Zero` - Initial level. Default for new land.
/// * `First` - First upgrade.
/// * `Second` - Second upgrade.
#[derive(Serde, Drop, Copy, PartialEq, Introspect, Debug, Default, DojoStore)]
pub enum Level {
    #[default]
    Zero,
    First,
    Second,
}

/// @notice Identifies a liquidity pool for land validation.
/// @dev Used for integration with Ekubo pools to validate sufficient liquidity and configure pool
/// parameters.
/// * `token0` - First token in the pool. Used for liquidity checks.
/// * `token1` - Second token in the pool. Used for liquidity checks.
/// * `fee` - Pool fee. Used in price/yield calculations.
/// * `tick_spacing` - Tick spacing for the pool. Used for pool configuration.
/// * `extension` - Extension address. Reserved for future use or advanced pool logic.
#[derive(Copy, Drop, Serde, PartialEq, Hash, Introspect, Debug)]
pub struct PoolKey {
    pub token0: ContractAddress,
    pub token1: ContractAddress,
    pub fee: u128,
    pub tick_spacing: u128,
    pub extension: ContractAddress,
}

// Impl from/to EkuboPoolKey
#[generate_trait]
impl PoolKeyConversion of PoolKeyTrait {
    /// @notice Converts an EkuboPoolKey to a PoolKey.
    /// @param pool_key The EkuboPoolKey to convert.
    /// @return PoolKey The converted PoolKey.
    #[inline(always)]
    fn from_ekubo(pool_key: EkuboPoolKey) -> PoolKey {
        PoolKey {
            token0: pool_key.token0,
            token1: pool_key.token1,
            fee: pool_key.fee,
            tick_spacing: pool_key.tick_spacing,
            extension: pool_key.extension,
        }
    }

    /// @notice Converts a PoolKey to an EkuboPoolKey.
    /// @return EkuboPoolKey The converted EkuboPoolKey.
    #[inline(always)]
    fn to_ekubo(self: PoolKey) -> EkuboPoolKey {
        EkuboPoolKey {
            token0: self.token0,
            token1: self.token1,
            fee: self.fee,
            tick_spacing: self.tick_spacing,
            extension: self.extension,
        }
    }
}


#[generate_trait]
impl LandImpl of LandTrait {
    /// @notice Creates a new Land instance with default level.
    /// @param location Land location.
    /// @param owner Owner address.
    /// @param token_used Token address used for purchase and staking.
    /// @param sell_price Price of the land.
    /// @param block_date_bought Timestamp of purchase.
    /// @return Land The new Land struct.
    #[inline(always)]
    fn new(
        location: u16,
        owner: ContractAddress,
        token_used: ContractAddress,
        sell_price: u256,
        block_date_bought: u64,
    ) -> Land {
        Land { location, owner, token_used, sell_price, block_date_bought, level: Level::Zero, quest_id: 0 }
    }

    /// @notice Checks if the land has an owner.
    /// @param self The land to check.
    /// @return bool True if the land has an owner, false otherwise.
    #[inline(always)]
    fn has_owner(self: @Land) -> bool {
        !(*self.owner).is_zero()
    }

    /// @notice Checks if the given address is the owner of the land.
    /// @param self The land to check.
    /// @param address Address to check ownership for.
    /// @return bool True if the address is the owner, false otherwise.
    #[inline(always)]
    fn is_owner(self: @Land, address: ContractAddress) -> bool {
        *self.owner == address
    }
}
