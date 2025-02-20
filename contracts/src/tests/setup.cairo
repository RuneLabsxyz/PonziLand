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
    use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};
    // Internal imports
    use ponzi_land::mocks::erc20::MyToken;
    use ponzi_land::mocks::ekubo_core::{
        MockEkuboCore, IEkuboCoreTesting, IEkuboCoreTestingDispatcher
    };
    use ponzi_land::models::land::{Land, m_Land};
    use ponzi_land::models::auction::{Auction, m_Auction};
    use ponzi_land::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
    use ponzi_land::systems::auth::{Auth, IAuthDispatcher, IAuthDispatcherTrait};

    fn RECIPIENT() -> ContractAddress {
        contract_address_const::<'RECIPIENT'>()
    }


    const TEST_PRIVATE_KEY: felt252 = 0x1234; // Una clave privada específica para testing
    const TEST_PUBLIC_KEY: felt252 =
        0x1ef15c18599971b7beced415a40f0c7deacfd9b0d1819e03d723d8bc943cfca; // Clave pública correspondiente

    fn create_setup() -> (
        WorldStorage,
        IActionsDispatcher,
        IERC20CamelDispatcher,
        ICoreDispatcher,
        IEkuboCoreTestingDispatcher,
        IAuthDispatcher
    ) {
        let ndef = namespace_def();

        //deploy of necessary contracts for the test
        let erc20 = deploy_erc20(RECIPIENT());
        let (core_dispatcher, testing_dispatcher) = deploy_mock_ekubo_core();
        let auth_dispatcher = deploy_auht_contract(RECIPIENT().into(), TEST_PUBLIC_KEY);

        //
        let cdf = contract_defs(
            erc20.contract_address.into(),
            core_dispatcher.contract_address.into(),
            auth_dispatcher.contract_address.into()
        );

        //
        let mut world = spawn_test_world([ndef].span());
        world.sync_perms_and_inits(cdf);

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        (world, actions_system, erc20, core_dispatcher, testing_dispatcher, auth_dispatcher)
    }


    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "ponzi_land", resources: [
                TestResource::Model(m_Land::TEST_CLASS_HASH),
                TestResource::Model(m_Auction::TEST_CLASS_HASH),
                TestResource::Event(
                    actions::e_RemainingStakeEvent::TEST_CLASS_HASH.try_into().unwrap()
                ),
                TestResource::Event(actions::e_LandNukedEvent::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(
                    actions::e_NewAuctionEvent::TEST_CLASS_HASH.try_into().unwrap()
                ),
                TestResource::Event(
                    actions::e_AuctionFinishedEvent::TEST_CLASS_HASH.try_into().unwrap()
                ),
                TestResource::Event(
                    actions::e_LandBoughtEvent::TEST_CLASS_HASH.try_into().unwrap()
                ),
                TestResource::Contract(actions::TEST_CLASS_HASH)
            ].span()
        };

        ndef
    }

    fn contract_defs(
        erc20_address: felt252, ekubo_core_address: felt252, auth_contract_address: felt252
    ) -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"ponzi_land", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"ponzi_land")].span())
                .with_init_calldata(
                    [
                        erc20_address,
                        1280.into(), // land_1
                        1281.into(), // land_2
                        1282.into(), // land_3
                        1217.into(), // land_4
                        1000_u256.low.into(), // start_price (low)
                        1000_u256.high.into(), // start_price (high)
                        1.into(), // floor_price (low)
                        0.into(), // floor_price (high)
                        200.into(), // decay_rate
                        ekubo_core_address,
                        auth_contract_address
                    ].span()
                ),
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

    fn deploy_mock_ekubo_core() -> (ICoreDispatcher, IEkuboCoreTestingDispatcher) {
        let (address, _) = starknet::deploy_syscall(
            MockEkuboCore::TEST_CLASS_HASH.try_into().expect('Class hash conversion failed'),
            0,
            ArrayTrait::new().span(),
            false
        )
            .expect('Mock Ekubo Core deploy failed');
        let core_dispatcher = ICoreDispatcher { contract_address: address };
        let testing_dispatcher = IEkuboCoreTestingDispatcher { contract_address: address };

        (core_dispatcher, testing_dispatcher)
    }


    fn deploy_auht_contract(owner: felt252, verifier: felt252) -> IAuthDispatcher {
        let (address, _) = starknet::deploy_syscall(
            Auth::TEST_CLASS_HASH.try_into().expect('Class hash conversion failed'),
            0,
            array![owner, verifier].span(),
            false
        )
            .expect('Auth contract deploy failed');

        IAuthDispatcher { contract_address: address }
    }
}
