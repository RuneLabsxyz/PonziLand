use starknet::ContractAddress;
use core::nullable::{Nullable, NullableTrait, match_nullable, FromNullableResult};
use core::dict::{Felt252Dict, Felt252DictTrait, Felt252DictEntryTrait};
use ponzi_land::models::land::Land;
use ponzi_land::consts::DECIMALS_FACTOR;

fn summarize_stake_totals(
    active_lands: Span<Land>
) -> (Felt252Dict<Nullable<u256>>, Array<ContractAddress>) {
    let mut stake_totals: Felt252Dict<Nullable<u256>> = Default::default();
    let mut unique_tokens: Array<ContractAddress> = ArrayTrait::new();

    for land in active_lands {
        let land = *land;
        let token_key: felt252 = land.token_used.into();
        let prev_value = match match_nullable(stake_totals.get(token_key)) {
            FromNullableResult::Null => 0_u256,
            FromNullableResult::NotNull(val) => val.unbox(),
        };

        let new_value = prev_value + land.stake_amount;
        stake_totals.insert(token_key, NullableTrait::new(new_value));
        if prev_value == 0 {
            unique_tokens.append(land.token_used);
        }
    };

    return (stake_totals, unique_tokens);
}

fn get_total_stake_for_token(
    ref stake_totals: Felt252Dict<Nullable<u256>>, token_key: felt252
) -> u256 {
    match match_nullable(stake_totals.get(token_key)) {
        FromNullableResult::Null => 0_u256,
        FromNullableResult::NotNull(val) => val.unbox(),
    }
}

fn calculate_refund_ratio(total_stake: u256, balance: u256) -> u256 {
    if total_stake > 0 {
        (balance * DECIMALS_FACTOR) / total_stake
    } else {
        0
    }
}

fn calculate_refund_amount(stake_amount: u256, ratio: u256) -> u256 {
    (stake_amount * ratio) / DECIMALS_FACTOR
}
