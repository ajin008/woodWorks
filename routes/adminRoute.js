const express = require("express");
const router = express.Router();
const path = require("path");
const adminAuth = require("../adminController/adminAuth");
const adminControl = require("../adminController/adminControl");
const Category = require("../models/categoryModel");
const preventBackButtonBeforeLogout = require("../middleware/adminAuthMiddleware");
const MyOrder = require("../models/OrderSchema");
const Products = require("../models/productModel");

const isAdminAuthenticated = (req, res, next) => {
  if (req.session.isAdminAuthenticated || req.path === "/adminLogin") {
    return next();
  } else {
    res.redirect("/adminLogin");
  }
};

router.use(isAdminAuthenticated);

//adminLogin
router.get("/adminLogin", async (req, res) => {
  res.render(path.join("adminEjs", "adminLogin"));
});

router.post("/adminLogin", adminAuth.adminLogin);

router.get(
  "/adminDash",
  preventBackButtonBeforeLogout,
  async (req, res, next) => {
    try {
      const totalUsersCount = await adminControl.getTotalUsersCount();
      const totalProductsCount = await adminControl.getTotalProductsCount();

      let totalSales = 0;

      const orders = await MyOrder.find();
      orders.forEach((order) => {
        totalSales += order.discountedPrice;
      });

      const bestSellingProduct = await MyOrder.aggregate([
        {
          $group: {
            _id: "$productName",
            totalOrders: { $sum: 1 },
          },
        },
        {
          $sort: { totalOrders: -1 },
        },
        {
          $limit: 1,
        },
      ]);
      console.log(bestSellingProduct);

      const bestSellingCategory = await MyOrder.aggregate([
        {
          $group: {
            _id: "$productId",
            totalOrders: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: "$product",
        },
        {
          $group: {
            _id: "$product.category",
            totalOrders: { $sum: "$totalOrders" },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $project: {
            categoryName: "$category.name",
            totalOrders: 1,
          },
        },
        {
          $sort: { totalOrders: -1 },
        },
        {
          $limit: 1,
        },
      ]);

      console.log("bestSellingCategory", bestSellingCategory);

      const bestSellingBrand = await MyOrder.aggregate([
        {
          $group: {
            _id: "$productId",
            totalOrders: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "products", // Name of the "Products" collection
            localField: "_id",
            foreignField: "_id",
            as: "product", // Include product details in the result
          },
        },
        {
          $unwind: "$product",
        },
        {
          $group: {
            _id: "$product.brandName",
            totalOrders: { $sum: "$totalOrders" },
          },
        },
        {
          $sort: { totalOrders: -1 },
        },
        {
          $limit: 1,
        },
      ]);

      console.log(bestSellingBrand);

      const totalOrdersCount = await adminControl.getTotalOrdersCount();

      
      res.render(path.join("adminEjs", "adminDash"), {
        totalUsersCount: totalUsersCount,
        totalProductsCount: totalProductsCount,
        totalOrdersCount: totalOrdersCount,
        orders,
        totalSales,
        bestSellingProduct,
        bestSellingCategory,
        bestSellingBrand,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);

router.get("/admin/dashboard/ordersData", adminControl.dashboardOrdersData);

//userManagement
router.get("/userManagement", async (req, res) => {
  try {
    // Fetch user management data
    const allUsers = await adminControl.getUserManagementData();

    // Render the userManagement EJS template with users
    res.render(path.join("adminEjs", "userManagement"), {
      users: allUsers,
    });
  } catch (err) {
    console.error("Error fetching user management data:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/admin/user/:userId", async (req, res) => {
  try {
    // Retrieve the userId from the request parameters
    const userId = req.params.userId;

    // Fetch user details based on userId
    const userDetails = await adminControl.getUserDetails(userId);

    // Render the user details EJS template with the retrieved details
    res.render("adminEjs/user", { user: userDetails });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).send("Internal Server Error");
  }
});

//admin blockUser
router.post("/block", adminControl.blockUser);

// admin productManagement
router.get("/productManagement", adminControl.getProductManagementPage);
// Route to view product details
router.get("/admin/productDetails/:productId", adminControl.getProductDetails);
// Route to list/unlist a product
router.post("/admin/product/:productId", adminControl.toggleProductListStatus);
//product edit
router.get("/admin/productEdit/:productId", adminControl.getProductEditPage);
// product edit form submission
const uploadMiddleware = require("../utils/multer");
router.post(
  "/admin/updateProductDetails/:productId",
  adminControl.updateProductDetails
);
router.post(
  "/admin/updateProductImages/:productId",
  uploadMiddleware,
  adminControl.updateProductImages
);

// admin categoryManagement
router.get("/categoryManagement", adminControl.renderCategoryManagement);

router.get("/addCategory", (req, res) => {
  res.render(path.join("adminEjs", "addCategory"));
});
//add new category
router.post("/categories", adminControl.createCategory);
// Route to list/unlist a category
router.post("/admin/category/:categoryId", adminControl.listUnlistCategory);
//category details
router.get("/admin/categoryDetails/:categoryId", adminControl.CategoryDetails);
// Route to render the edit category form
router.get("/editCategory/:categoryId", adminControl.renderEditCategoryForm);
//update category
router.post("/admin/updateCategory/:categoryId", adminControl.updateCategory);

//product
// admin addProduct
router.get("/addProduct", async (req, res) => {
  try {
    // Fetch categories from the database
    const categories = await Category.find({}, "name"); // Assuming you only need category names

    // Render the addProduct page with category data
    res.render("adminEjs/addProduct", { categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/product", adminControl.createProduct);

router.get("/oderManagement", adminControl.renderOderManagement);

router.get("/admin/remove_Oder/:orderId", adminControl.cancel_order);

router.post("/update-statusOrder/:orderId", adminControl.updateStatusOrder);

router.get("/inventory", adminControl.renderInventory);

router.get("/ReturnedOrder", adminControl.ReturnedOrderRendering);

router.post("/updateReturnStatus", adminControl.updateReturnStatus);

router.get("/couponManagement", adminControl.couponManagementRendering);

router.get("/addCoupon", adminControl.addCouponRendering);

router.post("/admin/AddCoupon", adminControl.addCoupon);

router.get("/admin/couponDetails/:couponId", adminControl.couponDetails);

router.put(
  "/admin/toggleCouponStatus/:couponId",
  adminControl.toggleCouponStatus
);

router.delete("/admin/deleteCoupon/:couponId", adminControl.deleteCoupon);

router.get("/admin/editCoupon/:couponId", adminControl.renderEditCouponForm);

router.post("/admin/editCoupon/:couponId", adminControl.updateCoupon);

router.get("/salesReport", adminControl.renderSalesReport);

router.get("/AllSalesReport", adminControl.renderAllSalesReport);

router.get("/api/filterSalesReport", adminControl.filterSalesReport);

router.post("/api/downloadSalesReport", adminControl.downloadSalesReport);

router.get("/viewOrder/:orderId", adminControl.viewOrder);

router.get("/offerManagement", adminControl.offerManagement);

router.get("/addOffer_product/:productId", adminControl.Render_addOfferProduct);

router.post("/admin/AddOffer_product", adminControl.adminAddOffer_product);

router.get("/addOffer_category/:categoryId", adminControl.addOffer_category);

router.post("/admin/AddOffer_category", adminControl.AddOffer_categoryFunction);

router.post("/adminLogout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    } else {
      res.redirect("/adminLogin");
    }
  });
});

module.exports = router;
