// Required, as the uint macro overrides that function.
#![allow(clippy::manual_div_ceil)]

use ekubo_sdk::math::uint::U256;
use std::fmt::Binary;
use std::ops::{Not, Sub};
use std::{
    fmt::Display,
    ops::{Add, Div, Mul},
};

/// Price is a u256 with a fixed point decimal representation of 128 bits for the decimal portion.
/// This means the value is interpreted as: whole_number * 2^128
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct U256FD128(U256);

uint::construct_uint! {
    pub struct U512(8);
}

impl Binary for U512 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for i in (0..8).rev() {
            write!(f, "{:064b}", self.0[i])?;
        }
        Ok(())
    }
}

impl Binary for U256FD128 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for i in (0..4).rev() {
            write!(f, "{:064b}", self.0 .0[i])?;
        }
        Ok(())
    }
}

impl From<U256> for U512 {
    fn from(value: U256) -> Self {
        let sign = value.0[3] >> 63 == 1; // Gets the MSB of the current val
        let expanded = if sign { 0u64.not() } else { 0u64 };

        let value = [
            value.0[0], value.0[1], value.0[2], value.0[3], expanded, expanded, expanded, expanded,
        ];

        U512(value)
    }
}

impl From<U512> for U256 {
    fn from(value: U512) -> Self {
        let input = value.0;

        let result = U256([input[0], input[1], input[2], input[3]]);

        // Check if the number is sign-extended properly
        let sign_bit = (result.0[3] >> 63) == 1;
        let expected_high_value = if sign_bit { u64::MAX } else { 0 };

        // Check all higher words at once
        if input[4..8].iter().all(|&word| word == expected_high_value) {
            result
        } else {
            panic!("Downcast overflow from U512 to U256");
        }
    }
}

impl From<starknet::core::types::U256> for U256FD128 {
    fn from(value: starknet::core::types::U256) -> Self {
        Self(U256::from(value.high()) << 128 | U256::from(value.low()))
    }
}

impl From<U256FD128> for f64 {
    fn from(value: U256FD128) -> Self {
        let sign = if value.is_negative() { -1.0 } else { 1.0 };
        let abs_val = value.abs();

        // Extract whole number part (bits above 128)
        let whole = (abs_val.0 >> 128).as_u128() as f64;

        // Extract fractional part (bits 0-127)
        let frac_bits = abs_val.0 & ((U256::one() << 128) - U256::one());
        let frac = if !frac_bits.is_zero() {
            // Convert fraction bits to f64, maintaining precision
            let frac_f64 = frac_bits.as_u128() as f64;
            frac_f64 / 2.0f64.powi(128)
        } else {
            0.0
        };

        sign * (whole + frac)
    }
}

impl U256FD128 {
    const DECIMAL_BITS: u32 = 128;

    /// Creates a new U256FD128 from a raw U256 value
    pub fn new(value: U256) -> Self {
        Self(value)
    }

    /// Creates a U256FD128 from a whole number
    pub fn from_whole(value: u128) -> Self {
        Self(U256::from(value) << Self::DECIMAL_BITS)
    }

    /// Get the raw underlying U256 value
    pub fn raw(&self) -> U256 {
        self.0
    }

    pub fn neg(&self) -> Self {
        Self(!self.0 + U256::one())
    }

    pub fn is_negative(&self) -> bool {
        (self.0 >> (256 - 1)) == U256::one()
    }

    pub fn sign(&self) -> i8 {
        if self.0 == U256::zero() {
            0
        } else if self.is_negative() {
            -1
        } else {
            1
        }
    }

    pub fn abs(&self) -> Self {
        if self.is_negative() {
            // Two's complement: invert all bits and add 1
            Self(self.0.overflowing_neg().0)
        } else {
            *self
        }
    }

    pub const ZERO: Self = Self(U256::zero());

