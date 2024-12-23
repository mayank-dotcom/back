const { model } = require("mongoose");
const { InternSchema } = require("../schema/Internchema"); // Ensure the schema file path is correct

// Define the model
const InternModel = model("Intern", InternSchema);

// Export the model directly
module.exports = InternModel;
