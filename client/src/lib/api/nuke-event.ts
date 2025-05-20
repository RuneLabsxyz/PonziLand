import {
  ClauseBuilder,
  ToriiQueryBuilder,
  type SchemaType,
} from '@dojoengine/sdk';
import { useDojo } from '$lib/contexts/dojo';
import { NAME_SPACE } from '$lib/const';

function getNukeQuery() {
  const keys: `${string}-${string}`[] = [];
  keys.push(`${NAME_SPACE}-LandNukedEvent`);
  const clauses = new ClauseBuilder().keys(keys, []);
  return new ToriiQueryBuilder<SchemaType>()
    .withClause(clauses.build())
    .includeHashedKeys();
}

//TODO make this work
export const getNukeData = async () => {
  const { client: sdk } = useDojo();

  const query = getNukeQuery();
  const nukeData = await sdk.subscribeEventQuery({
    query,
    callback: (response) => {
      if (response.error || response.data == null) {
        console.log('Got an error!', response.error);
      } else {
        return response.data;
      }
    },
  });
  return nukeData;
};
