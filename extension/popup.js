console.log("Popup opened");

const riskEl = document.getElementById("risk-score");
const keywordEl = document.getElementById("keyword-list");
const statusBox = document.getElementById("status-box");

function updateUI(score, keywords) {

    riskEl.textContent = score;
    keywordEl.textContent = keywords.length ? keywords.join(", ") : "None";

    if (score === 0) {
        statusBox.style.background = "#2ecc71";
        statusBox.textContent = "SAFE ✔";
    } 
    else if (score < 20) {
        statusBox.style.background = "#f1c40f";
        statusBox.textContent = "WARNING ⚠";
    } 
    else {
        statusBox.style.background = "#e74c3c";
        statusBox.textContent = "DANGEROUS ❌";
    }
}

// Load latest data
chrome.storage.local.get(["lastRisk", "lastTriggered"], data => {
    updateUI(data.lastRisk || 0, data.lastTriggered || []);
});

// Live updates
chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "RISK_ALERT") {
        updateUI(msg.score, msg.keywords);
    }
});
