(function () {
  const nav = document.querySelector(".app-nav");
  if (!nav) return;

  const items = Array.from(nav.querySelectorAll(".nav-item"));
  if (!items.length) return;
  const STORAGE_KEY = "yougrow_nav_last_index";

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.classList.contains("active"))
  );

  const indicator = document.createElement("span");
  indicator.className = "app-nav-indicator";
  nav.appendChild(indicator);

  function getReferrerIndex() {
    const ref = String(document.referrer || "");
    if (!ref) return null;
    const map = [
      { pattern: "index.html", index: 0 },
      { pattern: "daily5.html", index: 1 },
      { pattern: "tasks.html", index: 2 },
      { pattern: "calendar.html", index: 3 },
      { pattern: "settings.html", index: 4 },
    ];
    const hit = map.find((item) => ref.includes(item.pattern));
    return hit ? hit.index : null;
  }

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
  const referrerIndex = getReferrerIndex();
  const hasPrev = Number.isInteger(previousIndex) && previousIndex >= 0 && previousIndex < items.length;
  const startIndex = hasPrev ? previousIndex : Number.isInteger(referrerIndex) ? referrerIndex : activeIndex;

  if (startIndex !== activeIndex) {
    setIndicator(startIndex);
    requestAnimationFrame(() => {
      indicator.classList.add("is-ready");
      setIndicator(activeIndex);
    });
  } else {
    setIndicator(activeIndex);
    indicator.classList.add("is-ready");
  }

  sessionStorage.setItem(STORAGE_KEY, String(activeIndex));
  items.forEach((item, index) => {
    item.addEventListener("click", () => {
      sessionStorage.setItem(STORAGE_KEY, String(index));
    });
  });

  window.addEventListener("resize", () => {
    setIndicator(activeIndex);
  });
})();
