const router = require("express").Router();
const multer = require("multer");
const adminAuth = require("../middleware/adminAuth");
const { uploadToCloudinary } = require("../utils/cloudinary");
const Job = require("../models/securityJob");
const JobApplicantSecurity = require("../models/jobApplicantsSecurity");

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

module.exports = router;
