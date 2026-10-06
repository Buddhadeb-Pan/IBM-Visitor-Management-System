const express = require("express");
const router = express.Router();
const Visitor = require("../models/Visitor");
const requireAuth = require("../middleware/auth");

// Protect all visitor routes with authentication
router.use(requireAuth);

// Helper function to validate basic input fields
function validateVisitorData(data) {
  const {
    name,
    mobileNumber,
    email,
    organization,
    personToMeet,
    purpose,
    visitDateTime,
    status,
  } = data;

  if (
    !name ||
    !mobileNumber ||
    !email ||
    !organization ||
    !personToMeet ||
    !purpose ||
    !visitDateTime ||
    !status
  ) {
    return "All fields are required.";
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address.";
  }

  // Mobile number validation: Indian mobile numbers with exactly 10 digits starting with 6, 7, 8, or 9
  const mobileRegex = /^[6-9][0-9]{9}$/;
  const formattedMobile =
    typeof mobileNumber === "string"
      ? mobileNumber.trim()
      : String(mobileNumber || "").trim();
  if (!mobileRegex.test(formattedMobile)) {
    return "Enter a valid 10-digit Indian mobile number.";
  }

  // Status check
  if (status !== "Checked In" && status !== "Checked Out") {
    return "Status must be either 'Checked In' or 'Checked Out'.";
  }

  return null;
}

// 1. GET /api/visitors - Get all visitors belonging to the logged-in user (with optional search)
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = { userId: req.user._id };

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i"); // Case-insensitive regex
      query = {
        userId: req.user._id,
        $or: [{ name: searchRegex }, { mobileNumber: searchRegex }],
      };
    }

    // Sort by latest created first
    const visitors = await Visitor.find(query).sort({ createdAt: -1 });
    res.status(200).json(visitors);
  } catch (error) {
    console.error("Error fetching visitors:", error.message);
    res.status(500).json({ message: "Failed to fetch visitors from database." });
  }
});

// 2. GET /api/visitors/:id - Get a single visitor by ID for the logged-in user
router.get("/:id", async (req, res) => {
  try {
    const visitor = await Visitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found." });
    }

    res.status(200).json(visitor);
  } catch (error) {
    console.error("Error fetching visitor:", error.message);
    res.status(500).json({ message: "Failed to fetch visitor details." });
  }
});

// 3. POST /api/visitors - Add a new visitor owned by the logged-in user
router.post("/", async (req, res) => {
  try {
    const validationError = validateVisitorData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const {
      name,
      mobileNumber,
      email,
      organization,
      personToMeet,
      purpose,
      visitDateTime,
      status,
    } = req.body;

    const newVisitor = new Visitor({
      userId: req.user._id, // Set the owner from the authenticated user on the server
      name: name.trim(),
      mobileNumber: String(mobileNumber).trim(),
      email: email.trim().toLowerCase(),
      organization: organization.trim(),
      personToMeet: personToMeet.trim(),
      purpose: purpose.trim(),
      visitDateTime: visitDateTime.trim(),
      status: status.trim(),
    });

    const savedVisitor = await newVisitor.save();
    res.status(201).json(savedVisitor);
  } catch (error) {
    console.error("Error adding visitor:", error.message);
    res.status(500).json({ message: "Failed to save visitor. " + error.message });
  }
});

// 4. PUT /api/visitors/:id - Update visitor details if owned by the logged-in user
router.put("/:id", async (req, res) => {
  try {
    const validationError = validateVisitorData(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const {
      name,
      mobileNumber,
      email,
      organization,
      personToMeet,
      purpose,
      visitDateTime,
      status,
    } = req.body;

    const updatedVisitor = await Visitor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        name: name.trim(),
        mobileNumber: String(mobileNumber).trim(),
        email: email.trim().toLowerCase(),
        organization: organization.trim(),
        personToMeet: personToMeet.trim(),
        purpose: purpose.trim(),
        visitDateTime: visitDateTime.trim(),
        status: status.trim(),
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found or unauthorized." });
    }

    res.status(200).json(updatedVisitor);
  } catch (error) {
    console.error("Error updating visitor:", error.message);
    res.status(500).json({ message: "Failed to update visitor. " + error.message });
  }
});

// 5. DELETE /api/visitors/:id - Delete a visitor if owned by the logged-in user
router.delete("/:id", async (req, res) => {
  try {
    const deletedVisitor = await Visitor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deletedVisitor) {
      return res.status(404).json({ message: "Visitor not found or unauthorized." });
    }

    res.status(200).json({ message: "Visitor deleted successfully." });
  } catch (error) {
    console.error("Error deleting visitor:", error.message);
    res.status(500).json({ message: "Failed to delete visitor." });
  }
});

module.exports = router;
