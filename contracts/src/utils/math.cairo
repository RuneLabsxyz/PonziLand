#[inline(always)]
pub fn u64_saturating_sub(a: u64, b: u64) -> u64 {
    if a > b {
        a - b
    } else {
        0
    }
}
