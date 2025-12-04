console.log("Popup loaded");

document.addEventListener("DOMContentLoaded", () => {

    const riskEl = document.getElementById("risk-score");
    const keywordEl = document.getElementById("keyword-list");
    const statusBox = document.getElementById("status-box");

    function updateUI(score, keywords) {
        console.log("Updating UI with:", score, keywords);

        riskEl.textContent = score;

        keywordEl.textContent =
            keywords.length > 0 ? keywords.join(", ") : "None";

        if (score === 0) {
            statusBox.style.background = "#2ecc71";
        } else if (score < 20) {
            statusBox.style.background = "#f1c40f";
        } else {
            statusBox.style.background = "#e74c3c";
        }
    }

    chrome.storage.local.get(["lastRisk", "lastTriggered"], data => {
        console.log("Loaded from storage:", data);
        updateUI(data.lastRisk || 0, data.lastTriggered || []);
    });

    chrome.runtime.onMessage.addListener(msg => {
        console.log("Message received:", msg);
        if (msg.type === "RISK_ALERT") {
            updateUI(msg.score, msg.keywords);
        }
    });

});
