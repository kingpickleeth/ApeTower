// /api/tower/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const tokenId = Number(id);
  const metadata = {
    name: `Deng Tower #${tokenId}`,
    description: "Starter tower in Deng Defense.",
    image: `https://admin.xyz.com/images/tower/${tokenId}.png`, // Adjust if needed
    attributes: [
      { trait_type: "Type", value: tokenId % 3 === 0 ? "Basic" : tokenId % 3 === 1 ? "Cannon" : "Rapid" },
      { trait_type: "Level", value: 1 }
    ]
  };

  const filePath = path.join(process.cwd(), 'public', 'api', 'tower', `${tokenId}.json`);

  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));

  return res.status(200).json({ success: true, file: `/public/api/tower/${tokenId}.json` });
}
