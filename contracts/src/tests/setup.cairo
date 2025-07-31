mod setup {
    // Core Cairo imports
    use core::serde::Serde;

    // Starknet imports
    use starknet::{ContractAddress, contract_address_const};
    use starknet::testing::{set_contract_address, set_account_contract_address};
    use starknet::info::{get_contract_address, get_caller_address, get_block_timestamp};

    // Dojo imports
    use dojo::world::{WorldStorageTrait, WorldStorage, IWorldDispatcherTrait, IWorldDispatcher};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
        WorldStorageTestTrait,
    };

    // External dependencies
    use openzeppelin_token::erc20::interface::{IERC20CamelDispatcher, IERC20CamelDispatcherTrait};
    use ekubo::interfaces::core::{ICoreDispatcher, ICoreDispatcherTrait};

    // Internal systems
    use ponzi_land::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
    use ponzi_land::systems::auth::{auth, IAuthDispatcher, IAuthDispatcherTrait};
    use ponzi_land::systems::config::{
        config, IConfigSystemDispatcher, IConfigSystemDispatcherTrait,
    };
    use ponzi_land::systems::token_registry::{
        token_registry, ITokenRegistryDispatcher, ITokenRegistryDispatcherTrait,
    };

    // Models
    use ponzi_land::models::land::{Land, m_Land, LandStake, m_LandStake};
    use ponzi_land::models::auction::{Auction, m_Auction};
    use ponzi_land::models::config::{Config, m_Config};

    // Components
    use ponzi_land::components::taxes::{TaxesComponent};

    // Constants
    use ponzi_land::consts::{
        GRID_WIDTH, TAX_RATE, BASE_TIME, PRICE_DECREASE_RATE, TIME_SPEED, MAX_AUCTIONS,
        MAX_AUCTIONS_FROM_BID, DECAY_RATE, FLOOR_PRICE, LIQUIDITY_SAFETY_MULTIPLIER,
        MIN_AUCTION_PRICE, MIN_AUCTION_PRICE_MULTIPLIER, CENTER_LOCATION, AUCTION_DURATION,
        SCALING_FACTOR, LINEAR_DECAY_TIME, DROP_RATE, RATE_DENOMINATOR, MAX_CIRCLES, CLAIM_FEE,
        BUY_FEE, OUR_CONTRACT_FOR_FEE, OUR_CONTRACT_SEPOLIA_ADDRESS, CLAIM_FEE_THRESHOLD,
    };

    // Events
    use ponzi_land::events;

    // Test mocks
    use ponzi_land::mocks::erc20::MyToken;
    use ponzi_land::mocks::ekubo_core::{
        MockEkuboCore, IEkuboCoreTesting, IEkuboCoreTestingDispatcher,
    };

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
        IConfigSystemDispatcher,
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

        let (config_contract_address, _) = world.dns(@"config").unwrap();
        let config_system = IConfigSystemDispatcher { contract_address: config_contract_address };
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
            config_system,
        )
    }


    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "ponzi_land",
            resources: [
                TestResource::Model(m_Land::TEST_CLASS_HASH),
                TestResource::Model(m_LandStake::TEST_CLASS_HASH),
                TestResource::Model(m_Auction::TEST_CLASS_HASH),
                TestResource::Model(m_Config::TEST_CLASS_HASH),
                TestResource::Contract(config::TEST_CLASS_HASH),
                TestResource::Contract(token_registry::TEST_CLASS_HASH),
                TestResource::Contract(auth::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
                TestResource::Event(config::e_ConfigUpdated::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(events::e_LandNukedEvent::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(events::e_LandBoughtEvent::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(events::e_AddStakeEvent::TEST_CLASS_HASH.try_into().unwrap()),
                TestResource::Event(
                    events::e_LandTransferEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Event(
                    auth::e_AddressAuthorizedEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Event(
                    events::e_AuctionFinishedEvent::TEST_CLASS_HASH.try_into().unwrap(),
                ),
                TestResource::Event(events::e_NewAuctionEvent::TEST_CLASS_HASH.try_into().unwrap()),
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
        let floor_price_low = FLOOR_PRICE.low;
        let floor_price_high = FLOOR_PRICE.high;
        let min_auction_price_low = MIN_AUCTION_PRICE.low;
        let min_auction_price_high = MIN_AUCTION_PRICE.high;
        contract_defs
            .append(
                ContractDefTrait::new(@"ponzi_land", @"config")
                    .with_writer_of([dojo::utils::bytearray_hash(@"ponzi_land")].span())
                    .with_init_calldata(
                        [
                            GRID_WIDTH.into(), TAX_RATE.into(), BASE_TIME.into(),
                            PRICE_DECREASE_RATE.into(), TIME_SPEED.into(), MAX_AUCTIONS.into(),
                            MAX_AUCTIONS_FROM_BID.into(), DECAY_RATE.into(), floor_price_low.into(),
                            floor_price_high.into(), LIQUIDITY_SAFETY_MULTIPLIER.into(),
                            min_auction_price_low.into(), min_auction_price_high.into(),
                            MIN_AUCTION_PRICE_MULTIPLIER.into(), CENTER_LOCATION.into(),
                            AUCTION_DURATION.into(), SCALING_FACTOR.into(),
                            LINEAR_DECAY_TIME.into(), DROP_RATE.into(), RATE_DENOMINATOR.into(),
                            MAX_CIRCLES.into(), CLAIM_FEE.into(), BUY_FEE.into(),
                            OUR_CONTRACT_FOR_FEE, OUR_CONTRACT_SEPOLIA_ADDRESS,
                            CLAIM_FEE_THRESHOLD.into(), erc20_address.into(),
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

        contract_defs
            .append(
                ContractDefTrait::new(@"ponzi_land", @"actions")
                    .with_writer_of([dojo::utils::bytearray_hash(@"ponzi_land")].span())
                    .with_init_calldata(
                        [
                            2_u256.low.into(), // start_price (low)
                            2_u256.high.into(), // start_price (high)
                            1.into(), // floor_price (low)
                            0.into(), // floor_price (high)
                            ekubo_core_address,
                        ]
                            .span(),
                    ),
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
