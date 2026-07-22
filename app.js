/**
 * MINESTACK AI ARCHITECT - MAIN APPLICATION LOGIC
 * SPA routing, Markdown rendering, Mermaid diagrams, Raw Markdown Editor, Diff Viewer,
 * AI Blueprint Generator, ZIP Export, Live API connection, Console Logs, Metrics,
 * Auth (login/register), and AI Copilot Chat.
 */

(function () {
  const AUTH_USERS_KEY = "minestack_users"; // legacy local users (fallback only)
  const AUTH_SESSION_KEY = "minestack_session";
  const AUTH_TOKEN_KEY = "minestack_session_token";

  // Application State
  const STATE = {
    projects: [],
    currentProject: null,
    currentVersionKey: "v1",
    currentDocKey: "PRD.md",
    currentViewMode: "render", // 'render' | 'raw' | 'diff'
    activeView: "landing", // 'landing' | 'dashboard' | 'workspace' | 'keys' | 'signals' | 'metrics' | 'integrations' | 'billing' | 'support'
    currentUser: null, // { email, name, role }
    sessionToken: localStorage.getItem(AUTH_TOKEN_KEY) || "",
    secureMode: true, // AI key + admin password live on server (/api/*)
    serverConfig: null,
    // AI-inferred category + deep domain analysis for the in-progress consultation
    pendingProjectCategory: "General",
    pendingDomainDefinition: "",
    pendingCoreProcesses: [],
    pendingEnrichedScope: "",
    pendingTables: [],
    isConsulting: false,
    
    // AI display prefs only — secret key NEVER stored in frontend
    aiApiKey: "",
    aiBaseUrl: "/api/ai",
    aiModel: localStorage.getItem("dahono_ai_model") || "combo1",

    // Metrics tracking
    statTotalRequests: parseInt(localStorage.getItem("dahono_stat_total_requests"), 10) || 0,
    statTotalTokens: parseInt(localStorage.getItem("dahono_stat_total_tokens"), 10) || 0,
    statTotalCost: parseFloat(localStorage.getItem("dahono_stat_total_cost")) || 0.0,
    statAvgLatency: parseFloat(localStorage.getItem("dahono_stat_avg_latency")) || 0.0,
    metricsLogs: (function () {
      try {
        const raw = localStorage.getItem("dahono_metrics_logs");
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    })()
  };

  // Tracks in-flight AI document generations (must be declared early for nav/view helpers)
  const activeGenerations = new Set();

  // DOM Element References
  const DOM = {
    // Navigation Views
    viewLanding: document.getElementById("viewLanding"),
    viewDashboard: document.getElementById("viewDashboard"),
    viewWorkspace: document.getElementById("viewWorkspace"),
    viewKeys: document.getElementById("viewKeys"),
    viewSignals: document.getElementById("viewSignals"),
    viewMetrics: document.getElementById("viewMetrics"),
    viewIntegrations: document.getElementById("viewIntegrations"),
    viewBilling: document.getElementById("viewBilling"),
    viewSupport: document.getElementById("viewSupport"),
    
    // Header Buttons / Links
    navBrandBtn: document.getElementById("navBrandBtn"),
    navLinkArchitect: document.getElementById("navLinkArchitect"),
    navLinkTier: document.getElementById("navLinkTier"),
    navLinkDocs: document.getElementById("navLinkDocs"),
    navLinkCatalog: document.getElementById("navLinkCatalog"),
    navLinkBlog: document.getElementById("navLinkBlog"),
    hdrDashboardBtn: document.getElementById("hdrDashboardBtn"),
    heroStartBtn: document.getElementById("heroStartBtn"),
    heroViewDashboardBtn: document.getElementById("heroViewDashboardBtn"),

    // Sidebar Buttons
    sbDashBtn: document.getElementById("sbDashBtn"),
    sbSignalsBtn: document.getElementById("sbSignalsBtn"),
    sbKeysBtn: document.getElementById("sbKeysBtn"),
    sbArchitectBtn: document.getElementById("sbArchitectBtn"),
    sbMetricsBtn: document.getElementById("sbMetricsBtn"),
    sbZapBtn: document.getElementById("sbZapBtn"),
    sbBillingBtn: document.getElementById("sbBillingBtn"),
    sbSupportBtn: document.getElementById("sbSupportBtn"),

    // Dashboard Elements
    dashNewProjectBtn: document.getElementById("dashNewProjectBtn"),
    projectsGridContainer: document.getElementById("projectsGridContainer"),

    // Workspace Elements
    wsBackToDashBtn: document.getElementById("wsBackToDashBtn"),
    wsProjectNameHeading: document.getElementById("wsProjectNameHeading"),
    wsDocNavList: document.getElementById("wsDocNavList"),
    wsDocTitleDisplay: document.getElementById("wsDocTitleDisplay"),
    wsVersionSelect: document.getElementById("wsVersionSelect"),
    wsDownloadZipBtn: document.getElementById("wsDownloadZipBtn"),
    wsRegenerateDocBtn: document.getElementById("wsRegenerateDocBtn"),
    wsToggleCopilotBtn: document.getElementById("wsToggleCopilotBtn"),
    wsCopilotSidebar: document.getElementById("wsCopilotSidebar"),
    wsCopilotCloseBtn: document.getElementById("wsCopilotCloseBtn"),
    wsCopilotMessages: document.getElementById("wsCopilotMessages"),
    wsCopilotInput: document.getElementById("wsCopilotInput"),
    wsCopilotSendBtn: document.getElementById("wsCopilotSendBtn"),

    // View Mode Buttons
    vmBtnRender: document.getElementById("vmBtnRender"),
    vmBtnRaw: document.getElementById("vmBtnRaw"),
    vmBtnDiff: document.getElementById("vmBtnDiff"),

    // Display Containers
    modeRenderContainer: document.getElementById("modeRenderContainer"),
    modeRawContainer: document.getElementById("modeRawContainer"),
    modeDiffContainer: document.getElementById("modeDiffContainer"),
    rawMarkdownEditor: document.getElementById("rawMarkdownEditor"),
    rawCopyBtn: document.getElementById("rawCopyBtn"),
    rawSaveBtn: document.getElementById("rawSaveBtn"),
    diffContentBox: document.getElementById("diffContentBox"),

    // Modal Elements
    modalNewProject: document.getElementById("modalNewProject"),
    modalCloseBtn: document.getElementById("modalCloseBtn"),
    modalCancelBtn: document.getElementById("modalCancelBtn"),
    modalGenerateBtn: document.getElementById("modalGenerateBtn"),
    modalAiConsultBtn: document.getElementById("modalAiConsultBtn"),
    modalFormBody: document.getElementById("modalFormBody"),
    modalProgressBody: document.getElementById("modalProgressBody"),
    inputProjName: document.getElementById("inputProjName"),
    inputProjArchetype: document.getElementById("inputProjArchetype"),
    inputProjPrompt: document.getElementById("inputProjPrompt"),
    // Main form tech stack (create blueprint without AI)
    inputProjFrontendMain: document.getElementById("inputProjFrontendMain"),
    inputProjBackendMain: document.getElementById("inputProjBackendMain"),
    inputProjDbEngineMain: document.getElementById("inputProjDbEngineMain"),
    inputProjDbOrmMain: document.getElementById("inputProjDbOrmMain"),
    genStatusText: document.getElementById("genStatusText"),
    genSubText: document.getElementById("genSubText"),

    // Consultation elements (optional AI recommendation step)
    modalConsultBody: document.getElementById("modalConsultBody"),
    inputProjFrontend: document.getElementById("inputProjFrontend"),
    lblFrontendJustify: document.getElementById("lblFrontendJustify"),
    inputProjBackend: document.getElementById("inputProjBackend"),
    lblBackendJustify: document.getElementById("lblBackendJustify"),
    inputProjDbEngine: document.getElementById("inputProjDbEngine"),
    lblDbEngineJustify: document.getElementById("lblDbEngineJustify"),
    inputProjDbOrm: document.getElementById("inputProjDbOrm"),
    lblDbOrmJustify: document.getElementById("lblDbOrmJustify"),
    lblQuestion1: document.getElementById("lblQuestion1"),
    inputAnswer1: document.getElementById("inputAnswer1"),
    lblQuestion2: document.getElementById("lblQuestion2"),
    inputAnswer2: document.getElementById("inputAnswer2"),
    lblQuestion3: document.getElementById("lblQuestion3"),
    inputAnswer3: document.getElementById("inputAnswer3"),
    modalConsultBackBtn: document.getElementById("modalConsultBackBtn"),
    modalConsultSkipBtn: document.getElementById("modalConsultSkipBtn"),
    modalConsultSubmitBtn: document.getElementById("modalConsultSubmitBtn"),
    lblEnrichedScope: document.getElementById("lblEnrichedScope"),
    containerRecommendedTables: document.getElementById("containerRecommendedTables"),

    // Configuration View Elements
    cfgBaseUrl: document.getElementById("cfgBaseUrl"),
    cfgApiKey: document.getElementById("cfgApiKey"),
    cfgModel: document.getElementById("cfgModel"),
    toggleApiKeyVisible: document.getElementById("toggleApiKeyVisible"),
    btnTestConnection: document.getElementById("btnTestConnection"),
    connStatusBadge: document.getElementById("connStatusBadge"),
    btnSaveConfig: document.getElementById("btnSaveConfig"),

    // Signals View Elements
    btnClearLogs: document.getElementById("btnClearLogs"),
    consoleLogsBody: document.getElementById("consoleLogsBody"),

    // Metrics View Elements
    statTotalRequests: document.getElementById("statTotalRequests"),
    statTotalTokens: document.getElementById("statTotalTokens"),
    statTotalCost: document.getElementById("statTotalCost"),
    statAvgLatency: document.getElementById("statAvgLatency"),
    metricsTableBody: document.getElementById("metricsTableBody"),

    // Integrations Checks
    syncGithubCheck: document.getElementById("syncGithubCheck"),
    syncVercelCheck: document.getElementById("syncVercelCheck"),
    syncSlackCheck: document.getElementById("syncSlackCheck"),

    // CS Widget
    floatingCsWidget: document.getElementById("floatingCsWidget")
  };

  /* ==========================================================================
     0. AUTH (LOGIN / REGISTER / SESSION) — secure via /api/auth
     ========================================================================== */
  function getUsers() {
    try {
      const raw = localStorage.getItem(AUTH_USERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
  }

  /** @deprecated Admin no longer seeded in browser — credentials live in Vercel env */
  function seedAdminUser() {
    // no-op (kept for call-site compatibility)
  }

  function saveSession(user, token) {
    const session = {
      email: user.email,
      name: user.name || user.email.split("@")[0],
      role: user.role || "user"
    };
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    STATE.currentUser = session;
    if (token) {
      STATE.sessionToken = token;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  }

  function clearSession() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    STATE.currentUser = null;
    STATE.sessionToken = "";
  }

  function getSessionToken() {
    return STATE.sessionToken || localStorage.getItem(AUTH_TOKEN_KEY) || "";
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session || !session.email) return null;
      STATE.sessionToken = getSessionToken();
      // Prefer server-validated session when token exists (async refresh on boot)
      STATE.currentUser = {
        email: session.email,
        name: session.name || session.email.split("@")[0],
        role: session.role || "user"
      };
      return STATE.currentUser;
    } catch (e) {
      clearSession();
      return null;
    }
  }

  async function apiAuth(body) {
    const headers = { "Content-Type": "application/json" };
    const token = getSessionToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/auth", {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = { success: false, message: `HTTP ${res.status}` };
    }
    return { ok: res.ok, status: res.status, data };
  }

  async function validateSessionWithServer() {
    const token = getSessionToken();
    if (!token) return false;
    try {
      const { ok, data } = await apiAuth({ action: "me", token });
      if (ok && data && data.success && data.data) {
        saveSession(data.data, token);
        return true;
      }
      clearSession();
      return false;
    } catch (_) {
      // Offline / local: keep cached session for UX, AI will fail until server up
      return Boolean(STATE.currentUser);
    }
  }

  async function fetchServerConfig() {
    try {
      const res = await fetch("/api/config", { method: "GET" });
      if (!res.ok) throw new Error("config unavailable");
      const json = await res.json();
      if (json && json.success && json.data) {
        STATE.serverConfig = json.data;
        STATE.secureMode = Boolean(json.data.secureMode);
        STATE.aiBaseUrl = "/api/ai";
        STATE.aiApiKey = ""; // never keep client key in secure mode
        if (json.data.aiModel) {
          // Prefer server default only when user has not set a local model preference
          if (!localStorage.getItem("dahono_ai_model")) {
            STATE.aiModel = json.data.aiModel;
          }
        }
        return json.data;
      }
    } catch (_) {
      /* XAMPP / static host without serverless /api */
    }
    // Local legacy mode: allow client-side key + proxy.php
    STATE.secureMode = false;
    const storedBase = localStorage.getItem("dahono_ai_baseurl");
    const storedKey = localStorage.getItem("dahono_ai_apikey");
    if (storedBase) STATE.aiBaseUrl = storedBase;
    else if (!STATE.aiBaseUrl || STATE.aiBaseUrl === "/api/ai") {
      STATE.aiBaseUrl = "https://siaptuan.my.id/v1";
    }
    if (storedKey) STATE.aiApiKey = storedKey;
    return null;
  }

  function updateHeaderUser() {
    const emailEl = document.getElementById("hdrUserEmail");
    const roleEl = document.getElementById("hdrUserRole");
    if (!STATE.currentUser) {
      if (emailEl) emailEl.textContent = "—";
      if (roleEl) {
        roleEl.style.display = "none";
        roleEl.textContent = "";
      }
      return;
    }
    if (emailEl) emailEl.textContent = STATE.currentUser.email || "—";
    if (roleEl) {
      if (STATE.currentUser.role === "admin") {
        roleEl.style.display = "inline-flex";
        roleEl.textContent = "admin";
      } else {
        roleEl.style.display = "none";
        roleEl.textContent = STATE.currentUser.role || "user";
      }
    }
  }

  function showAuthGate() {
    const gate = document.getElementById("authGate");
    const shell = document.getElementById("appShell");
    if (gate) {
      gate.hidden = false;
      gate.style.display = "";
    }
    if (shell) shell.hidden = true;
    document.body.classList.add("auth-locked");
    document.body.classList.remove("app-ready");
  }

  function showApp() {
    const gate = document.getElementById("authGate");
    const shell = document.getElementById("appShell");
    if (gate) {
      gate.hidden = true;
      gate.style.display = "none";
    }
    if (shell) shell.hidden = false;
    document.body.classList.remove("auth-locked");
    document.body.classList.add("app-ready");
    updateHeaderUser();
    if (window.lucide) lucide.createIcons();
  }

  function switchAuthTab(tab) {
    const loginForm = document.getElementById("authLoginForm");
    const registerForm = document.getElementById("authRegisterForm");
    const tabLogin = document.getElementById("authTabLogin");
    const tabRegister = document.getElementById("authTabRegister");
    const loginErr = document.getElementById("loginError");
    const regErr = document.getElementById("registerError");
    const regOk = document.getElementById("registerSuccess");

    if (loginErr) loginErr.style.display = "none";
    if (regErr) regErr.style.display = "none";
    if (regOk) regOk.style.display = "none";

    if (tab === "register") {
      if (loginForm) loginForm.style.display = "none";
      if (registerForm) registerForm.style.display = "";
      if (tabLogin) tabLogin.classList.remove("active");
      if (tabRegister) tabRegister.classList.add("active");
    } else {
      if (loginForm) loginForm.style.display = "";
      if (registerForm) registerForm.style.display = "none";
      if (tabLogin) tabLogin.classList.add("active");
      if (tabRegister) tabRegister.classList.remove("active");
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById("loginEmail");
    const passInput = document.getElementById("loginPassword");
    const errEl = document.getElementById("loginError");
    const submitBtn = document.getElementById("loginSubmitBtn");
    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = passInput?.value || "";

    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }

    if (!email || !password) {
      if (errEl) {
        errEl.textContent = "Email dan password wajib diisi.";
        errEl.style.display = "block";
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.7";
    }

    try {
      // 1) Secure path: Vercel /api/auth (password only on server env)
      try {
        const { ok, data } = await apiAuth({ action: "login", email, password });
        if (ok && data && data.success && data.data) {
          saveSession(data.data, data.token || "");
          showApp();
          bootAppAfterLogin();
          addLog("info", `Login server OK: ${data.data.email} (${data.data.role || "user"})`);
          return;
        }
        if (data && data.message) {
          const msg = String(data.message);
          // Real auth rejection from server
          if (!/Cannot POST|404|Failed to fetch|NetworkError|not found/i.test(msg) || ok === false) {
            if (data.success === false && (data.message.includes("salah") || data.message.includes("wajib") || data.message.includes("SESSION") || data.message.includes("ADMIN"))) {
              if (errEl) {
                errEl.textContent = data.message;
                errEl.style.display = "block";
              }
              return;
            }
            if (ok === false && data.success === false) {
              if (errEl) {
                errEl.textContent = data.message || "Email atau password salah.";
                errEl.style.display = "block";
              }
              return;
            }
          }
        }
      } catch (_) {
        // /api/auth unavailable (static host) → local fallback
      }

      // 2) Local fallback: registered users in localStorage only (no hardcoded admin)
      const users = getUsers();
      const user = users.find(u => (u.email || "").toLowerCase() === email);
      if (!user || user.password !== password) {
        if (errEl) {
          errEl.textContent = "Email atau password salah. Production: set ADMIN_EMAIL & ADMIN_PASSWORD di Vercel Env.";
          errEl.style.display = "block";
        }
        return;
      }
      saveSession(user, "");
      showApp();
      bootAppAfterLogin();
      addLog("info", `Login lokal: ${user.email} — AI cloud butuh session dari /api/auth`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
      }
    }
  }

  function handleRegisterSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById("regName");
    const emailInput = document.getElementById("regEmail");
    const passInput = document.getElementById("regPassword");
    const pass2Input = document.getElementById("regPassword2");
    const errEl = document.getElementById("registerError");
    const okEl = document.getElementById("registerSuccess");

    const name = (nameInput?.value || "").trim();
    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = passInput?.value || "";
    const password2 = pass2Input?.value || "";

    if (errEl) {
      errEl.style.display = "none";
      errEl.textContent = "";
    }
    if (okEl) {
      okEl.style.display = "none";
      okEl.textContent = "";
    }

    if (!name || name.length < 2) {
      if (errEl) {
        errEl.textContent = "Nama minimal 2 karakter.";
        errEl.style.display = "block";
      }
      return;
    }
    if (!email || !email.includes("@")) {
      if (errEl) {
        errEl.textContent = "Email tidak valid.";
        errEl.style.display = "block";
      }
      return;
    }
    if (password.length < 6) {
      if (errEl) {
        errEl.textContent = "Password minimal 6 karakter.";
        errEl.style.display = "block";
      }
      return;
    }
    if (password !== password2) {
      if (errEl) {
        errEl.textContent = "Password dan ulangi password tidak sama.";
        errEl.style.display = "block";
      }
      return;
    }

    seedAdminUser();
    const users = getUsers();
    if (users.some(u => (u.email || "").toLowerCase() === email)) {
      if (errEl) {
        errEl.textContent = "Email sudah terdaftar. Silakan masuk.";
        errEl.style.display = "block";
      }
      return;
    }

    const newUser = {
      email,
      password,
      name,
      role: "user",
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);

    if (okEl) {
      okEl.textContent = "Akun berhasil dibuat. Mengalihkan...";
      okEl.style.display = "block";
    }

    saveSession(newUser);
    setTimeout(() => {
      showApp();
      bootAppAfterLogin();
      addLog("info", `Registrasi & login: ${newUser.email}`);
    }, 500);
  }

  function handleLogout() {
    clearSession();
    // Reset sensitive UI bits
    switchView("landing");
    showAuthGate();
    switchAuthTab("login");
    const loginPass = document.getElementById("loginPassword");
    if (loginPass) loginPass.value = "";
    addLog("info", "User logged out.");
  }

  /* ==========================================================================
     FREEMIUM QUOTA (2X FREE AI GENERATE) & PRO SUBSCRIPTION (RP 50.000 / BULAN)
     ========================================================================== */
  function getUserQuotaState() {
    const session = loadSession() || {};
    const email = (session.email || "guest").toLowerCase();
    const quotaKey = `minestack_quota_${email}`;
    let state = { tier: session.role === "admin" ? "pro" : "free", aiUsed: 0, freeQuota: 5 };

    const stored = localStorage.getItem(quotaKey);
    if (stored) {
      try {
        state = { ...state, ...JSON.parse(stored) };
        if (state.tier !== "pro") state.freeQuota = 5; // Ensure upgraded 5x free quota for all members
      } catch (e) {}
    } else {
      localStorage.setItem(quotaKey, JSON.stringify(state));
    }
    return state;
  }

  function isUserAdmin() {
    const session = loadSession() || {};
    return session.role === "admin";
  }

  function updateUserQuotaUI() {
    const quota = getUserQuotaState();
    const badgeTextEl = document.getElementById("lblUserQuotaText");
    const badgeContainer = document.getElementById("userQuotaBadge");

    if (quota.tier === "pro") {
      if (badgeTextEl) badgeTextEl.textContent = "PRO MEMBER (Unlimited)";
      if (badgeContainer) {
        badgeContainer.style.background = "linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(217, 70, 239, 0.25))";
        badgeContainer.style.borderColor = "rgba(168, 85, 247, 0.6)";
        badgeContainer.style.color = "#ffffff";
      }
    } else {
      const remaining = Math.max(0, quota.freeQuota - (quota.aiUsed || 0));
      if (badgeTextEl) badgeTextEl.textContent = `${remaining}/${quota.freeQuota} Free Generate`;
      if (badgeContainer) {
        badgeContainer.style.background = "rgba(139, 92, 246, 0.15)";
        badgeContainer.style.borderColor = "rgba(139, 92, 246, 0.35)";
        badgeContainer.style.color = "#d8b4fe";
      }
    }

    // Role-based UI Visibility: Hide Admin-only features for Member mode (role !== "admin")
    const isAdmin = isUserAdmin();
    const sbKeysBtn = document.getElementById("sbKeysBtn");
    const navLinkCatalog = document.getElementById("navLinkCatalog");
    const sbZapBtn = document.getElementById("sbZapBtn");
    const sbMetricsBtn = document.getElementById("sbMetricsBtn");
    const sbSignalsBtn = document.getElementById("sbSignalsBtn");
    const navLinkBlog = document.getElementById("navLinkBlog");

    if (sbKeysBtn) sbKeysBtn.style.display = isAdmin ? "flex" : "none";
    if (navLinkCatalog) navLinkCatalog.style.display = isAdmin ? "inline-flex" : "none";
    if (sbZapBtn) sbZapBtn.style.display = isAdmin ? "flex" : "none";
    if (sbMetricsBtn) sbMetricsBtn.style.display = isAdmin ? "flex" : "none";
    if (sbSignalsBtn) sbSignalsBtn.style.display = isAdmin ? "flex" : "none";
    if (navLinkBlog) navLinkBlog.style.display = isAdmin ? "inline-flex" : "none";
  }

  function checkAiGenerationAllowed() {
    const quota = getUserQuotaState();
    if (quota.tier === "pro") return true;

    const remaining = quota.freeQuota - (quota.aiUsed || 0);
    if (remaining > 0) return true;

    if (window.Swal) {
      Swal.fire({
        icon: "warning",
        title: "⚡ Kuota AI Gratis (5/5) Anda Habis!",
        html: `
          <p style="font-size:0.95rem; color:#e2e8f0; line-height:1.6; margin-bottom:16px;">
            Pengguna baru mendapatkan <strong>5x Free AI Generate</strong>.<br>
            Untuk melanjutkan generate blueprint tanpa batas, silakan berlangganan ke <strong>Paket Pro Architect (Rp 50.000 / bulan)</strong>.
          </p>
          <div style="background:rgba(139, 92, 246, 0.15); padding:12px; border-radius:8px; border:1px solid rgba(168, 85, 247, 0.4); text-align:left; font-size:0.85rem; color:#d8b4fe;">
            🚀 <strong>Keunggulan Paket Pro Rp 50.000/Bulan:</strong><br>
            • Unlimited AI Blueprint Generation<br>
            • Akses 8 Archetype Sistem (ERP, DMS, Landing Page, E-Commerce)<br>
            • Model AI Tercepat & Terakurat<br>
            • Download FULL ZIP Package Pro
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Berlangganan Pro Rp 50.000 / Bulan",
        cancelButtonText: "Batal",
        confirmButtonColor: "#8b5cf6",
        background: "#151126",
        color: "#ffffff"
      }).then((res) => {
        if (res.isConfirmed) {
          switchView("billing");
          showSubscriptionPaymentModal();
        }
      });
    } else {
      alert("Kuota AI Gratis (5/5) Anda telah habis! Silakan berlangganan Paket Pro Rp 50.000 / bulan di menu Tier & Limit.");
      switchView("billing");
    }
    return false;
  }

  function consumeAiQuota() {
    const quota = getUserQuotaState();
    if (quota.tier === "pro") return;

    quota.aiUsed = (quota.aiUsed || 0) + 1;
    const session = loadSession() || {};
    const email = (session.email || "guest").toLowerCase();
    localStorage.setItem(`minestack_quota_${email}`, JSON.stringify(quota));
    updateUserQuotaUI();
  }

  function handleGoogleAuth(e) {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }

    // Read email & name if typed by user, else default to Gmail user
    const regEmailEl = document.getElementById("regEmail");
    const loginEmailEl = document.getElementById("loginEmail");
    const regNameEl = document.getElementById("regName");

    let targetEmail = (regEmailEl?.value || loginEmailEl?.value || "").trim().toLowerCase();
    let targetName = (regNameEl?.value || "").trim();

    if (!targetEmail || !targetEmail.includes("@")) {
      targetEmail = "dermawan.prb@gmail.com";
    }
    if (!targetName) {
      targetName = targetEmail.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    }

    // Instant registration & session creation
    const users = getUsers();
    let user = users.find(u => (u.email || "").toLowerCase() === targetEmail);
    if (!user) {
      user = {
        email: targetEmail,
        name: targetName + " (Gmail)",
        provider: "google",
        role: "user",
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
    }

    saveSession(user);
    showApp();
    bootAppAfterLogin();
    updateUserQuotaUI();
    addLog("info", `Instant Google Gmail Register: ${targetEmail}`);

    if (window.Swal) {
      Swal.fire({
        icon: "success",
        title: `🎉 Akun Gmail Berhasil Terdaftar!`,
        html: `
          <div style="text-align:center; font-size:0.92rem; color:#e2e8f0; line-height:1.5;">
            Selamat datang <strong>${user.name}</strong> (${user.email})!<br>
            <span style="color:#d8b4fe; font-weight:700; display:block; margin-top:6px;">⚡ Kuota 2x Free AI Blueprint Generate Aktif.</span>
          </div>
        `,
        timer: 2000,
        showConfirmButton: false,
        background: "#151126",
        color: "#ffffff"
      });
    } else {
      alert(`Selamat Datang, ${user.name}! Akun Gmail (${user.email}) Anda aktif dengan 2x Free AI Generate.`);
    }
  }

  function showSubscriptionPaymentModal() {
    if (window.Swal) {
      Swal.fire({
        title: "💳 Berlangganan Pro Architect (Rp 50.000/bln)",
        html: `
          <div style="text-align:left; font-size:0.9rem; color:#e2e8f0; line-height:1.5;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16,185,129,0.12); padding:12px 16px; border-radius:8px; margin-bottom:16px; border:1px solid rgba(16,185,129,0.3);">
              <span>Tagihan Bulanan</span>
              <strong style="font-size:1.25rem; color:#10b981;">Rp 50.000 / Bulan</strong>
            </div>

            <p style="margin-bottom:10px; font-weight:700; color:#ffffff;">Metode Pembayaran Instan:</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
              <div style="border:2px solid #8b5cf6; background:rgba(139, 92, 246, 0.2); padding:12px; border-radius:8px; text-align:center; font-weight:700; color:#ffffff;">
                📱 QRIS / E-Wallet
              </div>
              <div style="border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.03); padding:12px; border-radius:8px; text-align:center; font-weight:600; color:#cbd5e1;">
                🏦 Bank Transfer (BCA)
              </div>
            </div>

            <div style="text-align:center; padding:16px; background:#ffffff; border-radius:10px; margin-bottom:14px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MINESTACK_PRO_50000_MONTHLY" alt="QRIS Rp 50.000" style="display:block; margin:0 auto 8px auto; width:135px; height:135px;">
              <span style="font-size:0.8rem; color:#0f172a; font-weight:800; display:block;">NMAS: MINESTACK ARCHITECT PRO</span>
              <span style="font-size:0.75rem; color:#475569; display:block;">Scan QRIS via GoPay, OVO, ShopeePay, Dana, BCA Mobile</span>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Konfirmasi Pembayaran Instan (Rp 50.000)",
        cancelButtonText: "Batal",
        confirmButtonColor: "#10b981",
        background: "#151126",
        color: "#ffffff"
      }).then((res) => {
        if (res.isConfirmed) {
          const quota = getUserQuotaState();
          quota.tier = "pro";
          const session = loadSession() || {};
          const email = (session.email || "guest").toLowerCase();
          localStorage.setItem(`minestack_quota_${email}`, JSON.stringify(quota));
          updateUserQuotaUI();

          Swal.fire({
            icon: "success",
            title: "🎉 Langganan Pro Berhasil Diaktifkan!",
            html: "Selamat! Akun Anda kini aktif sebagai <strong>Pro Member</strong> dengan <strong>Unlimited AI Blueprint Generation</strong>.",
            confirmButtonColor: "#8b5cf6",
            background: "#151126",
            color: "#ffffff"
          });
        }
      });
    }
  }

  // Expose handlers to global window scope so HTML onclick attributes work seamlessly
  window.handleGoogleAuth = handleGoogleAuth;
  window.showSubscriptionPaymentModal = showSubscriptionPaymentModal;

  function bindAuthEvents() {
    const tabLogin = document.getElementById("authTabLogin");
    const tabRegister = document.getElementById("authTabRegister");
    const goRegister = document.getElementById("goToRegisterBtn");
    const goLogin = document.getElementById("goToLoginBtn");
    const loginForm = document.getElementById("authLoginForm");
    const registerForm = document.getElementById("authRegisterForm");
    const logoutBtn = document.getElementById("hdrLogoutBtn");
    const btnGoogleLogin = document.getElementById("btnGoogleLogin");
    const btnGoogleRegister = document.getElementById("btnGoogleRegister");

    if (btnGoogleLogin) btnGoogleLogin.addEventListener("click", handleGoogleAuth);
    if (btnGoogleRegister) btnGoogleRegister.addEventListener("click", handleGoogleAuth);

    if (tabLogin) tabLogin.addEventListener("click", () => switchAuthTab("login"));
    if (tabRegister) tabRegister.addEventListener("click", () => switchAuthTab("register"));
    if (goRegister) goRegister.addEventListener("click", () => switchAuthTab("register"));
    if (goLogin) goLogin.addEventListener("click", () => switchAuthTab("login"));
    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);
    if (registerForm) registerForm.addEventListener("submit", handleRegisterSubmit);
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

    const wireEye = (btnId, inputId) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (!btn || !input) return;
      btn.addEventListener("click", () => {
        const next = input.type === "password" ? "text" : "password";
        input.type = next;
        btn.innerHTML = next === "text"
          ? `<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>`
          : `<i data-lucide="eye" style="width: 16px; height: 16px;"></i>`;
        if (window.lucide) lucide.createIcons();
      });
    };
    wireEye("loginTogglePass", "loginPassword");
    wireEye("regTogglePass", "regPassword");
  }

  /* ==========================================================================
     SYSTEM AUTH & SERVER CONFIG HELPERS (PREVENT UNCAUGHT REFERENCE ERROR)
     ========================================================================== */
  function getSessionToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  }

  function seedAdminUser() {
    try {
      const users = getUsers();
      if (!users.some(u => u.email === "admin@minestack.ai")) {
        users.push({
          email: "admin@minestack.ai",
          name: "Admin Architect",
          role: "admin",
          tier: "pro",
          createdAt: new Date().toISOString()
        });
        saveUsers(users);
      }
    } catch (e) {}
  }

  async function fetchServerConfig() {
    try {
      const res = await fetch("/api/config", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          STATE.serverConfig = data;
          STATE.secureMode = true;
          return data;
        }
      }
    } catch (err) {}
    STATE.secureMode = false;
    return null;
  }

  async function validateSessionWithServer() {
    try {
      const token = getSessionToken();
      if (!token) return false;
      const res = await fetch("/api/auth?action=validate", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data && data.success;
      }
    } catch (err) {}
    return true;
  }

  async function apiAuth(payload) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, data };
      }
    } catch (e) {}
    return { ok: false, data: null };
  }

  /* ==========================================================================
     1. INITIALIZATION & LOCALSTORAGE MANAGEMENT
     ========================================================================== */
  async function initApp() {
    try {
      seedAdminUser();
      bindAuthEvents();
      setupMermaid();
      bindEvents();
      if (window.lucide) lucide.createIcons();

      try {
        await fetchServerConfig();
      } catch (e) {}

      const session = loadSession();
      if (!session) {
        showAuthGate();
        loadConfigurationInputs();
        updateUserQuotaUI();
        return;
      }

      try {
        if (STATE.secureMode || getSessionToken()) {
          const ok = await validateSessionWithServer();
          if (!ok && STATE.secureMode) {
            clearSession();
            showAuthGate();
            loadConfigurationInputs();
            updateUserQuotaUI();
            return;
          }
        }
      } catch (e) {}

      showApp();
      loadProjectsFromStorage();
      loadConfigurationInputs();
      renderProjectsGrid();
      initLogsConsole();
      updateMetricsUI();
      updateUserQuotaUI();
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error("initApp error recovery:", err);
      showAuthGate();
      updateUserQuotaUI();
    }
  }

  function bootAppAfterLogin() {
    try {
      if (!Array.isArray(STATE.projects)) STATE.projects = [];
      loadProjectsFromStorage();
      if (!Array.isArray(STATE.projects)) STATE.projects = [];
      loadConfigurationInputs();
      renderProjectsGrid();
      initLogsConsole();
      updateMetricsUI();
      updateUserQuotaUI();
      switchView("landing");
    } catch (err) {
      console.error("bootAppAfterLogin failed", err);
      try {
        if (!Array.isArray(STATE.projects)) STATE.projects = window.DEFAULT_PROJECTS || [];
        renderProjectsGrid();
        switchView("landing");
      } catch (e2) {
        console.error("bootAppAfterLogin recovery failed", e2);
      }
    }
  }

  function loadProjectsFromStorage() {
    const stored = localStorage.getItem("dahono_prd_projects");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.versions?.v1?.["DATABASE.md"]) {
          STATE.projects = parsed;
        } else {
          STATE.projects = window.DEFAULT_PROJECTS || [];
          saveProjectsToStorage();
        }
      } catch (e) {
        console.error("Failed to parse stored projects, resetting to defaults", e);
        STATE.projects = window.DEFAULT_PROJECTS || [];
        saveProjectsToStorage();
      }
    } else {
      STATE.projects = window.DEFAULT_PROJECTS || [];
      saveProjectsToStorage();
    }
  }

  function saveProjectsToStorage() {
    localStorage.setItem("dahono_prd_projects", JSON.stringify(STATE.projects));
  }

  function loadConfigurationInputs() {
    const secureHint = document.getElementById("cfgSecureModeHint");
    if (STATE.secureMode) {
      if (DOM.cfgBaseUrl) {
        DOM.cfgBaseUrl.value = "/api/ai";
        DOM.cfgBaseUrl.readOnly = true;
        DOM.cfgBaseUrl.title = "AI base dikelola server (Vercel env AI_BASE_URL)";
      }
      if (DOM.cfgApiKey) {
        DOM.cfgApiKey.value = "";
        DOM.cfgApiKey.placeholder = "•••• dikelola di Vercel Env (AI_API_KEY)";
        DOM.cfgApiKey.readOnly = true;
        DOM.cfgApiKey.disabled = true;
      }
      if (DOM.cfgModel) {
        DOM.cfgModel.value = STATE.aiModel || "combo1";
        DOM.cfgModel.readOnly = false;
        DOM.cfgModel.disabled = false;
      }
      if (secureHint) secureHint.style.display = "block";
      const sc = STATE.serverConfig;
      if (DOM.connStatusBadge && sc) {
        if (sc.aiProviderConfigured) {
          DOM.connStatusBadge.className = "connection-badge status-connected";
          DOM.connStatusBadge.textContent = "Server Ready";
        } else {
          DOM.connStatusBadge.className = "connection-badge status-disconnected";
          DOM.connStatusBadge.textContent = "Env Incomplete";
        }
      }
      return;
    }

    // Local / XAMPP legacy
    if (DOM.cfgBaseUrl) {
      DOM.cfgBaseUrl.value = STATE.aiBaseUrl || "https://siaptuan.my.id/v1";
      DOM.cfgBaseUrl.readOnly = false;
      DOM.cfgBaseUrl.title = "";
    }
    if (DOM.cfgApiKey) {
      DOM.cfgApiKey.value = STATE.aiApiKey || "";
      DOM.cfgApiKey.placeholder = "sk_portal_...";
      DOM.cfgApiKey.readOnly = false;
      DOM.cfgApiKey.disabled = false;
    }
    if (DOM.cfgModel) {
      DOM.cfgModel.value = STATE.aiModel || "combo1";
      DOM.cfgModel.readOnly = false;
      DOM.cfgModel.disabled = false;
    }
    if (secureHint) secureHint.style.display = "none";
  }

  function setupMermaid() {
    if (window.mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#0d0f14',
          primaryColor: '#10b981',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#059669',
          lineColor: '#6b7280',
          secondaryColor: '#1f2937',
          tertiaryColor: '#111827'
        }
      });
    }
  }

  /* ==========================================================================
     2. ROUTING & VIEW SWITCHING
     ========================================================================== */
  function switchView(viewName) {
    // Restrict API Keys, Model Settings, Metrics, and Signals to Admin users only
    if (!isUserAdmin() && (viewName === "keys" || viewName === "integrations" || viewName === "metrics" || viewName === "signals")) {
      if (window.Swal) {
        Swal.fire({
          icon: "info",
          title: "🔒 Akses Terbatas Admin",
          text: "Fitur Metrics, Signals, API Keys & Model Settings hanya dapat diakses oleh Administrator.",
          confirmButtonColor: "#8b5cf6",
          background: "#151126",
          color: "#ffffff"
        });
      } else {
        alert("Fitur Metrics, Signals, API Keys & Model Settings hanya dapat diakses oleh Administrator.");
      }
      viewName = "landing";
    }

    STATE.activeView = viewName;

    // Hide all view containers
    const allViews = [DOM.viewLanding, DOM.viewDashboard, DOM.viewWorkspace, DOM.viewKeys, DOM.viewSignals, DOM.viewMetrics, DOM.viewIntegrations, DOM.viewBilling, DOM.viewSupport];
    allViews.forEach(v => { if (v) v.classList.remove("active"); });

    // Deactivate all outer sidebar buttons
    const allSidebarBtns = [DOM.sbDashBtn, DOM.sbSignalsBtn, DOM.sbKeysBtn, DOM.sbArchitectBtn, DOM.sbMetricsBtn, DOM.sbZapBtn, DOM.sbBillingBtn, DOM.sbSupportBtn];
    allSidebarBtns.forEach(btn => { if (btn) btn.classList.remove("active"); });

    // Deactivate all header navigation links
    const allHeaderLinks = [DOM.navLinkArchitect, DOM.navLinkTier, DOM.navLinkDocs, DOM.navLinkCatalog, DOM.navLinkBlog];
    allHeaderLinks.forEach(lnk => { if (lnk) lnk.classList.remove("active"); });

    if (viewName === "landing") {
      DOM.viewLanding.classList.add("active");
      DOM.sbArchitectBtn.classList.add("active");
      DOM.navLinkArchitect.classList.add("active");
    } else if (viewName === "dashboard") {
      DOM.viewDashboard.classList.add("active");
      DOM.sbDashBtn.classList.add("active");
      renderProjectsGrid();
    } else if (viewName === "workspace") {
      DOM.viewWorkspace.classList.add("active");
      DOM.sbArchitectBtn.classList.add("active");
    } else if (viewName === "keys") {
      DOM.viewKeys.classList.add("active");
      DOM.sbKeysBtn.classList.add("active");
    } else if (viewName === "signals") {
      DOM.viewSignals.classList.add("active");
      DOM.sbSignalsBtn.classList.add("active");
      DOM.navLinkBlog.classList.add("active");
    } else if (viewName === "metrics") {
      DOM.viewMetrics.classList.add("active");
      DOM.sbMetricsBtn.classList.add("active");
    } else if (viewName === "integrations") {
      DOM.viewIntegrations.classList.add("active");
      DOM.sbZapBtn.classList.add("active");
      DOM.navLinkCatalog.classList.add("active");
    } else if (viewName === "billing") {
      DOM.viewBilling.classList.add("active");
      DOM.sbBillingBtn.classList.add("active");
      DOM.navLinkTier.classList.add("active");
    } else if (viewName === "support") {
      DOM.viewSupport.classList.add("active");
      DOM.sbSupportBtn.classList.add("active");
      DOM.navLinkDocs.classList.add("active");
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /* ==========================================================================
     3. DASHBOARD VIEW CONTROLLER
     ========================================================================== */
  function renderProjectsGrid() {
    if (!DOM.projectsGridContainer) return;
    if (!Array.isArray(STATE.projects)) STATE.projects = [];
    DOM.projectsGridContainer.innerHTML = "";

    if (STATE.projects.length === 0) {
      DOM.projectsGridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <i data-lucide="folder-open" style="width: 48px; height: 48px; margin-bottom: 12px; color: var(--text-dim);"></i>
          <h3>Belum ada proyek blueprint</h3>
          <p style="margin-top: 8px;">Klik tombol "+ Project Baru" di atas untuk membuat spesifikasi software dari ide Anda.</p>
        </div>
      `;
      return;
    }

    STATE.projects.forEach(project => {
      const card = document.createElement("div");
      card.className = "project-card";
      card.innerHTML = `
        <button type="button" class="project-delete-btn" data-project-id="${escapeHtml(project.id)}" title="Hapus proyek" aria-label="Hapus proyek ${escapeHtml(project.name)}">
          <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
        </button>
        <div>
          <div class="project-card-header">
            <div class="project-card-title">${escapeHtml(project.name)}</div>
            <span class="project-card-badge">${escapeHtml(project.category || "General")}</span>
          </div>
          <div class="project-card-prompt">${escapeHtml(project.prompt)}</div>
        </div>
        <div class="project-card-footer">
          <span>📅 ${escapeHtml(project.date || "Terbaru")}</span>
          <span class="link-detail">
            Lihat Detail
            <i data-lucide="arrow-right" style="width: 14px; height: 14px;"></i>
          </span>
        </div>
      `;

      const deleteBtn = card.querySelector(".project-delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteProject(project.id);
        });
      }

      card.addEventListener("click", () => {
        openProjectWorkspace(project.id);
      });

      DOM.projectsGridContainer.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function deleteProject(projectId) {
    const project = STATE.projects.find(p => p.id === projectId);
    if (!project) return;

    const ok = confirm(
      `Hapus proyek "${project.name}"?\n\nSemua dokumen blueprint proyek ini akan dihapus permanen dari browser ini.`
    );
    if (!ok) return;

    STATE.projects = STATE.projects.filter(p => p.id !== projectId);
    saveProjectsToStorage();

    if (STATE.currentProject && STATE.currentProject.id === projectId) {
      STATE.currentProject = null;
      switchView("dashboard");
    }

    renderProjectsGrid();
    addLog("info", `Proyek dihapus: "${project.name}"`);
  }

  /* ==========================================================================
     4. WORKSPACE & BLUEPRINT VIEWER CONTROLLER
     ========================================================================== */
  function openProjectWorkspace(projectId, options = {}) {
    const project = STATE.projects.find(p => p.id === projectId);
    if (!project) return;
    const skipAutoGenerate = !!options.skipAutoGenerate;

    // Ensure version skeleton always has all 6 docs
    if (!project.versions) project.versions = {};
    if (!project.versions.v1) project.versions.v1 = {};
    const requiredDocs = ["PRD.md", "TECH_STACK.md", "ARCHITECTURE.md", "DATABASE.md", "API.md", "DEPLOYMENT.md"];
    let skeletonFixed = false;
    requiredDocs.forEach(key => {
      if (project.versions.v1[key] === undefined || project.versions.v1[key] === null) {
        project.versions.v1[key] = "__PENDING_GENERATION__";
        skeletonFixed = true;
      }
    });
    if (skeletonFixed) saveProjectsToStorage();

    STATE.currentProject = project;
    STATE.currentVersionKey = Object.keys(project.versions).pop() || "v1";
    STATE.currentDocKey = "PRD.md"; // Default doc
    STATE.currentViewMode = "render";

    DOM.wsProjectNameHeading.textContent = project.name;

    // Populate version selector dropdown
    DOM.wsVersionSelect.innerHTML = "";
    Object.keys(project.versions).forEach(vKey => {
      const opt = document.createElement("option");
      opt.value = vKey;
      opt.textContent = `${vKey} (Latest)`;
      DOM.wsVersionSelect.appendChild(opt);
    });
    DOM.wsVersionSelect.value = STATE.currentVersionKey;

    renderDocumentNav();
    updateWorkspaceDocumentView();
    switchView("workspace");

    // Auto-fill empty/pending docs when opening an existing project (not during brand-new create flow)
    if (!skipAutoGenerate) {
      const hasEmpty = requiredDocs.some(k => isDocumentEmptyOrPending(project.versions.v1[k]));
      if (hasEmpty) {
        prefetchProjectDocuments(project.id, true).catch(err => {
          console.error("auto-generate empty docs failed", err);
        });
      }
    }
  }

  function isDocumentEmptyOrPending(content) {
    if (content == null) return true;
    const text = String(content).trim();
    if (!text) return true;
    if (text === "__PENDING_GENERATION__") return true;
    // Treat near-empty / placeholder stubs as incomplete so AI can regenerate
    if (text.length < 80) return true;
    if (/belum ada konten/i.test(text)) return true;
    if (/spesifikasi belum diisi/i.test(text)) return true;
    return false;
  }

  function showDocumentGeneratingState(docKey) {
    DOM.vmBtnRender.classList.add("active");
    DOM.modeRenderContainer.style.display = "block";
    DOM.modeRawContainer.style.display = "none";
    DOM.modeDiffContainer.style.display = "none";
    DOM.modeRenderContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 350px; text-align: center; gap: 20px; color: var(--text-muted);">
        <div class="spinner-ring" style="border-top-color: var(--accent-green); width: 36px; height: 36px;"></div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h3 style="font-size: 1.05rem; font-weight: 600; color: #ffffff;">AI sedang menulis ${escapeHtml(docKey)}...</h3>
          <p style="font-size: 0.85rem; max-width: 360px;">Minestack AI menyusun spesifikasi detail lewat model <code>${escapeHtml(STATE.aiModel)}</code>. Mohon tunggu beberapa detik.</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 400px; margin-top: 10px; opacity: 0.4;">
          <div style="height: 10px; width: 80%; background: var(--bg-card); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div>
          <div style="height: 10px; width: 100%; background: var(--bg-card); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out; animation-delay: 0.2s;"></div>
          <div style="height: 10px; width: 60%; background: var(--bg-card); border-radius: 4px; animation: pulse 1.5s infinite ease-in-out; animation-delay: 0.4s;"></div>
        </div>
      </div>
    `;
  }

  function showEmptyDocumentActions(docKey) {
    DOM.vmBtnRender.classList.add("active");
    DOM.modeRenderContainer.style.display = "block";
    DOM.modeRawContainer.style.display = "none";
    DOM.modeDiffContainer.style.display = "none";
    DOM.modeRenderContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 320px; text-align: center; gap: 16px; color: var(--text-muted); padding: 24px;">
        <i data-lucide="file-warning" style="width: 40px; height: 40px; color: #f59e0b;"></i>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h3 style="font-size: 1.05rem; font-weight: 600; color: #ffffff;">Dokumen ${escapeHtml(docKey)} masih kosong</h3>
          <p style="font-size: 0.85rem; max-width: 420px; line-height: 1.5;">
            Konten belum digenerate atau generasi sebelumnya gagal. Klik tombol di bawah untuk mengisi dokumen ini memakai AI yang sudah terintegrasi.
          </p>
        </div>
        <button type="button" class="btn-primary" id="btnGenerateEmptyDoc" style="padding: 10px 18px; gap: 8px;">
          <i data-lucide="sparkles" style="width: 16px; height: 16px;"></i>
          Generate dengan AI
        </button>
        <button type="button" class="btn-outline" id="btnGenerateAllEmptyDocs" style="padding: 8px 14px; gap: 8px; font-size: 0.85rem;">
          <i data-lucide="layers" style="width: 14px; height: 14px;"></i>
          Generate Semua Dokumen Kosong
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    const oneBtn = document.getElementById("btnGenerateEmptyDoc");
    if (oneBtn) {
      oneBtn.addEventListener("click", () => {
        if (!STATE.currentProject) return;
        showDocumentGeneratingState(docKey);
        triggerDocumentGeneration(STATE.currentProject.id, docKey, true).catch(err => {
          addLog("error", `Generate ${docKey} gagal: ${err.message || err}`);
        });
      });
    }
    const allBtn = document.getElementById("btnGenerateAllEmptyDocs");
    if (allBtn) {
      allBtn.addEventListener("click", () => {
        if (!STATE.currentProject) return;
        showDocumentGeneratingState(docKey);
        prefetchProjectDocuments(STATE.currentProject.id, true).catch(err => {
          addLog("error", `Generate semua dokumen gagal: ${err.message || err}`);
        });
      });
    }
  }

  function renderDocumentNav() {
    DOM.wsDocNavList.innerHTML = "";

    const project = STATE.currentProject;
    const versionData = project ? (project.versions[STATE.currentVersionKey] || {}) : {};

    window.DOCUMENT_TYPES.forEach(docType => {
      const content = versionData[docType.key];
      const isPending = content === "__PENDING_GENERATION__" || activeGenerations.has(`${project?.id}-${docType.key}`);
      const isEmpty = isDocumentEmptyOrPending(content) && !isPending;
      const item = document.createElement("div");
      item.className = `doc-nav-item ${docType.key === STATE.currentDocKey ? "active" : ""}`;
      
      let indicatorHtml = "";
      if (isPending) {
        indicatorHtml = `<span class="loading-pulse-dot" style="display:inline-block; width: 6px; height: 6px; background-color: var(--accent-blue); border-radius: 50%; margin-left: auto; box-shadow: 0 0 6px var(--accent-blue); animation: pulse 1.2s infinite ease-in-out;"></span>`;
      } else if (isEmpty) {
        indicatorHtml = `<span title="Dokumen kosong" style="display:inline-block; width: 6px; height: 6px; background-color: #f59e0b; border-radius: 50%; margin-left: auto;"></span>`;
      } else {
        indicatorHtml = `<span title="Siap" style="display:inline-block; width: 6px; height: 6px; background-color: var(--accent-green); border-radius: 50%; margin-left: auto;"></span>`;
      }

      item.innerHTML = `
        <i data-lucide="${docType.icon}" style="width: 18px; height: 18px;"></i>
        <span>${escapeHtml(docType.label)}</span>
        ${indicatorHtml}
      `;

      item.addEventListener("click", () => {
        STATE.currentDocKey = docType.key;
        renderDocumentNav();
        updateWorkspaceDocumentView();
      });

      DOM.wsDocNavList.appendChild(item);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function updateWorkspaceDocumentView() {
    const docMeta = window.DOCUMENT_TYPES.find(d => d.key === STATE.currentDocKey);
    DOM.wsDocTitleDisplay.textContent = docMeta ? docMeta.label.split(" (")[0] : STATE.currentDocKey;

    const project = STATE.currentProject;
    if (!project) return;
    const versionData = project.versions[STATE.currentVersionKey] || {};
    const rawContent = versionData[STATE.currentDocKey];
    const genKey = `${project.id}-${STATE.currentDocKey}`;

    // Update Mode Buttons
    [DOM.vmBtnRender, DOM.vmBtnRaw, DOM.vmBtnDiff].forEach(btn => btn.classList.remove("active"));
    DOM.modeRenderContainer.style.display = "none";
    DOM.modeRawContainer.style.display = "none";
    DOM.modeDiffContainer.style.display = "none";

    // Show generating spinner if pending or actively generating
    if (rawContent === "__PENDING_GENERATION__" || activeGenerations.has(genKey)) {
      showDocumentGeneratingState(STATE.currentDocKey);
      if (rawContent === "__PENDING_GENERATION__") {
        triggerDocumentGeneration(project.id, STATE.currentDocKey, false).catch(err => {
          addLog("error", `Generate ${STATE.currentDocKey} gagal: ${err.message || err}`);
        });
      }
      return;
    }

    // Empty docs: offer AI generate button instead of blank page
    if (isDocumentEmptyOrPending(rawContent)) {
      showEmptyDocumentActions(STATE.currentDocKey);
      return;
    }

    if (STATE.currentViewMode === "render") {
      DOM.vmBtnRender.classList.add("active");
      DOM.modeRenderContainer.style.display = "block";
      renderMarkdownAndDiagrams(rawContent);
    } else if (STATE.currentViewMode === "raw") {
      DOM.vmBtnRaw.classList.add("active");
      DOM.modeRawContainer.style.display = "block";
      DOM.rawMarkdownEditor.value = rawContent;
    } else if (STATE.currentViewMode === "diff") {
      DOM.vmBtnDiff.classList.add("active");
      DOM.modeDiffContainer.style.display = "block";
      renderDiffView(rawContent);
    }
  }

  function renderMarkdownAndDiagrams(markdownText) {
    if (window.marked) {
      // Parse Markdown
      const html = marked.parse(markdownText);
      DOM.modeRenderContainer.innerHTML = html;

      // Highlight code blocks
      if (window.hljs) {
        DOM.modeRenderContainer.querySelectorAll("pre code").forEach(block => {
          if (!block.classList.contains("language-mermaid")) {
            hljs.highlightElement(block);
          }
        });
      }

      // Render Mermaid Diagrams
      const mermaidBlocks = DOM.modeRenderContainer.querySelectorAll("pre code.language-mermaid");
      mermaidBlocks.forEach((codeBlock, idx) => {
        const mermaidCode = codeBlock.textContent;
        const parentPre = codeBlock.parentElement;

        const diagramCard = document.createElement("div");
        diagramCard.className = "mermaid-diagram-card";
        const graphId = `mermaid-graph-${Date.now()}-${idx}`;
        diagramCard.id = graphId;

        parentPre.replaceWith(diagramCard);

        if (window.mermaid) {
          try {
            mermaid.render(graphId + "-svg", mermaidCode).then(({ svg }) => {
              diagramCard.innerHTML = svg;
            }).catch(err => {
              console.warn("Mermaid render error:", err);
              diagramCard.innerHTML = `<pre style="color: #ef4444;">${escapeHtml(mermaidCode)}</pre>`;
            });
          } catch (e) {
            diagramCard.innerHTML = `<pre style="color: #ef4444;">${escapeHtml(mermaidCode)}</pre>`;
          }
        }
      });
    } else {
      DOM.modeRenderContainer.textContent = markdownText;
    }
  }

  function renderDiffView(currentContent) {
    DOM.diffContentBox.innerHTML = "";
    
    const lines = currentContent.split("\n");
    lines.forEach((line, i) => {
      const div = document.createElement("div");
      div.className = "diff-line diff-line-unchanged";
      
      if (line.startsWith("# ") || line.startsWith("## ")) {
        div.className = "diff-line diff-line-added";
        div.innerHTML = `<span style="user-select:none; opacity:0.6;">+</span> <span>${escapeHtml(line)}</span>`;
      } else {
        div.innerHTML = `<span style="user-select:none; opacity:0.4;"> </span> <span>${escapeHtml(line)}</span>`;
      }
      
      DOM.diffContentBox.appendChild(div);
    });
  }

  /* ==========================================================================
     5. ZIP EXPORT FUNCTIONALITY
     ========================================================================== */
  function exportProjectZip() {
    if (!STATE.currentProject) return;

    if (!window.JSZip) {
      alert("Library JSZip belum siap. Silakan coba beberapa saat lagi.");
      return;
    }

    const zip = new JSZip();
    const project = STATE.currentProject;
    const versionData = project.versions[STATE.currentVersionKey] || {};

    const folderName = project.name.toLowerCase().replace(/\s+/g, "_") + "_blueprint";
    const folder = zip.folder(folderName);

    window.DOCUMENT_TYPES.forEach(docType => {
      const content = versionData[docType.key] || `# ${docType.label}\n\nSpesifikasi belum diisi.`;
      folder.file(docType.key, content);
    });

    zip.generateAsync({ type: "blob" }).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  /* ==========================================================================
     6. LIVE AI BLUEPRINT GENERATOR & FALLBACK
     ========================================================================== */
  function isPhpProxyAvailable() {
    // Live Server / static hosts cannot execute proxy.php
    const port = String(window.location.port || "");
    const liveServerPorts = new Set(["5500", "5501", "5502", "5510", "5173", "3000", "4173", "8080"]);
    if (liveServerPorts.has(port)) return false;
    // file:// has no PHP either
    if (window.location.protocol === "file:") return false;
    return window.location.protocol.startsWith("http");
  }

  function looksLikePhpSource(text) {
    if (!text) return false;
    const t = text.trimStart();
    return t.startsWith("<?php") || t.includes("curl_init($targetUrl)") || t.includes("// proxy.php");
  }

  async function performAiRequest(targetUrl, bodyData, options = {}) {
    const body = JSON.stringify(bodyData);
    const signal = options.signal;
    const sessionToken = getSessionToken();

    // 1) Secure path (Vercel / vercel dev): POST /api/ai — server holds AI_API_KEY
    //    Session Bearer required. targetUrl is ignored (server uses AI_BASE_URL).
    const trySecure =
      STATE.secureMode ||
      Boolean(sessionToken) ||
      (typeof targetUrl === "string" && targetUrl.indexOf("/api/ai") === 0);

    if (trySecure) {
      try {
        const secureHeaders = { "Content-Type": "application/json" };
        if (sessionToken) {
          secureHeaders["Authorization"] = `Bearer ${sessionToken}`;
        }
        const secureResp = await fetch("/api/ai", {
          method: "POST",
          headers: secureHeaders,
          body,
          signal
        });
        // Fall through only when route clearly missing (local static without vercel)
        if (secureResp.status !== 404 && secureResp.status !== 405) {
          return secureResp;
        }
        if (STATE.secureMode) {
          return secureResp; // surface real error body (401/500 etc.)
        }
        addLog("info", "/api/ai tidak tersedia. Fallback ke proxy.php / direct...");
      } catch (secureErr) {
        if (secureErr && secureErr.name === "AbortError") throw secureErr;
        if (STATE.secureMode && !STATE.aiApiKey) {
          throw new Error(
            `${secureErr.message}. Endpoint /api/ai tidak terjangkau. Deploy ke Vercel atau jalankan: vercel dev`
          );
        }
        addLog("info", `/api/ai gagal (${secureErr.message}). Fallback legacy...`);
      }
    }

    // 2) Legacy: PHP proxy (XAMPP) — client may supply API key
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STATE.aiApiKey || ""}`
    };
    const canUseProxy = isPhpProxyAvailable();
    const legacyUrl =
      targetUrl && !String(targetUrl).startsWith("/api/")
        ? targetUrl
        : `${(STATE.aiBaseUrl || "https://siaptuan.my.id/v1").replace(/\/+$/, "")}/chat/completions`;

    if (canUseProxy) {
      try {
        const proxyResp = await fetch("proxy.php", {
          method: "POST",
          headers: {
            ...headers,
            "X-Target-URL": legacyUrl
          },
          body,
          signal
        });
        const clone = proxyResp.clone();
        const text = await clone.text();
        if (looksLikePhpSource(text) || proxyResp.status === 405) {
          addLog("info", "proxy.php tidak dieksekusi (static server). Mencoba direct API...");
        } else {
          return proxyResp;
        }
      } catch (proxyErr) {
        if (proxyErr && proxyErr.name === "AbortError") throw proxyErr;
        addLog("info", `Proxy gagal (${proxyErr.message}). Mencoba direct API...`);
      }
    }

    // 3) Direct upstream (CORS-dependent)
    try {
      return await fetch(legacyUrl, {
        method: "POST",
        headers,
        body,
        signal
      });
    } catch (directErr) {
      if (directErr && directErr.name === "AbortError") throw directErr;
      const hint = STATE.secureMode
        ? "Gunakan Vercel production atau `vercel dev` agar /api/ai aktif."
        : canUseProxy
          ? "Direct API diblokir CORS. Pastikan Apache/XAMPP menjalankan proxy.php."
          : "Buka lewat XAMPP atau deploy Vercel. Live Server tidak punya /api/ai maupun proxy.php.";
      throw new Error(`${directErr.message}. ${hint}`);
    }
  }

  function getCategoryStackRecommendation(category, prompt, forcedArchetype = "AUTO") {
    const cat = (category || "").toLowerCase();
    const idea = (prompt || "").toLowerCase();
    const combined = `${cat} ${idea}`;
    const arch = (forcedArchetype || "AUTO").toUpperCase();

    // 0. Financial Accounting & Payroll Management (Pencatatan Keuangan, Gaji & Pengeluaran) Archetype
    if (
      arch === "FINANCE" || arch === "PAYROLL" ||
      (arch === "AUTO" && (
        combined.includes("gaji") || combined.includes("payroll") || combined.includes("pengeluaran") ||
        combined.includes("keuangan") || combined.includes("pencatatan keuangan") || combined.includes("laporan keuangan") ||
        combined.includes("cost") || combined.includes("cashflow") || combined.includes("slip gaji") ||
        combined.includes("beban") || combined.includes("pemasukan") || combined.includes("anggaran")
      ))
    ) {
      return {
        category: "Pencatatan Keuangan & Pengeluaran Gaji (Financial & Payroll)",
        domainDefinition: "Platform pencatatan keuangan digital terintegrasi untuk pengelolaan laporan keuangan, penggajian (payroll), alokasi pengeluaran operasional (cost breakdown), perbandingan bulanan, serta analisis grafik tren keuangan tahunan.",
        coreProcesses: [
          "Pencatatan Pemasukan & Pengeluaran Operasional",
          "Pengelolaan Gaji Karyawan & Slip Gaji (Payroll)",
          "Pengelompokan Cost / Beban Pengeluaran (Category Expense)",
          "Rekonsiliasi Arus Kas (Cashflow & Double-Entry Ledger)",
          "Dashboard Analitik & Grafik Keuangan Tahunan",
          "Laporan Perbandingan Keuangan Bulanan & Ekspor PDF/Excel"
        ],
        frontend: "React + Next.js",
        frontendWhy: "Cocok untuk dashboard keuangan interaktif, rendering grafik tahunan, dan ekspor laporan.",
        backend: "Node.js + Express",
        backendWhy: "Efisien mengelola kalkulasi payroll, transaksi keuangan, dan API laporan.",
        db: "PostgreSQL",
        dbWhy: "Integritas data relasional tinggi (ACID) untuk pencatatan transaksi keuangan & buku besar.",
        orm: "Prisma",
        ormWhy: "Type-safe schema untuk relasi karyawan-gaji-kategori_pengeluaran-laporan.",
        scope: "Platform Pencatatan Keuangan & Gaji multi-role (Staf Keuangan/Finance, HR/Payroll Admin, Manajer/Direktur, Auditor) yang mengintegrasikan pengisian & approval pengeluaran, pengelompokan cost center, perhitungan gaji, grafik tren tahunan, perbandingan bulanan, dan jejak audit transaksi.",
        rolesMarkdown: `* **Staf Finance / Akuntan**: Menginput transaksi pengeluaran, mengelompokkan biaya, dan melakukan verifikasi nota.
* **Admin HR / Payroll**: Mengelola komponen gaji karyawan, potongan, tunjangan, dan menerbitkan slip gaji.
* **Manajer / Direktur**: Memantau dashboard grafik tahunan, evaluasi perbandingan bulanan, dan approval pengeluaran besar.
* **Auditor / Internal Control**: Memeriksa kelengkapan bukti transaksi dan jejak audit pengeluaran.`,
        userStoriesMarkdown: `* Sebagai **Staf Finance**, saya ingin mencatat pengeluaran operasional beserta kategorinya agar alokasi biaya terpantau dengan jelas.
* Sebagai **Admin Payroll**, saya ingin memproses penggajian bulanan agar distribusi gaji tepat waktu dan tercatat di laporan keuangan.
* Sebagai **Direktur**, saya ingin melihat grafik tren tahunan dan perbandingan bulanan agar dapat mengevaluasi efisiensi pengeluaran perusahaan.`,
        kpiMarkdown: `* Akurasi Perhitungan Payroll & Pengeluaran = 100%.
* Waktu Penyusunan Laporan Bulanan < 1 hari kerja.
* Waktu Muat Dashboard Grafik Keuangan < 1.5 detik.`,
        tables: [
          { name: "users", columns: "id, email, password_hash, role, full_name, status, created_at", description: "Pengguna sistem (Finance, HR, Direktur, Auditor)." },
          { name: "expense_categories", columns: "id, code, name, type, description", description: "Kategori pengeluaran & cost center (Gaji, Operasional, Maintenance, dll.)." },
          { name: "employees", columns: "id, nik, full_name, department, base_salary, status", description: "Master data karyawan & gaji pokok." },
          { name: "payroll_runs", columns: "id, period_month, period_year, total_disbursed, status, processed_at", description: "Batch pemrosesan gaji bulanan." },
          { name: "payslips", columns: "id, payroll_run_id, employee_id, base_salary, allowances, deductions, net_salary, payment_status", description: "Rincian slip gaji per karyawan." },
          { name: "expenses", columns: "id, expense_no, category_id, amount, description, vendor_name, proof_file_url, status, created_by, created_at", description: "Catatan transaksi pengeluaran operasional." },
          { name: "incomes", columns: "id, income_no, source_name, amount, description, date, created_at", description: "Catatan transaksi pemasukan dana." },
          { name: "general_ledgers", columns: "id, ref_no, account_code, debit, credit, balance, transaction_date", description: "Jurnal umum / buku besar keuangan." },
          { name: "monthly_budgets", columns: "id, category_id, period_month, period_year, allocated_amount, spent_amount", description: "Anggaran bulanan per kategori pengeluaran." },
          { name: "financial_reports", columns: "id, report_type, period_month, period_year, total_income, total_expense, net_profit, file_url", description: "Ringkasan laporan keuangan periodik." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, entity_id, meta, created_at", description: "Jejak audit transaksi & perubahan gaji." }
        ],
        questions: [
          "Apakah pengeluaran gaji dipisahkan per divisi/departemen?",
          "Apakah perlu integrasi otomatis dengan rekening bank / internet banking?",
          "Apakah ada approval berlapis untuk pengeluaran di atas nominal tertentu?"
        ]
      };
    }

    // 1. B2B Heavy Equipment Sparepart & Suku Cadang E-Commerce Archetype
    if (
      arch === "ECOMMERCE" ||
      (arch === "AUTO" && (
        combined.includes("sparepart") || combined.includes("spare part") || combined.includes("suku cadang") ||
        combined.includes("caterpillar") || combined.includes("komatsu") || combined.includes("kobelco") ||
        combined.includes("hitachi") || combined.includes("volvo") || combined.includes("hino") ||
        combined.includes("sitrak") || combined.includes("part number") || combined.includes("oem") ||
        combined.includes("tokosparepart") || combined.includes("distributor sparepart") || combined.includes("alat berat")
      ))
    ) {
      return {
        category: "E-Commerce & B2B Sparepart Sales (Alat Berat & Suku Cadang)",
        domainDefinition: "Platform E-Commerce & Katalog B2B Jual-Beli Sparepart / Suku Cadang Alat Berat & Kendaraan (Caterpillar, Komatsu, Kobelco, Hitachi, Volvo, Hino, Sitrak, dll.) terintegrasi dengan pencarian Nomor Part (OEM/Aftermarket), Stok Real-time Per Gudang, Pembuatan Quotation Penawaran Harga B2B, Checkout Pesanan, Faktur Invoice, dan Armada Pengiriman Cargo.",
        coreProcesses: [
          "Pencarian Katalog Sparepart (Filter Merk Alat Berat, Model Unit, & OEM Part Number)",
          "Manajemen Stok & Varian (Part Original OEM vs Aftermarket, Harga Grosir/Eceran)",
          "Penerbitan Penawaran Harga B2B (Quotation / Permintaan Harga Partai Besar)",
          "Keranjang Belanja & Checkout (Pilihan Pembayaran Transfer/PO Kontrak & Expedisi Cargo)",
          "Pemrosesan Pesanan (Order Processing -> Packing Gudang -> Resi Pengiriman Cargo)",
          "Invoice Faktur & Manajemen Riwayat Belanja Pelanggan"
        ],
        frontend: "React + Next.js",
        frontendWhy: "SEO katalog sparepart berkinerja tinggi, pencarian part number cepat, & UI responsif.",
        backend: "Node.js + Express",
        backendWhy: "Efisien mengelola API transaksi, katalog sparepart multi-brand, & integrasi pembayaran.",
        db: "PostgreSQL",
        dbWhy: "Integritas relasional tinggi untuk relasi brand-part_number-quotation-order-invoice.",
        orm: "Prisma",
        ormWhy: "Type-safe schema untuk mengelola relasi kompleks katalog sparepart.",
        scope: "Platform B2B E-Commerce & Katalog Sparepart Alat Berat multi-role (Pembeli/Kontraktor, Sales Representative, Admin Gudang, Toko Manager) yang mengintegrasikan pencarian part number OEM, penawaran harga B2B (quotation), checkout pesanan, manajemen stok per cabang, invoice faktur, dan status pengiriman cargo.",
        rolesMarkdown: `* **Pembeli / Buyer (Kontraktor, Pemilik Fleet & Bengkel)**: Mencari sparepart presisi berdasarkan brand & nomor part OEM, menyimpan daftar armada, dan membuat PO / checkout order.
* **Sales / Staff Penjualan**: Menerbitkan Penawaran Harga (Quotation B2B), memverifikasi pembayaran, dan membuatkan Invoice Faktur.
* **Admin Gudang & Logistik**: Mengelola master part number, update stok gudang real-time, dan memproses pengiriman cargo.
* **Manajer Toko / Pemilik**: Memantau omzet penjualan sparepart, produk terlaris per merk alat berat, dan laporan keuangan.`,
        userStoriesMarkdown: `* Sebagai **Pembeli/Kontraktor**, saya ingin mencari sparepart berdasarkan merk alat berat (Komatsu/Caterpillar) dan part number agar menemukan suku cadang yang presisi.
* Sebagai **Sales Rep**, saya ingin menerbitkan Quotation (Penawaran Harga) resmi untuk pembelian B2B partai besar.
* Sebagai **Admin Gudang**, saya ingin memperbarui stok sparepart secara real-time agar tidak terjadi over-selling.`,
        kpiMarkdown: `* Akurasi Pencarian Part Number & Filter Brand Alat Berat = 100%.
* Conversion Rate Pencarian ke Pembelian Sparepart >= 15%.
* Order Fulfillment Time < 24 jam dari Checkout hingga Pengiriman Cargo.`,
        tables: [
          { name: "users", columns: "id, email, password_hash, role, full_name, company_name, phone, status, created_at", description: "Pembeli B2B / Sales / Admin Gudang." },
          { name: "brands", columns: "id, code, name, logo_url, country", description: "Merk alat berat (Caterpillar, Komatsu, Kobelco, Hitachi, Volvo, Hino, dll.)." },
          { name: "spareparts", columns: "id, brand_id, part_number, oem_number, name, category, unit_price, is_oem, status", description: "Master katalog sparepart." },
          { name: "part_compatibilities", columns: "id, sparepart_id, unit_model, engine_type, note", description: "Kesesuaian sparepart dengan tipe unit alat berat." },
          { name: "inventory_stocks", columns: "id, sparepart_id, warehouse_name, qty_on_hand, min_stock", description: "Stok sparepart per lokasi gudang." },
          { name: "quotations", columns: "id, quote_no, buyer_id, sales_id, total_amount, valid_until, status, created_at", description: "Penawaran harga resmi B2B." },
          { name: "quotation_items", columns: "id, quotation_id, sparepart_id, qty, unit_price", description: "Detail rincian penawaran harga." },
          { name: "orders", columns: "id, order_no, buyer_id, quotation_id, total_amount, payment_method, payment_status, shipping_status, created_at", description: "Pesanan transaksi sparepart." },
          { name: "order_items", columns: "id, order_id, sparepart_id, qty, unit_price", description: "Rincian barang dalam pesanan." },
          { name: "invoices", columns: "id, invoice_no, order_id, tax_amount, grand_total, due_date, status", description: "Faktur invoice tagihan." },
          { name: "shipments", columns: "id, order_id, courier_name, tracking_no, status, shipped_at", description: "Pengiriman via ekspedisi/cargo." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, entity_id, meta, created_at", description: "Log audit perubahan harga & stok." }
        ],
        questions: [
          "Apakah perlu fitur pencarian khusus berdasarkan OEM Part Number?",
          "Apakah transaksi B2B menggunakan sistem Penawaran Harga (Quotation) sebelum checkout?",
          "Apakah stok sparepart dipisahkan per lokasi gudang/cabang?"
        ]
      };
    }

    // 1. Digital Archive & SOP / DMS Archetype
    if (
      arch === "ARCHIVE_SOP" ||
      (arch === "AUTO" && (
        combined.includes("arsip") || combined.includes("sop") || combined.includes("jsa") ||
        combined.includes("document") || combined.includes("archive") || combined.includes("dms") ||
        combined.includes("berkas")
      ))
    ) {
      return {
        category: "Digital Archive & SOP Management (DMS)",
        domainDefinition: "Sistem pengarsipan digital terintegrasi untuk mengelola berkas dokumen, standar operasional prosedur (SOP), Job Safety Analysis (JSA), hierarki folder/direktori, versi dokumen, kontrol akses, audit log, dan preview PDF — bukan sekadar repositori file mentah.",
        coreProcesses: [
          "Struktur direktori & hierarki folder terorganisir",
          "Upload & penomoran otomatis dokumen SOP/JSA",
          "Versi dokumen & riwayat revisi",
          "Document Viewer & PDF preview modal",
          "Hak akses & matriks otorisasi baca/edit",
          "Pencarian cepat, tag, & audit trail akses"
        ],
        frontend: "React + Next.js",
        frontendWhy: "Cocok untuk UI workspace direktori berkas, preview PDF modal, dan navigasi breadcrumb responsif.",
        backend: "Node.js + Express",
        backendWhy: "Efisien mengelola streaming file dokumen, metadata, dan otentikasi role.",
        db: "PostgreSQL",
        dbWhy: "Integritas data relasional untuk hierarki folder, rincian revisi, dan audit log.",
        orm: "Prisma",
        ormWhy: "Type-safe schema untuk mengelola relasi dokumen, folder, dan permission.",
        scope: "Platform DMS & SOP Management multi-role (Staff, Author, Reviewer, Admin, Auditor) dengan hierarki folder, penomoran berkas otomatis, kontrol versi, PDF preview, matriks otorisasi, dan audit trail.",
        tables: [
          { name: "directories", columns: "id, parent_id, code, name, description, created_at", description: "Struktur folder & direktori." },
          { name: "documents", columns: "id, directory_id, doc_number, title, category, status, security_level, current_version_id, created_by, created_at", description: "Master data dokumen SOP/JSA." },
          { name: "document_versions", columns: "id, document_id, version_number, file_url, file_size, file_type, change_summary, uploaded_by, created_at", description: "Riwayat versi & file dokumen." },
          { name: "document_tags", columns: "id, document_id, tag_name", description: "Tag & kata kunci dokumen." },
          { name: "document_approvals", columns: "id, document_id, version_id, reviewer_id, status, notes, reviewed_at", description: "Alur persetujuan revisi dokumen." },
          { name: "document_access_roles", columns: "id, document_id, role_name, can_view, can_edit, can_download", description: "Matriks otorisasi dokumen." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, entity_id, meta, created_at", description: "Audit trail pembacaan/download dokumen." }
        ],
        questions: [
          "Apakah dokumen memerlukan penomoran otomatis per divisi?",
          "Berapa level alur approval revisi dokumen SOP?",
          "Apakah perlu pengamanan watermark pada preview PDF?"
        ]
      };
    }

    // 2. Marketing Landing Page & Showcase Archetype
    if (
      arch === "LANDING_PAGE" ||
      (arch === "AUTO" && (
        combined.includes("landing") || combined.includes("portfolio") || combined.includes("showcase") ||
        combined.includes("company profile") || combined.includes("promosi") || combined.includes("marketing")
      ))
    ) {
      return {
        category: "Marketing Landing Page & Showcase",
        domainDefinition: "Platform landing page promosi & showcase produk performa tinggi yang mengintegrasikan animasi interaktif GSAP, Lenis smooth scroll, parallax hero background, feature grid, testimonial carousel, pricing toggle, dan penangkapan prospek (leads).",
        coreProcesses: [
          "Floating glassmorphism navigation header",
          "Hero section dengan animasi interaktif GSAP & Lenis",
          "Feature showcase grid & interactive tabs",
          "Social proof, client logos & testimonial carousel",
          "Interactive pricing plans & monthly/yearly toggle",
          "Lead capture contact form & SweetAlert notification"
        ],
        frontend: "HTML + Alpine.js",
        frontendWhy: "Mewajibkan library animasi GSAP + Lenis Smooth Scroll untuk efek Parallax & Motion Typography WOW factor.",
        backend: "Node.js + Express",
        backendWhy: "Ringan untuk API penangkapan lead contact form dan statistik pengunjung.",
        db: "PostgreSQL",
        dbWhy: "Penyimpanan data leads, testimoni, pricing plans, dan event analitik.",
        orm: "Prisma",
        ormWhy: "Produktivitas tinggi untuk CMS konten landing page.",
        scope: "Landing Page interaktif responsif dengan animasi GSAP, Lenis smooth scroll, parallax hero mesh, feature showcase, testimoni, pricing calculator, dan form penangkapan prospek.",
        tables: [
          { name: "hero_slides", columns: "id, title, subtitle, bg_image, cta_text, cta_link", description: "Konten hero section." },
          { name: "features", columns: "id, title, description, icon_class, sort_order", description: "Item fitur keunggulan." },
          { name: "testimonials", columns: "id, client_name, company, avatar_url, quote, rating", description: "Testimoni pelanggan." },
          { name: "pricing_plans", columns: "id, name, price_monthly, price_yearly, features_json, is_popular", description: "Paket harga." },
          { name: "faqs", columns: "id, question, answer, category, sort_order", description: "Tanya jawab FAQ." },
          { name: "leads", columns: "id, full_name, email, phone, message, status, created_at", description: "Data prospek masuk." },
          { name: "analytics_events", columns: "id, event_name, page_url, visitor_ip, created_at", description: "Log event pengunjung." }
        ],
        questions: [
          "Apakah perlu CMS admin untuk mengubah teks landing page?",
          "Apakah ada integrasi email otomatis saat form prospek diisi?",
          "Apakah ada variasi tema Dark/Light mode?"
        ]
      };
    }

    // 3. Banking & Finance Archetype
    if (
      arch === "BANKING" ||
      (arch === "AUTO" && (
        combined.includes("perbankan") || combined.includes("keuangan") || combined.includes("fintech") ||
        combined.includes("bank") || combined.includes("transfer") || combined.includes("rekening") ||
        combined.includes("payment") || combined.includes("ledger")
      ))
    ) {
      return {
        category: "Perbankan & Keuangan",
        domainDefinition: "Sistem perbankan digital terintegrasi untuk mengelola identitas nasabah, rekening, transfer dana, ledger double-entry, kartu, limit, notifikasi, dan audit kepatuhan — bukan sekadar CRUD saldo.",
        coreProcesses: [
          "Onboarding & KYC nasabah",
          "Pembukaan dan penutupan rekening",
          "Transfer sesama bank / antar bank",
          "Pencatatan ledger debit-kredit seimbang",
          "Manajemen kartu & limit harian",
          "Fraud monitoring & audit trail",
          "E-statement & notifikasi transaksi"
        ],
        frontend: "React + Next.js",
        frontendWhy: "Cocok untuk dashboard keuangan interaktif, SSR, dan keamanan UI modern.",
        backend: "Go + Fiber",
        backendWhy: "Performa tinggi + concurrency kuat untuk transaksi finansial.",
        db: "PostgreSQL",
        dbWhy: "ACID compliance & integritas data transaksi keuangan.",
        orm: "GORM",
        ormWhy: "ORM native Go yang cocok dengan backend Fiber/Gin.",
        scope: "Platform perbankan digital multi-role (Nasabah, Teller, Admin, Auditor, Fraud Analyst) yang mengintegrasikan KYC, rekening multi-produk, transfer real-time, double-entry ledger, manajemen kartu, limit transaksi, notifikasi, e-statement, dan audit kepatuhan. Fokus pada integritas saldo, latensi transfer rendah, dan jejak audit yang tidak bisa diubah sembarangan.",
        tables: [
          { name: "customers", columns: "id, email, phone, status, kyc_status, created_at", description: "Identitas nasabah inti." },
          { name: "customer_profiles", columns: "id, customer_id, full_name, nik_ktp, birth_date, address", description: "Data KYC & profil lengkap." },
          { name: "accounts", columns: "account_number, customer_id, account_type, currency, status", description: "Rekening produk (tabungan/giro)." },
          { name: "account_balances", columns: "id, account_number, current_balance, available_balance, updated_at", description: "Saldo berjalan & available." },
          { name: "transactions", columns: "transaction_id, source_account, target_account, amount, category, status, created_at", description: "Header transaksi transfer/penerimaan." },
          { name: "ledger_entries", columns: "entry_id, transaction_id, account_number, entry_type, amount", description: "Jurnal double-entry per transaksi." },
          { name: "cards", columns: "card_number, account_number, card_type, status, expiry_date", description: "Kartu debit/virtual." },
          { name: "devices", columns: "id, customer_id, device_fingerprint, last_seen_at, status", description: "Perangkat terdaftar untuk MFA." },
          { name: "auth_tokens", columns: "id, customer_id, token_hash, expires_at, revoked_at", description: "Sesi & refresh token." },
          { name: "limit_profiles", columns: "id, account_number, daily_limit, per_tx_limit, channel", description: "Batas transaksi per channel." },
          { name: "statements", columns: "id, account_number, period_start, period_end, file_url", description: "E-statement periodik." },
          { name: "notifications", columns: "id, customer_id, channel, title, body, sent_at, status", description: "Notifikasi email/WA/push." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, meta, created_at", description: "Jejak audit kepatuhan." }
        ],
        questions: [
          "Apakah sistem mendukung multi-currency / multi-cabang?",
          "Apakah perlu approval berlapis untuk transaksi besar?",
          "Apakah ada integrasi payment gateway / core banking / BI-FAST eksternal?"
        ]
      };
    }

    if (
      combined.includes("maintenance") || combined.includes("pemeliharaan") || combined.includes("perawatan") ||
      combined.includes("workshop") || combined.includes("bengkel") || combined.includes("work order") ||
      combined.includes("wo ") || combined.includes("cmms") || combined.includes("preventive") ||
      combined.includes("corrective") || combined.includes("asset management") || combined.includes("mesin")
    ) {
      return {
        category: "Maintenance & Workshop Management",
        domainDefinition: "Sistem CMMS/maintenance management terintegrasi untuk pencatatan dan pelaporan aktivitas workshop: work order, preventive & corrective maintenance, aset/mesin, spare part, teknisi, downtime, dan KPI keandalan — bukan sekadar form checklist generik.",
        coreProcesses: [
          "Registrasi aset & hierarki lokasi/plant",
          "Pembuatan dan penjadwalan work order",
          "Preventive maintenance plan & calendar",
          "Corrective maintenance & breakdown response",
          "Alokasi teknisi & skill matrix",
          "Permintaan & pemakaian spare part",
          "Pencatatan downtime & root cause",
          "Laporan MTTR/MTBF, cost, dan compliance"
        ],
        frontend: "React + Vite",
        frontendWhy: "Dashboard operasional workshop real-time, form WO cepat, dan chart KPI yang responsif.",
        backend: "Node.js + Express",
        backendWhy: "Workflow WO, notifikasi, dan integrasi inventori spare part mudah diorkestrasi.",
        db: "PostgreSQL",
        dbWhy: "Relasi kompleks aset–WO–part–teknisi membutuhkan integritas relasional kuat.",
        orm: "Prisma",
        ormWhy: "Schema-first produktif untuk banyak entitas maintenance.",
        scope: "Platform maintenance management multi-role (Technician, Planner, Supervisor, Storekeeper, Plant Manager) yang mengintegrasikan master aset, work order (corrective/preventive), penjadwalan, checklist job, spare part & stock movement, downtime tracking, biaya perawatan, dan pelaporan workshop. Tujuan utama: menstandarkan pencatatan aktivitas bengkel, mempercepat response breakdown, dan menyediakan laporan keandalan yang akurat.",
        tables: [
          { name: "users", columns: "id, email, password_hash, role, full_name, status, created_at", description: "Akun sistem (teknisi, planner, admin)." },
          { name: "technicians", columns: "id, user_id, employee_code, skill_level, shift, is_available", description: "Profil teknisi & ketersediaan." },
          { name: "plants", columns: "id, code, name, location, status", description: "Plant/site operasional." },
          { name: "locations", columns: "id, plant_id, code, name, parent_id", description: "Hierarki lokasi (area/line)." },
          { name: "assets", columns: "id, asset_tag, name, category, location_id, criticality, status, commissioned_at", description: "Mesin/peralatan yang dirawat." },
          { name: "asset_meters", columns: "id, asset_id, meter_type, current_value, unit, updated_at", description: "Hour meter / odometer aset." },
          { name: "work_orders", columns: "id, wo_number, asset_id, type, priority, status, reported_by, assigned_to, scheduled_at, completed_at", description: "Work order corrective/preventive." },
          { name: "wo_tasks", columns: "id, work_order_id, sequence, description, is_done, done_at", description: "Checklist / job steps dalam WO." },
          { name: "pm_plans", columns: "id, asset_id, name, frequency_type, frequency_value, next_due_at, status", description: "Rencana preventive maintenance." },
          { name: "pm_plan_tasks", columns: "id, pm_plan_id, sequence, description, estimated_minutes", description: "Task template PM." },
          { name: "spare_parts", columns: "id, sku, name, uom, min_stock, unit_cost, status", description: "Master spare part." },
          { name: "part_stocks", columns: "id, spare_part_id, warehouse_id, qty_on_hand", description: "Stok part per gudang." },
          { name: "wo_parts", columns: "id, work_order_id, spare_part_id, qty_used, unit_cost", description: "Part terpakai per WO." },
          { name: "downtime_events", columns: "id, asset_id, work_order_id, started_at, ended_at, reason_code, impact", description: "Catatan downtime aset." },
          { name: "maintenance_costs", columns: "id, work_order_id, labor_cost, parts_cost, external_cost, currency", description: "Biaya perawatan per WO." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, entity_id, meta, created_at", description: "Jejak perubahan status WO & stok." }
        ],
        questions: [
          "Apakah fokus utama corrective, preventive, atau keduanya (full CMMS)?",
          "Apakah stok spare part multi-gudang dan perlu integrasi warehouse terpisah?",
          "Apakah dibutuhkan mobile/offline untuk teknisi di lapangan?"
        ]
      };
    }

    if (
      combined.includes("e-commerce") || combined.includes("ecommerce") || combined.includes("marketplace") ||
      combined.includes("toko") || combined.includes("order") || combined.includes("belanja") ||
      combined.includes("produk") || combined.includes("checkout")
    ) {
      return {
        category: "E-Commerce & Marketplace",
        domainDefinition: "Platform jual-beli digital terintegrasi yang mengelola katalog, keranjang, checkout, pembayaran, fulfillment, dan retur — bukan hanya daftar produk.",
        coreProcesses: [
          "Onboarding seller & buyer",
          "Manajemen katalog & stok",
          "Keranjang & checkout",
          "Pembayaran & settlement",
          "Fulfillment & shipping",
          "Retur/refund",
          "Review & dispute handling"
        ],
        frontend: "React + Next.js",
        frontendWhy: "SEO katalog produk + performa storefront yang baik.",
        backend: "Node.js + Express",
        backendWhy: "Ekosistem matang untuk API e-commerce & integrasi payment.",
        db: "PostgreSQL",
        dbWhy: "Relasi order-produk-pembayaran yang konsisten.",
        orm: "Prisma",
        ormWhy: "Produktivitas tinggi & type-safe schema untuk stack Node.",
        scope: "Marketplace multi-role (Buyer, Seller, Admin, Finance, Warehouse) dengan katalog, keranjang, checkout, pembayaran, fulfillment, promo, dan dispute. Sistem harus menjaga konsistensi stok, status order end-to-end, dan rekonsiliasi pembayaran.",
        tables: [
          { name: "users", columns: "id, email, password_hash, role, status, created_at", description: "Buyer/Seller/Admin." },
          { name: "seller_profiles", columns: "id, user_id, store_name, kyc_status, rating", description: "Profil toko seller." },
          { name: "products", columns: "id, seller_id, name, slug, price, status", description: "Katalog produk." },
          { name: "product_variants", columns: "id, product_id, sku, attributes_json, price, stock", description: "Varian SKU." },
          { name: "carts", columns: "id, buyer_id, status, updated_at", description: "Keranjang belanja." },
          { name: "cart_items", columns: "id, cart_id, variant_id, qty, price", description: "Item keranjang." },
          { name: "orders", columns: "id, buyer_id, total, payment_status, shipping_status, created_at", description: "Pesanan." },
          { name: "order_items", columns: "id, order_id, variant_id, qty, price", description: "Detail item pesanan." },
          { name: "payments", columns: "id, order_id, method, amount, status, paid_at", description: "Pembayaran order." },
          { name: "shipments", columns: "id, order_id, courier, tracking_no, status, shipped_at", description: "Pengiriman." },
          { name: "inventory_movements", columns: "id, variant_id, type, qty, ref_type, ref_id, created_at", description: "Mutasi stok." },
          { name: "reviews", columns: "id, order_item_id, buyer_id, rating, comment, created_at", description: "Ulasan produk." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, meta, created_at", description: "Audit admin/seller." }
        ],
        questions: [
          "Apakah multi-vendor marketplace atau single-store?",
          "Metode pembayaran apa yang wajib didukung?",
          "Apakah stok real-time per gudang diperlukan?"
        ]
      };
    }

    if (
      combined.includes("hris") || combined.includes("analytics") || combined.includes("karyawan") ||
      combined.includes("absensi") || combined.includes("hr ") || combined.includes("pegawai") ||
      combined.includes("payroll") || combined.includes("cuti") || combined.includes("rekrut")
    ) {
      return {
        category: "HRIS & Analytics",
        domainDefinition: "Sistem HR terintegrasi untuk master karyawan, organisasi, absensi, cuti, payroll, dan analitik SDM — bukan hanya daftar pegawai.",
        coreProcesses: [
          "Master data karyawan & organisasi",
          "Absensi & shift",
          "Pengajuan & approval cuti",
          "Payroll calculation",
          "Performance review",
          "Rekrutmen (opsional)",
          "Dashboard KPI HR"
        ],
        frontend: "React + Vite",
        frontendWhy: "Dashboard SPA cepat untuk analitik HR.",
        backend: "Python + FastAPI",
        backendWhy: "Cocok untuk analytics, reporting, dan integrasi data HR.",
        db: "PostgreSQL",
        dbWhy: "Data relasional karyawan, cuti, dan payroll.",
        orm: "SQLAlchemy",
        ormWhy: "ORM standar Python untuk FastAPI.",
        scope: "HRIS multi-role (Employee, HRBP, Manager, Payroll Admin) dengan absensi, cuti, struktur organisasi, payroll, dan dashboard KPI. Fokus pada akurasi data kepegawaian, alur approval, dan pelaporan compliance.",
        tables: [
          { name: "employees", columns: "id, nik, full_name, dept_id, position_id, status, join_date", description: "Master karyawan." },
          { name: "departments", columns: "id, name, manager_id, parent_id", description: "Struktur organisasi." },
          { name: "positions", columns: "id, title, grade, dept_id", description: "Jabatan." },
          { name: "attendances", columns: "id, employee_id, check_in, check_out, status, source", description: "Kehadiran harian." },
          { name: "shifts", columns: "id, name, start_time, end_time", description: "Master shift." },
          { name: "leave_types", columns: "id, code, name, max_days, is_paid", description: "Jenis cuti." },
          { name: "leave_requests", columns: "id, employee_id, leave_type_id, start_date, end_date, status", description: "Pengajuan cuti." },
          { name: "leave_balances", columns: "id, employee_id, leave_type_id, year, balance", description: "Saldo cuti." },
          { name: "payroll_runs", columns: "id, period_start, period_end, status, processed_at", description: "Batch payroll." },
          { name: "payslips", columns: "id, payroll_run_id, employee_id, gross, net, status", description: "Slip gaji." },
          { name: "performance_reviews", columns: "id, employee_id, reviewer_id, period, score, status", description: "Penilaian kinerja." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, meta, created_at", description: "Audit HR sensitif." }
        ],
        questions: [
          "Apakah absensi terintegrasi perangkat fingerprint/GPS?",
          "Apakah modul payroll ikut digenerate di fase 1?",
          "Berapa level approval cuti yang dibutuhkan?"
        ]
      };
    }

    if (
      combined.includes("scm") || combined.includes("warehouse") || combined.includes("inventory") ||
      combined.includes("gudang") || combined.includes("stok") || combined.includes("inventori") ||
      combined.includes("barang") || combined.includes("material request")
    ) {
      return {
        category: "SCM & Warehouse",
        domainDefinition: "Sistem warehouse/inventory terintegrasi untuk master item, multi-lokasi, inbound/outbound, transfer, stock opname, dan traceability mutasi — bukan hanya angka stok.",
        coreProcesses: [
          "Master item & UOM",
          "Inbound / goods receipt",
          "Outbound / picking",
          "Transfer antar gudang",
          "Stock opname",
          "Reservasi stok",
          "Pelaporan aging & min-max"
        ],
        frontend: "Vue + Nuxt.js",
        frontendWhy: "UI operasional gudang yang ringan dan cepat.",
        backend: "PHP + Laravel",
        backendWhy: "Cepat untuk CRUD inventori, role, dan reporting internal.",
        db: "MySQL",
        dbWhy: "Umum & stabil untuk sistem inventori on-premise.",
        orm: "None",
        ormWhy: "Eloquent bawaan Laravel sudah mencukupi.",
        scope: "WMS multi-role (Operator, Supervisor, Admin, Purchasing) dengan inbound, outbound, stok multi-gudang, transfer, opname, dan pelaporan. Menjamin akurasi qty, traceability mutasi, dan kontrol min-max stock.",
        tables: [
          { name: "items", columns: "id, sku, name, uom, min_stock, max_stock, status", description: "Master barang." },
          { name: "item_categories", columns: "id, code, name, parent_id", description: "Kategori item." },
          { name: "warehouses", columns: "id, code, name, location, status", description: "Master gudang." },
          { name: "bins", columns: "id, warehouse_id, code, name", description: "Lokasi bin/rak." },
          { name: "stock_balances", columns: "id, item_id, warehouse_id, bin_id, qty", description: "Saldo stok." },
          { name: "stock_movements", columns: "id, item_id, warehouse_id, type, qty, ref_no, created_at", description: "Mutasi stok." },
          { name: "inbound_orders", columns: "id, doc_no, supplier, status, received_at", description: "Penerimaan barang." },
          { name: "inbound_items", columns: "id, inbound_order_id, item_id, qty_expected, qty_received", description: "Detail inbound." },
          { name: "outbound_orders", columns: "id, doc_no, requester, status, shipped_at", description: "Pengeluaran barang." },
          { name: "outbound_items", columns: "id, outbound_order_id, item_id, qty_requested, qty_issued", description: "Detail outbound." },
          { name: "stock_opnames", columns: "id, warehouse_id, status, counted_at", description: "Header stock opname." },
          { name: "stock_opname_items", columns: "id, opname_id, item_id, system_qty, counted_qty", description: "Hasil hitung opname." },
          { name: "audit_logs", columns: "id, actor_id, action, entity, meta, created_at", description: "Audit mutasi kritis." }
        ],
        questions: [
          "Apakah multi-gudang / multi-lokasi bin?",
          "Apakah perlu barcode/QR scanning?",
          "Apakah ada integrasi purchasing/sales order?"
        ]
      };
    }

    // Default / custom — still try to be domain-aware from the raw idea
    const shortIdea = (prompt || "sistem bisnis").trim();
    return {
      category: category || "Kustom / Domain Spesifik",
      domainDefinition: `Sistem operasional terintegrasi untuk mendukung proses bisnis dari ide pengguna ("${shortIdea.slice(0, 160)}"), mencakup pencatatan aktivitas inti, alur kerja multi-role, pelaporan, dan audit — bukan template CRUD generik semata.`,
      coreProcesses: [
        "Autentikasi & otorisasi multi-role",
        "Pencatatan entitas bisnis inti",
        "Workflow approval / status transition",
        "Monitoring dashboard operasional",
        "Pelaporan & ekspor data",
        "Audit trail aktivitas penting"
      ],
      frontend: "React + Next.js",
      frontendWhy: "Frontend modern fleksibel untuk hampir semua domain operasional.",
      backend: "Node.js + Express",
      backendWhy: "Cepat di-setup, ekosistem luas, cocok API REST domain-specific.",
      db: "PostgreSQL",
      dbWhy: "Database relasional andal untuk model domain yang akan berkembang.",
      orm: "Prisma",
      ormWhy: "Developer experience bagus untuk Node + PostgreSQL.",
      scope: `Sistem web multi-role yang diterjemahkan dari ide: "${shortIdea.slice(0, 200)}". Harus mendefinisikan proses bisnis nyata, entitas domain, alur status, dashboard, pelaporan, dan audit trail — bukan sekadar halaman CRUD kosong.`,
      tables: [
        { name: "users", columns: "id, email, password_hash, role, full_name, status, created_at", description: "Akun & role pengguna." },
        { name: "organizations", columns: "id, name, code, status", description: "Organisasi/tenant operasional." },
        { name: "roles", columns: "id, code, name, permissions_json", description: "Definisi role & permission." },
        { name: "domain_entities", columns: "id, org_id, code, name, status, owner_id, created_at, updated_at", description: "Entitas bisnis utama domain." },
        { name: "domain_entity_items", columns: "id, entity_id, line_no, description, qty, meta_json", description: "Detail baris entitas utama." },
        { name: "workflow_states", columns: "id, entity_type, code, label, is_terminal", description: "Status workflow domain." },
        { name: "workflow_transitions", columns: "id, entity_id, from_state, to_state, actor_id, note, created_at", description: "Riwayat perpindahan status." },
        { name: "attachments", columns: "id, entity_type, entity_id, file_url, uploaded_by, created_at", description: "Lampiran dokumen." },
        { name: "notifications", columns: "id, user_id, title, body, is_read, created_at", description: "Notifikasi in-app." },
        { name: "reports_cache", columns: "id, report_key, params_json, payload_json, generated_at", description: "Cache hasil laporan." },
        { name: "audit_logs", columns: "id, user_id, action, entity, entity_id, meta, created_at", description: "Log aktivitas sistem." }
      ],
      questions: [
        "Proses bisnis inti mana yang paling prioritas di fase 1?",
        "Siapa saja role pengguna nyata di lapangan (bukan hanya Admin)?",
        "Apakah ada integrasi pihak ketiga atau regulasi khusus domain ini?"
      ]
    };
  }

  function applyConsultationRecommendation(rec, sourceLabel) {
    // Category is AI-inferred (form field removed)
    if (rec.category) {
      STATE.pendingProjectCategory = rec.category;
    }

    // Persist deep domain analysis for later document generation
    STATE.pendingDomainDefinition = rec.domainDefinition || "";
    STATE.pendingCoreProcesses = Array.isArray(rec.coreProcesses) ? rec.coreProcesses : [];
    STATE.pendingEnrichedScope = rec.scope || "";
    STATE.pendingTables = Array.isArray(rec.tables) ? rec.tables : [];

    if (DOM.inputProjFrontend) {
      DOM.inputProjFrontend.value = findClosestSelectOption(DOM.inputProjFrontend, rec.frontend);
    }
    if (DOM.inputProjFrontendMain) {
      DOM.inputProjFrontendMain.value = findClosestSelectOption(DOM.inputProjFrontendMain, rec.frontend);
    }
    if (DOM.lblFrontendJustify) DOM.lblFrontendJustify.textContent = rec.frontendWhy || sourceLabel;

    if (DOM.inputProjBackend) {
      DOM.inputProjBackend.value = findClosestSelectOption(DOM.inputProjBackend, rec.backend);
    }
    if (DOM.inputProjBackendMain) {
      DOM.inputProjBackendMain.value = findClosestSelectOption(DOM.inputProjBackendMain, rec.backend);
    }
    if (DOM.lblBackendJustify) DOM.lblBackendJustify.textContent = rec.backendWhy || sourceLabel;

    if (DOM.inputProjDbEngine) {
      DOM.inputProjDbEngine.value = findClosestSelectOption(DOM.inputProjDbEngine, rec.db);
    }
    if (DOM.inputProjDbEngineMain) {
      DOM.inputProjDbEngineMain.value = findClosestSelectOption(DOM.inputProjDbEngineMain, rec.db);
    }
    if (DOM.lblDbEngineJustify) DOM.lblDbEngineJustify.textContent = rec.dbWhy || sourceLabel;

    if (DOM.inputProjDbOrm) {
      DOM.inputProjDbOrm.value = findClosestSelectOption(DOM.inputProjDbOrm, rec.orm);
    }
    if (DOM.inputProjDbOrmMain) {
      DOM.inputProjDbOrmMain.value = findClosestSelectOption(DOM.inputProjDbOrmMain, rec.orm);
    }
    if (DOM.lblDbOrmJustify) DOM.lblDbOrmJustify.textContent = rec.ormWhy || sourceLabel;

    // Show domain definition + enriched scope so user sees AI understood the domain
    if (DOM.lblEnrichedScope) {
      const domainBlock = rec.domainDefinition
        ? `DEFINISI DOMAIN:\n${rec.domainDefinition}\n\n`
        : "";
      const processBlock = (Array.isArray(rec.coreProcesses) && rec.coreProcesses.length)
        ? `PROSES INTI:\n• ${rec.coreProcesses.join("\n• ")}\n\n`
        : "";
      const scopeBlock = rec.scope || sourceLabel;
      DOM.lblEnrichedScope.textContent = `${domainBlock}${processBlock}RUANG LINGKUP:\n${scopeBlock}`;
      DOM.lblEnrichedScope.style.maxHeight = "180px";
    }

    renderRecommendedTablesUI(rec.tables || []);

    const qs = rec.questions || [];
    if (DOM.lblQuestion1) DOM.lblQuestion1.textContent = qs[0] || "Apakah ada requirement khusus keamanan?";
    if (DOM.lblQuestion2) DOM.lblQuestion2.textContent = qs[1] || "Bagaimana skala pengguna awal sistem?";
    if (DOM.lblQuestion3) DOM.lblQuestion3.textContent = qs[2] || "Apakah ada integrasi eksternal?";

    if (DOM.inputAnswer1) DOM.inputAnswer1.value = "";
    if (DOM.inputAnswer2) DOM.inputAnswer2.value = "";
    if (DOM.inputAnswer3) DOM.inputAnswer3.value = "";
  }

  async function startAiConsultation() {
    const name = DOM.inputProjName.value.trim();
    const prompt = DOM.inputProjPrompt.value.trim();

    if (!name || !prompt) {
      alert("Silakan isi nama proyek dan deskripsi ide aplikasi Anda.");
      return;
    }

    // Prevent double-click freeze / duplicate concurrent consultations
    if (STATE.isConsulting) {
      addLog("info", "Konsultasi AI masih berjalan — tunggu selesai.");
      return;
    }
    STATE.isConsulting = true;

    if (DOM.modalGenerateBtn) {
      DOM.modalGenerateBtn.disabled = true;
      DOM.modalGenerateBtn.style.opacity = "0.7";
    }

    // Show loading UI immediately (non-blocking async request after paint)
    DOM.modalFormBody.style.display = "none";
    DOM.modalConsultBody.style.display = "none";
    DOM.modalProgressBody.style.display = "flex";
    if (DOM.genStatusText) DOM.genStatusText.textContent = "AI sedang mendalami domain bisnis Anda...";
    if (DOM.genSubText) {
      DOM.genSubText.textContent = "Mendefinisikan proses operasional, aktor, entitas data, lalu merekomendasikan stack & skema...";
    }

    // Yield to browser so progress UI paints before network work
    await new Promise(resolve => setTimeout(resolve, 0));

    // Local idea-based seed (fallback / timeout safety net) — no user category field
    const forcedArchetype = (DOM.inputProjArchetype && DOM.inputProjArchetype.value) || "AUTO";
    const localRec = getCategoryStackRecommendation("", prompt, forcedArchetype);
    STATE.pendingProjectCategory = localRec.category || "General";
    STATE.pendingProjectArchetype = forcedArchetype;

    const systemPrompt = `You are Minestack AI Domain Architect & Full-Stack Technology Consultant.

CRITICAL METHOD — do this IN ORDER before recommending any technology:
1) DEEPLY understand the user's idea and selected Archetype ("${forcedArchetype}"). Define what the domain REALLY is in operational terms.
   Example: "Digital Archive / SOP" = integrated DMS for tree folder workspace, document versioning, PDF viewer modal, access matrix, and audit logs.
2) Identify real-world actors/roles, core business processes (5-10 steps), and entities that must be persisted.
3) Only THEN recommend category, tech stack, and a rich domain-specific schema.

Project name: "${name}"
Target Archetype: "${forcedArchetype}"
User idea (raw): "${prompt}"

You MUST produce:
0) system_category — short Indonesian domain label (e.g. "Maintenance & Workshop Management", "Perbankan & Keuangan", "SCM & Warehouse", or precise custom label)
1) domain_definition — 2-4 sentences in Indonesian explaining WHAT this system is operationally (not marketing fluff)
2) core_processes — array of 6-10 concrete process names
3) frontend_framework from EXACTLY one of: React + Next.js, Vue + Nuxt.js, Angular, Svelte + SvelteKit, React + Vite, Laravel Blade, HTML + Alpine.js
4) backend_framework from EXACTLY one of: Node.js + Express, Go + Fiber, Python + FastAPI, PHP + Laravel, Ruby on Rails, Java Spring Boot, Rust + Actix, Google Apps Script
5) database_engine from EXACTLY one of: PostgreSQL, MySQL, MariaDB, Google Sheet, MongoDB, Redis, SQLite
6) orm_framework from EXACTLY one of: Prisma, Drizzle, Mongoose, Sequelize, SQLAlchemy, GORM, None
7) justifications for each stack choice tied to THIS domain
8) enriched_scope — rich paragraph in Indonesian (min ~400 chars) describing multi-role scope, modules, and operational goals
9) recommended_tables — 10 to 16 domain-specific tables/collections. Each needs: name (snake_case), columns (comma-separated key fields), description (domain meaning). Include supporting tables (users/roles, audit_logs) PLUS real domain entities (e.g. for maintenance: assets, work_orders, pm_plans, spare_parts, downtime_events...). NEVER stop at only 3-4 generic tables.
10) questions — exactly 3 clarifying questions in Indonesian that a domain expert would ask

