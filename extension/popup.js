console.log("Popup loaded");

const riskEl = document.getElementById("risk-score");
const keywordEl = document.getElementById("keyword-list");
const iconBox = document.getElementById("icon-box");
const statusText = document.getElementById("status-text");

function updateUI(score, keywords) {

    // Text updates
    riskEl.textContent = score;
    keywordEl.textContent = keywords.length ? keywords.join(", ") : "None";

    // Reset classes
    iconBox.className = "";
    statusText.className = "";

    // Apply UI based on score
    if (score === 0) {
        iconBox.classList.add("icon-safe");
        statusText.classList.add("status-safe");
        iconBox.textContent = "🔍";
        statusText.textContent = "Safe";
    }
    else if (score < 20) {
        iconBox.classList.add("icon-warning");
        statusText.classList.add("status-warning");
        iconBox.textContent = "⚠️";
        statusText.textContent = "Warning";
    }
    else {
        iconBox.classList.add("icon-danger");
        statusText.classList.add("status-danger");
        iconBox.textContent = "❌";
        statusText.textContent = "Dangerous";
    }
}

// Load stored values
chrome.storage.local.get(["lastRisk", "lastTriggered"], data => {
    updateUI(data.lastRisk || 0, data.lastTriggered || []);
});

// Live updates from background
chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "RISK_ALERT") {
        updateUI(msg.score, msg.keywords);
    }
});
