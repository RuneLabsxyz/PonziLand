mod systems {
    mod actions;
}

mod models {
    mod land;
    mod auction;
}

mod helpers {
    mod coord;
}

mod components {
    mod payable;
    mod taxes;
    mod stake;
}

mod consts;
mod store;

mod tokens {
    mod erc20;
    mod main_currency;
}

mod mocks {
    mod erc20;
}

mod utils {
    mod common_strucs;
    mod get_neighbors;
    mod level_up;
}

#[cfg(test)]
mod tests {
    mod setup;
    mod actions;
}
