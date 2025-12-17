/**
 * Automation Executor
 * Handles finding matching lands and building multicall transactions
 */

import type { AutomationRule } from '$lib/stores/automation.store.svelte';
import type { BaseLand } from '$lib/api/land';
import { AuctionLand } from '$lib/api/land/auction_land';
import type { Token } from '$lib/interfaces';
import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';
import { padAddress } from '$lib/utils';
import { setupWorld } from '$lib/contracts.gen';
import type { DojoProvider, DojoCall } from '@dojoengine/core';
import { cairo, CallData, type Call } from 'starknet';
import { findBestSourceToken } from './swap-helper';
import data from '$profileData';

export interface MatchedAction {
  land: BaseLand;
  action: 'buy' | 'bid';
  cost: CurrencyAmount;
  costInBaseToken: CurrencyAmount | null;
  sellPrice: CurrencyAmount;
  stakeAmount: CurrencyAmount;
  payToken: Token;
  landToken: Token;
}

export interface AutomationPreview {
  matches: MatchedAction[];
  totalCostByToken: Map<string, CurrencyAmount>;
  totalCostInBaseToken: CurrencyAmount | null;
  insufficientBalance: boolean;
  balanceWarnings: string[];
}

/**
 * Find all lands matching automation rule filters
 */
export function findMatchingLands(
  rule: AutomationRule,
  allLands: BaseLand[],
): MatchedAction[] {
  const matches: MatchedAction[] = [];
  const baseToken = getBaseToken();

  for (const land of allLands) {
    // Skip if not the right type
    if (rule.type === 'auction-buy' && land.type !== 'auction') continue;
    if (rule.type === 'land-snipe' && land.type !== 'building') continue;

    // Skip if no token info
    if (!land.token) continue;

    // Check token filter
    if (rule.filters.tokens.length > 0) {
      const landTokenAddress = padAddress(land.token.address);
      const matchesToken = rule.filters.tokens.some(
        (t) => padAddress(t) === landTokenAddress,
      );
      if (!matchesToken) continue;
    }

    // Get the current price
    let currentPrice: CurrencyAmount;
    if (land.type === 'auction' && land instanceof AuctionLand) {
      // For auctions, use floor price as approximation
      currentPrice = land.floorPrice ?? land.startPrice;
    } else {
      currentPrice = land.sellPrice;
    }

    if (!currentPrice) continue;

    // Check max price filter
    if (rule.filters.maxPriceUsd && baseToken) {
      const priceInBase = walletStore.convertTokenAmount(
        currentPrice,
        land.token,
        baseToken,
      );
      if (priceInBase) {
        const priceUsd = parseFloat(priceInBase.toString());
        if (priceUsd > rule.filters.maxPriceUsd) continue;
      }
    }

    // Check max price in specific token
    if (rule.filters.maxPriceToken) {
      const maxPrice = parseFloat(rule.filters.maxPriceToken);
      const currentPriceNum = parseFloat(currentPrice.toString());
      if (currentPriceNum > maxPrice) continue;
    }

    // Calculate sell price and stake based on settings
    const sellPriceMultiplier = 1 + rule.settings.sellPricePercent / 100;
    const sellPrice = CurrencyAmount.fromUnscaled(
      BigInt(
        Math.floor(
          currentPrice.rawValue().times(sellPriceMultiplier).toNumber(),
        ),
      ),
      land.token,
    );

    const stakeMultiplier = rule.settings.stakePercent / 100;
    const stakeAmount = CurrencyAmount.fromUnscaled(
      BigInt(
        Math.floor(sellPrice.rawValue().times(stakeMultiplier).toNumber()),
      ),
      land.token,
    );

    // Determine pay token
    let payToken: Token;
    if (rule.settings.payWithToken) {
      const foundToken = data.availableTokens.find(
        (t) =>
          padAddress(t.address) === padAddress(rule.settings.payWithToken!),
      );
      payToken = foundToken ?? land.token;
    } else {
      // Auto-select: use land's token if we have balance, otherwise find best
      const landTokenBalance = walletStore.getBalance(land.token.address);
      const totalNeeded = currentPrice.rawValue().plus(stakeAmount.rawValue());

      if (landTokenBalance && landTokenBalance.rawValue().gte(totalNeeded)) {
        payToken = land.token;
      } else {
        const best = findBestSourceToken(land.token.address);
        payToken = best ?? land.token;
      }
    }

    // Calculate cost in base token
    const costInBaseToken = baseToken
      ? walletStore.convertTokenAmount(currentPrice, land.token, baseToken)
      : null;

    matches.push({
      land,
      action: land.type === 'auction' ? 'bid' : 'buy',
      cost: currentPrice,
      costInBaseToken,
      sellPrice,
      stakeAmount,
      payToken,
      landToken: land.token,
    });
  }

  // Sort by cost (cheapest first)
  matches.sort((a, b) => {
    if (a.costInBaseToken && b.costInBaseToken) {
      return a.costInBaseToken
        .rawValue()
        .comparedTo(b.costInBaseToken.rawValue());
    }
    return 0;
  });

  return matches;
}

