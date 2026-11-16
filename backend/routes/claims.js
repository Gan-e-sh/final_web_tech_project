const express = require("express");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { protect, adminOnly } = require("../middleware/auth");
const router = express.Router();

router.post("/", protect, async (req, res) => {
  try {
    const { itemId, message } = req.body;
    if (!itemId || !message) return res.status(400).json({ message: "Item and claim message are required" });
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.reportedBy.toString() === req.user._id.toString())
      return res.status(400).json({ message: "You cannot claim your own listing" });
    const duplicate = await Claim.findOne({ item: itemId, claimant: req.user._id, status: "pending" });
    if (duplicate) return res.status(409).json({ message: "You already have a pending claim" });
    const claim = await Claim.create({ item: itemId, claimant: req.user._id, message });
    res.status(201).json(claim);
  } catch { res.status(400).json({ message: "Invalid claim details" }); }
});

router.get("/mine", protect, async (req, res) => {
  const claims = await Claim.find({ claimant: req.user._id }).populate("item").sort({ createdAt: -1 });
  res.json(claims);
});

router.get("/admin/all", protect, adminOnly, async (req, res) => {
  const claims = await Claim.find().populate("item").populate("claimant", "name email").sort({ createdAt: -1 });
  res.json(claims);
});

router.patch("/:id", protect, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate("item");
    if (!claim) return res.status(404).json({ message: "Claim not found" });
    const isOwner = claim.item.reportedBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Not allowed to review this claim" });
    if (!["approved", "rejected"].includes(req.body.status))
      return res.status(400).json({ message: "Status must be approved or rejected" });
    claim.status = req.body.status;
    await claim.save();
    if (req.body.status === "approved") {
      await Item.findByIdAndUpdate(claim.item._id, { status: "claimed" });
    }
    res.json(claim);
  } catch { res.status(400).json({ message: "Invalid claim ID" }); }
});
module.exports = router;
