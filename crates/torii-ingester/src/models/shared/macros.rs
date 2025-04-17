#[macro_export]
macro_rules! get {
    ($entity: expr, $name: literal, as_location) => {{
        use $crate::models::shared::AsLocation;

        $entity
            .get($name)
            .expect(&*format!("Unable to get field {}", $name))
            .as_primitive()
            .expect(&*format!("Field {} is not a primitive", $name))
            .as_location()
            .expect(&*format!("Wrong conversion for {}! {:#?}", $name, $entity))
            .into()
    }};
    ($entity: expr, $name: literal, as_u256) => {{
        $entity
            .get($name)
            .expect(&*format!("Unable to get field {}", $name))
            .as_primitive()
            .expect(&*format!("Field {} is not a primitive", $name))
            .as_u256()
            .expect(&*format!("Wrong conversion for {}! {:#?}", $name, $entity))
            .into()
    }};
    ($entity: expr, $name: literal, $as: ident) => {{
        $entity
            .get($name)
            .expect(&*format!("Unable to get field {}", $name))
            .as_primitive()
            .expect(&*format!("Field {} is not a primitive", $name))
            .$as()
            .expect(&*format!("Wrong conversion for {}! {:#?}", $name, $entity))
            .into()
    }};
}
