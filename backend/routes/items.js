const express = require("express");
const multer = require("multer");
const path = require("path");
const Item = require("../models/Item");
const { protect, adminOnly } = require("../middleware/auth");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype))
});

router.get("/", async (req, res) => {
  try {
    const { search, category, location, type, sort = "newest" } = req.query;
    const filter = {};
    if (type && ["lost", "found"].includes(type)) filter.type = type;
    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: "i" };
    if (search) filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
    const items = await Item.find(filter).populate("reportedBy", "name").sort({ date: sort === "oldest" ? 1 : -1 });
    res.json(items);
  } catch { res.status(500).json({ message: "Could not retrieve items" }); }
});

router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    const { title, type, category, description, location, date } = req.body;
    if (!title || !type || !category || !description || !location || !date)
      return res.status(400).json({ message: "Please complete all required fields" });
    const item = await Item.create({
      title, type, category, description, location, date,
      image: req.file ? `/uploads/${req.file.filename}` : "",
      reportedBy: req.user._id
    });
    res.status(201).json(item);
  } catch { res.status(400).json({ message: "Invalid item details or image" }); }
});

router.get("/mine", protect, async (req, res) => {
  const items = await Item.find({ reportedBy: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

router.patch("/:id/status", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== "admin")
      return res.status(403).json({ message: "Not allowed to update this item" });
    if (!["open", "claimed", "returned"].includes(req.body.status))
      return res.status(400).json({ message: "Invalid status" });
    item.status = req.body.status;
    await item.save();
    res.json(item);
  } catch { res.status(400).json({ message: "Invalid item ID" }); }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.reportedBy.toString() !== req.user._id.toString() && req.user.role !== "admin")
      return res.status(403).json({ message: "Not allowed to delete this item" });
    await item.deleteOne();
    res.json({ message: "Item deleted" });
  } catch { res.status(400).json({ message: "Invalid item ID" }); }
});

router.get("/admin/all", protect, adminOnly, async (req, res) => {
  const items = await Item.find().populate("reportedBy", "name email").sort({ createdAt: -1 });
  res.json(items);
});
module.exports = router;
