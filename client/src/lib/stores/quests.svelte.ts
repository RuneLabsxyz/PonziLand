
import { useDojo } from '$lib/contexts/dojo';
import { notificationQueue } from '$lib/stores/event.store.svelte';
import { parseDojoCall } from '@dojoengine/core';
import { getManifest } from '$lib/manifest';
import { getBaseToken } from './wallet.svelte';

export async function SetLandQuest(location: string, game_id: number) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
  
    let res = await sdk.client.quests.setLandQuest(
      account()?.getWalletAccount()!,
      location,
      game_id,
    );
    notificationQueue.addNotification(res?.transaction_hash ?? null, 'set quest tile');
    return res;
  }
  
  export async function RemoveLandQuest(location: string) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
  
    let res = await sdk.client.quests.removeLandQuest(
      account()?.getWalletAccount()!,
      location,
    );
    notificationQueue.addNotification(res?.transaction_hash ?? null, 'remove quest tile');
    return res;
  }
  
  export async function StartQuest(location: string, entry_price:number) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
    let baseToken = getBaseToken();
    let res = await sdk.client.quests.startQuest(
      account()?.getWalletAccount()!,
      location,
      0,
      entry_price,
      baseToken?.address,
    );
    notificationQueue.addNotification(res?.transaction_hash ?? null, 'start quest');
    return res;
  }
  
  export async function GetQuest(questId: number) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
    let res = await sdk.client.quests.getQuest(
      account()?.getWalletAccount()!,
      questId,
    );
    return res;
  }
  
  export async function GetQuestToken(questId: number) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
    let res = await sdk.client.quests.getQuestGameToken(
      questId,
    );
    return res;
  }
  
  export async function GetQuestScore(questId: number) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
    let res = await sdk.client.quests.getScore(
      questId,
    );
    return res;
  }
  
  export async function GetQuestEntryPrice(questId: number) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
    let res = await sdk.client.quests.getQuestEntryPrice(questId);
    return res;
  }
  
  export async function ClaimQuest(questId: number) {
    const { client: sdk, accountManager } = useDojo();
    const account = () => {
      return accountManager!.getProvider();
    };
    let res = await sdk.client.quests.finishQuest(
      account()?.getWalletAccount()!,
      questId, 
      '0x0',
      0,
      0,
      0,
      0
    );
    return res;
  }
  