const mongoose = require("mongoose");

// Define schema
const myOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming you have a User schema for storing user information
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
    },
    landmark: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    orderTotal: {
      type: Number,
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    oderType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Processing", "Shipped", "Delivered"],
      default: "Processing",
    },
    deliveryDateTime: {
      type: Date,
      required: false,
    },
    rating: {
      type: Number,
      default: 0,
    },
    returnStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    discountedPrice: {
      type: Number,
      required: true,
    },
    payment: {
      type: String,
      default: "pending",
    },
    couponId: {
      type: String,
      default: "no coupon applied",
    },
    deliveryCharge: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Create model
const MyOrder = mongoose.model("MyOrder", myOrderSchema);

module.exports = MyOrder;
