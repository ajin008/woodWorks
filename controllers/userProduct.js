require("dotenv").config();
const Product = require("../models/productModel");
const userData = require("../models/userModel");
const GoogleUser = require("../models/googleUserModel");
const {
  UserDataAddress,
  GoogleUserAddress,
} = require("../models/Address schema");
const Cart = require("../models/cartSchema");
const Category = require("../models/categoryModel");
const Wishlist = require("../models/wishListSchema");
const Coupon = require("../models/couponModel");
const UsedCoupon = require("../models/UsedCouponModel");
const MyOrder = require("../models/OrderSchema");
const razorpay = require("razorpay");
const Wallet = require("../models/walletModel");
const { ErrorCode } = require("../utils/enums");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const Payment = require("../models/payment schema");

const path = require("path");
const { promisify } = require("util");
const mongoose = require("mongoose");

// exports.productDetails = (req, res) => {
//   res.render("product");
// };

// pagination logic products page with the fetched products.
// pagination logic products page with the fetched products.
// pagination logic products page with the fetched products.
// exports.productList = async (req, res) => {
//   try {
//     // Pagination variables
//     const page = parseInt(req.query.page) || 1; // Current page number
//     const limit = 12; // Number of products per page

//     // Calculate the starting index of products for the current page
//     const startIndex = (page - 1) * limit;

//     // Fetch products from the database with pagination
//     const products = await Product.find({ isListed: true })
//       .skip(startIndex)
//       .limit(limit);
//     // console.log("the data is :",products)

//     // Count total number of listed products
//     const totalProducts = await Product.countDocuments({ isListed: true });
//     const userId = req.session.user._id;
//     console.log("the user id in shop:", userId);
//     // Calculate total number of pages
//     const totalPages = Math.ceil(totalProducts / limit);

//     // Render the shop page with product data
//     res.render("shop", {
//       products,
//       currentPage: page,
//       totalPages,
//       userId,
//     });
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     req.flash("error", "An error occurred while fetching products");
//     res.redirect("/shop");
//   }
// };

exports.productList = async (req, res) => {
  try {
    console.log("the shop page is triggering");
    const userId = req.session.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const sortOption = req.query.sort || "lowToHigh";
    const searchQuery = req.query.search || "";
    const category = req.query.category || null;
    const color = req.query.color || null;
    const newArrivals = req.query.newArrivals === "true";
    const ratingFilter = req.query.rating ? parseInt(req.query.rating) : null;
    const alphabeticalSortOption = req.query.alphabeticalSort || "default";

    const startIndex = (page - 1) * limit;
    let sortCriteria = {};

    if (sortOption === "highToLow") {
      sortCriteria.offerPrice = -1;
    } else {
      sortCriteria.offerPrice = 1;
    }

    if (alphabeticalSortOption === "asc") {
      sortCriteria.name = 1;
    } else if (alphabeticalSortOption === "desc") {
      sortCriteria.name = -1;
    }

    // Ensure to log the filter criteria for debugging
    console.log("Category:", category);
    console.log("Color:", color);
    console.log("Alphabetical Sort Option:", alphabeticalSortOption);
    console.log("Sort Criteria:", sortCriteria);

    // Filtering criteria
    const filter = {
      isListed: true,
      name: { $regex: searchQuery, $options: "i" },
    };

    if (category) {
      filter.category = category;
    }
    if (color) {
      filter.color = color;
    }
    if (newArrivals) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filter.createdAt = { $gte: sevenDaysAgo };
    }
    if (ratingFilter !== null && ratingFilter >= 1 && ratingFilter <= 5) {
      filter.rating = ratingFilter;
    }

    // Fetch products with pagination, filtering, and sorting
    const products = await Product.find(filter)
      .sort(sortCriteria)
      .skip(startIndex)
      .limit(limit);

    // Count total products for pagination
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);
    const categories = await Category.find();

    // const wishlistProducts = await Wishlist.find(
    //   { user: userId },
    //   { product: 1 }
    // );

    // const wishlistProductIds = wishlistProducts.map((wishlist) =>
    //   wishlist.product.toString()
    // );

    // products = products.map((product) => {
    //   if (wishlistProductIds.includes(product._id.toString())) {
    //     product.isInWishlist = true;
    //   }
    //   return product;
    // });

    const ratings = products.map((product) => product.rating);

    // Render the shop page
    res.render("shop", {
      products,
      ratings,
      currentPage: page,
      totalPages,
      userId,
      sortOption: req.query.sort,
      categories,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    req.flash("error", "An error occurred while fetching products");
    res.redirect("/shop");
  }
};

