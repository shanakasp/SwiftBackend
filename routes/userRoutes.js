const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const Job = require("../models/job");
const JobApplicant = require("../models/jobApplicants");
const { uploadToCloudinary } = require("../utils/cloudinary");

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

module.exports = router;
