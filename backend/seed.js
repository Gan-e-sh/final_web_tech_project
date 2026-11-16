require("dotenv").config();
const connectDB = require("./config/db");
const User = require("./models/User");
const Item = require("./models/Item");
const bcrypt = require("bcryptjs");

async function seed() {
  await connectDB();
  const email = process.env.ADMIN_EMAIL || "admin@campus.edu";
  let admin = await User.findOne({ email });
  if (!admin) admin = await User.create({
    name: "Campus Administrator", email,
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMe123!", 12),
    role: "admin"
  });

  const count = await Item.countDocuments();
  if (count === 0) {
    const samples = [
      ["Blue Water Bottle","found","Accessories","Blue steel bottle found near the library.","Central Library","2026-11-01"],
      ["Black Wallet","lost","Personal Items","Black wallet with student ID inside.","Main Canteen","2026-11-02"],
      ["Scientific Calculator","found","Electronics","Casio calculator found in Room 204.","Block A","2026-11-03"],
      ["Wireless Earbuds","lost","Electronics","White earbuds in a charging case.","Auditorium","2026-11-04"],
      ["Student ID Card","found","Documents","ID card found near the sports ground.","Sports Complex","2026-11-05"],
      ["Red Backpack","lost","Bags","Red backpack with notebooks.","Parking Area","2026-11-06"],
      ["House Keys","found","Personal Items","Two keys with a small keychain.","Hostel Reception","2026-11-07"],
      ["Physics Notebook","lost","Books","Blue physics notebook with handwritten notes.","Block B","2026-11-08"],
      ["USB Drive","found","Electronics","32GB USB drive found in computer lab.","Computer Lab","2026-11-09"],
      ["Grey Hoodie","lost","Clothing","Grey hoodie left after class.","Seminar Hall","2026-11-10"]
    ];
    await Item.insertMany(samples.map(x => ({
      title:x[0], type:x[1], category:x[2], description:x[3],
      location:x[4], date:new Date(x[5]), reportedBy:admin._id
    })));
  }
  console.log("Seed complete. Admin:", email);
  console.log("Change the default admin password after first login.");
  process.exit();
}
seed().catch(err => { console.error(err); process.exit(1); });
