const router = require("express").Router();
const bcrypt = require("bcryptjs");
const Rider = require("../models/rider");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwt");

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
    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
