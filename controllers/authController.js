//authcontroller.js

require("dotenv").config();
const userData = require("../models/userModel");
const bcrypt = require("bcrypt");
const sendOTP = require("../utils/otpUtils");
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const GoogleUser = require("../models/googleUserModel");
// const GoogleStrategy = require("passport-google-oauth20").Strategy;

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    req.flash("error", "Please enter both email and password");
    return res.redirect("/login");
  }

  try {
    const user = await userData.findOne({ email });

    if (!user) {
      // User with this email doesn't exist
      req.flash("error", "Invalid email");
      return res.redirect("/login");
    }

    // Check if the user is blocked
    if (user.isBlocked) {
      req.flash(
        "error",
        "Your account has been blocked by the admin. Please contact support for assistance."
      );
      return res.redirect("/login");
    }

    // console.log("Stored hashed password:", user.password); // Log stored hashed password

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    // console.log(user.password);
    // console.log("Password match result:", passwordMatch); // Log password match result

    if (!passwordMatch) {
      // Password doesn't match
      req.flash("error", "Invalid password");
      return res.redirect("/login");
    }

    // Both email and password are valid, set session
    req.session.user = user; // Set user data in session
    // const userDetails = req.session.user
    // console.log("the userDetails :",userDetails)
    return res.redirect("/home");
  } catch (error) {
    console.error("Error logging in:", error);
    req.flash("error", "An error occurred while logging in");
    return res.redirect("/login");
  }
};

exports.signup = async (req, res) => {
  try {
    const { FirstName, LastName, phone, email, password } = req.body;

    // Check if any required field is missing
    if (!FirstName || !LastName || !phone || !email || !password) {
      req.flash("error", "Please fill in all fields");
      return res.redirect("/signup");
    }

    // Check if phone number length is exactly 10 digits
    if (phone.length !== 10) {
      req.flash("error", "Phone number should be 10 digits");
      return res.redirect("/signup");
    }

    // Check if user with this email already exists
    const existingUser1 = await userData.findOne({ email });
    if (existingUser1) {
      req.flash("error", "User with this email already exists");
      return res.redirect("/signup");
    }

    // Check if user with this email already exists in Google user collection
    const existingGoogleUser = await GoogleUser.findOne({ email });
    if (existingGoogleUser) {
      req.flash("error", "User with this email already exists");
      return res.redirect("/signup");
    }

    // Check if user with this phone already exists
    const existingUser2 = await userData.findOne({ phone });
    if (existingUser2) {
      req.flash("error", "User with this Phone Number already exists");
      return res.redirect("/signup");
    }

    const otp = await sendOTP(email);
    req.session.signupData = { FirstName, LastName, phone, email, password }; // Store signup data in session
    req.session.signupOTP = otp; // Store OTP in session
    req.session.signupOTPTimestamp = Date.now(); // Store timestamp for OTP expiration

    // Redirect to OTP verification page
    res.render("signupOtp", { email });
  } catch (error) {
    console.log("Error signing up user:", error);
    req.flash("error", "An error occurred while signing up user");
    res.redirect("/signup");
  }
};

