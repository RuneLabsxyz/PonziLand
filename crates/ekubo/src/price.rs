use std::fmt::Display;

use crate::math::u256fd128::U256FD128;

pub struct PairRatio(pub U256FD128);

impl PairRatio {
    pub fn inverse(&self) -> Self {
        PairRatio(U256FD128::from_whole(1) / self.0)
    }
}

impl std::ops::Deref for PairRatio {
    type Target = U256FD128;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl Display for PairRatio {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}
