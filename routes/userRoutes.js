const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const { uploadToCloudinary } = require("../utils/cloudinary");
const SecurityJob = require("../models/securityJob");
const JobApplicantSecurity = require("../models/jobApplicantsSecurity");
const Job = require("../models/job");
const JobApplicant = require("../models/jobApplicants");

//Apply job
router.post(
  "/jobs/:jobId/apply",
  upload.single("uploadCV"),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { coverLetter } = req.body;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Upload CV to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

      // Create new Job Applicant
      const applicant = new JobApplicant({
        coverLetter,
        uploadCV: {
          public_id: cloudinaryResult.public_id,
          url: cloudinaryResult.secure_url,
        },
        job: jobId,
      });

      await applicant.save();

      // Link applicant to the job
      job.applicants.push(applicant._id);
      await job.save();

      res
        .status(201)
        .json({ message: "Application submitted successfully", applicant });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// POST: Apply for a Security Job
router.post(
  "/applySecurityJob/:jobId",
  upload.array("documents"),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const files = req.files;
      const documentNames = req.body.documentNames;

      // Log jobId and files received
      console.log("Job ID:", jobId);
      console.log("Files:", files);
      console.log("Document Names:", documentNames);

      // Validate job exists
      const job = await SecurityJob.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      // Validate number of documents matches the requirement
      console.log("Job requiredDocumentCount:", job.requiredDocumentCount);
      if (files.length !== job.requiredDocumentCount) {
        return res.status(400).json({
          message: `Exactly ${job.requiredDocumentCount} documents are required for this job`,
        });
      }

      // Validate document names match required documents
      const requiredDocNames = job.requiredDocuments.map(
        (doc) => doc.documentName
      );
      if (!documentNames.every((name) => requiredDocNames.includes(name))) {
        return res.status(400).json({
          message: "Document names don't match the required documents",
          required: requiredDocNames,
        });
      }

      // Upload all files to Cloudinary
      const uploadPromises = files.map(async (file, index) => {
        // Pass only the buffer to uploadToCloudinary
        const result = await uploadToCloudinary(file.buffer);
        return {
          documentName: documentNames[index],
          public_id: result.public_id,
          url: result.secure_url,
        };
      });

      const uploadedDocuments = await Promise.all(uploadPromises);

      // Create job application
      const jobApplication = new JobApplicantSecurity({
        documents: uploadedDocuments,
        job: jobId,
      });

      // Save application
      await jobApplication.save();

      // Update job's applicants array
      job.applicants.push(jobApplication._id);
      await job.save();

      res.status(201).json({
        message: "Application submitted successfully",
        application: jobApplication,
      });
    } catch (error) {
      console.error("Error in job application:", error);
      res.status(500).json({
        message: "Error submitting application",
        error: error.message,
      });
    }
  }
);

module.exports = router;
