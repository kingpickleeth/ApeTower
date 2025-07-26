import { encodeFunctionData, WalletClient } from 'viem';
import { TOWER_CONTRACT } from './contracts';
import { apeChain } from 'viem/chains'; // ⬅️ make sure this matches your config

export async function buyMoo({
  walletClient,
  amount,
}: {
  walletClient: WalletClient;
  amount: bigint;
}) {
  if (!walletClient.account || !walletClient.account.address) {
    throw new Error('Wallet account is missing.');
  }

  const data = encodeFunctionData({
    abi: [
      {
        name: 'buyMoo',
        type: 'function',
        stateMutability: 'payable',
        inputs: [],
        outputs: [],
      },
    ],
    functionName: 'buyMoo',
  });

  const txHash = await walletClient.sendTransaction({
    chain: apeChain, // ✅ REQUIRED for Viem v2.33+
    to: TOWER_CONTRACT,
    account: walletClient.account.address,
    value: amount,
    data,
  });

  return txHash;
}
