const mongoose = require("mongoose");

const vehicleOwnerSchema = new mongoose.Schema(
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
    proofOfAddress: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
    },
    imageID: {
      public_id: { type: String, required: true },
      url: { type: String, required: true },
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

    vehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleOwner", vehicleOwnerSchema);
