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

    // also query initial
    let res = await sdk.getEntities({
      query,
    });

    let cleaned_res = res.items.map((item: any) => {
        console.log('quest game item', item);
        return item;
    });

    return cleaned_res;
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
  
    console.log('location', location);
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
    let res = await sdk.getEntities({
      query,
    });

    let cleaned_res = res.items.map((item: any) => {
        console.log('quest details item', item);
        return item;
    });

    return cleaned_res;
  };