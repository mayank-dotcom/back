const { model } = require("mongoose");
const { RecordSchema } = require("../schema/Recordchema"); // Ensure the schema file path is correct

// Define the model
const RecordModel = model("Record", RecordSchema);

// Export the model directly
module.exports = RecordModel;
