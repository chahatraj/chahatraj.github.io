"use strict";

const themeToggle = document.querySelector(".theme-toggle");
const dialogToggle = themeToggle.cloneNode(true);
dialogToggle.classList.add("dialog-theme-toggle");
document.querySelector(".dialog-page").append(dialogToggle);
const themeToggles = [themeToggle, dialogToggle];

function updateThemeToggle() {
  const dark = document.documentElement.classList.contains("dark-theme");
  themeToggles.forEach((button) => {
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  });
}

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark-theme");
  try {
    localStorage.setItem("site-theme", dark ? "dark" : "light");
  } catch (error) {
    // The toggle still works for this visit when storage is unavailable.
  }
  updateThemeToggle();
}

themeToggles.forEach((button) => button.addEventListener("click", toggleTheme));

updateThemeToggle();
