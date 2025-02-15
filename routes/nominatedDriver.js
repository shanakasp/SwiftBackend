const express = require("express");
const bcrypt = require("bcryptjs");
const NominateDriver = require("../models/nominatedDriver");
const Vehicle = require("../models/vehicleSchema");
const VehicleOwner = require("../models/vehicleOwner");
const { generateToken } = require("../utils/jwt");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const mongoose = require("mongoose");
const multer = require("multer");
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const { uploadToCloudinary } = require("../utils/cloudinary");

const uploadFields = upload.fields([
  { name: "driverLicense", maxCount: 1 },
  { name: "prdp", maxCount: 1 },
  { name: "imageID", maxCount: 1 },
  { name: "policeClearance", maxCount: 1 },
  { name: "proofOfAddress", maxCount: 1 },
]);

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
      NominatedDriverID: nominateDriver._id,
    });
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
      return res.status(400).json({ message: "Invalid driver ID" });
    }
    const nominateDriver = await NominateDriver.findById(id);
    if (!nominateDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    const isMatch = await bcrypt.compare(oldPassword, nominateDriver.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }
    const salt = await bcrypt.genSalt(10);
    nominateDriver.password = await bcrypt.hash(newPassword, salt);
    await nominateDriver.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get own details route
router.get("/getOwnDetails", auth, async (req, res) => {
  try {
    const nominateDriver = await NominateDriver.findById(req.user.id).select(
      "-password"
    );
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
    const nominateDriver = await NominateDriver.findById(req.user.id)
      .populate({
        path: "vehicleIds",
        model: "Vehicle",
      })
      .lean();

    if (!nominateDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({
      success: true,
      data: nominateDriver.vehicleIds,
    });
  } catch (error) {
    console.error("Error fetching assigned vehicles:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

router.get("/getAssignedVehicle/:vehicleId", auth, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const nominatedDriver = await NominateDriver.findById(req.user.id)
      .populate({
        path: "vehicleIds",
        match: { _id: vehicleId },
        model: "Vehicle",
      })
      .lean();

    if (!nominatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const assignedVehicle = nominatedDriver.vehicleIds.find(
      (vehicle) => vehicle._id.toString() === vehicleId
    );

    if (!assignedVehicle) {
      return res.status(404).json({ message: "Assigned vehicle not found" });
    }

    res.json({
      success: true,
      data: assignedVehicle,
    });
  } catch (error) {
    console.error("Error fetching assigned vehicle:", error);
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
    const nominateDriver = await NominateDriver.findById(req.user.id).lean();
    if (!nominateDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const vehicleOwner = await VehicleOwner.findById(
      nominateDriver.nominatedBy
    ).lean();
    if (!vehicleOwner) {
      return res.status(404).json({ message: "Vehicle Owner not found" });
    }

    // Construct the response with the required fields and hide the unwanted ones
    const response = {
      fullName: vehicleOwner.fullName,
      imageID: vehicleOwner.imageID,
      dateOfBirth: vehicleOwner.dateOfBirth,
      email: vehicleOwner.email,
      phone: vehicleOwner.phone,
      address: vehicleOwner.address,
      // idPassportNumber: vehicleOwner.idPassportNumber,
      // criminalRecordCheck: vehicleOwner.criminalRecordCheck,
      // consentDrivingRecordCheck: vehicleOwner.consentDrivingRecordCheck,
      // consentEmploymentVerification: vehicleOwner.consentEmploymentVerification,
      // acceptTermsConditions: vehicleOwner.acceptTermsConditions,
      // consentDataProcessing: vehicleOwner.consentDataProcessing,
      // adminVerified: vehicleOwner.adminVerified,
      // proofOfAddress: vehicleOwner.proofOfAddress,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching vehicle owner details:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});
router.patch("/update-expire-date", auth, async (req, res) => {
  try {
    const { drivingLicenseExpireDate } = req.body;
    if (!drivingLicenseExpireDate) {
      return res.status(400).json({ message: "Expiration date is required" });
    }
    const updatedDriver = await NominateDriver.findByIdAndUpdate(
      req.user.id,
      { drivingLicenseExpireDate },
      { new: true }
    );
    if (!updatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.status(200).json({
      message: "Driving license expiration date updated successfully",
      driver: updatedDriver,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/updateDetails", auth, uploadFields, async (req, res) => {
  try {
    const {
      fullName,
      idPassportNumber,
      dateOfBirth,
      email,
      proofOfAddress,
      phone,
      address,
      driverLicense,
      drivingLicenseExpireDate,
      prdp,
      policeClearance,
      criminalRecordCheck,
      consentDrivingRecordCheck,
      consentEmploymentVerification,
      acceptTermsConditions,
      consentDataProcessing,
    } = req.body;
    const existingDriver = await NominateDriver.findById(req.user.id);
    if (!existingDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    const uploadPromises = [];
    const files = req.files;
    const driverDocs = {
      driverLicense: files.driverLicense?.[0],
      prdp: files.prdp?.[0],
      policeClearance: files.policeClearance?.[0],
      proofOfAddress: files.proofOfAddress?.[0],
    };
    for (const [key, file] of Object.entries(driverDocs)) {
      if (file) {
        uploadPromises.push(
          uploadToCloudinary(file.buffer).then((result) => ({
            field: key,
            result,
          }))
        );
      }
    }
    const uploadResults = await Promise.all(uploadPromises);
    const updateData = {
      fullName,
      idPassportNumber,
      dateOfBirth: dateOfBirth
        ? new Date(dateOfBirth)
        : existingDriver.dateOfBirth,
      email,
      phone,
      address,
      drivingLicenseExpireDate,
      criminalRecordCheck: criminalRecordCheck === "true",
      consentDrivingRecordCheck: consentDrivingRecordCheck === "true",
      consentEmploymentVerification: consentEmploymentVerification === "true",
      acceptTermsConditions: acceptTermsConditions === "true",
      consentDataProcessing: consentDataProcessing === "true",
    };
    uploadResults.forEach(({ field, result }) => {
      updateData[field] = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    });
    await NominateDriver.findByIdAndUpdate(req.user.id, { $set: updateData });
    res.status(200).json({ message: "NominateDriver updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
module.exports = router;
