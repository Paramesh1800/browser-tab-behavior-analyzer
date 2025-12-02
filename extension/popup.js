// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "RISK_ALERT") {
    const scoreEl = document.getElementById("riskScore");
    const keywordsEl = document.getElementById("keywords");

    // Update the UI
    scoreEl.textContent = message.score;
    keywordsEl.textContent = message.keywords.join(", ") || "None";

    // Change color based on risk level
    if (message.score >= 6) {
      scoreEl.className = "high";
    } else if (message.score >= 3) {
      scoreEl.className = "medium";
    } else {
      scoreEl.className = "low";
    }
  }
});
