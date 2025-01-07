const router = require("express").Router();
const bcrypt = require("bcryptjs");
const Rider = require("../models/rider");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwt");
const mongoose = require("mongoose");
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { username, email, password, mobileNo } = req.body;
    const existingRider = await Rider.findOne({
      $or: [{ email }],
    });

    if (existingRider) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
    const hashedPassword = await bcrypt.hash(password, 12);

    const rider = new Rider({
      username,
      email,
      password: hashedPassword,
      mobileNo,
      image: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
      },
    });

    await rider.save();
    const token = generateToken(rider);
    res.status(201).json({ message: "Rider registered successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const rider = await Rider.findOne({ email });

    if (!rider) {
      return res.status(400).json({ message: "Rider not found" });
    }

    const isMatch = await bcrypt.compare(password, rider.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(rider);
    res.json({
      message: "Login successful",
      token,
      riderId: rider._id, // Include the rider's ID in the response
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/profile", auth, async (req, res) => {
  try {
    const rider = await Rider.findById(req.user.id).select("-password");

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.status(200).json(rider); // Return the full rider details
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const allowedUpdates = ["username", "email", "mobileNo", "image"]; // Add other allowed fields as necessary
    const updateFields = Object.keys(updates);

    const isValidOperation = updateFields.every((field) =>
      allowedUpdates.includes(field)
    );

    if (!isValidOperation) {
      return res.status(400).json({ message: "Invalid updates" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rider ID" });
    }

    const rider = await Rider.findByIdAndUpdate(id, updates, { new: true });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    res.status(200).json(rider); // Return the updated rider details
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Update Rider
router.put("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rider ID" });
    }

    const rider = await Rider.findById(id);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    Object.keys(updates).forEach((key) => {
      rider[key] = updates[key];
    });

    await rider.save();

    res.status(200).json(rider); // Return the updated rider details
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Change PW
router.put("/:id/password", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid rider ID" });
    }

    const rider = await Rider.findById(id);

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, rider.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    rider.password = await bcrypt.hash(newPassword, salt);

    await rider.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
