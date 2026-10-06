const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const visitorRoutes = require("./routes/visitorRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy for secure cookies on cloud hosts like Render
app.set("trust proxy", 1);

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Allow cookies to be sent across origins
  })
);
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/visitors", visitorRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Visitor Management Backend is running");
});

// MongoDB Atlas connection and server startup
if (!process.env.MONGO_URI) {
  console.error("Database connection failed: MONGO_URI environment variable is missing.");
} else {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB connected successfully");

      // Bind explicitly to 0.0.0.0 for hosting environments like Render
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      // Sanitize error message to ensure credentials are never exposed in logs
      const sanitizedMessage = (error.message || "").replace(
        /(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/gi,
        "$1***@"
      );
      console.error("Database connection failed:", sanitizedMessage);
    });
}