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
app.post("/attendance", async (req, res) => {
  const { username, action, report } = req.body;  // Add report to destructuring

  const currentDate = new Date();
  const day = currentDate.toLocaleString("en-US", { weekday: "long" });
  const time = currentDate.toTimeString().split(" ")[0].slice(0, 5);

  try {
    if (action === "clockIn") {
      const attendanceData = {
        name: username,
        date: currentDate,
        day: day,
        IN: time,
        report: "" // Initialize empty report
      };

      const attendanceRecord = new Interns(attendanceData);
      await attendanceRecord.save();
      console.log("Clock IN updated:", attendanceRecord);

      return res.status(201).json({ message: "Clock In saved successfully", data: attendanceRecord });
    } else if (action === "clockOut") {
      const attendanceRecord = await Interns.findOneAndUpdate(
        { name: username },
        { 
          OUT: time,
          report: report || "No report submitted" // Add report during clock out
        },
        { sort: { _id: -1 }, new: true }
      );

      if (!attendanceRecord) {
        console.error("No Clock In record found for this user");
        return res.status(404).json({ message: "No Clock In record found for this user" });
      }

      console.log("Clock Out updated successfully:", attendanceRecord);
      return res.status(200).json({ message: "Clock Out saved successfully", data: attendanceRecord });
    }
  } catch (error) {
    console.error("Error saving attendance:", error);
    res.status(500).json({ message: "Error saving attendance", error });
  }
});

// Update the update endpoint to include report
app.put("/attendance/update", async (req, res) => {
  const { id, clockIn, clockOut, date, report } = req.body;

  try {
    const updates = {};
    if (clockIn) updates.IN = clockIn;
    if (clockOut) updates.OUT = clockOut;
    if (date) updates.date = date;
    if (report) updates.report = report;

    const updatedRecord = await Interns.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.status(200).json({ message: "Record updated successfully", data: updatedRecord });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Error updating record" });
  }
});


// Update the new attendance endpoint to include report
app.post("/attendance/new", async (req, res) => {
  const { username, date, clockIn, clockOut, report } = req.body;  // Add report to destructuring

  // Validate input
  if (!username || !date || !clockIn || !clockOut) {
    return res.status(400).json({ 
      message: "All fields are required", 
      receivedData: req.body 
    });
  }

  try {
    // Parse the date string in mm-dd-yyyy format
    const [month, day, year] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);

    const newAttendance = new Interns({
      name: username,
      date: parsedDate,
      day: parsedDate.toLocaleString("en-US", { weekday: "long" }),
      IN: clockIn,
      OUT: clockOut,
      report: report || "No report submitted"  // Add report with default value
    });

    // Validate the model before saving
    const validationError = newAttendance.validateSync();
    if (validationError) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: validationError.errors 
      });
    }

    await newAttendance.save();
    res.status(201).json({ 
      message: "New attendance record added successfully", 
      data: newAttendance 
    });
  } catch (error) {
    console.error("Error adding new attendance record:", error);
    res.status(500).json({ 
      message: "Failed to add new attendance record", 
      error: error.message 
    });
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