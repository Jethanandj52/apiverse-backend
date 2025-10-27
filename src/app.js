require("dotenv").config({ path: "../.env" });
const express = require("express");
const { connectToDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Routers
const appRouter = require("./routes/auth");
const userHD = require("./routes/user");
const libraryRoute = require("./routes/lib");
const apiRoute = require("./routes/api");
const aiRoute = require("./routes/ai");
const storeRouter = require("./routes/store");
const notificationRouter = require("./routes/notification");
const apiRoutes = require("./routes/apiRoutes");
const libraryRoutes = require("./routes/libraryRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const Feedback = require("./routes/feedback");
const groupInviteRoute = require("./routes/groupInvite");
const groupRoutes = require('./routes/groups');
 
const savedRequestRoute = require("./routes/savedRequestRoute");
const apiHistoryRoutes = require("./routes/apiHistoryRoutes");


 

const app = express();
const port = process.env.PORT || 5000;

// ✅ CORS Setup
app.use(
  cors({
    origin: "http://localhost:5173", // React frontend
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ✅ Routes
app.use("/auth", appRouter);
app.use("/user", userHD);
app.use("/lib", libraryRoute);
app.use("/rApi", apiRoute);
app.use("/ai", aiRoute);
app.use("/store", storeRouter);
app.use("/notifications", notificationRouter);
app.use("/apis", apiRoutes);
app.use("/libraries", libraryRoutes);
app.use("/notifications", notificationRoutes);
app.use("/feedback", Feedback);
app.use("/groupInvites", groupInviteRoute);
app.use('/groups', groupRoutes);
app.use('/sharedRequests', require('./routes/sharedRequests'));
app.use('/messages', require('./routes/messages'));
app.use("/api/savedRequests", savedRequestRoute);
app.use("/requests", apiHistoryRoutes);


 
 

// ✅ Database Connect
connectToDB()
  .then(() => {
    console.log("✅ Connected to DB successfully!");

    // ⏳ Start health check worker AFTER DB connection
    require("./workers/healthCheckWorker");
  })
  .catch((err) => console.error("❌ DB connection failed:", err));

// ✅ Socket.IO Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// 🔹 Socket.IO logic
io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // 🔹 User register (room join)
  socket.on("registerUser", (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} joined room`);
  });

  // 🔹 Accept shared item
  socket.on("acceptSharedItem", async ({ sharedItemId, userId }) => {
    const SharedItem = require("./models/SharedItem");
    const sharedItem = await SharedItem.findById(sharedItemId);
    if (!sharedItem) return;

    if (!sharedItem.acceptedBy.includes(userId)) {
      sharedItem.acceptedBy.push(userId);
      sharedItem.status = "accepted";
      await sharedItem.save();

      // Notify sender
      io.to(sharedItem.sender.toString()).emit("teamMemberAccepted", {
        userId,
        sharedItemId
      });

      // Notify accepter
      io.to(userId).emit("sharedItemAccepted", sharedItem);
    }
  });

  // 🔹 Reject shared item
  socket.on("rejectSharedItem", async ({ sharedItemId, userId }) => {
    const SharedItem = require("./models/SharedItem");
    const sharedItem = await SharedItem.findById(sharedItemId);
    if (!sharedItem) return;

    sharedItem.teamMembers = sharedItem.teamMembers.filter(
      (id) => id.toString() !== userId.toString()
    );
    await sharedItem.save();

    // Notify sender
    io.to(sharedItem.sender.toString()).emit("teamMemberRejected", {
      userId,
      sharedItemId
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// ✅ Export io for workers
module.exports.io = io;

// ✅ Server Start
// server.listen(port, () =>
//   console.log("🚀 Server running with Socket.IO on port", port)
// );
module.exports = app;
