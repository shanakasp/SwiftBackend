const router = require("express").Router();
const Message = require("../models/message");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const upload = require("../middleware/upload");
const cloudinary = require("cloudinary").v2;

const uploadMultipleFiles = async (files) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "messages" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        })
        .end(file.buffer);
    });
  });
  return Promise.all(uploadPromises);
};

// User (Driver/Rider) sends message to Admin
router.post(
  "/to-admin",
  auth,
  upload.array("screenshots", 5),
  async (req, res) => {
    try {
      const { title, category, message } = req.body;

      let screenshots = [];
      if (req.files && req.files.length > 0) {
        const uploadedFiles = await uploadMultipleFiles(req.files);
        screenshots = uploadedFiles.map((file) => ({
          public_id: file.public_id,
          url: file.secure_url,
        }));
      }

      const newMessage = new Message({
        sender: {
          id: req.user.id,
          model: req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1),
        },
        receiver: {
          model: "Admin",
        },
        title,
        category,
        message,
        screenshots,
      });

      await newMessage.save();
      res.status(201).json({
        message: "Message sent to admin successfully",
        data: newMessage,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Admin replies to a user's message
router.post(
  "/admin-reply/:messageId",
  adminAuth,
  upload.array("screenshots", 5),
  async (req, res) => {
    try {
      const { message } = req.body;
      const parentMessage = await Message.findById(req.params.messageId);

      if (!parentMessage) {
        return res.status(404).json({ message: "Original message not found" });
      }

      let screenshots = [];
      if (req.files && req.files.length > 0) {
        const uploadedFiles = await uploadMultipleFiles(req.files);
        screenshots = uploadedFiles.map((file) => ({
          public_id: file.public_id,
          url: file.secure_url,
        }));
      }

      const reply = new Message({
        sender: {
          id: req.admin._id,
          model: "Admin",
        },
        receiver: {
          id: parentMessage.sender.id,
          model: parentMessage.sender.model,
        },
        title: parentMessage.title,
        category: parentMessage.category,
        message,
        screenshots,
        isAdminMessage: true,
        parentMessage: parentMessage._id,
      });

      await reply.save();

      // Update parent message status
      await Message.findByIdAndUpdate(req.params.messageId, {
        status: "responded",
      });

      res.status(201).json({
        message: "Reply sent successfully",
        data: reply,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Get all messages for admin
router.get("/admin/messages", adminAuth, async (req, res) => {
  try {
    const messages = await Message.find({
      "receiver.model": "Admin",
      isAdminMessage: false,
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get conversation thread for admin
router.get("/admin/thread/:messageId", adminAuth, async (req, res) => {
  try {
    const mainMessage = await Message.findById(req.params.messageId);
    if (!mainMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    const replies = await Message.find({
      parentMessage: req.params.messageId,
    }).sort({ createdAt: 1 });

    res.json({
      mainMessage,
      replies,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's messages and replies
router.get("/my-messages", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ "sender.id": req.user.id }, { "receiver.id": req.user.id }],
    }).sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark message as read (for admin)
router.patch("/admin/mark-read/:messageId", adminAuth, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      { status: "read" },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message marked as read", data: message });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
