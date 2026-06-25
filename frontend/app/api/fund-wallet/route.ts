import { createWalletClient, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';

export async function POST(req: Request) {
  const { address } = await req.json();

  // Validate address
  if (!address || typeof address !== 'string' || address.length !== 42) {
    return Response.json({ error: 'Invalid address' }, { status: 400 });
  }

  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!deployerKey || !rpcUrl) {
    console.error('Missing env vars: DEPLOYER_PRIVATE_KEY or SEPOLIA_RPC_URL');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const deployer = createWalletClient({
      chain: sepolia,
      transport: http(rpcUrl),
      account: `0x${deployerKey.replace(/^0x/, '')}` as `0x${string}`,
    });

    const hash = await deployer.sendTransaction({
      to: address as `0x${string}`,
      value: parseEther('0.01'), // Send 0.01 ETH
    });

    return Response.json({
      success: true,
      hash,
      message: 'Wallet funded with 0.01 ETH',
    });
  } catch (error) {
    console.error('Fund wallet error:', error);
    return Response.json({ error: 'Transfer failed' }, { status: 500 });
  }
}
