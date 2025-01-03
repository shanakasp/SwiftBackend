const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const Driver = require("../models/driver");
const VehicleOwner = require("../models/vehicleOwner");
const Rider = require("../models/rider");
const bcrypt = require("bcryptjs");
const Admin = require("../models/admin");
const Job = require("../models/job");
const cloudinary = require("cloudinary").v2;
const auth = require("../middleware/auth");
const { generateToken } = require("../utils/jwt");

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
    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/user/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find user in all collections
    const user = await Promise.any([
      Driver.findById(id).select("-password"),
      VehicleOwner.findById(id).select("-password"),
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
router.get("/jobs", adminAuth, async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json({ message: "Jobs fetched successfully", jobs });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET BY ID: Retrieve a job by its ID
router.get("/jobs/:id", adminAuth, async (req, res) => {
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

module.exports = router;
