const router = require("express").Router();
const bcrypt = require("bcryptjs");
const VehicleOwner = require("../models/vehicleOwner");
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
      // Owner personal details
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

    // Check if owner already exists
    const existingOwner = await VehicleOwner.findOne({ email });
    if (existingOwner) {
      return res
        .status(400)
        .json({ message: "Vehicle owner with this email already exists" });
    }

    // Upload all documents to Cloudinary
    const uploadPromises = [];
    const files = req.files;

    // Process main owner documents
    const ownerDocs = {
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

    // Upload owner documents
    for (const [key, file] of Object.entries(ownerDocs)) {
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

    // Prepare owner data
    const ownerData = {
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

    // Add uploaded files to owner data
    uploadResults.forEach(({ field, result, isVehicle }) => {
      if (isVehicle) {
        ownerData.vehicle[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } else {
        ownerData[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
    });

    // Create and save new vehicle owner
    const owner = new VehicleOwner(ownerData);
    await owner.save();

    // Generate token and send response
    const token = generateToken(owner);
    res.status(201).json({
      message: "Vehicle Owner registered successfully",
      token,
      owner: {
        id: owner._id,
        fullName: owner.fullName,
        email: owner.email,
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
    const owner = await VehicleOwner.findOne({ email });

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
