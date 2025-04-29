import type { Client } from '$lib/contexts/client.svelte';
import { ModelsMapping, type SchemaType } from '$lib/models.gen';
import { ToriiQueryBuilder, type ParsedEntity } from '@dojoengine/sdk';

// Fetch the data from torii
function getQuery(pagination?: { number: number; size: number }) {
  let base =
    pagination != undefined
      ? ToriiQueryBuilder.withPagination(pagination.number, pagination.size)
      : new ToriiQueryBuilder();

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
  await client.subscribeEntityQuery({
    query: getQuery(),
    callback: (result) => {
      if (result.error) {
        console.error(result.error);
      } else {
        callback(result.data);
      }
    },
  });
}
export async function setupInitialLands(
  client: Client,
  setEntities: (entities: ParsedEntity<SchemaType>[]) => void,
) {
  // Fetch the total count
  let page = 0;

  while (true) {
    const pagedQuery = getQuery({ number: page, size: 50 });

    const response = await client.getEntities({
      query: pagedQuery,
    });

    if (response.length === 0) {
      break;
    }

    setEntities(response);

    page++;
  }
}
