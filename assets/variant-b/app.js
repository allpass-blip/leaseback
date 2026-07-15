document.querySelectorAll('.faq details').forEach((item) => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      document.querySelectorAll('.faq details').forEach((other) => {
        if (other !== item) other.open = false;
      });
    }
  });
});

const closePrefecturePickers = (except) => {
  document.querySelectorAll('.prefecture-picker.is-open').forEach((picker) => {
    if (picker === except) return;
    picker.classList.remove('is-open');
    picker.querySelector('.prefecture-trigger').setAttribute('aria-expanded', 'false');
    picker.querySelector('.prefecture-menu').hidden = true;
  });
};

document.querySelectorAll('select[name="prefecture"]').forEach((select, index) => {
  if (select.dataset.enhanced === 'true') return;
  select.dataset.enhanced = 'true';
  select.classList.add('prefecture-native');

  const picker = document.createElement('div');
  picker.className = 'prefecture-picker';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'prefecture-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', `prefecture-menu-${index}`);
  trigger.textContent = select.options[select.selectedIndex].text;

  const menu = document.createElement('div');
  menu.id = `prefecture-menu-${index}`;
  menu.className = 'prefecture-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;

  Array.from(select.options).slice(1).forEach((option) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'prefecture-option';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(option.selected));
    item.textContent = option.text;
    item.addEventListener('click', () => {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      trigger.textContent = option.text;
      menu.querySelectorAll('.prefecture-option').forEach((other) => {
        other.setAttribute('aria-selected', String(other === item));
      });
      picker.classList.remove('is-open', 'is-invalid');
      trigger.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      trigger.focus();
    });
    menu.appendChild(item);
  });

  const toggleMenu = () => {
    const opening = !picker.classList.contains('is-open');
    closePrefecturePickers(opening ? picker : null);
    picker.classList.toggle('is-open', opening);
    trigger.setAttribute('aria-expanded', String(opening));
    menu.hidden = !opening;
  };

  trigger.addEventListener('click', toggleMenu);
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && !picker.classList.contains('is-open')) {
      event.preventDefault();
      toggleMenu();
    }
    if (event.key === 'Escape' && picker.classList.contains('is-open')) {
      event.preventDefault();
      toggleMenu();
    }
  });

  select.addEventListener('invalid', (event) => {
    event.preventDefault();
    closePrefecturePickers(picker);
    picker.classList.add('is-open', 'is-invalid');
    trigger.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    trigger.focus();
  });

  picker.append(trigger, menu);
  select.insertAdjacentElement('afterend', picker);
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.prefecture-picker')) closePrefecturePickers();
});
