const router = require("express").Router();
const bcrypt = require("bcryptjs");
const Driver = require("../models/driver");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwt");

router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { username, email, password, mobileNo } = req.body;
    const existingDriver = await Driver.findOne({
      $or: [{ username }, { email }],
    });

    if (existingDriver) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
    const hashedPassword = await bcrypt.hash(password, 12);

    const driver = new Driver({
      username,
      email,
      password: hashedPassword,
      mobileNo,
      image: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
      },
    });

    await driver.save();
    const token = generateToken(driver);
    res.status(201).json({ message: "Driver registered successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const driver = await Driver.findOne({ username });

    if (!driver) {
      return res.status(400).json({ message: "Driver not found" });
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(driver);
    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
