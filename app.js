(function () {
  const MAX_TASKS = 5;
  const DAY_STRIP_COUNT = 30;
  const DEFAULT_REMINDER_TIME = "08:00";
  const STORAGE_KEY = "vat_app_v1";
  const DAILY5_AI_ENDPOINT = "https://yougrow.ysqalli21.workers.dev/";
  const DAILY5_TOPIC_RULES_PROMPT = [
    "You are generating Daily Five from live retrieval (RAG) only.",
    "Generate exactly 5 questions based on latest factual updates from selected topics.",
    "STRICT: no generic or evergreen theory questions; every question must reference a concrete recent update/event/product.",
    "STRICT: format allowed only: mcq, true_false, fill_blank, short_answer.",
    "STRICT: include format variety, with at least one mcq, one true_false, one fill_blank, and one short_answer.",
    "STRICT: no duplicated fact/update within the set.",
    "STRICT: avoid all previously used fact keys sent in avoidFacts.",
    "Each item must include associatedTopic, format, type, title, body(question), explanation, wrongExplanation, visualBullets(3-4), and sources (at least one URL).",
    "If format is mcq include options and one correct answer.",
    "If format is fill_blank or short_answer include acceptedAnswers (array) and correctAnswer (string).",
    "If format is true_false include correctValue boolean.",
    "If one item is off-topic or generic the whole set is invalid.",
  ].join(" ");
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const TASK_ICON_SVG = {
    generic: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8'></circle><path d='M8.5 12l2.2 2.2L15.5 10'></path></svg>",
    work: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='4' y='7' width='16' height='11' rx='2'></rect><path d='M9 7V5h6v2M4 12h16'></path></svg>",
    meeting: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h11a2 2 0 0 1 2 2v8H4z'></path><path d='M17 10l3-2v8l-3-2'></path></svg>",
    call: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3h4l2 5-2 2a14 14 0 0 0 4 4l2-2 5 2v4a2 2 0 0 1-2 2C11 20 4 13 4 5a2 2 0 0 1 2-2z'></path></svg>",
    mail: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='6' width='18' height='12' rx='2'></rect><path d='M4 8l8 6 8-6'></path></svg>",
    calendar: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='4.5' width='18' height='16' rx='2'></rect><path d='M3 9h18M8 3v3M16 3v3'></path></svg>",
    plan: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8'></circle><path d='M12 8v4l3 2'></path></svg>",
    write: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 20h4l10-10-4-4L4 16v4z'></path><path d='M13 7l4 4'></path></svg>",
    learn: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 6h7a3 3 0 0 1 3 3v9H7a3 3 0 0 0-3 3z'></path><path d='M20 6h-7a3 3 0 0 0-3 3v9h7a3 3 0 0 1 3 3z'></path></svg>",
    read: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 5h9a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3z'></path></svg>",
    code: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12'></path></svg>",
    chart: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 19h16'></path><rect x='6' y='11' width='2.8' height='6'></rect><rect x='10.6' y='8' width='2.8' height='9'></rect><rect x='15.2' y='5' width='2.8' height='12'></rect></svg>",
    money: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='6' width='18' height='12' rx='2'></rect><circle cx='12' cy='12' r='3'></circle></svg>",
    finance: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 19h16M6 15l3-4 3 2 5-6'></path></svg>",
    fitness: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 10v4M20 10v4M7 9v6M17 9v6M9 12h6'></path></svg>",
    tennis: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8'></circle><path d='M7 7c2 2 2 8 0 10M17 7c-2 2-2 8 0 10'></path></svg>",
    football: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8'></circle><path d='M9 9h6l1 3-4 3-4-3z'></path></svg>",
    swim: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 15c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0'></path><path d='M10 11l2-3 2 3'></path></svg>",
    home: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 11l8-6 8 6'></path><path d='M6 10v9h12v-9'></path></svg>",
    family: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='8' cy='9' r='2'></circle><circle cx='16' cy='9' r='2'></circle><path d='M4.5 18a3.5 3.5 0 0 1 7 0M12.5 18a3.5 3.5 0 0 1 7 0'></path></svg>",
    pet: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='8' cy='8' r='1.5'></circle><circle cx='16' cy='8' r='1.5'></circle><circle cx='6' cy='12' r='1.5'></circle><circle cx='18' cy='12' r='1.5'></circle><path d='M8 17c0-2 2-3 4-3s4 1 4 3-2 3-4 3-4-1-4-3z'></path></svg>",
    health: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 20s-7-4.6-7-9.8A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7 3.2C19 15.4 12 20 12 20z'></path></svg>",
    food: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 3v8M9 3v8M7.5 11V21'></path><path d='M15 3c2 2 2 6 0 8v10'></path></svg>",
    water: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 4s5 5 5 9a5 5 0 1 1-10 0c0-4 5-9 5-9z'></path></svg>",
    sleep: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M15 6h5l-5 6h5'></path><path d='M4 14a6 6 0 0 0 10 4 7 7 0 1 1-10-4z'></path></svg>",
    meditation: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='7' r='2'></circle><path d='M8 21c0-2 1.5-4 4-4s4 2 4 4M8 14l2 2M16 14l-2 2M7 12l2-2M17 12l-2-2'></path></svg>",
    travel: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M2 14h20M10 14l-2 7M14 14l2 7'></path><path d='M12 3l4 11H8l4-11z'></path></svg>",
    car: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 14l2-5h12l2 5v4h-2a2 2 0 1 1-4 0h-4a2 2 0 1 1-4 0H4z'></path></svg>",
    shopping: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 6h15l-1.5 8h-11z'></path><path d='M6 6l-1-2H2M9 19a1.5 1.5 0 1 0 0 .1M17 19a1.5 1.5 0 1 0 0 .1'></path></svg>",
    clean: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 20h16M9 20v-8l3-3 3 3v8'></path><path d='M10 8l2-4 2 4'></path></svg>",
    idea: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3a6 6 0 0 0-4 10c1 1 1.5 2 1.5 3h5c0-1 0.5-2 1.5-3a6 6 0 0 0-4-10z'></path><path d='M9.5 18h5M10 21h4'></path></svg>",
    rocket: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M14 4c3 0 6 3 6 6-4 1-7 4-8 8-3 0-6-3-6-6 4-1 7-4 8-8z'></path><path d='M8 16l-3 3M10 18l-4 1 1-4'></path></svg>",
    camera: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 8h4l2-2h6l2 2h4v10H3z'></path><circle cx='12' cy='13' r='3'></circle></svg>",
    music: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M9 18a2 2 0 1 1-2-2 2 2 0 0 1 2 2zM19 16a2 2 0 1 1-2-2 2 2 0 0 1 2 2z'></path><path d='M9 18V6l10-2v12'></path></svg>",
    lock: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='5' y='11' width='14' height='10' rx='2'></rect><path d='M8 11V8a4 4 0 1 1 8 0v3'></path></svg>",
    world: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='9'></circle><path d='M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'></path></svg>",
    inbox: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 5h16v14H4z'></path><path d='M4 14h5l2 3h2l2-3h5'></path></svg>",
    briefcase: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='7' width='18' height='12' rx='2'></rect><path d='M9 7V5h6v2'></path></svg>",
    target: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8'></circle><circle cx='12' cy='12' r='4'></circle><circle cx='12' cy='12' r='1.5'></circle></svg>",
  };
  const ICON_CHOICES = Object.keys(TASK_ICON_SVG);
  const ICON_KEYWORDS = {
    tennis: ["tennis", "padel", "racket", "racquet"],
    fitness: ["sport", "gym", "workout", "run", "fitness", "exercise", "training"],
    work: ["work", "client", "project", "proposal", "office", "job"],
    meeting: ["meeting", "zoom", "teams", "sync", "review call"],
    call: ["call", "phone", "ring", "dial"],
    mail: ["email", "inbox", "reply", "follow up", "follow-up", "message"],
    calendar: ["calendar", "schedule", "appointment", "date"],
    plan: ["plan", "strategy", "roadmap", "vision", "organize"],
    write: ["write", "draft", "note", "journal", "summary"],
    learn: ["study", "learn", "course", "class", "oracle", "ai", "blinkist"],
    read: ["read", "book", "article", "paper"],
    code: ["code", "dev", "deploy", "app", "bug", "build", "software"],
    chart: ["dashboard", "report", "kpi", "analytics"],
    money: ["money", "payment", "invoice", "budget", "expense"],
    finance: ["finance", "revenue", "profit", "sales"],
    home: ["home", "house"],
    family: ["family", "kids", "parent"],
    pet: ["dog", "cat", "pet"],
    health: ["health", "doctor", "clinic", "medicine", "wellness"],
    food: ["food", "meal", "cook", "diet", "eat"],
    water: ["water", "hydrate", "drink"],
    sleep: ["sleep", "rest", "bed"],
    meditation: ["meditate", "mindful", "breath", "relax"],
    travel: ["travel", "flight", "airplane", "trip"],
    car: ["car", "drive", "garage"],
    shopping: ["shop", "buy", "grocery", "cart"],
    clean: ["clean", "tidy", "organize room"],
    idea: ["idea", "brainstorm", "creative"],
    rocket: ["launch", "startup", "ship", "growth"],
    camera: ["photo", "camera", "shoot"],
    music: ["music", "piano", "song"],
    lock: ["secure", "password", "lock", "privacy"],
    world: ["global", "world", "country", "news"],
    inbox: ["mailbox", "inbox zero", "receive"],
    briefcase: ["business", "sales", "deal"],
    target: ["target", "goal", "objective", "focus"],
  };
  const TASK_CATEGORY_KEYWORDS = {
    Wellbeing: [
      "sport",
      "gym",
      "workout",
      "exercise",
      "run",
      "yoga",
      "meditation",
      "mindful",
      "wellness",
      "health",
      "eat healthy",
      "healthy",
      "diet",
      "sleep",
      "hydrate",
      "water",
      "walk",
      "stretch",
    ],
    Learning: [
      "learn",
      "learning",
      "study",
      "course",
      "read",
      "reading",
      "book",
      "blinkist",
      "article",
      "podcast",
      "training",
      "class",
      "research",
    ],
    Social: [
      "family",
      "friend",
      "friends",
      "social",
      "call mom",
      "call dad",
      "dinner",
      "date",
      "visit",
      "community",
      "networking",
    ],
    Work: [
      "work",
      "client",
      "project",
      "meeting",
      "email",
      "proposal",
      "report",
      "oracle",
      "deadline",
      "presentation",
      "sales",
      "follow up",
      "follow-up",
      "code review",
      "deploy",
    ],
    Hobbies: [
      "hobby",
      "music",
      "piano",
      "guitar",
      "photo",
      "camera",
      "painting",
      "draw",
      "cook",
      "chess",
      "gaming",
      "game",
      "travel",
      "writing",
    ],
  };
  const PAGE = document.body.dataset.page || "today";

  const state = loadState();
  let viewedMonth = startOfMonth(new Date());
  let selectedDayKey = getTodayKey();
  const fb = {
    app: null,
    messaging: null,
    firestore: null,
    ready: false,
  };

  const els = {
    todayLabel: document.getElementById("todayLabel"),
    notifyBtn: document.getElementById("notifyBtn"),
    reminderBanner: document.getElementById("reminderBanner"),
    taskForm: document.getElementById("taskForm"),
    taskInput: document.getElementById("taskInput"),
    taskList: document.getElementById("taskList"),
    clearTodayBtn: document.getElementById("clearTodayBtn"),
    donutProgress: document.getElementById("donutProgress"),
    donutLabel: document.getElementById("donutLabel"),
    progressText: document.getElementById("progressText"),
    weekdays: document.getElementById("weekdays"),
    calendarGrid: document.getElementById("calendarGrid"),
    monthLabel: document.getElementById("monthLabel"),
    prevMonthBtn: document.getElementById("prevMonthBtn"),
    nextMonthBtn: document.getElementById("nextMonthBtn"),
    reminderStart: document.getElementById("reminderStart"),
    firebaseForm: document.getElementById("firebaseForm"),
    fbApiKey: document.getElementById("fbApiKey"),
    fbAuthDomain: document.getElementById("fbAuthDomain"),
    fbProjectId: document.getElementById("fbProjectId"),
    fbMessagingSenderId: document.getElementById("fbMessagingSenderId"),
    fbAppId: document.getElementById("fbAppId"),
    fbVapidKey: document.getElementById("fbVapidKey"),
    saveFirebaseBtn: document.getElementById("saveFirebaseBtn"),
    connectPushBtn: document.getElementById("connectPushBtn"),
    pushStatusText: document.getElementById("pushStatusText"),
    syncCodeInput: document.getElementById("syncCodeInput"),
    saveSyncCodeBtn: document.getElementById("saveSyncCodeBtn"),
    syncNowBtn: document.getElementById("syncNowBtn"),
    syncStatusText: document.getElementById("syncStatusText"),
    archiveClearPastBtn: document.getElementById("archiveClearPastBtn"),
    archiveClearStatusText: document.getElementById("archiveClearStatusText"),
    dayStrip: document.getElementById("dayStrip"),
    iconRuleForm: document.getElementById("iconRuleForm"),
    ruleKeyword: document.getElementById("ruleKeyword"),
    ruleIconSelect: document.getElementById("ruleIconSelect"),
    iconPalette: document.getElementById("iconPalette"),
    toggleIconPaletteBtn: document.getElementById("toggleIconPaletteBtn"),
    iconRuleList: document.getElementById("iconRuleList"),
    toggleSavedRulesBtn: document.getElementById("toggleSavedRulesBtn"),
    daily5Topics: document.getElementById("daily5Topics"),
    daily5SelectedTopics: document.getElementById("daily5SelectedTopics"),
    daily5CustomTopic: document.getElementById("daily5CustomTopic"),
    daily5AddTopicBtn: document.getElementById("daily5AddTopicBtn"),
    daily5Prompt: document.getElementById("daily5Prompt"),
    daily5SavePromptBtn: document.getElementById("daily5SavePromptBtn"),
    daily5Endpoint: document.getElementById("daily5Endpoint"),
    daily5SaveEndpointBtn: document.getElementById("daily5SaveEndpointBtn"),
    daily5Feed: document.getElementById("daily5Feed"),
  };

  let showIconPalette = false;
  let showSavedRules = false;
  let daily5Generating = false;
  let daily5LastError = "";
  let scheduledFullSyncTimer = null;

  init();

  function init() {
    ensureDayPlan(getTodayKey());
    normalizeState();
    setupEvents();

    if (els.todayLabel) formatTodayLabel();
    if (els.weekdays) setupWeekdays();
    if (els.donutProgress) setupDonut();
    if (els.reminderStart) {
      els.reminderStart.value = state.settings.reminderStart;
    }
    renderFirebaseFields();
    renderSyncFields();

    registerServiceWorker();
    render();
    initFirebaseRuntime(false).then(async (ok) => {
      if (ok) {
        await syncCloudNow(false);
        await syncCloudStatus();
      } else {
        updateSyncStatus("Cloud sync is off. Save Firebase config first.");
      }
    });

    startReminderLoop();
  }

  function normalizeState() {
    if (!state.settings.reminderStart) {
      state.settings.reminderStart = DEFAULT_REMINDER_TIME;
    }

    if (!state.meta.startedOn) {
      state.meta.startedOn = getTodayKey();
    }

    if (!Array.isArray(state.settings.iconRules)) {
      state.settings.iconRules = [];
    }
    if (!state.settings.firebase) {
      state.settings.firebase = {
        apiKey: "",
        authDomain: "",
        projectId: "",
        messagingSenderId: "",
        appId: "",
        vapidKey: "",
      };
    }
    if (!state.settings.daily5) {
      state.settings.daily5 = {
        topics: [],
        customTopics: [],
        language: detectDeviceLanguage(),
        prompt: "",
        endpoint: DAILY5_AI_ENDPOINT,
      };
    }
    if (!Array.isArray(state.settings.daily5.topics)) {
      state.settings.daily5.topics = [];
    }
    if (!Array.isArray(state.settings.daily5.customTopics)) {
      state.settings.daily5.customTopics = [];
    }
    state.settings.daily5.language = detectDeviceLanguage();
    if (typeof state.settings.daily5.prompt !== "string") {
      state.settings.daily5.prompt = "";
    }
    if (typeof state.settings.daily5.endpoint !== "string") {
      state.settings.daily5.endpoint = DAILY5_AI_ENDPOINT;
    }
    const endpointValue = String(state.settings.daily5.endpoint || "").trim();
    if (!endpointValue || endpointValue.startsWith("/")) {
      state.settings.daily5.endpoint = DAILY5_AI_ENDPOINT;
    }
    if (typeof state.settings.syncCode !== "string") {
      state.settings.syncCode = "";
    }
    if (typeof state.settings.syncStatus !== "string") {
      state.settings.syncStatus = "";
    }
    if (!state.daily5ByDate) {
      state.daily5ByDate = {};
    }
    if (!state.meta.daily5Game) {
      state.meta.daily5Game = {
        xp: 0,
        streak: 0,
        totalSets: 0,
        lastCompletedDate: "",
      };
    }
    if (!state.meta.daily5UsedFacts || typeof state.meta.daily5UsedFacts !== "object") {
      state.meta.daily5UsedFacts = {};
    }
    if (!state.meta.todoDeletedDays || typeof state.meta.todoDeletedDays !== "object") {
      state.meta.todoDeletedDays = {};
    }

    syncOldTodayIntoHistory();
    saveState();
  }

  function setupEvents() {
    if (els.taskForm) {
      els.taskForm.addEventListener("submit", onAddTask);
    }

    if (els.clearTodayBtn) {
      els.clearTodayBtn.addEventListener("click", resetToday);
    }

    if (els.notifyBtn) {
      els.notifyBtn.addEventListener("click", askNotificationPermission);
    }

    if (els.prevMonthBtn) {
      els.prevMonthBtn.addEventListener("click", () => {
        viewedMonth = addMonths(viewedMonth, -1);
        renderCalendar();
      });
    }

    if (els.nextMonthBtn) {
      els.nextMonthBtn.addEventListener("click", () => {
        viewedMonth = addMonths(viewedMonth, 1);
        renderCalendar();
      });
    }

    if (els.reminderStart) {
      els.reminderStart.addEventListener("change", () => {
        state.settings.reminderStart = els.reminderStart.value || DEFAULT_REMINDER_TIME;
        saveState();
      });
    }
    if (els.saveFirebaseBtn) {
      els.saveFirebaseBtn.addEventListener("click", onSaveFirebaseConfig);
    }
    if (els.connectPushBtn) {
      els.connectPushBtn.addEventListener("click", onConnectPush);
    }
    if (els.saveSyncCodeBtn) {
      els.saveSyncCodeBtn.addEventListener("click", onSaveSyncCode);
    }
    if (els.syncNowBtn) {
      els.syncNowBtn.addEventListener("click", () => void syncCloudNow(true));
    }
    if (els.archiveClearPastBtn) {
      els.archiveClearPastBtn.addEventListener("click", onArchiveAndClearPastTodo);
    }

    if (els.iconRuleForm) {
      els.iconRuleForm.addEventListener("submit", onAddIconRule);
    }

    if (els.toggleIconPaletteBtn) {
      els.toggleIconPaletteBtn.addEventListener("click", () => {
        showIconPalette = !showIconPalette;
        renderIconPalette();
      });
    }

    if (els.toggleSavedRulesBtn) {
      els.toggleSavedRulesBtn.addEventListener("click", () => {
        showSavedRules = !showSavedRules;
        renderIconRules();
      });
    }
    if (els.daily5SelectedTopics) {
      els.daily5SelectedTopics.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-remove-topic]");
        if (!btn) return;
        onToggleDaily5Topic(btn.dataset.removeTopic);
      });
    }
    if (els.daily5AddTopicBtn) {
      els.daily5AddTopicBtn.addEventListener("click", onAddCustomDaily5Topic);
    }
    if (els.daily5CustomTopic) {
      els.daily5CustomTopic.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        onAddCustomDaily5Topic();
      });
    }
    if (els.daily5Prompt) {
      els.daily5Prompt.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSaveDaily5Prompt();
        }
      });
    }
    if (els.daily5SavePromptBtn) {
      els.daily5SavePromptBtn.addEventListener("click", onSaveDaily5Prompt);
    }
    if (els.daily5SaveEndpointBtn) {
      els.daily5SaveEndpointBtn.addEventListener("click", onSaveDaily5Endpoint);
    }
    if (els.daily5Endpoint) {
      els.daily5Endpoint.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        onSaveDaily5Endpoint();
      });
    }

    // Keep PC/phone sync fresh when user comes back to the app.
    window.addEventListener("focus", () => {
      if (!hasFirebaseConfig() || !getSyncCode()) return;
      void syncCloudNow(false);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      if (!hasFirebaseConfig() || !getSyncCode()) return;
      void syncCloudNow(false);
    });
  }

  function onAddTask(e) {
    e.preventDefault();
    if (!isEditableDayKey(selectedDayKey)) return;

    const text = (els.taskInput.value || "").trim();

    if (!text) return;

    const targetDay = selectedDayKey;
    ensureDayPlan(targetDay);

    if (state.today[targetDay].tasks.length >= MAX_TASKS) {
      return;
    }

    state.today[targetDay].tasks.push({
      id: cryptoRandomId(),
      title: text,
      done: false,
      completedAt: null,
    });

    if (!state.meta.startedOn) {
      state.meta.startedOn = getTodayKey();
    }

    els.taskInput.value = "";
    state.today[targetDay].createdAt = state.today[targetDay].createdAt || new Date().toISOString();
    touchDay(targetDay);
    saveState();
    syncCloudStatus(targetDay);
    render();
  }

  function onToggleTask(taskId, dayKey) {
    if (!isEditableDayKey(dayKey)) return;

    ensureDayPlan(dayKey);
    const task = state.today[dayKey].tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.done = !task.done;
    task.completedAt = task.done ? new Date().toISOString() : null;
    touchDay(dayKey);
    saveState();
    syncCloudStatus(dayKey);
    render();
  }

  function onEditTask(taskId, dayKey) {
    if (!isEditableDayKey(dayKey)) return;

    ensureDayPlan(dayKey);
    const task = state.today[dayKey].tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updated = prompt("Edit task", task.title);
    if (updated === null) return;

    const nextTitle = updated.trim();
    if (!nextTitle) return;

    task.title = nextTitle;
    touchDay(dayKey);
    saveState();
    syncCloudStatus(dayKey);
    render();
  }

  function onDeleteTask(taskId, dayKey) {
    if (!isEditableDayKey(dayKey)) return;

    ensureDayPlan(dayKey);
    state.today[dayKey].tasks = state.today[dayKey].tasks.filter((t) => t.id !== taskId);
    touchDay(dayKey);
    saveState();
    syncCloudStatus(dayKey);
    render();
  }

  function resetToday() {
    const today = getTodayKey();
    state.today[today] = { tasks: [], createdAt: null };
    touchDay(today);
    saveState();
    syncCloudStatus(today);
    render();
  }

  function ensureDayPlan(dayKey) {
    if (!state.today[dayKey]) {
      state.today[dayKey] = { tasks: [], createdAt: null, updatedAt: null };
    }
  }

  function touchDay(dayKey) {
    ensureDayPlan(dayKey);
    state.today[dayKey].updatedAt = new Date().toISOString();
  }

  function getSyncCode() {
    return String(state.settings.syncCode || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 48);
  }

  function isoToMs(value) {
    const ms = Date.parse(String(value || ""));
    return Number.isFinite(ms) ? ms : 0;
  }

  function sanitizeCloudTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    return tasks.slice(0, MAX_TASKS).map((task) => ({
      id: String(task?.id || cryptoRandomId()),
      title: String(task?.title || "").trim().slice(0, 120),
      done: Boolean(task?.done),
      completedAt: task?.completedAt ? String(task.completedAt) : null,
    })).filter((task) => task.title.length > 0);
  }

  function ensureTodoDeletedMap() {
    if (!state.meta.todoDeletedDays || typeof state.meta.todoDeletedDays !== "object") {
      state.meta.todoDeletedDays = {};
    }
  }

  function buildDayDocPayload(dayKey, day) {
    ensureDayPlan(dayKey);
    const safeTasks = sanitizeCloudTasks(day?.tasks);
    const completed = safeTasks.filter((t) => t.done).length;
    return {
      date: dayKey,
      tasks: safeTasks,
      taskCount: safeTasks.length,
      completedCount: completed,
      createdAt: day?.createdAt ? String(day.createdAt) : null,
      updatedAt: day?.updatedAt ? String(day.updatedAt) : new Date().toISOString(),
      sourceDeviceId: state.meta.deviceId || "",
    };
  }

  function sanitizeDayRecord(record) {
    return {
      tasks: sanitizeCloudTasks(record?.tasks),
      createdAt: record?.createdAt ? String(record.createdAt) : null,
      updatedAt: record?.updatedAt ? String(record.updatedAt) : new Date().toISOString(),
    };
  }

  async function pushDeviceStatus(todayKey) {
    if (!state.settings.fcmToken || !fb.ready || !fb.firestore) return;
    ensureDayPlan(todayKey);
    const tasks = state.today[todayKey].tasks || [];
    const completed = tasks.filter((t) => t.done).length;
    const deviceRef = fb.firestore.collection("devices").doc(state.meta.deviceId);
    await deviceRef.set(
      {
        fcmToken: state.settings.fcmToken,
        reminderStart: state.settings.reminderStart,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await deviceRef.collection("days").doc(todayKey).set(
      {
        date: todayKey,
        taskCount: tasks.length,
        completedCount: completed,
        hasAnyTask: tasks.length > 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  async function syncCloudStatus(dayKey) {
    if (!fb.ready || !fb.firestore) return;

    try {
      const targetDay = dayKey || getTodayKey();
      const todayKey = getTodayKey();
      ensureDayPlan(targetDay);

      if (!state.meta.deviceId) {
        state.meta.deviceId = cryptoRandomId();
        saveState();
      }

      await pushDeviceStatus(todayKey);

      const syncCode = getSyncCode();
      if (!syncCode) {
        updateSyncStatus("Set a Sync Code on both devices to link PC and phone.");
        return;
      }

      const payload = buildDayDocPayload(targetDay, state.today[targetDay]);
      await fb.firestore.collection("syncSpaces").doc(syncCode).collection("days").doc(targetDay).set(payload, { merge: true });
      updateSyncStatus(`Synced at ${new Date().toLocaleTimeString()}`);
      scheduleFullSyncSoon();
    } catch (err) {
      updateSyncStatus(`Sync failed: ${String(err.message || err)}`);
    }
  }

  function scheduleFullSyncSoon() {
    if (!hasFirebaseConfig() || !getSyncCode()) return;
    if (scheduledFullSyncTimer) clearTimeout(scheduledFullSyncTimer);
    scheduledFullSyncTimer = setTimeout(() => {
      scheduledFullSyncTimer = null;
      void syncCloudNow(false);
    }, 800);
  }

  async function syncCloudNow(pushAfterPull) {
    if (!hasFirebaseConfig()) {
      updateSyncStatus("Save Firebase config first, then connect sync. Push is optional.");
      return;
    }
    if (!fb.ready || !fb.firestore) {
      const ok = await initFirebaseRuntime(false);
      if (!ok) {
        updateSyncStatus("Firebase not ready. Check your config.");
        return;
      }
    }

    const syncCode = getSyncCode();
    if (!syncCode) {
      updateSyncStatus("Enter a Sync Code (same on PC and phone).");
      return;
    }

    try {
      if (!state.meta.deviceId) {
        state.meta.deviceId = cryptoRandomId();
      }
      ensureTodoDeletedMap();
      const daysCollection = fb.firestore.collection("syncSpaces").doc(syncCode).collection("days");
      const remoteSnap = await daysCollection.get();
      const remoteByKey = {};
      remoteSnap.forEach((doc) => {
        remoteByKey[doc.id] = sanitizeDayRecord(doc.data() || {});
      });

      const deletedMap = state.meta.todoDeletedDays || {};
      const keys = new Set([
        ...Object.keys(state.today || {}),
        ...Object.keys(remoteByKey),
        ...Object.keys(deletedMap),
      ]);
      const nextToday = {};
      const remoteDeleteCandidates = new Set();

      keys.forEach((key) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        const localRecord = state.today[key] ? sanitizeDayRecord(state.today[key]) : null;
        const remoteRecord = remoteByKey[key] || null;
        const deletedMs = isoToMs(deletedMap[key]);
        const localMs = localRecord ? isoToMs(localRecord.updatedAt) : 0;
        const remoteMs = remoteRecord ? isoToMs(remoteRecord.updatedAt) : 0;

        if (deletedMs > 0 && deletedMs >= localMs && deletedMs >= remoteMs) {
          if (remoteRecord) remoteDeleteCandidates.add(key);
          return;
        }

        if (localRecord && localMs >= remoteMs) {
          nextToday[key] = localRecord;
          delete deletedMap[key];
          return;
        }

        if (remoteRecord) {
          nextToday[key] = remoteRecord;
          delete deletedMap[key];
        }
      });

      state.today = nextToday;
      ensureDayPlan(getTodayKey());
      if (!state.meta.startedOn || state.meta.startedOn > getTodayKey()) {
        state.meta.startedOn = getTodayKey();
      }
      const localKeys = Object.keys(state.today).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));
      for (const dayKey of localKeys) {
        const payload = buildDayDocPayload(dayKey, state.today[dayKey]);
        await daysCollection.doc(dayKey).set(payload, { merge: true });
      }

      for (const key of Object.keys(deletedMap)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        if (!state.today[key]) remoteDeleteCandidates.add(key);
      }

      for (const dayKey of remoteDeleteCandidates) {
        await daysCollection.doc(dayKey).delete().catch(() => {});
      }

      await pushDeviceStatus(getTodayKey());
      saveState();
      render();
      updateSyncStatus(
        `Full sync complete (${Object.keys(state.today).length} days) at ${new Date().toLocaleTimeString()}`
      );
      if (pushAfterPull) {
        await syncCloudStatus(getTodayKey());
      }
    } catch (err) {
      updateSyncStatus(`Sync failed: ${String(err.message || err)}`);
    }
  }

  function render() {
    renderTasks();
    renderDonut();
    renderCalendar();
    renderDaily5();
    renderNotifyButton();
    renderReminderBanner();
    renderIconRules();
    renderIconPalette();
    renderDayStrip();
  }

  function onAddIconRule(e) {
    e.preventDefault();
    if (!els.ruleKeyword || !els.ruleIconSelect) return;

    const keyword = (els.ruleKeyword.value || "").trim().toLowerCase();
    const icon = (els.ruleIconSelect.value || "").trim();
    if (!keyword || !icon) return;

    const existing = state.settings.iconRules.find((r) => r.keyword === keyword);
    if (existing) {
      existing.icon = icon;
    } else {
      state.settings.iconRules.push({ keyword, icon });
    }

    els.ruleKeyword.value = "";
    els.ruleIconSelect.value = "generic";
    showSavedRules = true;
    saveState();
    render();
  }

  function onDeleteIconRule(keyword) {
    state.settings.iconRules = state.settings.iconRules.filter((r) => r.keyword !== keyword);
    saveState();
    render();
  }

  function renderFirebaseFields() {
    if (!els.fbApiKey) return;
    const cfg = state.settings.firebase || {};
    els.fbApiKey.value = cfg.apiKey || "";
    els.fbAuthDomain.value = cfg.authDomain || "";
    els.fbProjectId.value = cfg.projectId || "";
    els.fbMessagingSenderId.value = cfg.messagingSenderId || "";
    els.fbAppId.value = cfg.appId || "";
    els.fbVapidKey.value = cfg.vapidKey || "";
    updatePushStatus(state.settings.pushStatus || "Firebase not connected");
  }

  function renderSyncFields() {
    if (els.syncCodeInput) {
      els.syncCodeInput.value = state.settings.syncCode || "";
    }
    if (els.syncStatusText) {
      els.syncStatusText.textContent = state.settings.syncStatus || "Sync not connected yet.";
    }
  }

  function onSaveFirebaseConfig() {
    if (!els.fbApiKey) return;
    state.settings.firebase = {
      apiKey: (els.fbApiKey.value || "").trim(),
      authDomain: (els.fbAuthDomain.value || "").trim(),
      projectId: (els.fbProjectId.value || "").trim(),
      messagingSenderId: (els.fbMessagingSenderId.value || "").trim(),
      appId: (els.fbAppId.value || "").trim(),
      vapidKey: (els.fbVapidKey.value || "").trim(),
    };
    saveState();
    updatePushStatus("Firebase config saved");
  }

  async function onConnectPush() {
    onSaveFirebaseConfig();
    const ok = await initFirebaseRuntime(true);
    if (ok) {
      updatePushStatus("Push connected");
      await syncCloudNow(true);
    }
  }

  function onSaveSyncCode() {
    if (!els.syncCodeInput) return;
    const raw = String(els.syncCodeInput.value || "").trim();
    const normalized = raw.toLowerCase().replace(/[^a-z0-9-_]/g, "").slice(0, 48);
    if (!normalized) {
      updateSyncStatus("Enter a valid Sync Code.");
      return;
    }
    state.settings.syncCode = normalized;
    saveState();
    renderSyncFields();
    void syncCloudNow(true);
  }

  function updateArchiveStatus(text) {
    if (els.archiveClearStatusText) {
      els.archiveClearStatusText.textContent = text;
    }
  }

  function markDayDeletedForSync(dayKey, whenIso) {
    ensureTodoDeletedMap();
    state.meta.todoDeletedDays[dayKey] = whenIso || new Date().toISOString();
  }

  function downloadJsonFile(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function onArchiveAndClearPastTodo() {
    const todayKey = getTodayKey();
    const tomorrowKey = getTomorrowKey();
    const pastKeys = Object.keys(state.today || {})
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .filter((key) => key < todayKey)
      .sort();

    if (!pastKeys.length) {
      state.meta.startedOn = todayKey;
      viewedMonth = startOfMonth(new Date());
      saveState();
      render();
      updateArchiveStatus("No past Todo days to clear.");
      return;
    }

    const archiveDays = {};
    pastKeys.forEach((key) => {
      archiveDays[key] = sanitizeDayRecord(state.today[key] || {});
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJsonFile(`yougrow-past-todo-archive-${stamp}.json`, {
      exportedAt: new Date().toISOString(),
      keptDays: [todayKey, tomorrowKey],
      totalArchivedDays: pastKeys.length,
      days: archiveDays,
    });

    const deletedAt = new Date().toISOString();
    pastKeys.forEach((key) => {
      delete state.today[key];
      markDayDeletedForSync(key, deletedAt);
    });
    ensureDayPlan(todayKey);
    state.meta.startedOn = todayKey;
    viewedMonth = startOfMonth(new Date());
    saveState();
    render();
    updateArchiveStatus(`Archived and cleared ${pastKeys.length} past Todo days.`);
    void syncCloudNow(true);
  }

  function updatePushStatus(text) {
    if (els.pushStatusText) {
      els.pushStatusText.textContent = text;
    }
    state.settings.pushStatus = text;
    saveState();
  }

  function updateSyncStatus(text) {
    if (els.syncStatusText) {
      els.syncStatusText.textContent = text;
    }
    state.settings.syncStatus = text;
    saveState();
  }

  function hasFirebaseConfig() {
    const c = state.settings.firebase || {};
    return Boolean(c.apiKey && c.authDomain && c.projectId && c.messagingSenderId && c.appId);
  }

  async function initFirebaseRuntime(requestToken) {
    if (!hasFirebaseConfig() || typeof firebase === "undefined") return false;

    try {
      const cfg = state.settings.firebase;
      if (!firebase.apps.length) {
        firebase.initializeApp({
          apiKey: cfg.apiKey,
          authDomain: cfg.authDomain,
          projectId: cfg.projectId,
          messagingSenderId: cfg.messagingSenderId,
          appId: cfg.appId,
        });
      }

      fb.app = firebase.app();
      fb.firestore = firebase.firestore();
      try {
        fb.messaging = firebase.messaging();
      } catch (_) {
        fb.messaging = null;
      }
      fb.ready = true;

      if (requestToken) {
        if (!fb.messaging) {
          updatePushStatus("Push is not supported on this device/browser");
          return true;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          updatePushStatus("Notification permission denied");
          return false;
        }
      }

      if (fb.messaging && (requestToken || !state.settings.fcmToken)) {
        const reg = await navigator.serviceWorker.register("firebase-messaging-sw.js");
        const readyReg = await navigator.serviceWorker.ready;
        const target = readyReg.active || reg.active;
        if (target) {
          target.postMessage({
            type: "INIT_FIREBASE_SW",
            config: {
              apiKey: cfg.apiKey,
              authDomain: cfg.authDomain,
              projectId: cfg.projectId,
              messagingSenderId: cfg.messagingSenderId,
              appId: cfg.appId,
            },
          });
        }
        const token = await fb.messaging.getToken({
          vapidKey: cfg.vapidKey || undefined,
          serviceWorkerRegistration: reg,
        });
        if (token) {
          state.settings.fcmToken = token;
          saveState();
        }
      }

      return true;
    } catch (err) {
      updatePushStatus(`Push setup failed: ${String(err.message || err)}`);
      return false;
    }
  }

  function renderTasks() {
    if (!els.taskList) return;

    const today = getTodayKey();
    const viewingToday = selectedDayKey === today;
    const editableDay = isEditableDayKey(selectedDayKey);
    ensureDayPlan(selectedDayKey);
    const tasks = state.today[selectedDayKey].tasks;
    const limitReached = tasks.length >= MAX_TASKS;

    if (els.taskForm) {
      const hideForm = !editableDay || limitReached;
      els.taskForm.classList.toggle("hidden", hideForm);
      if (hideForm && els.taskInput) {
        els.taskInput.value = "";
      }
    }
    if (els.clearTodayBtn) {
      els.clearTodayBtn.classList.toggle("hidden", !viewingToday);
    }

    els.taskList.innerHTML = "";

    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = `task-item ${task.done ? "done" : ""}`;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.disabled = !editableDay;
      checkbox.setAttribute("aria-label", `Complete task ${task.title}`);
      checkbox.addEventListener("change", () => onToggleTask(task.id, selectedDayKey));

      const iconWrap = document.createElement("span");
      iconWrap.className = "task-icon-box";
      iconWrap.setAttribute("aria-hidden", "true");

      iconWrap.innerHTML = renderTaskIconSvg(inferTaskIcon(task.title));

      const taskMain = document.createElement("div");
      taskMain.className = "task-main";

      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;

      const category = document.createElement("div");
      category.className = "task-category";
      category.textContent = inferTaskCategory(task.title);

      taskMain.appendChild(title);
      taskMain.appendChild(category);

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "task-action";
      editBtn.disabled = !editableDay;
      editBtn.setAttribute("aria-label", `Edit task ${task.title}`);
      editBtn.innerHTML =
        "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 20h4l10-10-4-4L4 16v4z'></path><path d='M13 7l4 4'></path></svg>";
      editBtn.addEventListener("click", () => onEditTask(task.id, selectedDayKey));

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "task-action";
      deleteBtn.disabled = !editableDay;
      deleteBtn.setAttribute("aria-label", `Delete task ${task.title}`);
      deleteBtn.innerHTML =
        "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7h16'></path><path d='M9 7V4h6v3'></path><path d='M8 7l1 13h6l1-13'></path><path d='M10 11v6M14 11v6'></path></svg>";
      deleteBtn.addEventListener("click", () => onDeleteTask(task.id, selectedDayKey));

      li.appendChild(checkbox);
      li.appendChild(iconWrap);
      li.appendChild(taskMain);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      els.taskList.appendChild(li);
    });

    if (!editableDay && els.taskForm) {
      els.taskForm.classList.add("hidden");
    }
  }

  function setupDonut() {
    const r = 44;
    const c = 2 * Math.PI * r;
    els.donutProgress.style.strokeDasharray = String(c);
    els.donutProgress.style.strokeDashoffset = String(c);
  }

  function renderDonut() {
    if (!els.donutProgress || !els.donutLabel || !els.progressText) return;

    const stats = getDayStats(selectedDayKey);
    const r = 44;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - stats.percent / 100);

    els.donutProgress.style.strokeDashoffset = String(offset);
    els.donutProgress.style.stroke = stats.color;
    els.donutLabel.textContent = `${stats.percent}%`;
    els.donutLabel.style.color = stats.color;
    els.progressText.textContent = `${stats.completed}/${stats.total} completed`;
  }

  function renderIconRules() {
    if (!els.iconRuleList || !els.toggleSavedRulesBtn) return;

    els.iconRuleList.classList.toggle("hidden", !showSavedRules);
    els.toggleSavedRulesBtn.textContent = showSavedRules ? "Hide saved rules" : "Show saved rules";

    els.iconRuleList.innerHTML = "";
    const rules = state.settings.iconRules || [];

    rules.forEach((rule) => {
      const li = document.createElement("li");
      li.className = "rule-item";

      const sample = document.createElement("span");
      sample.className = "task-icon-box";
      sample.innerHTML = renderTaskIconSvg(normalizeLegacyIcon(rule.icon));
      sample.setAttribute("aria-hidden", "true");

      const text = document.createElement("span");
      text.className = "rule-keyword";
      text.textContent = rule.keyword;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn-outline task-edit";
      del.textContent = "Remove";
      del.addEventListener("click", () => onDeleteIconRule(rule.keyword));

      li.appendChild(sample);
      li.appendChild(text);
      li.appendChild(del);
      els.iconRuleList.appendChild(li);
    });
  }

  function renderIconPalette() {
    if (!els.iconPalette || !els.ruleIconSelect || !els.toggleIconPaletteBtn) return;

    els.iconPalette.classList.toggle("hidden", !showIconPalette);
    els.toggleIconPaletteBtn.textContent = showIconPalette ? "Hide icons" : "Show icons";

    if (!showIconPalette) return;

    const selected = els.ruleIconSelect.value || "generic";
    els.iconPalette.innerHTML = "";

    ICON_CHOICES.forEach((icon) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "icon-pick";
      if (icon === selected) btn.classList.add("active");
      btn.innerHTML = renderTaskIconSvg(icon);
      btn.setAttribute("aria-label", `Choose icon ${icon} icon`);
      btn.addEventListener("click", () => {
        els.ruleIconSelect.value = icon;
        renderIconPalette();
      });
      els.iconPalette.appendChild(btn);
    });
  }

  function onToggleDaily5Topic(topic) {
    const topics = state.settings.daily5.topics || [];
    if (topics.includes(topic)) {
      state.settings.daily5.topics = topics.filter((t) => t !== topic);
    } else {
      state.settings.daily5.topics = topics.concat(topic);
    }
    saveState();
    renderDaily5();
  }

  function onAddCustomDaily5Topic() {
    if (!els.daily5CustomTopic) return;
    const raw = (els.daily5CustomTopic.value || "").trim();
    if (!raw) return;

    const topic = normalizeTopic(raw);
    if (!topic) return;

    const custom = state.settings.daily5.customTopics || [];
    const hasCustom = custom.some((t) => t.toLowerCase() === topic.toLowerCase());
    if (!hasCustom) {
      state.settings.daily5.customTopics = custom.concat(topic);
    }

    const selected = state.settings.daily5.topics || [];
    const hasSelected = selected.some((t) => t.toLowerCase() === topic.toLowerCase());
    if (!hasSelected) {
      state.settings.daily5.topics = selected.concat(topic);
    }

    els.daily5CustomTopic.value = "";
    saveState();
    renderDaily5();
  }

  function onSaveDaily5Prompt() {
    if (!els.daily5Prompt) return;
    state.settings.daily5.prompt = (els.daily5Prompt.value || "").trim();
    state.settings.daily5.language = detectDeviceLanguage();
    saveState();
    if (els.daily5SavePromptBtn) {
      const old = els.daily5SavePromptBtn.textContent;
      els.daily5SavePromptBtn.textContent = "Saved";
      setTimeout(() => {
        if (els.daily5SavePromptBtn) els.daily5SavePromptBtn.textContent = old || "Save Prompt";
      }, 900);
    }
    void generateDaily5(true);
  }

  function onSaveDaily5Endpoint() {
    if (!els.daily5Endpoint) return;
    const raw = String(els.daily5Endpoint.value || "").trim();
    if (raw && !/^https?:\/\//i.test(raw)) return;
    state.settings.daily5.endpoint = raw;
    saveState();
    if (els.daily5SaveEndpointBtn) {
      const old = els.daily5SaveEndpointBtn.textContent;
      els.daily5SaveEndpointBtn.textContent = "Saved";
      setTimeout(() => {
        if (els.daily5SaveEndpointBtn) els.daily5SaveEndpointBtn.textContent = old || "Save API URL";
      }, 900);
    }
    void generateDaily5(true);
  }

  function normalizeFactKey(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
  }

  function buildItemFactKey(item) {
    if (item && item.factKey) return normalizeFactKey(item.factKey);
    const raw = `${item?.associatedTopic || ""} ${item?.title || ""} ${item?.body || ""} ${item?.explanation || ""}`;
    return normalizeFactKey(raw);
  }

  function getUsedFactKeys(limit) {
    const max = Math.max(50, Number(limit) || 500);
    const out = [];
    const seen = new Set();

    Object.values(state.daily5ByDate || {}).forEach((day) => {
      if (!day || !Array.isArray(day.items)) return;
      day.items.forEach((item) => {
        const key = buildItemFactKey(item);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(key);
      });
    });

    const metaHistory = state.meta.daily5UsedFacts || {};
    Object.keys(metaHistory).forEach((k) => {
      const key = normalizeFactKey(k);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(key);
    });

    return out.slice(-max);
  }

  function setHasDuplicateFacts(items) {
    const keys = [];
    for (const item of items || []) {
      const key = buildItemFactKey(item);
      if (!key) return true;
      if (keys.some((k) => isSameOrNearDuplicateFact(k, key))) return true;
      keys.push(key);
    }
    return false;
  }

  function overlapsUsedFacts(items, usedFacts) {
    const used = (usedFacts || []).map((x) => normalizeFactKey(x)).filter(Boolean);
    return (items || []).some((item) => {
      const key = buildItemFactKey(item);
      return used.some((u) => isSameOrNearDuplicateFact(u, key));
    });
  }

  function rememberUsedFacts(items, dayKey) {
    if (!state.meta.daily5UsedFacts || typeof state.meta.daily5UsedFacts !== "object") {
      state.meta.daily5UsedFacts = {};
    }
    items.forEach((item) => {
      const key = buildItemFactKey(item);
      if (!key) return;
      state.meta.daily5UsedFacts[key] = dayKey;
    });
  }

  function isSameOrNearDuplicateFact(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    const aTokens = a.split(" ").filter((t) => t.length > 3);
    const bTokens = b.split(" ").filter((t) => t.length > 3);
    if (!aTokens.length || !bTokens.length) return false;
    const aSet = new Set(aTokens);
    const bSet = new Set(bTokens);
    let intersect = 0;
    aSet.forEach((t) => {
      if (bSet.has(t)) intersect += 1;
    });
    const denom = Math.min(aSet.size, bSet.size);
    return denom > 0 && intersect / denom >= 0.72;
  }

  async function generateDaily5(forceNewSet) {
    if (daily5Generating) return;
    daily5Generating = true;
    daily5LastError = "";
    const today = getTodayKey();
    const prefs = state.settings.daily5 || {
      topics: ["Oracle"],
      customTopics: [],
      difficulty: "intermediate",
      language: detectDeviceLanguage(),
      prompt: "",
    };
    const topics = prefs.topics && prefs.topics.length > 0 ? prefs.topics : ["Oracle", "AI", "Cloud"];
    const prompt = (prefs.prompt || "").trim();
    const language = detectDeviceLanguage();
    state.settings.daily5.language = language;
    const usedFactKeys = getUsedFactKeys(800);
    try {
      let items = null;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const aiItems = await generateDaily5ItemsFromAI({
          topics,
          prompt,
          difficulty: "intermediate",
          language,
          avoidFacts: usedFactKeys,
        });
        if (
          validateTopicConstrainedItems(aiItems, topics) &&
          !setHasDuplicateFacts(aiItems) &&
          !overlapsUsedFacts(aiItems, usedFactKeys)
        ) {
          items = aiItems;
          break;
        }
      }

      if (!items) {
        const endpointHint = "Please retry in a moment.";
        const detail = daily5LastError ? ` Latest error: ${daily5LastError}` : "";
        state.daily5ByDate[today] = {
          generatedAt: new Date().toISOString(),
          language,
          topics,
          prompt,
          signature: makeDaily5Signature(prefs),
          blocked: true,
          errorMessage: `Live latest-update generation is unavailable right now. ${endpointHint}${detail}`,
          items: [],
        };
        saveState();
        renderDaily5();
        return;
      }

      const hydrated = items.map((item) => ({
        ...item,
        factKey: buildItemFactKey(item),
        completed: false,
        xpAwarded: 0,
        selectedOption: null,
        isCorrect: null,
        feedback: "",
      }));
      rememberUsedFacts(hydrated, today);

      state.daily5ByDate[today] = {
        generatedAt: new Date().toISOString(),
        language,
        topics,
        prompt,
        signature: makeDaily5Signature(prefs),
        blocked: false,
        currentIndex: 0,
        finished: false,
        earnedXp: 0,
        completionRecorded: false,
        items: hydrated,
      };
      saveState();
      renderDaily5();
    } finally {
      daily5Generating = false;
    }
  }

  function renderDaily5() {
    renderDaily5TopicChips();
    renderSelectedDaily5Topics();

    if (els.daily5Prompt) {
      const hasFocus = document.activeElement === els.daily5Prompt;
      if (!hasFocus) {
        els.daily5Prompt.value = state.settings.daily5.prompt || "";
      }
    }
    if (els.daily5Endpoint) {
      const hasFocus = document.activeElement === els.daily5Endpoint;
      if (!hasFocus) {
        els.daily5Endpoint.value = state.settings.daily5.endpoint || "";
      }
    }
    if (els.daily5Feed) {
      renderDaily5Session();
    }
  }

  function renderDaily5Session() {
    const today = getTodayKey();
    const day = state.daily5ByDate[today];
    const signature = makeDaily5Signature(state.settings.daily5 || {});

    if (els.daily5Feed && day && day.blocked && day.signature === signature) {
      els.daily5Feed.innerHTML = "";
      const blocked = document.createElement("div");
      blocked.className = "daily5-card";
      blocked.innerHTML = `<p class='daily5-type'>Live Updates</p><h3>Could not load latest news-based questions.</h3><p class='muted'>${day.errorMessage || "Please try again."}</p>`;
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "btn-solid";
      retry.textContent = "Retry";
      retry.addEventListener("click", () => void generateDaily5(true));
      blocked.appendChild(retry);
      els.daily5Feed.appendChild(blocked);
      return;
    }

    if (els.daily5Feed && (!day || day.signature !== signature || !isDaily5SessionValid(day))) {
      void generateDaily5(false);
      const loading = document.createElement("div");
      loading.className = "daily5-card";
      loading.innerHTML = "<p class='daily5-type'>Preparing Daily 5</p><h3>Building your learning feed...</h3><p class='muted'>Using your selected topics and prompt.</p>";
      els.daily5Feed.innerHTML = "";
      els.daily5Feed.appendChild(loading);
      return;
    }
    if (!els.daily5Feed) return;
    els.daily5Feed.innerHTML = "";

    if (!day || !Array.isArray(day.items)) {
      const empty = document.createElement("div");
      empty.className = "daily5-card";
      empty.innerHTML = "<p class=\"muted\">Configure Daily 5 settings and content will appear here automatically.</p>";
      els.daily5Feed.appendChild(empty);
      return;
    }
    const total = day.items.length || 5;
    const completedCount = day.items.filter((item) => item.completed).length;
    const finished = completedCount >= total;
    const currentIndex = Math.min(day.currentIndex || 0, total - 1);
    const item = day.items[currentIndex];

    const progress = document.createElement("div");
    progress.className = "daily5-progress";
    progress.innerHTML = `<span class="daily5-counter">${Math.min(currentIndex + 1, total)}/${total}</span>`;
    els.daily5Feed.appendChild(progress);

    const card = document.createElement("article");
    card.className = `daily5-card ${item.completed ? "done" : ""}`;
    const type = document.createElement("p");
    type.className = "daily5-type";
    type.textContent = item.type || "QUESTION";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const body = document.createElement("p");
    body.className = "muted";
    body.textContent = item.body;
    card.appendChild(type);
    card.appendChild(title);
    card.appendChild(body);

    if (Array.isArray(item.visualBullets) && item.visualBullets.length) {
      const visual = document.createElement("div");
      visual.className = "daily5-visual";
      item.visualBullets.forEach((line) => {
        const pill = document.createElement("span");
        pill.className = "daily5-visual-pill";
        pill.textContent = line;
        visual.appendChild(pill);
      });
      card.appendChild(visual);
    }

    if (Array.isArray(item.sources) && item.sources.length) {
      const refs = document.createElement("div");
      refs.className = "daily5-refs";
      item.sources.slice(0, 2).forEach((src) => {
        const a = document.createElement("a");
        a.className = "daily5-ref-link";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.href = src.url || "#";
        a.textContent = src.title || src.host || "Source";
        refs.appendChild(a);
      });
      card.appendChild(refs);
    }

    if (item.format === "true_false") {
      const answers = document.createElement("div");
      answers.className = "daily5-options";
      ["True", "False"].forEach((label, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "daily5-option";
        btn.textContent = label;
        if (item.completed) {
          btn.disabled = true;
          const isCorrectBtn = (label === "True" && item.correctValue === true) || (label === "False" && item.correctValue === false);
          if (isCorrectBtn) btn.classList.add("correct");
          if (item.selectedOption === idx && !isCorrectBtn) btn.classList.add("wrong");
        } else {
          btn.addEventListener("click", () => onDaily5Answer(currentIndex, idx));
        }
        answers.appendChild(btn);
      });
      card.appendChild(answers);
    } else if (item.format === "mcq" && Array.isArray(item.options)) {
      const answers = document.createElement("div");
      answers.className = "daily5-options";
      item.options.forEach((opt, optIndex) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "daily5-option";
        btn.textContent = opt.text;
        if (item.completed) {
          btn.disabled = true;
          if (opt.correct) btn.classList.add("correct");
          if (item.selectedOption === optIndex && !opt.correct) btn.classList.add("wrong");
        } else {
          btn.addEventListener("click", () => onDaily5Answer(currentIndex, optIndex));
        }
        answers.appendChild(btn);
      });
      card.appendChild(answers);
    } else if (item.format === "fill_blank" || item.format === "short_answer") {
      const answerWrap = document.createElement("div");
      answerWrap.className = "daily5-fill";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = item.format === "fill_blank" ? "Type the missing term" : "Type your answer";
      input.setAttribute("aria-label", "Your answer");
      input.value = item.userAnswer || "";

      const submit = document.createElement("button");
      submit.type = "button";
      submit.className = "btn-solid";
      submit.textContent = "Submit";

      if (item.completed) {
        input.disabled = true;
        submit.disabled = true;
      } else {
        submit.addEventListener("click", () => onDaily5Answer(currentIndex, input.value));
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            onDaily5Answer(currentIndex, input.value);
          }
        });
      }

      answerWrap.appendChild(input);
      answerWrap.appendChild(submit);
      card.appendChild(answerWrap);
    } else {
      const invalid = document.createElement("p");
      invalid.className = "daily5-feedback bad";
      invalid.textContent = "Invalid question format detected. Regenerating strict set.";
      card.appendChild(invalid);
      const regen = document.createElement("button");
      regen.type = "button";
      regen.className = "btn-outline";
      regen.textContent = "Regenerate";
      regen.addEventListener("click", () => void generateDaily5(true));
      card.appendChild(regen);
    }

    if (item.completed) {
      const explain = document.createElement("p");
      explain.className = `daily5-feedback ${item.isCorrect ? "good" : "bad"}`;
      explain.textContent = item.feedback;
      card.appendChild(explain);

      if (!finished) {
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "btn-solid";
        nextBtn.textContent = "Next";
        nextBtn.addEventListener("click", onDaily5Next);
        card.appendChild(nextBtn);
      }
    }

    els.daily5Feed.appendChild(card);

    if (finished) {
      maybeFinalizeDaily5Completion(today);
      const done = document.createElement("article");
      done.className = "daily5-card";
      done.innerHTML = "<p class='daily5-type'>Completed</p><h3>Great job, you finished this Daily 5.</h3><p class='muted'>Scroll done. Ready for another learning set?</p>";
      const nextSetBtn = document.createElement("button");
      nextSetBtn.type = "button";
      nextSetBtn.className = "btn-solid";
      nextSetBtn.textContent = "Start Another Daily 5";
      nextSetBtn.addEventListener("click", () => void generateDaily5(true));
      done.appendChild(nextSetBtn);
      els.daily5Feed.appendChild(done);
    }
  }

  function onDaily5Answer(itemIndex, answerInput) {
    const today = getTodayKey();
    const day = state.daily5ByDate[today];
    if (!day || !Array.isArray(day.items)) return;
    const item = day.items[itemIndex];
    if (!item || item.completed) return;
    if (item.format === "true_false") {
      const optionIndex = Number(answerInput);
      const pickedValue = optionIndex === 0;
      item.selectedOption = optionIndex;
      item.isCorrect = pickedValue === Boolean(item.correctValue);
      item.completed = true;
      item.feedback = item.isCorrect
        ? `Correct: ${item.explanation}`
        : `Wrong: ${item.wrongExplanation || item.explanation}`;
      awardDaily5Xp(today, item, item.isCorrect ? 25 : 12);
    } else if (item.format === "mcq" && Array.isArray(item.options)) {
      const optionIndex = Number(answerInput);
      const picked = item.options[optionIndex];
      if (!picked) return;
      item.selectedOption = optionIndex;
      item.isCorrect = Boolean(picked.correct);
      item.completed = true;
      item.feedback = item.isCorrect
        ? `Correct: ${picked.explanation || item.explanation || "Good answer."}`
        : `Wrong: ${picked.explanation || item.wrongExplanation || item.explanation || "Review the key idea and try again next set."}`;
      awardDaily5Xp(today, item, item.isCorrect ? 25 : 12);
    } else if (item.format === "fill_blank" || item.format === "short_answer") {
      const userAnswer = String(answerInput || "").trim();
      if (!userAnswer) return;
      item.userAnswer = userAnswer;
      item.completed = true;
      item.isCorrect = isCorrectFreeResponse(userAnswer, item);
      const canonical = item.correctAnswer || (Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers[0] : "") || "";
      item.feedback = item.isCorrect
        ? `Correct: ${item.explanation}`
        : `Wrong: ${item.wrongExplanation || item.explanation}${canonical ? ` Correct answer: ${canonical}` : ""}`;
      awardDaily5Xp(today, item, item.isCorrect ? 25 : 12);
    } else {
      return;
    }
    saveState();
    renderDaily5();
  }

  function onDaily5Next() {
    const today = getTodayKey();
    const day = state.daily5ByDate[today];
    if (!day || !Array.isArray(day.items)) return;
    const total = day.items.length;
    if ((day.currentIndex || 0) + 1 >= total) {
      day.finished = true;
    } else {
      day.currentIndex = (day.currentIndex || 0) + 1;
    }
    saveState();
    renderDaily5();
  }

  async function generateDaily5ItemsFromAI(params) {
    if (!window.fetch) return null;
    const configured = String(state.settings?.daily5?.endpoint || "").trim();
    const isAbsoluteUrl = /^https?:\/\//i.test(configured);
    const primary = isAbsoluteUrl ? configured : DAILY5_AI_ENDPOINT;
    const endpoints = primary === DAILY5_AI_ENDPOINT ? [primary] : [primary, DAILY5_AI_ENDPOINT];
    try {
      for (const endpoint of endpoints) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "daily5",
            topics: params.topics || [],
            prompt: params.prompt || "",
            avoidFacts: Array.isArray(params.avoidFacts) ? params.avoidFacts.slice(0, 600) : [],
            instructions: DAILY5_TOPIC_RULES_PROMPT,
            difficulty: params.difficulty || "intermediate",
            language: params.language || "en",
            count: 5,
          }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) {
          let detail = "";
          try {
            const maybeJson = await res.clone().json();
            detail = String(maybeJson?.detail || maybeJson?.error || "").trim();
          } catch (_) {
            try {
              detail = String(await res.text()).trim();
            } catch (_) {
              detail = "";
            }
          }
          daily5LastError = `${endpoint} returned ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`;
          continue;
        }
        const data = await res.json();
        if (!Array.isArray(data?.items) || data.items.length < 5) {
          daily5LastError = `${endpoint} returned an invalid Daily 5 payload`;
          continue;
        }
        const normalized = data.items.slice(0, 5).map((item) => ({
          associatedTopic: item.associatedTopic || item.topic || "",
          format: item.format || "mcq",
          type: item.type || "Summary",
          title: item.title || "Learning card",
          body: item.body || "",
          correctValue: typeof item.correctValue === "boolean" ? item.correctValue : undefined,
          correctAnswer: typeof item.correctAnswer === "string" ? item.correctAnswer : "",
          acceptedAnswers: Array.isArray(item.acceptedAnswers)
            ? item.acceptedAnswers.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 8)
            : [],
          explanation: item.explanation || "",
          wrongExplanation: item.wrongExplanation || "",
          visualBullets: Array.isArray(item.visualBullets) ? item.visualBullets.slice(0, 4) : [],
          factKey: item.factKey || "",
          sources: Array.isArray(item.sources)
            ? item.sources.slice(0, 3).map((s) => ({
                title: String(s?.title || "").slice(0, 120),
                url: String(s?.url || ""),
                host: String(s?.host || ""),
                publishedAt: String(s?.publishedAt || ""),
              }))
            : [],
          options: Array.isArray(item.options)
            ? item.options.map((opt) => ({
                text: typeof opt.text === "string" ? opt.text : String(opt),
                correct: Boolean(opt.correct),
                explanation: opt.explanation || "",
              }))
            : undefined,
        }));
        if (!validateTopicConstrainedItems(normalized, params.topics || [])) {
          daily5LastError = `${endpoint} returned off-topic or invalid questions`;
          continue;
        }
        return normalized;
      }
      return null;
    } catch (err) {
      const msg = String(err?.message || err || "Unknown error");
      daily5LastError = msg.toLowerCase().includes("aborted")
        ? "Request timed out (30s) while generating latest updates"
        : msg.slice(0, 180);
      return null;
    }
  }

  function awardDaily5Xp(dayKey, item, points) {
    if (!item || item.xpAwarded) return;
    const day = state.daily5ByDate[dayKey];
    if (!day) return;
    item.xpAwarded = points;
  }

  function maybeFinalizeDaily5Completion(dayKey) {
    const day = state.daily5ByDate[dayKey];
    if (!day || !Array.isArray(day.items)) return;
    const done = day.items.every((item) => item.completed);
    if (!done) return;

    if (!day.finished) {
      day.finished = true;
    }
    if (day.completionRecorded) return;
    day.completionRecorded = true;
    saveState();
  }

  function renderDaily5TopicChips() {
    if (!els.daily5Topics) return;
    const selected = state.settings.daily5.topics || [];
    els.daily5Topics.innerHTML = "";

    selected.forEach((topic) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "topic-chip";
      btn.classList.add("active");
      btn.dataset.topic = topic;
      btn.textContent = topic;
      els.daily5Topics.appendChild(btn);
    });

    if (!els.daily5Topics.children.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No topic selected yet.";
      els.daily5Topics.appendChild(empty);
    }
  }

  function renderSelectedDaily5Topics() {
    if (!els.daily5SelectedTopics) return;
    const selected = state.settings.daily5.topics || [];
    els.daily5SelectedTopics.innerHTML = "";

    if (selected.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No topic selected yet.";
      els.daily5SelectedTopics.appendChild(empty);
      return;
    }

    selected.forEach((topic) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "selected-topic";
      btn.dataset.removeTopic = topic;
      btn.setAttribute("aria-label", `Remove topic ${topic}`);
      btn.textContent = `${topic} ×`;
      els.daily5SelectedTopics.appendChild(btn);
    });
  }

  function normalizeTopic(raw) {
    return raw
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function uniqTopics(arr) {
    const seen = new Set();
    const out = [];
    arr.forEach((item) => {
      const key = (item || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  function renderNotifyButton() {
    if (!els.notifyBtn) return;

    const supported = "Notification" in window;
    if (!supported) {
      els.notifyBtn.disabled = true;
      els.notifyBtn.textContent = "Notifications unsupported";
      return;
    }

    if (Notification.permission === "granted") {
      els.notifyBtn.textContent = "Reminders enabled";
      els.notifyBtn.disabled = true;
    } else if (Notification.permission === "denied") {
      els.notifyBtn.textContent = "Notifications blocked";
      els.notifyBtn.disabled = true;
    } else {
      els.notifyBtn.textContent = "Enable reminders";
      els.notifyBtn.disabled = false;
    }
  }

  function renderReminderBanner() {
    if (!els.reminderBanner) return;

    const today = getTodayKey();
    const missing = !state.today[today] || state.today[today].tasks.length === 0;
    const shouldShow = hasReachedReminderTime() && missing;
    els.reminderBanner.classList.toggle("hidden", !shouldShow);
  }

  function askNotificationPermission() {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(() => renderNotifyButton());
  }

  function startReminderLoop() {
    maybeSendReminder();
    setInterval(maybeSendReminder, 60 * 1000);
  }

  function maybeSendReminder() {
    const today = getTodayKey();
    ensureDayPlan(today);

    if (!hasReachedReminderTime()) {
      renderReminderBanner();
      return;
    }

    if (state.today[today].tasks.length > 0) {
      renderReminderBanner();
      return;
    }

    const slot = currentHalfHourSlot();
    if (state.meta.lastReminderSlot === `${today}-${slot}`) {
      renderReminderBanner();
      return;
    }

    state.meta.lastReminderSlot = `${today}-${slot}`;
    saveState();
    sendReminderNotification();
    renderReminderBanner();
  }

  function sendReminderNotification() {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    navigator.serviceWorker?.getRegistration().then((reg) => {
      if (reg) {
        reg.showNotification("YouGrow", {
          body: "Create your top 5 priorities for today.",
          tag: "daily-value-task-reminder",
          renotify: true,
        });
      } else {
        new Notification("YouGrow", {
          body: "Create your top 5 priorities for today.",
          tag: "daily-value-task-reminder",
        });
      }
    });
  }

  function hasReachedReminderTime() {
    const [hh, mm] = (state.settings.reminderStart || DEFAULT_REMINDER_TIME)
      .split(":")
      .map((n) => parseInt(n, 10));

    const now = new Date();
    const trigger = new Date(now);
    trigger.setHours(Number.isFinite(hh) ? hh : 8, Number.isFinite(mm) ? mm : 0, 0, 0);
    return now >= trigger;
  }

  function currentHalfHourSlot() {
    const now = new Date();
    return `${now.getHours()}-${Math.floor(now.getMinutes() / 30)}`;
  }

  function getDayStats(dayKey) {
    ensureDayPlan(dayKey);
    const tasks = state.today[dayKey].tasks;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.done).length;

    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    const color = scoreColor(percent);

    return { total, completed, percent, color };
  }

  function scoreColor(percent) {
    if (percent <= 39) return "#6D071A";
    if (percent <= 74) return "#e3a531";
    return "#5f9b73";
  }

  function inferTaskIcon(title) {
    const t = (title || "").toLowerCase();
    const customRules = state.settings.iconRules || [];
    for (const rule of customRules) {
      if (rule.keyword && t.includes(rule.keyword)) return normalizeLegacyIcon(rule.icon);
    }

    let best = "generic";
    let bestScore = 0;
    Object.keys(ICON_KEYWORDS).forEach((token) => {
      const keys = ICON_KEYWORDS[token];
      const score = keys.reduce((acc, key) => acc + (t.includes(key) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = token;
      }
    });
    return best;
  }

  function inferTaskCategory(title) {
    const text = String(title || "").toLowerCase();
    let bestCategory = "Work";
    let bestScore = 0;

    Object.entries(TASK_CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
      const score = keywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    });

    return bestScore > 0 ? bestCategory : "Work";
  }

  function normalizeLegacyIcon(value) {
    const v = String(value || "").trim();
    const byEmoji = {
      "🎾": "tennis",
      "🏋": "fitness",
      "💼": "briefcase",
      "📚": "learn",
      "✉": "mail",
      "🧭": "plan",
      "💰": "money",
      "💻": "code",
      "🏠": "home",
      "🩺": "health",
      "📘": "read",
      "📞": "call",
      "🧠": "idea",
      "🚀": "rocket",
      "📈": "finance",
      "📊": "chart",
      "📝": "write",
      "📅": "calendar",
      "✅": "target",
      "🛒": "shopping",
      "🍎": "food",
      "💧": "water",
      "💤": "sleep",
      "🧘": "meditation",
      "🎯": "target",
      "🎧": "music",
      "🌍": "world",
      "✈": "travel",
      "🚗": "car",
      "📷": "camera",
      "🤝": "meeting",
      "🐶": "pet",
      "🔒": "lock",
      "✓": "generic",
    };
    if (TASK_ICON_SVG[v]) return v;
    if (byEmoji[v]) return byEmoji[v];
    return "generic";
  }

  function renderTaskIconSvg(token) {
    const normalized = normalizeLegacyIcon(token);
    if (TASK_ICON_SVG[normalized]) return TASK_ICON_SVG[normalized];
    return TASK_ICON_SVG.generic;
  }

  function makeDaily5Signature(prefs) {
    const p = prefs || {};
    const topics = Array.isArray(p.topics) ? p.topics.map((t) => String(t).trim().toLowerCase()).sort() : [];
    const language = String(detectDeviceLanguage()).toLowerCase();
    const prompt = String(p.prompt || "").trim().toLowerCase();
    const endpoint = String(p.endpoint || "").trim().toLowerCase();
    return `${topics.join("|")}::${language}::${prompt}::${endpoint}`;
  }

  function isDaily5SessionValid(day) {
    if (!day || !Array.isArray(day.items) || day.items.length !== 5) return false;
    const allowed = new Set(["mcq", "true_false", "fill_blank", "short_answer"]);
    if (setHasDuplicateFacts(day.items)) return false;
    if (!hasRequiredFormatMix(day.items)) return false;
    return day.items.every((item) => {
      if (!item || typeof item !== "object") return false;
      if (!item.type || !item.title || !item.body) return false;
      if (!Array.isArray(item.sources) || item.sources.length < 1) return false;
      const format = item.format || "mcq";
      if (!allowed.has(format)) return false;
      if (format === "mcq") {
        if (!Array.isArray(item.options) || item.options.length < 2) return false;
        return (
          item.options.every((opt) => typeof opt === "object" && typeof opt.text === "string") &&
          item.options.some((opt) => Boolean(opt.correct))
        );
      }
      if (format === "true_false") {
        return typeof item.correctValue === "boolean";
      }
      if (format === "fill_blank" || format === "short_answer") {
        if (typeof item.correctAnswer !== "string" || item.correctAnswer.trim().length < 2) return false;
        if (!Array.isArray(item.acceptedAnswers) || item.acceptedAnswers.length < 1) return false;
        return item.acceptedAnswers.every((a) => typeof a === "string" && a.trim().length >= 2);
      }
      return false;
    });
  }

  function validateTopicConstrainedItems(items, selectedTopics) {
    if (!Array.isArray(items) || items.length !== 5) return false;
    const allowed = new Set(["mcq", "true_false", "fill_blank", "short_answer"]);
    const topics = Array.isArray(selectedTopics)
      ? selectedTopics.map((t) => normalizeTopicForMatch(t)).filter(Boolean)
      : [];
    if (!topics.length) return false;
    if (setHasDuplicateFacts(items)) return false;
    if (!hasRequiredFormatMix(items)) return false;

    return items.every((item) => {
      if (!item || typeof item !== "object") return false;
      if (isVagueQuestion(item)) return false;
      const format = item.format || "mcq";
      if (!allowed.has(format)) return false;
      if (!item.explanation || String(item.explanation).trim().length < 12) return false;
      if (!Array.isArray(item.sources) || item.sources.length < 1) return false;
      const hasUrl = item.sources.some((s) => typeof s?.url === "string" && s.url.startsWith("http"));
      if (!hasUrl) return false;

      const associated = normalizeTopicForMatch(item.associatedTopic || "");
      const text = normalizeTopicForMatch(`${item.associatedTopic || ""} ${item.title || ""} ${item.body || ""}`);
      const hasTopic =
        topics.some((t) => topicMatchesSelected(associated, t)) ||
        topics.some((t) => topicMatchesSelected(text, t));
      if (!hasTopic) return false;

      if (format === "mcq") {
        return (
          Array.isArray(item.options) &&
          item.options.length >= 2 &&
          item.options.every((opt) => opt && typeof opt.text === "string" && opt.text.trim().length > 0) &&
          item.options.some((o) => o && o.correct) &&
          String(item.body || "").includes("?")
        );
      }
      if (format === "true_false") return typeof item.correctValue === "boolean" && String(item.body || "").length > 18;
      if (format === "fill_blank" || format === "short_answer") {
        return (
          typeof item.correctAnswer === "string" &&
          item.correctAnswer.trim().length >= 2 &&
          Array.isArray(item.acceptedAnswers) &&
          item.acceptedAnswers.length >= 1 &&
          item.acceptedAnswers.every((a) => typeof a === "string" && a.trim().length >= 2) &&
          String(item.body || "").length > 18
        );
      }
      return false;
    });
  }

  function hasRequiredFormatMix(items) {
    const required = ["mcq", "true_false", "fill_blank", "short_answer"];
    const formats = new Set((items || []).map((item) => String(item?.format || "mcq").toLowerCase()));
    return required.every((f) => formats.has(f));
  }

  function normalizeFreeResponse(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isCorrectFreeResponse(userAnswer, item) {
    const user = normalizeFreeResponse(userAnswer);
    if (!user) return false;
    const accepted = Array.isArray(item?.acceptedAnswers)
      ? item.acceptedAnswers.map((a) => normalizeFreeResponse(a)).filter(Boolean)
      : [];
    const canonical = normalizeFreeResponse(item?.correctAnswer || "");
    const bank = accepted.concat(canonical ? [canonical] : []);
    return bank.some((ans) => user === ans || user.includes(ans) || ans.includes(user));
  }

  function isVagueQuestion(item) {
    const text = `${item?.title || ""} ${item?.body || ""}`.toLowerCase();
    const banned = [
      "learning cycle",
      "selected for this card",
      "key insight",
      "learning nugget",
      "study method",
      "generic",
      "learning card",
      "daily learning card",
    ];
    return banned.some((b) => text.includes(b));
  }

  function normalizeTopicForMatch(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function topicMatchesSelected(text, selectedTopic) {
    if (!text || !selectedTopic) return false;
    if (text.includes(selectedTopic)) return true;
    const aliases = selectedTopic.split(" ").filter((token) => token.length > 2);
    return aliases.some((token) => text.includes(token));
  }

  function matchesAny(text, words) {
    return words.some((w) => text.includes(w));
  }

  function renderDayStrip() {
    if (!els.dayStrip) return;

    const days = getRecentDayKeys(DAY_STRIP_COUNT);
    if (!days.includes(selectedDayKey)) {
      selectedDayKey = getTodayKey();
    }

    els.dayStrip.innerHTML = "";
    days.forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day-pill";
      if (key === selectedDayKey) btn.classList.add("active");
      if (key === getTodayKey()) btn.classList.add("today");
      const label = formatDayPillLabel(key);
      btn.innerHTML = `<span class="day-pill-week">${label.weekday}</span><span class="day-pill-num">${label.day}</span>`;
      btn.addEventListener("click", () => {
        selectedDayKey = key;
        render();
      });
      els.dayStrip.appendChild(btn);
    });

  }

  function getRecentDayKeys(count) {
    const startedOn = state.meta.startedOn || getTodayKey();
    const keys = [];
    const today = new Date();
    const todayKey = getTodayKey();
    const tomorrowKey = getTomorrowKey();
    keys.push(todayKey, tomorrowKey);
    for (let i = 1; keys.length < count; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dateKey(d);
      if (key < startedOn) break;
      keys.push(key);
    }
    return Array.from(new Set(keys));
  }

  function formatDayPillLabel(key) {
    const d = fromDateKey(key);
    let weekday = d.toLocaleDateString(undefined, { weekday: "short" });
    if (key === getTodayKey()) weekday = "Today";
    if (key === getTomorrowKey()) weekday = "Tomorrow";
    return { weekday, day: d.getDate() };
  }

  function setupWeekdays() {
    if (!els.weekdays) return;

    els.weekdays.innerHTML = "";
    WEEKDAYS.forEach((d) => {
      const div = document.createElement("div");
      div.className = "weekday";
      div.textContent = d;
      els.weekdays.appendChild(div);
    });
  }

  function renderCalendar() {
    if (!els.calendarGrid || !els.monthLabel) return;

    const monthStart = startOfMonth(viewedMonth);
    const monthEnd = endOfMonth(viewedMonth);

    els.monthLabel.textContent = monthStart.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });

    const firstWeekdayMon0 = (monthStart.getDay() + 6) % 7;
    const dayCount = monthEnd.getDate();

    els.calendarGrid.innerHTML = "";

    for (let i = 0; i < firstWeekdayMon0; i += 1) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      els.calendarGrid.appendChild(empty);
    }

    for (let day = 1; day <= dayCount; day += 1) {
      const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const key = dateKey(date);

      const cell = document.createElement("div");
      cell.className = `day-cell ${getDayLevelClass(key)}`;
      if (key === getTodayKey()) cell.classList.add("today");
      cell.textContent = String(day);

      els.calendarGrid.appendChild(cell);
    }
  }

  function getDayLevelClass(key) {
    if (key > getTodayKey()) {
      return "future";
    }

    const startedOn = state.meta.startedOn || getTodayKey();
    if (key < startedOn) {
      return "level-empty";
    }

    const day = state.today[key];
    if (!day || !day.tasks || day.tasks.length === 0) {
      return "level-empty";
    }

    const completed = day.tasks.filter((t) => t.done).length;
    const percent = day.tasks.length === 0 ? 0 : Math.round((completed / day.tasks.length) * 100);

    if (percent <= 39) return "level-red";
    if (percent <= 74) return "level-orange";
    return "level-green";
  }

  function syncOldTodayIntoHistory() {
    const today = getTodayKey();
    Object.keys(state.today).forEach((key) => {
      if (key === today) return;
      const day = state.today[key];
      if (!day || !Array.isArray(day.tasks)) return;

      day.tasks = day.tasks.slice(0, MAX_TASKS);
      day.tasks.forEach((task) => {
        task.done = Boolean(task.done);
      });
    });
  }

  function formatTodayLabel() {
    const now = new Date();
    els.todayLabel.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function loadState() {
    const fallback = {
      today: {},
      settings: {
        reminderStart: DEFAULT_REMINDER_TIME,
        iconRules: [],
        daily5: {
          topics: [],
          customTopics: [],
          language: detectDeviceLanguage(),
          prompt: "",
          endpoint: DAILY5_AI_ENDPOINT,
        },
        firebase: {
          apiKey: "",
          authDomain: "",
          projectId: "",
          messagingSenderId: "",
          appId: "",
          vapidKey: "",
        },
        syncCode: "",
        syncStatus: "",
        fcmToken: "",
        pushStatus: "Firebase not connected",
      },
      daily5ByDate: {},
      meta: {
        lastReminderSlot: null,
        startedOn: getTodayKey(),
        demoSeeded: false,
        aprilResetApplied: false,
        daily5Game: { xp: 0, streak: 0, totalSets: 0, lastCompletedDate: "" },
        daily5UsedFacts: {},
        deviceId: "",
        todoDeletedDays: {},
      },
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        today: parsed.today || {},
        settings: {
          reminderStart: parsed.settings?.reminderStart || DEFAULT_REMINDER_TIME,
          iconRules: Array.isArray(parsed.settings?.iconRules) ? parsed.settings.iconRules : [],
          daily5: {
            topics: Array.isArray(parsed.settings?.daily5?.topics) ? parsed.settings.daily5.topics : [],
            customTopics: Array.isArray(parsed.settings?.daily5?.customTopics) ? parsed.settings.daily5.customTopics : [],
            language: detectDeviceLanguage(),
            prompt: typeof parsed.settings?.daily5?.prompt === "string" ? parsed.settings.daily5.prompt : "",
            endpoint: typeof parsed.settings?.daily5?.endpoint === "string" ? parsed.settings.daily5.endpoint : DAILY5_AI_ENDPOINT,
          },
          firebase: {
            apiKey: parsed.settings?.firebase?.apiKey || "",
            authDomain: parsed.settings?.firebase?.authDomain || "",
            projectId: parsed.settings?.firebase?.projectId || "",
            messagingSenderId: parsed.settings?.firebase?.messagingSenderId || "",
            appId: parsed.settings?.firebase?.appId || "",
            vapidKey: parsed.settings?.firebase?.vapidKey || "",
          },
          syncCode: typeof parsed.settings?.syncCode === "string" ? parsed.settings.syncCode : "",
          syncStatus: typeof parsed.settings?.syncStatus === "string" ? parsed.settings.syncStatus : "",
          fcmToken: parsed.settings?.fcmToken || "",
          pushStatus: parsed.settings?.pushStatus || "Firebase not connected",
        },
        daily5ByDate: parsed.daily5ByDate || {},
        meta: {
          lastReminderSlot: parsed.meta?.lastReminderSlot || null,
          startedOn: parsed.meta?.startedOn || getTodayKey(),
          demoSeeded: Boolean(parsed.meta?.demoSeeded),
          aprilResetApplied: Boolean(parsed.meta?.aprilResetApplied),
          daily5Game: {
            xp: Number(parsed.meta?.daily5Game?.xp) || 0,
            streak: Number(parsed.meta?.daily5Game?.streak) || 0,
            totalSets: Number(parsed.meta?.daily5Game?.totalSets) || 0,
            lastCompletedDate: parsed.meta?.daily5Game?.lastCompletedDate || "",
          },
          daily5UsedFacts: parsed.meta?.daily5UsedFacts && typeof parsed.meta.daily5UsedFacts === "object"
            ? parsed.meta.daily5UsedFacts
            : {},
          deviceId: parsed.meta?.deviceId || "",
          todoDeletedDays: parsed.meta?.todoDeletedDays && typeof parsed.meta.todoDeletedDays === "object"
            ? parsed.meta.todoDeletedDays
            : {},
        },
      };
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function detectDeviceLanguage() {
    const lang = String(navigator.language || "en").toLowerCase();
    const base = lang.split("-")[0];
    return base || "en";
  }

  function getTodayKey() {
    return dateKey(new Date());
  }

  function getTomorrowKey() {
    return dateKey(addDays(new Date(), 1));
  }

  function isEditableDayKey(dayKey) {
    return dayKey === getTodayKey() || dayKey === getTomorrowKey();
  }

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function fromDateKey(key) {
    const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function addMonths(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
  }

  function addDays(date, delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    return d;
  }

  function cryptoRandomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
