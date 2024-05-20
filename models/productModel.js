// const mongoose = require("mongoose");

// const productSchema = new mongoose.Schema({
//   name: String,
//   description: String,
//   detailedInformation: String,
//   category: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Category",
//   },
//   qty: Number,
//   color: String,
//   actualPrice: Number,
//   offerPrice: Number,
//   images: [String],
//   serialNumber: String,
//   isListed: {
//     type: Boolean,
//     default: true, // Default value is true indicating the product is listed
//   },
// });

// const Product = mongoose.model("Product", productSchema);

// module.exports = Product;
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  serialNumber: String, // Add a field for the serial number
  name: String,
  brandName: String,
  description: String,
  detailedInformation: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  qty: Number,
  color: String,
  actualPrice: Number,
  offerPrice: Number,
  images: [String],
  isListed: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  rating: {
    type: Number,
    default: 0,
  },
  hasOfferApplied: {
    type: Boolean,
    default: false,
  },
});

// Middleware to generate serial number before saving a new product
productSchema.pre("save", async function (next) {
  try {
    if (!this.isNew) {
      return next();
    }

    // Generate the serial number based on a prefix and auto-incrementing counter
    const prefix = "MED12345";
    const counter = (await mongoose.model("Product").countDocuments()) + 1;
    const paddedCounter = counter.toString().padStart(3, "0");
    this.serialNumber = `${prefix}-${paddedCounter}`;

    next();
  } catch (error) {
    next(error);
    e;
  }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
