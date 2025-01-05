const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const Driver = require("../models/driver");
const VehicleOwner = require("../models/vehicleOwner");
const Rider = require("../models/rider");
const bcrypt = require("bcryptjs");
const Message = require("../models/message");
const Admin = require("../models/admin");
const Job = require("../models/job");
const JobApplicant = require("../models/jobApplicants");
const { uploadToCloudinary } = require("../utils/cloudinary");
const cloudinary = require("cloudinary").v2;
const auth = require("../middleware/auth");
const { generateToken } = require("../utils/jwt");
const JobApplicantSecurity = require("../models/jobApplicantsSecurity");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = new Admin({ username, password: hashedPassword });
    await admin.save();

    const token = generateToken(admin);
    res.status(201).json({ message: "Admin registered successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/admins", adminAuth, async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json(admins);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/admins/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Admin direct msg to userSelect:
router.post("/admin/send-message", async (req, res) => {
  try {
    const { adminId, receiverId, title, category, message, receiverModel } =
      req.body;

    let receiver;
    switch (receiverModel) {
      case "Driver":
        receiver = await Driver.findById(receiverId);
        break;
      case "Rider":
        receiver = await Rider.findById(receiverId);
        break;
      case "Admin":
        receiver = await Admin.findById(receiverId);
        break;
      default:
        return res.status(400).json({ message: "Invalid receiver model" });
    }

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const newMessage = new Message({
      sender: { id: adminId, model: "Admin" },
      receiver: { id: receiverId, model: receiverModel },
      title,
      category,
      message,
      isAdminMessage: true,
    });

    await newMessage.save();

    res.status(201).json({ message: "Message sent successfully", newMessage });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(admin);
    res.json({ message: "Login successful", token, adminId: admin._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/user/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find user in all collections
    const user = await Promise.any([
      // Driver.findById(id).select("-password"),
      // VehicleOwner.findById(id).select("-password"),
      Rider.findById(id).select("-password"),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add user type to response
    const userType = user.constructor.modelName.toLowerCase();
    res.json({ userType, user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Keep existing endpoints for getting all users of each type
router.get("/users/drivers", adminAuth, async (req, res) => {
  const drivers = await Driver.find().select("-password");
  res.json(drivers);
});

router.get("/users/vehicle-owners", adminAuth, async (req, res) => {
  const owners = await VehicleOwner.find().select("-password");
  res.json(owners);
});

router.get("/users/riders", adminAuth, async (req, res) => {
  const riders = await Rider.find().select("-password");
  res.json(riders);
});

router.delete("/user/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Try each model separately
    let deletedUser = await Driver.findById(id);
    if (deletedUser) {
      await Driver.findByIdAndDelete(id);
    } else {
      deletedUser = await VehicleOwner.findById(id);
      if (deletedUser) {
        await VehicleOwner.findByIdAndDelete(id);
      } else {
        deletedUser = await Rider.findById(id);
        if (deletedUser) {
          await Rider.findByIdAndDelete(id);
        }
      }
    }

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (deletedUser.image?.public_id) {
      await cloudinary.uploader.destroy(deletedUser.image.public_id);
    }

    const userType = deletedUser.constructor.modelName.toLowerCase();
    res.json({
      message: `${userType} deleted successfully`,
      deletedUser,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Jobs

router.post("/jobs", adminAuth, async (req, res) => {
  try {
    const { jobTitle, field, location, type, description, requirements } =
      req.body;

    // Ensure all required fields are provided
    if (
      !jobTitle ||
      !field ||
      !location ||
      !type ||
      !description ||
      !requirements
    ) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const job = new Job({
      jobTitle,
      field,
      location,
      type,
      description,
      requirements,
    });

    await job.save();

    res.status(201).json({ message: "Job created successfully", job });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET ALL: Retrieve all jobs
router.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json({ message: "Jobs fetched successfully", jobs });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Get All Locations of the Listed Jobs
router.get("/jobs/locations", async (req, res) => {
  try {
    const locations = await Job.distinct("location");
    res
      .status(200)
      .json({ message: "Job locations fetched successfully", locations });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET BY ID: Retrieve a job by its ID
router.get("/jobs/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({ message: "Job fetched successfully", job });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Get jobs by location
router.get("/jobs/location/:location", async (req, res) => {
  try {
    const { location } = req.params;

    const jobs = await Job.find({
      location: { $regex: new RegExp(location, "i") },
    });

    if (jobs.length === 0) {
      return res
        .status(404)
        .json({ message: "No jobs found for the specified location." });
    }

    res.status(200).json({ message: "Jobs fetched successfully", jobs });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT: Update a job by its ID
router.put("/jobs/:id", adminAuth, async (req, res) => {
  try {
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res
      .status(200)
      .json({ message: "Job updated successfully", job: updatedJob });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PATCH: Partially update a job by its ID
router.patch("/jobs/:id", adminAuth, async (req, res) => {
  try {
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res
      .status(200)
      .json({ message: "Job partially updated successfully", job: updatedJob });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE: Delete a job by its ID
router.delete("/jobs/:id", adminAuth, async (req, res) => {
  try {
    const deletedJob = await Job.findByIdAndDelete(req.params.id);

    if (!deletedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get Job Applicant Data

router.get("/job-applicants", adminAuth, async (req, res) => {
  try {
    const applicants = await JobApplicant.find().populate("job");
    res
      .status(200)
      .json({ message: "Job applicants fetched successfully", applicants });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/job-applicants/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const applicant = await JobApplicant.findById(id).populate("job");
    if (!applicant) {
      return res.status(404).json({ message: "Job applicant not found" });
    }

    res
      .status(200)
      .json({ message: "Job applicant fetched successfully", applicant });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//Security Job Routes
// GET: Fetch all job security applications
router.get("/applicants/security", adminAuth, async (req, res) => {
  try {
    const applications = await JobApplicantSecurity.find().populate("job");
    res.status(200).json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({
      message: "Error fetching applications",
      error: error.message,
    });
  }
});

// GET: Fetch a job security application by ID
router.get(
  "/applicants/security/:applicationId",
  adminAuth,
  async (req, res) => {
    try {
      const { applicationId } = req.params;
      const application = await JobApplicantSecurity.findById(
        applicationId
      ).populate("job");
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(200).json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({
        message: "Error fetching application",
        error: error.message,
      });
    }
  }
);

// Route to verify a driver and send credentials
router.patch("/verify-driver/:driverId", adminAuth, async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    driver.adminVerified = true;
    const generateRandomPassword = () => {
      return crypto.randomBytes(8).toString("hex");
    };
    const randomPassword = generateRandomPassword();
    if (!driver.password) {
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      driver.password = hashedPassword;
    }
    await driver.save();
    const credentials = {
      email: driver.email,
      password: randomPassword,
      fullName: driver.fullName,
    };
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: "shanakaprince@gmail.com", pass: "xqlw xhyl vvem zhlk" },
    });
    const mailOptions = {
      from: "Swift Admin Team",
      to: driver.email,
      subject: "Swift Admin Team: Your Login Credentials",
      html: ` <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"> <div style="text-align: center;">
      
      </div> <h1 style="color: #38a169;">Proudly South African</h1> <h2 style="color: #38a169;">Ride-Sharing Platform</h2> <h3 style="color: #d69e2e;">This is company Swift!</h3> <p>Hello <strong>${driver.fullName}</strong>,</p> <p>Your account has been verified by the Swift Admin Team. Please use the following credentials to log in:</p> <div style="border: 1px solid #38a169; padding: 10px; background-color: #f0f8ff;"> <p><strong>Email:</strong> ${credentials.email}</p> <p><strong>Password:</strong> ${credentials.password}</p> </div> <p>Please change your password after the first login.</p> <p>Thank you,</p> <p><strong>Swift Admin Team</strong></p> <div style="text-align: center; color: #38a169;"> <p>South Africa's most innovative e-hailing service.</p> </div> <div style="text-align: center;"> </div> <div style="text-align: center; color: #d69e2e; margin-top: 20px;"> <p>© 2025 Swift! All rights reserved.</p> </div> </div> `,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email error:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
    res.json({
      message: "Driver verified successfully",
      driver: {
        id: driver._id,
        fullName: driver.fullName,
        email: driver.email,
        adminVerified: driver.adminVerified,
      },
      credentials: {
        message: `Please send the following credentials to ${driver.fullName}:`,
        loginDetails: `email: ${credentials.email}\nPassword: ${credentials.password}\n\nPlease change your password after first login.`,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/driver/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find driver with all details except password
    const driver = await Driver.findById(id).select("-password").lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Add additional metadata for admin view
    const driverWithMetadata = {
      ...driver,
      documentStatus: {
        hasDriverLicense: !!driver.driverLicense?.url,
        hasPRDP: !!driver.prdp?.url,
        hasPoliceClearance: !!driver.policeClearance?.url,
        hasProofOfAddress: !!driver.proofOfAddress?.url,
        hasRegistrationPapers: !!driver.vehicle?.registrationPapers?.url,
        hasInsuranceCertificate: !!driver.vehicle?.insuranceCertificate?.url,
        hasRoadworthyCertificate: !!driver.vehicle?.roadworthyCertificate?.url,
      },
      verificationStatus: {
        isVerified: driver.adminVerified,
        documentsComplete: true, // This will be updated below
        consentComplete:
          driver.consentDrivingRecordCheck &&
          driver.consentEmploymentVerification &&
          driver.acceptTermsConditions &&
          driver.consentDataProcessing,
      },
    };

    // Check if all required documents are uploaded
    driverWithMetadata.verificationStatus.documentsComplete = Object.values(
      driverWithMetadata.documentStatus
    ).every((status) => status);

    res.status(200).json({
      success: true,
      driver: driverWithMetadata,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid driver ID format",
      });
    }

    console.error("Error fetching driver:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching driver details",
      error: error.message,
    });
  }
});

// Route to get all unverified drivers
router.get("/unverified-drivers", adminAuth, async (req, res) => {
  try {
    const unverifiedDrivers = await Driver.find({
      adminVerified: false,
    }).select(
      "fullName email phone dateOfBirth idPassportNumber adminVerified createdAt"
    );

    res.json({
      count: unverifiedDrivers.length,
      drivers: unverifiedDrivers,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

// Route to verify a vehicleOwner and send credentials
router.patch(
  "/verify-vehicleOwner/:vehicleOwnerId",
  adminAuth,
  async (req, res) => {
    try {
      const { vehicleOwnerId } = req.params;
      const vehicleOwner = await VehicleOwner.findById(vehicleOwnerId);
      if (!vehicleOwner) {
        return res.status(404).json({ message: "Vehicle Owner not found" });
      }
      vehicleOwner.adminVerified = true;
      const generateRandomPassword = () => {
        return crypto.randomBytes(8).toString("hex");
      };
      const randomPassword = generateRandomPassword();
      if (!vehicleOwner.password) {
        const hashedPassword = await bcrypt.hash(randomPassword, 12);
        vehicleOwner.password = hashedPassword;
      }
      await vehicleOwner.save();
      const credentials = {
        email: vehicleOwner.email,
        password: randomPassword,
        fullName: vehicleOwner.fullName,
      };
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "shanakaprince@gmail.com", pass: "xqlw xhyl vvem zhlk" },
      });
      const mailOptions = {
        from: "Swift Admin Team",
        to: vehicleOwner.email,
        subject: "Swift Admin Team: Your Login Credentials",
        html: ` <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;"> <div style="text-align: center;">
      
      </div> <h1 style="color: #38a169;">ProudlySouth African Ride-Sharing Platform</h1>  <h2 style="color: #d69e2e;">Swift!</h2> <p>Hello <strong>${vehicleOwner.fullName}</strong>,</p> <p>Your account has been verified by the Swift Admin Team. Please use the following credentials to log in:</p> <div style="border: 1px solid #38a169; padding: 10px; background-color: #f0f8ff;"> <p><strong>Email:</strong> ${credentials.email}</p> <p><strong>Password:</strong> ${credentials.password}</p> </div> <p>Please change your password after the first login.</p> <p>Thank you,</p> <p><strong>Swift Admin Team</strong></p> <div style="text-align: center; color: #38a169;"> <p>South Africa's most innovative e-hailing service.</p> </div> <div style="text-align: center;"> </div> <div style="text-align: center; color: #d69e2e; margin-top: 20px;"> <p>© 2025 Swift! All rights reserved.</p> </div> </div> `,
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Email error:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });
      res.json({
        message: "vehicleOwner verified successfully",
        vehicleOwner: {
          id: vehicleOwner._id,
          fullName: vehicleOwner.fullName,
          email: vehicleOwner.email,
          adminVerified: vehicleOwner.adminVerified,
        },
        credentials: {
          message: `Please send the following credentials to ${vehicleOwner.fullName}:`,
          loginDetails: `email: ${credentials.email}\nPassword: ${credentials.password}\n\nPlease change your password after first login.`,
        },
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

router.get("/vehicleOwner/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find driver with all details except password
    const vehicleOwner = await VehicleOwner.findById(id)
      .select("-password")
      .lean();

    if (!vehicleOwner) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Add additional metadata for admin view
    const vehicleOwnerWithMetaData = {
      ...vehicleOwner,
      documentStatus: {
        hasDriverLicense: !!vehicleOwner.driverLicense?.url,
        hasPRDP: !!vehicleOwner.prdp?.url,
        hasPoliceClearance: !!vehicleOwner.policeClearance?.url,
        hasProofOfAddress: !!vehicleOwner.proofOfAddress?.url,
        hasRegistrationPapers: !!vehicleOwner.vehicle?.registrationPapers?.url,
        hasInsuranceCertificate:
          !!vehicleOwner.vehicle?.insuranceCertificate?.url,
        hasRoadworthyCertificate:
          !!vehicleOwner.vehicle?.roadworthyCertificate?.url,
      },
      verificationStatus: {
        isVerified: vehicleOwner.adminVerified,
        documentsComplete: true, // This will be updated below
        consentComplete:
          vehicleOwner.consentDrivingRecordCheck &&
          vehicleOwner.consentEmploymentVerification &&
          vehicleOwner.acceptTermsConditions &&
          vehicleOwner.consentDataProcessing,
      },
    };

    // Check if all required documents are uploaded
    vehicleOwnerWithMetaData.verificationStatus.documentsComplete =
      Object.values(vehicleOwnerWithMetaData.documentStatus).every(
        (status) => status
      );

    res.status(200).json({
      success: true,
      vehicleOwner: vehicleOwnerWithMetaData,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicleOwner ID format",
      });
    }

    console.error("Error fetching driver:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching driver details",
      error: error.message,
    });
  }
});

// Route to get all unverified drivers
router.get("/unverified-vehicleOwner", adminAuth, async (req, res) => {
  try {
    const unVerifiedVehicleOwner = await VehicleOwner.find({
      adminVerified: false,
    }).select(
      "fullName email phone dateOfBirth idPassportNumber adminVerified createdAt"
    );

    res.json({
      count: unVerifiedVehicleOwner.length,
      drivers: unVerifiedVehicleOwner,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
