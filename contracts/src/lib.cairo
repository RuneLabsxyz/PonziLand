mod systems {
    mod actions;
    mod auth;
    mod token_registry;
    mod quest;
}

mod interfaces {
    mod systems;
    mod quests;
}

mod models {
    mod land;
    mod auction;
    mod quest;
}

mod helpers {
    mod coord;
    mod taxes;
    mod circle_expansion;
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
    mod ekubo_core;
}

mod utils {
    mod common_strucs;
    mod get_neighbors;
    mod level_up;
    mod spiral;
    mod stake;
}

#[cfg(test)]
mod tests {
    mod setup;
    mod actions;
}
