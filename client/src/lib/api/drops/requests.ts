import { PUBLIC_PONZI_API_URL } from '$env/static/public';

export interface TokenAmountMap {
  [tokenAddress: string]: string;
}

export interface DropLandResponse {
  land_location: number;
  owner: string;
  time_bought: string;
  stake_token: string;
  drop_initial_stake: string;
  drop_remaining_stake: string;
  drop_distributed_total: string;
  token_inflows: TokenAmountMap;
  token_inflows_usd?: string | null;
  area_protocol_fees_total: TokenAmountMap;
  area_protocol_fees_total_usd?: string | null;
  sale_protocol_fees_total: TokenAmountMap;
  sale_protocol_fees_total_usd?: string | null;
  drop_roi: number;
  close_date?: string | null;
  is_active: boolean;
  influenced_auctions_total: string;
}

export interface GlobalTokenMetricsResponse {
  token: string;
  fees: string;
  sale_fees: string;
  distributed: string;
  inflows: string;
}

export interface GlobalDropMetricsResponse {
  total_revenue: string;
  total_sale_fees: string;
  total_drops_distributed: string;
  total_token_inflows: string;
  total_influenced_auctions: string;
  global_roi: number;
  since: string;
  until: string;
  per_token: GlobalTokenMetricsResponse[];
}

const DEFAULT_LEVEL = 1;
const DEFAULT_FEE_RATE = 900_000;
const DEFAULT_SALE_FEE_RATE = 500_000;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateValue(value: string): DateParts | null {
  if (!value) return null;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    let month = first;
    let day = second;
    if (first > 12 && second <= 12) {
      // First number cannot be month -> interpret as day/month
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      // Second number cannot be month -> keep default month/day order
      day = second;
      month = first;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }

  return null;
}

function dateToIso8601(
  value: string,
  options?: { endOfDay?: boolean },
): string | undefined {
  const dateParts = parseDateValue(value);
  if (!dateParts) return undefined;

  const date = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== dateParts.year ||
    date.getUTCMonth() !== dateParts.month - 1 ||
    date.getUTCDate() !== dateParts.day
  ) {
    return undefined;
  }

  if (options?.endOfDay) {
    date.setUTCHours(23, 59, 59, 0);
  }
  return date.toISOString();
}

function buildDropUrl(
  reinjector: string,
  level: number,
  feeRateBasisPoints: number,
  saleFeeBasisPoints: number,
  since?: string,
  until?: string,
  location?: number,
) {
  if (!PUBLIC_PONZI_API_URL) {
    throw new Error(
      'Drop dashboard is not configured (missing PUBLIC_PONZI_API_URL)',
    );
  }

  const baseUrl = PUBLIC_PONZI_API_URL.replace(/\/+$/, '');
  const encodedReinjector = encodeURIComponent(reinjector);
  const url = new URL(`${baseUrl}/drops/${encodedReinjector}/lands`);
  url.searchParams.set('level', level.toString());
  url.searchParams.set('fee_rate_basis_points', feeRateBasisPoints.toString());
  url.searchParams.set('sale_fee_basis_points', saleFeeBasisPoints.toString());

  if (since) {
    const sinceIso = dateToIso8601(since);
    if (sinceIso) url.searchParams.set('since', sinceIso);
  }
  if (until) {
    const untilIso = dateToIso8601(until, { endOfDay: true });
    if (untilIso) url.searchParams.set('until', untilIso);
  }
  if (location !== undefined) {
    url.searchParams.set('location', location.toString());
  }

  return url.toString();
}

function buildGlobalMetricsUrl(
  reinjector: string,
  level: number,
  feeRateBasisPoints: number,
  saleFeeBasisPoints: number,
  since?: string,
  until?: string,
) {
  if (!PUBLIC_PONZI_API_URL) {
    throw new Error(
      'Drop dashboard is not configured (missing PUBLIC_PONZI_API_URL)',
    );
  }

  const baseUrl = PUBLIC_PONZI_API_URL.replace(/\/+$/, '');
  const encodedReinjector = encodeURIComponent(reinjector);
  const url = new URL(`${baseUrl}/drops/${encodedReinjector}/global-metrics`);
  url.searchParams.set('level', level.toString());
  url.searchParams.set('fee_rate_basis_points', feeRateBasisPoints.toString());
  url.searchParams.set('sale_fee_basis_points', saleFeeBasisPoints.toString());

  if (since) {
    const sinceIso = dateToIso8601(since);
    if (sinceIso) url.searchParams.set('since', sinceIso);
  }
  if (until) {
    const untilIso = dateToIso8601(until, { endOfDay: true });
    if (untilIso) url.searchParams.set('until', untilIso);
  }

  return url.toString();
}

async function parseResponse<T>(response: Response) {
  if (!response.ok) {
    throw new Error('Ocurrió un error al cargar las drops');
  }
  return (await response.json()) as T;
}

export async function fetchDropLands(
  reinjector: string,
  level: number = DEFAULT_LEVEL,
  feeRateBasisPoints: number = DEFAULT_FEE_RATE,
  saleFeeBasisPoints: number = DEFAULT_SALE_FEE_RATE,
  since?: string,
  until?: string,
  location?: number,
): Promise<DropLandResponse[]> {
  const url = buildDropUrl(
    reinjector,
    level,
    feeRateBasisPoints,
    saleFeeBasisPoints,
    since,
    until,
    location,
  );
  const response = await fetch(url);
  return parseResponse<DropLandResponse[]>(response);
}

export async function fetchGlobalMetrics(
  reinjector: string,
  level: number = DEFAULT_LEVEL,
  feeRateBasisPoints: number = DEFAULT_FEE_RATE,
  saleFeeBasisPoints: number = DEFAULT_SALE_FEE_RATE,
  since?: string,
  until?: string,
): Promise<GlobalDropMetricsResponse> {
  const url = buildGlobalMetricsUrl(
    reinjector,
    level,
    feeRateBasisPoints,
    saleFeeBasisPoints,
    since,
    until,
  );
  const response = await fetch(url);
  return parseResponse<GlobalDropMetricsResponse>(response);
}
