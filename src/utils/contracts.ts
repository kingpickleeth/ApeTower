// utils/contracts.ts
import { getContract } from 'viem';
import { useWalletClient } from 'wagmi';

import TOWER_JSON from '../abis/DengDefenseTowersV5.json';
import MOO_JSON from '../abis/MooToken.json';

export const TOWER_CONTRACT = '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec';
export const MOO_CONTRACT = '0x932b8eF025c6bA2D44ABDc1a4b7CBAEdb5DE1582';

export function useTowerContract() {
  const { data: walletClient } = useWalletClient();
  return walletClient
    ? getContract({
        address: TOWER_CONTRACT,
        abi: TOWER_JSON.abi,
        client: walletClient,
      })
    : null;
}

export function useMooContract() {
  const { data: walletClient } = useWalletClient();
  return walletClient
    ? getContract({
        address: MOO_CONTRACT,
        abi: MOO_JSON.abi,
        client: walletClient,
      })
    : null;
}
