const router = require("express").Router();
const bcrypt = require("bcryptjs");
const VehicleOwner = require("../models/vehicleOwner");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwt");

router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { username, email, password, mobileNo } = req.body;
    const existingOwner = await VehicleOwner.findOne({
      $or: [{ username }, { email }],
    });

    if (existingOwner) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
    const hashedPassword = await bcrypt.hash(password, 12);

    const owner = new VehicleOwner({
      username,
      email,
      password: hashedPassword,
      mobileNo,
      image: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
      },
    });

    await owner.save();
    const token = generateToken(owner);
    res
      .status(201)
      .json({ message: "Vehicle Owner registered successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const owner = await VehicleOwner.findOne({ username });

    if (!owner) {
      return res.status(400).json({ message: "Vehicle owner not found" });
    }

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(owner);
    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
