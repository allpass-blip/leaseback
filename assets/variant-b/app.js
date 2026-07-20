(() => {
  "use strict";

  const SELECTORS = {
    contactForm: "[data-contact-form]",
    faqItem: ".faq details",
    prefectureMenu: ".prefecture-menu",
    prefectureOption: ".prefecture-option",
    prefecturePicker: ".prefecture-picker",
    prefectureSelect: 'select[name="都道府県"]',
    prefectureTrigger: ".prefecture-trigger",
  };

  const setPickerOpen = (picker, isOpen) => {
    const trigger = picker.querySelector(SELECTORS.prefectureTrigger);
    const menu = picker.querySelector(SELECTORS.prefectureMenu);

    picker.classList.toggle("is-open", isOpen);
    trigger?.setAttribute("aria-expanded", String(isOpen));
    if (menu) menu.hidden = !isOpen;
  };

  const closePrefecturePickers = (except = null) => {
    document
      .querySelectorAll(`${SELECTORS.prefecturePicker}.is-open`)
      .forEach((picker) => {
        if (picker !== except) setPickerOpen(picker, false);
      });
  };

  const initFaqAccordion = () => {
    const items = Array.from(document.querySelectorAll(SELECTORS.faqItem));

    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  };

  const initPrefecturePicker = (select, index) => {
    if (select.hasAttribute("data-native-prefecture")) return;
    if (select.dataset.enhanced === "true") return;

    select.dataset.enhanced = "true";
    select.classList.add("prefecture-native");

    const picker = document.createElement("div");
    picker.className = "prefecture-picker";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "prefecture-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `prefecture-menu-${index}`);
    trigger.textContent = select.options[select.selectedIndex].text;

    const menu = document.createElement("div");
    menu.id = `prefecture-menu-${index}`;
    menu.className = "prefecture-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    const getOptions = () =>
      Array.from(menu.querySelectorAll(SELECTORS.prefectureOption));

    const focusOption = (targetIndex) => {
      const options = getOptions();
      if (!options.length) return;

      const normalizedIndex = (targetIndex + options.length) % options.length;
      options[normalizedIndex].focus();
    };

    const toggleMenu = (forceOpen) => {
      const isOpen = forceOpen ?? !picker.classList.contains("is-open");
      closePrefecturePickers(isOpen ? picker : null);
      setPickerOpen(picker, isOpen);
    };

    Array.from(select.options)
      .slice(1)
      .forEach((option) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "prefecture-option";
        item.dataset.value = option.value;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(option.selected));
        item.textContent = option.text;

        item.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          picker.classList.remove("is-invalid");
          setPickerOpen(picker, false);
          trigger.focus();
        });

        menu.appendChild(item);
      });

    select.addEventListener("change", () => {
      const selectedOption = select.options[select.selectedIndex];
      trigger.textContent = selectedOption.text;

      getOptions().forEach((item) => {
        item.setAttribute(
          "aria-selected",
          String(item.dataset.value === select.value),
        );
      });
    });

    trigger.addEventListener("click", () => toggleMenu());
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!picker.classList.contains("is-open")) toggleMenu(true);
        requestAnimationFrame(() =>
          focusOption(event.key === "ArrowDown" ? 0 : -1),
        );
      } else if (
        event.key === "Escape" &&
        picker.classList.contains("is-open")
      ) {
        event.preventDefault();
        toggleMenu(false);
      }
    });

    menu.addEventListener("keydown", (event) => {
      const options = getOptions();
      const currentIndex = options.indexOf(document.activeElement);
      const keyActions = {
        ArrowDown: () => focusOption(currentIndex + 1),
        ArrowUp: () => focusOption(currentIndex - 1),
        End: () => focusOption(-1),
        Home: () => focusOption(0),
      };

      if (keyActions[event.key]) {
        event.preventDefault();
        keyActions[event.key]();
      } else if (event.key === "Escape") {
        event.preventDefault();
        toggleMenu(false);
        trigger.focus();
      }
    });

    select.addEventListener("invalid", (event) => {
      event.preventDefault();
      closePrefecturePickers(picker);
      picker.classList.add("is-invalid");
      setPickerOpen(picker, true);
      trigger.focus();
    });

    picker.append(trigger, menu);
    select.insertAdjacentElement("afterend", picker);
  };

  const initPrefecturePickers = () => {
    document
      .querySelectorAll(SELECTORS.prefectureSelect)
      .forEach(initPrefecturePicker);

    document.addEventListener("click", (event) => {
      if (!event.target.closest(SELECTORS.prefecturePicker))
        closePrefecturePickers();
    });
  };

  const initContactForms = () => {
    document.querySelectorAll(SELECTORS.contactForm).forEach((form) => {
      const submit = form.querySelector('button[type="submit"]');
      if (!submit) return;

      form.addEventListener("submit", () => {
        submit.disabled = true;
        submit.setAttribute("aria-busy", "true");
        submit.textContent = "送信中…";
      });
    });
  };

  initFaqAccordion();
  initPrefecturePickers();
  initContactForms();
})();
