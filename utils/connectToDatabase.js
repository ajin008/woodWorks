const mongoose = require("mongoose");

const connectToDatabase = () => {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected");
    })
    .catch((error) => {
      console.error("Connection to MongoDB failed:", error);
    });
};

module.exports = connectToDatabase;