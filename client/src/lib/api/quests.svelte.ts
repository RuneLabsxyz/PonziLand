import { useDojo } from '$lib/contexts/dojo';
import { ModelsMapping } from '$lib/models.gen';
import { MemberClause, ToriiQueryBuilder } from '@dojoengine/sdk';

export const getQuests = async () => {
    const { client: sdk } = useDojo();

    const query = new ToriiQueryBuilder()
        .addEntityModel(ModelsMapping.Quest)
        .includeHashedKeys();

    const quests = await sdk.getEntities({
        query,
    });
    return quests;
};

export const getQuestGames = async () => {
    const { client: sdk } = useDojo();

    const query = new ToriiQueryBuilder()
      .addEntityModel(ModelsMapping.QuestGame)
      .includeHashedKeys();

    const questGames = await sdk.getEntities({
      query,
    });
    return questGames;
};

export const getQuestDetails = async () => {
    const { client: sdk } = useDojo();

    const query = new ToriiQueryBuilder()
      .addEntityModel(ModelsMapping.QuestDetails)
      .includeHashedKeys();

    const questDetails = await sdk.getEntities({
      query,
    });
    return questDetails;
};
export const getQuestDetailsFromLocation = async (location: string) => {
    const { client: sdk } = useDojo();
  
    const query = new ToriiQueryBuilder()
      .withClause(
        MemberClause(
          ModelsMapping.QuestDetails,
          'location',
          'Eq',
          location.toString(),
        ).build(),
      )
      .addEntityModel(ModelsMapping.QuestDetails);
  
    // also query initial
    return await sdk.getEntities({
      query,
    });
  };