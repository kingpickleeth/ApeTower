// src/utils/upgradeTower.ts
import { useWriteContract } from 'wagmi';
import TOWER_ABI from '../abis/DengDefenseTowersV6.json'; // adjust if needed

const TOWER_ADDRESS = '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec';

export function useUpgradeTower() {
  const { writeContractAsync } = useWriteContract();

  const upgradeTower = async (tokenId: number) => {
    const txHash = await writeContractAsync({
      address: TOWER_ADDRESS,
      abi: TOWER_ABI.abi,
      functionName: 'upgradeTower',
      args: [tokenId]
    });

    return txHash;
  };

  return { upgradeTower };
}
