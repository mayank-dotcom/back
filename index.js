const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const RecordModel = require("./models/Record");
const InternModel = require("./models/Interns");
const InternDetailsModel = require("./models/interndetail");
const cors = require("cors");
const app = express();
const { verifyAdmin } = require("./authmiddleware");
require("dotenv").config();
const PORT = 8000;
const { MONGO_URL } = process.env;
const multer = require("multer");
const csv = require("csv-parser");
const stream = require("stream");
const { InternDetailSchema } = require("./schema/interndetailSchema");

// Set up multer with memory storage (no local file storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware for token verification
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, "secretKey");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// Middleware configurations
app.use(express.json());

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
// New endpoint for bulk upload of attendance
// Modify your bulk upload route to convert 12-hour time to 24-hour time
app.post(
  "/attendance/bulk-upload",
  verifyToken,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Function to convert 12-hour time to 24-hour time
    function convertTo24HourFormat(timeString) {
      // Remove spaces and convert to uppercase
      timeString = timeString.replace(/\s/g, "").toUpperCase();

      // Extract hours, minutes, and AM/PM
      const match = timeString.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);

      if (!match) {
        throw new Error(`Invalid time format: ${timeString}`);
      }

      let [, hours, minutes, period] = match;
      hours = parseInt(hours, 10);

      // Convert to 24-hour format
      if (period === "PM" && hours !== 12) {
        hours += 12;
      }
      if (period === "AM" && hours === 12) {
        hours = 0;
      }

      // Pad with leading zero if needed
      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }

    // Parse the CSV file from memory
    const csvResults = [];
    const fileBuffer = req.file.buffer;
    const readStream = new stream.PassThrough();
    readStream.end(fileBuffer); // Feed the file buffer to the read stream

    readStream
      .pipe(csv())
      .on("data", (data) => {
        try {
          // Convert clock-in time to 24-hour format before pushing
          data.clockIn = convertTo24HourFormat(data.clockIn);
          csvResults.push(data);
        } catch (err) {
          console.error("Error converting time:", err.message);
          // Optionally, you could collect these errors to return to the user
        }
      })
      .on("end", async () => {
        // Process CSV data (example: save each row as a new attendance record)
        try {
          const attendanceRecords = csvResults.map((record) => ({
            name: record.name,
            date: new Date(record.date), // Ensure the date is in correct format
            IN: record.clockIn,
            day: new Date(record.date).toLocaleString("en-US", {
              weekday: "long",
            }),
            report: record.report || "No report provided",
            verification: record.verification || "pending",
          }));

          // Bulk insert attendance records
          await InternModel.insertMany(attendanceRecords);

          res
            .status(201)
            .json({
              message: "Bulk upload successful",
              data: attendanceRecords,
            });
        } catch (err) {
          console.error("Error processing CSV data:", err);
          res
            .status(500)
            .json({ message: "Error processing CSV file", error: err.message });
        }
      })
      .on("error", (err) => {
        console.error("CSV Parsing Error:", err);
        res
          .status(500)
          .json({ message: "Error parsing CSV file", error: err.message });
      });
  }
);

app.delete("/delete-record/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedRecord = await InternModel.findByIdAndDelete(id);
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

    if (email === "pankajxerox@gmail.com" && password === "k26534gg") {
      const token = jwt.sign(
        { id: user._id, email, username: user.username, isAdmin: true },
        "secretKey",
        { expiresIn: "1h" }
      );
      return res.json({
        token,
        username: user.username,
        verifyAdmin,
        redirect: "/Admin",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email, username: user.username, isAdmin: false },
      "secretKey",
      { expiresIn: "1h" }
    );
    return res.json({
      token,
      username: user.username,
      redirect: "/MAINAttendance",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/create-record", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    console.log("Request body:", req.body);
    const hashedPassword = await bcrypt.hash(password, 10);

    const newRecord = new RecordModel({
      email,
      username,
      password: hashedPassword,
    });

    await newRecord.save();
    res
      .status(201)
      .json({ message: "Record created successfully", data: newRecord });
  } catch (err) {
    console.error("Error creating record:", err);

    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    }

    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    res
      .status(500)
      .json({ message: "Error creating record", error: err.message });
  }
});

// Protected routes with authentication
app.get("/attendance", verifyToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      const attendanceData = await InternModel.find({
        name: req.user.username,
      }).sort({ date: -1 });
      return res.status(200).json(attendanceData);
    }

    const attendanceData = await InternModel.find({}).sort({ date: -1 });
    res.status(200).json(attendanceData);
  } catch (err) {
    res.status(500).json({ message: "Error fetching attendance data" });
  }
});


