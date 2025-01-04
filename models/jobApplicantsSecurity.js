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
  const SecurityJob = await mongoose
    .model("SecurityJob")
    .findById(this.SecurityJob);
  if (this.documents.length !== SecurityJob.requiredDocumentCount) {
    throw new Error(
      `Exactly ${SecurityJob.requiredDocumentCount} documents are required for this job`
    );
  }
  next();
});

module.exports = mongoose.model(
  "JobApplicantSecurity",
  applicantSecuritySchema
);
