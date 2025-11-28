// token-transfer-store.svelte.ts
import { parseUnits } from 'viem';
import { hyperlaneStore } from './hyperlane-store.svelte';
import { Token } from '@hyperlane-xyz/sdk';
import type { AccountInterface } from 'starknet';
import type {
  WalletProvider,
  TransferParams,
  TransferStatus,
  TransferResult,
  TokenAmount,
  ChainType,
  PhantomProvider
} from './types';

interface TransferState {
  status: TransferStatus;
  error: string | null;
  txHashes: string[];
}

class TokenTransferStore {
  private state = $state<TransferState>({
    status: 'idle',
    error: null,
    txHashes: [],
  });

  // Getters usando runes
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

  private getChainType(chainName: string): ChainType {
    const chainLower = chainName.toLowerCase();

    if (chainLower.includes('starknet') || chainLower === 'sepolia' || chainLower === 'mainnet') {
      return 'starknet';
    }
    if (chainLower.includes('solana') || chainLower === 'solana') {
      return 'solana';
    }

    throw new Error(`Unsupported chain: ${chainName}. Only Starknet and Solana are supported.`);
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

  private async executeStarknetTransactions(
    transactions: any[],
    sender: string,
    account: AccountInterface
  ): Promise<string[]> {
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

  private async executeSolanaTransactions(
    transactions: any[],
    sender: string,
    wallet: PhantomProvider
  ): Promise<string[]> {
    if (!wallet || !wallet.isConnected) {
      throw new Error('Solana wallet not connected');
    }

    if (!wallet.publicKey) {
      throw new Error('Solana wallet public key not available');
    }

    // Verify wallet address matches sender
    const walletAddress = wallet.publicKey.toString();
    if (walletAddress.toLowerCase() !== sender.toLowerCase()) {
      throw new Error('Connected Phantom wallet address does not match sender');
    }

    const txHashes: string[] = [];

    try {
      // Hyperlane returns transactions that need to be signed and sent
      // For Solana, these should be Transaction or VersionedTransaction objects
      for (const tx of transactions) {
        console.log('Executing Solana transaction:', tx);

        // Extract the actual transaction from Hyperlane's wrapper if needed
        const transaction = tx.transaction || tx;

        // Sign and send the transaction using Phantom
        // Phantom's signAndSendTransaction handles both signing and broadcasting
        const result = await wallet.signAndSendTransaction(transaction, {
          skipPreflight: false // Perform preflight checks for safety
        });

        const signature = result.signature;
        console.log('Transaction signature:', signature);
        txHashes.push(signature);
      }

      return txHashes;
    } catch (err) {
      console.error('Error executing Solana transactions:', err);
      throw new Error(
        err instanceof Error
          ? `Solana transaction failed: ${err.message}`
          : 'Failed to execute Solana transaction'
      );
    }
  }

  async executeTransfer(params: TransferParams, walletProvider: WalletProvider): Promise<TransferResult> {
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

      // 1. Encontrar el token
      const tokens = hyperlaneStore.warpCore.tokens;
      const originToken = tokens.find((t: Token) =>
        t.chainName === originChain &&
        t.symbol === tokenSymbol
      );
      console.log('Origin token:', originToken);

      if (!originToken) {
        throw new Error(`Token ${tokenSymbol} not found on ${originChain}`);
      }

      // 2. Crear TokenAmount
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

      // // 3. Estimar fees antes de transferir
      // console.log('Estimating fees...');
      // const feeEstimate = await hyperlaneStore.warpCore.estimateTransferRemoteFees({
      //   originToken,
      //   destination: destinationChain,
      //   sender
      // });

      // console.log('💰 Fee Estimate:');
      // console.log('  Interchain fee (IGP):', feeEstimate.interchainQuote.getDecimalFormattedAmount(), feeEstimate.interchainQuote.token.symbol);
      // console.log('  Local fee:', feeEstimate.localQuote.getDecimalFormattedAmount(), feeEstimate.localQuote.token.symbol);
      // console.log('  Total fee:', (
      //   parseFloat(feeEstimate.interchainQuote.getDecimalFormattedAmount()) +
      //   parseFloat(feeEstimate.localQuote.getDecimalFormattedAmount())
      // ).toFixed(4), feeEstimate.interchainQuote.token.symbol);

      // 4. Verificar si hay suficiente colateral en destino
      console.log('Checking collateral...');
      const isCollateralSufficient = await hyperlaneStore.warpCore.isDestinationCollateralSufficient({
        originTokenAmount: tokenAmount,
        destination: destinationChain,
      });

      if (!isCollateralSufficient) {
        throw new Error('Insufficient collateral on destination chain');
      }

      // 5. Obtener transacciones necesarias
      console.log('Getting transfer transactions...');
      const transactions = await hyperlaneStore.warpCore.getTransferRemoteTxs({
        originTokenAmount: tokenAmount,
        destination: destinationChain,
        sender,
        recipient,
      });

      console.log('Transactions to execute:', transactions);

      // 5. Ejecutar transacciones según el tipo de chain
      this.state.status = 'transferring';
      const chainType = this.getChainType(originChain);

      let txHashes: string[];
      if (chainType === 'starknet') {
        const account = walletProvider.getStarknetAccount();
        if (!account) {
          throw new Error('Starknet account not available from wallet provider');
        }
        txHashes = await this.executeStarknetTransactions(transactions, sender, account);
      } else if (chainType === 'solana') {
        const wallet = walletProvider.getSolanaWallet();
        if (!wallet) {
          throw new Error('Solana wallet not available from wallet provider');
        }
        txHashes = await this.executeSolanaTransactions(transactions, sender, wallet);
      } else {
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

// Exportar instancia global del store
export const tokenTransferStore = new TokenTransferStore();