app.post("/attendance/new", verifyToken, async (req, res) => {
  const { date, clockIn, report } = req.body;

  try {
    console.log("New Attendance Request:", {
      username: req.user.username,
      date,
      clockIn,
      report,
    });

    // Validate required fields
    if (!date || !clockIn) {
      return res.status(400).json({
        message: "Date and clock-in time are required",
      });
    }

    // Validate date format
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format",
      });
    }

    // Validate that date is today
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      inputDate.toDateString() !== today.toDateString() &&
      inputDate.toDateString() !== yesterday.toDateString()
    ) {
      return res.status(400).json({
        message: "Attendance can only be marked for today",
      });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await InternModel.findOne({
      name: req.user.username,
      date: {
        $gte: new Date(inputDate.setHours(0, 0, 0, 0)),
        $lt: new Date(inputDate.setHours(23, 59, 59, 999)),
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Attendance already marked for this date",
      });
    }

    // Create new attendance record
    const newAttendance = new InternModel({
      name: req.user.username,
      date: inputDate,
      IN: clockIn,
      day: inputDate.toLocaleString("en-US", { weekday: "long" }),
      report: report || "No report provided",
      verification: "pending",
    });

    // Validate the model
    const validationError = newAttendance.validateSync();
    if (validationError) {
      console.error("Validation Error:", validationError);
      return res.status(400).json({
        message: "Validation failed",
        errors: validationError.errors,
      });
    }

    await newAttendance.save();

    res.status(201).json({
      message: "Attendance added successfully",
      attendance: newAttendance,
    });
  } catch (err) {
    console.error("Attendance Creation Error:", err);
    res.status(500).json({
      message: "Error adding attendance record",
      error: err.message,
    });
  }
});

app.put("/attendance/update", verifyToken, async (req, res) => {
  const { id, clockIn, report, verified_report, date, verification } = req.body;
  try {
    const intern = await InternModel.findById(id);
    if (!intern) {
      return res.status(404).send("Intern not found");
    }

    // Only allow users to update their own records unless they're admin
    if (!req.user.isAdmin && intern.name !== req.user.username) {
      return res
        .status(403)
        .json({ message: "Unauthorized to modify this record" });
    }

    if (clockIn) intern.IN = clockIn;
    if (report) intern.report = report;
    if (verified_report) intern.verified_report = verified_report;
    if (date) intern.date = new Date(date);
    if (verification && req.user.isAdmin) intern.verification = verification;

    await intern.save();
    res.send("Record updated successfully");
  } catch (err) {
    res.status(500).send("Server error");
  }
});


app.get("/internDetails", verifyToken, async (req, res) => {
  try {
    const internData = await InternDetailsModel.find({}, { __v: 0 }); // Fetch all intern details, excluding the __v field
    console.log(internData)
    console.log("got the data")
    res.status(200).json(internData);
  } catch (error) {
    console.error("Error fetching intern details:", error);
    res.status(500).json({ message: "Error fetching intern details" });
  }
});

app.get('/internDetails/:internId', verifyToken, async (req, res) => {
  const internId = req.params.internId;
try {
  const intern = await InternDetailsModel.findById(internId); 
  if (intern) {
    res.status(200).json(intern); // Send the intern details as JSON
  }

}catch{
  console.error("Error fetching intern details: ", error)
    res.status(404).send('Intern not found'); // Or send JSON
  }
});

app.get('/interninfo/:internName', verifyToken, async (req, res) => {
  const internName = req.params.internName;
try {
  const intern = await InternDetailsModel.findOne({name: internName}); 
  if (intern) {
    res.status(200).json(intern); // Send the intern details as JSON
  }

}catch{
  console.error("Error fetching intern details: ", error)
    res.status(404).send('Intern not found'); // Or send JSON
  }
});

app.post('/createIntern', async (req, res) => {
  try {
    console.log('creating new intern');
    const { name, internshipType, internshipDuration, dailyHours, contactNumber } = req.body;

    const newIntern = new InternDetailsModel({
      name,
      internshipType,
      internshipDuration,
      dailyHours,
      contactNumber,
    });

    await newIntern.save();
    console.log('new intern saved');
    res.status(201).send('Record created successfully');
  } catch (err) {
    if (err.name === 'ValidationError') {
      console.error('Validation Error:', err);
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.errors,
      });
    } else {
      console.error('Error creating new intern:', err);
      res.status(500).send('Server error');
    }
  }
});


app.put("/updateIntern/:internId", verifyToken, async (req, res) => {
  console.log("got into the function");

  const {name, internshipType, internshipDuration, dailyHours, contactNumber } = req.body;

  try {
    const intern = await InternDetailsModel.findOne({ id: req.params.id });

    if (intern) {
      console.log("intern found and changing the details");

      intern.name = name;
      intern.internshipType = internshipType;
      intern.internshipDuration = internshipDuration;
      intern.dailyHours = dailyHours;
      intern.contactNumber = contactNumber;

      console.log("changed and completed the save");

      try {
        await intern.save();
        res.send("Record updated successfully");
      } catch (err) {
        if (err.name === "ValidationError") {
          return res.status(400).json({
            message: "Validation failed",
            errors: err.errors,
          });
        } else {
          res.status(500).send("Server error");
        }
      }
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
});


app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
