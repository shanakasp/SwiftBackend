const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    idPassportNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    driverLicense: {
      public_id: String,
      url: String,
    },
    prdp: {
      public_id: String,
      url: String,
    },
    policeClearance: {
      public_id: String,
      url: String,
    },
    proofOfAddress: {
      public_id: String,
      url: String,
    },
    vehicle: {
      make: String,
      model: String,
      year: Number,
      registration: String,
      color: String,
      insuranceDetails: String,
      registrationPapers: {
        public_id: String,
        url: String,
      },
      insuranceCertificate: {
        public_id: String,
        url: String,
      },
      roadworthyCertificate: {
        public_id: String,
        url: String,
      },
    },
    criminalRecordCheck: {
      type: Boolean,
      required: true,
    },
    consentDrivingRecordCheck: {
      type: Boolean,
      required: true,
    },
    consentEmploymentVerification: {
      type: Boolean,
      required: true,
    },
    acceptTermsConditions: {
      type: Boolean,
      required: true,
    },
    consentDataProcessing: {
      type: Boolean,
      required: true,
    },
    adminVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);
