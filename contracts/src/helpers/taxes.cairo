use core::array::ArrayTrait;
use ponzi_land::consts::{DECIMALS_FACTOR, SCALE_FACTOR_FOR_FEE};
use ponzi_land::helpers::coord::max_neighbors;
use ponzi_land::models::land::{Land, LandStake};
use ponzi_land::store::{Store, StoreTrait};
use ponzi_land::utils::level_up::calculate_discount_for_level;
use starknet::{ContractAddress, get_block_timestamp};
/// @title Tax Calculation Helpers for PonziLand
/// @notice This module contains core tax calculation logic for the PonziLand game.
/// Tax calculations are based on land price, neighbor count, time elapsed, and land level
/// progression.
/// The tax system implements a yield mechanism where land owners pay taxes to neighboring land
/// owners.

/// @notice Calculates the total tax amount owed by a land to a specific neighbor
/// @dev This is the core tax calculation function that determines yield payments
/// Formula: (tax_rate_per_neighbor * elapsed_time) / base_time
/// @param land The land that owes taxes (tax payer)
/// @param elapsed_time Time elapsed since last claim in seconds
/// @param store Game configuration store containing base time and other parameters
/// @return u256 The total tax amount owed to the neighbor
#[inline(always)]
pub fn get_taxes_per_neighbor(land: @Land, elapsed_time: u64, store: Store) -> u256 {
    let tax_rate_per_neighbor = get_tax_rate_per_neighbor(land, store);

    // Calculate tax based on elapsed time proportional to base time
    let tax_per_neighbor: u256 = (tax_rate_per_neighbor * elapsed_time.into())
        / (store.get_base_time().into());

    tax_per_neighbor
}


/// @notice Calculates the tax rate per neighbor for a land (taxes per unit time)
/// @dev This determines how much tax is owed per neighbor per base time unit
/// Formula: (sell_price * tax_rate * time_speed) / (max_neighbors * 100) with level discounts
/// @param land The land that owes taxes
/// @param store Game configuration store containing tax rates and time settings
/// @return u256 The tax rate per neighbor per base time unit
/// @dev Tax rate is distributed evenly among all possible neighbors to ensure fairness
/// @dev Land level progression provides discounts: Level 1 = 10% discount, Level 2 = 15% discount
pub fn get_tax_rate_per_neighbor(land: @Land, store: Store) -> u256 {
    let max_n = max_neighbors(*land.location);
    // Corner and edge lands have fewer neighbors, so they pay proportionally less
    if max_n == 0 {
        return 0;
    }

    let discount_for_level = calculate_discount_for_level(*land.level);

    // Base tax calculation: percentage of land value distributed among neighbors
    // Divided by 100 to convert tax_rate from percentage to decimal
    let base_tax_rate = (*land.sell_price
        * store.get_tax_rate().into()
        * store.get_time_speed().into())
        / (max_n.into() * 100); // Base rate per neighbor

    // Apply level-based discount to encourage land progression
    let discounted_tax_rate = if discount_for_level > 0 {
        (base_tax_rate * (100 - discount_for_level).into()) / 100 // Apply discount percentage
    } else {
        base_tax_rate
    };

    discounted_tax_rate
}


/// @notice Calculates proportional share of remaining stake for a neighbor during nuke
/// @dev When a land is nuked (runs out of stake), remaining stake is distributed to neighbors
/// based on their proportional claim time. Uses DECIMALS_FACTOR for precision in division.
/// Formula: (individual_elapsed_time / total_elapsed_time) * stake_amount
/// @param individual_elapsed_time Time elapsed since this specific neighbor's last claim
/// @param total_elapsed_time Sum of elapsed times for all neighbors
/// @param stake_amount Total remaining stake amount to be distributed
/// @return u256 The proportional share this neighbor should receive
/// @dev This ensures fair distribution based on how long each neighbor has been accumulating taxes
#[inline(always)]
pub fn calculate_share_for_nuke(
    individual_elapsed_time: u64, total_elapsed_time: u64, stake_amount: u256,
) -> u256 {
    // Use DECIMALS_FACTOR to maintain precision during integer division
    let numerator = individual_elapsed_time.into() * stake_amount * DECIMALS_FACTOR;
    let scaled_share = numerator / total_elapsed_time.into();
    scaled_share / DECIMALS_FACTOR
}


/// @notice Calculates tax distribution with protocol fee deduction
/// @dev Splits the total tax amount between the claimer and protocol fee
/// Formula: fee = (total_amount * fee_rate) / SCALE_FACTOR_FOR_FEE
/// @param total_taxes_amount Total tax amount to be distributed
/// @param fee_rate Fee rate in basis points (e.g., 250 = 2.5%)
/// @return (u256, u128) Tuple of (amount_for_claimer, fee_amount)
/// @dev SCALE_FACTOR_FOR_FEE is used to convert basis points to percentage
/// @dev Fee is accumulated and paid out when threshold is reached to save gas
#[inline(always)]
pub fn calculate_and_return_taxes_with_fee(
    total_taxes_amount: u256, fee_rate: u128,
) -> (u256, u128) {
    // Calculate protocol fee based on fee rate (in basis points)
    let fee_amount = total_taxes_amount * fee_rate.into() / SCALE_FACTOR_FOR_FEE.into();
    let amount_for_claimer = total_taxes_amount - fee_amount;
    (amount_for_claimer, fee_amount.try_into().unwrap())
}

/// @notice Accumulates token transfer amounts with lazy deduplication
/// @dev Intelligently handles token accumulation with minimal gas overhead:
/// - Fast path for empty array: O(1) append only
/// - Single pass: O(n) iteration with O(1) operations per element
/// Optimized for typical 2-3 unique tokens per claim.
/// @param existing Existing array of (address, amount) tuples
/// @param key Address key to search and accumulate
/// @param amount Amount to add to this key
/// @return Array Updated array with key amount accumulated
#[inline(always)]
pub fn accumulate_amount_by_key(
    existing: Array<(ContractAddress, u256)>, key: ContractAddress, amount: u256,
) -> Array<(ContractAddress, u256)> {
    let len = existing.len();

    // Fast path: empty array → return new array with single element
    if len == 0 {
        let mut result: Array<(ContractAddress, u256)> = ArrayTrait::new();
        result.append((key, amount));
        return result;
    }

    let existing_span = existing.span();
    let mut updated: Array<(ContractAddress, u256)> = ArrayTrait::new();
    let mut found = false;
    let mut i = 0;

    // Single pass: iterate through all elements
    while i < len {
        let (existing_key, existing_amount) = *existing_span.at(i);

        if existing_key == key {
            // Key found: accumulate amount
            updated.append((existing_key, existing_amount + amount));
            found = true;
        } else {
            // Copy other entries unchanged
            updated.append((existing_key, existing_amount));
        }

        i += 1;
    }

    // Key not found → append new key with amount
    if !found {
        updated.append((key, amount));
    }

    updated
}