exports.signupVerify_otp = async (req, res) => {
  try {
    const otp1 = req.body.otp1;
    const otp2 = req.body.otp2;
    const otp3 = req.body.otp3;
    const otp4 = req.body.otp4;
    const otp5 = req.body.otp5;
    const otp6 = req.body.otp6;
    const email = req.body.email;
    console.log("email", email);
    const otp = otp1 + otp2 + otp3 + otp4 + otp5 + otp6;

    const storedOTP = req.session.signupOTP;
    const timestamp = req.session.signupOTPTimestamp;
    const currentTime = Date.now();
    const timeElapsed = (currentTime - timestamp) / 1000; // Calculate time elapsed in seconds

    console.log("send otp:", otp, "stored otp:", storedOTP);

    const parsedOTP = parseInt(otp, 10); // Convert otp to integer
    const parsedStoredOTP = parseInt(storedOTP, 10); // Convert storedOTP to integer

    if (timeElapsed > 60) {
      // OTP expired
      req.flash("error", "OTP expired. Resending OTP.");

      // Retrieve email from session
      const email = req.session.signupData.email;

      // Resend OTP to the email
      const newOTP = await sendOTP(email); // otp is generated using sendOtp()
      req.session.signupOTP = newOTP; // Store the new OTP in session
      req.session.signupOTPTimestamp = Date.now(); // Update the timestamp
      // Redirect back to the OTP verification page
      return res.render("signupOtp", { email });
    }

    if (parsedOTP === parsedStoredOTP) {
      // OTP verification successful
      const { FirstName, LastName, phone, email, password } =
        req.session.signupData;
      console.log(password);

      // Update the existing document if email exists
      const existingUser = await userData.findOneAndUpdate(
        { email: email },
        {
          $set: {
            FirstName: FirstName,
            LastName: LastName,
            phone: phone,
            password: password, //  password directly from the session data
          },
        },
        { new: true }
      );

      if (existingUser) {
        req.flash("success", "Account updated successfully!");
        return res.redirect("/login"); // Redirect to home page
      }

      // Create new user if no existing document found
      const newUser = new userData({
        FirstName,
        LastName,
        phone,
        email,
        password: password, // Use the password directly from the session data
      });
      await newUser.save();
      req.flash("success", "Sign up successful! Please log in.");
      return res.redirect("/home"); // Redirect to home page
    } else {
      // Incorrect OTP
      req.flash("error", "Incorrect OTP. Please try again.");
      return res.render("signupOtp", { email });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    req.flash("error", "An error occurred while verifying OTP");
    return res.render("signupOtp", { email });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    // Retrieve the email from the session or wherever it's stored
    const email = req.session.signupData.email;

    // Ensure email is defined
    if (!email) {
      throw new Error("Email not found in session data");
    }

    // Generate a new OTP and send it
    const newOTP = await sendOTP(email);

    // Update the session with the new OTP and timestamp
    req.session.signupOTP = newOTP;
    req.session.signupOTPTimestamp = Date.now();

    // Flash success message
    req.flash("success", "New OTP sent successfully.");

    // Redirect back to the signup OTP page
    return res.redirect("/signupOtp");
  } catch (error) {
    console.error("Error resending OTP:", error);
    req.flash("error", "An error occurred while resending OTP");
    return res.redirect("/signupOtp");
  }
};

exports.forgotPassword = async (req, res) => {
  const { email, phone } = req.body;

  // Check if email and phone are provided
  if (!email || !phone) {
    req.flash("error", "Please enter both email and phone number");
    return res.redirect("/forgetPassword");
  }

  try {
    // Check if user with provided email exists
    const user = await userData.findOne({ email });

    if (!user) {
      // User with this email doesn't exist
      req.flash("error", "No user found with this email");
      return res.redirect("/forgetPassword");
    }

    // Check if provided phone number matches the user's phone number
    if (user.phone !== phone) {
      // Phone number doesn't match
      req.flash("error", "Incorrect phone number");
      return res.redirect("/forgetPassword");
    }

    // If email, phone, and phone number length are correct, generate OTP
    const otp = await sendOTP(email);
    const timestamp = Date.now(); // Store the current timestamp along with the OTP
    req.session.email = email; // Store the email in the session
    req.session.otp = otp; // Store the OTP in the session
    req.session.timestamp = timestamp;

    // Redirect to the OTP page for verification
    return res.redirect("/otp");
  } catch (error) {
    console.error("Error processing forgot password request:", error);
    req.flash("error", "An error occurred while processing your request");
    return res.redirect("/forgetPassword");
  }
};

exports.otpVerification = async (req, res) => {
  const otp1 = req.body.otp1;
  const otp2 = req.body.otp2;
  const otp3 = req.body.otp3;
  const otp4 = req.body.otp4;
  const otp5 = req.body.otp5;
  const otp6 = req.body.otp6;

  const otpCode = otp1 + otp2 + otp3 + otp4 + otp5 + otp6;
  console.log("Entered OTP in forgetPass:", otpCode);

  try {
    const originalOTP = req.session.otp;
    const timestamp = req.session.timestamp;
    const currentTime = Date.now();
    const timeElapsed = (currentTime - timestamp) / 1000; // Calculate time elapsed in seconds

    // Check if OTP has expired (more than 60 seconds)
    if (timeElapsed > 60) {
      // Generate a new OTP
      const newOTP = await sendOTP(req.session.email);
      req.session.otp = newOTP; // Store the new OTP in the session
      req.session.timestamp = Date.now(); // Update the timestamp

      req.flash(
        "error",
        "OTP has expired. A new OTP has been sent to your email."
      );
      return res.redirect("/otp"); // Redirect back to the OTP verification page
    }

    if (otpCode == originalOTP) {
      const email = req.session.email; // Accessing email from session
      res.redirect(`/newPassword?email=${email}`);
    } else {
      req.flash("error", "Invalid OTP. Please try again.");
      res.redirect("/otp");
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    req.flash("error", "An error occurred while verifying OTP");
    res.redirect("/otp");
  }
};

exports.showResendForm = async (req, res) => {
  // Render the resend OTP form page
  res.redirect("/forgetPassword");
};

exports.newPassword = async (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const email = req.session.email; // Get email from session

  try {
    // Check if new password matches confirm password
    if (newPassword === confirmPassword) {
      // Hash the new password with salt rounds
      const saltRounds = 10; // Number of salt rounds
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update the user's password in the database
      await userData.findOneAndUpdate({ email }, { password: hashedPassword });

      // Redirect the user to the login page
      req.flash(
        "success",
        "Password updated successfully. Please log in with your new password."
      );
      res.redirect("/login");
    } else {
      // Passwords don't match
      req.flash("error", "Passwords do not match");
      res.redirect("/newPassword");
    }
  } catch (error) {
    console.error("Error updating password:", error);
    req.flash("error", "An error occurred while updating your password");
    res.redirect("/newPassword");
  }
};

//Define Google OAuth strategy

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log("Reached Google OAuth strategy");

        const existingUserByEmail = await userData.findOne({
          email: profile.emails[0].value,
        });
        if (existingUserByEmail) {
          console.log("Email already taken:", profile.emails[0].value);
          req.flash(
            "error",
            "Email already exists. Please use a different email."
          );
          return done(null, false, { message: "Email is already registered" });
        }
        // Find or create a user based on their Google ID
        let user = await GoogleUser.findOne({ googleId: profile.id });

        if (!user) {
          // If the user doesn't exist, create a new one
          user = new GoogleUser({
            googleId: profile.id,
            FirstName: profile.name.givenName,
            LastName: profile.name.familyName,
            email: profile.emails[0].value,
          });
          await user.save();
          console.log("New Google user created:", user);
        } else {
          console.log("Existing Google user found:", user);
        }

        // Set the user session
        req.session.user = user; // user session

        return done(null, user);
      } catch (error) {
        console.error("Error in Google OAuth strategy:", error);
        return done(error);
      }
    }
  )
);

// Routes for Google OAuth authentication
exports.googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
});

exports.googleCallback = (req, res) => {
  console.log("Google callback function executed");
  console.log("Redirecting to /home after successful authentication");
  console.log("User:", req.session.user);
  return res.redirect("/home"); // Redirect to home after successful authentication
};
