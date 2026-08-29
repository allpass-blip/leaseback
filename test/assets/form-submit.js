(function () {
  function setStatus(form, type, message) {
    var status = form.querySelector("[data-form-status]");
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.status = type;
  }

  function completeTest(form) {
    var submit = form.querySelector('[type="submit"]');

    if (submit) {
      submit.disabled = true;
      submit.textContent = "確認中...";
    }

    setStatus(form, "success", "テスト入力を確認しました。完了ページへ移動します。");
    window.location.href = form.dataset.successUrl || "/test/thanks.html";
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-contact-form]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!form.reportValidity()) {
          return;
        }

        completeTest(form);
      });
    });
  });
})();
