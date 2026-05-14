const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      minlength: 3,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "inactive"],
    },
  },
  { timestamps: true }
);

faqSchema.index({ sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("Faq", faqSchema);
