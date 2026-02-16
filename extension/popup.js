console.log("Popup loaded");

document.addEventListener("DOMContentLoaded", () => {
    const riskScoreEl = document.getElementById("risk-score");
    const keywordListEl = document.getElementById("keyword-list");
    const mainIndicatorEl = document.getElementById("main-indicator");
    const riskMeterEl = document.getElementById("risk-meter");
    const statusTextEl = document.getElementById("status-text");
    const currentUrlEl = document.getElementById("current-url");
    const refreshBtn = document.getElementById("refresh-btn");

    function updateUI(score, keywords, url) {
        console.log("Updating UI with:", score, keywords, url);

        // Update basic text
        riskScoreEl.textContent = score;
        if (url) {
            try {
                const u = new URL(url);
                currentUrlEl.textContent = u.hostname + u.pathname;
            } catch (e) {
                currentUrlEl.textContent = url;
            }
        }

        // Handle keywords display
        if (keywords.includes("whitelisted")) {
            keywordListEl.textContent = "Trusted (Safe)";
        } else {
            keywordListEl.textContent = keywords.length > 0 ? keywords.join(", ") : "None detected";
        }

        // Update Gauge (SVG)
        // Full circle is dash-array 283. Offset of 0 is full, 283 is empty.
        // Formula: 283 - (score / 100 * 283)
        const offset = 283 - (score / 100 * 283);
        riskMeterEl.style.strokeDashoffset = offset;

        // Update status colors and indicators
        mainIndicatorEl.classList.remove("warning", "danger");

        if (score === 0) {
            mainIndicatorEl.textContent = "Safe";
            statusTextEl.textContent = "Verified";
            riskMeterEl.style.stroke = "var(--accent-safe)";
        } else if (score < 50) {
            mainIndicatorEl.textContent = "Mild";
            mainIndicatorEl.classList.add("warning");
            statusTextEl.textContent = "Minimal Risk";
            riskMeterEl.style.stroke = "var(--accent-warning)";
        } else if (score < 80) {
            mainIndicatorEl.textContent = "Risky";
            mainIndicatorEl.classList.add("warning");
            statusTextEl.textContent = "Suspicious";
            riskMeterEl.style.stroke = "#f97316"; // Orange
        } else {
            mainIndicatorEl.textContent = "Danger";
            mainIndicatorEl.classList.add("danger");
            statusTextEl.textContent = "Malicious";
            riskMeterEl.style.stroke = "var(--accent-danger)";
        }
    }

    function refreshData() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                chrome.runtime.sendMessage({ type: "ANALYZE_CURRENT_URL", url: tabs[0].url }, (response) => {
                    if (response) {
                        updateUI(response.score, response.keywords, tabs[0].url);
                    }
                });
            }
        });
    }

    // Initial load
    refreshData();

    // Listen for refresh button
    refreshBtn.addEventListener("click", () => {
        refreshBtn.classList.add("spinning");
        refreshData();
        setTimeout(() => refreshBtn.classList.remove("spinning"), 500);
    });

    // Listen for real-time updates while popup is open
    chrome.runtime.onMessage.addListener(msg => {
        if (msg.type === "RISK_ALERT") {
            updateUI(msg.score, msg.keywords, msg.url);
        }
    });
});
