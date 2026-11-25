const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector("#mobile-nav");
const projectTrack = document.querySelector(".project-track");
const projectDialog = document.querySelector(".project-dialog");
const dialogContent = document.querySelector(".dialog-content");
const contactForm = document.querySelector("#contact-form");

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem("portfolio-theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch (error) {
    console.warn("Could not read the saved portfolio theme.", error);
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setTheme(theme) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  themeToggle.title = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;

  try {
    window.localStorage.setItem("portfolio-theme", theme);
  } catch (error) {
    console.error("Could not save the selected portfolio theme.", error);
  }
}

setTheme(getInitialTheme());

themeToggle.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

function setMenuOpen(isOpen) {
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  mobileNav.hidden = !isOpen;
}

menuToggle.addEventListener("click", () => {
  setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1280) setMenuOpen(false);
});

const sectionLinks = [...document.querySelectorAll(".desktop-nav a, .mobile-nav a")];
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleSection = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visibleSection) return;

      const activeHref = `#${visibleSection.target.id}`;
      sectionLinks.forEach((link) => {
        if (link.getAttribute("href") === activeHref) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    },
    { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
  );

  sections.forEach((section) => sectionObserver.observe(section));

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );

  document.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 70}ms`;
    revealObserver.observe(element);
  });
} else {
  document.querySelectorAll(".reveal").forEach((element) => {
    element.classList.add("is-visible");
  });
}

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => {
    const amount = Math.min(projectTrack.clientWidth * 0.82, 420);
    projectTrack.scrollBy({
      left: Number(button.dataset.scroll) * amount,
      behavior: "smooth",
    });
  });
});

projectTrack.addEventListener(
  "wheel",
  (event) => {
    if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    projectTrack.scrollBy({ left: event.deltaY });
  },
  { passive: false },
);

document.querySelectorAll(".project-details").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".project-card");
    const details = [
      card.querySelector(".project-number"),
      card.querySelector("h3"),
      card.querySelector(".project-stack"),
      card.querySelector(".project-description"),
      card.querySelector(".project-award"),
    ]
      .filter(Boolean)
      .map((element) => element.cloneNode(true));

    details[1].id = "project-dialog-title";
    dialogContent.replaceChildren(...details);
    projectDialog.showModal();
  });
});

projectDialog.addEventListener("click", (event) => {
  if (event.target === projectDialog) projectDialog.close();
});

projectDialog.addEventListener("close", () => dialogContent.replaceChildren());
document.querySelector(".dialog-close").addEventListener("click", () => projectDialog.close());

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");
  const subject = encodeURIComponent(`Portfolio message from ${name}`);
  const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);

  document.querySelector(".form-status").textContent = "Opening your email app…";
  window.location.href = `mailto:sharmilasomus@gmail.com?subject=${subject}&body=${body}`;
  contactForm.reset();
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
