(function () {
  var marker = "leaseback_submission_pending";

  try {
    if (sessionStorage.getItem(marker) !== "1") return;
    sessionStorage.removeItem(marker);
  } catch (_) {
    return;
  }

  window.__leasebackConversionReady = true;

  [
    "/assets/gtm.js?v=20260829",
    "/assets/affilicode-tracking.js?v=20260829",
  ].forEach(function (src) {
    var script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  });
})();