// showing product details
exports.getProductDetails = async (req, res) => {
  try {
    console.log("product details is triggering");
    const productId = req.params.productId;
    // console.log("Product ID:", productId);

    // Fetch the product details from the database based on the product ID
    const product = await Product.findOne({ _id: productId });

    if (!product) {
      // Handle case where product with the given ID is not found
      return res.status(404).send("Product not found");
    }

    const userId = req.session.user._id;

    req.session.tempProductId = productId;

    // Calculate total savings
    const totalSaving = product.actualPrice - product.offerPrice;

    const similarProducts = await Product.find({
      category: product.category,
      _id: { $ne: productId },
    }).limit(4);

    console.log("Product Images:", product.images);

    res.render("product", {
      product,
      totalSaving,
      userId,
      similarProducts,
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    req.flash("error", "An error occurred while fetching product details");
    res.redirect("/shop");
  }
};

exports.showRemainingStock = async (req, res) => {
  try {
    const productId = req.params.productId;
    console.log("Triggering stock update for product ID:", productId);

    // Fetch the product details from the database based on the product ID
    const product = await Product.findOne({ _id: productId });
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Fetch ordered quantity for the product from MyOrder database
    const orderedQuantityResult = await MyOrder.find({ productId: productId });
    const orderedQuantity = orderedQuantityResult.reduce(
      (total, order) => total + order.quantity,
      0
    );

    // Calculate remaining stock quantity
    const remainingStock = product.qty - orderedQuantity;

    res.json({ remainingStock });
  } catch (error) {
    console.error("Error fetching stock quantity:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.addingToWishList = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { productId } = req.body;

    // Check if the product already exists in the user's wishlist
    const existingWishlistItem = await Wishlist.findOne({
      userId: userId,
      productId: productId,
    });

    if (existingWishlistItem) {
      return res
        .status(400)
        .json({ error: "Product already exists in wishlist" });
    }

    // If the product doesn't exist in the wishlist, create a new wishlist item
    const wishlistItem = new Wishlist({
      userId: userId,
      productId: productId,
    });

    // Save the wishlist item to the database
    await wishlistItem.save();

    res.status(200).json({ message: "Product added to wishlist successfully" });
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.userWishlistRendering = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Retrieve wishlist items associated with the user
    const wishlistItems = await Wishlist.find({ userId: userId }).populate({
      path: "productId",
      select: "name description offerPrice actualPrice qty images",
    });

    res.render("wishlist", { wishlistItems: wishlistItems, userId: userId });
  } catch (error) {
    console.error("Error retrieving wishlist items:", error);
    res.status(500).send("Internal Server Error");
  }
};

// exports.renderUserProfile = async (req, res) => {
//   try {
//     // Get the user ID from the request parameters
//     const userId = req.params.userId;

//     // Fetch user details from the database based on the user ID
//     const user = await userData.findById(userId);

//     if (!user) {
//       // If user is not found, return an error response
//       return res.status(404).send("User not found");
//     }

//     // Render the userProfile EJS template with the user details
//     res.render("userProfile", { user, userId });
//   } catch (error) {
//     console.error("Error fetching user details:", error);
//     // Handle errors and redirect to an error page or display a flash message
//     res.status(500).send("An error occurred while fetching user details");
//   }
// };

// exports.renderUserProfile = async (req, res) => {
//   try {
//     // Get the user ID from the request parameters
//     const userId = req.params.userId;

//     // Fetch user details from the UserData or GoogleUser model based on the user ID
//     let user = await userData.findById(userId);

//     if (!user) {
//       user = await GoogleUser.findById(userId);
//       console.log("GoogleUser found:", user);
//     }

//     if (!user) {
//       // If user is not found, return an error response
//       return res.status(404).send("User not found");
//     }

//     // Fetch address details from either UserDataAddress or GoogleUserAddress based on the user ID
//     let addressModel;
//     if (user instanceof userData) {
//       addressModel = UserDataAddress;
//     } else if (user instanceof GoogleUser) {
//       addressModel = GoogleUserAddress;
//     } else {
//       // Handle the case if the user is neither UserData nor GoogleUser
//       return res.status(404).send("User not found");
//     }

//     // Fetch all address details for the user
//     const addresses = await addressModel.find({ userId });

//     // Assign the address details to the user object
//     user.addresses = addresses;
//     console.log("user address is this:", user.addresses);

//     // Render the userProfile EJS template with the user details including address
//     res.render("userProfile", { user, userId });
//   } catch (error) {
//     console.error("Error fetching user details:", error);
//     // Handle errors and redirect to an error page or display a flash message
//     res.status(500).send("An error occurred while fetching user details");
//   }
// };

exports.renderUserProfile = async (req, res) => {
  try {
    console.log("renderUserProfile is triggering");
    const userId = req.params.userId;
    console.log("Received user ID:", userId);

    // Fetch user details from the UserData or GoogleUser model based on the user ID
    let user = await userData.findById(userId);

    if (!user) {
      user = await GoogleUser.findById(userId);
      console.log("GoogleUser found:", user);
    }

    if (!user) {
      // If user is not found, return an error response
      console.log("User not found");
      return res.status(404).send("User not found");
    }

    // Fetch address details from either UserDataAddress or GoogleUserAddress based on the user ID
    let addressModel;
    if (user instanceof userData) {
      addressModel = UserDataAddress;
    } else if (user instanceof GoogleUser) {
      addressModel = GoogleUserAddress;
    } else {
      // Handle the case if the user is neither UserData nor GoogleUser
      console.log("User is neither instance of userData nor GoogleUser");
      return res.status(404).send("User not found");
    }

    console.log("Using address model:", addressModel.modelName);

    // Fetch all address details for the user
    const addresses = await addressModel.find({ userId: user._id });
    console.log("Fetched addresses:", addresses);

    // Assign the address details to the user object
    user.addresses = addresses;

    console.log("User object:", user);

    console.log("first name:", user.FirstName);
    console.log("last name:", user.LastName);
    console.log("email:", user.email);

    // Render the userProfile EJS template with the user details including address
    res.render("userProfile", { user, userId });
  } catch (error) {
    console.error("Error fetching user details:", error);
    // Handle errors and redirect to an error page or display a flash message
    res.status(500).send("An error occurred while fetching user details");
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // Destroy the session after resetting the password
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
      res.clearCookie("connect.sid"); // Clear the session cookie
      res.redirect("/forgetPassword"); // Redirect to a non-sensitive page
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    req.flash("error", "An error occurred while resetting your password");
    res.redirect("/reset-password"); // Redirect to reset password page
  }
};

exports.renderAddAddress = async (req, res) => {
  try {
    const productId = req.query.productId;
    const userId = req.session.user._id;
    const sourcePage = req.query.sourcePage;
    console.log("Product ID:", productId);
    console.log("this is :", userId);
    console.log("this is sourcePage", sourcePage);
    res.render("addAddress", { userId, sourcePage, productId });
  } catch (error) {
    console.error("Error rendering add address page:", error);
    res.status(500).send("An error occurred while rendering add address page");
  }
};

//render second address form
exports.renderAddAddress_1 = async (req, res) => {
  try {
    console.log("renderAddress_1 is triggering");
    const checkout = req.params.checkout;
    console.log("checkout:", checkout);
    const userId = req.session.user._id;
    console.log("this is :", userId);
    res.render("addAddress_1", { userId, checkout });
  } catch (error) {
    console.error("Error rendering add address page:", error);
    res.status(500).send("An error occurred while rendering add address page");
  }
};

exports.addAddress = async (req, res) => {
  const productId = req.body.productId;
  const userId = req.params.userId; // Retrieve userId from route parameter
  const sourcePage = req.body.sourcePage;
  console.log("sourcePage final", sourcePage);
  console.log("the product id final", productId);
  const {
    address,
    street,
    city,
    state,
    postalCode,
    landmark,
    houseNumber,
    type,
  } = req.body;

  try {
    let AddressModel;

    // Check if the userId exists in either UserData or GoogleUser
    const userDataExists = await userData.exists({ _id: userId });
    const googleUserExists = await GoogleUser.exists({ _id: userId });

    if (userDataExists) {
      AddressModel = UserDataAddress;
    } else if (googleUserExists) {
      AddressModel = GoogleUserAddress;
    } else {
      // If userId does not exist in either UserData or GoogleUser, default to GoogleUserAddress
      AddressModel = GoogleUserAddress;
    }

    // Create a new address instance
    const newAddress = new AddressModel({
      userId,
      address,
      street,
      city,
      state,
      postalCode,
      landmark,
      houseNumber,
      type,
    });

    // Save the new address to the database
    await newAddress.save();

    let redirectUrl = "/home";
    if (sourcePage === "checkoutPage") {
      redirectUrl = "/product/${productId}`"; //  the actual checkout page URL
    }
    if (sourcePage === "checkoutPage_org") {
      redirectUrl = "/checkout";
    }

    res.redirect(redirectUrl);
    // res.redirect("/user-details/:userId")
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).send("An error occurred while adding address");
  }
};

exports.addAddress_1 = async (req, res) => {
  console.log("addAddress_1 is triggering");
  const productId = req.session.tempProductId;
  const { userId } = req.params; // Assuming userId is passed as a route parameter
  console.log("address user id", userId);
  const {
    address,
    street,
    city,
    state,
    postalCode,
    landmark,
    houseNumber,
    type,
    checkout,
  } = req.body;

  try {
    let AddressModel;

    // Check if the userId exists in either UserData or GoogleUser
    const userDataExists = await userData.exists({ _id: userId });
    const googleUserExists = await GoogleUser.exists({ _id: userId });

    if (userDataExists) {
      AddressModel = UserDataAddress;
    } else if (googleUserExists) {
      AddressModel = GoogleUserAddress;
    } else {
      // If userId does not exist in either UserData or GoogleUser, default to GoogleUserAddress
      AddressModel = GoogleUserAddress;
    }

    // Create a new address instance
    const newAddress = new AddressModel({
      userId,
      address,
      street,
      city,
      state,
      postalCode,
      landmark,
      houseNumber,
      type,
    });

    // Save the new address to the database
    await newAddress.save();

    if (checkout === "checkout") {
      res.redirect("/checkout");
    } else {
      res.redirect(`/product/${productId}`);
    }

    // res.redirect(`/user-cart/${userId}`);
    // res.redirect("/user-details/:userId")
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).send("An error occurred while adding address");
  }
};

exports.addressEdit = async (req, res) => {
  try {
    // Extract the address ID from the request parameters
    const addressId = req.params.addressId;

    let address;

    // First, try to find the address in UserDataAddress
    address = await UserDataAddress.findById(addressId);

    // If address is not found in UserDataAddress, try finding it in GoogleUserAddress
    if (!address) {
      address = await GoogleUserAddress.findById(addressId);
    }

    if (!address) {
      // If address is not found in either model, return an error response
      return res.status(404).send("Address not found");
    }

    // Render the address edit page with the address details
    res.render("addressEdit", { address });
  } catch (error) {
    console.error("Error fetching address details:", error);
    // Handle errors and redirect to an error page or display a flash message
    res.status(500).send("An error occurred while fetching address details");
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    // Extract the address ID from the request parameters
    const addressId = req.params.addressId;

    // Check if the address exists in UserDataAddress
    let address = await UserDataAddress.findById(addressId);

    // If the address is not found in UserDataAddress, check GoogleUserAddress
    if (!address) {
      address = await GoogleUserAddress.findById(addressId);
    }

    // If address is still not found, return an error
    if (!address) {
      return res.status(404).send("Address not found");
    }

    // Update the address data with the new values from the request body
    Object.assign(address, req.body);

    // Save the updated address
    await address.save();

    // Redirect the user to the user profile page or any other appropriate page
    res.redirect(`/user-details/${userId}`);
  } catch (error) {
    console.error("Error updating address:", error);
    // Handle errors and redirect to an error page or display a flash message
    res.status(500).send("An error occurred while updating the address");
  }
};

exports.editUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;

    let user;

    // First, try to find the user in userData
    user = await userData.findById(userId);

    // If the user is not found in userData, try finding it in GoogleUser
    if (!user) {
      user = await GoogleUser.findById(userId);
    }

    if (!user) {
      // If user is still not found, return an error
      return res.status(404).send("User not found");
    }
    // console.log("user details:", user);

    // Render the edit profile page with the user details
    res.render("editProfile", { user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    // Handle errors and redirect to an error page or display a flash message
    res.status(500).send("An error occurred while fetching user details");
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.userId;

    let user;

    // First, try to find the user in userData
    user = await userData.findById(userId);

    // If user is not found in userData, try finding it in GoogleUser
    if (!user) {
      user = await GoogleUser.findById(userId);
    }

    // If user is still not found, return an error
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Update the user data with the new values from the request body
    Object.assign(user, req.body);

    // Save the updated user
    await user.save();

    // Redirect the user to the profile page or any other appropriate page
    res.redirect(`/user-details/${userId}`);
  } catch (error) {
    console.error("Error updating profile:", error);
    // Handle errors and redirect to an error page or display a flash message
    res.status(500).send("An error occurred while updating the profile");
  }
};

exports.addressRemove = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const addressId = req.params.addressId;

    // Check if the address ID exists in UserDataAddress
    let address = await UserDataAddress.findById(addressId);
    if (address) {
      // If the address ID belongs to UserDataAddress, remove it
      await address.deleteOne();
      return res.redirect(`/user-details/${userId}`);
    }

    // If the address ID does not exist in UserDataAddress, check GoogleUserAddress
    address = await GoogleUserAddress.findById(addressId);
    if (address) {
      // If the address ID belongs to GoogleUserAddress, remove it
      await address.deleteOne();
      return res.redirect(`/user-details/${userId}`);
    }

    // If the address ID does not exist in either schema, return an error
    return res.status(404).send("Address not found");
  } catch (error) {
    console.error("Error removing address:", error);
    res.status(500).send("Internal Server Error");
  }
};

