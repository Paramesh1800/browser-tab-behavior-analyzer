// ------------------------------
// 1. Suspicious keywords
// ------------------------------
const suspiciousKeywords = [
  "http", "com", "net", "exe", "in", "update", "verify", "support", "zip",
  "secure", "online", "urls", "login", "alert", "antivirus", "center",
  "verificationportal", "updateportal", "income", "edu", "service",
  "download", "install", "free", "now", "apk", "malicious", "security",
  "signin", "resolution", "amazon", "helpdesk", "validation", "authentication",
  "bank", "icloud", "crypto", "portal", "epicgames", "zoom"
];


// ------------------------------
// 2. Risk scoring function
// ------------------------------
function checkRisk(tabId, url) {
    let risk = 0;
    let triggered = [];

    suspiciousKeywords.forEach(keyword => {
        if (url.toLowerCase().includes(keyword.toLowerCase())) {
            risk += 5;
            triggered.push(keyword);
        }
    });

    // Save score for popup refresh
    chrome.storage.local.set({
        lastRisk: risk,
        lastTriggered: triggered
    });

    // 🔔 Send message to popup.js (LIVE UI updates)
    chrome.runtime.sendMessage({
        type: "RISK_ALERT",
        score: risk,
        keywords: triggered
    });

    // Optional automatic notification
    if (risk >= 10) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "warning.png",
            title: "⚠ Suspicious Website",
            message: `Risk: ${risk}\nKeywords: ${triggered.join(", ")}`
        });
    }
}


// ------------------------------
// 3. Detect URL changes
// ------------------------------
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        checkRisk(tabId, tab.url);
    }
});


// ------------------------------
// 4. When user switches tab
// ------------------------------
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url) {
            checkRisk(activeInfo.tabId, tab.url);
        }
    });
});
