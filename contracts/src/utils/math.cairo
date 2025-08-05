use core::num::traits::Bounded;

#[inline(always)]
pub fn u64_saturating_sub(a: u64, b: u64) -> u64 {
    if a > b {
        a - b
    } else {
        0
    }
}

#[inline(always)]
pub fn u64_saturating_add(a: u64, b: u64) -> u64 {
    let max_u64 = Bounded::<u64>::MAX;
    if a > max_u64 - b {
        max_u64
    } else {
        a + b
    }
}
