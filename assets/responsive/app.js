document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq-item__q').forEach((button) => {
    button.addEventListener('click', () => {
      const item = button.closest('.faq-item');
      const isOpen = item.classList.contains('is-open');
      const siblings = item.parentElement?.querySelectorAll('.faq-item') || [];
      siblings.forEach((sib) => {
        sib.classList.remove('is-open');
        const btn = sib.querySelector('.faq-item__q');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
});
