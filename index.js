const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary").v2;

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Request and Response Logging Middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/driver", require("./routes/driverRoutes"));
app.use("/api/vehicle-owner", require("./routes/vehicleOwner"));
app.use("/api/rider", require("./routes/riderRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/nominatedDriver", require("./routes/nominatedDriver"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/securityJobs", require("./routes/securityJobsRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
