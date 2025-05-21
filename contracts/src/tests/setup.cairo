mod setup {
    // Starknet imports

    use core::serde::Serde;
    // Dojo imports

    use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait, WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{
        ContractDef, ContractDefTrait, NamespaceDef, TestResource, WorldStorageTestTrait,
        spawn_test_world,
    };
    use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};

    // External dependencies
    use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
    use ponzi_land::mocks::ekubo_core::{
        IEkuboCoreTesting, IEkuboCoreTestingDispatcher, MockEkuboCore,
    };
    // Internal imports
    use ponzi_land::mocks::erc20::MyToken;
    use ponzi_land::models::auction::{Auction, m_Auction};
    use ponzi_land::models::land::{Land, LandStake, m_Land, m_LandStake};
    use ponzi_land::systems::actions::{IActionsDispatcher, IActionsDispatcherTrait, actions};
    use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait, auth};
    use ponzi_land::systems::token_registry::{
        ITokenRegistryDispatcher, ITokenRegistryDispatcherTrait, token_registry,
    };
    use starknet::info::{get_block_timestamp, get_caller_address, get_contract_address};
    use starknet::testing::{set_account_contract_address, set_contract_address};
    use starknet::{ContractAddress, contract_address_const};

    fn RECIPIENT() -> ContractAddress {
        contract_address_const::<'RECIPIENT'>()
    }

    fn create_setup() -> (
        WorldStorage,
        IActionsDispatcher,
        IERC20CamelDispatcher,
        ICoreDispatcher,
        IEkuboCoreTestingDispatcher,
        IAuthDispatcher,
        ITokenRegistryDispatcher,
    ) {
        let ndef = namespace_def();

        //deploy of necessary contracts for the test
        let erc20 = deploy_erc20(RECIPIENT());
        let (core_dispatcher, testing_dispatcher) = deploy_mock_ekubo_core();

        //
        let cdf = contract_defs(
            erc20.contract_address.into(), core_dispatcher.contract_address.into(),
        );

        //
        let mut world = spawn_test_world([ndef].span());
        world.sync_perms_and_inits(cdf);

        let (action_contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address: action_contract_address };
        let (auth_contract_address, _) = world.dns(@"auth").unwrap();
        let auth_system = IAuthDispatcher { contract_address: auth_contract_address };
        let (token_registry_contract_address, _) = world.dns(@"token_registry").unwrap();
        let token_registry_dispatcher = ITokenRegistryDispatcher {
            contract_address: token_registry_contract_address,
        };

        (
            world,
            actions_system,
            erc20,
            core_dispatcher,
            testing_dispatcher,
            auth_system,
            token_registry_dispatcher,
        )
    }


    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "ponzi_land",
            resources: [
                TestResource::Model(m_Land::TEST_CLASS_HASH),
                TestResource::Model(m_LandStake::TEST_CLASS_HASH),
                TestResource::Model(m_Auction::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
                TestResource::Contract(token_registry::TEST_CLASS_HASH),
                TestResource::Event(actions::e_LandNukedEvent::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(
                    actions::e_NewAuctionEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Event(
                    actions::e_AuctionFinishedEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Event(
                    actions::e_LandBoughtEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Contract(auth::TEST_CLASS_HASH),
                TestResource::Event(
                    auth::e_AddressAuthorizedEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Event(
                    auth::e_AddressRemovedEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Event(
                    auth::e_VerifierUpdatedEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
            ]
                .span(),
        };

        ndef
    }

    fn contract_defs(erc20_address: felt252, ekubo_core_address: felt252) -> Span<ContractDef> {
        let mut contract_defs: Array<ContractDef> = array![];

        contract_defs
            .append(
                ContractDefTrait::new(@"ponzi_land", @"actions")
                    .with_writer_of([dojo::utils::bytearray_hash(@"ponzi_land")].span())
                    .with_init_calldata(
                        [
                            erc20_address, 2_u256.low.into(), // start_price (low)
                            2_u256.high.into(), // start_price (high)
                            1.into(), // floor_price (low)
                            0.into(), // floor_price (high)
                            200.into(), // decay_rate
                            ekubo_core_address,
                        ]
                            .span(),
                    ),
            );

        contract_defs
            .append(
                ContractDefTrait::new(@"ponzi_land", @"auth")
                    .with_writer_of([dojo::utils::bytearray_hash(@"ponzi_land")].span())
                    .with_init_calldata([RECIPIENT().into(), // owner
                    0.into() // verifier
                    ].span()),
            );

        contract_defs
            .append(
                ContractDefTrait::new(@"ponzi_land", @"token_registry")
                    .with_writer_of([dojo::utils::bytearray_hash(@"ponzi_land")].span())
                    .with_init_calldata([0x1, erc20_address].span()),
            );

        contract_defs.span()
    }

    fn deploy_erc20(recipient: ContractAddress) -> IERC20CamelDispatcher {
        let mut calldata = array![];
        Serde::serialize(@recipient, ref calldata);
        let (address, _) = starknet::deploy_syscall(
            MyToken::TEST_CLASS_HASH.try_into().expect('Class hash conversion failed'),
            0,
            calldata.span(),
            false,
        )
            .expect('ERC20 deploy failed');

        IERC20CamelDispatcher { contract_address: address }
    }

    fn deploy_mock_ekubo_core() -> (ICoreDispatcher, IEkuboCoreTestingDispatcher) {
        let (address, _) = starknet::deploy_syscall(
            MockEkuboCore::TEST_CLASS_HASH.try_into().expect('Class hash conversion failed'),
            0,
            ArrayTrait::new().span(),
            false,
        )
            .expect('Mock Ekubo Core deploy failed');
        let core_dispatcher = ICoreDispatcher { contract_address: address };
        let testing_dispatcher = IEkuboCoreTestingDispatcher { contract_address: address };

        (core_dispatcher, testing_dispatcher)
    }


    fn deploy_auht_contract(owner: felt252, verifier: felt252) -> IAuthDispatcher {
        let (address, _) = starknet::deploy_syscall(
            auth::TEST_CLASS_HASH.try_into().expect('Class hash conversion failed'),
            0,
            array![owner, verifier].span(),
            false,
        )
            .expect('Auth contract deploy failed');

        IAuthDispatcher { contract_address: address }
    }
}
