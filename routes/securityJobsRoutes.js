const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const Job = require("../models/securityJob");

// Admin route to create a security job
router.post("/security-jobs", adminAuth, async (req, res) => {
  try {
    const {
      securityJobTitle,
      category,
      requirements,
      location,
      requiredDocumentCount,
      requiredDocuments,
    } = req.body;

    // Validate document count matches requirements array
    if (requiredDocuments.length !== requiredDocumentCount) {
      return res.status(400).json({
        message:
          "Required document count must match the number of document descriptions",
      });
    }

    const job = new Job({
      securityJobTitle,
      category,
      requirements,
      location,
      requiredDocumentCount,
      requiredDocuments,
    });

    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Admin route to update a security job by ID
// Admin route to update a security job by ID
router.put("/security-jobs/:id", adminAuth, async (req, res) => {
  try {
    const jobId = req.params.id;
    const updatedData = req.body;

    // Automatically update `requiredDocumentCount` if `requiredDocuments` is present in the update
    if (updatedData.requiredDocuments) {
      updatedData.requiredDocumentCount = updatedData.requiredDocuments.length;
    }

    const job = await Job.findByIdAndUpdate(jobId, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Admin route to delete a security job by ID
router.delete("/security-jobs/:id", adminAuth, async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await Job.findByIdAndDelete(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Route to get all security jobs (No auth required)
router.get("/security-jobs", async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Admin route to get a security job by ID
router.get("/security-jobs/:id", async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
