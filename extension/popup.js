console.log("Popup loaded");

document.addEventListener("DOMContentLoaded", () => {
    const riskEl = document.getElementById("risk-score");
    const keywordEl = document.getElementById("keyword-list");
    const statusBox = document.getElementById("status-box");

    function updateUI(score, keywords) {
        console.log("Updating UI with:", score, keywords);

        riskEl.textContent = score;
        keywordEl.textContent = keywords.length > 0 ? keywords.join(", ") : "None";

        if (score === 0) {
            statusBox.style.background = "#2ecc71"; // green
        } else if (score < 20) {
            statusBox.style.background = "#f1c40f"; // yellow
        } else {
            statusBox.style.background = "#e74c3c"; // red
        }
    }

    // Load previous score if popup opened later
    chrome.storage.local.get(["lastRisk", "lastTriggered"], data => {
        updateUI(data.lastRisk || 0, data.lastTriggered || []);
    });

    // Live updates from background.js
    chrome.runtime.onMessage.addListener(msg => {
        if (msg.type === "RISK_ALERT") {
            updateUI(msg.score, msg.keywords);
        }
    });
});
