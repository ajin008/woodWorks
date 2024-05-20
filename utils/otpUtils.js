// otpUtils.js

const nodemailer = require("nodemailer");

// Creating transporter using SMTP
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "misixty9@gmail.com",
    pass: "fmjtrhgxcuhpqqgt",
  },
});

// Function to generate and send OTP
const sendOTP = async (email) => {
  // Generate a random OTP (e.g., a 6-digit number)
  const otp = Math.floor(100000 + Math.random() * 900000); // Generates a random 6-digit OTP

  // Email content
  const mailOptions = {
    from: "misixty@gmail.com",
    to: email,
    subject: "OTP for Account Verification",
    text: `Your OTP (One-Time Password) for account verification is: ${otp}`,
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    return otp; // Return the generated OTP
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP"); // Handle the error appropriately
  }
};

module.exports = sendOTP; // Export the sendOTP function for use in other modules
