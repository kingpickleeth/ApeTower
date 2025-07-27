import { getPublicClient, getWalletClient } from '@wagmi/core';
import { writeContract } from '@wagmi/core';
import TOWER_ABI from '../abis/Tower.json';

const TOWER_CONTRACT = '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec';

export const claimMoo = async (
  wallet: string,
  amount: number,
  expiry: number,
  signature: string
) => {
  try {
    const walletClient = await getWalletClient();
    if (!walletClient) throw new Error("No wallet connected");

    const tx = await writeContract({
      address: TOWER_CONTRACT,
      abi: TOWER_ABI,
      functionName: 'claim',
      args: [
        BigInt(amount * 1e18), // MOO uses 18 decimals
        BigInt(expiry),
        signature
      ],
    });

    console.log("🎉 Tx sent:", tx.hash);
    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error("❌ Claim error:", error);
    return { success: false, error };
  }
};
