const mongoose = require("mongoose");

// Define schema for visitor records
const visitorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner user is required"],
    },
    name: {
      type: String,
      required: [true, "Visitor name is required"],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      match: [/^[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
    },
    organization: {
      type: String,
      required: [true, "Organization or College name is required"],
      trim: true,
    },
    personToMeet: {
      type: String,
      required: [true, "Person to meet is required"],
      trim: true,
    },
    purpose: {
      type: String,
      required: [true, "Purpose of visit is required"],
      trim: true,
    },
    visitDateTime: {
      type: String,
      required: [true, "Date and time of visit is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Checked In", "Checked Out"],
      default: "Checked In",
      required: [true, "Status is required"],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

module.exports = mongoose.model("Visitor", visitorSchema);
