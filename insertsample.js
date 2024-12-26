require("dotenv").config();
const mongoose = require("mongoose");
const Intern = require("./models/Interns"); // Adjust the path if needed

// MongoDB connection
const { MONGO_URL } = process.env;

mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Sample data
const sampleData = [
  {
    name: "nibedita",
    IN: "01:02",    // Time should be a string
    date: "12-25-2024", // Date should be a proper date string
    day: "Wednesday",
    report: "done"
  },
  {
    name: "bhavya",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "isha",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "harshita",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "rupali",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "priyanka",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "vishwajeet",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "venu",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "thamanna",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "pavan",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  },
  {
    name: "ashitosh",
    IN: "01:02",
    date: "12-25-2024",
    day: "Wednesday",
    report: "done"
  }
];

// Insert sample data
Intern.insertMany(sampleData)
  .then(() => {
    console.log("Sample data inserted successfully");
    mongoose.connection.close(); // Close connection after insertion
  })
  .catch((err) => {
    console.error("Error inserting sample data:", err);
    mongoose.connection.close(); // Close connection even if there’s an error
  });