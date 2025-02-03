const { model } = require("mongoose");
const { InternDetailSchema } = require("../schema/interndetailSchema"); // Ensure the schema file path is correct

// Define the model
const InternDetailsModel = model("InternDetails", InternDetailSchema);

// Export the model directly
module.exports = InternDetailsModel;
