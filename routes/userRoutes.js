const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const { uploadToCloudinary } = require("../utils/cloudinary");
const SecurityJob = require("../models/securityJob");
const JobApplicantSecurity = require("../models/jobApplicantsSecurity");
const Job = require("../models/job");
const JobApplicant = require("../models/jobApplicants");
const emailService = require("../utils/emailService");

//Apply job
router.post(
  "/jobs/:jobId/apply",
  upload.single("uploadCV"),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { coverLetter, email } = req.body;

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

      const applicant = new JobApplicant({
        coverLetter,
        email,
        uploadCV: {
          public_id: cloudinaryResult.public_id,
          url: cloudinaryResult.secure_url,
        },
        job: jobId,
      });

      await applicant.save();

      job.applicants.push(applicant._id);
      await job.save();

      // Send email using the email service
      await emailService.sendJobApplicationEmail(email);

      res
        .status(201)
        .json({ message: "Application submitted successfully", applicant });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

router.post(
  "/applySecurityJob/:jobId",
  upload.array("documents"),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const { email, documentNames } = req.body;
      const files = req.files;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      console.log("Job ID:", jobId);
      console.log("Files:", files);
      console.log("Document Names:", documentNames);
      console.log("Email:", email);

      const job = await SecurityJob.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      console.log("Job requiredDocumentCount:", job.requiredDocumentCount);
      if (files.length !== job.requiredDocumentCount) {
        return res.status(400).json({
          message: `Exactly ${job.requiredDocumentCount} documents are required for this job`,
        });
      }

      const requiredDocNames = job.requiredDocuments.map(
        (doc) => doc.documentName
      );
      if (!documentNames.every((name) => requiredDocNames.includes(name))) {
        return res.status(400).json({
          message: "Document names don't match the required documents",
          required: requiredDocNames,
        });
      }

      const uploadPromises = files.map(async (file, index) => {
        const result = await uploadToCloudinary(file.buffer);
        return {
          documentName: documentNames[index],
          public_id: result.public_id,
          url: result.secure_url,
        };
      });

      const uploadedDocuments = await Promise.all(uploadPromises);

      const jobApplication = new JobApplicantSecurity({
        email,
        documents: uploadedDocuments,
        job: jobId,
      });

      await jobApplication.save();

      job.applicants.push(jobApplication._id);
      await job.save();

      // Send email using the email service
      await emailService.sendJobApplicationEmail(email);

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
