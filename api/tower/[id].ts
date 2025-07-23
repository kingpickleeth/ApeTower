module.exports = (req, res) => {
  const id = req.query.id;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid or missing ID" });
  }

  const towerData = {
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
      name: "Cannon Tower",
      description: "Heavy-hitting cannon with long range and slow reload.",
      image: "https://dengdefense.com/assets/towers/cannon.png",
      attributes: [
        { trait_type: "Level", value: 1 },
        { trait_type: "Damage", value: 25 },
        { trait_type: "Range", value: 300 },
        { trait_type: "Fire Rate", value: 2400 },
        { trait_type: "Tower Type", value: "Cannon" }
      ]
    },
    "3": {
      name: "Rapid Tower",
      description: "Fast-firing tower that delivers rapid low-damage shots.",
      image: "https://dengdefense.com/assets/towers/rapid.png",
      attributes: [
        { trait_type: "Level", value: 1 },
        { trait_type: "Damage", value: 4 },
        { trait_type: "Range", value: 140 },
        { trait_type: "Fire Rate", value: 1800 },
        { trait_type: "Tower Type", value: "Rapid" }
      ]
    }
  };

  const metadata = towerData[String(id)];

  if (!metadata) {
    return res.status(404).json({ error: "Tower not found" });
  }

  return res.status(200).json(metadata);
};