    /// Calculates the square root of the number using Newton-Raphson method
    /// Panics if the number is negative
    pub fn sqrt(&self) -> Self {
        if self.is_negative() {
            panic!("Cannot calculate square root of negative number");
        }

        if self.0 == U256::zero() {
            return Self::ZERO;
        }

        // Start with x = 1
        let mut result = U256FD128::from_whole(1);

        // Error threshold of approximately 0.001 in our fixed-point representation
        let error = U256FD128::new(U256::from(1u128) << 118); // ~0.001 * 2^128

        for _ in 0..20 {
            // Check if we've reached desired precision
            let diff = (result.squared() - *self).abs();
            if diff <= error {
                break;
            }

            // x = 0.5 * (x + value/x)
            let half = U256FD128::new(U256::from(1u128) << 127); // 0.5 in fixed point
            result = half * (result + (*self / result));
        }

        result
    }

    /// Calculates the square of the number
    pub fn squared(&self) -> Self {
        *self * *self
    }
}
impl Div for U256FD128 {
    type Output = Self;

    fn div(self, rhs: Self) -> Self::Output {
        if rhs.0 == U256::zero() {
            panic!("Division by zero");
        }

        // Determine sign of result
        let result_is_negative = self.is_negative() != rhs.is_negative();

        // Get absolute values
        let lhs_abs = self.abs();
        let rhs_abs = rhs.abs();

        // Convert to U512 and shift left by DECIMAL_BITS to maintain precision
        let lhs = U512::from(lhs_abs.0) << Self::DECIMAL_BITS;
        let rhs = U512::from(rhs_abs.0);

        // Perform the division
        let result = lhs / rhs;

        // Convert back to U256
        let result = U256FD128(U256::from(result));

        // Apply the correct sign
        if result_is_negative {
            result.neg()
        } else {
            result
        }
    }
}

impl Mul for U256FD128 {
    type Output = Self;

    fn mul(self, other: Self) -> Self::Output {
        let lhs = U512::from(self.abs().0);
        let rhs = U512::from(other.abs().0);

        let result = (lhs * rhs) >> Self::DECIMAL_BITS;

        let result = if self.sign() != other.sign() {
            result.overflowing_neg().0
        } else {
            result
        };

        let result = U256FD128(U256::from(result));

        if self.sign() == other.sign() && result.sign() == -1
            || self.sign() != other.sign() && result.sign() == 1
        {
            panic!("Multiplication overflow");
        }

        result
    }
}

impl Add for U256FD128 {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        let (result, _) = self.0.overflowing_add(rhs.0);
        let result = Self(result);

        // Check for overflow based on operand signs
        if !self.is_negative() && !rhs.is_negative() && result.is_negative() {
            panic!("Addition overflow: positive + positive = negative");
        }
        if self.is_negative() && rhs.is_negative() && !result.is_negative() {
            panic!("Addition overflow: negative + negative = positive");
        }

        result
    }
}

impl Sub for U256FD128 {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        let (result, _) = self.0.overflowing_sub(rhs.0);
        let result = Self(result);

        // Check for overflow based on operand signs
        if !self.is_negative() && rhs.is_negative() && result.is_negative() {
            panic!("Subtraction overflow: positive - negative = negative");
        }
        if self.is_negative() && !rhs.is_negative() && !result.is_negative() {
            panic!("Subtraction overflow: negative - positive = positive");
        }

        result
    }
}

