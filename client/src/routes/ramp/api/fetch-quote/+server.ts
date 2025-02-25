import { fetchQuote } from '$lib/server/layerswap';
import { NotFoundError } from '@layerswap/sdk';
import { json } from '@sveltejs/kit';

export type QuoteResponse = {
  source_token: string;
  blockchain_fees: number;
  layerswap_fees: number;
  ramp_fees: number;
  receive_amount: number;
};

export async function GET(request: Request) {
  const params = URL.parse(request.url)!.searchParams;
  const sourceNetwork = params.get('sourceNetwork');
  const sourceToken = params.get('sourceToken');
  const amount = params.get('amount');

  try {
    const quoteResponse = await fetchQuote(
      sourceNetwork!,
      sourceToken!,
      Number(amount!),
    );

    const rampFees = Number(amount) * 0.01 || 0;
    // Format it in a simpler way
    const jsonData = {
      source_token: sourceToken!,
      blockchain_fees: quoteResponse.data?.quote?.blockchain_fee || 0,
      layerswap_fees: quoteResponse.data?.quote?.service_fee || 0,
      ramp_fees: rampFees,
      receive_amount:
        (quoteResponse.data?.quote?.receive_amount || 0) - rampFees,
    };

    return json(jsonData);
  } catch (error) {
    console.error(error);

    const errorData = (error.error as any | undefined)?.error;
    const code = errorData?.code;
    console.log(code);
    if (code === 'ROUTE_NOT_FOUND_ERROR') {
      return json({
        error: {
          code: 'ROUTE_NOT_FOUND_ERROR',
          message: 'No route was found. Try with another token',
        },
      });
    } else if (code === 'GREATER_THAN_MAX_ERROR') {
      return json({
        error: {
          code: 'GREATER_THAN_MAX_ERROR',
          message:
            'Hold on a minute, this is more than what we can handle! You cannot transfer more than ' +
            errorData.metadata['AmountLimit'] +
            ' ' +
            sourceToken +
            '.',
        },
      });
    } else {
      return json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred',
        },
      });
    }
  }
}
