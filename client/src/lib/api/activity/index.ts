import { PUBLIC_DOJO_TORII_URL } from '$env/static/public';
import { COORD_MULTIPLIER, COORD_MASK } from '$lib/const';

export interface ActivityEventResponse {
  id: string;
  type: 'land_buy' | 'auction_win' | 'nuke';
  timestamp: string;
  location_x: number;
  location_y: number;
  buyer?: string;
  seller?: string;
  owner_nuked?: string;
  price?: string;
  token_used?: string;
}

interface RawToriiEvent {
  id: string;
  model_name: string;
  created_at: string;
  buyer?: string;
  seller?: string;
  location?: string;
  sold_price?: string;
  token_used?: string;
  owner_nuked?: string;
}

/**
 * Build the SQL query for fetching recent activity events
 */
function buildQuery(limit: number): string {
  return `
    SELECT
      em.id as id,
      m.name as model_name,
      em.created_at as created_at,
      (em.data ->> '$.buyer') as buyer,
      (em.data ->> '$.seller') as seller,
      (em.data ->> '$.land_location') as location,
      (em.data ->> '$.sold_price') as sold_price,
      (em.data ->> '$.token_used') as token_used,
      (em.data ->> '$.owner_nuked') as owner_nuked
    FROM event_messages_historical em
    LEFT JOIN models m ON em.model_id = m.id
    WHERE m.name LIKE '%LandBoughtEvent' OR m.name LIKE '%LandNukedEvent'
    ORDER BY em.created_at DESC
    LIMIT ${limit}
  `;
}

/**
 * Parse raw Torii event into ActivityEventResponse
 */
function parseEvent(raw: RawToriiEvent): ActivityEventResponse | null {
  try {
    // Extract event type from model name (e.g., "ponzi_land::models::LandBoughtEvent")
    const modelParts = raw.model_name?.split('::') || [];
    const eventType = modelParts[modelParts.length - 1] || 'UnknownEvent';

    // Parse location (stored as a single number, convert to x,y)
    // Uses COORD_MULTIPLIER=256 and COORD_MASK=0xff matching contracts/src/helpers/coord.cairo
    const locationNum = parseInt(raw.location || '0', 10);
    const location_x = locationNum & COORD_MASK; // Low 8 bits (col)
    const location_y = Math.floor(locationNum / COORD_MULTIPLIER); // High 8 bits (row)

    if (eventType === 'LandBoughtEvent') {
      // Determine if this is an auction win or a regular buy
      // Auction win: seller is empty or same as buyer (first purchase after nuke)
      const isAuctionWin = !raw.seller || raw.seller === raw.buyer;

      return {
        id: raw.id,
        type: isAuctionWin ? 'auction_win' : 'land_buy',
        timestamp: raw.created_at,
        location_x,
        location_y,
        buyer: raw.buyer,
        seller: raw.seller,
        price: raw.sold_price,
        token_used: raw.token_used,
      };
    } else if (eventType === 'LandNukedEvent') {
      return {
        id: raw.id,
        type: 'nuke',
        timestamp: raw.created_at,
        location_x,
        location_y,
        owner_nuked: raw.owner_nuked,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to parse activity event:', error, raw);
    return null;
  }
}

/**
 * Get recent activity events from Torii
 */
export async function getRecentActivity(
  limit: number = 50,
): Promise<ActivityEventResponse[]> {
  const query = buildQuery(limit);

  try {
    const response = await fetch(`${PUBLIC_DOJO_TORII_URL}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error('Invalid response format:', data);
      return [];
    }

    // Parse and filter out null values
    return data
      .map((raw: RawToriiEvent) => parseEvent(raw))
      .filter((event): event is ActivityEventResponse => event !== null);
  } catch (error) {
    console.error('Failed to fetch activity from Torii:', error);
    throw error;
  }
}
