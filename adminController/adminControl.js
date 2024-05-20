const userData = require("../models/userModel");
const GoogleUser = require("../models/googleUserModel");
const Product = require("../models/productModel");
const multer = require("multer");
const Category = require("../models/categoryModel");
const sharp = require("sharp");
const uploadMiddleware = require("../utils/multer");
const { resizeAndCropImage } = require("../utils/imageUtils");
const MyOrder = require("../models/OrderSchema");
const Return = require("../models/returnSchema");
const Coupon = require("../models/couponModel");
const UsedCoupon = require("../models/UsedCouponModel");
const SalesReport = require("../models/salesReport");
const Wallet = require("../models/walletModel");
const fs = require("fs");
const pdf = require("pdfkit");
const path = require("path");
const { promisify } = require("util");

exports.dashboardOrdersData = async (req, res) => {
  try {
    const todayOrders = await MyOrder.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    const yesterdayOrders = await MyOrder.countDocuments({
      createdAt: {
        $gte: new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000,
        $lt: new Date().setHours(0, 0, 0, 0),
      },
    });
    const last7DaysOrders = await MyOrder.countDocuments({
      createdAt: { $gte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) },
    });
    const last30DaysOrders = await MyOrder.countDocuments({
      createdAt: { $gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) },
    });

    // Send the data back to the client
    res.json([todayOrders, yesterdayOrders, last7DaysOrders, last30DaysOrders]);
  } catch (error) {
    console.error("Error fetching orders data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add this function to get the total count of users
exports.getTotalUsersCount = async () => {
  try {
    // Fetch users from the userData collection
    const regularUsersCount = await userData.countDocuments();

    // Fetch users from the GoogleUser collection and add to the count
    const googleUsersCount = await GoogleUser.countDocuments();

    // Calculate the total count of users
    const totalUsersCount = regularUsersCount + googleUsersCount;

    // Return the total count of users
    return totalUsersCount;
  } catch (err) {
    console.error("Error fetching users count:", err);
    throw new Error("Failed to fetch users count");
  }
};

async function getTotalUsersCount() {
  try {
    // Fetch users from the userData collection
    const regularUsersCount = await userData.countDocuments();

    // Fetch users from the GoogleUser collection and add to the count
    const googleUsersCount = await GoogleUser.countDocuments();

    // Calculate the total count of users
    const totalUsersCount = regularUsersCount + googleUsersCount;

    // Return the total count of users
    return totalUsersCount;
  } catch (err) {
    console.error("Error fetching users count:", err);
    throw new Error("Failed to fetch users count");
  }
}

exports.getTotalProductsCount = async () => {
  try {
    // Implement logic to fetch total number of products from your database
    // For example:
    const totalProductsCount = await Product.countDocuments();

    // Return the total count of products
    return totalProductsCount;
  } catch (err) {
    console.error("Error fetching products count:", err);
    throw new Error("Failed to fetch products count");
  }
};

exports.getTotalOrdersCount = async () => {
  try {
    // Fetch total number of orders from the MyOrder collection
    const totalOrdersCount = await MyOrder.countDocuments();

    // Return the total count of orders
    return totalOrdersCount;
  } catch (err) {
    console.error("Error fetching orders count:", err);
    throw new Error("Failed to fetch orders count");
  }
};

exports.getAllUsers = async () => {
  try {
    // Fetch users from the userData collection
    const regularUsersCount = await userData.countDocuments();

    // Fetch users from the GoogleUser collection and add to the count
    const googleUsersCount = await GoogleUser.countDocuments();

    // Calculate the total count of users
    const totalUsersCount = regularUsersCount + googleUsersCount;

    // Return the total count of users
    return totalUsersCount;
  } catch (err) {
    console.error("Error fetching users count:", err);
    throw new Error("Failed to fetch users count");
  }
};

// Fetch user management data with status
exports.getUserManagementData = async () => {
  try {
    // Fetch users from the userData collection
    const regularUsers = await userData.find(
      {},
      "_id FirstName LastName email phone isBlocked"
    );

    // Fetch users from the GoogleUser collection
    const googleUsers = await GoogleUser.find(
      {},
      "_id firstName lastName email isBlocked"
    );

    // Combine the data from both collections into a single array
    const allUsers = regularUsers.concat(
      googleUsers.map((user) => ({
        _id: user._id,
        FirstName: user.firstName || user.FirstName,
        LastName: user.lastName || user.LastName,
        email: user.email,
        phone: "",
        status: user.isBlocked ? "Blocked" : "Active", // Determine status based on isBlocked field
      }))
    );
    return allUsers;
  } catch (err) {
    console.error("Error fetching users:", err);
    throw new Error("Failed to fetch user data");
  }
};

// exports.getUserDetails = async (userId) => {
//   try {
//     // Check if the user exists in the GoogleUser model
//     let userDetails = await GoogleUser.findById(userId);

//     // If the user does not exist in the GoogleUser model, fetch from the UserData model
//     if (!userDetails) {
//       userDetails = await userData.findById(userId);
//     }

//     // Return the user details
//     return userDetails;
//   } catch (err) {
//     console.error("Error fetching user details:", err);
//     throw new Error("Failed to fetch user details");
//   }
// };

exports.getUserDetails = async (userId) => {
  try {
    let userDetails;

    // Check if the user exists in the GoogleUser model
    userDetails = await GoogleUser.findById(userId);

    // If the user does not exist in the GoogleUser model, fetch from the UserData model
    if (!userDetails) {
      userDetails = await userData.findById(userId);
    }

    // If userDetails is still undefined, the user does not exist
    if (!userDetails) {
      throw new Error("User not found");
    }

    // Extract common user details
    const { _id, FirstName, LastName, email, phone, isBlocked } = userDetails;
    // console.log("testing",isBlocked)
    // Return the user details
    return {
      _id,
      FirstName,
      LastName,
      email,
      phone,
      isBlocked,
    };
  } catch (err) {
    console.error("Error fetching user details:", err);
    throw new Error("Failed to fetch user details");
  }
};

exports.blockUser = async (req, res) => {
  const { userId, action } = req.body;
  // console.log("user id :", req.body);
  try {
    let user;

    // Check if the user exists in UserData
    user = await userData.findById(userId);

    // If not found in UserData, check GoogleUser
    if (!user) {
      user = await GoogleUser.findById(userId);
    }

    // If user not found in either collection, return error
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Toggle the isBlocked field
    user.isBlocked = !user.isBlocked;

    // Save the updated user document
    await user.save();

    // Redirect to a specific URL after blocking/unblocking
    res.redirect("/admin/user/" + userId);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to block/unblock user" });
  }
};

//showing list
//showing list
exports.getProductManagementPage = async (req, res) => {
  try {
    // Fetch product data from the database and populate the category field with the category name
    const products = await Product.find(
      {},
      "_id name qty category isListed serialNumber"
    ).populate({
      path: "category",
      select: "name", // Select only the name field of the category
    });

    // Modify product data to include serial number and extract category name
    const modifiedProducts = products.map((product) => ({
      id: product._id, // Keep the field name as _id
      name: product.name,
      qty: product.qty,
      category: product.category ? product.category.name : "Uncategorized", // Get category name or set as 'Uncategorized' if category is not populated
      isListed: product.isListed, // Include isListed field
      serialNumber: product.serialNumber, // Include serialNumber field
    }));

    // Render the productManagement EJS template with the modified product data
    res.render("adminEjs/productManagement", { products: modifiedProducts });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Function to fetch and render product details
exports.getProductDetails = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Fetch product details based on productId
    // const product = await Product.findById(productId);
    const product = await Product.findById(productId).populate("category");

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Render the productDetails EJS template with the retrieved product details
    res.render("adminEjs/productDetails", { product });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).send("Internal Server Error");
  }
};

// unList and listing
exports.toggleProductListStatus = async (req, res) => {
  const productId = req.params.productId; // Retrieve productId from route parameters

  try {
    // Fetch the product by productId
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Toggle the isListed field based on the action
    if (req.body.action === "list") {
      product.isListed = true;
    } else if (req.body.action === "unlist") {
      product.isListed = false;
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    // Save the updated product document
    await product.save();

    // Redirect back to the same page after listing/unlisting
    res.redirect("back");
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle product list status",
    });
  }
};

