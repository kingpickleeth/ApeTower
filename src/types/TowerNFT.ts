export type TowerNFT = {
  id: number;
  type: 'basic' | 'rapid' | 'cannon';
  level: number;
  damage: number;
  range: number;
  speed: number;
  imageUrl: string;
  used?: boolean;
  fireRate?: number; // optional to avoid breakage
};
