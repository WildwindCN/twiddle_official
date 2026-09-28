// Public configuration only. Never put payment keys or customer data here.
// Enable a region only after its real store and checkout have been verified.
window.TWIDDLE_SITE = {
  stores: {
    cn: { enabled: false, url: "https://shop.twiddle-ai.com.cn/" },
    global: { enabled: false, url: "https://shop.twiddle-ai.com/" },
  },
  // Populate only from verified official filing records; never invent a number.
  filing: {
    icp: "",
    icpUrl: "https://beian.miit.gov.cn/",
    police: "",
    policeUrl: "",
  },
};
