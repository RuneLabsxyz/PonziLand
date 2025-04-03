use starknet::{ContractAddress, ClassHash};
use dojo::world::{
    WorldStorage, WorldStorageTrait, IWorldDispatcher, IWorldDispatcherTrait, Resource,
};

pub use ponzi_land::systems::auth::{IAuthDispatcher, IAuthDispatcherTrait};


#[generate_trait]
pub impl SystemsImpl of SystemsTrait {
    fn contract_address(self: @WorldStorage, contract_name: @ByteArray) -> ContractAddress {
        match self.dns(contract_name) {
            Option::Some((contract_address, _)) => { (contract_address) },
            Option::None => { (starknet::contract_address_const::<0x0>()) },
        }
    }

    #[inline(always)]
    fn storage(dispatcher: IWorldDispatcher, namespace: @ByteArray) -> WorldStorage {
        (WorldStorageTrait::new(dispatcher, namespace))
    }

    // system addresses
    #[inline(always)]
    fn auth_address(self: @WorldStorage) -> ContractAddress {
        (self.contract_address(@"auth"))
    }

    // dispatchers
    #[inline(always)]
    fn auth_dispatcher(self: @WorldStorage) -> IAuthDispatcher {
        (IAuthDispatcher { contract_address: self.auth_address() })
    }
}
