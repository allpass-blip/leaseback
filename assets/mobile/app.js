function syncSelectState(select) {
  select.classList.toggle("is-filled", Boolean(select.value));
}

document.addEventListener("DOMContentLoaded", function () {
  var mobileRoot = document.querySelector(".mobile-lp");
  if (!mobileRoot) {
    return;
  }

  var revealTargets = [
    ".hero-headline",
    ".hero-lead",
    ".hero-photo",
    ".hero-cta",
    ".phone-box",
    ".lease-title",
    ".lease-lead",
    ".lease-worries-card",
    ".lease-worry-list li",
    ".lease-step-card",
    ".lease-reason-card",
    ".lease-merit-card",
    ".step-card",
    ".faq-item",
    ".form-box",
  ];
  var revealItems = mobileRoot.querySelectorAll(revealTargets.join(","));

  revealItems.forEach(function (item, index) {
    item.classList.add("js-reveal");
    item.style.setProperty("--reveal-delay", Math.min(index % 5, 4) * 55 + "ms");
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -7% 0px" });

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  mobileRoot.querySelectorAll(".sel").forEach(syncSelectState);

  mobileRoot.addEventListener("change", function (event) {
    var select = event.target.closest(".sel");
    if (select) {
      syncSelectState(select);
    }
  });

  mobileRoot.addEventListener("click", function (event) {
    var trigger = event.target.closest(".faq-q");
    if (trigger) {
      trigger.parentElement.classList.toggle("open");
    }
  });

});