Output ONLY valid JSON (no markdown fences, no commentary):
{
  "system_category": "...",
  "domain_definition": "...",
  "core_processes": ["...", "..."],
  "frontend_framework": "...",
  "frontend_justification": "...",
  "backend_framework": "...",
  "backend_justification": "...",
  "database_engine": "...",
  "database_justification": "...",
  "orm_framework": "...",
  "orm_justification": "...",
  "enriched_scope": "...",
  "recommended_tables": [{"name":"...","columns":"...","description":"..."}],
  "questions": ["...","...","..."]
}`;

    const startTime = Date.now();
    const CONTROLLER_TIMEOUT_MS = 45000;
    let finished = false;
    const abortController = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timeoutId = null;

    const finishWithRecommendation = (rec, sourceLabel, logType = "info") => {
      if (finished) return;
      finished = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (abortController) {
        try { abortController.abort(); } catch (_) { /* ignore */ }
      }

      STATE.isConsulting = false;
      DOM.modalProgressBody.style.display = "none";
      DOM.modalConsultBody.style.display = "flex";
      applyConsultationRecommendation(rec, sourceLabel);
      addLog(logType, sourceLabel);
      if (DOM.modalGenerateBtn) {
        DOM.modalGenerateBtn.disabled = false;
        DOM.modalGenerateBtn.style.opacity = "1";
      }
    };

    if (abortController) {
      timeoutId = setTimeout(() => {
        try { abortController.abort(); } catch (_) { /* ignore */ }
      }, CONTROLLER_TIMEOUT_MS);
    }

    try {
      const response = await performAiRequest(
        `${STATE.aiBaseUrl}/chat/completions`,
        {
          model: STATE.aiModel,
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.25,
          max_tokens: 3200
        },
        abortController ? { signal: abortController.signal } : {}
      );

      if (timeoutId) clearTimeout(timeoutId);
      const latency = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!response || !response.ok) {
        const errText = response ? await response.text() : "empty response";
        addLog("error", `AI consultation gagal (HTTP ${response?.status || "?"}): ${errText.slice(0, 300)}`);
        trackApiUsage(1, 0, latency, false);
        finishWithRecommendation(
          localRec,
          `AI gagal merespons. Dipakai rekomendasi lokal (kategori: ${localRec.category}).`,
          "error"
        );
        return;
      }

      const data = await response.json();
      const contentText = data.choices?.[0]?.message?.content || "";
      const tokensUsed = data.usage?.total_tokens || contentText.length / 4;
      trackApiUsage(1, Math.round(tokensUsed), latency, true);

      let consultData = null;
      try {
        consultData = JSON.parse(contentText.trim());
      } catch (_) {
        try {
          const cleanText = contentText.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          consultData = JSON.parse(cleanText);
        } catch (e2) {
          console.error("Consultation JSON parsing failed", e2, contentText);
        }
      }

      if (consultData && typeof consultData === "object") {
        const aiCategory = consultData.system_category || localRec.category || "General";
        const aiTables = (Array.isArray(consultData.recommended_tables) && consultData.recommended_tables.length >= 6)
          ? consultData.recommended_tables
          : (Array.isArray(consultData.recommended_tables) && consultData.recommended_tables.length)
            ? [...consultData.recommended_tables, ...(localRec.tables || [])].filter((t, i, arr) =>
                arr.findIndex(x => String(x.name).toLowerCase() === String(t.name).toLowerCase()) === i
              ).slice(0, 16)
            : localRec.tables;
        const aiRec = {
          category: aiCategory,
          domainDefinition: consultData.domain_definition || localRec.domainDefinition || "",
          coreProcesses: (Array.isArray(consultData.core_processes) && consultData.core_processes.length)
            ? consultData.core_processes
            : (localRec.coreProcesses || []),
          frontend: consultData.frontend_framework || localRec.frontend,
          frontendWhy: consultData.frontend_justification || localRec.frontendWhy,
          backend: consultData.backend_framework || localRec.backend,
          backendWhy: consultData.backend_justification || localRec.backendWhy,
          db: consultData.database_engine || localRec.db,
          dbWhy: consultData.database_justification || localRec.dbWhy,
          orm: consultData.orm_framework || localRec.orm,
          ormWhy: consultData.orm_justification || localRec.ormWhy,
          scope: consultData.enriched_scope || localRec.scope,
          tables: aiTables,
          questions: (Array.isArray(consultData.questions) && consultData.questions.length)
            ? consultData.questions
            : localRec.questions
        };
        finishWithRecommendation(
          aiRec,
          `AI rekomendasi siap untuk "${name}" (kategori: ${aiCategory}) dalam ${latency}s.`,
          "success"
        );
      } else {
        finishWithRecommendation(
          localRec,
          `Respons AI tidak valid JSON. Dipakai rekomendasi lokal (kategori: ${localRec.category}).`,
          "error"
        );
      }
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const latency = ((Date.now() - startTime) / 1000).toFixed(2);
      const isAbort = err && (err.name === "AbortError" || /abort/i.test(err.message || ""));
      trackApiUsage(1, 0, latency, false);
      addLog("error", `AI consultation exception: ${err.message || err}`);
      finishWithRecommendation(
        localRec,
        isAbort
          ? `AI timeout ${CONTROLLER_TIMEOUT_MS / 1000}s. Dipakai rekomendasi lokal (kategori: ${localRec.category}).`
          : `AI error: ${err.message}. Dipakai rekomendasi lokal (kategori: ${localRec.category}).`,
        "error"
      );
    }
  }

  function renderRecommendedTablesUI(tables) {
    DOM.containerRecommendedTables.innerHTML = "";
    if (tables && tables.length > 0) {
      tables.forEach(tbl => {
        const item = document.createElement("div");
        item.className = "table-rec-item";
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <span class="table-rec-name">${escapeHtml(tbl.name)}</span>
            <span class="table-rec-cols">${escapeHtml(tbl.columns)}</span>
          </div>
          <div class="table-rec-desc">${escapeHtml(tbl.description)}</div>
        `;
        DOM.containerRecommendedTables.appendChild(item);
      });
    } else {
      DOM.containerRecommendedTables.innerHTML = `<div style="text-align: center; color: var(--text-dim); font-size: 0.8rem; padding: 8px 0;">Tidak ada rekomendasi tabel spesifik.</div>`;
    }
  }

  function findClosestSelectOption(selectEl, value) {
    if (!selectEl || !selectEl.options || !selectEl.options.length) {
      return value || "";
    }
    const valUpper = String(value || "").toUpperCase();
    if (!valUpper) return selectEl.options[0].value;
    for (let i = 0; i < selectEl.options.length; i++) {
      const optVal = selectEl.options[i].value.toUpperCase();
      if (valUpper.includes(optVal) || optVal.includes(valUpper)) {
        return selectEl.options[i].value;
      }
    }
    return selectEl.options[0].value;
  }

  function collectRecommendedTablesFromDom() {
    const tables = [];
    if (!DOM.containerRecommendedTables) return tables;
    const tableItems = DOM.containerRecommendedTables.querySelectorAll(".table-rec-item");
    tableItems.forEach(item => {
      const name = item.querySelector(".table-rec-name")?.textContent?.trim() || "";
      const columns = item.querySelector(".table-rec-cols")?.textContent?.trim() || "";
      const description = item.querySelector(".table-rec-desc")?.textContent?.trim() || "";
      if (name) tables.push({ name, columns, description });
    });
    return tables;
  }

  function formatTableRecommendations(tables) {
    if (!Array.isArray(tables) || tables.length === 0) return "";
    let out = `\nDomain Schema Seed (${tables.length} tables/collections — EXPAND to production depth matching the target domain): \n`;
    tables.forEach((tbl, i) => {
      out += `${i + 1}. "${tbl.name}" | columns: ${tbl.columns || "-"} | meaning: ${tbl.description || "-"}\n`;
    });
    out += "You MUST use these as the core domain entities and may add related supporting tables (junctions, logs, balances, history) to reach production-ready depth.\n";
    return out;
  }

  function getDocSpecificInstructions(docKey, selectedFrontend, selectedBackend, selectedDb, selectedOrm) {
    const map = {
      "PRD.md": `Buat PRD domain-specific (bukan template generik) berisi:
## 1. Ringkasan Eksekutif
## 2. Definisi Domain & Masalah Operasional (jelaskan APA sistem ini di dunia nyata)
## 3. Visi & Tujuan Produk
## 4. Target Persona / Role Nyata (minimal 4 role operasional/domain pengguna nyata, bukan hanya Admin)
## 5. Proses Bisnis Inti (5-10 langkah operasional)
## 6. User Stories & Acceptance Criteria (domain language)
## 7. Fitur Utama (P0/P1/P2) terikat proses bisnis
## 8. Alur Pengguna Utama (end-to-end domain flow)
## 9. Metrik Kesuksesan / KPI domain (gunakan KPI yang relevan dengan domain, misal E-Commerce: Conversion Rate & Fulfillment Time; SCM: Stock Accuracy; Finance: SLA & Latency)
## 10. Ruang Lingkup In/Out
## 11. Asumsi, Dependensi & Risiko
WAJIB: sebutkan istilah domain yang tepat. DILARANG: "CRUD entitas utama" generik tanpa konteks.`,
      "TECH_STACK.md": `Buat rekomendasi tech stack detail berisi:
## 1. Frontend (${selectedFrontend}) — library UI, state, form, chart yang cocok domain
## 2. Backend (${selectedBackend}) — pola API, validation, job/queue bila domain butuh
## 3. Database (${selectedDb}) & ORM (${selectedOrm})
## 4. Caching, Queue, Storage, Search (jika relevan domain)
## 5. Auth, RBAC, Security libraries
## 6. Observability & DevOps / CI-CD
## 7. Justifikasi SETIAP pilihan dikaitkan ke kebutuhan domain (bukan alasan generik)
Sertakan versi mayor realistis dan alternatif bila trade-off jelas.`,
      "ARCHITECTURE.md": `Buat arsitektur sistem detail berisi:
## 1. Ringkasan Arsitektur & gaya (modular monolith / services) + mengapa cocok domain
## 2. High-Level Design (WAJIB Mermaid graph TD dengan modul domain nyata, bukan hanya Auth/Core generik)
## 3. Modul / Service Boundaries (nama modul = bahasa domain: mis. WorkOrderService, LedgerService)
## 4. Alur request utama domain (2-3 flow operasional langkah demi langkah)
## 5. Keamanan & multi-role (permission per role domain)
## 6. Scalability, reliability, auditability
Diagram Mermaid valid di fenced code block language-mermaid.`,
      "DATABASE.md": `Buat skema database production-depth (setara contoh bank ~29 collections) berisi:
## 1. Overview model data (${selectedDb} + ${selectedOrm}) + jumlah tabel/koleksi
## 2. Daftar SEMUA tabel domain (minimal 12-20) + kolom + tipe + PK/FK + deskripsi bisnis singkat
## 3. ERD kaya (WAJIB Mermaid erDiagram) menampilkan relasi utama antar entitas domain
## 4. Index, unique constraint, soft-delete, aturan integritas domain (contoh: double-entry seimbang, WO tidak close tanpa task selesai, stok tidak negatif)
## 5. Catatan migration/seed ringkas
Gunakan tabel rekomendasi konsultasi sebagai INTI, lalu perluas (history, junction, balance, log, meter, cost, dsb).
DILARANG: hanya 3 tabel generik users/master_records/audit_logs.
Target kualitas visual & kedalaman seperti DATABASE.md bank (banyak entitas + ERD rapi).`,
      "API.md": `Buat kontrak API domain-specific berisi:
## 1. Base URL & versioning
## 2. Auth headers & RBAC notes
## 3. Standar response envelope
## 4. Endpoint Auth
## 5. Endpoint domain inti (minimal 8 endpoint konkret dengan path, method, request JSON, response JSON)
## 6. Endpoint workflow/status transition domain (approve, assign, complete, void, dsb bila relevan)
## 7. Endpoint reporting/dashboard ringkas
## 8. Error model & status codes
Gunakan resource name dari domain (work-orders, assets, ledger-entries, dll) — bukan /records generik.`,
      "DEPLOYMENT.md": `Buat panduan deployment detail berisi:
## 1. Arsitektur deployment sesuai stack
## 2. Prerequisites
## 3. Environment variables (.env) lengkap + secrets domain (DB, JWT, storage, notifikasi)
## 4. Build & run local (frontend ${selectedFrontend}, backend ${selectedBackend}, DB ${selectedDb})
## 5. Migration/seed langkah
## 6. Deploy production (Docker/Vercel/Cloud)
## 7. Pipeline CI/CD (GitHub Actions YAML)
## 8. Checklist go-live, backup, monitoring, rollback`
    };
    return map[docKey] || "Buat dokumen spesifikasi teknis yang lengkap, profesional, domain-specific, dan terstruktur dalam Markdown.";
  }

  function sanitizeAiMarkdown(content) {
    let text = String(content || "").trim();
    if (!text) return "";
    // Strip whole-document fences if model wraps everything
    if (/^```(?:markdown|md)?\s*/i.test(text) && text.endsWith("```")) {
      text = text.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```$/i, "").trim();
    } else if (text.startsWith("```markdown")) {
      text = text.replace(/^```markdown\s*/i, "").replace(/```\s*$/i, "").trim();
    } else if (text.startsWith("```") && !text.includes("\n```\n") && text.endsWith("```")) {
      text = text.replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    }
    return text.trim();
  }

  function applyGeneratedDocument(projectId, docKey, content) {
    const project = STATE.projects.find(p => p.id === projectId);
    if (!project) return;
    if (!project.versions["v1"]) project.versions["v1"] = {};
    project.versions["v1"][docKey] = content;
    // Keep STATE.currentProject reference in sync
    if (STATE.currentProject && STATE.currentProject.id === projectId) {
      STATE.currentProject.versions["v1"][docKey] = content;
    }
    saveProjectsToStorage();
    if (STATE.currentProject && STATE.currentProject.id === projectId) {
      renderDocumentNav();
      if (STATE.currentDocKey === docKey) {
        updateWorkspaceDocumentView();
      }
    }
  }

  async function checkAiConnectionPreflight() {
    const baseUrl = (STATE.aiBaseUrl || "https://siaptuan.my.id/v1").replace(/\/+$/, "");
    const model = (STATE.aiModel || "combo1").trim();
    try {
      const res = await performAiRequest(`${baseUrl}/chat/completions`, {
        model: model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 10,
        temperature: 0
      });
      if (res && res.ok) return { ok: true };
      const errText = res ? await res.text() : "empty response";
      return { ok: false, status: res?.status || 500, error: errText };
    } catch (err) {
      return { ok: false, status: 0, error: err.message || String(err) };
    }
  }

  async function triggerDocumentGeneration(projectId, docKey, force = false) {
    const genKey = `${projectId}-${docKey}`;
    if (activeGenerations.has(genKey)) return;
    activeGenerations.add(genKey);

    const project = STATE.projects.find(p => p.id === projectId);
    if (!project) {
      activeGenerations.delete(genKey);
      return;
    }

    const versionKey = STATE.currentVersionKey || "v1";
    if (!project.versions[versionKey]) project.versions[versionKey] = project.versions["v1"] || {};
    const versionData = project.versions[versionKey] || project.versions["v1"] || {};
    const currentContent = versionData[docKey];

    // Only skip if content already exists and force is false
    if (!force && currentContent !== "__PENDING_GENERATION__" && !isDocumentEmptyOrPending(currentContent)) {
      activeGenerations.delete(genKey);
      return;
    }

    // Mark pending so UI shows spinner across tabs
    versionData[docKey] = "__PENDING_GENERATION__";
    if (project.versions["v1"]) project.versions["v1"][docKey] = "__PENDING_GENERATION__";
    saveProjectsToStorage();
    if (STATE.currentProject && STATE.currentProject.id === projectId) {
      renderDocumentNav();
      if (STATE.currentDocKey === docKey) showDocumentGeneratingState(docKey);
    }

    // Pre-flight AI connection health check BEFORE running full generation
    addLog("info", `Memeriksa koneksi API AI (${STATE.aiModel || "combo1"}) sebelum generate '${docKey}'...`);
    const connCheck = await checkAiConnectionPreflight();
    if (!connCheck.ok) {
      const cleanErr = String(connCheck.error).slice(0, 300);
      addLog("error", `Uji koneksi API AI gagal (HTTP ${connCheck.status || "?"}): ${cleanErr}`);
      trackApiUsage(1, 0, 0, false);

      alert(`⚠️ Uji Koneksi API AI Gagal (HTTP ${connCheck.status || "Connection Error"}):\n\nServer AI tidak merespons uji koneksi awal (ping test).\nDetail: ${cleanErr}\n\nGenerasi '${docKey}' dibatalkan. Periksa API Key / Base URL di Pengaturan.`);

      const errMarkdown = `> [!CAUTION]
> ### ⚠️ Uji Koneksi API AI Gagal (${docKey})
> Generasi dokumen dibatalkan karena server API AI tidak merespons uji koneksi awal (*ping test*).
>
> **Detail Error**: \`HTTP ${connCheck.status || 'Network Error'}: ${cleanErr}\`
>
> #### Langkah Penyelesaian:
> 1. Klik ikon **Pengaturan API (Kunci)** di sudut kanan atas untuk memeriksa **API Key** dan **Base URL**.
> 2. Pastikan server API AI upstream (\`${STATE.aiBaseUrl}\`) dapat dijangkau dan online.
> 3. Klik tombol di bawah ini untuk mencoba kembali:
>
> <button class="btn btn-primary" onclick="window.retryDocGeneration('${projectId}', '${docKey}')" style="margin-top: 12px; padding: 8px 18px; cursor: pointer; font-weight: 600;">⚡ Coba Uji Koneksi & Generate Ulang</button>`;

      activeGenerations.delete(genKey);
      applyGeneratedDocument(projectId, docKey, errMarkdown);
      return;
    }

    addLog("success", `Uji koneksi API AI BERHASIL (HTTP 200). Memulai AI Thinking untuk '${docKey}'...`);

    addLog("info", `AI generation started for: ${docKey} (Project: "${project.name}")`);

    // Prefer stack saved on project (user choice from form); then main form; then consult selects
    const selectedFrontend =
      project.frontend ||
      (DOM.inputProjFrontendMain && DOM.inputProjFrontendMain.value) ||
      (DOM.inputProjFrontend && DOM.inputProjFrontend.value) ||
      "React + Next.js";
    const selectedBackend =
      project.backend ||
      (DOM.inputProjBackendMain && DOM.inputProjBackendMain.value) ||
      (DOM.inputProjBackend && DOM.inputProjBackend.value) ||
      "Node.js + Express";
    const selectedDb =
      project.db ||
      (DOM.inputProjDbEngineMain && DOM.inputProjDbEngineMain.value) ||
      (DOM.inputProjDbEngine && DOM.inputProjDbEngine.value) ||
      "PostgreSQL";
    const selectedOrm =
      project.orm ||
      (DOM.inputProjDbOrmMain && DOM.inputProjDbOrmMain.value) ||
      (DOM.inputProjDbOrm && DOM.inputProjDbOrm.value) ||
      "Prisma";

    let clarifyingAnswers = project.clarifications || "";
    if (!clarifyingAnswers) {
      if (DOM.inputAnswer1 && DOM.inputAnswer1.value.trim()) clarifyingAnswers += `\n- ${DOM.lblQuestion1?.textContent || "Q1"}: ${DOM.inputAnswer1.value.trim()}`;
      if (DOM.inputAnswer2 && DOM.inputAnswer2.value.trim()) clarifyingAnswers += `\n- ${DOM.lblQuestion2?.textContent || "Q2"}: ${DOM.inputAnswer2.value.trim()}`;
      if (DOM.inputAnswer3 && DOM.inputAnswer3.value.trim()) clarifyingAnswers += `\n- ${DOM.lblQuestion3?.textContent || "Q3"}: ${DOM.inputAnswer3.value.trim()}`;
    }

    // Prefer tables saved on project; fall back to DOM only as secondary source
    let tables = Array.isArray(project.tables) ? project.tables : [];
    if (!tables.length) {
      tables = collectRecommendedTablesFromDom();
      if (tables.length) project.tables = tables;
    }

    // If project lacks deep domain analysis (old projects / thin tables), seed from local domain analyzer FIRST
    const localDomainSeed = (!project.domainDefinition || !Array.isArray(project.coreProcesses) || !project.coreProcesses.length || tables.length < 6)
      ? getCategoryStackRecommendation(project.category || "", project.prompt || "")
      : null;
    if (localDomainSeed) {
      if (!project.domainDefinition) project.domainDefinition = localDomainSeed.domainDefinition || "";
      if (!Array.isArray(project.coreProcesses) || !project.coreProcesses.length) {
        project.coreProcesses = localDomainSeed.coreProcesses || [];
      }
      if (!project.enrichedScope) project.enrichedScope = localDomainSeed.scope || "";
      if (!Array.isArray(project.tables) || project.tables.length < 6) {
        project.tables = localDomainSeed.tables || project.tables || [];
        tables = project.tables;
      }
    }

    const tableRecommendations = formatTableRecommendations(tables);
    const docInstructions = getDocSpecificInstructions(docKey, selectedFrontend, selectedBackend, selectedDb, selectedOrm);

    const domainDefinition = project.domainDefinition || STATE.pendingDomainDefinition || "";
    const coreProcesses = Array.isArray(project.coreProcesses) && project.coreProcesses.length
      ? project.coreProcesses
      : (STATE.pendingCoreProcesses || []);
    const enrichedScope = project.enrichedScope || STATE.pendingEnrichedScope || "";
    const processList = coreProcesses.length
      ? coreProcesses.map((p, i) => `${i + 1}. ${p}`).join("\n")
      : "(infer from domain definition and user idea)";

    const systemPrompt = `You are Minestack AI Domain Architect & Technical Writer.

MISSION: Produce a COMPLETE, production-grade '${docKey}' that truly reflects the business domain — NOT a generic CRUD template.

Project: "${project.name}"
Category: ${project.category || "General"}
Target Archetype: ${project.archetype || STATE.pendingProjectArchetype || "AUTO"}

RAW USER IDEA:
"${project.prompt || ""}"

DOMAIN DEFINITION (what this system really is):
${domainDefinition || "(Deeply infer the real operational domain from the user idea before writing. Example: maintenance management = integrated workshop/CMMS for work orders, assets, spare parts, technicians, downtime & reporting — not a blank form app.)"}

CORE BUSINESS PROCESSES:
${processList}

ENRICHED SCOPE:
${enrichedScope || "(derive multi-role operational scope from domain)"}

Selected tech stack:
- Frontend: ${selectedFrontend}
- Backend: ${selectedBackend}
- Database: ${selectedDb}
- ORM: ${selectedOrm}

Clarifications from product consultation:
${clarifyingAnswers || "(none)"}
${tableRecommendations}

DOCUMENT REQUIREMENTS FOR '${docKey}':
${docInstructions}

GLOBAL RULES (MANDATORY):
1. First internalize the domain (actors, processes, entities). Write as a domain expert.
2. Write primarily in Indonesian; technical identifiers may stay in English.
3. Be concrete and domain-specific. FORBIDDEN: lorem ipsum, TODO, "entitas utama" tanpa nama domain, generic Admin/Operator-only personas when domain has richer roles.
4. Use proper Markdown headings, lists, tables, and fenced code blocks.
5. For ARCHITECTURE.md and DATABASE.md include valid Mermaid diagrams (graph TD / erDiagram).
6. For DATABASE.md target rich depth (12-20+ tables/collections) with real domain entities + ERD, similar quality to a banking blueprint with many collections.
7. Output ONLY raw markdown. Do NOT wrap the entire document in \`\`\`markdown fences. Do NOT output JSON.`;

    const startTime = Date.now();
    try {
      let response = null;
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          response = await performAiRequest(`${STATE.aiBaseUrl}/chat/completions`, {
            model: STATE.aiModel,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Sebelum menulis, pastikan Anda memahami domain "${project.category || project.name}" secara operasional. Lalu tuliskan dokumen '${docKey}' lengkap, detail, dan siap produksi untuk proyek "${project.name}". Hindari konten generik.`
              }
            ],
            temperature: 0.3,
            max_tokens: 3500
          });

          if (response && response.ok) break;

          if (response && (response.status === 502 || response.status === 503 || response.status === 504) && attempts < maxAttempts) {
            addLog("info", `AI upstream sibuk (HTTP ${response.status}). Mencoba ulang otomatis (attempt ${attempts}/${maxAttempts})...`);
            await new Promise(r => setTimeout(r, 1500));
          } else {
            break;
          }
        } catch (reqErr) {
          if (attempts < maxAttempts) {
            addLog("info", `Percobaan koneksi ${attempts} gagal (${reqErr.message}). Mencoba ulang...`);
            await new Promise(r => setTimeout(r, 1500));
          } else {
            throw reqErr;
          }
        }
      }

      const latency = ((Date.now() - startTime) / 1000).toFixed(2);

      if (response && response.ok) {
        const data = await response.json();
        let content = sanitizeAiMarkdown(data.choices?.[0]?.message?.content || "");
        const tokensUsed = data.usage?.total_tokens || Math.round(content.length / 4);

        // Only reject if content is truly empty or less than 30 characters
        const minLen = 30;
        if (!content || content.length < minLen) {
          const errMsg = `AI mengembalikan respon terpotong/kosong (${content ? content.length : 0} karakter).`;
          addLog("error", `AI generate '${docKey}' terpotong/kosong. Notifikasi ditampilkan.`);
          trackApiUsage(1, Math.round(tokensUsed), latency, false);
          
          alert(`⚠️ AI Gagal Menghasilkan Dokumen '${docKey}':\n\nRespon dari AI kosong atau terpotong.\nSilakan coba klik tombol 'Generate Ulang' di dokumen.`);
          
          content = `> [!WARNING]
> ### ⚠️ AI Mengembalikan Respon Terpotong / Kosong
> Dokumen **${docKey}** belum dapat digenerate secara lengkap dari AI Thinking.
>
> <button class="btn btn-primary" onclick="window.retryDocGeneration('${projectId}', '${docKey}')" style="margin-top: 10px; padding: 6px 16px; cursor: pointer; font-weight: 600;">⚡ Coba Generate Ulang dengan AI</button>`;
        } else {
          addLog("success", `AI berhasil generate '${docKey}' dalam ${latency}s. Tokens: ${Math.round(tokensUsed)}`);
          trackApiUsage(1, Math.round(tokensUsed), latency, true);
        }

        activeGenerations.delete(genKey);
        applyGeneratedDocument(projectId, docKey, content);
      } else {
        const errorText = response ? await response.text() : "empty response";
        const cleanErr = String(errorText).slice(0, 350);
        addLog("error", `AI gagal generate '${docKey}' (HTTP ${response?.status || "?"}): ${cleanErr}`);
        trackApiUsage(1, 0, latency, false);

        alert(`⚠️ Gagal Menghubungi API AI untuk Dokumen '${docKey}':\n\nStatus: HTTP ${response?.status || "Connection Error"}\nDetail: ${cleanErr}\n\nPeriksa API Key / Base URL di Pengaturan, atau pastikan aplikasi dibuka via XAMPP (http://localhost/PRD%20EDITOR/).`);

        const errMarkdown = `> [!CAUTION]
> ### ⚠️ Gagal Terhubung ke API AI (${docKey})
> Dokumen ini **Gagal Digenerate** dari AI Thinking karena koneksi API belum terhubung / terputus.
>
> **Detail Error**: \`HTTP ${response?.status || 'Network Error'}: ${cleanErr}\`
>
> #### Langkah Penyelesaian:
> 1. Klik ikon **Pengaturan API (Kunci)** di sudut kanan atas untuk memeriksa **API Key** dan **Base URL**.
> 2. Jika Anda membuka dari Live Server, silakan buka via XAMPP Apache di: \`http://localhost/PRD%20EDITOR/\` agar proxy lokal (\`proxy.php\`) aktif melewati CORS.
> 3. Klik tombol di bawah ini untuk mencoba kembali:
>
> <button class="btn btn-primary" onclick="window.retryDocGeneration('${projectId}', '${docKey}')" style="margin-top: 12px; padding: 8px 18px; cursor: pointer; font-weight: 600;">⚡ Coba Generate Ulang Dokumen Ini dengan AI</button>`;

        activeGenerations.delete(genKey);
        applyGeneratedDocument(projectId, docKey, errMarkdown);
      }
    } catch (err) {
      const latency = ((Date.now() - startTime) / 1000).toFixed(2);
      const errMsg = err.message || String(err);
      addLog("error", `Exception generate '${docKey}': ${errMsg}`);
      trackApiUsage(1, 0, latency, false);

      alert(`⚠️ Koneksi API AI Terputus saat Membuat '${docKey}':\n\nDetail: ${errMsg}\n\nPeriksa koneksi internet atau API Key Anda.`);

      const errMarkdown = `> [!CAUTION]
> ### ⚠️ Koneksi API AI Terputus (${docKey})
> Gagal meminta AI Thinking untuk dokumen ini: \`${errMsg}\`.
>
> Pastikan API Key valid dan terhubung ke server AI.
>
> <button class="btn btn-primary" onclick="window.retryDocGeneration('${projectId}', '${docKey}')" style="margin-top: 12px; padding: 8px 18px; cursor: pointer; font-weight: 600;">⚡ Coba Generate Ulang Dokumen Ini dengan AI</button>`;

      activeGenerations.delete(genKey);
      applyGeneratedDocument(projectId, docKey, errMarkdown);
    }
  }

  // Global helper for user-triggered document retry
  window.retryDocGeneration = function(projectId, docKey) {
    addLog("info", `Manual retry AI generation for document: ${docKey}`);
    triggerDocumentGeneration(projectId, docKey, true).catch(err => {
      alert(`Retry gagal terhubung ke AI:\n\n${err.message || err}`);
    });
  };

  /**
   * Buat project dari form utama + tech stack, lalu AI engine mendetailkan
   * 6 dokumen: PRD, TECH_STACK, ARCHITECTURE, DATABASE, API, DEPLOYMENT.
   */
  async function handleCreateLocalBlueprint() {
    try {
      if (!checkAiGenerationAllowed()) return;

      if (!Array.isArray(STATE.projects)) STATE.projects = [];

      const nameEl = DOM.inputProjName || document.getElementById("inputProjName");
      const promptEl = DOM.inputProjPrompt || document.getElementById("inputProjPrompt");
      const name = (nameEl && nameEl.value ? nameEl.value : "").trim();
      const prompt = (promptEl && promptEl.value ? promptEl.value : "").trim();

      if (!name || !prompt) {
        alert("Silakan isi nama proyek dan deskripsi ide aplikasi Anda.");
        if (!name && nameEl) nameEl.focus();
        else if (promptEl) promptEl.focus();
        return;
      }

      // Prefer stack from main form; fall back to consult selects if present
      const selectedFrontend =
        (DOM.inputProjFrontendMain && DOM.inputProjFrontendMain.value) ||
        (DOM.inputProjFrontend && DOM.inputProjFrontend.value) ||
        "React + Next.js";
      const selectedBackend =
        (DOM.inputProjBackendMain && DOM.inputProjBackendMain.value) ||
        (DOM.inputProjBackend && DOM.inputProjBackend.value) ||
        "Node.js + Express";
      const selectedDb =
        (DOM.inputProjDbEngineMain && DOM.inputProjDbEngineMain.value) ||
        (DOM.inputProjDbEngine && DOM.inputProjDbEngine.value) ||
        "PostgreSQL";
      const selectedOrm =
        (DOM.inputProjDbOrmMain && DOM.inputProjDbOrmMain.value) ||
        (DOM.inputProjDbOrm && DOM.inputProjDbOrm.value) ||
        "Prisma";

      // Local domain seed (metadata + fallback if AI gagal)
      const forcedArchetype = (DOM.inputProjArchetype && DOM.inputProjArchetype.value) || "AUTO";
      const localSeed = getCategoryStackRecommendation("", prompt, forcedArchetype) || {};
      const category = localSeed.category || STATE.pendingProjectCategory || "General";

      STATE.isConsulting = false;
      const modal = DOM.modalNewProject || document.getElementById("modalNewProject");
      if (modal) modal.classList.remove("active");
      if (DOM.modalFormBody) DOM.modalFormBody.style.display = "block";
      if (DOM.modalConsultBody) DOM.modalConsultBody.style.display = "none";
      if (DOM.modalProgressBody) DOM.modalProgressBody.style.display = "none";
      if (DOM.modalGenerateBtn) {
        DOM.modalGenerateBtn.disabled = false;
        DOM.modalGenerateBtn.style.opacity = "1";
      }

      // Skeleton project: stack user + domain seed; 6 docs marked pending for AI
      const todayStr = new Date().toLocaleDateString("id-ID");
      const projId = "proj-" + Date.now();
      const newProject = {
        id: projId,
        name: name,
        prompt: prompt,
        category: category,
        archetype: forcedArchetype,
        frontend: selectedFrontend,
        backend: selectedBackend,
        db: selectedDb,
        orm: selectedOrm,
        clarifications: "",
        tables: Array.isArray(localSeed.tables) ? localSeed.tables : [],
        domainDefinition: localSeed.domainDefinition || "",
        coreProcesses: Array.isArray(localSeed.coreProcesses) ? localSeed.coreProcesses : [],
        enrichedScope: localSeed.scope || "",
        date: todayStr,
        versions: {
          "v1": {
            "PRD.md": "__PENDING_GENERATION__",
            "TECH_STACK.md": "__PENDING_GENERATION__",
            "ARCHITECTURE.md": "__PENDING_GENERATION__",
            "DATABASE.md": "__PENDING_GENERATION__",
            "API.md": "__PENDING_GENERATION__",
            "DEPLOYMENT.md": "__PENDING_GENERATION__"
          }
        }
      };

      STATE.projects.unshift(newProject);
      saveProjectsToStorage();
      renderProjectsGrid();
      addLog(
        "info",
        `Proyek dibuat: "${name}" [${category}] — stack: ${selectedFrontend} / ${selectedBackend} / ${selectedDb} (${selectedOrm}). AI engine mulai mendetailkan 6 dokumen...`
      );

      // Clear form + pending state
      if (nameEl) nameEl.value = "";
      if (promptEl) promptEl.value = "";
      STATE.pendingProjectCategory = "General";
      STATE.pendingDomainDefinition = "";
      STATE.pendingCoreProcesses = [];
      STATE.pendingEnrichedScope = "";
      STATE.pendingTables = [];

      // Open workspace, then AI generate all 6 docs (stack sudah di project)
      consumeAiQuota();
      openProjectWorkspace(newProject.id, { skipAutoGenerate: true });
      prefetchProjectDocuments(newProject.id, true).catch(err => {
        console.error("prefetchProjectDocuments failed", err);
        addLog("error", `AI generate dokumen gagal: ${err.message || err}`);
      });
    } catch (err) {
      console.error("handleCreateLocalBlueprint error", err);
      addLog("error", `Gagal membuat blueprint: ${err.message || err}`);
      alert(`Gagal membuat blueprint:\n\n${err.message || err}`);
      if (DOM.modalGenerateBtn) {
        DOM.modalGenerateBtn.disabled = false;
        DOM.modalGenerateBtn.style.opacity = "1";
      }
    }
  }

  /**
   * Setelah AI consultation (opsional): buat project dengan stack & tables hasil konsultasi,
   * lalu AI engine mendetailkan 6 dokumen blueprint.
   */
  async function handleFinalGenerateBlueprint() {
    const name = DOM.inputProjName.value.trim();
    const prompt = DOM.inputProjPrompt.value.trim();
    const category = STATE.pendingProjectCategory || "General";

    if (!name || !prompt) {
      alert("Silakan isi nama proyek dan deskripsi ide aplikasi Anda.");
      return;
    }

    // Prefer consult selects (user may have adjusted AI recs); fall back to main form
    const selectedFrontend =
      (DOM.inputProjFrontend && DOM.inputProjFrontend.value) ||
      (DOM.inputProjFrontendMain && DOM.inputProjFrontendMain.value) ||
      "React + Next.js";
    const selectedBackend =
      (DOM.inputProjBackend && DOM.inputProjBackend.value) ||
      (DOM.inputProjBackendMain && DOM.inputProjBackendMain.value) ||
      "Node.js + Express";
    const selectedDb =
      (DOM.inputProjDbEngine && DOM.inputProjDbEngine.value) ||
      (DOM.inputProjDbEngineMain && DOM.inputProjDbEngineMain.value) ||
      "PostgreSQL";
    const selectedOrm =
      (DOM.inputProjDbOrm && DOM.inputProjDbOrm.value) ||
      (DOM.inputProjDbOrmMain && DOM.inputProjDbOrmMain.value) ||
      "Prisma";

    let clarifyingAnswers = "";
    if (DOM.inputAnswer1 && DOM.inputAnswer1.value.trim()) clarifyingAnswers += `\n- ${DOM.lblQuestion1.textContent}: ${DOM.inputAnswer1.value.trim()}`;
    if (DOM.inputAnswer2 && DOM.inputAnswer2.value.trim()) clarifyingAnswers += `\n- ${DOM.lblQuestion2.textContent}: ${DOM.inputAnswer2.value.trim()}`;
    if (DOM.inputAnswer3 && DOM.inputAnswer3.value.trim()) clarifyingAnswers += `\n- ${DOM.lblQuestion3.textContent}: ${DOM.inputAnswer3.value.trim()}`;

    // Snapshot recommended tables + domain analysis BEFORE modal is reset/cleared
    const tablesFromDom = collectRecommendedTablesFromDom();
    const recommendedTables = tablesFromDom.length
      ? tablesFromDom
      : (STATE.pendingTables || []);
    const enrichedScope = STATE.pendingEnrichedScope
      || (DOM.lblEnrichedScope ? DOM.lblEnrichedScope.textContent : "");
    const domainDefinition = STATE.pendingDomainDefinition || "";
    const coreProcesses = Array.isArray(STATE.pendingCoreProcesses) ? STATE.pendingCoreProcesses.slice() : [];

    STATE.isConsulting = false;
    DOM.modalNewProject.classList.remove("active");
    DOM.modalFormBody.style.display = "block";
    DOM.modalConsultBody.style.display = "none";
    DOM.modalProgressBody.style.display = "none";
    if (DOM.modalGenerateBtn) {
      DOM.modalGenerateBtn.disabled = false;
      DOM.modalGenerateBtn.style.opacity = "1";
    }

    const todayStr = new Date().toLocaleDateString("id-ID");
    const projId = "proj-" + Date.now();
    const newProject = {
      id: projId,
      name: name,
      prompt: prompt,
      category: category,
      frontend: selectedFrontend,
      backend: selectedBackend,
      db: selectedDb,
      orm: selectedOrm,
      clarifications: clarifyingAnswers,
      tables: recommendedTables,
      domainDefinition: domainDefinition,
      coreProcesses: coreProcesses,
      enrichedScope: enrichedScope,
      date: todayStr,
      versions: {
        "v1": {
          "PRD.md": "__PENDING_GENERATION__",
          "TECH_STACK.md": "__PENDING_GENERATION__",
          "ARCHITECTURE.md": "__PENDING_GENERATION__",
          "DATABASE.md": "__PENDING_GENERATION__",
          "API.md": "__PENDING_GENERATION__",
          "DEPLOYMENT.md": "__PENDING_GENERATION__"
        }
      }
    };

    STATE.projects.unshift(newProject);
    saveProjectsToStorage();
    renderProjectsGrid();
    addLog(
      "info",
      `Proyek dari konsultasi: "${name}" [${category}] — stack: ${selectedFrontend} / ${selectedBackend} / ${selectedDb}. AI engine mendetailkan 6 dokumen...`
    );

    // Clear form + pending consultation state after snapshotting into project
    if (DOM.inputProjName) DOM.inputProjName.value = "";
    if (DOM.inputProjPrompt) DOM.inputProjPrompt.value = "";
    STATE.pendingProjectCategory = "General";
    STATE.pendingDomainDefinition = "";
    STATE.pendingCoreProcesses = [];
    STATE.pendingEnrichedScope = "";
    STATE.pendingTables = [];

    // Open workspace + AI generate all 6 docs
    openProjectWorkspace(newProject.id, { skipAutoGenerate: true });
    prefetchProjectDocuments(newProject.id, true).catch(err => {
      console.error("prefetchProjectDocuments failed", err);
      addLog("error", `AI generate dokumen gagal: ${err.message || err}`);
    });
  }

  async function prefetchProjectDocuments(projectId, forceEmpty = false) {
    // Start step-by-step document generation starting with PRD.md
    await triggerStepByStepDocumentGeneration(projectId, "PRD.md", forceEmpty);
  }

  async function triggerStepByStepDocumentGeneration(projectId, docKey, forceEmpty = false) {
    const project = STATE.projects.find(p => p.id === projectId);
    if (!project) return;

    addLog("info", `[Step-by-Step AI] Generasi dokumen '${docKey}' dimulai untuk proyek "${project.name}"...`);

    // Switch workspace active document view to target document if currently open
    if (STATE.currentProject && STATE.currentProject.id === projectId) {
      STATE.currentDocKey = docKey;
      renderDocumentNav();
      showDocumentGeneratingState(docKey);
    }

    try {
      await triggerDocumentGeneration(projectId, docKey, forceEmpty);
    } catch (e) {
      console.error("Step-by-step document generation error for", docKey, e);
      return;
    }

    // Check result of current document generation
    const versionData = project.versions["v1"] || {};
    const content = versionData[docKey] || "";

    // If document failed or contains caution banner, pause step-by-step progression
    if (!content || content.includes("Gagal Terhubung ke API AI") || content.includes("Koneksi API AI Terputus")) {
      addLog("warn", `Proses step-by-step dihentikan pada '${docKey}' karena koneksi API bermasalah.`);
      return;
    }

    // Define document sequence
    const docSequence = ["PRD.md", "TECH_STACK.md", "ARCHITECTURE.md", "DATABASE.md", "API.md", "DEPLOYMENT.md"];
    const currentIndex = docSequence.indexOf(docKey);

    if (currentIndex >= 0 && currentIndex < docSequence.length - 1) {
      const nextDocKey = docSequence[currentIndex + 1];
      const nextContent = versionData[nextDocKey];

      // Prompt user confirmation to proceed to next document
      if (nextContent === "__PENDING_GENERATION__" || isDocumentEmptyOrPending(nextContent)) {
        setTimeout(() => {
          promptNextDocumentConfirmation(projectId, docKey, nextDocKey);
        }, 500);
      }
    } else if (currentIndex === docSequence.length - 1) {
      addLog("success", `🎉 Seluruh 6 dokumen blueprint software untuk "${project.name}" telah lengkap!`);
    }
  }

  function promptNextDocumentConfirmation(projectId, currentDocKey, nextDocKey) {
    const project = STATE.projects.find(p => p.id === projectId);
    if (!project) return;

    const docLabels = {
      "PRD.md": "Product Requirements Document (PRD)",
      "TECH_STACK.md": "Rekomendasi Tech Stack",
      "ARCHITECTURE.md": "Arsitektur Sistem",
      "DATABASE.md": "Skema Database & ERD",
      "API.md": "Kontrak API",
      "DEPLOYMENT.md": "Panduan Deployment"
    };

    const currentTitle = docLabels[currentDocKey] || currentDocKey;
    const nextTitle = docLabels[nextDocKey] || nextDocKey;

    const confirmMsg = `✅ Dokumen '${currentDocKey}' (${currentTitle}) BERHASIL digenerate oleh AI Thinking!\n\nApakah Anda ingin melanjutkan men-generate dokumen berikutnya:\n👉 '${nextDocKey}' (${nextTitle})?\n\n(Klik OK untuk lanjut generate ${nextDocKey}, atau Cancel untuk berhenti sementara).`;

    if (confirm(confirmMsg)) {
      addLog("info", `User menyetujui generasi dokumen berikutnya: ${nextDocKey}`);
      triggerStepByStepDocumentGeneration(projectId, nextDocKey, true).catch(err => {
        alert(`Gagal men-generate '${nextDocKey}': ${err.message || err}`);
      });
    } else {
      addLog("info", `Generasi dokumen berikutnya (${nextDocKey}) ditunda. Anda dapat men-generate dokumen ini kapan saja secara manual.`);
    }
  }

  function fallbackCustomLocalGeneration(name, category, prompt, frontend, backend, db, orm, intervalId) {
    if (intervalId) clearInterval(intervalId);
    const newProject = createCustomLocalFallbackPackage(name, category, prompt, frontend, backend, db, orm);
    STATE.projects.unshift(newProject);
    saveProjectsToStorage();

    DOM.modalNewProject.classList.remove("active");
    DOM.modalConsultBody.style.display = "none";
    DOM.modalFormBody.style.display = "block";
    DOM.modalProgressBody.style.display = "none";
    DOM.inputProjName.value = "";
    DOM.inputProjPrompt.value = "";

    openProjectWorkspace(newProject.id);
  }

  function createCustomLocalFallbackPackage(name, category, prompt, frontend, backend, db, orm, tables) {
    const todayStr = new Date().toLocaleDateString("id-ID");
    const projId = "proj-" + Date.now();
    const localSeed = getCategoryStackRecommendation(category || "", prompt || "");
    const fe = frontend || localSeed.frontend || "React + Next.js";
    const be = backend || localSeed.backend || "Node.js + Express";
    const dbEngine = db || localSeed.db || "PostgreSQL";
    const ormFw = orm || localSeed.orm || "Prisma";
    const resolvedCategory = category || localSeed.category || "General";
    const domainDefinition = localSeed.domainDefinition || `Sistem operasional terintegrasi untuk: ${(prompt || name || "").slice(0, 180)}`;
    const coreProcesses = Array.isArray(localSeed.coreProcesses) ? localSeed.coreProcesses : [];
    const enrichedScope = localSeed.scope || "";
    const slug = String(name || "app").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    // Prefer caller tables; if too thin, merge/replace with domain seed tables
    let tableList = Array.isArray(tables) && tables.length >= 6
      ? tables
      : (Array.isArray(tables) && tables.length
          ? [...tables, ...(localSeed.tables || [])].filter((t, i, arr) =>
              arr.findIndex(x => String(x.name).toLowerCase() === String(t.name).toLowerCase()) === i
            )
          : (localSeed.tables || []));
    if (!tableList.length) {
      tableList = [
        { name: "users", columns: "id, email, password_hash, role, full_name, status, created_at", description: "Akun pengguna & role sistem." },
        { name: "domain_entities", columns: "id, code, name, status, owner_id, created_at, updated_at", description: "Entitas bisnis utama domain." },
        { name: "workflow_transitions", columns: "id, entity_id, from_state, to_state, actor_id, created_at", description: "Riwayat status workflow." },
        { name: "audit_logs", columns: "id, user_id, action, entity, entity_id, meta, created_at", description: "Jejak aktivitas sistem." }
      ];
    }

    const tableCount = tableList.length;
    const tableMarkdown = tableList.map((t, i) => {
      return `### ${i + 1}. \`${t.name}\`\n* **Kolom**: ${t.columns || "-"}\n* **Deskripsi**: ${t.description || "-"}\n`;
    }).join("\n");

    const mermaidEntities = tableList.map(t => {
      const cols = String(t.columns || "id, name").split(",").map(c => c.trim()).filter(Boolean).slice(0, 8);
      const colLines = cols.map((c, idx) => {
        const type = /(_at|date)/i.test(c) ? "datetime" : /(_id|id)$/i.test(c) ? "string" : /qty|amount|balance|price|stock|cost|score/i.test(c) ? "decimal" : "string";
        const key = idx === 0 || c === "id" ? " PK" : /_id$/i.test(c) ? " FK" : "";
        return `        ${type} ${c.replace(/\s+/g, "_")}${key}`;
      }).join("\n");
      const ent = String(t.name || "entity").toUpperCase().replace(/\s+/g, "_");
      return `    ${ent} {\n${colLines}\n    }`;
    }).join("\n\n");

    // Build richer ER relationships from FK-looking column names
    const entityNames = tableList.map(t => String(t.name || "entity").toUpperCase().replace(/\s+/g, "_"));
    const relationLines = [];
    tableList.forEach(t => {
      const child = String(t.name || "").toUpperCase().replace(/\s+/g, "_");
      const cols = String(t.columns || "").split(",").map(c => c.trim());
      cols.forEach(c => {
        if (!/_id$/i.test(c) || c === "id") return;
        const parentBase = c.replace(/_id$/i, "").toUpperCase();
        const parentCandidates = [
          parentBase,
          parentBase + "S",
          parentBase.replace(/Y$/, "IES"),
          parentBase + "ES"
        ];
        const parent = entityNames.find(e => parentCandidates.includes(e) || e === parentBase || e.startsWith(parentBase));
        if (parent && parent !== child) {
          relationLines.push(`    ${parent} ||--o{ ${child} : has`);
        }
      });
    });
    // Ensure at least a few relations for diagram readability
    if (relationLines.length < 2 && entityNames.length >= 3) {
      relationLines.push(`    ${entityNames[0]} ||--o{ ${entityNames[1]} : manages`);
      relationLines.push(`    ${entityNames[0]} ||--o{ ${entityNames[2]} : generates`);
      if (entityNames[3]) relationLines.push(`    ${entityNames[1]} ||--o{ ${entityNames[3]} : references`);
    }
    const uniqueRelations = [...new Set(relationLines)].slice(0, 24).join("\n");

    const processMarkdown = coreProcesses.length
      ? coreProcesses.map((p, i) => `${i + 1}. ${p}`).join("\n")
      : "1. Autentikasi multi-role\n2. Pencatatan aktivitas domain\n3. Workflow status\n4. Pelaporan & audit";

    const rolesMarkdown = localSeed.rolesMarkdown || `* **Pembeli / Pelanggan**: Mencari katalog produk, membuat pesanan, dan melakukan transaksi.
* **Sales / Staff Operasional**: Verifikasi pesanan, membuat penawaran/invoice, dan melayani pembeli.
* **Admin Gudang & Logistik**: Mengelola master data, stok barang, dan proses pengiriman.
* **Manajer / Administrator**: Memantau performa bisnis, omzet, dan konfigurasi sistem.`;

    const userStoriesMarkdown = localSeed.userStoriesMarkdown || `* Sebagai **pengguna**, saya ingin mencari produk/layanan agar cepat menemukan barang yang presisi.
* Sebagai **staff operasional**, saya ingin memproses pesanan/penawaran dengan cepat agar pelanggan puas.
* Sebagai **manajer**, saya ingin melihat laporan omzet/performa untuk mengambil keputusan bisnis.`;

    const kpiMarkdown = localSeed.kpiMarkdown || `* Akurasi katalog & pencarian = 100%.
* Order Fulfillment / Processing Time < 24 jam.
* Latency API p95 < 300ms untuk endpoint baca.
* Uptime bulanan >= 99.5%.`;

    const primaryResources = tableList
      .map(t => t.name)
      .filter(n => !/^(users|roles|audit_logs|notifications|auth_tokens|devices)$/i.test(n))
      .slice(0, 5);
    const apiResource = primaryResources[0] || tableList[0]?.name || "records";

    return {
      id: projId,
      name: name,
      prompt: prompt,
      category: resolvedCategory,
      frontend: fe,
      backend: be,
      db: dbEngine,
      orm: ormFw,
      tables: tableList,
      domainDefinition,
      coreProcesses,
      enrichedScope,
      date: todayStr,
      versions: {
        "v1": {
          "PRD.md": `# Product Requirements Document (PRD) - ${name}

## 1. Ringkasan Eksekutif
Aplikasi **${name}** (kategori: **${resolvedCategory}**) dibangun untuk menjawab kebutuhan:
> "${prompt}"

## 2. Definisi Domain & Masalah Operasional
${domainDefinition}

${enrichedScope ? `### Ruang Lingkup Operasional\n${enrichedScope}\n` : ""}
## 3. Visi & Tujuan Produk
* Menstandarkan pencatatan dan transaksi proses bisnis domain **${resolvedCategory}**.
* Memberi visibilitas real-time bagi pembeli, pengelola, dan manajemen.
* Menyediakan jejak audit dan laporan transaksi yang akurat.

## 4. Target Pengguna & Persona (Domain)
${rolesMarkdown}

## 5. Proses Bisnis Inti
${processMarkdown}

## 6. Fitur Utama (Prioritas)
### P0 (Wajib Fase 1)
* Autentikasi User & RBAC per role domain.
* Master data produk & pencarian filter entitas utama.
* Alur transaksi inti (pesanan, penawaran, invoice, atau workflow status).
* Log transaksi & audit trail.

### P1
* Notifikasi transaksi in-app / email.
* Export laporan PDF & Excel.
* Filter pencarian lanjutan & pagination.

### P2
* Integrasi payment gateway / ekspedisi cargo.
* Analitik grafik & histori transaksi.

## 7. User Stories (Contoh Domain)
${userStoriesMarkdown}

## 8. Metrik Kesuksesan (KPI Domain)
${kpiMarkdown}

## 9. Ruang Lingkup
* **In Scope**: Web app, API backend, skema ${dbEngine} (${tableCount} entitas inti), RBAC, reporting.
* **Out of Scope (Fase 1)**: Mobile native full-offline, BI advanced multi-region.`,

          "TECH_STACK.md": `# Rekomendasi Tech Stack - ${name}

## 1. Frontend
* **Framework**: ${fe}
* **Styling**: Tailwind CSS + component library (Shadcn/Radix/Headless UI)
* **Data Fetching / State**: TanStack Query + state lokal ringan (Zustand/Context)
* **Validasi Form**: Zod / Yup
* **Charts**: Recharts / Chart.js

## 2. Backend
* **API Engine**: ${be}
* **API Style**: REST (JSON) + optional WebSocket untuk event real-time
* **Auth**: JWT access token + refresh token rotation
* **Validasi Request**: schema validation di edge service/controller

## 3. Database & Storage
* **Primary DB**: ${dbEngine}
* **ORM / Query Layer**: ${ormFw}
* **Cache**: Redis (session, rate-limit, hot reads)
* **Object Storage**: S3-compatible (dokumen/gambar)

## 4. Observability & Security
* Structured logging + request-id
* Metrics (latency, error rate)
* Secrets via environment / vault
* HTTPS only + CORS ketat + rate limiting

## 5. Hosting & CI/CD
* Frontend: Vercel / Netlify / static CDN
* Backend: Docker di VPS / Railway / Render / AWS
* Pipeline: GitHub Actions (lint, test, build, deploy)

## 6. Justifikasi Singkat
Stack ini dipilih agar cocok dengan domain **${resolvedCategory}** (${domainDefinition.slice(0, 120)}...), cepat diimplementasikan, dan scalable untuk pertumbuhan fitur berikutnya.`,

          "ARCHITECTURE.md": `# System Architecture - ${name}

## 1. Ringkasan
Arsitektur modular layered untuk domain **${resolvedCategory}**: Client (${fe}) → API Gateway → Backend (${be}) → ${dbEngine} (+ Redis cache).

## 2. High-Level Design

\`\`\`mermaid
graph TD
    Client[Web Client - ${fe}] --> CDN[CDN / WAF]
    CDN --> Gateway[API Gateway]
    Gateway --> Auth[Auth & RBAC]
    Gateway --> DomainAPI[Domain API - ${be}]
    Gateway --> Workflow[Workflow / Status Engine]
    Gateway --> Report[Reporting & KPI]
    Auth --> Redis[(Redis)]
    DomainAPI --> DB[(${dbEngine})]
    Workflow --> DB
    Report --> DB
    DomainAPI --> Storage[(Object Storage)]
    DomainAPI --> Notify[Notification Service]
\`\`\`

## 3. Modul Utama (bahasa domain)
1. **Auth & RBAC**: login, refresh token, permission per role operasional.
2. **Domain Core**: entitas & proses untuk: "${(prompt || "").slice(0, 140)}".
3. **Workflow Engine**: transisi status, assignment, approval.
4. **Reporting**: dashboard KPI & export.
5. **Audit**: jejak aksi kritikal ke audit_logs.

## 4. Alur Request Tipikal Domain
1. User login → JWT + role context.
2. Client memanggil resource domain (contoh: \`/${apiResource}\`) dengan Bearer token.
3. Backend validasi auth/role → jalankan proses bisnis → baca/tulis ${dbEngine}.
4. Transisi status dicatat; notifikasi & audit dipicu bila perlu.

## 5. Non-Functional
* Horizontal scale stateless API.
* Index pada FK, status, dan kolom filter utama.
* Backup harian + retensi log audit.`,

          "DATABASE.md": `# Database Schema (${dbEngine} + ${ormFw}) - ${name}

## 1. Overview Model Data
Skema production-oriented untuk domain **${resolvedCategory}**.
* **Engine**: ${dbEngine}
* **ORM**: ${ormFw}
* **Jumlah entitas inti**: **${tableCount} tables/collections** (dapat diperluas ke junction/history bila perlu)
* **Definisi domain**: ${domainDefinition}

## 2. Daftar Tabel / Collections (${tableCount})
${tableMarkdown}

## 3. Entity Relationship Diagram (ERD)

\`\`\`mermaid
erDiagram
${uniqueRelations}

${mermaidEntities}
\`\`\`

## 4. Aturan Integritas Domain
* Semua tabel memiliki primary key unik.
* Foreign key wajib konsisten; soft-delete disarankan untuk data historis operasional.
* Timestamp \`created_at\` / \`updated_at\` pada entitas utama.
* Index pada kolom pencarian (kode dokumen, status, foreign key, periode).
* Transisi status penting wajib meninggalkan jejak di audit/workflow log.
* Constraint bisnis domain (contoh: stok tidak negatif, WO close hanya jika task selesai, ledger seimbang) diterapkan di service layer + DB check bila memungkinkan.

## 5. Catatan ORM (${ormFw})
* Mapping entity 1:1 dengan tabel di atas.
* Migration versioned untuk setiap perubahan skema.
* Seed awal: role domain + user demo + master data minimal.`,

          "API.md": `# API Contracts Specification - ${name}

## 1. Base URL
\`\`\`text
https://api.example.com/v1
\`\`\`

## 2. Auth Header
\`\`\`http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
\`\`\`

## 3. Response Envelope
\`\`\`json
{
  "status": "success",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 0 },
  "error": null
}
\`\`\`

## 4. Endpoints

### Auth
* **POST** \`/auth/login\`
  * Request: \`{"email":"user@example.com","password":"secret"}\`
  * Response 200: \`{"status":"success","data":{"access_token":"...","expires_in":3600}}\`
* **POST** \`/auth/refresh\`
* **POST** \`/auth/logout\`

### Users & Roles
* **GET** \`/users\`
* **POST** \`/users\`
* **GET** \`/users/:id\`
* **PATCH** \`/users/:id\`

${primaryResources.map(r => `### Domain resource \`${r}\`
* **GET** \`/${r}?page=1&limit=20&status=active\`
* **POST** \`/${r}\`
* **GET** \`/${r}/:id\`
* **PATCH** \`/${r}/:id\`
* **POST** \`/${r}/:id/transition\` — ubah status workflow domain
`).join("\n")}
### Reporting
* **GET** \`/reports/dashboard\`
* **GET** \`/reports/export?type=summary&format=xlsx\`

### Audit
* **GET** \`/audit-logs?actor_id=&action=&entity=\`

## 5. Error Model
* \`400\` validasi gagal
* \`401\` token invalid/expired
* \`403\` role tidak berwenang
* \`404\` resource tidak ditemukan
* \`409\` konflik status workflow / integritas domain
* \`429\` rate limit
* \`500\` error server`,

          "DEPLOYMENT.md": `# Deployment Guide - ${name}

## 1. Prerequisites
* Node.js 20+ / runtime sesuai stack backend (${be})
* ${dbEngine} instance
* Redis (opsional tapi direkomendasikan)
* Akun Vercel/Docker registry + GitHub

## 2. Environment Variables
\`\`\`env
NODE_ENV=production
PORT=5000
APP_NAME=${slug}
DATABASE_URL=postgresql://user:pass@localhost:5432/${slug}_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me_super_secret
JWT_EXPIRES_IN=1h
CORS_ORIGIN=https://app.example.com
\`\`\`

## 3. Local Run
1. Install dependencies frontend & backend.
2. Siapkan database + jalankan migration ${ormFw}.
3. Isi \`.env\`.
4. Jalankan API dan web dev server.
5. Verifikasi \`GET /health\`.

## 4. Production Deploy
### Frontend (${fe})
* Build static/SSR lalu deploy ke Vercel/Netlify.
* Set \`NEXT_PUBLIC_API_URL\` / env API base URL.

### Backend (${be})
* Build Docker image.
* Deploy ke VPS/Kubernetes/PaaS.
* Pasang reverse proxy (Nginx/Caddy) + HTTPS.

## 5. CI/CD (GitHub Actions - ringkas)
\`\`\`yaml
name: deploy
on:
  push:
    branches: [ main ]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install & Test
        run: |
          npm ci
          npm test --if-present
      - name: Build
        run: npm run build --if-present
      - name: Deploy
        run: echo "Deploy ke environment production"
\`\`\`

## 6. Go-Live Checklist
* Migration DB sukses
* Secret production terisi
* Backup DB aktif
* Health check & alert error rate
* Smoke test login + CRUD utama`
        }
      }
    };
  }

  /* ==========================================================================
     7. AI COPILOT CHAT SIDEBAR LOGIC
     ========================================================================== */

  /**
   * Panduan produk Minestack — dipakai Copilot agar menjawab konsep di dalam web ini.
   * Di luar konteks produk/proyek blueprint: TOLAK.
   */
  function getCopilotProductGuide() {
    return `
## IDENTITAS
Kamu adalah **Minestack AI Architect Copilot** di dalam web Minestack AI Architect (PRD EDITOR).
Tugasmu: memandu user memahami dan memperbaiki **blueprint software** di workspace ini.
Bahasa jawaban: **Bahasa Indonesia**, ringkas, profesional, pakai bullet bila perlu.

## BATAS KONTEKS (WAJIB)
Jawab HANYA jika pertanyaan terkait:
1) Aplikasi Minestack AI Architect / cara pakai web ini
2) Dokumen blueprint proyek aktif (PRD, Tech Stack, Architecture, Database, API, Deployment)
3) Konsep software architecture yang muncul di blueprint (tech stack, PRD, API, DB schema, deploy, integrasi)
4) Instruksi edit/perbaiki dokumen blueprint aktif

Jika pertanyaan DI LUAR konteks di atas (cuaca, politik, resep, PR pribadi, coding di luar proyek ini, topik umum tak terkait blueprint):
- JANGAN jawab isinya
- Tolak sopan dengan template:
  "Maaf, saya hanya membantu seputar Minestack AI Architect dan dokumen blueprint proyek ini (PRD, Tech Stack, Architecture, Database, API, Deployment). Silakan tanyakan konsep dokumen, cara integrasi stack, atau minta saya perbaiki dokumen aktif."

## PANDUAN PRODUK MINESTACK AI ARCHITECT

### Apa itu Minestack AI Architect?
Web tool untuk membangun **software blueprint** dari ide aplikasi. User isi nama + ide, pilih tech stack, lalu AI menghasilkan 6 dokumen produksi di workspace.

### Alur utama di web
1. Dashboard → **Project Baru**
2. Isi nama proyek + deskripsi ide
3. Pilih tech stack: Frontend, Backend, Database, ORM
4. Klik **Buat Blueprint dengan AI**
5. Workspace terbuka; AI mengisi 6 dokumen (status generating → siap)
6. Buka dokumen di sidebar kiri; mode Render / Markdown Mentah / Diff
7. Opsional: **Generate AI** (ulang dokumen), **Download ZIP**, **AI Copilot** (chat ini)
8. Menu lain: API Keys (koneksi model AI), Signals (log), Metrics, Billing, Support

### Enam dokumen blueprint — arti & isi
1. **PRD.md (Product Requirements Document)**
   Spesifikasi produk: masalah domain, persona/role, proses bisnis, fitur P0/P1/P2, user stories, KPI, in/out scope.
2. **TECH_STACK.md**
   Rekomendasi teknologi: frontend, backend, DB, ORM, cache, auth, hosting, justifikasi pilihan.
3. **ARCHITECTURE.md**
   High-level design: komponen sistem, alur request, modul domain, diagram Mermaid, non-functional (scale, security).
4. **DATABASE.md**
   Skema data: tabel/collections, kolom, relasi ERD (Mermaid), constraint, catatan ORM/migration.
5. **API.md**
   Kontrak REST: base URL, auth header, envelope response, endpoint per resource, error model (4xx/5xx).
6. **DEPLOYMENT.md**
   Cara jalan lokal & production: env vars, Docker/Vercel, CI/CD, checklist go-live.

### Tech stack itu apa?
Kombinasi teknologi yang dipakai membangun aplikasi end-to-end:
- **Frontend**: UI di browser (contoh React+Next.js, Vue+Nuxt, Laravel Blade)
- **Backend**: server API/logika bisnis (Node+Express, Go+Fiber, PHP+Laravel, dll.)
- **Database**: penyimpanan data (PostgreSQL, MySQL, MongoDB, SQLite, Redis)
- **ORM**: layer mapping object↔DB (Prisma, Drizzle, Sequelize, GORM, Mongoose, None)
Stack yang user pilih di form **mengikat** isi TECH_STACK, ARCHITECTURE, DATABASE, API, DEPLOYMENT.

### API itu apa (di konteks blueprint)?
**API (Application Programming Interface)** = kontrak komunikasi client↔server, biasanya REST JSON.
Di **API.md** didokumentasikan: method, path, body request, response, auth JWT, kode error.
Bukan "API Key Minestack" (itu kredensial model AI di menu Keys) — bedakan:
- **API blueprint** = endpoint aplikasi yang sedang dirancang
- **API Key AI** = kunci koneksi ke engine generate (siaptuan.my.id / model combo1)

### Cara integrasi (panduan umum di web ini)
1. **Frontend ↔ Backend**: FE panggil base URL API + header \`Authorization: Bearer <JWT>\` + JSON body sesuai API.md
2. **Backend ↔ Database**: lewat ORM yang dipilih (Prisma/GORM/dll.) sesuai skema DATABASE.md
3. **Auth**: login → access token → setiap request protected endpoint
4. **Deploy**: FE ke Vercel/CDN; BE Docker/VPS; set env (DATABASE_URL, JWT_SECRET, CORS_ORIGIN) sesuai DEPLOYMENT.md
5. **Integrasi pihak ketiga** (payment, email, storage): sebutkan di PRD/Architecture; endpoint webhook/callback di API.md
Saat user tanya "cara integrasi X", jawab berdasar stack & dokumen proyek aktif; usulkan potongan alur atau update dokumen jika perlu.

### Fitur UI yang sering ditanya
- **Render**: tampilan markdown + diagram Mermaid
- **Markdown Mentah**: edit teks, Simpan / Copy
- **Diff**: bandingkan versi
- **Generate AI**: regenerate dokumen aktif (klik kanan = semua dokumen kosong)
- **Download ZIP**: unduh semua dokumen proyek
- **API Keys**: BASE URL, API KEY, MODEL untuk engine AI
- **Signals**: log request/response AI
- **Metrics**: token, latency, cost

### Cara bantu edit dokumen
Jika user minta tambah/ubah fitur di dokumen aktif:
1. Jelaskan singkat perubahan
2. Sediakan **seluruh** markdown terbaru di blok:
\`\`\`markdown
...isi penuh dokumen...
\`\`\`
3. User bisa klik **Terapkan Perubahan** di chat
Jangan potong dokumen; berikan versi lengkap yang valid.

## GAYA JAWABAN
- Mulai langsung ke inti; hindari basa-basi panjang
- Untuk "apa itu X" → definisi singkat + relevansi di Minestack + contoh dari proyek aktif bila ada
- Untuk "cara integrasi" → langkah berurutan + sebut dokumen mana yang diupdate
- Jangan mengarang fitur UI yang tidak ada di panduan di atas
`.trim();
  }

  function buildCopilotSystemPrompt() {
    const guide = getCopilotProductGuide();
    const project = STATE.currentProject;

    if (!project) {
      return `${guide}

## STATUS SESI
Belum ada proyek workspace aktif. Jawab hanya panduan produk Minestack AI Architect dan cara membuat blueprint.
Jika user minta edit dokumen proyek: arahkan buka/buat proyek dulu.`;
    }

    const versionKey = STATE.currentVersionKey || "v1";
    const docKey = STATE.currentDocKey || "PRD.md";
    const versionData = (project.versions && project.versions[versionKey]) || {};
    const activeDocContent = versionData[docKey] || "";
    // Batasi panjang agar prompt tidak meledak
    const maxDocChars = 12000;
    const docSlice = activeDocContent.length > maxDocChars
      ? activeDocContent.slice(0, maxDocChars) + "\n\n...[dokumen dipotong untuk konteks]..."
      : activeDocContent;

    const stackLine = [
      `Frontend: ${project.frontend || "-"}`,
      `Backend: ${project.backend || "-"}`,
      `Database: ${project.db || "-"}`,
      `ORM: ${project.orm || "-"}`
    ].join(" | ");

    const docList = Object.keys(versionData).join(", ") || "PRD.md, TECH_STACK.md, ARCHITECTURE.md, DATABASE.md, API.md, DEPLOYMENT.md";

    return `${guide}

## PROYEK AKTIF
- Nama: ${project.name}
- Kategori: ${project.category || "General"}
- Tech stack terpilih: ${stackLine}
- Ide user: ${(project.prompt || "").slice(0, 800)}
- Dokumen tersedia: ${docList}
- Dokumen yang sedang dibuka: **${docKey}**

## ISI DOKUMEN AKTIF (${docKey})
---
${docSlice || "(dokumen kosong / masih generating)"}
---

Jawab berdasarkan panduan produk + proyek + dokumen aktif di atas. Tolak topik di luar konteks.`;
  }

  async function handleCopilotChat() {
    const text = DOM.wsCopilotInput.value.trim();
    if (!text) return;

    // Append user message to log
    appendCopilotMessage("user", text);
    DOM.wsCopilotInput.value = "";

    // Show bot typing loader
    const loaderId = appendCopilotMessage("bot", "Menghubungi AI Copilot...");

    if (!STATE.currentProject) {
      const loaderEl = document.getElementById(loaderId);
      if (loaderEl) loaderEl.remove();
      appendCopilotMessage(
        "bot",
        "Belum ada proyek aktif di workspace. Buka proyek dari Dashboard, atau buat blueprint baru (pilih tech stack → **Buat Blueprint dengan AI**). Saya bisa bantu jelaskan tech stack, PRD, API, architecture, database, dan deployment setelah proyek terbuka.",
        true
      );
      return;
    }

    const systemPrompt = buildCopilotSystemPrompt();

    const startTime = Date.now();
    addLog("info", `Sending copilot message for project: "${STATE.currentProject.name}", active doc: "${STATE.currentDocKey}"`);

    try {
      const response = await performAiRequest(`${STATE.aiBaseUrl}/chat/completions`, {
        model: STATE.aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.25,
        max_tokens: 2500
      });

      const latency = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Remove loading message
      const loaderEl = document.getElementById(loaderId);
      if (loaderEl) loaderEl.remove();

      if (response.ok) {
        const data = await response.json();
        const replyText = data.choices?.[0]?.message?.content || "";
        const tokensUsed = data.usage?.total_tokens || replyText.length / 4;
        
        addLog("success", `Copilot reply received in ${latency}s. Tokens: ${Math.round(tokensUsed)}`);
        trackApiUsage(1, Math.round(tokensUsed), latency, true);

        // Render message with markdown formatting
        appendCopilotMessage("bot", replyText, true);

      } else {
        const errorText = await response.text();
        addLog("error", `Copilot API failed (HTTP ${response.status}): ${errorText}`);
        trackApiUsage(1, 0, latency, false);
        appendCopilotMessage("bot", `Gagal menghubungi AI Engine (HTTP ${response.status}). Hubungi dukungan atau periksa kembali konfigurasi API Key Anda.`);
      }
    } catch (e) {
      const loaderEl = document.getElementById(loaderId);
      if (loaderEl) loaderEl.remove();
      const latency = ((Date.now() - startTime) / 1000).toFixed(2);
      addLog("error", `Copilot network exception: ${e.message}`);
      trackApiUsage(1, 0, latency, false);
      appendCopilotMessage("bot", `Kesalahan jaringan: ${e.message}. Pastikan koneksi internet aktif.`);
    }
  }

  function appendCopilotMessage(sender, content, parseMarkdown = false) {
    const msgId = "copilot-msg-" + Date.now();
    const bubble = document.createElement("div");
    bubble.className = `copilot-msg ${sender === "user" ? "user-msg" : "bot-msg"}`;
    bubble.id = msgId;

    if (sender === "user") {
      bubble.textContent = content;
    } else {
      if (parseMarkdown && window.marked) {
        bubble.innerHTML = marked.parse(content);
        
        // Find if reply contains updated markdown
        const match = content.match(/```markdown\n([\s\S]*?)\n```/i);
        if (match && match[1]) {
          const codeBlockContent = match[1];
          const applyBtn = document.createElement("button");
          applyBtn.className = "btn-primary";
          applyBtn.style.marginTop = "10px";
          applyBtn.style.padding = "6px 12px";
          applyBtn.style.fontSize = "0.8rem";
          applyBtn.style.gap = "4px";
          applyBtn.innerHTML = `<i data-lucide="check-square" style="width: 14px; height: 14px; display: inline-block;"></i> Terapkan Perubahan`;
          
          applyBtn.addEventListener("click", () => {
            if (STATE.currentProject) {
              STATE.currentProject.versions[STATE.currentVersionKey][STATE.currentDocKey] = codeBlockContent;
              saveProjectsToStorage();
              updateWorkspaceDocumentView();
              addLog("info", `Copilot changes successfully applied to ${STATE.currentDocKey}`);
              alert(`Perubahan dari AI Copilot berhasil diaplikasikan ke ${STATE.currentDocKey}!`);
            }
          });
          bubble.appendChild(applyBtn);
          
          setTimeout(() => {
            if (window.lucide) lucide.createIcons();
          }, 50);
        }
      } else {
        bubble.textContent = content;
      }
    }

    DOM.wsCopilotMessages.appendChild(bubble);
    DOM.wsCopilotMessages.scrollTop = DOM.wsCopilotMessages.scrollHeight;
    
    return msgId;
  }

  /* ==========================================================================
     8. CREDENTIALS CONFIGURATION & CONNECTION CHECK
     ========================================================================== */
  function saveConfig() {
    // Secure (Vercel): only model preference is client-side; secrets stay in env
    if (STATE.secureMode) {
      STATE.aiModel = (DOM.cfgModel?.value || STATE.aiModel || "combo1").trim();
      STATE.aiBaseUrl = "/api/ai";
      STATE.aiApiKey = "";
      localStorage.setItem("dahono_ai_model", STATE.aiModel);
      localStorage.removeItem("dahono_ai_apikey");
      localStorage.setItem("dahono_ai_baseurl", "/api/ai");
      addLog("info", `Secure mode: model disimpan (${STATE.aiModel}). AI key & admin password di Vercel Env.`);
      alert(
        "Mode aman (Vercel):\n\n• Model preference disimpan di browser.\n• AI_API_KEY & ADMIN_PASSWORD hanya di Vercel Environment Variables — tidak disimpan di browser/GitHub."
      );
      return;
    }

    STATE.aiApiKey = (DOM.cfgApiKey?.value || "").trim();
    STATE.aiBaseUrl = (DOM.cfgBaseUrl?.value || "").trim();
    STATE.aiModel = (DOM.cfgModel?.value || "").trim();

    localStorage.setItem("dahono_ai_apikey", STATE.aiApiKey);
    localStorage.setItem("dahono_ai_baseurl", STATE.aiBaseUrl);
    localStorage.setItem("dahono_ai_model", STATE.aiModel);

    addLog("info", `Configuration saved. Model: ${STATE.aiModel}, Base URL: ${STATE.aiBaseUrl}`);
    alert("Konfigurasi API AI berhasil disimpan!");
  }

  async function testConnection() {
    let testModel = (DOM.cfgModel?.value || STATE.aiModel || "combo1").trim();

    if (!testModel) {
      DOM.connStatusBadge.className = "connection-badge status-disconnected";
      DOM.connStatusBadge.textContent = "Failed";
      addLog("error", "Model ID kosong. Contoh model yang valid: combo1");
      alert("Model ID kosong. Contoh model yang valid: combo1");
      return;
    }

    // Secure mode: test via /api/ai (server key)
    if (STATE.secureMode) {
      DOM.connStatusBadge.className = "connection-badge status-testing";
      DOM.connStatusBadge.textContent = "Testing...";
      addLog("info", `Testing secure /api/ai (model: ${testModel}) ...`);
      const startTime = Date.now();
      const prevModel = STATE.aiModel;
      STATE.aiModel = testModel;

      try {
        let response = await performAiRequest("/api/ai", {
          model: testModel,
          messages: [{ role: "user", content: "Reply with only: OK" }],
          max_tokens: 16,
          temperature: 0
        });
        let latency = ((Date.now() - startTime) / 1000).toFixed(2);

        if (response.ok) {
          DOM.connStatusBadge.className = "connection-badge status-connected";
          DOM.connStatusBadge.textContent = "Connected";
          addLog("success", `Secure /api/ai OK. Model: ${testModel}. Latency: ${latency}s`);
          trackApiUsage(1, 10, latency, true);
          return;
        }

        const text = await response.text();
        let detail = text;
        try {
          const j = JSON.parse(text);
          detail = j.message || j?.error?.message || text;
          if (j?.error?.code === "model_not_allowed" || /don't have access to model/i.test(detail)) {
            if (testModel !== "combo1") {
              addLog("info", `Model "${testModel}" ditolak. Fallback combo1...`);
              testModel = "combo1";
              STATE.aiModel = testModel;
              if (DOM.cfgModel) DOM.cfgModel.value = testModel;
              response = await performAiRequest("/api/ai", {
                model: testModel,
                messages: [{ role: "user", content: "Reply with only: OK" }],
                max_tokens: 16,
                temperature: 0
              });
              latency = ((Date.now() - startTime) / 1000).toFixed(2);
              if (response.ok) {
                DOM.connStatusBadge.className = "connection-badge status-connected";
                DOM.connStatusBadge.textContent = "Connected";
                addLog("success", `Secure AI OK setelah fallback combo1. Latency: ${latency}s`);
                trackApiUsage(1, 10, latency, true);
                alert("Model diganti ke combo1 — koneksi BERHASIL.");
                return;
              }
              detail = await response.text();
            }
          }
        } catch (_) { /* raw */ }

        STATE.aiModel = prevModel;
        DOM.connStatusBadge.className = "connection-badge status-disconnected";
        DOM.connStatusBadge.textContent = "Failed";
        addLog("error", `Secure AI gagal (HTTP ${response.status}): ${detail}`);
        trackApiUsage(1, 0, latency, false);
        alert(`Uji koneksi gagal.\n\n${detail}`);
      } catch (e) {
        STATE.aiModel = prevModel;
        const latency = ((Date.now() - startTime) / 1000).toFixed(2);
        DOM.connStatusBadge.className = "connection-badge status-disconnected";
        DOM.connStatusBadge.textContent = "Error";
        addLog("error", `Connection error: ${e.message}`);
        trackApiUsage(1, 0, latency, false);
        alert(`Uji koneksi error:\n\n${e.message}`);
      }
      return;
    }

    // Legacy local path (XAMPP + client key)
    const testBaseUrl = (DOM.cfgBaseUrl?.value || STATE.aiBaseUrl || "").trim().replace(/\/+$/, "");
    const testApiKey = (DOM.cfgApiKey?.value || STATE.aiApiKey || "").trim();

    if (!testBaseUrl) {
      DOM.connStatusBadge.className = "connection-badge status-disconnected";
      DOM.connStatusBadge.textContent = "Failed";
      addLog("error", "Base URL kosong. Isi Base URL terlebih dahulu.");
      alert("Base URL kosong. Isi Base URL terlebih dahulu.");
      return;
    }
    if (!testApiKey) {
      DOM.connStatusBadge.className = "connection-badge status-disconnected";
      DOM.connStatusBadge.textContent = "Failed";
      addLog("error", "API Key kosong. Isi API Key terlebih dahulu.");
      alert("API Key kosong. Isi API Key terlebih dahulu.");
      return;
    }

    if (!isPhpProxyAvailable()) {
      const openUrl = "http://localhost/PRD%20EDITOR/";
      const msg = `App dibuka lewat static server (${window.location.host}), bukan XAMPP.\n\nproxy.php tidak bisa dieksekusi, dan API menolak CORS dari browser.\n\nBuka lewat Apache/XAMPP:\n${openUrl}\n\nAtau deploy Vercel + vercel dev untuk /api/ai.`;
      DOM.connStatusBadge.className = "connection-badge status-disconnected";
      DOM.connStatusBadge.textContent = "Failed";
      addLog("error", msg.replace(/\n+/g, " "));
      alert(msg);
      return;
    }

    const prevKey = STATE.aiApiKey;
    const prevBase = STATE.aiBaseUrl;
    const prevModel = STATE.aiModel;
    STATE.aiApiKey = testApiKey;
    STATE.aiBaseUrl = testBaseUrl;
    STATE.aiModel = testModel;

    DOM.connStatusBadge.className = "connection-badge status-testing";
    DOM.connStatusBadge.textContent = "Testing...";
    addLog("info", `Testing connection to ${testBaseUrl}/chat/completions (model: ${testModel}) ...`);

    const startTime = Date.now();

    const parseFailureDetail = (status, text, modelName) => {
      let detail = (text || "").trim();
      let friendly = `HTTP ${status}`;
      let modelDenied = false;

      if (!detail) {
        detail = `Server mengembalikan respons kosong (HTTP ${status}). Pastikan dibuka lewat XAMPP: http://localhost/PRD%20EDITOR/`;
        return { detail, friendly, modelDenied };
      }
      if (looksLikePhpSource(detail)) {
        detail = "proxy.php tidak dieksekusi (file PHP dibaca sebagai teks). Jalankan app lewat XAMPP Apache, bukan Live Server.";
        friendly = "Proxy nonaktif";
        return { detail, friendly, modelDenied };
      }

      try {
        const errJson = JSON.parse(detail);
        const msg = errJson?.error?.message || errJson?.message || detail;
        const code = errJson?.error?.code || errJson?.error?.type || "";
        detail = msg;
        if (code === "model_not_allowed" || /don't have access to model/i.test(msg)) {
          modelDenied = true;
          friendly = "Model ditolak";
          detail = `Model "${modelName}" tidak diizinkan pada API key ini. Gunakan model yang tersedia, contoh: combo1`;
        } else if (code === "invalid_api_key" || /invalid api key/i.test(msg)) {
          friendly = "API Key invalid";
          detail = "API Key tidak valid. Periksa kembali kunci yang dimasukkan.";
        } else if (status === 403) {
          friendly = "Akses ditolak";
        } else if (status === 401) {
          friendly = "Unauthorized";
        }
      } catch (_) { /* raw text */ }

      return { detail, friendly, modelDenied };
    };

    try {
      let response = await performAiRequest(`${testBaseUrl}/chat/completions`, {
        model: testModel,
        messages: [{ role: "user", content: "Reply with only: OK" }],
        max_tokens: 16,
        temperature: 0
      });

      let latency = ((Date.now() - startTime) / 1000).toFixed(2);

      if (response.ok) {
        DOM.connStatusBadge.className = "connection-badge status-connected";
        DOM.connStatusBadge.textContent = "Connected";
        addLog("success", `Koneksi berhasil! Model: ${testModel}. HTTP 200. Latency: ${latency}s`);
        trackApiUsage(1, 10, latency, true);
        return;
      }

      const text = await response.text();
      let { detail, friendly, modelDenied } = parseFailureDetail(response.status, text, testModel);

      if (modelDenied && testModel !== "combo1") {
        addLog("info", `Model "${testModel}" ditolak. Mencoba ulang dengan model fallback: combo1 ...`);
        testModel = "combo1";
        STATE.aiModel = testModel;
        if (DOM.cfgModel) DOM.cfgModel.value = testModel;

        response = await performAiRequest(`${testBaseUrl}/chat/completions`, {
          model: testModel,
          messages: [{ role: "user", content: "Reply with only: OK" }],
          max_tokens: 16,
          temperature: 0
        });
        latency = ((Date.now() - startTime) / 1000).toFixed(2);

        if (response.ok) {
          DOM.connStatusBadge.className = "connection-badge status-connected";
          DOM.connStatusBadge.textContent = "Connected";
          addLog("success", `Koneksi berhasil setelah fallback model ke combo1. Latency: ${latency}s`);
          trackApiUsage(1, 10, latency, true);
          alert("Model sebelumnya ditolak API.\n\nOtomatis diganti ke combo1 dan koneksi BERHASIL.\nKlik Simpan Konfigurasi untuk menyimpan.");
          return;
        }

        const retryText = await response.text();
        ({ detail, friendly } = parseFailureDetail(response.status, retryText, testModel));
      }

      STATE.aiApiKey = prevKey;
      STATE.aiBaseUrl = prevBase;
      STATE.aiModel = prevModel;

      DOM.connStatusBadge.className = "connection-badge status-disconnected";
      DOM.connStatusBadge.textContent = "Failed";
      addLog("error", `Koneksi gagal (${friendly}): ${detail}`);
      trackApiUsage(1, 0, latency, false);
      alert(`Uji koneksi gagal.\n\n${detail}`);
    } catch (e) {
      STATE.aiApiKey = prevKey;
      STATE.aiBaseUrl = prevBase;
      STATE.aiModel = prevModel;

      const latency = ((Date.now() - startTime) / 1000).toFixed(2);
      DOM.connStatusBadge.className = "connection-badge status-disconnected";
      DOM.connStatusBadge.textContent = "Error";
      addLog("error", `Connection error: ${e.message}`);
      trackApiUsage(1, 0, latency, false);
      alert(`Uji koneksi error:\n\n${e.message}`);
    }
  }

  /* ==========================================================================
     9. METRICS & LOG MONITOR STATE
     ========================================================================== */
  function addLog(type, message) {
    const timeStr = new Date().toLocaleTimeString();
    const logData = { time: timeStr, type, message };
    STATE.metricsLogs.unshift(logData);
    if (STATE.metricsLogs.length > 50) STATE.metricsLogs.pop();
    try {
      localStorage.setItem("dahono_metrics_logs", JSON.stringify(STATE.metricsLogs));
    } catch (e) { /* ignore quota */ }

    if (DOM.consoleLogsBody) {
      const logRow = document.createElement("div");
      logRow.className = `log-row ${type}`;
      logRow.textContent = `[${timeStr}] ${message}`;
      DOM.consoleLogsBody.appendChild(logRow);
      DOM.consoleLogsBody.scrollTop = DOM.consoleLogsBody.scrollHeight;
    }
  }

  function initLogsConsole() {
    if (STATE.metricsLogs.length > 0 && DOM.consoleLogsBody) {
      DOM.consoleLogsBody.innerHTML = "";
      STATE.metricsLogs.slice().reverse().forEach(log => {
        const logRow = document.createElement("div");
        logRow.className = `log-row ${log.type}`;
        logRow.textContent = `[${log.time}] ${log.message}`;
        DOM.consoleLogsBody.appendChild(logRow);
      });
      DOM.consoleLogsBody.scrollTop = DOM.consoleLogsBody.scrollHeight;
    }
  }

  function trackApiUsage(requests, tokens, latency, success) {
    STATE.statTotalRequests += requests;
    STATE.statTotalTokens += tokens;
    
    const estimatedCost = (tokens / 1000) * 0.002;
    STATE.statTotalCost += estimatedCost;
    
    if (STATE.statAvgLatency === 0) {
      STATE.statAvgLatency = parseFloat(latency);
    } else {
      STATE.statAvgLatency = parseFloat(((STATE.statAvgLatency * 0.8) + (parseFloat(latency) * 0.2)).toFixed(2));
    }
    
    localStorage.setItem("dahono_stat_total_requests", STATE.statTotalRequests);
    localStorage.setItem("dahono_stat_total_tokens", STATE.statTotalTokens);
    localStorage.setItem("dahono_stat_total_cost", STATE.statTotalCost.toFixed(5));
    localStorage.setItem("dahono_stat_avg_latency", STATE.statAvgLatency);
    
    updateMetricsUI(success ? "Success" : "Failed", tokens, latency);
  }

  function updateMetricsUI(activityType = "AI Generation", tokens = 0, latency = 0) {
    if (DOM.statTotalRequests) DOM.statTotalRequests.textContent = STATE.statTotalRequests;
    if (DOM.statTotalTokens) DOM.statTotalTokens.textContent = STATE.statTotalTokens.toLocaleString();
    if (DOM.statTotalCost) DOM.statTotalCost.textContent = `$${STATE.statTotalCost.toFixed(4)}`;
    if (DOM.statAvgLatency) DOM.statAvgLatency.textContent = `${STATE.statAvgLatency}s`;
    
    if (tokens > 0 && DOM.metricsTableBody) {
      const nowStr = new Date().toLocaleTimeString();
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid var(--border-color)";
      row.style.color = "var(--text-muted)";
      row.style.fontSize = "0.88rem";
      
      row.innerHTML = `
        <td style="padding: 12px;">${nowStr}</td>
        <td style="padding: 12px;">${activityType}</td>
        <td style="padding: 12px;"><code>${STATE.aiModel}</code></td>
        <td style="padding: 12px;">${tokens}</td>
        <td style="padding: 12px;">${latency}s</td>
        <td style="padding: 12px;">
          <span class="connection-badge ${activityType === "Failed" ? "status-disconnected" : "status-connected"}" style="padding: 2px 8px; font-size: 0.7rem;">
            ${activityType === "Failed" ? "FAIL" : "OK"}
          </span>
        </td>
      `;
      
      if (DOM.metricsTableBody.children.length === 1 && DOM.metricsTableBody.children[0].cells.length === 1) {
        DOM.metricsTableBody.innerHTML = "";
      }
      
      DOM.metricsTableBody.insertBefore(row, DOM.metricsTableBody.firstChild);
    }
  }

  /* ==========================================================================
     10. EVENT BINDINGS
     ========================================================================== */
  function onClick(el, handler) {
    if (!el) return;
    el.addEventListener("click", handler);
  }

  function openNewProjectModal() {
    const modal = DOM.modalNewProject || document.getElementById("modalNewProject");
    if (!modal) {
      alert("Modal proyek tidak ditemukan. Muat ulang halaman.");
      return;
    }
    // Reset to form view before open
    if (DOM.modalFormBody) DOM.modalFormBody.style.display = "block";
    if (DOM.modalConsultBody) DOM.modalConsultBody.style.display = "none";
    if (DOM.modalProgressBody) DOM.modalProgressBody.style.display = "none";
    if (DOM.modalGenerateBtn) {
      DOM.modalGenerateBtn.disabled = false;
      DOM.modalGenerateBtn.style.opacity = "1";
    }
    modal.classList.add("active");
    if (window.lucide) lucide.createIcons();
    const nameEl = DOM.inputProjName || document.getElementById("inputProjName");
    if (nameEl) setTimeout(() => nameEl.focus(), 50);
  }

  function bindEvents() {
    try {
      // Global delegation listener for Dashboard & Google Auth navigation safety net
      document.addEventListener("click", (e) => {
        const googleTrigger = e.target.closest("#btnGoogleLogin, #btnGoogleRegister, .btn-google-auth");
        if (googleTrigger) {
          e.preventDefault();
          e.stopPropagation();
          handleGoogleAuth(e);
          return;
        }
        const dashTrigger = e.target.closest("#heroViewDashboardBtn, #hdrDashboardBtn, #sbDashBtn, #wsBackToDashBtn");
        if (dashTrigger) {
          e.preventDefault();
          switchView("dashboard");
          return;
        }
        const startTrigger = e.target.closest("#heroStartBtn, #dashNewProjectBtn");
        if (startTrigger) {
          e.preventDefault();
          openNewProjectModal();
          return;
        }
      });

      // Navigation Routing
      onClick(DOM.navBrandBtn, () => switchView("landing"));
      onClick(DOM.navLinkArchitect, () => switchView("landing"));
      onClick(DOM.navLinkTier, () => switchView("billing"));
      onClick(DOM.navLinkDocs, () => switchView("support"));
      onClick(DOM.navLinkCatalog, () => switchView("integrations"));
      onClick(DOM.navLinkBlog, () => switchView("signals"));
      onClick(DOM.hdrDashboardBtn, () => switchView("dashboard"));
      onClick(DOM.heroStartBtn, openNewProjectModal);
      onClick(DOM.heroViewDashboardBtn, () => switchView("dashboard"));

      // Sidebar View Routing
      onClick(DOM.sbDashBtn, () => switchView("dashboard"));
      onClick(DOM.sbArchitectBtn, () => {
        if (STATE.currentProject) {
          switchView("workspace");
          openProjectWorkspace(STATE.currentProject.id);
        } else {
          switchView("landing");
        }
      });
      onClick(DOM.sbSignalsBtn, () => switchView("signals"));
      onClick(DOM.sbKeysBtn, () => switchView("keys"));
      onClick(DOM.sbMetricsBtn, () => {
        switchView("metrics");
        updateMetricsUI();
      });
      onClick(DOM.sbZapBtn, () => switchView("integrations"));
      onClick(DOM.sbBillingBtn, () => switchView("billing"));
      onClick(DOM.sbSupportBtn, () => switchView("support"));

      // Dashboard Actions
      onClick(DOM.dashNewProjectBtn, openNewProjectModal);

      // Workspace Actions
      onClick(DOM.wsBackToDashBtn, () => switchView("dashboard"));
      onClick(DOM.wsDownloadZipBtn, exportProjectZip);
      if (DOM.wsRegenerateDocBtn) {
        DOM.wsRegenerateDocBtn.addEventListener("click", () => {
          if (!STATE.currentProject) {
            alert("Buka proyek terlebih dahulu.");
            return;
          }
          const projectId = STATE.currentProject.id;
          const docKey = STATE.currentDocKey;
          const choice = confirm(
            `Generate ulang dokumen aktif "${docKey}" dengan AI?\n\nOK = dokumen aktif saja\nCancel = batalkan\n\nTip: untuk generate SEMUA dokumen kosong, buka dokumen kosong lalu klik "Generate Semua Dokumen Kosong".`
          );
          if (!choice) return;
          showDocumentGeneratingState(docKey);
          triggerDocumentGeneration(projectId, docKey, true).catch(err => {
            addLog("error", `Regenerate ${docKey} gagal: ${err.message || err}`);
          });
        });

        // Right-click = generate all empty docs
        DOM.wsRegenerateDocBtn.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          if (!STATE.currentProject) return;
          const ok = confirm(`Generate SEMUA dokumen kosong/pending untuk proyek "${STATE.currentProject.name}" dengan AI?`);
          if (!ok) return;
          showDocumentGeneratingState(STATE.currentDocKey);
          prefetchProjectDocuments(STATE.currentProject.id, true).catch(err => {
            addLog("error", `Regenerate all gagal: ${err.message || err}`);
          });
        });
      }

      // View Mode Switcher
      onClick(DOM.vmBtnRender, () => {
        STATE.currentViewMode = "render";
        updateWorkspaceDocumentView();
      });
      onClick(DOM.vmBtnRaw, () => {
        STATE.currentViewMode = "raw";
        updateWorkspaceDocumentView();
      });
      onClick(DOM.vmBtnDiff, () => {
        STATE.currentViewMode = "diff";
        updateWorkspaceDocumentView();
      });

      // Save & Copy Raw Markdown
      onClick(DOM.rawCopyBtn, () => {
        if (!DOM.rawMarkdownEditor) return;
        navigator.clipboard.writeText(DOM.rawMarkdownEditor.value).then(() => {
          alert("Dokumen Markdown berhasil disalin ke clipboard!");
        });
      });
      onClick(DOM.rawSaveBtn, () => {
        if (STATE.currentProject && STATE.currentProject.versions[STATE.currentVersionKey] && DOM.rawMarkdownEditor) {
          STATE.currentProject.versions[STATE.currentVersionKey][STATE.currentDocKey] = DOM.rawMarkdownEditor.value;
          saveProjectsToStorage();
          alert("Perubahan dokumen berhasil disimpan!");
        }
      });

      // Modal Actions
      const resetModalViews = () => {
        STATE.isConsulting = false;
        const modal = DOM.modalNewProject || document.getElementById("modalNewProject");
        if (modal) modal.classList.remove("active");
        if (DOM.modalFormBody) DOM.modalFormBody.style.display = "block";
        if (DOM.modalConsultBody) DOM.modalConsultBody.style.display = "none";
        if (DOM.modalProgressBody) DOM.modalProgressBody.style.display = "none";
        if (DOM.modalGenerateBtn) {
          DOM.modalGenerateBtn.disabled = false;
          DOM.modalGenerateBtn.style.opacity = "1";
        }
      };
      onClick(DOM.modalCloseBtn, resetModalViews);
      onClick(DOM.modalCancelBtn, resetModalViews);

      // Buat Blueprint: pilih stack → AI engine detail 6 dokumen
      // Bind both DOM ref and live query so click never silently fails
      const genBtn = DOM.modalGenerateBtn || document.getElementById("modalGenerateBtn");
      if (genBtn && !genBtn.dataset.boundCreate) {
        genBtn.dataset.boundCreate = "1";
        genBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCreateLocalBlueprint();
        });
      }

      // Consultation step handlers (hidden step; keep for safety if UI re-enabled)
      if (DOM.modalConsultBackBtn) {
        DOM.modalConsultBackBtn.addEventListener("click", () => {
          if (DOM.modalConsultBody) DOM.modalConsultBody.style.display = "none";
          if (DOM.modalFormBody) DOM.modalFormBody.style.display = "block";
        });
      }
      if (DOM.modalConsultSkipBtn) {
        DOM.modalConsultSkipBtn.addEventListener("click", handleFinalGenerateBlueprint);
      }
      if (DOM.modalConsultSubmitBtn) {
        DOM.modalConsultSubmitBtn.addEventListener("click", handleFinalGenerateBlueprint);
      }

      // AI Settings Page
      onClick(DOM.btnSaveConfig, saveConfig);
      onClick(DOM.btnTestConnection, testConnection);
      if (DOM.toggleApiKeyVisible && DOM.cfgApiKey) {
        DOM.toggleApiKeyVisible.addEventListener("click", () => {
          const type = DOM.cfgApiKey.type === "password" ? "text" : "password";
          DOM.cfgApiKey.type = type;
          if (type === "text") {
            DOM.toggleApiKeyVisible.innerHTML = `<i data-lucide="eye-off" style="width: 18px; height: 18px;"></i>`;
          } else {
            DOM.toggleApiKeyVisible.innerHTML = `<i data-lucide="eye" style="width: 18px; height: 18px;"></i>`;
          }
          if (window.lucide) lucide.createIcons();
        });
      }

      // Signals Page Actions
      onClick(DOM.btnClearLogs, () => {
        if (DOM.consoleLogsBody) {
          DOM.consoleLogsBody.innerHTML = `<div class="log-row info">[SYSTEM] Console logs cleared.</div>`;
        }
        STATE.metricsLogs = [];
        localStorage.setItem("dahono_metrics_logs", JSON.stringify(STATE.metricsLogs));
      });

      // Copilot Sidebar UI toggles
      onClick(DOM.wsToggleCopilotBtn, () => {
        if (!DOM.wsCopilotSidebar) return;
        const isVisible = DOM.wsCopilotSidebar.style.display !== "none";
        DOM.wsCopilotSidebar.style.display = isVisible ? "none" : "flex";
        if (!isVisible && DOM.wsCopilotInput) DOM.wsCopilotInput.focus();
      });
      onClick(DOM.wsCopilotCloseBtn, () => {
        if (DOM.wsCopilotSidebar) DOM.wsCopilotSidebar.style.display = "none";
      });
      onClick(DOM.wsCopilotSendBtn, handleCopilotChat);
      if (DOM.wsCopilotInput) {
        DOM.wsCopilotInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleCopilotChat();
          }
        });
      }

      // Floating AI chat bubble trigger
      onClick(DOM.floatingCsWidget, () => {
        if (STATE.activeView !== "workspace") {
          if (Array.isArray(STATE.projects) && STATE.projects.length > 0) {
            openProjectWorkspace(STATE.projects[0].id);
          } else {
            alert("Silakan buat proyek baru atau buka proyek terlebih dahulu untuk memulai sesi chat Copilot.");
            return;
          }
        }
        if (!DOM.wsCopilotSidebar) return;
        const isVisible = DOM.wsCopilotSidebar.style.display !== "none";
        DOM.wsCopilotSidebar.style.display = isVisible ? "none" : "flex";
        if (!isVisible && DOM.wsCopilotInput) DOM.wsCopilotInput.focus();
      });

      // Integration Switches simulated events
      [DOM.syncGithubCheck, DOM.syncVercelCheck, DOM.syncSlackCheck].forEach(chk => {
        if (chk) {
          chk.addEventListener("change", (e) => {
            const label = e.target.id.replace("Check", "").replace("sync", "");
            addLog("info", `Integration changed: ${label} status set to ${e.target.checked}`);
            alert(`Integrasi ${label} berhasil ${e.target.checked ? 'diaktifkan' : 'dinonaktifkan'}!`);
          });
        }
      });
    } catch (err) {
      console.error("bindEvents failed", err);
      // Last-resort: still wire create-blueprint button
      const genBtn = document.getElementById("modalGenerateBtn");
      if (genBtn && !genBtn.dataset.boundCreate) {
        genBtn.dataset.boundCreate = "1";
        genBtn.addEventListener("click", (e) => {
          e.preventDefault();
          handleCreateLocalBlueprint();
        });
      }
    }
  }

  // Helper Utility
  function escapeHtml(text) {
    if (!text) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initialize App on DOM Ready
  document.addEventListener("DOMContentLoaded", initApp);
})();

