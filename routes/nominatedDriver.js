const express = require("express");
const bcrypt = require("bcryptjs");
const NominateDriver = require("../models/nominateDriverSchema");
const Vehicle = require("../models/vehicleSchema");
const VehicleOwner = require("../models/vehicleOwnerSchema");
const { generateToken } = require("../utils/jwt");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

// Login route for nominated drivers
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const nominateDriver = await NominateDriver.findOne({ email });

    if (!nominateDriver) {
      return res.status(400).json({ message: "Driver not found" });
    }

    const isMatch = await bcrypt.compare(password, nominateDriver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(nominateDriver);
    res.json({
      message: "Login successful",
      token,
      driverId: nominateDriver._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get own details route
router.get("/getOwnDetails", auth, async (req, res) => {
  try {
    const nominateDriver = await NominateDriver.findById(req.user.id);
    if (!nominateDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json({
      success: true,
      data: nominateDriver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get assigned vehicle details route
router.get("/getAssignedVehicles", auth, async (req, res) => {
  try {
    const nominateDriver = await NominateDriver.findById(req.user.id).populate(
      "vehicleIds"
    );
    if (!nominateDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json({
      success: true,
      data: nominateDriver.vehicleIds,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get vehicle owner details route
router.get("/getVehicleOwnerDetails", auth, async (req, res) => {
  try {
    const nominateDriver = await NominateDriver.findById(req.user.id);
    if (!nominateDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    const vehicleOwner = await VehicleOwner.findById(
      nominateDriver.nominatedBy
    );
    if (!vehicleOwner) {
      return res.status(404).json({ message: "Vehicle Owner not found" });
    }
    res.json({
      success: true,
      data: vehicleOwner,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