exports.getProductEditPage = async (req, res) => {
  try {
    // Extract the productId from the request parameters
    const productId = req.params.productId;

    // Fetch the product by productId
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    const existingImages = product.images;

    // Fetch all categories from the database
    const categories = await Category.find({}, "_id name");

    // Render the productEdit EJS template with product and categories
    res.render("adminEjs/productEdit", { product, categories, existingImages });
  } catch (error) {
    console.error("Error fetching product or categories:", error);
    res.status(500).send("Internal Server Error");
  }
};

// exports.updateProduct = async (req, res) => {
//   try {
//     const productId = req.params.productId;
//     const {
//       name,
//       description,
//       detailedInformation,
//       category,
//       qty,
//       color,
//       actualPrice,
//       offerPrice,
//       isListed,
//       serialNumber,
//     } = req.body;
//     const updatedProduct = await Product.findByIdAndUpdate(
//       productId,
//       {
//         name,
//         description,
//         detailedInformation,
//         category,
//         qty,
//         color,
//         actualPrice,
//         offerPrice,
//         isListed,
//         serialNumber,
//       },
//       { new: true }
//     );
//     res.redirect("/productManagement"); // Redirect to product management page after update
//   } catch (error) {
//     console.error("Error updating product:", error);
//     res.status(500).send("Internal Server Error");
//   }
// };

