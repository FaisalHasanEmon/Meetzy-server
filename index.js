const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// mongodb+srv://<db_username>:<db_password>@cluster0.rxvwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxvwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const userCollection = client.db("MeetzyUser").collection("users");

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('I am working for meetzy')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


// const express = require("express");
// const cors = require("cors");
// const { MongoClient, ServerApiVersion } = require("mongodb");
// require("dotenv").config();

// const app = express();
// const port = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());

// // MongoDB Connection URI
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxvwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// // Create a MongoClient instance
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// // Global variable for collections
// let userCollection;

// async function run() {
//   try {
//     // await client.connect(); // ✅ Keep MongoDB connection open
//     console.log("✅ Successfully connected to MongoDB!");

//     // Initialize Collection
//     const db = client.db("MeetzyUser");
//     userCollection = db.collection("users");

//     // ✅ User Registration Route
//     app.post("/users", async (req, res) => {
//       const user = req.body;
//       const query = { email: user.email };
//       const existingUser = await userCollection.findOne(query);

//       if (existingUser) {
//         return res.send({ message: "User already exists", insertedId: null });
//       }

//       const result = await userCollection.insertOne(user);
//       res.send(result);
//     });

//   } catch (error) {
//     console.error(" MongoDB Connection Error:", error);
//   }
// }

// // Call run() but DO NOT close the connection
// run().catch(console.dir);

// // ✅ Root Route
// app.get("/", (req, res) => {
//   res.send("I am working for Meetzy");
// });

// // ✅ Start Express Server
// app.listen(port, () => {
//   console.log(` Server is running on port ${port}`);
// });
