const router = require("express").Router();
const bcrypt = require("bcryptjs");
const Driver = require("../models/driver");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwt");
// Configure multer for multiple file uploads
const uploadFields = upload.fields([
  { name: "driverLicense", maxCount: 1 },
  { name: "prdp", maxCount: 1 },
  { name: "policeClearance", maxCount: 1 },
  { name: "proofOfAddress", maxCount: 1 },
  { name: "registrationPapers", maxCount: 1 },
  { name: "insuranceCertificate", maxCount: 1 },
  { name: "roadworthyCertificate", maxCount: 1 },
]);

router.post("/register", uploadFields, async (req, res) => {
  try {
    const {
      // Driver personal details
      fullName,
      idPassportNumber,
      dateOfBirth,
      email,
      phone,
      address,

      // Vehicle details
      make,
      model,
      year,
      registration,
      color,
      insuranceDetails,

      // Consent fields
      criminalRecordCheck,
      consentDrivingRecordCheck,
      consentEmploymentVerification,
      acceptTermsConditions,
      consentDataProcessing,
    } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      return res
        .status(400)
        .json({ message: "Driver with this email already exists" });
    }

    // Upload all documents to Cloudinary
    const uploadPromises = [];
    const files = req.files;

    // Process main driver documents
    const driverDocs = {
      driverLicense: files.driverLicense?.[0],
      prdp: files.prdp?.[0],
      policeClearance: files.policeClearance?.[0],
      proofOfAddress: files.proofOfAddress?.[0],
    };

    // Process vehicle documents
    const vehicleDocs = {
      registrationPapers: files.registrationPapers?.[0],
      insuranceCertificate: files.insuranceCertificate?.[0],
      roadworthyCertificate: files.roadworthyCertificate?.[0],
    };

    // Upload driver documents
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

    // Upload vehicle documents
    for (const [key, file] of Object.entries(vehicleDocs)) {
      if (file) {
        uploadPromises.push(
          uploadToCloudinary(file.buffer).then((result) => ({
            field: key,
            result,
            isVehicle: true,
          }))
        );
      }
    }

    const uploadResults = await Promise.all(uploadPromises);

    // Prepare driver data
    const driverData = {
      fullName,
      idPassportNumber,
      dateOfBirth: new Date(dateOfBirth),
      email,
      phone,
      address,
      criminalRecordCheck: criminalRecordCheck === "true",
      consentDrivingRecordCheck: consentDrivingRecordCheck === "true",
      consentEmploymentVerification: consentEmploymentVerification === "true",
      acceptTermsConditions: acceptTermsConditions === "true",
      consentDataProcessing: consentDataProcessing === "true",
      vehicle: {
        make,
        model,
        year: parseInt(year),
        registration,
        color,
        insuranceDetails,
      },
    };

    // Add uploaded files to driver data
    uploadResults.forEach(({ field, result, isVehicle }) => {
      if (isVehicle) {
        driverData.vehicle[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } else {
        driverData[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
    });

    // Create and save new driver
    const driver = new Driver(driverData);
    await driver.save();

    // Generate token and send response
    const token = generateToken(driver);
    res.status(201).json({
      message: "Driver registered successfully",
      token,
      driver: {
        id: driver._id,
        fullName: driver.fullName,
        email: driver.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const driver = await Driver.findOne({ email });

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
