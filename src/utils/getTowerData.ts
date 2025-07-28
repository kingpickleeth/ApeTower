import { readContract } from '@wagmi/core';
import { formatEther } from 'viem';
import { createPublicClient, http } from 'viem';
import { apeChain } from 'wagmi/chains';
import towerJson from '../abis/Tower.json';
import { TowerNFT } from '../types/TowerNFT'; // or adjust path as needed

const DENG_TOWER_ABI = towerJson.abi;

const TOWER_CONTRACT = '0xeDed3FA692Bf921B9857F86CC5BB21419F5f77ec';

export async function getOwnedTowersWithMetadata(address: string): Promise<TowerNFT[]> {
  const client = createPublicClient({
    chain: apeChain,
    transport: http(),
  });

  // ✅ Step 1: Read owned token IDs
  const tokenIds = await client.readContract({
    address: TOWER_CONTRACT,
    abi: DENG_TOWER_ABI,
    functionName: 'getOwnedTowers',
    args: [address],
  }) as bigint[];

  // ✅ Step 2: Loop through and get metadata for each
  const towers: TowerNFT[] = await Promise.all(
    tokenIds.map(async (id) => {
      const uri = await client.readContract({
        address: TOWER_CONTRACT,
        abi: DENG_TOWER_ABI,
        functionName: 'tokenURI',
        args: [id],
      }) as string;

      const res = await fetch(uri);
      const metadata = await res.json();
      return {
        id: Number(id),
        type: metadata.attributes.find((a: any) => a.trait_type === 'Type')?.value || 'basic',
        level: parseInt(metadata.attributes.find((a: any) => a.trait_type === 'Level')?.value || '1'),
        damage: parseInt(metadata.attributes.find((a: any) => a.trait_type === 'Damage')?.value || '1'),
        range: parseInt(metadata.attributes.find((a: any) => a.trait_type === 'Range')?.value || '1'),
        speed: parseInt(metadata.attributes.find((a: any) => a.trait_type === 'Speed')?.value || '1000'),
        imageUrl: metadata.image,
      };      
      
    })
  );

  return towers;
}