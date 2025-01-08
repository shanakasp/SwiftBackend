const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  ownerEmail: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  registration: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  insuranceDetails: {
    type: String,
    required: true,
  },
  registrationPapers: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  insuranceCertificate: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  roadworthyCertificate: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  adminVerified: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VehicleOwner",
    required: true,
  },
});

module.exports = mongoose.model("Vehicle", vehicleSchema);
