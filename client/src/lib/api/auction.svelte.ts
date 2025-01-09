import { useDojo } from '$lib/contexts/dojo';
import type { SchemaType } from '$lib/models.gen';
import { toHexWithPadding } from '$lib/utils';
import { QueryBuilder } from '@dojoengine/sdk';

export const getAuctionDataFromLocation = async (location: number) => {
  const { client: sdk } = useDojo();

  const land_location = toHexWithPadding(location);

  const query = new QueryBuilder<SchemaType>()
    .namespace('ponzi_land', (ns) => {
      ns.entity('Auction', (a) => a.eq('land_location', land_location));
    })
    .build();
  // also query initial
  const auction = await sdk.getEntities({
    query,
    callback: (response) => {
      if (response.error || response.data == null) {
        console.log('Got an error!', response.error);
      } else {
        console.log('Setting entities :)');
        console.log('Data! from auction', JSON.stringify(response.data));
        return response.data;
      }
    },
  });

  console.log('Auction data from location', auction);
  return auction;
};
