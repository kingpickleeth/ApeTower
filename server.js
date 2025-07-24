const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'metadata')));

// ✅ Generate metadata and save as file *without* `.json` extension
app.post('/generate-metadata/:id', (req, res) => {
  const id = req.params.id;
  const filePath = path.join(__dirname, 'metadata', 'tower', `${id}`);


  const metadata = {
    name: `Deng Tower #${id}`,
    description: "Starter tower in Deng Defense.",
    image: `https://admin.demwitches.xyz/images/tower/${id}.png`,
    attributes: [
      { trait_type: "Type", value: id % 3 === 0 ? "Basic" : id % 3 === 1 ? "Cannon" : "Rapid" },
      { trait_type: "Level", value: 1 }
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  res.json({ success: true });
});

app.get(['/metadata/:id', '/metadata/:id.json'], (req, res) => {
    let id = req.params.id;
    if (id.endsWith('.json')) id = id.replace('.json', '');
  
    const filePath = path.resolve(__dirname, 'metadata', 'tower', `${id}`);
  
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Metadata not found' });
    }
  
    try {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const metadata = JSON.parse(fileData);
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(metadata); // ✅ Return raw JSON directly
    } catch (err) {
      console.error('❌ Error reading or parsing metadata:', err);
      res.status(500).json({ error: 'Failed to load metadata' });
    }
  });
  