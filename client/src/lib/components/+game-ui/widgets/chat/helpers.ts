import { PUBLIC_DOJO_CHAIN_ID } from '$env/static/public';

export function generateMessageTypedData(
  identity: string,
  channel: string,
  content: string,
  salt: string,
  timestamp = Date.now(),
) {
  return {
    types: {
      StarknetDomain: [
        { name: 'name', type: 'shortstring' },
        { name: 'version', type: 'shortstring' },
        { name: 'chainId', type: 'shortstring' },
        { name: 'revision', type: 'shortstring' },
      ],
      'ponzi_land-Message': [
        { name: 'identity', type: 'ContractAddress' },
        { name: 'channel', type: 'shortstring' },
        { name: 'content', type: 'string' },
        { name: 'timestamp', type: 'felt' },
        { name: 'salt', type: 'felt' },
      ],
    },
    primaryType: 'ponzi_land-Message',
    domain: {
      name: 'ponzi_land',
      version: '1',
      chainId: PUBLIC_DOJO_CHAIN_ID,
      revision: '1',
    },
    message: {
      identity,
      channel,
      content,
      timestamp,
      salt,
    },
  };
}
