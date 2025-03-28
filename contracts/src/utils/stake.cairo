use ponzi_land::consts::DECIMALS_FACTOR;

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
