const router = require("express").Router();
const bcrypt = require("bcryptjs");
const VehicleOwner = require("../models/vehicleOwner");
const Vehicle = require("../models/vehicleSchema");
const upload = require("../middleware/upload");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwt");
const auth = require("../middleware/auth");
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
      fullName,
      idPassportNumber,
      dateOfBirth,
      email,
      phone,
      address,
      criminalRecordCheck,
      consentDrivingRecordCheck,
      consentEmploymentVerification,
      acceptTermsConditions,
      consentDataProcessing,
    } = req.body;

    const existingOwner = await VehicleOwner.findOne({ email });
    if (existingOwner) {
      return res
        .status(400)
        .json({ message: "Vehicle owner with this email already exists" });
    }

    const uploadPromises = [];
    const files = req.files;

    const ownerDocs = {
      driverLicense: files.driverLicense?.[0],
      prdp: files.prdp?.[0],
      policeClearance: files.policeClearance?.[0],
      proofOfAddress: files.proofOfAddress?.[0],
    };

    const vehicleDocs = {
      registrationPapers: files.registrationPapers?.[0],
      insuranceCertificate: files.insuranceCertificate?.[0],
      roadworthyCertificate: files.roadworthyCertificate?.[0],
    };

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
        make: req.body.make,
        model: req.body.model,
        year: parseInt(req.body.year),
        registration: req.body.registration,
        color: req.body.color,
        insuranceDetails: req.body.insuranceDetails,
      },
    };

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

    const owner = new VehicleOwner(ownerData);
    await owner.save();

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

// Configure multer for vehicle document uploads
const vehicleUploadFields = upload.fields([
  { name: "registrationPapers", maxCount: 1 },
  { name: "insuranceCertificate", maxCount: 1 },
  { name: "roadworthyCertificate", maxCount: 1 },
]);

// Add a new vehicle
router.post("/addVehicle", auth, vehicleUploadFields, async (req, res) => {
  try {
    const {
      make,
      model,
      ownerEmail,
      year,
      registration,
      color,
      insuranceDetails,
    } = req.body;

    const files = req.files;
    const uploadPromises = [];

    // Handle document uploads
    const vehicleDocs = {
      registrationPapers: files.registrationPapers?.[0],
      insuranceCertificate: files.insuranceCertificate?.[0],
      roadworthyCertificate: files.roadworthyCertificate?.[0],
    };

    for (const [key, file] of Object.entries(vehicleDocs)) {
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

    const vehicleData = {
      make,
      model,
      ownerEmail,
      year: parseInt(year),
      registration,
      color,
      insuranceDetails,
      owner: req.user.id,
    };

    // Add uploaded document URLs to vehicle data
    uploadResults.forEach(({ field, result }) => {
      vehicleData[field] = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    });

    const vehicle = new Vehicle(vehicleData);
    await vehicle.save();

    res.status(201).json({
      message: "Vehicle added successfully",
      vehicle,
    });
  } catch (error) {
    console.error("Add vehicle error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Get all vehicles for the authenticated owner
router.get("/getVehicles", auth, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Get vehicle by ID (only if owned by authenticated user)
router.get("/getVehicle/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findById(id).select("-password").lean();
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }
    res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
// Update vehicle by ID (PUT)
router.put(
  "/updateVehicle/:id",
  auth,
  vehicleUploadFields,
  async (req, res) => {
    const { id } = req.params;

    try {
      const vehicle = await Vehicle.findById(id);

      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      const updates = {};
      const allowedUpdates = [
        "make",
        "model",
        "year",
        "registration",
        "color",
        "insuranceDetails",
      ];

      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] =
            key === "year" ? parseInt(req.body[key]) : req.body[key];
        }
      });

      if (req.files) {
        const uploadPromises = [];
        const vehicleDocs = {
          registrationPapers: req.files.registrationPapers?.[0],
          insuranceCertificate: req.files.insuranceCertificate?.[0],
          roadworthyCertificate: req.files.roadworthyCertificate?.[0],
        };

        for (const [key, file] of Object.entries(vehicleDocs)) {
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
        uploadResults.forEach(({ field, result }) => {
          updates[field] = {
            public_id: result.public_id,
            url: result.secure_url,
          };
        });
      }

      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      res.json({
        message: "Vehicle updated successfully",
        vehicle: updatedVehicle,
      });
    } catch (error) {
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// Update vehicle by ID (PATCH)
router.patch(
  "/updateVehicle/:id",
  auth,
  vehicleUploadFields,
  async (req, res) => {
    const { id } = req.params;

    try {
      const vehicle = await Vehicle.findById(id); // Corrected line

      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      const updates = {};
      const allowedUpdates = [
        "make",
        "model",
        "year",
        "registration",
        "color",
        "insuranceDetails",
      ];

      Object.keys(req.body).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          updates[key] =
            key === "year" ? parseInt(req.body[key]) : req.body[key];
        }
      });

      if (req.files) {
        const uploadPromises = [];
        const vehicleDocs = {
          registrationPapers: req.files.registrationPapers?.[0],
          insuranceCertificate: req.files.insuranceCertificate?.[0],
          roadworthyCertificate: req.files.roadworthyCertificate?.[0],
        };

        for (const [key, file] of Object.entries(vehicleDocs)) {
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
        uploadResults.forEach(({ field, result }) => {
          updates[field] = {
            public_id: result.public_id,
            url: result.secure_url,
          };
        });
      }

      const updatedVehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );

      res.json({
        message: "Vehicle updated successfully",
        vehicle: updatedVehicle,
      });
    } catch (error) {
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);

// Delete vehicle by ID
router.delete("/delete/:vehicleId", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findOneAndDelete(id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
