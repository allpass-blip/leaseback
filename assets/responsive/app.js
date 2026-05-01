document.addEventListener('DOMContentLoaded', () => {
  const revealTargets = [
    '.hero__content',
    '.hero__visual',
    '.trust-item',
    '.worries__intro',
    '.worries__list li',
    '.process-card',
    '.reason-card',
    '.merit-feature',
    '.merit-row',
    '.flow-card',
    '.faq-item',
    '.cta-card',
    '.footer__feature',
  ];

  const items = document.querySelectorAll(revealTargets.join(','));
  items.forEach((item, index) => {
    item.classList.add('js-reveal');
    item.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 70}ms`);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add('is-visible'));
  }

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
