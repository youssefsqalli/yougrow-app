(function () {
  const data = {
    credits: 60,
    addictiveApps: [
      { name: "Instagram", minutes: 15 },
      { name: "TikTok", minutes: 7 },
      { name: "YouTube", minutes: 8 },
    ],
    usefulApps: [
      { name: "Gym (Samsung Health)", minutes: 60 },
      { name: "Blinkist", minutes: 15 },
      { name: "ChatGPT", minutes: 15 },
    ],
  };

  const els = {
    heroMount: document.getElementById("heroMount"),
    addictiveMount: document.getElementById("addictiveMount"),
    usefulMount: document.getElementById("usefulMount"),
  };

  function totalMinutes(apps) {
    return (Array.isArray(apps) ? apps : []).reduce((sum, app) => sum + (Number(app.minutes) || 0), 0);
  }

  function getAppKey(name) {
    const n = String(name || "").toLowerCase();
    if (n.includes("instagram")) return "instagram";
    if (n.includes("tiktok")) return "tiktok";
    if (n.includes("youtube")) return "youtube";
    if (n.includes("samsung health") || n.includes("gym")) return "samsung-health";
    if (n.includes("blinkist")) return "blinkist";
    if (n.includes("chatgpt")) return "chatgpt";
    return "generic";
  }

  function makeLogoSvg(appKey) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");

    function path(d) {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    }

    function circle(cx, cy, r) {
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", String(cx));
      c.setAttribute("cy", String(cy));
      c.setAttribute("r", String(r));
      svg.appendChild(c);
    }

    if (appKey === "instagram") {
      path("M7 3.8h10a3.2 3.2 0 0 1 3.2 3.2v10A3.2 3.2 0 0 1 17 20.2H7A3.2 3.2 0 0 1 3.8 17V7A3.2 3.2 0 0 1 7 3.8z");
      circle(12, 12, 3.5);
      circle(17.2, 6.8, 0.9);
      return svg;
    }
    if (appKey === "tiktok") {
      path("M13.5 5v8.6a3.1 3.1 0 1 1-2.2-2.9");
      path("M13.5 7.2a4.6 4.6 0 0 0 3.7 1.8");
      return svg;
    }
    if (appKey === "youtube") {
      path("M4.5 8.4A2.4 2.4 0 0 1 6.9 6h10.2a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H6.9a2.4 2.4 0 0 1-2.4-2.4z");
      path("M10 9.4l5 2.6-5 2.6z");
      return svg;
    }
    if (appKey === "samsung-health") {
      path("M12 20s-6.5-4.2-6.5-8.9A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 6.5 3.1C18.5 15.8 12 20 12 20z");
      return svg;
    }
    if (appKey === "blinkist") {
      path("M6 7h5.5a3 3 0 0 1 3 3v7H9a3 3 0 0 0-3 3z");
      path("M18 7h-5.5a3 3 0 0 0-3 3v7H15a3 3 0 0 1 3 3z");
      return svg;
    }
    if (appKey === "chatgpt") {
      path("M12 4.3l3.2 1.9v3.6L12 11.7 8.8 9.8V6.2z");
      path("M8.8 9.8v3.6L12 15.3l3.2-1.9");
      path("M8.8 13.4L6 15v3.2l2.8 1.6L12 18.1l3.2 1.7L18 18.2V15l-2.8-1.6");
      return svg;
    }
    path("M4 12h16");
    path("M12 4v16");
    return svg;
  }

  function renderProgressBar(value, max, tone) {
    const track = document.createElement("div");
    track.className = "home-progress";

    const fill = document.createElement("div");
    fill.className = `home-progress-fill ${tone}`;

    const safeMax = Math.max(1, Number(max) || 1);
    const safeValue = Math.max(0, Number(value) || 0);
    const pct = Math.max(0, Math.min(100, (safeValue / safeMax) * 100));
    fill.style.width = `${pct}%`;

    track.appendChild(fill);
    return track;
  }

  function renderAppRow(app, tone) {
    const appKey = getAppKey(app.name);
    const row = document.createElement("article");
    row.className = "home-app-row";

    const main = document.createElement("div");
    main.className = "home-app-main";

    const left = document.createElement("div");
    left.className = "home-app-left";

    const icon = document.createElement("span");
    icon.className = `home-app-icon ${tone} app-${appKey}`;
    icon.appendChild(makeLogoSvg(appKey));

    const name = document.createElement("span");
    name.className = "home-app-name";
    name.textContent = app.name;

    left.appendChild(icon);
    left.appendChild(name);

    const right = document.createElement("div");
    right.className = "home-app-minutes";
    right.textContent = `${app.minutes} min`;

    main.appendChild(left);
    main.appendChild(right);
    row.appendChild(main);
    return row;
  }

  function renderHeader(credits, distractionTotal, growthTotal) {
    els.heroMount.innerHTML = "";

    const label = document.createElement("p");
    label.className = "home-label";
    label.textContent = "Credits remaining";

    const value = document.createElement("p");
    value.className = "home-credits-value";
    value.textContent = String(Math.max(0, Number(credits) || 0));

    const meta = document.createElement("p");
    meta.className = "home-credits-meta";
    meta.textContent = `${distractionTotal} min distraction · ${growthTotal} min growth`;

    els.heroMount.appendChild(label);
    els.heroMount.appendChild(value);
    els.heroMount.appendChild(meta);
  }

  function renderSection(mount, config) {
    mount.innerHTML = "";
    mount.classList.toggle("disabled", Boolean(config.disabled));

    const header = document.createElement("div");
    header.className = "home-section-head";
    const title = document.createElement("h2");
    title.textContent = `${config.title} · ${config.total} min`;
    header.appendChild(title);
    mount.appendChild(header);

    mount.appendChild(renderProgressBar(config.total, config.maxTotal, config.tone));

    const list = document.createElement("div");
    list.className = "home-list";
    if (!config.apps.length) {
      const empty = document.createElement("p");
      empty.className = "home-empty";
      empty.textContent = "No apps yet.";
      list.appendChild(empty);
    } else {
      config.apps.forEach((app) => list.appendChild(renderAppRow(app, config.tone)));
    }
    mount.appendChild(list);
  }

  function renderDashboard(state) {
    const addictiveApps = Array.isArray(state.addictiveApps) ? state.addictiveApps : [];
    const usefulApps = Array.isArray(state.usefulApps) ? state.usefulApps : [];
    const credits = Math.max(0, Number(state.credits) || 0);
    const distractionTotal = totalMinutes(addictiveApps);
    const growthTotal = totalMinutes(usefulApps);
    const maxTotal = Math.max(distractionTotal, growthTotal, 1);

    renderHeader(credits, distractionTotal, growthTotal);
    renderSection(els.addictiveMount, {
      title: "Distraction",
      total: distractionTotal,
      maxTotal,
      tone: "warn",
      apps: addictiveApps,
      disabled: credits === 0,
    });
    renderSection(els.usefulMount, {
      title: "Growth",
      total: growthTotal,
      maxTotal,
      tone: "good",
      apps: usefulApps,
      disabled: false,
    });
  }

  renderDashboard(data);
})();
