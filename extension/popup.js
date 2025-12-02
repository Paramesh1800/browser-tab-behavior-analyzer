// Load saved risk score when popup opens
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["lastRisk", "lastTriggered"], (data) => {
    updateUI(data.lastRisk || 0, data.lastTriggered || []);
  });
});

// Listen for messages from background.js (live updates)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "RISK_ALERT") {
    updateUI(message.score, message.keywords);
  }
});

// Update popup UI
function updateUI(score, keywords) {
  const scoreEl = document.getElementById("riskScore");
  const keywordsEl = document.getElementById("keywords");

  // Update values
  scoreEl.textContent = score;
  keywordsEl.textContent = keywords.length ? keywords.join(", ") : "None";

  // Reset classes
  scoreEl.className = "";

  // Color levels
  if (score >= 6) {
    scoreEl.classList.add("high");   // red
  } else if (score >= 3) {
    scoreEl.classList.add("medium"); // yellow
  } else {
    scoreEl.classList.add("low");    // green
  }
}
