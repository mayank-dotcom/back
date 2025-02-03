const { Schema } = require("mongoose");
const InternDetailSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  internshipType: {
    type: String,
  },
  internshipDuration: {
    type: String,
  },
  dailyHours: {
    type: String,
  },
  contactNumber: {
    type: String,
  },
  
});

module.exports = { InternDetailSchema };
