// ------------------------------
// 1. Suspicious keywords
// ------------------------------
const suspiciousKeywords = [
  "login", "signin", "signup", "auth", "authentication", "authorize",
  "verify", "verification", "confirm", "validate", "password", "reset",
  "account", "unlock", "locked", "security-check", "identity", "credential",
  "access", "session", "2fa", "otp", "mfa",

  "bank", "banking", "pay", "payment", "wallet", "upi", "gpay",
  "transaction", "refund", "withdraw", "deposit", "balance",
  "profit", "bonus", "trading", "investment", "loan", "crypto",
  "bitcoin", "forex", "nft", "blockchain",

  "amazon", "flipkart", "myntra", "ebay", "walmart", "alibaba",
  "aliexpress", "paypal", "stripe", "shopify", "meesho",

  "facebook", "instagram", "whatsapp", "twitter", "snapchat",
  "youtube", "tiktok", "discord", "telegram", "reddit",
  "zoom", "microsoft", "google", "icloud", "apple",
  "office365", "outlook", "epicgames", "steam",

  "aadhar", "aadhaar", "pan", "income-tax", "epf", "pf", "lic",
  "scholarship", "sarkar", "gov", "government", "yojana", "ration",
  "voterid", "rc-book", "e-mandi",

  "exe", "apk", "zip", "rar", "iso", "crack", "patch", "nulled",
  "keygen", "loader", "injector", "hack", "cheat", "mod",
  "setup", "installer", "download",

  "urgent", "important", "alert", "warning", "danger",
  "immediately", "expires", "suspend", "suspended", "violation",
  "security-breach", "report", "claim", "prize", "winner",
  "offer", "limited", "free", "gift", "coupon",

  "secure-update", "secure-login", "updateportal", "verificationportal",
  "sso", "support", "helpdesk", "portal", "manage", "recovery"
];

// ------------------------------
// 2. Risk scoring function
// ------------------------------
function checkRisk(tabId, url) {
    let risk = 0;
    let triggered = [];

    // Parse URL
    try {
        const urlObj = new URL(url);
        const hostAndPath = urlObj.host + urlObj.pathname + urlObj.search;

        suspiciousKeywords.forEach(keyword => {
            if (hostAndPath.toLowerCase().includes(keyword.toLowerCase())) {
                risk += 5;
                if (!triggered.includes(keyword)) triggered.push(keyword);
            }
        });
    } catch (err) {
        console.error("Invalid URL:", url);
    }

    // Save for popup refresh
    chrome.storage.local.set({
        lastRisk: risk,
        lastTriggered: triggered
    });

    // Send live update to popup.js
    chrome.runtime.sendMessage({
        type: "RISK_ALERT",
        score: risk,
        keywords: triggered
    });

    // Optional automatic notification
    if (risk >= 15) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "warning.png",
            title: "⚠ Suspicious Website Detected",
            message: `Risk: ${risk}\nKeywords: ${triggered.join(", ")}`
        });
    }

    console.log(`Checked URL: ${url} → Risk: ${risk} → Keywords: ${triggered}`);
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
// 4. Detect tab switches
// ------------------------------
chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab.url) {
            checkRisk(activeInfo.tabId, tab.url);
        }
    });
});
