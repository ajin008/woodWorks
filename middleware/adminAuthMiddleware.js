const preventBackButtonBeforeLogout = (req, res, next) => {
  // If the user is authenticated, redirect to the dashboard page
  //   if (req.session.isAdminAuthenticated) {
  //     return res.redirect("/adminDash");
  //   }

  // Set cache-control headers to prevent caching
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", 0);

  next();
};

module.exports = preventBackButtonBeforeLogout;
