#![allow(clippy::vec_init_then_push)] // Used in the macro, as we cannot know if it is going to exist or not

use chaindata_models::events::{
    actions::{
        AuctionFinishedEventModel, LandBoughtEventModel, LandNukedEventModel,
        LandTransferEventModel, NewAuctionEventModel,
    },
    auth::{AddressAuthorizedEventModel, AddressRemovedEventModel, VerifierUpdatedEventModel},
    EventId,
};
use sqlx::{postgres::PgRow, query_builder::Separated, FromRow, QueryBuilder};

use super::base::EventDataRepository;
use sqlx::Error;

#[async_trait::async_trait]
pub trait EventModelRepository<Model>
where
    Model: Sized + Unpin + Send + Sync + for<'r> FromRow<'r, PgRow> + 'static,
{
    const TABLE_NAME: &'static str;

    async fn get_by_id<'e, Conn>(conn: Conn, id: EventId) -> Result<Option<Model>, Error>
    where
        Conn: 'e + sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        // Build query builder
        let mut query = QueryBuilder::new("SELECT ");
        Self::push_parameters(&mut query);

        query
            .push(" FROM ")
            .push(Self::TABLE_NAME)
            .push(" WHERE id = ?")
            .push_bind(id);

        query.build_query_as().fetch_optional(conn).await
    }

    fn push_parameters(query: &mut QueryBuilder<'_, sqlx::Postgres>);
    fn push_tuple(args: Separated<'_, '_, sqlx::Postgres, &'static str>, model: &Model);

    async fn save_event<'e, Conn>(conn: Conn, model: Model) -> Result<(), Error>
    where
        Conn: 'e + sqlx::Executor<'e, Database = sqlx::Postgres>,
    {
        // Build query builder
        let mut query = QueryBuilder::new("INSERT INTO ");
        query.push(Self::TABLE_NAME).push(" (");
        Self::push_parameters(&mut query);
        query.push(") ");

        query.push_values(std::iter::once(&model), Self::push_tuple);

        query.build().execute(conn).await?;
        Ok(())
    }
}

// Implement for each event.
macro_rules! implement_repository {
    // Main entry point for the macro
    ($struct_ty:ty, $table_name:expr, {
        $($field:ident $(: $column:expr)?),* $(,)?
    }) => {
        // Generate the repository implementation
        impl EventModelRepository<$struct_ty> for EventDataRepository {
            const TABLE_NAME: &'static str = $table_name;

            fn push_parameters(query: &mut QueryBuilder<'_, sqlx::Postgres>) {
                let columns = implement_repository!(@columns $($field $(: $column)?),*);
                query.push(&columns);
            }

            fn push_tuple(
                mut args: sqlx::query_builder::Separated<'_, '_, sqlx::Postgres, &'static str>,
                model: & $struct_ty,
            ) {
                implement_repository!(@bindings model, args, $($field),*);
            }
        }
    };

    // Internal rule to generate the column list
    (@columns $($field:ident $(: $column:expr)?),*) => {
        {
            let mut cols = Vec::<&str>::new();
            $(
                // If a column name is specified, use it, otherwise use the field name
                cols.push(
                    implement_repository!(@column_name $field $(, $column)?)
                );
            )*
            cols.join(", ")
        }
    };

    // Helper to determine column name
    (@column_name $field:ident) => { stringify!($field) };
    (@column_name $field:ident, $column:expr) => { $column };

    // Internal rule to generate the binding statements
    (@bindings $model:ident, $args:ident, $($field:ident),*) => {
        $(
            $args.push_bind($model.$field.clone());
        )*
    };
}

implement_repository!(AuctionFinishedEventModel, "event_auction_finished", {
    id,
    location,
    buyer,
    price,
    token_used
});

implement_repository!(LandBoughtEventModel, "event_land_bought", {
    id,
    location,
    buyer,
    seller,
    price,
    token_used
});

implement_repository!(LandNukedEventModel, "event_land_nuked", {
    id,
    location,
    owner
});

implement_repository!(NewAuctionEventModel, "event_new_auction", {
    id,
    location,
    starting_price,
    floor_price
});

implement_repository!(AddressAuthorizedEventModel, "event_address_authorized", {
    id,
    at,
    address,
});

implement_repository!(AddressRemovedEventModel, "event_address_removed", {
    id,
    at,
    address,
});

implement_repository!(VerifierUpdatedEventModel, "event_verifier_updated", {
    id,
    new_verifier,
    old_verifier
});

implement_repository!(LandTransferEventModel, "event_land_transfer", {
    id,
    from_location,
    to_location,
    token_address,
    amount
});
