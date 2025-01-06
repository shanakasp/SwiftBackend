const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema({
  make: String,
  model: String,
  year: Number,
  registration: String,
  color: String,
  insuranceDetails: String,
  registrationPapers: { public_id: String, url: String },
  insuranceCertificate: { public_id: String, url: String },
  roadworthyCertificate: { public_id: String, url: String },
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
