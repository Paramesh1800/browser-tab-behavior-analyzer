console.log("Popup loaded");

document.addEventListener("DOMContentLoaded", () => {
    const riskEl = document.getElementById("risk-score");
    const keywordEl = document.getElementById("keyword-list");
    const statusBox = document.getElementById("status-box");
    const iconBox = document.getElementById("icon-box");

    function updateUI(score, keywords) {
        console.log("Updating UI with:", score, keywords);
        riskEl.textContent = score;
        keywordEl.textContent = keywords.length > 0 ? keywords.join(", ") : "None";

        if (score === 0) {
            statusBox.style.background = "#2ecc71";   // green
            iconBox.textContent = "🛡️";
        }
        else if (score < 50) {
            statusBox.style.background = "#f1c40f";   // yellow
            iconBox.textContent = "🛡️";
        }
        else {
            statusBox.style.background = "#e74c3c";   // red
            iconBox.textContent = "⚡";
        }
    }

    // Refresh data for the current active tab immediately on popup open
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            // Ask background script to analyze this URL specifically right now
            chrome.runtime.sendMessage({ type: "ANALYZE_CURRENT_URL", url: tabs[0].url }, (response) => {
                if (response) {
                    updateUI(response.score, response.keywords);
                }
            });
        }
    });

    // Also listen for real-time updates while popup is open
    chrome.runtime.onMessage.addListener(msg => {
        if (msg.type === "RISK_ALERT") {
            updateUI(msg.score, msg.keywords);
        }
    });
});
