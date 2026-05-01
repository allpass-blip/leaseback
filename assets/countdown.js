(function () {
  function getTodayDeadline() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function updateCountdown(timer) {
    var now = new Date();
    var deadline = getTodayDeadline();
    var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var remaining = Math.max(0, deadline.getTime() - now.getTime());
    var dayLength = deadline.getTime() - startOfDay;
    var progress = Math.max(0, Math.min(1, remaining / dayLength));
    var totalSeconds = Math.floor(remaining / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    var hoursEl = timer.querySelector("[data-countdown-hours]");
    var minutesEl = timer.querySelector("[data-countdown-minutes]");
    var secondsEl = timer.querySelector("[data-countdown-seconds]");

    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);

    timer.style.setProperty("--deadline-progress", progress.toFixed(4));
  }

  document.addEventListener("DOMContentLoaded", function () {
    var timers = Array.prototype.slice.call(document.querySelectorAll("[data-countdown]"));
    if (!timers.length) return;

    timers.forEach(updateCountdown);
    window.setInterval(function () {
      timers.forEach(updateCountdown);
    }, 1000);

    var footerTargets = Array.prototype.slice.call(document.querySelectorAll(".mobile-footer, .footer"));
    if (!footerTargets.length || !("IntersectionObserver" in window)) return;

    var visibleFooters = new Set();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          visibleFooters.add(entry.target);
        } else {
          visibleFooters.delete(entry.target);
        }
      });

      var isFooterVisible = visibleFooters.size > 0;

      timers.forEach(function (timer) {
        timer.classList.toggle("is-hidden-at-footer", isFooterVisible);
      });

      if (document.body) {
        document.body.classList.toggle("deadline-footer-visible", isFooterVisible);
      }
    });

    footerTargets.forEach(function (footer) {
      observer.observe(footer);
    });
  });
})();
