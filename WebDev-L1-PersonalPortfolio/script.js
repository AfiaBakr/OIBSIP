// ---------- Mobile nav toggle ----------
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('is-open');
  navToggle.classList.toggle('is-active', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    navToggle.classList.remove('is-active');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ---------- Scroll-spy: highlight the active nav link ----------
const sections = document.querySelectorAll('main section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');

const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navAnchors.forEach((a) => {
        a.classList.toggle('is-active-link', a.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: '-45% 0px -50% 0px' }
);

sections.forEach((section) => spy.observe(section));

// ---------- Reveal-on-scroll animations ----------
const revealTargets = document.querySelectorAll(
  '.about__card, .skills__group, .project-card, .contact__card'
);

const reveal = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealTargets.forEach((el) => {
  el.classList.add('reveal');
  reveal.observe(el);
});

// ---------- Back-to-top button ----------
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  backToTop.classList.toggle('is-visible', window.scrollY > 400);
});

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---------- Footer year ----------
document.getElementById('year').textContent = new Date().getFullYear();
