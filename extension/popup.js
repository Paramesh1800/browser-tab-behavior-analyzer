// popup.js
console.log("Popup opened");

function updateUI(score, keywords, url) {
  const scoreEl = document.getElementById("risk-score");
  const kEl = document.getElementById("keyword-list");
  const lastUrlEl = document.getElementById("last-url");
  scoreEl.textContent = score;
  kEl.textContent = (keywords && keywords.length) ? keywords.join(", ") : "None";
  lastUrlEl.textContent = url ? `Last: ${url}` : "";

  const box = document.getElementById("status-box");
  box.style.background = "#2ecc71"; // default green
  if (score >= 75) box.style.background = "#8b0000"; // dark red
  else if (score >= 40) box.style.background = "#e74c3c"; // red
  else if (score >= 20) box.style.background = "#f39c12"; // orange
  else if (score > 0) box.style.background = "#2ecc71"; // green
  else box.style.background = "#95a5a6"; // gray-ish for 0
}

// Ask background for last stored values
chrome.runtime.sendMessage({ type: "REQUEST_LAST" }, (response) => {
  if (response) {
    updateUI(response.lastRisk || 0, response.lastTriggered || [], response.lastUrl || "");
  } else {
    // fallback to storage read
    chrome.storage.local.get(["lastRisk","lastTriggered","lastUrl"], (d) => {
      updateUI(d.lastRisk || 0, d.lastTriggered || [], d.lastUrl || "");
    });
  }
});

// Listen for live messages
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "RISK_ALERT") {
    updateUI(msg.score || 0, msg.keywords || [], msg.url || "");
  }
});
