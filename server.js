const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

app.post('/generate-metadata/:id', (req, res) => {
  const id = req.params.id;
  const filePath = path.join(__dirname, 'public', 'api', 'tower', `${id}.json`);

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

app.listen(3001, () => {
  console.log('🚀 Metadata server running at http://localhost:3001');
});
// In your metadata server (Express)
app.get('/api/tower/:id', async (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, 'api', 'tower', `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Metadata not found' });
  }

  res.setHeader('Content-Type', 'application/json');
  res.sendFile(filePath);
});
// In your metadata server (Express)
app.get('/api/tower/:id', async (req, res) => {
    const { id } = req.params;
    const filePath = path.join(__dirname, 'api', 'tower', `${id}.json`);
  
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Metadata not found' });
    }
  
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(filePath);
  });
  