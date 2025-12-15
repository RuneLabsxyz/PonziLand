use core::fmt;
use serde::{de, de::IgnoredAny, Deserialize, Deserializer};
use starknet::core::types::Felt;
use std::marker::PhantomData;

use crate::error::ToriiConversionError;

// Re-export the building blocks to dependant crates
pub use dojo_types::{primitive::Primitive, schema::Ty};

pub trait FromTy: Sized {
    /// Converts a `Ty` to `Self`.
    ///
    /// # Errors
    ///
    /// Returns a `ToriiConversionError` if the conversion fails.
    fn from_ty(value: Ty) -> Result<Self, ToriiConversionError>;
}

pub trait FromPrimitive: Sized {
    /// Converts a `Primitive` to `Self`.
    ///
    /// # Errors
    ///
    /// Returns a `ToriiConversionError` if the conversion fails.
    fn from_primitive(value: Primitive) -> Result<Self, ToriiConversionError>;
}

impl<T: FromPrimitive> FromTy for T {
    fn from_ty(value: Ty) -> Result<Self, ToriiConversionError> {
        match value {
            Ty::Primitive(prim) => T::from_primitive(prim),
            other => Err(ToriiConversionError::WrongType {
                expected: "primitive".to_owned(),
                got: other.name(),
            }),
        }
    }
}

impl<T: FromTy> FromTy for Option<T> {
    fn from_ty(value: Ty) -> Result<Self, ToriiConversionError> {
        let enum_data = value
            .as_enum()
            .ok_or_else(|| ToriiConversionError::WrongType {
                expected: "enum".to_string(),
                got: value.name(),
            })?;

        let variant = enum_data
            .option()
            .map_err(|_| ToriiConversionError::UnknownVariant {
                enum_name: value.name(),
                variant_name: "#unknown#".to_string(),
            })?;

        match &*variant.name {
            "Some" => Ok(Some(T::from_ty(variant.ty.clone()).map_err(|e| {
                ToriiConversionError::NestedError("Processing Option".to_string(), Box::new(e))
            })?)),
            "None" => Ok(None),
            _ => Err(ToriiConversionError::UnknownVariant {
                enum_name: value.name(),
                variant_name: variant.name.clone(),
            }),
        }
    }
}

macro_rules! impl_from_primitive {
    ($as: ident, $ty: ty) => {
        impl FromPrimitive for $ty {
            fn from_primitive(value: Primitive) -> Result<Self, ToriiConversionError> {
                value.$as().ok_or_else(|| ToriiConversionError::WrongType {
                    expected: stringify!($ty).to_string(),
                    got: format!("{:#?}", value),
                })
            }
        }
    };
}
impl_from_primitive!(as_i8, i8);
impl_from_primitive!(as_i16, i16);
impl_from_primitive!(as_i32, i32);
impl_from_primitive!(as_i64, i64);
impl_from_primitive!(as_i128, i128);
impl_from_primitive!(as_u8, u8);
impl_from_primitive!(as_u16, u16);
impl_from_primitive!(as_u32, u32);
impl_from_primitive!(as_u64, u64);
impl_from_primitive!(as_u128, u128);
impl_from_primitive!(as_bool, bool);

// Handle the special felt case
impl FromPrimitive for Felt {
    fn from_primitive(primitive: Primitive) -> Result<Self, ToriiConversionError> {
        match primitive {
            Primitive::ContractAddress(Some(e))
            | Primitive::ClassHash(Some(e))
            | Primitive::EthAddress(Some(e))
            | Primitive::Felt252(Some(e)) => Ok(e),

            actual => Err(ToriiConversionError::WrongType {
                expected: "Felt-like".to_string(),
                got: format!("{actual:#?}"),
            }),
        }
    }
}

// Red: This only works for unit enums, but this is all the time I have to do for now.
/// Deserialize an enum from a map with a single key.
///
/// # Errors
/// Returns an error if the input is not a map with a single key.
pub fn torii_enum_deserializer<'de, T, D>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    // Visitor for handling the Torii enum format: {"Zero":[]}
    struct EnumVisitor<T>(PhantomData<T>);

    impl<'de, T> de::Visitor<'de> for EnumVisitor<T>
    where
        T: Deserialize<'de>,
    {
        type Value = T;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("an enum represented as a map with a single key")
        }

        fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
        where
            M: de::MapAccess<'de>,
        {
            // Extract the variant name and empty array
            let (variant, _): (String, Vec<()>) = map
                .next_entry()?
                .ok_or_else(|| de::Error::invalid_length(0, &self))?;

            // Create a string that represents what serde expects for deserializing into an enum
            // For example, if the variant is "Zero", we create a token stream that looks like
            // what would come from the JSON: "Zero"
            T::deserialize(de::value::StringDeserializer::new(variant))
        }
    }

    deserializer.deserialize_map(EnumVisitor(PhantomData))
}

/// Deserializes a Dojo-style `Option` where values come tagged as `{"Some": value}` or `{"None":[]}`.
///
/// # Errors
/// Returns an error if the inner value cannot be deserialized into `T`.
pub fn torii_option_deserializer<'de, T, D>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum OptionHelper<T> {
        Some {
            #[serde(rename = "Some")]
            value: T,
        },
        None {
            #[serde(rename = "None")]
            _ignored: IgnoredAny,
        },
        Value(T),
        Null,
    }

    match OptionHelper::deserialize(deserializer)? {
        OptionHelper::Some { value } => Ok(Some(value)),
        OptionHelper::Value(value) => Ok(Some(value)),
        OptionHelper::None { .. } | OptionHelper::Null => Ok(None),
    }
}
