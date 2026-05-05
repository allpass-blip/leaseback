(function () {
  function setStatus(form, type, message) {
    var status = form.querySelector("[data-form-status]");
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.status = type;
  }

  function toPayload(form) {
    var data = new FormData(form);
    var payload = {};

    data.forEach(function (value, key) {
      payload[key] = String(value).trim();
    });

    payload.pageUrl = window.location.href;
    return payload;
  }

  async function submitForm(form) {
    var submit = form.querySelector('[type="submit"]');
    var originalText = submit ? submit.textContent : "";

    if (submit) {
      submit.disabled = true;
      submit.textContent = "送信中...";
    }

    setStatus(form, "pending", "送信しています。しばらくお待ちください。");

    try {
      var response = await fetch(form.action || "/api/contact", {
        method: form.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });

      var result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "送信に失敗しました。");
      }

      form.reset();
      form.querySelectorAll(".sel").forEach(function (select) {
        select.classList.remove("is-filled");
      });
      setStatus(form, "success", "送信しました。担当者より折り返しご連絡いたします。");
    } catch (error) {
      setStatus(form, "error", error.message || "送信できませんでした。時間をおいて再度お試しください。");
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = originalText;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-contact-form]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!form.reportValidity()) {
          return;
        }

        submitForm(form);
      });
    });
  });
})();
