const mongoose = require("mongoose");

const applicantSecuritySchema = new mongoose.Schema(
  {
    documents: [
      {
        documentName: {
          type: String,
          required: true,
        },
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SecurityJob",
      required: true,
    },
  },
  { timestamps: true }
);

// Validate document count matches job requirement
applicantSecuritySchema.pre("save", async function (next) {
  try {
    const jobId = this.job; // Make sure we're using the correct field name
    const SecurityJob = await mongoose.model("SecurityJob").findById(jobId);
    if (!SecurityJob) {
      throw new Error("Job not found");
    }
    if (this.documents.length !== SecurityJob.requiredDocumentCount) {
      throw new Error(
        `Exactly ${SecurityJob.requiredDocumentCount} documents are required for this job`
      );
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model(
  "JobApplicantSecurity",
  applicantSecuritySchema
);
