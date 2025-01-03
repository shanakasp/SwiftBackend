const mongoose = require("mongoose");

const jobApplicantsSchema = new mongoose.Schema(
  {
    coverLetter: {
      type: String,
      required: true,
    },
    uploadCV: {
      public_id: String,
      url: String,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobApplicant", jobApplicantsSchema);
