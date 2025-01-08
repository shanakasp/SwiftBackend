const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "sender.model",
    },
    model: {
      type: String,
      required: true,
      enum: ["Admin", "Rider", "Driver", "NominateDriver", "VehicleOwner"],
    },
  },
  receiver: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      // Not required for messages to admin
      refPath: "receiver.model",
    },
    model: {
      type: String,
      required: true,
      enum: ["Admin", "Rider", "Driver", "NominateDriver", "VehicleOwner"],
    },
  },
  title: {
    type: String,

    enum: ["Rider", "Driver", "VehicleOwner", "NominateDriver"],
  },
  category: {
    type: String,
    // required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isAdminMessage: {
    type: Boolean,
    default: false,
  },
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },
  screenshots: [
    {
      public_id: String,
      url: String,
    },
  ],
  status: {
    type: String,
    enum: ["unread", "read", "responded"],
    default: "unread",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Message", messageSchema);
