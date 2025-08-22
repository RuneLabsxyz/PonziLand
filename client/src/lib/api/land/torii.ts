import type { Client } from '$lib/contexts/client.svelte';
import { ModelsMapping, type SchemaType } from '$lib/models.gen';
import { ToriiQueryBuilder, type ParsedEntity } from '@dojoengine/sdk';

// Fetch the data from torii
function getQuery(pagination?: { cursor?: string; size: number }) {
  const base = new ToriiQueryBuilder();
  if (pagination?.cursor) {
    base.withCursor(pagination.cursor);
  }

  if (pagination?.size) {
    base.withLimit(pagination.size);
    base.withDirection('Forward');
  }

  return (
    base
      .addEntityModel(ModelsMapping.Land)
      .addEntityModel(ModelsMapping.LandStake)
      // Also fetch the potential auction for the auction
      .addEntityModel(ModelsMapping.Auction)
      .includeHashedKeys()
  );
}

export async function setupLandsSubscription(
  client: Client,
  callback: (entities: ParsedEntity<SchemaType>[]) => void,
) {
  const initialEntities: ParsedEntity<SchemaType>[] = [];
  const subscribeResponse = await client.subscribeEntityQuery({
    query: getQuery(),
    callback: (result) => {
      if (result.error) {
        console.error(result.error);
      } else {
        callback(result.data);
      }
    },
  });
  let data = subscribeResponse[0];

  initialEntities.push(...data.getItems());

  // Continue while we get data
  while (data.cursor != undefined) {
    // Make a new request with the next page
    const query = data.getNextQuery(getQuery());
    data = await client.getEntities({
      query: query,
    });

    initialEntities.push(...data.getItems());
  }

  return {
    initialEntities: initialEntities,
    subscription: subscribeResponse[1],
  };
}

// export async function setupInitialLands(
//   client: Client,
//   setEntities: (entities: ParsedEntity<SchemaType>[]) => void,
// ) {
//   // Fetch the total count
//   let page = 0;

//   while (true) {
//     const pagedQuery = getQuery({ number: page, size: 50 });

//     const response = await client.getEntities({
//       query: pagedQuery,
//     });

//     if (response.length === 0) {
//       break;
//     }

//     setEntities(response);

//     page++;
//   }
// }
