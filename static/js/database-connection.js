/* =========================
   Mobile menu
========================= */
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobile-menu");

if (hamburger && mobileMenu) {
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
    hamburger.setAttribute(
      "aria-expanded",
      mobileMenu.classList.contains("open")
    );
  });

  document.addEventListener("click", (e) => {
    if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
      mobileMenu.classList.remove("open");
    }
  });
}

/* =========================
   Password toggle
========================= */
document.querySelectorAll(".toggle-password").forEach((icon) => {
  icon.addEventListener("click", function () {
    const input = document.getElementById(this.dataset.target);
    if (!input) return;

    input.type = input.type === "password" ? "text" : "password";
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });
});

/* =========================
   Validation helpers
========================= */
function setFieldError(fieldId, errorId, hasError, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);

  if (!field) return !hasError;

  if (hasError) {
    field.classList.add("invalid");
    if (errorEl) {
      errorEl.style.display = "block";
      if (message) errorEl.textContent = message;
    }
  } else {
    field.classList.remove("invalid");
    if (errorEl) errorEl.style.display = "none";
  }
  return !hasError;
}

function validateForm() {
  let ok = true;

  const dbType = document.getElementById("dbType").value.trim();
  const host = document.getElementById("host").value.trim();
  const port = document.getElementById("port").value.trim();
  const dbName = document.getElementById("dbName").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  ok = setFieldError("dbType", "dbTypeError", dbType === "", "Please select a database type.") && ok;

  const hostRegex = /^(localhost|(\d{1,3}\.){3}\d{1,3}|(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}))$/;
  const invalidHost = host === "" || !hostRegex.test(host);
  ok = setFieldError("host", "hostError", invalidHost, "Please enter a valid host (localhost, IP, or domain).") && ok;

  const portNum = Number(port);
  const invalidPort = !port || Number.isNaN(portNum) || portNum < 1 || portNum > 65535;
  ok = setFieldError("port", "portError", invalidPort, "Port must be a number between 1 and 65535.") && ok;

  ok = setFieldError("dbName", "dbNameError", dbName === "", "Database name is required.") && ok;

  ok = setFieldError("username", "usernameError", username === "", "Username is required.") && ok;

  ok = setFieldError("password", "passwordError", password.trim() === "", "Password is required.") && ok;

  if (!ok) {
    const firstInvalid = document.querySelector(".form-control.invalid");
    if (firstInvalid) firstInvalid.focus();
  }

  return ok;
}

/* =========================
   Cache elements
========================= */
const form = document.getElementById("dbForm");
const testBtn = document.getElementById("testConnection");
const saveBtn = document.getElementById("saveConnection");

const dbTypeEl = document.getElementById("dbType");
const hostEl = document.getElementById("host");
const portEl = document.getElementById("port");
const dbNameEl = document.getElementById("dbName");
const usernameEl = document.getElementById("username");
const passwordEl = document.getElementById("password");

/* =========================
   Track test passed
========================= */
let connectionTestPassed = false;

/* =========================
   Test Connection (REAL)
========================= */
if (testBtn && form) {
  testBtn.addEventListener("click", async () => {
    if (!validateForm()) {
      alert("Please fill in all fields first.");
      return;
    }

    testBtn.disabled = true;
    saveBtn.disabled = true;
    const originalText = testBtn.textContent;
    testBtn.textContent = "Testing...";

    const payload = {
      db_type: dbTypeEl.value.trim(),
      host: hostEl.value.trim(),
      port: Number(portEl.value),
      db_name: dbNameEl.value.trim(),
      username: usernameEl.value.trim(),
      password: passwordEl.value
    };

    try {
      const res = await fetch("/test-database-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.ok) {
        connectionTestPassed = true;
        testBtn.textContent = "✓ Test Passed";
        testBtn.classList.add("test-passed");
        saveBtn.disabled = false;
        alert("✅ " + data.message);
      } else {
        connectionTestPassed = false;
        testBtn.textContent = "Test Failed";
        alert("❌ " + data.message);
      }

    } catch (err) {
      connectionTestPassed = false;
      alert("❌ Network error: " + err.message);
    } finally {
      testBtn.disabled = false;

      if (!connectionTestPassed) {
        saveBtn.disabled = false;
        testBtn.textContent = originalText;
      }
    }
  });
}

/* =========================
   Save Connection (requires test)
========================= */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!connectionTestPassed) {
      alert("❌ Please first test the connection and ensure it passes before saving.");
      return;
    }

    if (!validateForm()) {
      alert("Please fix the highlighted fields before saving.");
      return;
    }

    const payload = {
      db_type: dbTypeEl.value.trim(),
      host: hostEl.value.trim(),
      port: Number(portEl.value),
      db_name: dbNameEl.value.trim(),
      username: usernameEl.value.trim(),
      password: passwordEl.value
    };

    saveBtn.disabled = true;
    testBtn.disabled = true;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saving...";

    try {
      const res = await fetch("/database-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.message || "Failed to save");
      }

      alert("✅ Database connection saved successfully!");
      form.reset();

      connectionTestPassed = false;
      testBtn.textContent = "Test Connection";
      testBtn.classList.remove("test-passed");

    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      saveBtn.disabled = false;
      testBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  });
}
