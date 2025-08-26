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


#[inline(always)]
pub fn u256_saturating_mul(a: u256, b: u256) -> u256 {
    let max_u256 = Bounded::<u256>::MAX;

    // Check for zero to avoid division by zero
    if a == 0 || b == 0 {
        return 0;
    }

    // Check if multiplication would overflow
    if a > max_u256 / b {
        max_u256
    } else {
        a * b
    }
}