exports.updateProductDetails = async (req, res) => {
  try {
    const productId = req.params.productId;
    const {
      name,
      brandName,
      description,
      detailedInformation,
      category,
      qty,
      color,
      actualPrice,
      offerPrice,
      isListed,
      serialNumber,
    } = req.body;
    // console.log(productId);
    // console.log(req.body);
    // Update the product details
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        brandName,
        description,
        detailedInformation,
        category,
        qty,
        color,
        actualPrice,
        offerPrice,
        isListed,
        serialNumber,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).send("Product not found");
    }

    res.redirect("/productManagement"); // Redirect to product management page after update
  } catch (error) {
    console.error("Error updating product details:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateProductImages = async (req, res) => {
  try {
    // Get product ID from the request params
    const productId = req.params.productId;

    // Get all the images from the request
    const images = [];
    console.log("the productId:", productId);
    console.log("images url", images);
    // Process each image using Sharp
    for (const file of req.files) {
      const imagePath = file.path;
      const croppedImagePath = "uploads/cropped_" + file.filename;

      // Define crop width and height
      const cropWidth = 500;
      const cropHeight = 500;

      // Crop and resize the image using Sharp
      await sharp(imagePath)
        .resize(cropWidth, cropHeight, { fit: "cover", position: "center" })
        .toFile(croppedImagePath);

      // Push the path of the cropped image to the images array
      images.push(croppedImagePath);
    }

    // Update the product in the database with the new images
    await Product.findByIdAndUpdate(
      productId,
      {
        images: images,
      },
      { new: true }
    );

    // Redirect to product management page after updating
    res.redirect("/productManagement");
  } catch (error) {
    // Handle errors
    console.error("Error updating product images:", error);
    res.status(500).send("Internal server error");
  }
};

// Multer configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/"); // Set the destination folder where images will be uploaded
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname); // Keep the original filename
//   },
// });

// const upload = multer({ storage: storage }).array("images", 5); // 'images' is the name of the file input field

// Handle product creation
// exports.createProduct = (req, res) => {
//   uploadMiddleware(req, res, async function (err) {
//     if (err) {
//       return res.status(500).send(err); // Handle multer errors
//     }

//     try {
//       const {
//         name,
//         description,
//         detailedInformation,
//         category,
//         qty,
//         color,
//         actualPrice,
//         offerPrice,
//       } = req.body;

//       // Store images from req.files
//       const images = req.files.map((file) => file.buffer);

//       // Create new product
//       const product = await Product.create({
//         name,
//         description,
//         detailedInformation,
//         category,
//         qty,
//         color,
//         actualPrice,
//         offerPrice,
//         images,
//       });

