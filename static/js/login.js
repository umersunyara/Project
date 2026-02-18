/* =========================
   Mobile menu
========================== */
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
   Password toggle icons
========================== */
document.querySelectorAll(".toggle-password").forEach((icon) => {
  icon.addEventListener("click", function () {
    const input = document.getElementById(this.dataset.target);
    if (!input) return;

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";

    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });
});

/* =========================
   Simple email validator
========================== */
function validEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/* =========================
   Form submit — REAL BACKEND
========================== */
(function () {
  const form = document.getElementById("signinForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const emailError = document.getElementById("emailError");
  const rememberCheckbox = document.getElementById("remember");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let ok = true;

    if (!validEmail(email)) {
      emailError.style.display = "block";
      ok = false;
    } else {
      emailError.style.display = "none";
    }

    if (!password) {
      if (ok) passwordInput.focus();
      ok = false;
    }

    if (!ok) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // Handle non-2xx
      if (!response.ok) {
        let msg = "Server error while logging in.";
        try {
          const data = await response.json();
          msg = data.detail || data.message || msg;
        } catch {
          const text = await response.text();
          if (text) msg = text;
        }
        alert(msg);
        return;
      }

      // Parse JSON
      let data = {};
      try {
        data = await response.json();
      } catch {
        alert("Login succeeded, but response was not JSON.");
        return;
      }

      if (!data.ok) {
        alert(data.message || "Invalid email or password.");
        return;
      }

      // Store user id
      if (data.user_id) {
        localStorage.setItem("user_id", data.user_id);
        console.log("Logged in user_id:", data.user_id);
      }

      // Optional remember me
      if (rememberCheckbox && rememberCheckbox.checked) {
        // localStorage.setItem("userEmail", email);
      }

      alert("Login successful ✅");
      window.location.href = "/database-connection";
    } catch (err) {
      console.error(err);
      alert("Network error. Try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
})();
