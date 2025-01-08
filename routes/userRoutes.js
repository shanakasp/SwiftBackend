const router = require("express").Router();
const multer = require("multer");
const upload = multer();
const { uploadToCloudinary } = require("../utils/cloudinary");
const SecurityJob = require("../models/securityJob");
const JobApplicantSecurity = require("../models/jobApplicantsSecurity");
const Job = require("../models/job");
const JobApplicant = require("../models/jobApplicants");
const nodemailer = require("nodemailer");
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

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: "shanakaprince@gmail.com", pass: "xqlw xhyl vvem zhlk" },
      });
      const mailOptions = {
        from: "Swift Admin Team",
        to: email,
        subject: "Swift: Job Application Received",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #38a169;">Thank You for Applying!</h1>
            <p>Dear Applicant,</p>
            <p>We have received your application for the position at Swift.</p>
           
            <p>We will review your application and get back to you soon.</p>
            <p>Best regards,</p>
            <p><strong>Swift HR Team</strong></p>  <div style="text-align: center; color: #38a169;"> <p>South Africa's most innovative e-hailing service.</p> </div> <div style="text-align: center;"> </div> <div style="text-align: center; color: #d69e2e; margin-top: 20px;"> <p>© 2025 Swift! All rights reserved.</p> </div> </div> 
          </div>
        `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Email error:", error);
        } else {
          console.log("Email sent:", info.response);
        }
      });

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

      // Validate email is provided
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Log jobId and files received
      console.log("Job ID:", jobId);
      console.log("Files:", files);
      console.log("Document Names:", documentNames);
      console.log("Email:", email);

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
        const result = await uploadToCloudinary(file.buffer);
        return {
          documentName: documentNames[index],
          public_id: result.public_id,
          url: result.secure_url,
        };
      });

      const uploadedDocuments = await Promise.all(uploadPromises);

      // Create job application with email
      const jobApplication = new JobApplicantSecurity({
        email,
        documents: uploadedDocuments,
        job: jobId,
      });

      // Save application
      await jobApplication.save();

      // Update job's applicants array
      job.applicants.push(jobApplication._id);
      await job.save();

      // Send confirmation email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "shanakaprince@gmail.com",
          pass: "xqlw xhyl vvem zhlk",
        },
      });

      const mailOptions = {
        from: "Swift Admin Team",
        to: email,
        subject: "Swift: Job Application Received",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #38a169;">Thank You for Applying!</h1>
            <p>Dear Applicant,</p>
            <p>We have received your application for the position at Swift.</p>
            <p>We will review your application and get back to you soon.</p>
            <p>Best regards,</p>
            <p><strong>Swift HR Team</strong></p>
            <div style="text-align: center; color: #38a169;">
              <p>South Africa's most innovative e-hailing service.</p>
            </div>
            <div style="text-align: center;">
            </div>
            <div style="text-align: center; color: #d69e2e; margin-top: 20px;">
              <p>© 2025 Swift! All rights reserved.</p>
            </div>
          </div>
        `,
      };
      // Send email
      await transporter.sendMail(mailOptions);

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
