const { Schema } = require("mongoose");
const InternSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  IN: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/, // Validates HH:mm format
  },
  date: {
    type: Date,
    default: Date.now, // Defaults to the current date
  },
  day: {
    type: String,
    required: true,
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], // Restrict to valid days
  },
  report:{
    type: String,
    default: "No report yet" 
  },
  verification:{
    type: String,
    default:"pending"
  }
});

module.exports = { InternSchema };
