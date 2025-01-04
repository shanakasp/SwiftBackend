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
      ref: "Job",
      required: true,
    },
  },
  { timestamps: true }
);

// Validate document count matches job requirement
applicantSecuritySchema.pre("save", async function (next) {
  const job = await mongoose.model("Job").findById(this.job);
  if (this.documents.length !== job.requiredDocumentCount) {
    throw new Error(
      `Exactly ${job.requiredDocumentCount} documents are required for this job`
    );
  }
  next();
});

module.exports = mongoose.model(
  "JobApplicantSecurity",
  applicantSecuritySchema
);
