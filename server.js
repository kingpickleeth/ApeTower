const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
console.log("🚀 Running NEW server version with upgraded metadata logic");

// ✅ Generate metadata and save as file *without* `.json` extension
app.post('/generate-metadata/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    const filePath = path.join(__dirname, 'public', 'api', 'tower', `${id}.json`);
  
    const towerTypes = ['Basic', 'Cannon', 'Rapid'];
    const type = towerTypes[id % 3];
  
    const descriptions = {
      Basic: 'A well-balanced tower with moderate stats. Good for all-around defense.',
      Cannon: 'Fires powerful shots with long range and high damage, but slow.',
      Rapid: 'Quick-firing tower with short range and low damage per hit.'
    };
  
    const stats = {
      Basic: { Speed: 700, Range: 200, Damage: 1 },
      Cannon: { Speed: 1200, Range: 250, Damage: 2 },
      Rapid: { Speed: 400, Range: 150, Damage: 0.5 }
    };
  
    const metadata = {
      name: `${type} Tower`,
      description: descriptions[type],
      image: `https://admin.demwitches.xyz/towers/${type.toLowerCase()}.png`,
      attributes: [
        { trait_type: "Type", value: type },
        { trait_type: "Level", value: 1 },
        { trait_type: "Speed", value: stats[type].Speed },
        { trait_type: "Range", value: stats[type].Range },
        { trait_type: "Damage", value: stats[type].Damage }
      ]
    };
  
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
    res.json({ success: true });
  });
app.get(['/api/tower/:id', '/api/tower/:id.json'], (req, res) => {
  console.log('🔍 Incoming request:', req.url);
  let id = req.params.id;

  if (id.endsWith('.json')) {
    id = id.replace('.json', '');
  }

  const filePath = path.join(__dirname, 'public', 'api', 'tower', `${id}.json`);
  console.log('📁 Looking for file:', filePath);

  if (!fs.existsSync(filePath)) {
    console.log('❌ File not found');
    return res.status(404).json({ error: 'Metadata not found' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.sendFile(filePath);
});
