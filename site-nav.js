/* PDFBreeze shared navigation: tool tabs, mobile menu and desktop dropdowns.
   Loaded on every page (before script.js where that is used) so menus keep
   working even on pages that do not need the full application script. */
(() => {
if (window.__pdfbreezeNavReady) return;
window.__pdfbreezeNavReady = true;

const tabs = document.querySelectorAll('.tool-tab');
const panels = document.querySelectorAll('.tool-panel');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(item => item.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(tab.dataset.target).classList.add('active');
}));


const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
if (menuButton && mobileMenu) {
  const closeMobileMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
  };

  menuButton.addEventListener('click', event => {
    event.stopPropagation();
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    mobileMenu.hidden = open;
  });

  mobileMenu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMobileMenu();
  });

  document.addEventListener('pointerdown', event => {
    if (!mobileMenu.hidden && !mobileMenu.contains(event.target) && !menuButton.contains(event.target)) {
      closeMobileMenu();
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMobileMenu();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const dropdowns = Array.from(document.querySelectorAll('.desktop-nav .nav-dropdown'));

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      const shouldOpen = !dropdown.classList.contains('is-open');

      dropdowns.forEach(other => {
        other.classList.remove('is-open');
        const otherToggle = other.querySelector('.nav-dropdown-toggle');
        if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
      });

      if (shouldOpen) {
        dropdown.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.desktop-nav .nav-dropdown')) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('is-open');
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('is-open');
      const toggle = dropdown.querySelector('.nav-dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });
});
})();
