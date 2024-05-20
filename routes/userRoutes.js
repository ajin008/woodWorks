//userRoutes
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireLogin } = require("../middleware/authmiddleware");
const { requireAuth } = require("../middleware/authmiddleware");
const { preventAuthenticatedAccess } = require("../middleware/authmiddleware");
const {
  preventGoogleAuthenticatedAccess,
} = require("../middleware/authmiddleware");
const { checkSession } = require("../middleware/authmiddleware");
const passport = require("passport"); // Import Passport.js
const userProduct = require("../controllers/userProduct");
const { checkUserStatus } = require("../middleware/authmiddleware");
const { checkCartNotEmpty } = require("../middleware/userMIddleware");
const Product = require("../models/productModel");

//landing
router.get(
  "/landingPage",
  preventAuthenticatedAccess,
  preventGoogleAuthenticatedAccess,
  (req, res) => {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    res.render("landingPage.ejs");
  }
);

//login
router.get(
  "/login",
  preventAuthenticatedAccess,
  preventGoogleAuthenticatedAccess,
  (req, res) => {
    res.render("login.ejs");
  }
);
router.post("/login", authController.login);

//signup
router.get(
  "/signup",
  preventAuthenticatedAccess,
  preventGoogleAuthenticatedAccess,
  (req, res) => {
    res.render("signup.ejs");
  }
);
router.post("/signup", authController.signup);

// router.get("/signupOtp", preventAuthenticatedAccess, (req, res) => {
//   res.render("signupOtp");
// });

router.post("/signupOtpUser", authController.signupVerify_otp);

router.post("/signupResendOtp", authController.resendOtp);

// Route for initiating Google OAuth authentication
router.get(
  "/auth/google",
  (req, res, next) => {
    if (req.path === "/signup") {
      req.session.signup = true;
    }
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Route for handling Google OAuth callback
// Route for handling Google OAuth callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login", // Redirect to login page if authentication fails
  }),
  (req, res) => {
    try {
      // Access user details from the authenticated user object provided by Passport
      const { email, googleId, _id } = req.user;
      console.log("/auth/google/callback", _id);
      // Redirect the user to the home page
      // Store the user's email and Google ID in the session
      req.session.email = email;
      req.session.googleId = googleId;
      req.session.user = { _id };

      res.redirect("/home");
    } catch (error) {
      console.error("Error processing Google OAuth callback:", error);
      res.redirect("/login"); // Redirect to login page in case of error
    }
  }
);

// Home
router.get(
  "/home",
  requireAuth,
  requireLogin,
  checkUserStatus,
  async (req, res) => {
    console.log("home is triggering");
    const userId = req.session.user._id;
    // const userId = req.session.user;
    console.log("the user id is :", userId);
    if (userId) {
      console.log("User ID is here:", userId);
    } else {
      console.error("User ID not found in session");
    }
    const products = await Product.find().limit(3);
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");

    res.render("home.ejs", { userId, products });
  }
);

//shop
// router.get("/shop", requireAuth, requireLogin, (req, res) => {
//   res.render("shop");
// });
// Shop page with pagination
router.get(
  "/shop",
  requireAuth,
  requireLogin,
  checkUserStatus,
  userProduct.productList
);
// router.post("/shop", userProduct.productDetails);

//cart
router.get("/cart", requireAuth, requireLogin, checkUserStatus, (req, res) => {
  res.render("cart");
});

//forgetPassword
router.get("/forgetPassword", preventAuthenticatedAccess, (req, res) => {
  res.render("forgetPassword");
});
router.post("/forgotPassword", authController.forgotPassword);

//otp
router.get("/otp", preventAuthenticatedAccess, (req, res) => {
  res.render("otp");
});
router.post("/otp", authController.otpVerification);

//resendOtp
router.get("/resendOTP", authController.showResendForm);
router.post("/resendOtp", (req, res) => {
  const email = req.session.signupData.email; // Get the email from the session
  // Call the function to resend OTP
  authController.resendOtp(req, res, email);
});

//newPassword
router.get("/newPassword", (req, res) => {
  res.render("newPassword");
});
router.post("/newPassword", (req, res) => {
  authController.newPassword(req, res);
});

//aboutUS
router.get("/about", requireAuth, requireLogin, checkUserStatus, (req, res) => {
  const userId = req.session.user._id;
  res.render("about", { userId });
});

//services
router.get(
  "/services",
  requireAuth,
  requireLogin,
  checkUserStatus,
  (req, res) => {
    const userId = req.session.user._id;
    res.render("services", { userId });
  }
);

//blog
router.get("/blog", requireAuth, requireLogin, checkUserStatus, (req, res) => {
  const userId = req.session.user._id;
  res.render("blog", { userId });
});

