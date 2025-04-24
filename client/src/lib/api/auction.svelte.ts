import { useDojo } from '$lib/contexts/dojo';
import { ModelsMapping, type SchemaType } from '$lib/models.gen';
import { toHexWithPadding } from '$lib/utils';
import {
  KeysClause,
  MemberClause,
  QueryBuilder,
  ToriiQueryBuilder,
} from '@dojoengine/sdk';

export const getAuctionDataFromLocation = async (location: string) => {
  const { client: sdk } = useDojo();

  const query = new ToriiQueryBuilder()
    .withClause(
      MemberClause(
        ModelsMapping.Auction,
        'land_location',
        'Eq',
        location.toString(),
      ).build(),
    )
    .addEntityModel(ModelsMapping.Auction);

  // also query initial
  return await sdk.getEntities({
    query,
  });
};

export const getAuctions = async () => {
  const { client: sdk } = useDojo();

  const query = new ToriiQueryBuilder()
    .addEntityModel(ModelsMapping.Auction)
    .includeHashedKeys();

  const auctions = await sdk.getEntities({
    query,
  });
  console.log('Auctions:', auctions);

  return auctions;
};
