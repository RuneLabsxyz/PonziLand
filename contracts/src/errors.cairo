// Common errors used across the contract

// Payable component errors
pub const ERC20_PAY_FAILED: felt252 = 'ERC20: pay failed';
pub const DIFFERENT_ERC20_TOKEN_DISPATCHER: felt252 = 'Different token_dispatcher';
pub const ERC20_VALIDATE_AMOUNT_BID: felt252 = 'validate amount for bid failed';
pub const ERC20_PAY_FOR_BID_FAILED: felt252 = 'pay for bid failed';
pub const ERC20_PAY_FOR_BUY_FAILED: felt252 = 'ERC20: pay for buy failed';
pub const ERC20_VALIDATE_AMOUNT_BUY: felt252 = 'validate amount for buy failed';

// Stake component errors
pub const ERC20_STAKE_FAILED: felt252 = 'ERC20: stake failed';
pub const ERC20_VALIDATE_FOR_STAKE_FAILED: felt252 = 'Not enough amount for stake';
pub const ERC20_VALIDATE_FOR_REFUND_FAILED: felt252 = 'Not enough amount for refund';
pub const ERC20_REFUND_FAILED: felt252 = 'ERC20: refund of stake failed';

// Taxes component errors
pub const ERC20_TRANSFER_CLAIM_FAILED: felt252 = 'Transfer for claim failed';
