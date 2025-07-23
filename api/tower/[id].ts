import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const towerData: Record<string, any> = {
    "1": {
      name: "Basic Tower",
      description: "A well-rounded starter tower with balanced stats.",
      image: "https://dengdefense.com/assets/towers/basic.png",
      attributes: [
        { trait_type: "Level", value: 1 },
        { trait_type: "Damage", value: 10 },
        { trait_type: "Range", value: 160 },
        { trait_type: "Fire Rate", value: 1000 },
        { trait_type: "Tower Type", value: "Basic" }
      ]
    },
    "2": {
      name: "Sniper Tower",
      description: "Long-range tower with high single-shot damage.",
      image: "https://dengdefense.com/assets/towers/sniper.png",
      attributes: [
        { trait_type: "Level", value: 1 },
        { trait_type: "Damage", value: 25 },
        { trait_type: "Range", value: 300 },
        { trait_type: "Fire Rate", value: 2400 },
        { trait_type: "Tower Type", value: "Sniper" }
      ]
    },
    "3": {
      name: "Freeze Tower",
      description: "Slows enemies with icy blasts. Low damage, tactical utility.",
      image: "https://dengdefense.com/assets/towers/freeze.png",
      attributes: [
        { trait_type: "Level", value: 1 },
        { trait_type: "Damage", value: 4 },
        { trait_type: "Range", value: 140 },
        { trait_type: "Fire Rate", value: 1800 },
        { trait_type: "Tower Type", value: "Freeze" }
      ]
    }
  };

  const metadata = towerData[id as string];

  if (!metadata) {
    return res.status(404).json({ error: "Tower not found" });
  }

  return res.status(200).json(metadata);
}
