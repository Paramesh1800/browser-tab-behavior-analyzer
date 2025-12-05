console.log("Popup loaded");

document.addEventListener("DOMContentLoaded", () => {

    const riskEl = document.getElementById("risk-score");
    const keywordEl = document.getElementById("keyword-list");
    const statusBox = document.getElementById("status-box");
    const iconBox = document.getElementById("icon-box");

    function updateUI(score, keywords) {
        console.log("Updating UI with:", score, keywords);

        // Update number
        riskEl.textContent = score;

        // Update triggered keywords
        keywordEl.textContent =
            keywords.length > 0 ? keywords.join(", ") : "None";

        // Update colors + emojis
        if (score === 0) {
            statusBox.style.background = "#2ecc71";   // green
            iconBox.textContent = "🛡️";              // SAFE
        } 
        else if (score < 20) {
            statusBox.style.background = "#f1c40f";   // yellow
            iconBox.textContent = "🛡️";              // shield stays
        } 
        else {
            statusBox.style.background = "#e74c3c";   // red
            iconBox.textContent = "⚡";               // THREAT
        }
    }

    // Load from storage on open
    chrome.storage.local.get(["lastRisk", "lastTriggered"], data => {
        console.log("Loaded from storage:", data);
        updateUI(data.lastRisk || 0, data.lastTriggered || []);
    });

    // Listen for messages from background.js
    chrome.runtime.onMessage.addListener(msg => {
        console.log("Message received:", msg);
        if (msg.type === "RISK_ALERT") {
            updateUI(msg.score, msg.keywords);
        }
    });

});