// exports.addToCart = async (req, res) => {
//   try {
//     // Retrieve the product ID from the URL parameters
//     const productId = req.body.productId;
//     // console.log("product id is :",productId)

//     // Find the product by ID
//     const product = await Product.findById(productId);

//     if (!product) {
//       return res.status(404).send("Product not found");
//     }

//     // Assume the user is authenticated and their user ID is available in req.session.user._id
//     const userId = req.session.user._id;

//     // Determine the type of user (regular user or Google user)
//     let cart;

//     // Check if the user is a regular user
//     const user_Data = await userData.findById(userId);
//     if (user_Data) {
//       // Find the user's cart or create a new cart if it doesn't exist
//       cart = await Cart.findOne({ user: userId });
//     } else {
//       // Check if the user is a Google user
//       const googleUser = await GoogleUser.findById(userId);
//       if (googleUser) {
//         // Find the user's cart or create a new cart if it doesn't exist
//         cart = await Cart.findOne({ googleUser: userId });
//       } else {
//         // If the user is neither a regular user nor a Google user, handle the error
//         return res.status(404).send("User not found");
//       }
//     }

//     if (!cart) {
//       cart = new Cart({ user: userId, googleUser: userId, items: [] });
//     }

//     // Check if the product already exists in the cart
//     const existingProduct = cart.items.find((item) =>
//       item.productId.equals(productId)
//     );

//     if (existingProduct) {
//       // If the product already exists in the cart, increase its quantity
//       existingProduct.quantity += 1;
//     } else {
//       // If the product doesn't exist in the cart, add it to the cart
//       cart.items.push({ productId, quantity: 1 });
//     }

//     // Save the updated cart
//     await cart.save();

