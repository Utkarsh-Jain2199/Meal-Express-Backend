
// global.foodData = require('./db')(function call(err, data, CatData) {
//   // console.log(data)
//   if(err) console.log(err);
//   global.foodData = data;
//   global.foodCategory = CatData;
// })

// const express = require('express')
// const app = express()
// const port = 5000
// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });
// app.use(express.json())

// app.get('/', (req, res) => {
//   res.send('Hello World!')
// })

// app.use('/api/auth', require('./Routes/Auth'));

// app.listen(process.env.PORT, () => {
// console.log(`Example app listening on http://localhost:${port}`)
// })

const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

// Set up the database and global variables
const db = require('./db');
db((err, data, CatData) => {
  if (err) {
    console.error('Database connection error:', err);
    return;
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

app.use('/api/auth', require('./Routes/Auth'));

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