impl Display for U256FD128 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.is_negative() {
            write!(f, "-")?;
        }

        let abs_val = self.abs();
        let whole = abs_val.0 >> 128;

        let mut decimals = String::new();
        let mut acc = abs_val.0 & ((U256::one() << 128) - 1); // Get only the fractional part

        if !acc.is_zero() {
            decimals.push('.');
        }

        let max_decimals = f.precision().unwrap_or(18);

        for _ in 0..max_decimals {
            if acc.is_zero() {
                break;
            }

            acc *= 10;
            let digit = (acc >> 128).as_u32() as u8;
            decimals.push((b'0' + digit) as char);
            acc &= (U256::one() << 128) - 1; // Clear the fractional part, again
        }

        write!(f, "{}{}", whole, decimals)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Helper function to check if two values are approximately equal
    fn is_close(a: &U256FD128, b: &U256FD128) -> bool {
        // Allow for ~0.0001% error margin (epsilon = 2^115)
        let epsilon = U256FD128::new(U256::from(1u128) << 118);
        ((*a - *b).abs()) <= epsilon
    }

    #[test]
    fn test_division() {
        // Test 1: 1.0 / 1.0 = 1.0
        let one = U256FD128::from_whole(1);
        assert_eq!((one / one).raw(), one.raw());

        // Test 2: 6.0 / 2.0 = 3.0
        let two = U256FD128::from_whole(2);
        let three = U256FD128::from_whole(3);
        let six = U256FD128::from_whole(6);
        assert_eq!((six / two).raw(), three.raw());

        // Test 3: 0.25 / 0.5 = 0.5
        let half = U256FD128::new(U256::from(1u128) << 127); // 2^127 represents 0.5
        let quarter = U256FD128::new(U256::from(1u128) << 126); // 2^126 represents 0.25
        assert_eq!((quarter / half).raw(), half.raw());

        // Test 4: Division by very small number
        let tiny = U256FD128::new(U256::from(1u128)); // Smallest positive value
        let large = U256FD128::from_whole(1);
        assert_eq!((tiny / large).raw(), tiny.raw()); // tiny/1 = tiny

        // Test 5: Large number division
        let large = U256FD128::from_whole((1u128 << 64) - 1);
        assert_eq!((large / one).raw(), large.raw()); // Large / 1 = Large

        // Test 6: Division by zero should panic
        let should_panic = std::panic::catch_unwind(|| one / U256FD128::ZERO);
        assert!(should_panic.is_err(), "Expected division by zero to panic");
    }

    #[test]
    fn test_display() {
        let price = U256FD128::from_whole(123456789);
        assert_eq!(price.to_string(), "123456789");

        let price = U256FD128::from_whole(1) / U256FD128::from_whole(4);
        assert_eq!(price.to_string(), "0.25");

        // Test negative numbers
        let neg_price = U256FD128::from_whole(123456789).neg();
        assert_eq!(neg_price.to_string(), "-123456789");

        let neg_frac = U256FD128::new(!U256FD128::from_whole(1).0 + U256::one());
        assert_eq!(neg_frac.to_string(), "-1");
    }

    #[test]
    fn test_sign_and_abs() {
        let zero = U256FD128::ZERO;
        assert_eq!(zero.sign(), 0);
        assert_eq!(zero.abs(), zero);

        let one = U256FD128::from_whole(1);
        assert_eq!(one.sign(), 1);
        assert_eq!(one.abs(), one);

        let neg_one = U256FD128::new(!one.0 + U256::one());
        assert_eq!(neg_one.sign(), -1);
        assert_eq!(neg_one.abs(), one);
        assert!(neg_one.is_negative());

        let large = U256FD128::from_whole(123456789);
        let neg_large = U256FD128::new(!large.0 + U256::one());
        assert_eq!(neg_large.sign(), -1);
        assert_eq!(neg_large.abs(), large);
        assert!(neg_large.is_negative());
    }

    #[test]
    fn test_multiplication() {
        // Test 1: 1.0 * 1.0 = 1.0
        let one = U256FD128::from_whole(1);
        assert_eq!((one * one).raw(), one.raw());

        // Test 2: 2.0 * 3.0 = 6.0
        let two = U256FD128::from_whole(2);
        let three = U256FD128::from_whole(3);
        let six = U256FD128::from_whole(6);
        assert_eq!((two * three).raw(), six.raw());

        // Test 3: 0.5 * 0.5 = 0.25
        let half = U256FD128::new(U256::from(1u128) << 127); // 2^127 represents 0.5
        let quarter = U256FD128::new(U256::from(1u128) << 126); // 2^126 represents 0.25
        assert_eq!((half * half).raw(), quarter.raw());

        // Test 4: Very small number multiplication
        let tiny = U256FD128::new(U256::from(1u128)); // Smallest positive value
        assert_eq!((tiny * tiny).raw(), U256::from(0u128)); // Should round to 0

        // Test 5: Large number multiplication (near max)
        let large = U256FD128::from_whole((1u128 << 64) - 1);
        assert_eq!((large * one).raw(), large.raw()); // Large * 1 = Large

        // Test 6: Mixed large and small
        let large_half = U256FD128::new((U256::from(1u128) << 127) + (U256::from(1u128) << 191));
        let expected = U256FD128::new((U256::from(1u128) << 190) + (U256::from(1u128) << 126));
        assert_eq!((large_half * half).raw(), expected.raw());

        // Test 7: Overflow check
        let max = U256FD128::new(U256::MAX >> 1); // Left shift to get the biggest integer
        let should_panic = std::panic::catch_unwind(|| max * max);
        assert!(
            should_panic.is_err(),
            "Expected multiplication overflow to panic"
        );
    }

    #[test]
    fn test_sqrt() {
        // Test 1: sqrt(1) = 1
        let one = U256FD128::from_whole(1);
        assert!(
            is_close(&one.sqrt(), &one),
            "Expected sqrt(1) to be close to 1, but was {}",
            one.sqrt()
        );

        // Test 2: sqrt(4) = 2
        let two = U256FD128::from_whole(2);
        let four = U256FD128::from_whole(4);
        assert!(
            is_close(&four.sqrt(), &two),
            "Expected sqrt(4) to be close to 2, but was {}",
            four.sqrt()
        );

        // Test 3: sqrt(0.25) = 0.5
        let half = U256FD128::new(U256::from(1u128) << 127); // 0.5
        let quarter = U256FD128::new(U256::from(1u128) << 126); // 0.25
        assert!(
            is_close(&quarter.sqrt(), &half),
            "Expected sqrt(0.25) to be close to 0.5, but was {}",
            quarter.sqrt()
        );

        // Test 4: sqrt(0) = 0 (exact comparison is fine for zero)
        assert_eq!(U256FD128::ZERO.sqrt().raw(), U256::zero());

        // Test 5: sqrt of a large number
        let large = U256FD128::from_whole(1_000_000);
        let sqrt_large = U256FD128::from_whole(1_000);
        assert!(
            is_close(&large.sqrt(), &sqrt_large),
            "Expected sqrt(1000000) to be close to 1000, but was {}",
            large.sqrt()
        );
    }

    #[test]
    fn test_squared() {
        // Test 1: 1² = 1
        let one = U256FD128::from_whole(1);
        assert_eq!(one.squared().raw(), one.raw(), "Expected 1² to equal 1");

        // Test 2: 2² = 4
        let two = U256FD128::from_whole(2);
        let four = U256FD128::from_whole(4);
        assert_eq!(two.squared().raw(), four.raw(), "Expected 2² to equal 4");

        // Test 3: 0.5² = 0.25
        let half = U256FD128::new(U256::from(1u128) << 127); // 0.5
        let quarter = U256FD128::new(U256::from(1u128) << 126); // 0.25
        assert_eq!(
            half.squared().raw(),
            quarter.raw(),
            "Expected 0.5² to equal 0.25"
        );

        // Test 4: 0² = 0
        let squared = U256FD128::ZERO.squared();
        assert_eq!(
            squared.raw(),
            U256::zero(),
            "Expected 0² to equal 0, but was {}",
            squared
        );
    }

    #[test]
    fn test_negative_multiplication() {
        let one = U256FD128::from_whole(1);
        let neg_one = one.neg();

        // Test: (-1) * (-1) = 1
        assert_eq!(
            (neg_one * neg_one).raw(),
            one.raw(),
            "Expected (-1) * (-1) to equal 1"
        );

        // Test: (-1) * 1 = -1
        assert_eq!((neg_one * one).raw(), neg_one.raw());

        // Test: 1 * (-1) = -1
        assert_eq!((one * neg_one).raw(), neg_one.raw());

        // Test with decimals
        let half = U256FD128::new(U256::from(1u128) << 127); // 0.5
        let neg_half = U256FD128::new(!half.0 + U256::one());
        let quarter = U256FD128::new(U256::from(1u128) << 126); // 0.25

        // Test: (-0.5) * (-0.5) = 0.25
        assert_eq!((neg_half * neg_half).raw(), quarter.raw());

        // Test: (-0.5) * 0.5 = -0.25
        let neg_quarter = U256FD128::new(!quarter.0 + U256::one());
        assert_eq!((neg_half * half).raw(), neg_quarter.raw());
    }

    #[test]
    fn test_negative_division() {
        let one = U256FD128::from_whole(1);
        let neg_one = U256FD128::new(!one.0 + U256::one());
        println!("one:\n{one:b}\nneg_one:\n{neg_one:b}\n\n\n");

        // Test: (-1) / (-1) = 1
        assert_eq!(
            (neg_one / neg_one).raw(),
            one.raw(),
            "Expected (-1) / (-1) to equal 1"
        );

        // Test: (-1) / 1 = -1
        assert_eq!(
            (neg_one / one).raw(),
            neg_one.raw(),
            "Expected (-1) / 1 to equal -1"
        );

        // Test: 1 / (-1) = -1
        assert_eq!(
            (one / neg_one).raw(),
            neg_one.raw(),
            "Expected 1 / (-1) to equal -1"
        );

        // Test with decimals
        let half = U256FD128::new(U256::from(1u128) << 127); // 0.5
        let neg_half = half.neg();
        let two = U256FD128::from_whole(2);
        let neg_two = two.neg();

        // Test: (-1) / 2 = -0.5
        assert_eq!(
            (neg_one / two).raw(),
            neg_half.raw(),
            "Expected (-1) / 2 to equal -0.5"
        );

        // Test: 1 / (-2) = -0.5
        assert_eq!(
            (one / neg_two).raw(),
            neg_half.raw(),
            "Expected 1 / (-2) to equal -0.5"
        );

        // Test: (-1) / (-2) = 0.5
        assert_eq!(
            (neg_one / neg_two).raw(),
            half.raw(),
            "Expected (-1) / (-2) to equal 0.5"
        );
    }

    #[test]
    fn test_addition_overflow() {
        // Create a large positive number near the max
        let large_pos = U256FD128::new(U256::MAX >> 1);

        // Test: positive + positive = negative (overflow)
        let should_panic = std::panic::catch_unwind(|| large_pos + large_pos);
        assert!(
            should_panic.is_err(),
            "Expected overflow panic when adding two large positive numbers"
        );

        // Create large negative numbers
        let large_neg = large_pos.neg();

        // Test: negative + negative = positive (overflow)
        let should_panic = std::panic::catch_unwind(|| large_neg + large_neg);
        assert!(
            should_panic.is_err(),
            "Expected overflow panic when adding two large negative numbers"
        );
    }

    #[test]
    fn test_subtraction_overflow() {
        // Create a large positive number near the max
        let large_pos = U256FD128::new(U256::MAX >> 1);
        // Create large negative number
        let large_neg = large_pos.neg();

        // Test: positive - negative = negative (overflow)
        let should_panic = std::panic::catch_unwind(|| large_pos - large_neg);
        assert!(
            should_panic.is_err(),
            "Expected overflow panic when subtracting large negative from large positive"
        );

        // Test: negative - positive = positive (overflow)
        let should_panic = std::panic::catch_unwind(|| large_neg - large_pos);
        assert!(
            should_panic.is_err(),
            "Expected overflow panic when subtracting large positive from large negative"
        );
    }
}
