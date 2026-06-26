import { encodeFunctionData, type Abi, type ContractFunctionArgs, type ContractFunctionName } from 'viem';
import { magic } from './magicClient';
import { publicClient } from './viemWalletClient';
import { withTimeout } from './withTimeout';

type SendTxParams<
  TAbi extends Abi,
  TFn extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
> = {
  address: `0x${string}`;
  abi: TAbi;
  functionName: TFn;
  args: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFn>;
  value?: bigint;
};

/**
 * Sends a contract write transaction using Magic's relay for signing
 * and our own Infura RPC for gas estimation + broadcast.
 *
 * This bypasses wagmi's writeContractAsync which requires a "warm"
 * connector — first-click failures happen when Magic's WebView isn't
 * ready yet. Calling magic.rpcProvider.request directly avoids that.
 */
export async function sendTx<
  TAbi extends Abi,
  TFn extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
>(params: SendTxParams<TAbi, TFn>): Promise<`0x${string}`> {
  const provider = magic.rpcProvider as unknown as {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
  };

  const accounts: string[] = await withTimeout(
    provider.request({ method: 'eth_accounts' }),
    5_000,
    'eth_accounts',
  );
  const from = accounts?.[0];
  if (!from) throw new Error('No wallet connected');

  const data = encodeFunctionData({
    abi: params.abi as Abi,
    functionName: params.functionName as string,
    args: params.args as readonly unknown[],
  });

  const to = params.address;
  const value = params.value ?? 0n;

  const [gasEstimate, feeData, nonce] = await withTimeout(
    Promise.all([
      publicClient.estimateGas({ account: from as `0x${string}`, to, data, value }).catch(() => 200000n),
      publicClient.estimateFeesPerGas(),
      publicClient.getTransactionCount({ address: from as `0x${string}`, blockTag: 'pending' }),
    ]),
    10_000,
    'Gas estimation',
  );

  const gas = (gasEstimate * 130n) / 100n;
  const maxFeePerGas = (feeData.maxFeePerGas ?? 3000000000n) * 130n / 100n;
  const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas ?? 1500000000n) * 130n / 100n;

  const txParams: Record<string, string> = {
    from,
    to,
    data,
    gas: `0x${gas.toString(16)}`,
    maxFeePerGas: `0x${maxFeePerGas.toString(16)}`,
    maxPriorityFeePerGas: `0x${maxPriorityFeePerGas.toString(16)}`,
    nonce: `0x${nonce.toString(16)}`,
  };
  if (value > 0n) txParams.value = `0x${value.toString(16)}`;

  const hash = await withTimeout(
    provider.request({ method: 'eth_sendTransaction', params: [txParams] }),
    30_000,
    'Transaction send',
  );

  return hash as `0x${string}`;
}
