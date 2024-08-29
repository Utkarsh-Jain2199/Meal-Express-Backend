require('dotenv').config();  // Load environment variables
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// Set up the database and global variables
const db = require('./db');
db((err, data, CatData) => {
  if (err) {
    console.error('Database connection error:', err);
    process.exit(1);  // Exit the application if the database connection fails
  }
  global.foodData = data;
  global.foodCategory = CatData;
  console.log('Global data initialized.');
});

// Middleware to handle CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/auth', require('./routes/auth'));

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
