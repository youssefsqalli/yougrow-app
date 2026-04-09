(function () {
  const nav = document.querySelector(".app-nav");
  if (!nav) return;

  const items = Array.from(nav.querySelectorAll(".nav-item"));
  if (!items.length) return;

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.classList.contains("active"))
  );

  const indicator = document.createElement("span");
  indicator.className = "app-nav-indicator";
  nav.appendChild(indicator);

  const STORAGE_KEY = "yougrow_nav_last_index";

  function setIndicator(index) {
    const item = items[index];
    if (!item) return;
    const navRect = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const inset = 3;
    const width = Math.max(0, itemRect.width - inset * 2);
    const x = itemRect.left - navRect.left + inset;
    indicator.style.width = `${width}px`;
    indicator.style.transform = `translateX(${x}px)`;
  }

  const previousRaw = sessionStorage.getItem(STORAGE_KEY);
  const previousIndex = Number.parseInt(previousRaw || "", 10);
  const hasPrev = Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < items.length;

  if (hasPrev && previousIndex !== activeIndex) {
    setIndicator(previousIndex);
    requestAnimationFrame(() => {
      indicator.classList.add("is-ready");
      setIndicator(activeIndex);
    });
  } else {
    setIndicator(activeIndex);
    indicator.classList.add("is-ready");
  }

  sessionStorage.setItem(STORAGE_KEY, String(activeIndex));

  window.addEventListener("resize", () => {
    setIndicator(activeIndex);
  });
})();
