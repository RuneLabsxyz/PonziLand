import { useDojo } from '$lib/contexts/dojo';
import type { SchemaType } from '$lib/models.gen';
import { toHexWithPadding } from '$lib/utils';
import { QueryBuilder } from '@dojoengine/sdk';

export const getAuctionDataFromLocation = async (location: string) => {
  const { client: sdk } = useDojo();

  const query = new QueryBuilder<SchemaType>()
    .namespace('ponzi_land', (ns) => {
      ns.entity('Auction', (a) => a.eq('land_location', location));
    })
    .build();
  // also query initial
  const auction = await sdk.getEntities({
    query,
    callback: (response) => {
      if (response.error || response.data == null) {
        console.log('Got an error!', response.error);
      } else {
        console.log('Data! from auction', response.data);
        return response.data;
      }
    },
  });
  return auction;
};
