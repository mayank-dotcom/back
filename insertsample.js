require("dotenv").config();
const mongoose = require("mongoose");
const Intern= require("./models/Interns"); // Adjust the path if needed

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
    name: "mayank",
    IN: "02:02",    // Time should be a string
    date: "12-24-2024", // Date should be a proper date string
    day: "Tuesday",
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
