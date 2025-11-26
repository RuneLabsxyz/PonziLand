// token-transfer-store.svelte.ts
import { parseUnits } from 'viem';
import { hyperlaneStore } from './hyperlane-store.svelte';
import { Token, type TokenAmount } from '@hyperlane-xyz/sdk';
import { useAccount } from '$lib/contexts/account.svelte';
// TODO: Uncomment when using @ponziland/account package
// import { phantomWalletStore } from '@ponziland/account';
import type { AccountInterface } from 'starknet';

interface TransferParams {
  originChain: string;
  destinationChain: string;
  tokenSymbol: string;
  amount: string;
  recipient: string;
  sender: string;
}

type TransferStatus = 'idle' | 'preparing' | 'approving' | 'transferring' | 'success' | 'error';

interface TransferState {
  status: TransferStatus;
  error: string | null;
  txHashes: string[];
}

interface TransferResult {
  success: boolean;
  txHashes: string[];
  error?: string;
}

class TokenTransferStore {
  private state = $state<TransferState>({
    status: 'idle',
    error: null,
    txHashes: [],
  });

  get status() {
    return this.state.status;
  }

  get isLoading() {
    return this.state.status !== 'idle' && this.state.status !== 'success' && this.state.status !== 'error';
  }

  get error() {
    return this.state.error;
  }

  get txHashes() {
    return this.state.txHashes;
  }

  private getChainType(chainName: string): 'starknet' | 'solana' | 'evm' {
    const chainLower = chainName.toLowerCase();

    if (chainLower.includes('starknet') || chainLower === 'sepolia' || chainLower === 'mainnet') {
      return 'starknet';
    }
    if (chainLower.includes('solana') || chainLower === 'solana') {
      return 'solana';
    }
    // Default to EVM for ethereum, arbitrum, optimism, polygon, etc
    return 'evm';
  }

  async getTokenBalance(
    chainName: string,
    tokenSymbol: string,
    address: string
  ): Promise<TokenAmount | null> {
    if (!hyperlaneStore.warpCore || !hyperlaneStore.multiProvider) {
      console.warn('Hyperlane not initialized');
      return null;
    }

    try {
      // Find the token
      const token = hyperlaneStore.warpCore.tokens.find(
        (t: Token) => t.chainName === chainName && t.symbol === tokenSymbol
      );

      if (!token) {
        console.warn(`Token ${tokenSymbol} not found on ${chainName}`);
        return null;
      }

      // Get balance using Hyperlane's method
      const balance = await token.getBalance(hyperlaneStore.multiProvider, address);
      return balance;
    } catch (err) {
      console.error('Error fetching token balance:', err);
      return null;
    }
  }

  private async executeStarknetTransactions(transactions: any[], sender: string): Promise<string[]> {
    const accountManager = useAccount();
    const provider = accountManager?.getProvider();
    const account = provider?.getWalletAccount();

    if (!account) {
      throw new Error('Starknet wallet not connected');
    }

    if (account.address.toLowerCase() !== sender.toLowerCase()) {
      throw new Error('Connected wallet address does not match sender');
    }

    const txHashes: string[] = [];

    for (const tx of transactions) {
      console.log('Executing Starknet transaction:', tx);

      // Extract the transaction object from Hyperlane's WarpTypedTransaction
      // Hyperlane wraps transactions with { category, type, transaction }
      // but Starknet account.execute() expects just the Call object
      const call = tx.transaction || tx;

      // Execute transaction
      const result = await account.execute(call);
      const txHash = result.transaction_hash;

      console.log('Transaction hash:', txHash);
      txHashes.push(txHash);
    }

    return txHashes;
  }

  private async executeSolanaTransactions(transactions: any[], sender: string): Promise<string[]> {
    // TODO: Uncomment when using @ponziland/account package with phantomWalletStore
    // if (!phantomWalletStore.isConnected) {
    //   throw new Error('Phantom wallet not connected');
    // }

    // if (phantomWalletStore.walletAddress.toLowerCase() !== sender.toLowerCase()) {
    //   throw new Error('Connected Phantom address does not match sender');
    // }

    // TODO: Implement Solana transaction execution
    // This requires @solana/web3.js integration
    throw new Error('Solana transaction execution not yet implemented. Coming soon!');
  }

  private async executeEvmTransactions(transactions: any[], sender: string): Promise<string[]> {
    // TODO: Implement EVM transaction execution
    // This requires ethers or viem wallet connection
    throw new Error('EVM transaction execution not yet implemented. Connect MetaMask or similar wallet.');
  }

  async executeTransfer(params: TransferParams): Promise<TransferResult> {
    if (!hyperlaneStore.warpCore) {
      throw new Error('Hyperlane not initialized');
    }

    // Reset state
    this.state.status = 'preparing';
    this.state.error = null;
    this.state.txHashes = [];

    try {
      const {
        originChain,
        destinationChain,
        tokenSymbol,
        amount,
        recipient,
        sender
      } = params;

      console.log('Transfer params:', params);

      const tokens = hyperlaneStore.warpCore.tokens;
      const originToken = tokens.find((t: Token) =>
        t.chainName === originChain &&
        t.symbol === tokenSymbol
      );
      console.log('Origin token:', originToken);

      if (!originToken) {
        throw new Error(`Token ${tokenSymbol} not found on ${originChain}`);
      }

      const decimals = originToken.decimals;
      console.log('Decimals:', decimals, 'Amount:', String(amount));
      const weiAmount = parseUnits(String(amount), decimals);
      console.log('Wei amount:', weiAmount.toString());
      console.log('Token address:', originToken.addressOrDenom);
      const tokenAmount = originToken.amount(weiAmount);
      console.log('Token amount created:', {
        amount: tokenAmount.amount.toString(),
        decimals: tokenAmount.token.decimals,
        symbol: tokenAmount.token.symbol
      });

      console.log('Checking collateral...');
      const isCollateralSufficient = await hyperlaneStore.warpCore.isDestinationCollateralSufficient({
        originTokenAmount: tokenAmount,
        destination: destinationChain,
      });

      if (!isCollateralSufficient) {
        throw new Error('Insufficient collateral on destination chain');
      }

      console.log('Getting transfer transactions...');
      const transactions = await hyperlaneStore.warpCore.getTransferRemoteTxs({
        originTokenAmount: tokenAmount,
        destination: destinationChain,
        sender,
        recipient,
      });

      console.log('Transactions to execute:', transactions);

      this.state.status = 'transferring';
      const chainType = this.getChainType(originChain);

      let txHashes: string[];
      switch (chainType) {
        case 'starknet':
          txHashes = await this.executeStarknetTransactions(transactions, sender);
          break;
        case 'solana':
          txHashes = await this.executeSolanaTransactions(transactions, sender);
          break;
        case 'evm':
          txHashes = await this.executeEvmTransactions(transactions, sender);
          break;
        default:
          throw new Error(`Unsupported chain type: ${chainType}`);
      }

      this.state.txHashes = txHashes;
      this.state.status = 'success';
      console.log('Transfer successful! Tx hashes:', this.state.txHashes);

      return {
        success: true,
        txHashes: this.state.txHashes,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.state.error = errorMessage;
      this.state.status = 'error';

      console.error('Transfer failed:', err);

      return {
        success: false,
        txHashes: this.state.txHashes,
        error: errorMessage,
      };
    }
  }

  clearError() {
    this.state.error = null;
  }

  reset() {
    this.state.status = 'idle';
    this.state.error = null;
    this.state.txHashes = [];
  }
}

export const tokenTransferStore = new TokenTransferStore();