//     res.redirect("/shop"); // Redirect the user to the cart page
//   } catch (error) {
//     console.error("Error adding product to cart:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.addToCart = async (req, res) => {
  try {
    // Retrieve the product ID from the request body
    const productId = req.body.productId;
    // Retrieve the user's ID
    const userId = req.session.user._id;

    // Find the product by ID
    const product = await Product.findById(productId);

    if (!product) {
      req.flash("error", "Product not found");
      return res.status(404).send("Product not found");
    }

    if (product.qty < 1) {
      req.flash("error", "Product is out of stock");
      return res.status(400).json({ error: "Product is out of stock" });
    }

    // Find the user's cart or create a new cart if it doesn't exist
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // If the cart doesn't exist, create a new one
      cart = new Cart({ user: userId, items: [] });
    }

    // Check if the product already exists in the cart
    const existingItemIndex = cart.items.findIndex((item) =>
      item.productId.equals(productId)
    );

    if (existingItemIndex !== -1) {
      const existingQuantity = cart.items[existingItemIndex].quantity;

      if (existingQuantity >= 5) {
        req.flash(
          "error",
          "Cannot add more than 5 of the same product to the cart"
        );
        return res.status(400).json({ error: req.flash("error") });
      }
      // If the product already exists in the cart, increase its quantity
      cart.items[existingItemIndex].quantity += 1;
    } else {
      // If the product doesn't exist in the cart, add it to the cart
      cart.items.push({ productId, quantity: 1 });
    }

    // Save the updated cart
    await cart.save();

    req.flash("success", "Product added to cart successfully");
    // res.redirect("/shop");
    res.status(200).json({ success: req.flash("success") });
  } catch (error) {
    console.error("Error adding product to cart:", error);
    req.flash("error", "Internal Server Error");
    res.status(500).send("Internal Server Error");
  }
};

exports.userCart = async (req, res, next) => {
  try {
    // throw new Error("Testing error handling");
    console.log("the user cart is triggering ");
    const userId = req.params.userId;
    console.log("user id in UserCart:", userId);
    const cartData = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );
    if (!cartData) {
      res.redirect("/emptyCartPage");
    }
    res.render("cart", { cartData, userId });
  } catch (error) {
    console.error("Error fetching user cart:", error);
    error.code = ErrorCode.USER_NOT_FOUND;
    next(error);
  }
};

