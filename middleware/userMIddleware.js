const Cart = require("../models/cartSchema");

exports.checkCartNotEmpty = async (req, res, next) => {
  try {
    // Retrieve the user's ID
    const userId = req.session.user._id;

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });

    // Check if the cart exists and if it contains any items
    if (!cart || cart.items.length === 0) {
      // If the cart is empty, redirect the user to the cart page
      return res.redirect("/home");
    }

    // If the cart is not empty, proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error checking cart:", error);
    res.status(500).send("Internal Server Error");
  }
};