//       res.redirect("/addProduct");
//     } catch (error) {
//       console.error("Error creating product:", error);
//       res
//         .status(500)
//         .json({ success: false, error: "Failed to create product" }); // Handle other errors
//     }
//   });
// };

exports.createProduct = (req, res) => {
  uploadMiddleware(req, res, async function (err) {
    if (err) {
      return res.status(500).send(err); // Handle multer errors
    }

    try {
      const {
        name,
        brandName,
        description,
        detailedInformation,
        category,
        qty,
        color,
        actualPrice,
        offerPrice,
      } = req.body;

      // Store images from req.files
      const images = [];

      // Process each image using Sharp
      for (const file of req.files) {
        const imagePath = file.path;
        const croppedImagePath = "uploads/cropped_" + file.filename;

        // Define crop width and height
        const cropWidth = 500;
        const cropHeight = 500;

        // Crop and resize the image using Sharp
        await sharp(imagePath)
          .resize(cropWidth, cropHeight, { fit: "cover", position: "center" })
          .toFile(croppedImagePath);

        // Push the path of the cropped image to the images array
        images.push(croppedImagePath);
      }

      // Create new product
      const product = await Product.create({
        name,
        brandName,
        description,
        detailedInformation,
        category,
        qty,
        color,
        actualPrice,
        offerPrice,
        images,
      });

      res.redirect("/addProduct");
    } catch (error) {
      console.error("Error creating product:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create product" }); // Handle other errors
    }
  });
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Create a new category
    const category = new Category({ name });
    await category.save();

    req.flash("success", "Category created successfully");
    res.redirect("/addCategory"); // Redirect to the addCategory page after successfully creating the category
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyValue) {
      // Duplicate key error
      req.flash(
        "error",
        `Category with name '${error.keyValue.name}' already exists.`
      );
      return res.redirect("/addCategory");
    }
    console.error("Error creating category:", error);
    req.flash("error", "Internal Server Error");
    res.redirect("/addCategory");
  }
};

