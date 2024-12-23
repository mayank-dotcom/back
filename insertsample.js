require("dotenv").config();
const mongoose = require("mongoose");
const Record= require("./models/Record"); // Adjust the path if needed

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
    email: "mayank11d@gmail.com",
    username: "Smithson",
    password:"224fff6",
  },
];

// Insert sample data

Record.insertMany(sampleData)
  .then(() => {
    console.log("Sample data inserted successfully");
    mongoose.connection.close(); // Close connection after insertion
  })
  .catch((err) => {
    console.error("Error inserting sample data:", err);
    mongoose.connection.close(); // Close connection even if there’s an error
  });
