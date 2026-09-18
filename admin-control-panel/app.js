const API_BASE = "https://api-mechmania.duckdns.org";
const TOKEN_KEY = "admin_token";

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authRequest(url, options = {}) {
  const token = getToken();
  if (!token) {
    // No token at all → send them to login
    window.location.href = "index.html";
    return;
  }

  const resp = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: "Bearer " + token,
    },
  });

  if (resp.status === 401) {
    // Token is invalid/expired → clear and show access denied page
    clearToken();
    window.location.href = "not-authorized.html";
    return;
  }

  return resp;
}


// ---- Login Page ----
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorDiv = document.getElementById("errorMessage");
    const successDiv = document.getElementById("successMessage");

    errorDiv.style.display = "none";
    successDiv.style.display = "none";

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setToken(data.token);
        successDiv.textContent = "Login successful! Redirecting...";
        successDiv.style.display = "block";
        setTimeout(() => (window.location.href = "admin.html"), 1000);
      } else {
        errorDiv.textContent = data.message || "Login failed. Please check credentials.";
        errorDiv.style.display = "block";
      }
    } catch (err) {
      errorDiv.textContent = "Error connecting to server.";
      errorDiv.style.display = "block";
    }
  });
}

// ---- Admin Page ----
const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearToken();
    window.location.href = "index.html";
  });
}

async function loadConfig() {
  try {
    const resp = await authRequest(`${API_BASE}/tourney/config`);
    const data = await resp.json();
    document.getElementById("currentConfig").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    console.error("Failed to load config:", err);
  }
}

const refreshBtn = document.getElementById("btnRefresh");
if (refreshBtn) {
  refreshBtn.addEventListener("click", loadConfig);
  // Run once on page load
  loadConfig();
}

// ---- Update Config ----
const updateBtn = document.getElementById("btnUpdate");
if (updateBtn) {
  updateBtn.addEventListener("click", async () => {
    const autoRun = document.getElementById("autoRun").value === "true";
    const interval = document.getElementById("interval").value;
    const tourneyType = document.getElementById("updateTourneyType")?.value;
    const rounds = document.getElementById("updateRounds")?.value;

    const payload = {};
    payload.auto_run = autoRun;
    if (autoRun && interval) payload.auto_run_interval = interval;

    if (tourneyType === "RoundRobin") {
      payload.type = { type: "RoundRobin" };
    } else if (tourneyType === "Rounds" && rounds) {
      payload.type = { type: "Rounds", rounds: parseInt(rounds, 10) };
    }

    try {
      const resp = await authRequest(`${API_BASE}/admin/configure-tourney`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      alert("Config updated: " + JSON.stringify(data));
    } catch (err) {
      alert("Failed to update config");
    }
  });
}

// ---- Run Tournament ----
const runBtn = document.getElementById("btnRun");
if (runBtn) {
  runBtn.addEventListener("click", async () => {
    const beforeTime = document.getElementById("beforeTime").value;
    const tourneyType = document.getElementById("tourneyType").value;
    const rounds = document.getElementById("rounds").value;

    const url = beforeTime
      ? `${API_BASE}/admin/run-tourney?before=${encodeURIComponent(beforeTime)}`
      : `${API_BASE}/admin/run-tourney`;

    const payload = {};
    if (tourneyType === "RoundRobin") {
      payload.type = { type: "RoundRobin" };
    } else if (tourneyType === "Rounds" && rounds) {
      payload.type = { type: "Rounds", rounds: parseInt(rounds, 10) };
    }

    try {
      const resp = await authRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      document.getElementById("runResult").textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      alert("Failed to run tournament");
    }
  });
}
