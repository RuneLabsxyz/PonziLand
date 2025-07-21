#[starknet::contract]
pub mod FeeController {
    use starknet::ContractAddress;
    use haiko_lib::interfaces::IFeeController::IFeeController;

    #[storage]
    struct Storage {
        swap_fee_rate: u16,
    }

    #[constructor]
    fn constructor(ref self: ContractState, swap_fee_rate: u16) {
        self.swap_fee_rate.write(swap_fee_rate);
    }

    #[abi(embed_v0)]
    impl FeeController of IFeeController<ContractState> {
        fn swap_fee_rate(self: @ContractState) -> u16 {
            self.swap_fee_rate.read()
        }
    }
}