//contact
router.get(
  "/contact",
  requireAuth,
  requireLogin,
  checkUserStatus,
  (req, res) => {
    const userId = req.session.user._id;
    res.render("contact", { userId });
  }
);

router.get(
  "/thankyou",
  requireAuth,
  requireLogin,
  checkUserStatus,
  (req, res) => {
    res.render("thankyou");
  }
);

//product page
// router.get("/product", requireAuth, requireLogin, (req, res) => {
//   res.render("product");
// });
// Route for displaying product details
// router.get("/product/:productId", checkUserStatus,userProduct.getProductDetails);

// GET route to display product details
router.get(
  "/product/:productId",
  requireAuth,
  requireLogin,
  checkUserStatus,
  userProduct.getProductDetails
);

router.get(
  "/product/:productId/stock",
  checkUserStatus,
  userProduct.showRemainingStock
);

router.get(
  "/userWishlist/:userId",
  checkUserStatus,
  userProduct.userWishlistRendering
);
router.post("/addToWishlist", userProduct.addingToWishList);

router.get(
  "/user-details/:userId",
  checkSession,
  checkUserStatus,
  userProduct.renderUserProfile
);

router.get("/reset-password", userProduct.resetPassword);

router.get(
  "/addAddress/:userId",
  checkUserStatus,
  userProduct.renderAddAddress
);

router.get(
  "/addAddress_1/:userId/:checkout",
  checkUserStatus,
  userProduct.renderAddAddress_1
);

router.post("/add-address/:userId", userProduct.addAddress);

router.post("/add-address_1/:userId", userProduct.addAddress_1);

router.get("/addressEdit/:addressId", checkUserStatus, userProduct.addressEdit);

router.post("/updateAddress/:addressId", userProduct.updateAddress);

router.get(
  "/EditProfile/:userId",
  checkUserStatus,
  userProduct.editUserProfile
);

router.post("/updateProfile/:userId", userProduct.updateProfile);

router.post("/addressRemove/:addressId", userProduct.addressRemove);

router.get("/user-cart/:userId", checkUserStatus, userProduct.userCart); //for rendering cart

router.post("/addToCart", userProduct.addToCart);

router.get("/emptyCartPage", userProduct.renderEmptyCartPage);

router.get("/wallet/:userId", userProduct.renderWallet);

router.post("/update-total-price", userProduct.updateTotalPrice);

router.post("/remove-product", userProduct.removeProduct);

router.post("/update-cartQty", userProduct.updateCartQty);

router.get(
  "/checkout",
  checkUserStatus,
  checkCartNotEmpty,
  userProduct.checkoutCart
);

router.post("/buy", userProduct.checkoutProduct);

router.post("/updateOrder", checkOderType_1, userProduct.orderPlacement_1);

//middleware to check oderType selected
function checkOderType_1(req, res, next) {
  if (!req.body.oderType) {
    req.flash("error", "Please select a payment method.");
    return res.redirect("/shop");
  }
  next();
}

//middleware to check oderType selected
function checkOderType(req, res, next) {
  if (!req.body.oderType) {
    req.flash("error", "Please select a payment method.");
    return res.redirect("/checkout");
  }
  next();
}

router.post("/placeOrder", checkOderType, userProduct.placeOrder);

router.post("/createRazorpayOrder", userProduct.createRazorpayOrder);

router.get(
  "/MyOder_detailsRendering/:userId",
  userProduct.RenderingOder_detail
);
router.get("/order/details/:orderId", userProduct.RenderingViewOrder);

router.post("/orders/rating", userProduct.ratingProduct);

router.get(
  "/deliverd_detailsRendering/:userId",
  userProduct.RenderingDeliveredOder_detail
);

router.post("/Remove_OrderProduct/:orderId", userProduct.Remove_OrderProduct);

router.post("/submit-rating", userProduct.ProductRating);

router.post("/submitReturn", userProduct.submitReturnFunction);

router.post("/cancelReturn", userProduct.cancelReturnFunction);

router.post("/removeFromWishlist", userProduct.removeProductFromWishlist);

router.post("/addToCartFromWishlist", userProduct.addToCartFromWishlist);

router.post("/applyCoupon", userProduct.applyCoupon);

router.post("/applyCoupon_1", userProduct.applyCoupon_1);

router.post("/addMoney", userProduct.addMoney);

router.get("/viewOrder_1/:orderId/:productId", userProduct.viewOrder_1);

router.get("/download-invoice/:orderId", userProduct.downloadInvoice);

router.post("/create-paymentWallet", userProduct.razorPayPaymentWallet);

router.post("/viewTransaction", userProduct.viewTransaction);

//logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.clearCookie("connect.sid");
    res.redirect("/landingPage");
  });
});

module.exports = router;
