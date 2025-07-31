use starknet::ContractAddress;

// Emitted when new auction starts for unowned land
// Triggered by auction function, can be triggered by nuked event or bid event
#[derive(Drop, Serde)]
#[dojo::event]
pub struct NewAuctionEvent {
    #[key]
    land_location: u16,
    start_price: u256,
    floor_price: u256,
}

// Emitted when auction ends with successful purchase
// Triggered when player wins Dutch auction bid
#[derive(Drop, Serde)]
#[dojo::event]
pub struct AuctionFinishedEvent {
    #[key]
    land_location: u16,
    buyer: ContractAddress,
    final_price: u256,
}

// Emitted when land owner loses ownership due to insufficient stake
// Triggered during tax collection when stake < required amount
#[derive(Drop, Serde)]
#[dojo::event]
pub struct LandNukedEvent {
    #[key]
    owner_nuked: ContractAddress,
    land_location: u16,
}

// Emitted when player buys land directly from current owner
// Triggered by buy action on owned land at current price
#[derive(Drop, Serde)]
#[dojo::event]
pub struct LandBoughtEvent {
    #[key]
    buyer: ContractAddress,
    #[key]
    land_location: u16,
    sold_price: u256,
    seller: ContractAddress,
    token_used: ContractAddress,
}

// Emitted when land owner increases their stake amount
// Triggered by increase_stake action to prevent nuking
#[derive(Drop, Serde)]
#[dojo::event]
pub struct AddStakeEvent {
    #[key]
    land_location: u16,
    new_stake_amount: u256,
    owner: ContractAddress,
}

// Emitted when taxes are collected and distributed to neighbors
// Triggered during claim action tax distribution process
#[derive(Drop, Serde)]
#[dojo::event]
pub struct LandTransferEvent {
    #[key]
    from_location: u16,
    to_location: u16,
    token_address: ContractAddress,
    amount: u256,
}

