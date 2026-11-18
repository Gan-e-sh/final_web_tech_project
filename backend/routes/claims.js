
const express = require("express");
const Claim = require("../models/Claim");
const Item = require("../models/Item");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// SUBMIT A NEW CLAIM
router.post("/", protect, async (req, res) => {
    try {
        const { itemId, message } = req.body;

        if (!itemId || !message || !message.trim()) {
            return res.status(400).json({
                message: "Item ID and claim message are required"
            });
        }

        const item = await Item.findById(itemId);

        if (!item) {
            return res.status(404).json({
                message: "Item not found"
            });
        }

        if (item.status !== "open") {
            return res.status(400).json({
                message: "This item is no longer available"
            });
        }

        if (item.reportedBy.toString() === req.user._id.toString()) {
            return res.status(403).json({
                message: "You cannot claim your own reported item"
            });
        }

        const existingClaim = await Claim.findOne({
            item: itemId,
            claimant: req.user._id,
            status: "pending"
        });

        if (existingClaim) {
            return res.status(400).json({
                message: "You already have a pending claim for this item"
            });
        }

        const claim = await Claim.create({
            item: itemId,
            claimant: req.user._id,
            message: message.trim()
        });

        res.status(201).json({
            message: "Claim submitted successfully",
            claim
        });

    } catch (err) {
        console.error("Claim submission error:", err);

        res.status(500).json({
            message: "Could not submit claim"
        });
    }
});

// GET MY CLAIMS
router.get("/mine", protect, async (req, res) => {
    try {
        const claims = await Claim.find({
            claimant: req.user._id
        })
        .populate("item")
        .sort({ createdAt: -1 });

        res.json(claims);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Could not load your claims"
        });
    }
});

// GET ALL CLAIMS (ADMIN)
router.get("/admin/all", protect, adminOnly, async (req, res) => {
    try {
        const claims = await Claim.find()
            .populate("item")
            .populate("claimant", "name email")
            .sort({ createdAt: -1 });

        res.json(claims);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Could not load claims"
        });
    }
});

// APPROVE OR REJECT CLAIM
router.patch("/:id", protect, async (req, res) => {
    try {
        const claim = await Claim.findById(req.params.id)
            .populate("item");

        if (!claim) {
            return res.status(404).json({
                message: "Claim not found"
            });
        }

        const item = claim.item;

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

        res.status(500).json({
            message: "Could not review claim"
        });
    }
});

module.exports = router;
