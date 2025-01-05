const mongoose = require("mongoose");

const SecurityJobSchema = new mongoose.Schema(
  {
    securityJobTitle: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["PU", "ARU", "OCU"],
      required: true,
    },
    requirements: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    // Number of required documents
    requiredDocumentCount: {
      type: Number,
      required: true,
      min: 1,
    },
    // Document requirements description
    requiredDocuments: [
      {
        documentName: String,
        description: String,
      },
    ],
    applicants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobApplicantSecurity",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SecurityJob", SecurityJobSchema);