exports.renderEmptyCartPage = async (req, res) => {
  try {
    res.render("EmptyCartPage");
  } catch (error) {
    console.error("Error fetching user cart:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.renderWallet = async (req, res) => {
  try {
    console.log("wallet is triggering");
    const userId = req.params.userId;

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
      await wallet.save();
    }

    const walletBalance = wallet.balance;

    res.render("wallet", { userId, walletBalance });
  } catch (error) {
    console.error("Error fetching user wallet:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateTotalPrice = async (req, res) => {
  try {
    console.log("trigering");
    // Extract productId and quantity from the request body
    const { productId, quantity } = req.body;

    // Fetch the product from the database
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
      0;
    }

    // Calculate the total price based on the product price and quantity
    const totalPrice = product.offerPrice * quantity; // Assuming price is stored in 'price' field of product model
    console.log("the price is :", totalPrice);
    //end the updated total price back to the client
    res.json({ totalPrice });
  } catch (error) {
    console.error("Error updating total price:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.removeProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    console.log("Remove product is triggering", productId);

    const result = await Cart.findOneAndUpdate(
      { "items.productId": productId },
      { $pull: { items: { productId: productId } } },
      { new: true }
    );

    if (result) {
      console.log("Product removed from cart successfully");
      res
        .status(200)
        .json({ message: "Product removed from cart successfully" });
    } else {
      console.log("Product not found in the cart");
      res.status(404).json({ error: "Product not found in the cart" });
    }
  } catch (error) {
    console.error("Error removing product from cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.updateCartQty = async (req, res) => {
  try {
    const { quantities } = req.body;

    // Loop through each product in the cart and update its quantity
    for (const productId in quantities) {
      const quantity = quantities[productId];
      await Cart.updateOne(
        { "items.productId": productId },
        { $set: { "items.$.quantity": quantity } }
      );
    }

    res.status(200).json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.checkoutCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    console.log("checkoutRendering user id:", userId);

    let walletBalance = 0;
    const wallet = await Wallet.findOne({ userId });
    if (wallet) {
      walletBalance = wallet.balance;
    }

    let user;
    let addresses;

    // Check if user exists in userData
    user = await userData.findById(userId);

    if (!user) {
      // User not found in userData, check GoogleUser
      user = await GoogleUser.findById(userId);
      addresses = await GoogleUserAddress.find({ userId });
    } else {
      // User found in userData, fetch addresses from UserDataAddress
      addresses = await UserDataAddress.find({ userId });
      // if (!addresses.length) {
      //   const comingFrom = "checkout";
      //   return res.redirect(`/addAddress_1/${userId}/${comingFrom}`);
      // }
    }

    if (!addresses.length) {
      const comingFrom = "checkout";
      return res.redirect(`/addAddress_1/${userId}/${comingFrom}`);
    }

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );
    console.log("Populated cart items:", cart.items);

    // Calculate order total
    let orderTotal = 0;
    for (const item of cart.items) {
      let stock = item.productId.qty;
      let pName = item.productId.name;

      if (stock <= 0) {
        console.log("stock is triggering");
        req.flash("error", `${pName} is out of stock`);
        return res.redirect(`/user-cart/${userId}`);
      }
      orderTotal += item.productId.offerPrice * item.quantity;
    }

    console.log(orderTotal);

    const deliveryCharge = 59;
    const totalAmountWithDeliveryCharge = orderTotal + deliveryCharge;

    // Select the first address as primary address
    // const primaryAddress = addresses[0];

    const productNames = cart.items.map((item) => item.productId.productName);
    let discountAmount = 0;
    // Render the checkout page with user details and the primary address
    res.render("checkout", {
      userId: userId,
      user: user,
      addresses: addresses, // Sending the primary address to the client side
      cartItems: cart.items,
      orderTotal: totalAmountWithDeliveryCharge,
      productNames: productNames,
      walletBalance: walletBalance,
      discountAmount: discountAmount,
      deliveryCharge,
    });
  } catch (error) {
    console.error("Error fetching user details for checkout:", error);
    req.flash(
      "error",
      "An error occurred while fetching user details for checkout"
    );
    res.redirect("/home");
  }
};

// const ProductQuantity = require("../models/qtySchema")

// exports.ProductQuantity_upload = async (req, res) => {
//   try {
//     const { productId, qty } = req.body;

//     // Create a new instance of ProductQuantity model
//     const newProductQuantity = new ProductQuantity({
//       productId: productId,
//       qty: qty
//     });

//     // Save the new product quantity entry to the database
//     await newProductQuantity.save();

//     // If needed, you can also send a success response
//     res.status(200).json({ message: 'Product quantity saved successfully' });
//   } catch (error) {
//     console.error("Error saving product quantity:", error);
//     res.status(500).json({ error: 'An error occurred while saving product quantity' });
//   }
// };

exports.checkoutProduct = async (req, res, next) => {
  try {
    console.log("checkoutProduct_1 triggering");
    const { productId, qty } = req.body;

    // Fetch user details and address data
    const userId = req.session.user._id;
    console.log("checkoutProduct user id:", userId);

    let user;
    let addresses;
    let walletBalance = 0;
    const wallet = await Wallet.findOne({ userId });

    if (wallet) {
      walletBalance = wallet.balance;
    }

    // Check if user exists in userData
    user = await userData.findById(userId);

    if (!user) {
      // User not found in userData, check GoogleUser
      user = await GoogleUser.findById(userId);
      addresses = await GoogleUserAddress.find({ userId });
    } else {
      // User found in userData, fetch addresses from UserDataAddress
      addresses = await UserDataAddress.find({ userId });
    }
    if (!addresses.length) {
      const comingFrom = "product";
      return res.redirect(`/addAddress_1/${userId}/${comingFrom}`);
    }

    // Calculate order total
    const product = await Product.findById(productId);

    if (!product) {
      // If product not found, handle the error
      throw new Error("Product not found");
    }

    if (product.qty < qty) {
      // If quantity is less than 1, redirect back to the same page
      req.flash("error", "out of stock");
      return res.redirect(`/product/${productId}`);
    }

    // Calculate order total
    const orderTotal = product.offerPrice * qty;

    const deliveryCharge = 59;

    const totalAmountWithDeliveryCharge = orderTotal + deliveryCharge;

    let discountAmount = 0;

    res.render("checkout_1", {
      userId: userId,
      user: user,
      addresses: addresses,
      productName: product.name,
      offerPrice: product.offerPrice,
      quantity: qty,
      orderTotal: totalAmountWithDeliveryCharge,
      productId,
      walletBalance,
      discountAmount,
      deliveryCharge,
    });
  } catch (error) {
    console.error("Error fetching user details for checkout:", error);
    next(error);
  }
};

exports.orderPlacement_1 = async (req, res, next) => {
  try {
    console.log("orderPlacement_1 is triggering");
    const userId = req.session.user._id;
    const {
      FirstName,
      LastName,
      c_email_address,
      phone,
      productName,
      quantity,
      orderTotal,
      oderType,
      productId,
      selectedAddressIndex,
      couponId,
      deliveryCharge,
    } = req.body;
    console.log("order total:", orderTotal);
    console.log("coupon id:", couponId);
    console.log("deliveryCharge", deliveryCharge);
    console.log("selected address index:", selectedAddressIndex);

    let selectedAddress;

    // Check if the user exists in userData
    let user = await userData.findById(userId);
    if (user) {
      selectedAddress = await UserDataAddress.findOne({ userId: userId })
        .skip(selectedAddressIndex)
        .limit(1);
    } else {
      // User not found in userData, check GoogleUser
      user = await GoogleUser.findById(userId);
      if (user) {
        selectedAddress = await GoogleUserAddress.findOne({ userId: userId })
          .skip(selectedAddressIndex)
          .limit(1);
      } else {
        throw new Error("User not found");
      }
    }

    if (!selectedAddress) {
      throw new Error("Address not found");
    }

    let payment;

    if (oderType === "wallet") {
      const wallet = await Wallet.findOne({ userId: userId });
      if (wallet) {
        wallet.balance -= orderTotal;
        await wallet.save();
      }
      payment = "Paid";
    }

    if (oderType == "Online Payment") {
      payment = "Paid";
    }

    const newOrder = new MyOrder({
      userId: userId,
      firstName: FirstName,
      lastName: LastName,
      address: selectedAddress.address,
      street: selectedAddress.street,
      landmark: selectedAddress.landmark,
      state: selectedAddress.state,
      postalCode: selectedAddress.postalCode,
      email: c_email_address,
      phone: phone,
      productName: productName,
      quantity: quantity,
      orderTotal: orderTotal,
      productId: productId,
      oderType: oderType,
      discountedPrice: orderTotal,
      payment: payment,
      couponId: couponId,
      deliveryCharge,
    });

    //for checking the already applied coupon
    if (couponId) {
      // Save the used coupon
      console.log("entering to used coupon");
      const newUsedCoupon = new UsedCoupon({
        userId: userId,
        couponId: couponId,
        productId: productId, // Corrected variable name
      });

      await newUsedCoupon.save();
    }

    // Save the new order to the database
    await newOrder.save();

    // Retrieve the product from the database
    const product = await Product.findById(productId);

    // Subtract the quantity ordered from the original quantity
    const remainingQuantity = product.quantity - quantity;

    // Update the remaining quantity of the product in the database
    await Product.findByIdAndUpdate(productId, { quantity: remainingQuantity });

    res.redirect("/thankyou");
  } catch (error) {
    console.error("Error placing order:", error);
    next(error);
  }
};

// exports.placeOrder = async (req, res) => {
//   try {
//     // Extract data from the request body
//     const {
//       FirstName,
//       LastName,
//       address,
//       street,
//       landmark,
//       state,
//       postalCode,
//       c_email_address,
//       phone,
//       orderTotal,
//     } = req.body;

//     // Extract userId from the session
//     const userId = req.session.user._id;

//     console.log("req.body.data:", req.body);

//     const cartItems = req.body.cartItems;

//     cartItems.forEach((item) => {
//       const productId = item.productId;
//       const quantity = item.quantity;
//       const productName = item.productName;
//       const total = item.total;
//       // console.log(
//       //   "Product details 2:",
//       //   productId._id,
//       //   quantity,
//       //   productName,
//       //   total
//       // );
//     });

//     // Create a new instance of MyOrder with the data from the request body
//     const newOrder = new MyOrder({
//       firstName: FirstName,
//       lastName: LastName,
//       address: address,
//       street: street,
//       landmark: landmark,
//       state: state,
//       postalCode: postalCode,
//       email: c_email_address,
//       phone: phone,
//       items: items,
//       userId: userId,
//       orderTotal: orderTotal,
//     });

//     // Save the new order to the database
//     await newOrder.save();

//     // Send a success response
//     res.redirect("/thankyou");
//   } catch (error) {
//     // Handle errors
//     console.error("Error placing order:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to place order. Please try again later.",
//     });
//   }
// };

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

const instance = new razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

exports.createRazorpayOrder = async (req, res) => {
  try {
    console.log("createRazorpayOrder is triggering");
    const options = {
      amount: req.body.orderTotal, // Order amount in paise
      currency: "INR",
    };

    // Create the Razorpay order
    const order = await instance.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};

exports.placeOrder = async (req, res, next) => {
  try {
    console.log("place order is triggering");
    const {
      FirstName,
      LastName,
      email,
      phone,
      cartItems,
      orderTotal,
      oderType,
      selectedAddressIndex,
      discountValueInput,
      discountType,
      couponId,
      deliveryCharge,
    } = req.body;

    const userId = req.session.user._id;

    // console.log("the data from the wallet", req.body);

    // console.log("discountValue:", discountValueInput);
    // console.log("discount type", discountType);
    console.log("order total:", orderTotal);
    // console.log("delivery charge:", deliveryCharge);
    // console.log("coupon id:", couponId);

    let payment;
    if (oderType == "Online Payment") {
      payment = "Paid";
    }

    if (oderType === "wallet") {
      const wallet = await Wallet.findOne({ userId: userId });
      if (wallet) {
        wallet.balance -= orderTotal;
        await wallet.save();
      }
      payment = "Paid";
    }

    let selectedAddress;

    // Check if the user exists in userData
    let user = await userData.findById(userId);
    if (user) {
      selectedAddress = await UserDataAddress.findOne({ userId: userId })
        .skip(selectedAddressIndex)
        .limit(1);
    } else {
      // User not found in userData, check GoogleUser
      user = await GoogleUser.findById(userId);
      if (user) {
        selectedAddress = await GoogleUserAddress.findOne({ userId: userId })
          .skip(selectedAddressIndex)
          .limit(1);
      } else {
        throw new Error("User not found");
      }
    }

    if (!selectedAddress) {
      throw new Error("Address not found");
    }

    let discountedPrice = 0;
    let productID;
    for (const item of cartItems) {
      const { productId, quantity } = item;
      productID = productId;
      try {
        const product = await Product.findById(productId);

        if (!discountType || !discountValueInput) {
          discountedPrice = product.offerPrice;
        } else {
          if (discountType !== "free-shipping") {
            switch (discountType) {
              case "percentage":
                const discountAmount =
                  (discountValueInput / 100) * product.offerPrice;
                discountedPrice = Number(
                  (product.offerPrice - discountAmount).toFixed(2)
                );
                break;
              case "fixed":
                discountedPrice = Number(
                  (product.offerPrice - discountValueInput).toFixed(2)
                );
                break;
              default:
                break;
            }
          } else {
            discountedPrice = product.offerPrice;
          }
        }

        discountedPrice += parseFloat(deliveryCharge);

        // Assign the calculated discounted price to the item
        item.discountedPrice = discountedPrice;
      } catch (error) {
        console.error("Error fetching product:", error);
      }
    }

    // Create a new order for each item in the cart
    const orders = [];
    for (const cartItem of cartItems) {
      const { productId, quantity, productName, discountedPrice } = cartItem;
      console.log("discounted price", discountedPrice);

      // Create a new instance of MyOrder with the selected address and other order details
      const newOrder = new MyOrder({
        userId: userId,
        firstName: FirstName,
        lastName: LastName,
        address: selectedAddress.address,
        street: selectedAddress.street,
        landmark: selectedAddress.landmark,
        state: selectedAddress.state,
        postalCode: selectedAddress.postalCode,
        email: email,
        phone: phone,
        productName: productName,
        quantity: quantity,
        orderTotal: orderTotal,
        productId: productId,
        oderType: oderType,
        discountedPrice: discountedPrice,
        payment: payment,
        couponId: couponId,
        deliveryCharge: deliveryCharge,
      });

      await newOrder.save();
      orders.push(newOrder);
    }

    if (couponId) {
      const newUsedCoupon = new UsedCoupon({
        userId: userId,
        couponId: couponId,
        productId: productID,
      });

      await newUsedCoupon.save();
    }

    // Remove products from the cart after placing the order
    const cart = await Cart.findOne({ user: userId });

    // Remove the products that were ordered from the cart
    cart.items = cart.items.filter((item) => {
      // Check if the product is not in the list of ordered products
      return !orders.some((order) => order.productId.equals(item.productId));
    });
    await cart.save();

    res.redirect("/thankyou");
  } catch (error) {
    console.error("Error placing order:", error);
    next(error);
  }
};

exports.RenderingOder_detail = async (req, res, next) => {
  try {
    // throw new Error("testing");
    const userId = req.params.userId;

    // Fetch orders for the given user from the database excluding those with status "Delivered"
    const orders = await MyOrder.find({
      userId: userId,
      status: { $ne: "Delivered" },
    });

    // Define a function to fetch additional product details for each order
    const populateOrderDetails = async (order) => {
      const product = await Product.findById(order.productId);

      return {
        productName: product.name,
        quantity: order.quantity,
        orderTotal: order.orderTotal,
        description: product.description,
        offerPrice: product.offerPrice,
        orderId: order._id,
        status: order.status,
        discountedPrice: order.discountedPrice,
        productId: product._id,
        imageUrl: product.images[0],
      };
    };

    // Map over the orders array and populate additional product details for each order
    const populatedOrders = await Promise.all(orders.map(populateOrderDetails));

    // Render the OderDetails view and pass the orders data to it
    res.render("OderDetails", { orders: populatedOrders, userId: userId });
  } catch (error) {
    console.error("Error fetching orders:", error);
    next(error);
  }
};

exports.RenderingDeliveredOder_detail = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Find delivered orders for the given userId
    const deliveredOrders = await MyOrder.find({ userId, status: "Delivered" })
      .populate("productId") // Populate product details
      .exec();

    // Array to store order details with formatted deliveryDateTime
    const orderDetails = [];

    // Iterate over each delivered order
    for (const order of deliveredOrders) {
      // Check if order has productId
      if (order.productId) {
        // Format deliveryDateTime
        const formattedDeliveryDateTime = order.deliveryDateTime.toLocaleString(
          "en-US",
          {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }
        );

        const returnEntry = await Return.findOne({ orderId: order._id });

        const isReturn = returnEntry ? returnEntry.isReturn : false;

        const timeDifference = Date.now() - order.deliveryDateTime.getTime();
        const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
        const returnAllowed = daysDifference <= 5;

        const orderDetail = {
          image: order.productId.images[0], // Accessing images property after ensuring productId exists
          name: order.productName,
          deliveryDateTime: formattedDeliveryDateTime,
          productId: order.productId._id,
          orderId: order._id,
          returnStatus: order.returnStatus,
          isReturn: isReturn,
          returnAllowed: returnAllowed,
        };
        console.log("orderID is:=", order._id);

        orderDetails.push(orderDetail);
      }
    }

    res.render("deliveredDetails", {
      orderDetails,
      userId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.ratingProduct = async (req, res) => {
  try {
    const { orderId, productId, rating } = req.body;
    console.log("the data is ", orderId, productId, rating);
    // Update rating for the product
    await Product.findByIdAndUpdate(productId, { $inc: { rating: rating } });

    // Update rating for the order
    // await MyOrder.findByIdAndUpdate(orderId, { rating: rating });

    res
      .status(200)
      .json({ success: true, message: "Rating submitted successfully." });
  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit rating. Please try again later.",
    });
  }
};

exports.Remove_OrderProduct = async (req, res) => {
  try {
    console.log("remove order product is triggering");
    const userId = req.session.user._id;
    const orderId = req.params.orderId;
    console.log("order id:", orderId);

    const order = await MyOrder.findById(orderId);

    if (
      order.oderType === "wallet" ||
      order.oderType === "Online Payment" ||
      order.oderType === "cashOnDelivery"
    ) {
      const discountedPrice = order.discountedPrice;
      const wallet = await Wallet.findOne({ userId: order.userId });
      if (wallet) {
        wallet.balance += discountedPrice;
        wallet.transactions.push({
          type: "deposit",
          amount: discountedPrice,
          description: "Refund from cancel order",
        });
        await wallet.save();
        console.log("Balance updated successfully for user:", order.userId);
      }
    }

    await MyOrder.findByIdAndDelete(orderId);

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      userId,
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel order. Please try again later.",
    });
  }
};

//function for giving rating
exports.ProductRating = async (req, res) => {
  const { rating, productId } = req.body;
  console.log("Received rating:", rating, productId);

  try {
    // Find the product in the database
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update the product's rating
    product.rating = rating;
    // Save the updated product
    await product.save();

    // Respond with a success message
    return res.json({ message: "Rating received successfully" });
  } catch (error) {
    console.error("Error saving rating:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const Return = require("../models/returnSchema");

exports.submitReturnFunction = async (req, res, next) => {
  try {
    console.log("submitReturnFunction is triggering");
    const userId = req.session.user._id;
    const { returnReason, additionalDetails, paymentOption } = req.body;
    console.log("payment option", paymentOption);
    const orderId = req.body.orderId;

    const existingReturn = await Return.findOne({ orderId });

    if (existingReturn) {
      req.flash(
        "error",
        "Return request for this order has already been submitted"
      );

      return res.redirect(`/deliverd_detailsRendering/${userId}`);
    }

    const currentDate = new Date();

    const newReturn = new Return({
      orderId,
      returnReason,
      additionalDetails,
      submittedAt: currentDate,
      isReturn: true,
      paymentOption,
    });

    await newReturn.save();
    req.flash("success", "Return submitted successfully");
    res.redirect(`/deliverd_detailsRendering/${userId}`);
  } catch (error) {
    console.log("Error saving rating:", error);
    next(error);
  }
};

exports.cancelReturnFunction = async (req, res) => {
  try {
    console.log("cancelReturn is triggering");
    const { orderId } = req.body;
    await Return.findOneAndDelete({ orderId });

    await MyOrder.findOneAndUpdate(
      { _id: orderId },
      { returnStatus: "Pending" }
    );

    res.status(200).send("Return order canceled successfully");
  } catch (error) {
    console.error("Error canceling return order:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.removeProductFromWishlist = async (req, res) => {
  try {
    console.log("the function is triggering");
    const productId = req.body.productId;

    const deletedItem = await Wishlist.findOneAndDelete({ productId });

    if (!deletedItem) {
      return res.status(404).json({ message: "wishlist item is not found" });
    }
    res.status(200).json({ message: "Wishlist item removed successfully" });
  } catch (error) {
    console.error("Error canceling return order:", error);
  }
};

exports.addToCartFromWishlist = async (req, res) => {
  try {
    console.log("addToCartFromWishlist is triggering");
    const productId = req.body.productId;
    const userId = req.session.user._id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "product is not found" });
    }

    // Check if the user already has a cart
    const existingCart = await Cart.findOne({ user: userId });

    if (existingCart) {
      const existingItemIndex = existingCart.items.findIndex((item) =>
        item.productId.equals(productId)
      );
      if (existingItemIndex !== -1) {
        existingCart.items[existingItemIndex].quantity += 1;
      } else {
        existingCart.items.push({ productId: productId, quantity: 1 });
      }
      await existingCart.save();
    } else {
      const newCart = new Cart({
        user: userId,
        items: [{ productId: productId, quantity: 1 }],
      });
      await newCart.save();
    }
    const deletedItem = await Wishlist.findOneAndDelete({ productId });

    console.log("the userID data :", userId);
    res.redirect(`/user-cart/${userId}`);
  } catch (error) {
    console.error("Error adding product to cart:", error);
    res.status(500).json({
      error: "An error occurred while adding the product to the cart",
    });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const couponCode = req.body.couponCode;
    console.log("the applyCoupon function is triggering");
    // Retrieve cart data from the database
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.productId"
    );
    let discountAmount = 0;
    // Calculate total price of items in the cart
    let totalPrice = 0;
    for (const item of cart.items) {
      totalPrice += item.productId.offerPrice * item.quantity;
      discountAmount = item.productId.offerPrice;
    }
    console.log("discountAmount:", discountAmount);

    console.log("the coupon code:", couponCode);
    console.log("the total price:", totalPrice);

    // Define discountValue variable
    let discountValue = 0;

    // Apply coupon if provided
    if (couponCode) {
      // Retrieve coupon data from the database based on the coupon code
      const coupon = await Coupon.findOne({ couponCode });
      console.log("coupon data:", coupon);

      if (coupon) {
        const existingUsedCoupon = await UsedCoupon.findOne({
          userId: userId,
          couponId: coupon._id,
        });

        if (existingUsedCoupon) {
          return res.status(400).json({
            valid: false,
            error: "Coupon has already been redeemed by this user",
          });
        }

        if (coupon.couponCode === couponCode) {
          switch (coupon.discountType) {
            case "percentage":
              discountValue = (coupon.discountValue / 100) * totalPrice;
              totalPrice -= discountValue;
              discountAmount -= totalPrice;
              break;
            case "fixed":
              discountValue = coupon.discountValue;
              totalPrice -= discountValue;
              discountAmount -= totalPrice;
              break;
            case "free-shipping":
              return res.json({ message: "Free shipping applied!" });
            default:
              break;
          }
          discountValue = coupon.discountValue;
          discountType = coupon.discountType;

          // Send response with the updated total price and discount value
          return res.json({
            valid: true,
            totalPrice,
            discountValue,
            discountType,
            couponId: coupon._id,
            discountAmount,
          });
        } else {
          return res
            .status(400)
            .json({ valid: false, error: "Invalid coupon code" });
        }
      } else {
        return res
          .status(400)
          .json({ valid: false, error: "Coupon not found" });
      }
    }

    // If no coupon provided, send response with the original total price
    res.json({ valid: true, totalPrice, discountValue });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.applyCoupon_1 = async (req, res) => {
  try {
    console.log("the applyCoupon_1 is triggering");
    const { couponCode, orderTotal } = req.body;
    console.log("coupon code is:", couponCode);
    console.log("order total is:", orderTotal);

    let totalPrice = orderTotal;
    let couponId = null;
    let discountAmount = 0; // Initialize discountAmount here

    if (couponCode) {
      const coupon = await Coupon.findOne({ couponCode });

      if (coupon) {
        couponId = coupon._id;

        const existingUsedCoupon = await UsedCoupon.findOne({
          userId: req.session.user._id,
          couponId: coupon._id,
        });

        if (existingUsedCoupon) {
          return res.status(400).json({
            valid: false,
            error: "Coupon has already been redeemed by this user",
          });
        }

        switch (coupon.discountType) {
          case "percentage":
            totalPrice -= (coupon.discountValue / 100) * orderTotal;
            discountAmount = orderTotal - totalPrice;
            break;
          case "fixed":
            totalPrice -= coupon.discountValue;
            discountAmount = orderTotal - totalPrice;
            break;
          case "free-shipping":
            break;
        }

        // Check if totalPrice becomes negative after applying the coupon
        if (totalPrice < 0) {
          throw new Error("Coupon discount exceeds the order total.");
        }
      } else {
        throw new Error("Coupon not found.");
      }
    }

    res.json({
      totalPrice: totalPrice,
      couponId: couponId,
      discountAmount: discountAmount,
    });
  } catch (error) {
    console.log("error ", error);
    res.status(400).json({ error: error.message });
  }
};

exports.addMoney = async (req, res) => {
  const userId = req.session.user._id;
  await addDefaultAmountToWallet(userId);
  res.redirect("/home");
};

async function addDefaultAmountToWallet(userId) {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      // Create a new wallet if it doesn't exist
      const newWallet = new Wallet({ userId, balance: 5000 });
      await newWallet.save();
    } else {
      // Add 5000 to the existing wallet balance
      wallet.balance += 2000;
      await wallet.save();
    }
    console.log("Default amount added to wallet successfully.");
  } catch (error) {
    console.error("Error adding default amount to wallet:", error);
    throw error;
  }
}

exports.RenderingViewOrder = async (req, res, next) => {
  try {
    // throw new Error("testing");
    const orderId = req.params.orderId;
    const userId = req.session.user._id;
    const order = await MyOrder.findById(orderId);

    const product = await Product.findById(order.productId);
    const productImageUrl = product.images[0];

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("specificOrder", {
      order: order,
      userId,
      productImageUrl: productImageUrl,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.viewOrder_1 = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orderId = req.params.orderId;
    const productId = req.params.productId;

    // const resetResult = await resetBalance(userId);

    const order = await MyOrder.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render("viewIndividual_order", { userId, order, product });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

// const easyinvoice = require("easyinvoice");

const puppeteer = require("puppeteer");

exports.downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await MyOrder.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Read the HTML template file
    const htmlTemplate = fs.readFileSync("invoice_template.html", "utf8");

    // Inject dynamic data into the HTML template
    const htmlContent = injectDataIntoTemplate(htmlTemplate, order);

    const pdfBuffer = await generatePDF(htmlContent);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice_${orderId}.pdf"`
    );

    // Send the generated PDF data
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).send("Internal Server Error");
  }
};

function injectDataIntoTemplate(template, order) {
  // Replace placeholders in the template with actual data
  return template
    .replace("{{firstName}}", order.firstName)
    .replace("{{address}}", order.address)
    .replace("{{phone}}", order.phone)
    .replace("{{email}}", order.email)
    .replace("{{orderId}}", order._id)
    .replace("{{productName1}}", order.productName)
    .replace("{{quantity1}}", order.quantity)
    .replace("{{price1}}", order.discountedPrice)
    .replace("{{deliveryCharge}}", order.deliveryCharge)
    .replace("{{Total}}", order.discountedPrice)
    .replace("{{Subtotal}}", order.discountedPrice)
    .replace("{{deliveryDateTime}}", order.deliveryDateTime);

  // Add more replacements if needed
}

async function generatePDF(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set content to HTML
  await page.setContent(htmlContent);

  // Generate PDF
  const pdfBuffer = await page.pdf({ format: "A4" });

  await browser.close();

  return pdfBuffer;
}
const Razorpay = require("razorpay");
const { type } = require("os");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.razorPayPaymentWallet = async (req, res) => {
  let payment; // Declare payment variable outside try-catch block for better scope

  try {
    console.log("razorPayPaymentWallet is triggering");
    const { amount } = req.body;
    const userId = req.session.user._id;
    console.log("user id:", userId);

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    // Create payment record with status as "pending"
    payment = new Payment({
      userId: userId,
      amount: amount,
      type: "Deposit",
      timestamp: new Date(),
      status: "success",
    });
    await payment.save();

    // Perform payment process (creating Razorpay order, updating wallet balance, etc.)
    const orderId = await processPayment(amount, userId);

    // If payment process succeeds, update payment status to "success"
    payment.status = "success";
    await payment.save();

    // Send response with Razorpay order ID
    res.json({ orderId: orderId });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);

    // If an error occurs, update payment status to "failed"
    if (payment) {
      payment.status = "failed";
      await payment.save();
    }

    // Send error response
    res.status(500).json({ error: "Internal Server Error" });
  }
};

async function processPayment(amount, userId) {
  let wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    wallet = new Wallet({
      userId: userId,
      balance: 0,
      transactions: [],
    });
  }

  wallet.balance = parseFloat(wallet.balance) + parseFloat(amount);

  const options = {
    amount: amount * 100,
    currency: "INR",
    receipt: "receipt_order_123",
    payment_capture: 1,
  };

  const order = await razorpayInstance.orders.create(options);

  wallet.transactions.push({
    type: "deposit",
    amount: amount,
    description: "Wallet Recharge",
    timestamp: new Date(),
    status: "success",
  });
  await wallet.save();

  return order.id;
}

// async function resetBalance(userId) {
//   try {
//     let wallet = await Wallet.findOne({ userId });

//     if (!wallet) {
//       wallet = new Wallet({
//         userId: userId,
//         balance: 0,
//         transactions: [],
//       });
//     }

//     wallet.balance = 0;

//     await wallet.save();

//     return { message: "Balance reset successfully" };
//   } catch (error) {
//     console.error("Error resetting balance:", error);
//     throw new Error("Internal Server Error");
//   }
// }

exports.viewTransaction = async (req, res, next) => {
  try {
    console.log("viewTransaction is triggering");
    const userId = req.session.user._id;
    const wallet = await Wallet.findOne({ userId: userId });
    console.log("data in the wallet", wallet);
    res.json(wallet);
  } catch (error) {
    next(error);
  }
};
