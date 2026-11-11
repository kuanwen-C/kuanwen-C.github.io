import "./style.css";
import { AVATAR } from "./avatar-data";
import { initDots } from "./dots";
import { HIKE } from "./hike-data";
import { initTerminal, resumeExists } from "./terminal";

document.documentElement.classList.add("js");

const avatar = document.getElementById("avatar");
if (avatar instanceof HTMLCanvasElement) initDots(avatar, AVATAR);

const hike = document.getElementById("hike");
if (hike instanceof HTMLCanvasElement) initDots(hike, HIKE);

initTerminal();

// Fade cards in as they scroll into view
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("in");
      observer.unobserve(entry.target);
    }
  },
  { threshold: 0.12 },
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// Only show the resume buttons once a resume.pdf has actually been added to public/
void resumeExists().then((exists) => {
  if (!exists) return;
  document.querySelectorAll<HTMLElement>("[data-resume]").forEach((link) => (link.hidden = false));
});

// Thin progress bar along the top edge
const progress = document.querySelector<HTMLElement>(".progress");
function updateProgress(): void {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress?.style.setProperty("--p", max > 0 ? String(Math.min(1, window.scrollY / max)) : "0");
}
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

// Highlight the nav link of the section currently in view
const nav = document.querySelector<HTMLElement>(".nav nav");
const links = new Map<string, HTMLAnchorElement>();
nav?.querySelectorAll<HTMLAnchorElement>("a[href^='#']").forEach((a) => links.set(a.hash.slice(1), a));

// Wide screens also get a rail of section dots on the right edge, built from the same links
const rail = document.querySelector<HTMLElement>(".rail");
const railLinks = new Map<string, HTMLAnchorElement>();
links.forEach((link, id) => {
  if (!rail) return;
  const dot = document.createElement("a");
  dot.href = `#${id}`;
  const label = document.createElement("span");
  label.textContent = link.textContent;
  dot.appendChild(label);
  rail.appendChild(dot);
  railLinks.set(id, dot);
});

const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((a) => a.classList.remove("active"));
      railLinks.forEach((a) => a.classList.remove("active"));
      railLinks.get(entry.target.id)?.classList.add("active");
      const link = links.get(entry.target.id);
      if (!link || !nav) continue;
      link.classList.add("active");
      // On phones the links scroll sideways: keep the active one in view
      nav.scrollTo({ left: link.offsetLeft - (nav.clientWidth - link.clientWidth) / 2, behavior: "smooth" });
    }
  },
  { rootMargin: "-40% 0px -55% 0px" },
);
links.forEach((_, id) => {
  const section = document.getElementById(id);
  if (section) spy.observe(section);
});

// Warm spotlight that follows the pointer across cards
document.addEventListener(
  "pointermove",
  (e) => {
    const card = (e.target as Element | null)?.closest<HTMLElement>(".card, .contact-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    card.style.setProperty("--my", `${e.clientY - rect.top}px`);
  },
  { passive: true },
);
