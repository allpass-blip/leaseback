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
    ".hero-trust-bar",
    ".hero-cta",
    ".phone-box",
    ".lease-title",
    ".lease-lead",
    ".lease-worries-card",
    ".lease-worry-list li",
    ".lease-step-card",
    ".lease-reason-card",
    ".lease-merit-card",
    ".mid-cta-banner",
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

  // Keep the fixed CTA out of the first view and the form area.
  var stickyBar = mobileRoot.querySelector(".sticky-cta-bar");
  var heroSec = mobileRoot.querySelector(".hero-editorial-mobile");
  var formSec = mobileRoot.querySelector(".form-sec");
  if (stickyBar && heroSec && formSec) {
    var stickyState = {
      heroVisible: true,
      formVisible: false,
    };
    var updateStickyCta = function () {
      stickyBar.classList.toggle("is-visible", !stickyState.heroVisible && !stickyState.formVisible);
    };

    if ("IntersectionObserver" in window) {
      var heroObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          stickyState.heroVisible = entry.isIntersecting;
          updateStickyCta();
        });
      }, { threshold: 0.01 });

      var formObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          stickyState.formVisible = entry.isIntersecting;
          updateStickyCta();
        });
      }, { threshold: 0.05 });

      heroObserver.observe(heroSec);
      formObserver.observe(formSec);
    } else {
      var updateStickyCtaByScroll = function () {
        var heroRect = heroSec.getBoundingClientRect();
        var formRect = formSec.getBoundingClientRect();
        stickyState.heroVisible = heroRect.bottom > 0 && heroRect.top < window.innerHeight;
        stickyState.formVisible = formRect.bottom > 0 && formRect.top < window.innerHeight;
        updateStickyCta();
      };

      updateStickyCtaByScroll();
      window.addEventListener("scroll", updateStickyCtaByScroll, { passive: true });
      window.addEventListener("resize", updateStickyCtaByScroll);
    }
  } else if (stickyBar) {
    stickyBar.classList.add("is-visible");
  }

  if (stickyBar && formSec && "IntersectionObserver" in window && !heroSec) {
    var legacyFormObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        stickyBar.classList.toggle("is-visible", !entry.isIntersecting);
      });
    }, { threshold: 0.15 });
    legacyFormObserver.observe(formSec);
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
