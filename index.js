// server.js
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const RecordModel = require("./models/Record");
const Interns = require("./models/Interns");
const cors = require("cors");
const app = express();
const { verifyAdmin } = require("./authmiddleware");
require("dotenv").config();
const PORT = 8000;
const { MONGO_URL } = process.env;

// Middleware configurations
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB is connected successfully"))
  .catch((err) => console.error(err));

// Public routes
app.get("/", async (req, res) => {
  res.send("Hello World");
});
app.delete("/delete-record/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedRecord = await Interns.findByIdAndDelete(id); // Assuming you're using Mongoose
    if (!deletedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.status(200).json({ message: "Record deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await RecordModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for admin credentials first
    if (email === "pankajxerox@gmail.com" && password === "k26534gg") {
      const token = jwt.sign({ id: user._id, email: email , isAdmin: true}, "secretKey", { expiresIn: "1h" });
      return res.json({ token, username: user.username,verifyAdmin, redirect: "/Admin" });
    }

    // Check for regular user credentials
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: email }, "secretKey", { expiresIn: "1h" });
    return res.json({ token, username: user.username,  redirect: "/MAINAttendance" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
app.post("/create-record", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // Log the incoming request body for debugging
    console.log("Request body:", req.body);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create a new record
    const newRecord = new RecordModel({
      email,
      username,
      password: hashedPassword,
    });

    // Save the record to the database
    await newRecord.save();
    res.status(201).json({ message: "Record created successfully", data: newRecord });
  } catch (err) {
    console.error("Error creating record:", err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation error", errors: err.errors });
    }

    // Handle duplicate key error
    if (err.code === 11000) { // Duplicate key error
      return res.status(409).json({ message: "Email already exists" });
    }

    // General server error
    res.status(500).json({ message: "Error creating record", error: err.message });
  }
});
// Protected routes - Regular users
// Update the clock out endpoint to include report
app.get("/attendance", async (req, res) => {
  const { username } = req.query;
  try {
    const attendanceData = await Interns.find({ name: username }).sort({ date: -1 });
    res.status(200).json(attendanceData);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance data" });
  }
});

app.post("/attendance/new", async (req, res) => {
  const { username, date, clockIn, report } = req.body;
  try {
    const dayOfWeek = new Date(date).toLocaleString("en-US", { weekday: "long" });

    const newAttendance = new Interns({
      name: username,
      date,
      IN: clockIn,
      day: dayOfWeek,
      report,
      verification: "pending",
    });

    await newAttendance.save();
    res.status(201).json({ message: "Attendance added successfully", attendance: newAttendance });
  } catch (err) {
    res.status(500).json({ message: "Error adding attendance record" });
  }
});

app.put("/attendance/update", async (req, res) => {
  const { id, clockIn, report, date, verification } = req.body;
  try {
    const intern = await Interns.findById(id);
    if (!intern) {
      return res.status(404).send("Intern not found");
    }

    if (clockIn) intern.IN = clockIn;
    if (report) intern.report = report;
    if (date) intern.date = new Date(date);
    if (verification) intern.verification = verification;

    await intern.save();
    res.send("Record updated successfully");
  } catch (err) {
    res.status(500).send("Server error");
  }
});


app.get("/attendance",  async (req, res) => {
  const { username } = req.query;

  try {
    const attendanceRecords = await Interns.find({ name: username }).sort({ date: -1 });
    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ message: "Error fetching attendance records", error });
  }
});

// Protected routes - Admin only
app.get("/getattendance", verifyAdmin, async (req, res) => {
  try {
    const attendanceRecords = await Interns.find({}).sort({ date: -1 });
    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ message: "Error fetching attendance records", error });
  }
});
app.get("/",async (req, res) => {
  res.send("Hello World");
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});