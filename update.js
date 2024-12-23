require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const RecordModel = require("./models/Record"); // Adjust path if needed

// Connect to MongoDB
const { MONGO_URL } = process.env;

mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));


async function updatePasswords() {
  try {
    // Fetch all users
    const users = await RecordModel.find();

    for (let user of users) {
      // Check if password is already hashed
      const isHashed = user.password.startsWith("$2a$"); // bcrypt hashes start with $2a$

      if (!isHashed) {
        // Hash plain-text password
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Update user password
        await RecordModel.updateOne(
          { _id: user._id }, // Find by ID
          { $set: { password: hashedPassword } } // Replace with hashed password
        );
        console.log(`Updated password for ${user.email}`);
      } else {
        console.log(`Password already hashed for ${user.email}`);
      }
    }

    console.log("Password update process completed.");
    mongoose.disconnect(); // Close DB connection
  } catch (err) {
    console.error("Error updating passwords:", err);
    mongoose.disconnect(); // Close DB connection on error
  }
}

updatePasswords();
