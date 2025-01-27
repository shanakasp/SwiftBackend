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
      riderID: rider._id,
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

router.put("/update", auth, upload.single("image"), async (req, res) => {
  try {
    const { username, email, mobileNo } = req.body;

    // Check if rider exists
    const existingRider = await Rider.findById(req.user.id);
    if (!existingRider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Prepare update data with existing fields
    const updateData = {
      username: username || existingRider.username,
      email: email || existingRider.email,
      mobileNo: mobileNo || existingRider.mobileNo,
      image: existingRider.image, // Keep existing image by default
    };

    // Handle image upload if new image is provided
    if (req.file) {
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer);
      updateData.image = {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
      };
    }

    // Update rider with new data
    const updatedRider = await Rider.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      message: "Rider updated successfully",
      rider: updatedRider,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/update", auth, upload.single("image"), async (req, res) => {
  try {
    const { username, email, mobileNo } = req.body;

    // Check if rider exists
    const existingRider = await Rider.findById(req.user.id);
    if (!existingRider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Handle image upload if provided
    const uploadPromises = [];
    if (req.file) {
      uploadPromises.push(
        uploadToCloudinary(req.file.buffer).then((result) => ({
          field: "image",
          result,
        }))
      );
    }

    // Wait for image upload to complete
    const uploadResults = await Promise.all(uploadPromises);

    // Prepare update data with existing fields
    const updateData = {
      username: username || existingRider.username,
      email: email || existingRider.email,
      mobileNo: mobileNo || existingRider.mobileNo,
      image: existingRider.image,
    };

    // Update image data if new image was uploaded
    uploadResults.forEach(({ field, result }) => {
      if (field === "image") {
        updateData.image = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
    });

    // Update rider with new data
    const updatedRider = await Rider.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      message: "Rider updated successfully",
      rider: updatedRider,
    });
  } catch (error) {
    console.error("Update error:", error);
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
