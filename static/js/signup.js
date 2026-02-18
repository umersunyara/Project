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
   Strong password checker
========================== */
function isStrongPassword(password) {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 digit
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return strongRegex.test(password);
}

const passwordInput = document.getElementById("password");

if (passwordInput) {
  passwordInput.addEventListener("input", function () {
    const value = passwordInput.value;

    const ruleLength = document.getElementById("rule-length");
    const ruleUpper = document.getElementById("rule-upper");
    const ruleLower = document.getElementById("rule-lower");
    const ruleNumber = document.getElementById("rule-number");

    if (ruleLength) ruleLength.style.color = value.length >= 8 ? "green" : "red";
    if (ruleUpper) ruleUpper.style.color = /[A-Z]/.test(value) ? "green" : "red";
    if (ruleLower) ruleLower.style.color = /[a-z]/.test(value) ? "green" : "red";
    if (ruleNumber) ruleNumber.style.color = /\d/.test(value) ? "green" : "red";
  });
}

/* =========================
   Form submit — REAL BACKEND
========================== */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName")?.value.trim();
    const lastName = document.getElementById("lastName")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirmPassword = document.getElementById("confirmPassword")?.value;

    if (!firstName || !lastName || !email) {
      alert("Please fill in first name, last name and email.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (!isStrongPassword(password)) {
      alert(
        "Password must be at least 8 characters long and include:\n" +
        "• Uppercase letter\n" +
        "• Lowercase letter\n" +
        "• Number"
      );
      return;
    }

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
      const response = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: firstName,
          lastname: lastName,
          email: email,
          password: password,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (err) {
        console.error("Response is not valid JSON", err);
      }

      if (!response.ok) {
        const msg = (data && (data.detail || data.message)) || "Signup failed (server error).";
        alert(msg);
        return;
      }

      if (!data || !data.ok) {
        alert((data && data.message) || "Signup failed.");
        return;
      }

      alert("Account created successfully ✅");

      signupForm.reset();

      ["rule-length", "rule-upper", "rule-lower", "rule-number"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.color = "red";
      });

      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}
