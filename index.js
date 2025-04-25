// const express = require("express");
// const cors = require("cors");
// const app = express();
// require("dotenv").config();
// const port = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json());




// const { MongoClient, ServerApiVersion } = require('mongodb');

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxvwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   }
// });

// async function run() {
//   try {

//     const userCollection = client.db("MeetzyUser").collection("users");

//     app.post('/users', async (req, res) => {
//       const user = req.body;
//       const query = { email: user.email };
//       const existingUser = await userCollection.findOne(query);
//       if (existingUser) {
//         return res.send({ message: 'User already exists', insertedId: null });
//       }
//       const result = await userCollection.insertOne(user);
//       res.send(result);
//     });

//     // Connect the client to the server	(optional starting in v4.7)
//     // await client.connect();
//     // Send a ping to confirm a successful connection
//     // await client.db("admin").command({ ping: 1 });
//     // console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);



// app.get('/', (req, res) => {
//   res.send('I am working for meetzy')
// })

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });


require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://meetzyap.web.app"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxvwb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://meetzyap.firebaseapp.com"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Authentication Middleware
// io.use((socket, next) => {
//   if (socket.handshake.auth && socket.handshake.auth.token) {
//     try {
//       const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
//       socket.userEmail = decoded.email;
//       next();
//     } catch (err) {
//       console.error("Authentication error:", err);
//       next(new Error("Authentication failed: Invalid token"));
//     }
//   } else {
//     next(new Error("Authentication failed: No token provided"));
//   }
// });

// MongoDB and Socket.io Connection
async function run() {
  try {
    // await client.connect();
    const db = client.db("MeetzyDB");
    console.log("Successfully connected to MongoDB!");

    const userCollection = db.collection("users");
    const chatCollection = db.collection("chats");

    // REST API Endpoints
    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.status(200).json({ message: 'User already exists', insertedId: null });
        }
        const result = await userCollection.insertOne(user);
        res.status(201).json(result);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
      }
    });

    // Socket.io Event Handlers
    io.on("connection", async (socket) => {
      console.log("User connected:", socket.id, "Email:", socket.userEmail);

      try {
        socket.on("join-room", async ({ roomId }) => {
          try {
            socket.join(roomId);
            const email = socket.userEmail;
            socket.emit('joined-room', { roomId, userId: socket.id, email });

            const roomSockets = await io.in(roomId).fetchSockets();
            const users = roomSockets.map(s => ({ 
              userId: s.id, 
              email: s.userEmail 
            }));
            
            const otherUsers = users.filter(u => u.userId !== socket.id);
            socket.to(roomId).emit("user-connected", { userId: socket.id, email });
            socket.emit('room-users', otherUsers);

            const chatHistory = await chatCollection.find({ roomId }).sort({ timestamp: 1 }).toArray();
            socket.emit("chat-history", chatHistory);
          } catch (error) {
            console.error("Error joining room:", error);
            socket.emit("error", { message: "Failed to join room", error: error.message });
          }
        });

        socket.on("offer", (data) => {
          socket.to(data.roomId).emit("offer", data);
        });

        socket.on("answer", (data) => {
          socket.to(data.roomId).emit("answer", data);
        });

        socket.on("ice-candidate", (data) => {
          socket.to(data.roomId).emit("ice-candidate", data);
        });

        socket.on("send-message", async ({ roomId, message }) => {
          try {
            const sender = socket.userEmail;
            const timestamp = new Date();
            const msg = { sender, message, timestamp, roomId };
            await chatCollection.insertOne(msg);
            io.to(roomId).emit("receive-message", msg);
          } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("error", { message: "Failed to send message", error: error.message });
          }
        });

        socket.on("send-emoji", ({ roomId, emoji }) => {
          socket.to(roomId).emit("receive-emoji", { userId: socket.id, emoji });
        });

        socket.on('status-update', ({ roomId, muted, cameraOff }) => {
          socket.to(roomId).emit('status-update', { userId: socket.id, muted, cameraOff });
        });

        socket.on("disconnect", async () => {
          try {
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            for (const roomId of rooms) {
              socket.to(roomId).emit("user-disconnected", socket.id);
            }
            console.log("User disconnected:", socket.id, "Email:", socket.userEmail);
          } catch (error) {
            console.error("Error on disconnect:", error);
          }
        });

      } catch (error) {
        console.error("Error during connection handling:", error);
      }
    });

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Start Server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});