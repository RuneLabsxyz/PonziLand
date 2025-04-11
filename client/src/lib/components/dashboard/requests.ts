import { PUBLIC_DOJO_TORII_URL } from '$env/static/public';

export interface TokenVolume {
  token: string;
  volume: string;
  fees: string;
}

export interface TokenTVL {
  token: string;
  balance: string;
}

export interface TVLDeltaEntry {
  token: string;
  date: string;
  delta: string;
}

// Base token (e.g. eStark)
export const baseToken: string =
  '0x071de745c1ae996cfd39fb292b4342b7c086622e3ecf3a5692bd623060ff3fa0';

export async function fetchBuyEvents() {
  try {
    const response = await fetch(`${PUBLIC_DOJO_TORII_URL}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: `
        SELECT *
        FROM "ponzi_land-LandBoughtEvent"
        LIMIT 1000;
        `,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return {};
  }
}

export async function fetchAllTimePlayers() {
  try {
    const response = await fetch(`${PUBLIC_DOJO_TORII_URL}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: `
        SELECT *
        FROM "ponzi_land-AddressAuthorizedEvent"
        LIMIT 1000;
        `,
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    return {};
  }
}
