const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel",
    },
    model: {
      type: String,
      required: true,
      enum: ["Admin", "Rider", "Driver"],
    },
  },
  receiver: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      // Not required for messages to admin
      refPath: "receiverModel",
    },
    model: {
      type: String,
      required: true,
      enum: ["Admin", "Rider", "Driver"],
    },
  },
  title: {
    type: String,
    required: true,
    enum: ["Rider", "Driver"],
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
