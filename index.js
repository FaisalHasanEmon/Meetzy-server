const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

app.get("/meetzy-server", (req, res) => {
  res.send({ key: "I am working for meetzy" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
