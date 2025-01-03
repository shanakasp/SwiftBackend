const mongoose = require("mongoose");

const vehicleOwnerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    mobileNo: {
      type: String,
      required: true,
    },
    image: {
      public_id: String,
      url: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleOwner", vehicleOwnerSchema);
