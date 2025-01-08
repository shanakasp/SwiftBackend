const mongoose = require("mongoose");

const nominateDriverSchema = new mongoose.Schema(
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
    vehicleIds: {
      type: String,
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

    drivingLicenseExpireDate: { type: String, default: "No date added" },

    adminVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
    },

    vehicleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    ],
    nominatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleOwner",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NominateDriver", nominateDriverSchema);
