document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".variety-toggle");
  if (!toggle || toggle.getAttribute("aria-expanded") === "true") return;

  window.setTimeout(() => {
    const drawer = document.querySelector(".variety-drawer");
    if (!drawer) return;
    drawer.style.scrollMarginTop = "6rem";
    drawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, 80);
});
