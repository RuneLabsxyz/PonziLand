use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage, ModelValueStorage};

use ponzi_land::models::land::Land;

#[derive(Copy, Drop)]
struct Store {
    world: WorldStorage,
}

#[generate_trait]
impl StoreImpl of StoreTrait {
    #[inline(always)]
    fn new(world: WorldStorage) -> Store {
        Store { world }
    }

    // Getter
    #[inline(always)]
    fn land(self: Store, land_location: u64) -> Land {
        self.world.read_model(land_location)
    }

    // Setter
    #[inline(always)]
    fn set_land(mut self: Store, land: Land) {
        self.world.write_model(@land);
    }

    // Deleter
    #[inline(always)]
    fn delete_land(mut self: Store, land: Land) {
        self.world.erase_model(@land);
    }
}
