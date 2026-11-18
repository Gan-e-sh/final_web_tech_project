const express = require("express");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { protect, adminOnly } = require("../middleware/auth");
const router = express.Router();


router.patch("/:id", protect, async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id);

        if (!claim) {
            return res.status(404).json({
                message: "Claim not found"
            });
        }

        const item = await Item.findById(claim.item);

        if (!item) {
            return res.status(404).json({
                message: "Item not found"
            });
        }

        const isOwner =
            item.reportedBy.toString() === req.user._id.toString();

        if (!isOwner && req.user.role !== "admin") {
            return res.status(403).json({
                message: "Not allowed to review this claim"
            });
        }

        if (!["approved", "rejected"].includes(req.body.status)) {
            return res.status(400).json({
                message: "Status must be approved or rejected"
            });
        }

        if (claim.status !== "pending") {
            return res.status(400).json({
                message: "This claim has already been reviewed"
            });
        }

        if (req.body.status === "approved") {
            if (item.status !== "open") {
                return res.status(400).json({
                    message: "This item is no longer available"
                });
            }

            await Item.findByIdAndUpdate(item._id, {
                status: "claimed"
            });
        }

        claim.status = req.body.status;
        await claim.save();

        res.json({
            message: "Claim reviewed successfully",
            claim
        });

    } catch (err) {
        console.error("Claim review error:", err);

        res.status(400).json({
            message: "Could not review claim"
        });
    }
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