exports.renderCategoryManagement = async (req, res) => {
  try {
    // Aggregate categories with the count of products in each category
    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "products",
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$category", "$$categoryId"] },
              },
            },
            {
              $count: "productCount",
            },
          ],
          as: "products",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          productCount: { $arrayElemAt: ["$products.productCount", 0] },
          isListed: 1, // Include isListed field
        },
      },
    ]);

    res.render("adminEjs/categoryManagement", { categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.CategoryDetails = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).send("Category not found");
    }

    res.render("adminEjs/categoryDetails", { category });
  } catch (error) {
    console.error("Error fetching category details:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.listUnlistCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const action = req.body.action;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).send("Category not found");
    }

    category.isListed = action === "list";

    await category.save();

    res.redirect("back");
  } catch (error) {
    console.error("Error listing/unlisting category:", error);
    res.status(500).send("Internal Server Error");
  }
};
exports.renderEditCategoryForm = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).send("Category not found");
    }

    res.render("adminEjs/categoryEdit", { category });
  } catch (error) {
    console.error("Error rendering edit category form:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const { categoryName } = req.body; // Assuming the form field name for category name is categoryName

    // Check if the category name already exists
    const existingCategory = await Category.findOne({ name: categoryName });
    if (existingCategory && existingCategory._id.toString() !== categoryId) {
      req.flash("error", "Category already exists");
      return res.redirect(`/editCategory/${categoryId}`);
    }

    // Find the category by ID and update its name
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name: categoryName }, // Update the name field
      { new: true } // Return the updated category
    );

    if (!updatedCategory) {
      return res.status(404).send("Category not found");
    }

    res.redirect("/categoryManagement"); // Redirect to category management page after update
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.renderOderManagement = async (req, res) => {
  try {
    const orders = await MyOrder.find();

    res.render("adminEjs/OderManagement", { orders });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.cancel_order = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    // Remove the order from the database
    await MyOrder.findByIdAndDelete(orderId);
    res.redirect("/oderManagement"); // Redirect to the order management page
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateStatusOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const newStatus = req.body.status;

    const formattedDateTime = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const deliveryDateTime = new Date(formattedDateTime);

    await MyOrder.findByIdAndUpdate(orderId, {
      status: newStatus,
      deliveryDateTime,
    });

    if (newStatus === "Delivered") {
      await MyOrder.findByIdAndUpdate(orderId, { payment: "Paid" });
    }

    res.redirect("/oderManagement");
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.renderInventory = async (req, res) => {
  try {
    // Fetch all products from the Product database
    const products = await Product.find();

    // Iterate through each product and calculate available stock and number of orders
    for (let i = 0; i < products.length; i++) {
      // Fetch orders for the current product from the MyOrder database
      const orders = await MyOrder.find({ productId: products[i]._id });

      // Calculate total ordered quantity for the current product
      const totalOrderedQty = orders.reduce(
        (acc, order) => acc + order.quantity,
        0
      );

      // Calculate available stock for the current product
      const availableStock = products[i].qty - totalOrderedQty;

      // Update product object with available stock and number of orders
      products[i].availableStock = availableStock;
      products[i].numberOfOrders = orders.length;
    }

    // Render the Inventory EJS template with product data
    res.render("adminEjs/Inventory", { products });
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.ReturnedOrderRendering = async (req, res) => {
  try {
    console.log("the returnOrder is triggering");
    const returnOrders = await Return.find().populate("orderId");
    console.log("returnOrder", returnOrders);

    // Array to store return orders with additional data
    const returnOrdersWithData = [];

    // Fetch additional information (productName, orderType) for each return order
    for (const returnOrder of returnOrders) {
      const orderId = returnOrder.orderId;
      console.log("the orderid:", orderId);

      // Fetch order details from MyOrder schema using orderId
      const order = await MyOrder.findById(orderId);
      console.log("the order data:", order);

      returnOrdersWithData.push({
        orderId: order._id,
        submittedAt: returnOrder.submittedAt,
        productName: order.productName,
        orderType: order.oderType,
        returnReason: returnOrder.returnReason,
        additionalDetails: returnOrder.additionalDetails,
        paymentOption: returnOrder.paymentOption,
      });
    }

    res.render("adminEjs/ReturnedOrder", {
      returnOrders: returnOrdersWithData,
    });
  } catch (error) {
    console.error("Error fetching inventory data:", error);
  }
};

exports.updateReturnStatus = async (req, res) => {
  try {
    console.log("updateReturnStatus triggering");
    const { orderId, status, paymentOption } = req.body;
    await MyOrder.updateOne({ _id: orderId }, { returnStatus: status });

    if (status === "Accepted") {
      await Return.deleteOne({ orderId: orderId });

      if (paymentOption === "Wallet") {
        const order = await MyOrder.findOne({ _id: orderId });
        if (order) {
          const discountedPrice = order.discountedPrice;
          console.log("discountedPrice:", discountedPrice);
          const wallet = await Wallet.findOne({ userId: order.userId });
          if (wallet) {
            wallet.balance += discountedPrice;
            wallet.transactions.push({
              type: "deposit",
              amount: discountedPrice,
              description: "Refund from returned order",
            });
            await wallet.save();
            console.log("Balance updated successfully for user:", order.userId);
          }
        } else {
          console.log("Wallet not found for user:", order.userId);
        }
      } else {
        console.log("Order not found with ID:", orderId);
      }
    }

    res.status(200).send("Status updated successfully");
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.couponManagementRendering = async (req, res) => {
  try {
    const activeCoupons = await Coupon.find();
    res.render("adminEjs/coupon", { activeCoupons });
  } catch (error) {
    console.error("couponManagementRendering:", error);
  }
};

exports.addCouponRendering = async (req, res) => {
  try {
    res.render("adminEjs/addCoupon");
  } catch (error) {
    console.error("addCouponRendering:", error);
  }
};

exports.addCoupon = async (req, res) => {
  try {
    const {
      offerName,
      couponCode,
      discountType,
      discountValue,
      minPurchaseAmount,
      validFrom,
      validTo,
      usageLimit,
      isActive,
    } = req.body;

    const existingCoupon = await Coupon.findOne({ couponCode });

    if (existingCoupon) {
      req.flash(
        "error",
        "Coupon with this code already exists. Please choose a different code."
      );
      return res.redirect("/AddCoupon");
    }
    if (discountType === "percentage") {
      if (discountValue >= 100 || discountValue <= 0) {
        req.flash("error", "you can not add more than 100. or negative No");
        return res.redirect("/AddCoupon");
      }
    }

    if (discountType === "fixed") {
      if (discountValue >= 500 || discountValue <= 0) {
        req.flash("error", "you can not add more than 500 or negative No");
        return res.redirect("/AddCoupon");
      }
    }

    const newCoupon = new Coupon({
      offerName,
      couponCode,
      discountType,
      discountValue,
      minPurchaseAmount,
      validFrom,
      validTo,
      usageLimit,
      isActive,
    });

    await newCoupon.save();

    res.redirect("/couponManagement");
  } catch (error) {
    console.error("Error adding coupon:", error);
    res
      .status(500)
      .json({ error: "An error occurred while adding the coupon" });
  }
};

exports.couponDetails = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const coupon = await Coupon.findById(couponId);

    res.render("adminEjs/CouponDetails", { coupon });
  } catch (error) {
    console.error("Error retrieving coupon details:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.toggleCouponStatus = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const { isActive } = req.body;
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      { isActive },
      { new: true }
    );

    res.json(updatedCoupon);
  } catch (error) {
    console.error("Error toggling coupon status:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    await Coupon.findByIdAndDelete(couponId);
    console.log("Coupon deleted successfully");
    await UsedCoupon.findByIdAndDelete(couponId);
    console.log("coupon is deleted from the UsedCoupon");
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.renderEditCouponForm = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const coupon = await Coupon.findById(couponId);
    res.render("adminEjs/editCoupon", { coupon });
  } catch (error) {
    console.error("Error rendering edit coupon form:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.couponId;
    const {
      offerName,
      couponCode,
      discountType,
      discountValue,
      minPurchaseAmount,
      validFrom,
      validTo,
      usageLimit,
    } = req.body;

    const existingCoupon = await Coupon.findOne({ couponCode });

    if (existingCoupon && existingCoupon._id.toString() !== couponId) {
      req.flash("error", "Coupon code already exists");
      return res.redirect("/admin/editCoupon/" + couponId);
    }

    // If the coupon code is unique, proceed with updating the coupon
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        offerName,
        couponCode,
        discountType,
        discountValue,
        minPurchaseAmount,
        validFrom,
        validTo,
        usageLimit,
      },
      { new: true }
    );
    res.redirect("/admin/couponDetails/" + updatedCoupon._id);
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.renderSalesReport = async (req, res) => {
  try {
    const orders = await MyOrder.find();
    const totalOrder = await MyOrder.countDocuments();

    let totalSales = 0;
    orders.forEach((order) => {
      totalSales += order.discountedPrice;
    });

    const aov = totalOrder > 0 ? (totalSales / totalOrder).toFixed(2) : 0;

    const totalUsersCount = await getTotalUsersCount();

    res.render("adminEjs/salesReport", {
      totalOrder,
      totalSales,
      aov,
      totalUsersCount,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.renderAllSalesReport = async (req, res) => {
  try {
    console.log("renderAllSalesReport is triggering");
    const orders = await MyOrder.find();

    for (const order of orders) {
      const product = await Product.findById(order.productId);
      console.log("product offer price:", product.offerPrice);
      if (product) {
        order.couponDiscount = product.offerPrice - order.discountedPrice;
        order.couponDiscount = order.couponDiscount.toFixed(2);
        console.log("coupon discount:", order.couponDiscount);
        const usedCoupon = await UsedCoupon.findOne({
          productId: order.productId,
        });

        if (usedCoupon) {
          const coupon = await Coupon.findById(usedCoupon.couponId);
          order.discountType = coupon.discountType;
        } else {
          order.discountType = "No discount";
        }
      } else {
        order.couponDiscount = 0;
        order.discountType = "Product not found";
      }
    }

    res.render("adminEjs/salesList", { orders });
  } catch (error) {
    console.log("error", error);
  }
};

exports.filterSalesReport = async (req, res) => {
  try {
    console.log("filter salesReport is triggering ");
    const { startDate, endDate } = req.query;

    const parsedStartDate = Date.parse(startDate);
    const parsedEndDate = Date.parse(endDate);

    console.log("parsed data:", parsedEndDate, parsedStartDate);

    const filteredOrders = await MyOrder.find({
      deliveryDateTime: {
        $gte: new Date(parsedStartDate),
        $lte: new Date(parsedEndDate),
      },
    });

    console.log("filtered", filteredOrders);
    res.json(filteredOrders);
  } catch (error) {
    console.log("Error filtering sales report:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.downloadSalesReport = async (req, res) => {
  try {
    const orders = await MyOrder.find();

    for (const order of orders) {
      const product = await Product.findById(order.productId);

      if (product) {
        order.couponDiscount = product.offerPrice - order.discountedPrice;
        order.couponDiscount = order.couponDiscount.toFixed(2);

        const usedCoupon = await UsedCoupon.findOne({
          productId: order.productId,
        });

        if (usedCoupon) {
          const coupon = await Coupon.findById(usedCoupon.couponId);
          order.discountType = coupon.discountType;
        } else {
          order.discountType = "No discount";
        }
      } else {
        order.couponDiscount = 0;
        order.discountType = "Product not found";
      }
    }

    const doc = new pdf();
    doc.pipe(fs.createWriteStream("sales_report.pdf"));

    doc.fontSize(7).text("Sales Report", { align: "center" }).moveDown();

    const startX = 30; // X position to start drawing table
    let currentY = 100; // Y position to start drawing table

    // Table headers
    const headers = [
      "Product Name",
      "Price",
      "Payment",
      "Delivered Date",
      "Status",
      "Qty",
      "Discount",
      "Deduction",
    ];

    // Adjust the increment value below to change spacing between headers
    const incrementValue = 75; // Adjust this value as needed

    // Draw table headers with borders
    // Draw table headers with borders
    // Draw table headers with borders
    doc.font("Helvetica-Bold");
    headers.forEach((header, index) => {
      const x = startX + index * incrementValue;
      const endX =
        startX +
        (index === headers.length - 1
          ? incrementValue
          : index * incrementValue);
      doc.text(header, x, currentY);
      // Draw top border
      doc.moveTo(x, 90).lineTo(endX, 90);
    });

    // Draw bottom border for the header row
    const endX = startX + headers.length * incrementValue;
    doc.moveTo(startX, 90).lineTo(endX, 90).stroke(); // Draw the line across the entire header row

    // Draw bottom border for the last row
    doc
      .moveTo(startX, currentY + 15)
      .lineTo(endX, currentY + 15)
      .stroke();

    currentY += 15; // Move to next row

    // Draw table data with borders
    doc.font("Helvetica");
    orders.forEach((order) => {
      currentY += 20; // Move to next row
      const tableData = [
        order.productName,
        order.discountedPrice,
        order.payment,
        order.deliveryDateTime
          ? new Date(order.deliveryDateTime).toLocaleString("en-US", {
              timeZone: "UTC",
            })
          : "pending",
        order.status,
        order.quantity,
        order.discountType,
        order.couponDiscount,
      ];

      tableData.forEach((value, index) => {
        const x = startX + index * incrementValue;
        doc.text(value.toString(), x, currentY);
        // Draw left border
        doc
          .moveTo(x, currentY)

          .stroke();
        // Draw right border
        doc
          .moveTo(x + incrementValue, currentY)

          .stroke();
      });
    });

    // Draw bottom border for the last row
    doc.end();

    res.download("sales_report.pdf");
  } catch (error) {
    console.log("Error:", error);
    res.status(500).send("Error generating sales report");
  }
};

exports.viewOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await MyOrder.findById(orderId);

    // const CouponDetails = await UsedCoupon.findById(orderId);

    res.render("adminEjs/viewOrder", { order });
  } catch (error) {
    console.log("error", error);
  }
};

exports.offerManagement = async (req, res) => {
  try {
    const products = await Product.find();
    const categories = await Category.find();
    res.render("adminEjs/offerManagement", { products, categories });
  } catch (error) {
    console.log(error);
  }
};

exports.Render_addOfferProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    res.render("adminEjs/addOfferProduct", { productId });
  } catch (error) {
    console.log(error);
  }
};

exports.adminAddOffer_product = async (req, res) => {
  try {
    console.log("adminAddOffer_product is triggering");
    const { discountType, discountValue, validFrom, validTo, productId } =
      req.body;
    console.log("product ID:", productId);
    const product = await Product.findOne({ _id: productId });
    console.log("Original offerPrice:", product.offerPrice);

    if (product.hasOfferApplied) {
      console.log("An offer is already applied to this product");
      req.flash("error", "An offer is already applied to this product");
      return res.redirect(`/addOffer_product/${productId}`);
    }

    if (discountType === "percentage") {
      if (discountValue >= 100 || discountValue <= 0) {
        req.flash("error", "you can not add more than 100. or negative No");
        return res.redirect(`/addOffer_product/${productId}`);
      }
    }

    if (discountType === "fixed") {
      if (discountValue >= 500 || discountValue <= 0) {
        req.flash("error", "you can not add more than 500 or negative No");
        return res.redirect(`/addOffer_product/${productId}`);
      }
    }

    let newOfferPrice;

    if (discountType === "percentage") {
      // Calculate new offer price based on percentage discount
      const percentageDiscount = parseFloat(discountValue) / 100;
      newOfferPrice = product.offerPrice * (1 - percentageDiscount);
    } else if (discountType === "fixed") {
      // Calculate new offer price based on fixed discount
      const fixedDiscount = parseFloat(discountValue);
      newOfferPrice = product.offerPrice - fixedDiscount;
    } else {
      console.log("Invalid discount type");
      return res.status(400).send("Invalid discount type");
    }

    // Check if the current date is within the validity period
    const currentDate = new Date();
    const validFromDate = new Date(validFrom);
    const validToDate = new Date(validTo);

    if (currentDate < validFromDate || currentDate > validToDate) {
      console.log("Offer price is not valid for the current date");
      return res
        .status(400)
        .send("Offer price is not valid for the current date");
    }

    // Update the product's offer price in the database
    product.offerPrice = newOfferPrice;
    product.hasOfferApplied = true;
    await product.save();

    console.log("Updated offerPrice:", newOfferPrice);

    // Send response
    res.redirect("/offerManagement");
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

exports.addOffer_category = async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    res.render("adminEjs/addOffer_category", { categoryId });
  } catch (error) {
    console.log(error);
  }
};

exports.AddOffer_categoryFunction = async (req, res) => {
  try {
    console.log("addoffer_categoryFunction is triggering");
    const { discountType, discountValue, validFrom, validTo, categoryId } =
      req.body;

    const products = await Product.find({ category: categoryId });

    for (const product of products) {
      console.log(
        "Original offerPrice for product",
        product.name,
        ":",
        product.offerPrice
      );

      let newOfferPrice;

      if (discountType === "percentage") {
        // Calculate new offer price based on percentage discount
        const percentageDiscount = parseFloat(discountValue) / 100;
        newOfferPrice = product.offerPrice * (1 - percentageDiscount);
      } else if (discountType === "fixed") {
        // Calculate new offer price based on fixed discount
        const fixedDiscount = parseFloat(discountValue);
        newOfferPrice = product.offerPrice - fixedDiscount;
      } else {
        console.log("Invalid discount type");
        return res.status(400).send("Invalid discount type");
      }

      const currentDate = new Date();
      const validFromDate = new Date(validFrom);
      const validToDate = new Date(validTo);

      if (currentDate < validFromDate || currentDate > validToDate) {
        console.log("Offer price is not valid for the current date");
        return res
          .status(400)
          .send("Offer price is not valid for the current date");
      }

      product.offerPrice = newOfferPrice;
      await product.save();

      console.log(
        "Updated offerPrice for product",
        product.name,
        ":",
        newOfferPrice
      );
    }

    res.redirect("/offerManagement");
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};
