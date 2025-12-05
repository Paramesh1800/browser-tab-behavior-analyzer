console.log("Background loaded");

// ===============================
// 1. Weighted Keyword System
// ===============================
const keywordWeights = {
    high: {
        weight: 10,
        items: [
            "exe", "apk", "updateportal", "verificationportal",
            "malware", "trojan", "phishing", "downloadexe",
            "free-gift", "credential", "bank", "account-lock",
            "reset-password"
        ]
    },
    medium: {
        weight: 5,
        items: [
            "login", "signin", "verify", "support", "helpdesk",
            "secure-update", "security-check", "download", "install",
            "authentication", "validation", "alert", "income", "edu"
        ]
    },
    low: {
        weight: 2,
        items: [
            "com", "net", "in", "http", "https", "portal", "online"
        ]
    }
};

// Flat list for easy scanning
const allKeywords = [
    ...keywordWeights.high.items,
    ...keywordWeights.medium.items,
    ...keywordWeights.low.items
];

// ===============================
// 2. Evaluate URL risk
// ===============================
function calculateRisk(url) {
    let score = 0;
    let triggered = [];

    const lower = url.toLowerCase();

    // Check keyword categories
    for (let group in keywordWeights) {
        let { weight, items } = keywordWeights[group];

        items.forEach(keyword => {
            if (lower.includes(keyword)) {
                score += weight;
                triggered.push(keyword);
            }
        });
    }

    return { score, triggered };
}

// ===============================
// 3. Main check function
// ===============================
function checkRisk(tabId, url) {
    const { score, triggered } = calculateRisk(url);

    chrome.storage.local.set({
        lastRisk: score,
        lastTriggered: triggered,
        lastURL: url
    });

    chrome.runtime.sendMessage({
        type: "RISK_ALERT",
        score,
        keywords: triggered,
        url
    });

    // Auto redirect to warning page
    if (score >= 20) {
        chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL("warning.html")
        });
    }
}

// ===============================
// 4. Detect URL changes
// ===============================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        checkRisk(tabId, tab.url);
    }
});

// ===============================
// 5. Detect switching tabs
// ===============================
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url) {
            checkRisk(activeInfo.tabId, tab.url);
        }
    });
});
