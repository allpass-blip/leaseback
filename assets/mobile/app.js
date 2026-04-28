function syncSelectState(select) {
  select.classList.toggle("is-filled", Boolean(select.value));
}

document.addEventListener("DOMContentLoaded", function () {
  var mobileRoot = document.querySelector(".mobile-lp");
  if (!mobileRoot) {
    return;
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

  var form = mobileRoot.querySelector(".form-box");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      window.alert("送信しました（デモ）");
    });
  }
});
