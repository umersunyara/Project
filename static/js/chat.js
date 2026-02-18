// Elements
const dbSelect = document.getElementById("dbSelect");
const dbSelectBtn = document.getElementById("dbSelectBtn");
const dbSelectMenu = document.getElementById("dbSelectMenu");
const dbSelectLabel = document.getElementById("dbSelectLabel");

const addDbBtn = document.getElementById("addDbBtn");

const emptyState = document.getElementById("emptyState");
const messages = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// State
let selectedDb = null;

// Toggle dropdown
function toggleDropdown(open) {
  const willOpen = (typeof open === "boolean") ? open : !dbSelect.classList.contains("open");
  dbSelect.classList.toggle("open", willOpen);
  dbSelectBtn.setAttribute("aria-expanded", String(willOpen));
}

// Open/close
dbSelectBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleDropdown();
});

// Close dropdown on outside click
document.addEventListener("click", () => toggleDropdown(false));

// Prevent menu click from closing immediately
dbSelectMenu.addEventListener("click", (e) => e.stopPropagation());

// Select database
dbSelectMenu.querySelectorAll(".db-item").forEach((item) => {
  item.addEventListener("click", () => {
    selectedDb = item.dataset.value;
    dbSelectLabel.textContent = item.textContent.trim();
    toggleDropdown(false);

    // Enable chat UI
    emptyState.style.display = "none";
    messages.style.display = "block";
    chatInput.disabled = false;
    chatInput.placeholder = "Ask a question about your database...";
    sendBtn.disabled = false;

    // (Optional) store selection
    localStorage.setItem("selected_db", selectedDb);
  });
});

// Add DB button action (change route if needed)
addDbBtn.addEventListener("click", () => {
  // Example: go to your DB connection page
  window.location.href = "/database-connection";
});

// Demo send (replace with your real /api/query endpoint)
function appendMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `msg msg-${role}`;
  wrap.textContent = text;
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  if (!selectedDb) {
    alert("Please select a database first.");
    return;
  }

  appendMessage("user", text);
  chatInput.value = "";

  // Demo assistant response
  setTimeout(() => {
    appendMessage("bot", `Connected DB: ${selectedDb}. You asked: "${text}"`);
  }, 350);
}

sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// Restore previous selection (optional)
const savedDb = localStorage.getItem("selected_db");
if (savedDb) {
  selectedDb = savedDb;
  // you can also update label by matching dataset value if you want
}
