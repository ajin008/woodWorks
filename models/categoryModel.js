const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensure category names are unique
  },
  isListed: {
    type: Boolean,
    default: true, // Default value is false indicating the category is unblocked
  },
  // Add any additional attributes you need for categories
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
