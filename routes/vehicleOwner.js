const router = require("express").Router();
const bcrypt = require("bcryptjs");
const VehicleOwner = require("../models/vehicleOwner");
const Vehicle = require("../models/vehicleSchema");
const upload = require("../middleware/upload");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { generateToken } = require("../utils/jwt");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");
const NominateDriver = require("../models/nominatedDriver");
// Configure multer for multiple file uploads
const uploadFields = upload.fields([
  { name: "driverLicense", maxCount: 1 },
  { name: "prdp", maxCount: 1 },
  { name: "policeClearance", maxCount: 1 },
  { name: "proofOfAddress", maxCount: 1 },
  { name: "imageID", maxCount: 1 },
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
      proofOfAddress,
      phone,
      address,
      criminalRecordCheck,
      consentDrivingRecordCheck,
      consentEmploymentVerification,
      acceptTermsConditions,
      consentDataProcessing,
      vehicleIds,
    } = req.body;

    const vehicleIdArray = vehicleIds
      .split(",")
      .map((id) => mongoose.Types.ObjectId(id.trim()));

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
      imageID: files.imageID?.[0],
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
      vehicleIds: vehicleIdArray,
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

router.put("/register", auth, uploadFields, async (req, res) => {
  try {
    const {
      fullName,
      idPassportNumber,
      dateOfBirth,
      email,
      proofOfAddress,
      phone,
      address,
      criminalRecordCheck,
      consentDrivingRecordCheck,
      consentEmploymentVerification,
      acceptTermsConditions,
      consentDataProcessing,
    } = req.body;
    const existingOwner = await VehicleOwner.findById(req.user.id);
    if (!existingOwner) {
      return res.status(404).json({ message: "Vehicle owner not found" });
    }
    const uploadPromises = [];
    const files = req.files;
    const ownerDocs = {
      driverLicense: files.driverLicense?.[0],
      prdp: files.prdp?.[0],
      imageID: files.imageID?.[0],
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
    const updateData = {
      fullName,
      idPassportNumber,
      dateOfBirth: dateOfBirth
        ? new Date(dateOfBirth)
        : existingOwner.dateOfBirth,
      email,
      phone,
      address,
      criminalRecordCheck: criminalRecordCheck === "true",
      consentDrivingRecordCheck: consentDrivingRecordCheck === "true",
      consentEmploymentVerification: consentEmploymentVerification === "true",
      acceptTermsConditions: acceptTermsConditions === "true",
      consentDataProcessing: consentDataProcessing === "true",
    };
    uploadResults.forEach(({ field, result, isVehicle }) => {
      if (isVehicle) {
        updateData.vehicle[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } else {
        updateData[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
    });
    await VehicleOwner.findByIdAndUpdate(req.user.id, { $set: updateData });
    res.status(200).json({ message: "Vehicle Owner updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/register", auth, uploadFields, async (req, res) => {
  try {
    const {
      fullName,
      idPassportNumber,
      dateOfBirth,
      email,
      proofOfAddress,
      phone,
      address,
      criminalRecordCheck,
      consentDrivingRecordCheck,
      consentEmploymentVerification,
      acceptTermsConditions,
      consentDataProcessing,
    } = req.body;
    const existingOwner = await VehicleOwner.findById(req.user.id);
    if (!existingOwner) {
      return res.status(404).json({ message: "Vehicle owner not found" });
    }
    const uploadPromises = [];
    const files = req.files;
    const ownerDocs = {
      driverLicense: files.driverLicense?.[0],
      prdp: files.prdp?.[0],
      imageID: files.imageID?.[0],
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
    const updateData = {
      fullName,
      idPassportNumber,
      dateOfBirth: dateOfBirth
        ? new Date(dateOfBirth)
        : existingOwner.dateOfBirth,
      email,
      phone,
      address,
      criminalRecordCheck: criminalRecordCheck === "true",
      consentDrivingRecordCheck: consentDrivingRecordCheck === "true",
      consentEmploymentVerification: consentEmploymentVerification === "true",
      acceptTermsConditions: acceptTermsConditions === "true",
      consentDataProcessing: consentDataProcessing === "true",
    };
    uploadResults.forEach(({ field, result, isVehicle }) => {
      if (isVehicle) {
        updateData.vehicle[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      } else {
        updateData[field] = {
          public_id: result.public_id,
          url: result.secure_url,
        };
      }
    });
    await VehicleOwner.findByIdAndUpdate(req.user.id, { $set: updateData });
    res.status(200).json({ message: "Vehicle Owner updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/vehicleOwnerProfile", auth, async (req, res) => {
  try {
    const vehicleOwner = await VehicleOwner.findById(req.user.id)
      .select("-password")
      .select("-vehicles")
      .select("-nominatedDrivers")

      .lean();

    if (!vehicleOwner) {
      return res.status(404).json({ message: "Vehicle Owner not found" });
    }

    res.json({
      success: true,
      data: vehicleOwner,
    });
  } catch (error) {
    console.error("Error fetching vehicle owner details:", error);
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
    res.json({
      message: "Login successful",
      token,
      id: owner._id, // Add the owner's ID to the response
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id/password", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid vehicle owner ID" });
    }
    const owner = await VehicleOwner.findById(id);
    if (!owner) {
      return res.status(404).json({ message: "Vehicle owner not found" });
    }
    const isMatch = await bcrypt.compare(oldPassword, owner.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }
    const salt = await bcrypt.genSalt(10);
    owner.password = await bcrypt.hash(newPassword, salt);
    await owner.save();
    res.status(200).json({ message: "Password updated successfully" });
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
router.get("/getVehicle/:vehicleId", auth, async (req, res) => {
  try {
    const { vehicleId } = req.params; // Corrected line
    const vehicle = await Vehicle.findById(vehicleId)
      .select("-password")
      .lean();

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.status(200).json({
      success: true,
      data: vehicle,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
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

// POST: Register a new driver
router.post("/nominate-driver", auth, uploadFields, async (req, res) => {
  try {
    const {
      fullName,
      idPassportNumber,
      dateOfBirth,
      email,
      phone,
      address,
      drivingLicenseExpireDate,
      vehicleIds,
    } = req.body;

    // Check if driver already exists
    const existingDriver = await NominateDriver.findOne({ email });
    if (existingDriver) {
      return res.status(400).json({
        message: "Driver with this email already exists",
      });
    }

    // Handle file uploads to Cloudinary
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

    // Prepare driver data
    const driverData = {
      fullName,
      idPassportNumber,
      dateOfBirth: new Date(dateOfBirth),
      email,
      phone,
      address,
      drivingLicenseExpireDate,
      nominatedBy: req.user.id, // From auth middleware
      vehicleIds: vehicleIds ? vehicleIds.split(",") : [],
    };

    // Add uploaded document URLs to driver data
    uploadResults.forEach(({ field, result }) => {
      driverData[field] = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    });

    const driver = new NominateDriver(driverData);
    await driver.save();

    res.status(201).json({
      success: true,
      message: "Driver nominated successfully",
      driver: {
        id: driver._id,
        fullName: driver.fullName,
        email: driver.email,
      },
    });
  } catch (error) {
    console.error("Driver nomination error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// GET: Get all drivers for the authenticated vehicle owner
router.get("/nominated-drivers", auth, async (req, res) => {
  try {
    const drivers = await NominateDriver.find({
      nominatedBy: req.user.id,
    }).select("-password"); // Exclude password from response

    res.status(200).json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching drivers",
      error: error.message,
    });
  }
});
// GET: Get specific driver by ID
router.get("/nominated-drivers/:id", auth, async (req, res) => {
  try {
    const driver = await NominateDriver.findOne({
      _id: req.params.id,
      nominatedBy: req.user.id,
    }).select("-password");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      driver,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching driver",
      error: error.message,
    });
  }
});

router.put("/nominate-driver/:id", auth, uploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await NominateDriver.findById(id);

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found",
      });
    }

    // Check if the authenticated user is the one who created the driver
    if (driver.nominatedBy.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to edit this driver",
      });
    }

    // Handle file uploads to Cloudinary
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

    // Prepare updated driver data
    const updatedDriverData = {
      fullName: req.body.fullName,
      idPassportNumber: req.body.idPassportNumber,
      dateOfBirth: new Date(req.body.dateOfBirth),
      // email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      drivingLicenseExpireDate: req.body.drivingLicenseExpireDate,
      nominatedBy: req.user.id,
      vehicleIds: req.body.vehicleIds ? req.body.vehicleIds.split(",") : [],
    };

    // Add uploaded document URLs to updated driver data
    uploadResults.forEach(({ field, result }) => {
      updatedDriverData[field] = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    });

    const updatedDriver = await NominateDriver.findByIdAndUpdate(
      id,
      updatedDriverData,
      {
        new: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      driver: {
        id: updatedDriver._id,
        fullName: updatedDriver.fullName,
        email: updatedDriver.email,
      },
    });
  } catch (error) {
    console.error("Driver update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});
router.patch("/nominate-driver/:id", auth, uploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await NominateDriver.findById(id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    if (driver.nominatedBy.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this driver" });
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
    const updates = {};
    const allowedUpdates = [
      "fullName",
      "idPassportNumber",
      "dateOfBirth",
      "phone",
      // "email",
      "address",
      "drivingLicenseExpireDate",
      "vehicleIds",
    ];
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === "dateOfBirth") {
          updates[key] = new Date(req.body[key]);
        } else if (key === "vehicleIds") {
          updates[key] = req.body[key]
            .split(",")
            .map((id) => mongoose.Types.ObjectId(id.trim()));
        } else {
          updates[key] = req.body[key];
        }
      }
    });
    uploadResults.forEach(({ field, result }) => {
      updates[field] = { public_id: result.public_id, url: result.secure_url };
    });
    const updatedDriver = await NominateDriver.findByIdAndUpdate(id, updates, {
      new: true,
    });
    res.status(200).json({
      success: true,
      message: "Driver updated successfully",
      driver: {
        id: updatedDriver._id,
        fullName: updatedDriver.fullName,
        email: updatedDriver.email,
      },
    });
  } catch (error) {
    console.error("Driver update error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
});

// DELETE: Delete a driver
router.delete("/nominate-drivers/:id", auth, async (req, res) => {
  try {
    const driver = await NominateDriver.findByIdAndDelete({
      _id: req.params.id,
      nominatedBy: req.user.id,
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Delete documents from Cloudinary
    const deletePromises = [];
    const documents = [
      "driverLicense",
      "prdp",
      "policeClearance",
      "proofOfAddress",
    ];

    res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting driver",
      error: error.message,
    });
  }
});

module.exports = router;
