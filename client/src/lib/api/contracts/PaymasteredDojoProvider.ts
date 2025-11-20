import { DojoProvider, parseDojoCall, type DojoCall } from '@dojoengine/core';
import {
  Account,
  AccountInterface,
  OutsideExecutionVersion,
  type AllowArray,
  type Call,
  type InvokeFunctionResponse,
  type UniversalDetails,
} from 'starknet';

type LogLevel = any;

/**
 * Configuration for paymaster behavior
 */
export interface PaymasterConfig {
  enabled?: boolean;
  fallbackOnError?: boolean;
}

/**
 * Additional paymaster methods interface
 */
export interface PaymasterMethods {
  setPaymasterEnabled(enabled: boolean): void;
  executeWithPaymaster(
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse>;
  executeWithoutPaymaster(
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse>;
  canUsePaymaster(account: Account | AccountInterface): Promise<boolean>;
}

/**
 * Extended provider type with paymaster methods
 */
export type PaymasteredDojoProvider<Actions = never> = DojoProvider<Actions> &
  PaymasterMethods;

/**
 * Internal state for paymaster functionality
 */
interface PaymasterState {
  isPaymasterEnabled: boolean;
  originalExecute: DojoProvider['execute'];
}

/**
 * Check if an account supports paymaster transactions
 */
async function supportsPaymaster(account: Account): Promise<boolean> {
  return (
    (await account.getSnip9Version()) !== OutsideExecutionVersion.UNSUPPORTED
  );
}

/**
 * Convert DojoCall or Call array to the format needed for executePaymasterTransaction
 */
function convertCallsForPaymaster(
  calls: AllowArray<DojoCall | Call>,
  nameSpace: string,
  manifest: any,
): Call[] {
  const callsArray = Array.isArray(calls) ? calls : [calls];

  return callsArray.map((call) => {
    // If it's already a Call object with contractAddress, return as-is
    if ('contractAddress' in call) {
      return call as Call;
    }

    // Otherwise, it's a DojoCall that needs to be parsed
    return parseDojoCall(manifest, nameSpace, call as DojoCall);
  });
}

/**
 * Create enhanced execute function with paymaster support
 */
function createPaymasteredExecute(
  provider: DojoProvider,
  state: PaymasterState,
) {
  return async function execute(
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse> {
    // Check if paymaster is enabled and account supports it
    if (
      state.isPaymasterEnabled &&
      (await supportsPaymaster(account as Account))
    ) {
      try {
        // Convert calls to the format needed for paymaster
        const parsedCalls = convertCallsForPaymaster(
          call,
          nameSpace,
          provider.manifest,
        );

        // Log if logger is available
        if (provider.logger) {
          provider.logger.info('Executing paymastered transaction', {
            calls: parsedCalls.length,
            namespace: nameSpace,
          });
        }

        // Execute with paymaster (sponsored mode)
        const paymasterDetails = {
          ...details,
          feeMode: {
            mode: 'sponsored' as const,
          },
        };

        // Execute with paymaster
        const response = await account.executePaymasterTransaction(
          parsedCalls,
          paymasterDetails,
        );

        if (provider.logger) {
          provider.logger.info('Paymastered transaction executed', {
            transactionHash: response.transaction_hash,
          });
        }

        return response;
      } catch (error) {
        // Log error and fall back to regular execution
        if (provider.logger) {
          provider.logger.error(
            'Paymaster execution failed, falling back to regular execution',
            error,
          );
        }

        // Fall back to regular execution
        return state.originalExecute.call(
          provider,
          account,
          call,
          nameSpace,
          details,
        );
      }
    }

    // If paymaster is not enabled or not supported, use regular execution
    if (
      provider.logger &&
      state.isPaymasterEnabled &&
      !(await supportsPaymaster(account as Account))
    ) {
      provider.logger.warn(
        'Account does not support paymaster transactions, using regular execution',
      );
    }

    return state.originalExecute.call(
      provider,
      account,
      call,
      nameSpace,
      details,
    );
  };
}

/**
 * Decorator function that enhances a DojoProvider with paymaster functionality
 *
 * @param provider - The DojoProvider instance to enhance
 * @param config - Optional paymaster configuration
 * @returns Enhanced provider with paymaster capabilities
 */
export function withPaymaster<Actions = never>(
  provider: DojoProvider<Actions>,
  config: PaymasterConfig = {},
): PaymasteredDojoProvider<Actions> {
  // Create internal state
  const state: PaymasterState = {
    isPaymasterEnabled: config.enabled ?? true,
    originalExecute: provider.execute.bind(provider),
  };

  // Create the enhanced provider object
  const enhancedProvider = Object.create(
    provider,
  ) as PaymasteredDojoProvider<Actions>;

  // Override the execute method with paymaster support
  enhancedProvider.execute = createPaymasteredExecute(provider, state);

  // Add paymaster-specific methods
  enhancedProvider.setPaymasterEnabled = function (enabled: boolean): void {
    state.isPaymasterEnabled = enabled;
  };

  enhancedProvider.executeWithPaymaster = async function (
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse> {
    const originalEnabled = state.isPaymasterEnabled;
    state.isPaymasterEnabled = true;
    try {
      return await this.execute(account, call, nameSpace, details);
    } finally {
      state.isPaymasterEnabled = originalEnabled;
    }
  };

  enhancedProvider.executeWithoutPaymaster = async function (
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse> {
    const originalEnabled = state.isPaymasterEnabled;
    state.isPaymasterEnabled = false;
    try {
      return await this.execute(account, call, nameSpace, details);
    } finally {
      state.isPaymasterEnabled = originalEnabled;
    }
  };

  enhancedProvider.canUsePaymaster = async function (
    account: Account | AccountInterface,
  ): Promise<boolean> {
    return (
      state.isPaymasterEnabled && (await supportsPaymaster(account as Account))
    );
  };

  return enhancedProvider;
}

/**
 * Factory function that creates a DojoProvider and immediately decorates it with paymaster support
 *
 * @param manifest - Dojo manifest
 * @param url - RPC URL
 * @param logLevel - Log level
 * @param config - Paymaster configuration
 * @returns PaymasteredDojoProvider instance
 */
export function createPaymasteredDojoProvider<Actions = never>(
  manifest?: any,
  url?: string,
  logLevel?: LogLevel,
  config: PaymasterConfig = {},
): PaymasteredDojoProvider<Actions> {
  const provider = new DojoProvider<Actions>(manifest, url, logLevel);
  return withPaymaster(provider, config);
}

/**
 * Helper type to extract the provider type from setupWorld or similar functions
 */
export type WithPaymasteredProvider<T> = T extends (
  provider: DojoProvider<infer Actions>,
) => infer R
  ? (provider: PaymasteredDojoProvider<Actions>) => R
  : never;

/**
 * Type guard to check if a provider has paymaster capabilities
 */
export function isPaymasteredProvider<Actions = never>(
  provider: DojoProvider<Actions> | PaymasteredDojoProvider<Actions>,
): provider is PaymasteredDojoProvider<Actions> {
  return 'setPaymasterEnabled' in provider;
}