/**
 * Build a preview of what the automation will do
 */
export function buildAutomationPreview(
  matches: MatchedAction[],
): AutomationPreview {
  const totalCostByToken = new Map<string, CurrencyAmount>();
  const balanceWarnings: string[] = [];
  const baseToken = getBaseToken();

  // Calculate total cost per token (cost + stake)
  for (const match of matches) {
    const tokenAddress = match.landToken.address;
    const totalForThis = match.cost
      .rawValue()
      .plus(match.stakeAmount.rawValue());

    const existing = totalCostByToken.get(tokenAddress);
    if (existing) {
      totalCostByToken.set(
        tokenAddress,
        CurrencyAmount.fromUnscaled(
          BigInt(existing.rawValue().plus(totalForThis).toString()),
          match.landToken,
        ),
      );
    } else {
      totalCostByToken.set(
        tokenAddress,
        CurrencyAmount.fromUnscaled(
          BigInt(totalForThis.toString()),
          match.landToken,
        ),
      );
    }
  }

  // Check balances and build warnings
  let insufficientBalance = false;
  for (const [tokenAddress, totalCost] of totalCostByToken) {
    const balance = walletStore.getBalance(tokenAddress);
    if (!balance || balance.rawValue().lt(totalCost.rawValue())) {
      insufficientBalance = true;
      const token = walletStore.getToken(tokenAddress);
      const needed = totalCost.toString();
      const have = balance?.toString() ?? '0';
      balanceWarnings.push(
        `Insufficient ${token?.symbol ?? 'tokens'}: need ${needed}, have ${have}`,
      );
    }
  }

  // Calculate total in base token
  let totalCostInBaseToken: CurrencyAmount | null = null;
  if (baseToken) {
    let total = CurrencyAmount.fromUnscaled(0n, baseToken);
    for (const [tokenAddress, cost] of totalCostByToken) {
      const token = walletStore.getToken(tokenAddress);
      if (token) {
        const converted = walletStore.convertTokenAmount(
          cost,
          token,
          baseToken,
        );
        if (converted) {
          total = CurrencyAmount.fromUnscaled(
            BigInt(total.rawValue().plus(converted.rawValue()).toString()),
            baseToken,
          );
        }
      }
    }
    totalCostInBaseToken = total;
  }

  return {
    matches,
    totalCostByToken,
    totalCostInBaseToken,
    insufficientBalance,
    balanceWarnings,
  };
}

/**
 * Build multicall for all matched actions
 */
export async function buildAutomationCalls(
  matches: MatchedAction[],
  provider: DojoProvider,
): Promise<Array<DojoCall | Call>> {
  const world = setupWorld(provider);
  const calls: Array<DojoCall | Call> = [];

  // First, aggregate all token approvals needed
  const approvalsByToken = new Map<string, bigint>();

  for (const match of matches) {
    // Calculate total amount needed for this action (cost + stake in land's token)
    const totalNeeded = match.cost
      .rawValue()
      .plus(match.stakeAmount.rawValue());

    // Add to approval amount
    const tokenAddress = match.landToken.address;
    const current = approvalsByToken.get(tokenAddress) ?? 0n;
    approvalsByToken.set(
      tokenAddress,
      current + BigInt(totalNeeded.toString()),
    );
  }

  // Get the actions contract address for approvals
  const actionsContract = provider.manifest.contracts.find(
    (c: { tag: string }) => c.tag === 'ponzi_land-actions',
  )?.address;

  if (!actionsContract) {
    throw new Error('Actions contract not found in manifest');
  }

  // Build approval calls
  for (const [tokenAddress, amount] of approvalsByToken) {
    calls.push({
      contractAddress: tokenAddress,
      entrypoint: 'approve',
      calldata: CallData.compile({
        spender: actionsContract,
        amount: cairo.uint256(amount),
      }),
    });
  }

  // Build action calls
  for (const match of matches) {
    const landLocation = match.land.locationString;
    const tokenForSale = match.landToken.address;
    const sellPrice = match.sellPrice.toBignumberish();
    const amountToStake = match.stakeAmount.toBignumberish();

    if (match.action === 'bid') {
      calls.push(
        world.actions.buildBidCalldata(
          landLocation,
          tokenForSale,
          sellPrice,
          amountToStake,
        ),
      );
    } else {
      calls.push(
        world.actions.buildBuyCalldata(
          landLocation,
          tokenForSale,
          sellPrice,
          amountToStake,
        ),
      );
    }
  }

  return calls;
}

/**
 * Execute automation with all matched actions
 */
export async function executeAutomation(
  matches: MatchedAction[],
  account: any,
  provider: DojoProvider,
): Promise<{ transaction_hash: string } | undefined> {
  if (matches.length === 0) {
    throw new Error('No actions to execute');
  }

  const calls = await buildAutomationCalls(matches, provider);

  if (calls.length === 0) {
    throw new Error('No calls built');
  }

  return await provider.execute(account, calls, 'ponzi_land');
}
