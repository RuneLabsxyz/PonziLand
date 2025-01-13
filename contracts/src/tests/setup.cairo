mod setup {
    // Starknet imports

    use starknet::{ContractAddress, contract_address_const};
    use starknet::testing::{set_contract_address, set_account_contract_address};
    use starknet::info::{get_contract_address, get_caller_address, get_block_timestamp};
    use core::serde::Serde;
    // Dojo imports

    use dojo::world::{WorldStorageTrait, WorldStorage};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
        WorldStorageTestTrait
    };

    // External dependencies
    use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};

    // Internal imports
    use ponzi_land::mocks::erc20::MyToken;
    use ponzi_land::models::land::{Land, m_Land};
    use ponzi_land::models::auction::{Auction, m_Auction};
    use ponzi_land::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};


    fn RECIPIENT() -> ContractAddress {
        contract_address_const::<'RECIPIENT'>()
    }


    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "ponzi_land", resources: [
                TestResource::Model(m_Land::TEST_CLASS_HASH),
                TestResource::Model(m_Auction::TEST_CLASS_HASH),
                TestResource::Event(actions::e_LandNukedEvent::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(actions::e_NewLandEvent::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(
                    actions::e_RemainingStakeEvent::TEST_CLASS_HASH.try_into().unwrap()
                ),
                TestResource::Event(
                    actions::e_NewAuctionEvent::TEST_CLASS_HASH.try_into().unwrap()
                ),
                TestResource::Event(
                    actions::e_AuctionFinishedEvent::TEST_CLASS_HASH.try_into().unwrap()
                ),
                TestResource::Contract(actions::TEST_CLASS_HASH)
            ].span()
        };

        ndef
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"ponzi_land", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"ponzi_land")].span()),
        ].span()
    }

    fn deploy_erc20(recipient: ContractAddress) -> IERC20CamelDispatcher {
        let mut calldata = array![];
        Serde::serialize(@recipient, ref calldata);
        let (address, _) = starknet::deploy_syscall(
            MyToken::TEST_CLASS_HASH.try_into().expect('Class hash conversion failed'),
            0,
            calldata.span(),
            false
        )
            .expect('ERC20 deploy failed');

        IERC20CamelDispatcher { contract_address: address }
    }

    fn create_setup() -> (WorldStorage, IActionsDispatcher, IERC20CamelDispatcher) {
        let ndef = namespace_def();
        let cdf = contract_defs();
        let erc20 = deploy_erc20(RECIPIENT());
        let mut world = spawn_test_world([ndef].span());
        world.sync_perms_and_inits(cdf);
        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };
        (world, actions_system, erc20)
    }
    // #[test]
// fn test_deploy_erc20() {
//     let erc20 = deploy_erc20();
//     // assert(erc20.contract_address, '');
//     println!("erc20 {:?}", erc20.contract_address);
// }

    // #[test]
// fn test_create_setup(){
//     let (world,actions_system)= create_setup();

    // }

}
