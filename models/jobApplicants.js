const mongoose = require("mongoose");

const jobApplicantsSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    coverLetter: {
      type: String,
    },
    uploadCV: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
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
