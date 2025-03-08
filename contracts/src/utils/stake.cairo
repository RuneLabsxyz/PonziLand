use starknet::ContractAddress;
use core::nullable::{Nullable, NullableTrait, match_nullable, FromNullableResult};
use core::dict::{Felt252Dict, Felt252DictTrait, Felt252DictEntryTrait};
use ponzi_land::models::land::Land;
use ponzi_land::utils::common_strucs::{LandWithTaxes, TokenInfo};
use ponzi_land::consts::DECIMALS_FACTOR;

fn summarize_totals(
    active_lands: Span<LandWithTaxes>
) -> (Felt252Dict<Nullable<u256>>, Felt252Dict<Nullable<u256>>, Array<ContractAddress>) {
    let mut stake_totals: Felt252Dict<Nullable<u256>> = Default::default();
    let mut tax_totals: Felt252Dict<Nullable<u256>> = Default::default();
    let mut unique_tokens: Array<ContractAddress> = ArrayTrait::new();

    for land_with_taxes in active_lands {
        let land = *land_with_taxes.land;
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

        //summarize the taxes for each land
        if let Option::Some(taxes) = land_with_taxes.taxes {
            for tax in taxes
                .span() {
                    let tax = *tax;
                    let tax_key: felt252 = tax.token_address.into();
                    let prev_tax = match match_nullable(tax_totals.get(tax_key)) {
                        FromNullableResult::Null => 0_u256,
                        FromNullableResult::NotNull(val) => val.unbox(),
                    };
                    let new_tax = prev_tax + tax.amount;
                    tax_totals.insert(tax_key, NullableTrait::new(new_tax));
                }
        }
    };

    return (stake_totals, tax_totals, unique_tokens);
}

fn get_total_stake_for_token(
    ref stake_totals: Felt252Dict<Nullable<u256>>, token_key: felt252
) -> u256 {
    match match_nullable(stake_totals.get(token_key)) {
        FromNullableResult::Null => 0_u256,
        FromNullableResult::NotNull(val) => val.unbox(),
    }
}

fn get_total_tax_for_token(
    ref tax_totals: Felt252Dict<Nullable<u256>>, token_key: felt252
) -> u256 {
    match match_nullable(tax_totals.get(token_key)) {
        FromNullableResult::Null => 0_u256,
        FromNullableResult::NotNull(val) => val.unbox(),
    }
}


fn calculate_refund_ratio(total: u256, balance: u256) -> u256 {
    if total > 0 {
        (balance * DECIMALS_FACTOR) / total
    } else {
        0
    }
}

fn calculate_refund_amount(amount: u256, ratio: u256) -> u256 {
    (amount * ratio) / DECIMALS_FACTOR
}


fn adjust_land_taxes(
    land_with_taxes: @LandWithTaxes, token_address: ContractAddress, ratio: u256
) -> LandWithTaxes {
    let mut updated_taxes: Option<Array<TokenInfo>> = Option::None;

    if let Option::Some(original_taxes) = land_with_taxes.taxes {
        let mut adjusted_taxes: Array<TokenInfo> = ArrayTrait::new();

        for current_tax in original_taxes
            .span() {
                let current_tax = *current_tax;
                let adjusted_amount = if current_tax.token_address == token_address {
                    calculate_refund_amount(current_tax.amount, ratio)
                } else {
                    current_tax.amount
                };

                adjusted_taxes
                    .append(
                        TokenInfo {
                            token_address: current_tax.token_address, amount: adjusted_amount
                        }
                    );
            };

        updated_taxes = Option::Some(adjusted_taxes);
    }

    LandWithTaxes { land: *land_with_taxes.land, taxes: updated_taxes }
}
