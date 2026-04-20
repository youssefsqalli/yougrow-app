(function () {
  const STORAGE_KEY = "vat_app_v1";
  const MAX_APPS_PER_LIST = 10;

  function normalizeSyncCode(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 48);
  }

  function getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function safeMinutes(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n);
  }

  function normalizeAppList(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => ({
        name: String(item && item.name ? item.name : "App").slice(0, 60),
        minutes: safeMinutes(item && item.minutes),
      }))
      .filter((item) => item.minutes > 0)
      .slice(0, MAX_APPS_PER_LIST);
  }

  function totalMinutes(list) {
    return (Array.isArray(list) ? list : []).reduce((sum, app) => sum + safeMinutes(app.minutes), 0);
  }

  function readLocalConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const firebaseCfg = parsed && parsed.settings && parsed.settings.firebase ? parsed.settings.firebase : null;
      const syncCode = normalizeSyncCode(parsed && parsed.settings ? parsed.settings.syncCode : "");

      if (!firebaseCfg || !syncCode) return null;
      if (!(firebaseCfg.apiKey && firebaseCfg.authDomain && firebaseCfg.projectId && firebaseCfg.messagingSenderId && firebaseCfg.appId)) {
        return null;
      }

      return {
        firebase: {
          apiKey: String(firebaseCfg.apiKey || ""),
          authDomain: String(firebaseCfg.authDomain || ""),
          projectId: String(firebaseCfg.projectId || ""),
          messagingSenderId: String(firebaseCfg.messagingSenderId || ""),
          appId: String(firebaseCfg.appId || ""),
        },
        syncCode,
      };
    } catch (_) {
      return null;
    }
  }

  function pickDocData(snapshot) {
    if (snapshot && snapshot.exists) return snapshot.data() || null;
    return null;
  }

  async function readScreenTimeDoc(db, syncCode) {
    const todayKey = getTodayKey();
    const ref = db.collection("syncSpaces").doc(syncCode).collection("screenTime").doc(todayKey);
    const snap = await ref.get();
    let data = pickDocData(snap);
    if (data) return data;

    const recent = await db
      .collection("syncSpaces")
      .doc(syncCode)
      .collection("screenTime")
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();

    if (!recent.empty) {
      data = recent.docs[0].data() || null;
    }
    return data;
  }

  function buildDashboardFromCloud(data) {
    const addictive = normalizeAppList(data && data.addictiveApps);
    const useful = normalizeAppList(data && data.usefulApps);

    if (!addictive.length && !useful.length) {
      return null;
    }

    const addictiveTotal = totalMinutes(addictive);
    const usefulTotal = totalMinutes(useful);
    const creditBase = 120;
    const credits = Math.max(0, creditBase + usefulTotal - addictiveTotal);

    return {
      credits,
      addictiveApps: addictive,
      usefulApps: useful,
    };
  }

  async function syncHomeFromCloud() {
    const cfg = readLocalConfig();
    if (!cfg || typeof firebase === "undefined") return;

    if (!firebase.apps.length) {
      firebase.initializeApp(cfg.firebase);
    }

    const db = firebase.firestore();
    const cloudDoc = await readScreenTimeDoc(db, cfg.syncCode);
    const dashboard = buildDashboardFromCloud(cloudDoc);
    if (!dashboard) return;

    if (window.YouGrowHome && typeof window.YouGrowHome.renderDashboard === "function") {
      window.YouGrowHome.renderDashboard(dashboard);
    }
  }

  syncHomeFromCloud().catch(() => {});
})();
