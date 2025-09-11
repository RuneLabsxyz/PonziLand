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
 * PaymasteredDojoProvider extends DojoProvider to add automatic paymaster support
 * for all execute calls. When an account supports paymaster transactions,
 * it will automatically use sponsored fee mode.
 */
export class PaymasteredDojoProvider extends DojoProvider {
  private paymasterEnabled: boolean = true;

  constructor(manifest?: any, url?: string, logLevel?: LogLevel) {
    super(manifest, url, logLevel);
  }

  /**
   * Enable or disable paymaster for all transactions
   */
  setPaymasterEnabled(enabled: boolean) {
    this.paymasterEnabled = enabled;
  }

  /**
   * Check if an account supports paymaster transactions
   */
  private async supportsPaymaster(account: Account): Promise<boolean> {
    return (
      (await account.getSnip9Version()) !== OutsideExecutionVersion.UNSUPPORTED
    );
  }

  /**
   * Convert DojoCall or Call array to the format needed for executePaymasterTransaction
   */
  private convertCallsForPaymaster(
    calls: AllowArray<DojoCall | Call>,
    nameSpace: string,
  ): Call[] {
    const callsArray = Array.isArray(calls) ? calls : [calls];

    return callsArray.map((call) => {
      // If it's already a Call object with contractAddress, return as-is
      if ('contractAddress' in call) {
        return call as Call;
      }

      // Otherwise, it's a DojoCall that needs to be parsed
      return parseDojoCall(this.manifest, nameSpace, call as DojoCall);
    });
  }

  /**
   * Override the execute method to add paymaster support
   *
   * @param {Account | AccountInterface} account - The account to use
   * @param {AllowArray<DojoCall | Call>} call - The call or calls to execute
   * @param {string} nameSpace - The namespace for the contract
   * @param {UniversalDetails} details - Optional transaction details
   * @returns {Promise<InvokeFunctionResponse>} - The transaction response
   */
  async execute(
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse> {
    // Check if paymaster is enabled and account supports it
    if (
      this.paymasterEnabled &&
      (await this.supportsPaymaster(account as Account))
    ) {
      try {
        // Convert calls to the format needed for paymaster
        const parsedCalls = this.convertCallsForPaymaster(call, nameSpace);

        // Log if logger is available
        if (this.logger) {
          this.logger.info('Executing paymastered transaction', {
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

        // Cast to any to access executePaymasterTransaction
        const response = await account.executePaymasterTransaction(
          parsedCalls,
          paymasterDetails,
        );

        if (this.logger) {
          this.logger.info('Paymastered transaction executed', {
            transactionHash: response.transaction_hash,
          });
        }

        return response;
      } catch (error) {
        // Log error and fall back to regular execution
        if (this.logger) {
          this.logger.error(
            'Paymaster execution failed, falling back to regular execution',
            error,
          );
        }

        // Fall back to regular execution
        return super.execute(account, call, nameSpace, details);
      }
    }

    // If paymaster is not enabled or not supported, use regular execution
    if (
      this.logger &&
      this.paymasterEnabled &&
      !(await this.supportsPaymaster(account as Account))
    ) {
      this.logger.warn(
        'Account does not support paymaster transactions, using regular execution',
      );
    }

    return super.execute(account, call, nameSpace, details);
  }

  /**
   * Execute with explicit paymaster control
   * Allows overriding the default paymaster behavior for specific calls
   */
  async executeWithPaymaster(
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse> {
    const originalEnabled = this.paymasterEnabled;
    this.paymasterEnabled = true;
    try {
      return await this.execute(account, call, nameSpace, details);
    } finally {
      this.paymasterEnabled = originalEnabled;
    }
  }

  /**
   * Execute without paymaster (regular execution)
   * Useful when you explicitly want to avoid paymaster for certain calls
   */
  async executeWithoutPaymaster(
    account: Account | AccountInterface,
    call: AllowArray<DojoCall | Call>,
    nameSpace: string,
    details?: UniversalDetails,
  ): Promise<InvokeFunctionResponse> {
    const originalEnabled = this.paymasterEnabled;
    this.paymasterEnabled = false;
    try {
      return await this.execute(account, call, nameSpace, details);
    } finally {
      this.paymasterEnabled = originalEnabled;
    }
  }

  /**
   * Helper method to check if a specific account can use paymaster
   */
  async canUsePaymaster(account: Account | AccountInterface): Promise<boolean> {
    return (
      this.paymasterEnabled &&
      (await this.supportsPaymaster(account as Account))
    );
  }
}

/**
 * Factory function to create a PaymasteredDojoProvider with the same signature as DojoProvider
 */
export function createPaymasteredDojoProvider(
  manifest?: any,
  url?: string,
  logLevel?: LogLevel,
): PaymasteredDojoProvider {
  return new PaymasteredDojoProvider(manifest, url, logLevel);
}

/**
 * Helper type to extract the provider type from setupWorld or similar functions
 */
export type WithPaymasteredProvider<T> = T extends (
  provider: DojoProvider,
) => infer R
  ? (provider: PaymasteredDojoProvider) => R
  : never;
