import { VercelRequest, VercelResponse } from '@vercel/node';

const handler = (req: VercelRequest, res: VercelResponse) => {
  const id = req.query.id;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid or missing ID" });
  }

  const towerId = Number(id);

  if (isNaN(towerId) || towerId < 1 || towerId > 9999) {
    return res.status(404).json({ error: "Tower not found" });
  }

  // Generate different tower types in a repeating pattern
  const types = ["Basic", "Cannon", "Rapid"];
  const type = types[(towerId - 1) % 3]; // repeat in exact 3-pack order
  

  const baseStats = {
    Basic:    { damage: 10, range: 160, fireRate: 1000 },
    Cannon:   { damage: 25, range: 300, fireRate: 2400 },
    Rapid:    { damage: 4, range: 140, fireRate: 1800 }
  }[type];

  const metadata = {
    name: `${type} Tower`,
    description: `A level 1 ${type.toLowerCase()} tower.`,
    image: `https://dengdefense.com/assets/towers/${type.toLowerCase()}.png`,
    attributes: [
      { trait_type: "Level", value: 1 },
      { trait_type: "Damage", value: baseStats.damage },
      { trait_type: "Range", value: baseStats.range },
      { trait_type: "Fire Rate", value: baseStats.fireRate },
      { trait_type: "Tower Type", value: type }
    ]
  };

  return res.status(200).json(metadata);
};

export default handler;
