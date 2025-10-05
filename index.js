require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

const db = require('./db');
db((err, data, CatData) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
  global.foodData = data;
  global.foodCategory = CatData;
  console.log('Global data initialized.');
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, auth-token"
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use('/api/auth', require('./routes/auth'));

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
