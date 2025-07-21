// Haiko imports.
use haiko_lib::helpers::params::{token_params, treasury, ERC20ConstructorParams};
use haiko_lib::helpers::utils::to_e28;
use haiko_lib::helpers::actions::token::deploy_token;

// External imports.
use snforge_std::declare;
use openzeppelin::token::erc20::interface::{ERC20ABIDispatcher, ERC20ABIDispatcherTrait};

////////////////////////////////
// TESTS
////////////////////////////////

#[test]
#[available_gas(40000000)]
fn test_deploy_token_initialises_immutables() {
    // Deploy token.
    let params = token_params('USDC', 'USDC', 18, to_e28(1000000000), treasury());
    let erc20_class = declare("ERC20");
    let token = deploy_token(erc20_class, params);

    // Check immutables.
    assert(token.name() == params.name_, 'Deploy token: Wrong name');
    assert(token.symbol() == params.symbol_, 'Deploy token: Wrong symbol');
    assert(token.decimals() == 18, 'Deploy token: Wrong decimals');
    assert(token.total_supply() == params.initial_supply, 'Deploy token: Wrong init supply');
    assert(
        token.balanceOf(params.recipient) == params.initial_supply,
        'Deploy token: Wrong recipient B'
    );
}
