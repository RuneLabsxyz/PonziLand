import { useDojo } from '$lib/contexts/dojo';
import { ModelsMapping } from '$lib/models.gen';
import { ToriiQueryBuilder } from '@dojoengine/sdk';

export const getMessages = async () => {
  const { client: sdk } = useDojo();

  const query = new ToriiQueryBuilder()
    .addEntityModel(ModelsMapping.Message)
    .includeHashedKeys();

  const messages = await sdk.getEntities({
    query,
  });

  return messages;
};
