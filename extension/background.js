// ------------------------------
// Weighted Suspicious Keywords
// ------------------------------

// High-risk → 10 points
const HIGH_RISK = [
    "login", "verify", "verification", "reset", "password",
    "bank", "banking", "upi", "wallet", "otp", "2fa", "mfa",
    "secure-update", "updateportal", "recovery", "account",
    "suspend", "suspended", "alert", "urgent", "prize",
    "winner", "claim", "paypal", "icloud", "office365",
    "gov", "government", "aadhar", "aadhaar", "pan",
    "charity", "donate", "refund"
];

// Medium-risk → 5 points
const MEDIUM_RISK = [
    "download", "exe", "apk", "zip", "wallet", "crypto",
    "bitcoin", "trading", "investment", "bonus", "offer",
    "portal", "update", "secure", "signin", "authorize"
];

// Low-risk → 2 points
const LOW_RISK = [
    "support", "helpdesk", "service", "manage",
    "signinpage", "loginpage"
];

function getKeywordScore(keyword) {
    if (HIGH_RISK.includes(keyword)) return 10;
    if (MEDIUM_RISK.includes(keyword)) return 5;
    if (LOW_RISK.includes(keyword)) return 2;
    return 0;
}

// -----------------------------------
// Risk Checking Function (Weighted)
// -----------------------------------
function checkRisk(tabId, url) {
    let risk = 0;
    let triggered = [];

    try {
        const urlObj = new URL(url);
        const target = (urlObj.host + urlObj.pathname + urlObj.search).toLowerCase();

        // check high-risk, medium-risk, low-risk
        [...HIGH_RISK, ...MEDIUM_RISK, ...LOW_RISK].forEach(keyword => {
            if (target.includes(keyword.toLowerCase())) {
                const pts = getKeywordScore(keyword);
                risk += pts;

                if (!triggered.includes(keyword)) triggered.push(keyword);
            }
        });

    } catch (err) {
        console.error("Invalid URL:", url);
    }

    chrome.storage.local.set({ lastRisk: risk, lastTriggered: triggered });

    chrome.runtime.sendMessage({
        type: "RISK_ALERT",
        score: risk,
        keywords: triggered
    });

    // notification
    if (risk >= 25) {
        chrome.notifications.create({
            type: "basic",
            title: "⚠ High-Risk Website Detected",
            message: `Risk: ${risk}\nKeywords: ${triggered.join(", ")}`,
            iconUrl: "warning.png"
        });
    }

    console.log("Checked:", url, "→ Risk:", risk, "→", triggered);
}

// listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        checkRisk(tabId, tab.url);
    }
});

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url) {
            checkRisk(activeInfo.tabId, tab.url);
        }
    });
});
