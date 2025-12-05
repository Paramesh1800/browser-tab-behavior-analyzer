// background.js
// Browser Tab Behavior Analyzer - Full detection + blocking (Option B)

// ------------------------- Configuration -------------------------
const THRESHOLD_BLOCK = 40;   // >= this will redirect to warning page
const NOTIFY_THRESHOLD = 60;  // >= this will show a desktop notification
const MAX_RISK = 100;

// Suspicious TLDs (examples; add more if needed)
const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".club", ".pw", ".info", ".review", ".icu", ".download",
  ".loan", ".work", ".stream", ".bid", ".gq", ".ml", ".tk", ".cf"
];

// Weighted keywords
const HIGH_RISK_KEYWORDS = ["login","verify","verification","password","reset","account","otp","2fa","mfa","bank","paypal","icloud","office365","suspend","suspended","claim","winner","prize","refund","payment"];
const MEDIUM_RISK_KEYWORDS = ["update","secure","portal","signin","authenticate","auth","support","helpdesk","confirm","recovery","verify-account","verify-login"];
const LOW_RISK_KEYWORDS = ["download","installer","apk","exe","zip","setup","free","offer","bonus"];

// Weights
const WEIGHT_HIGH = 12;
const WEIGHT_MED = 6;
const WEIGHT_LOW = 2;
const WEIGHT_PUNYCODE = 20;
const WEIGHT_NON_ASCII = 18;
const WEIGHT_SUSP_TLD = 10;
const WEIGHT_SUBDOMAIN_HEUR = 8; // many labels/hyphens
const WEIGHT_DIGIT_HEUR = 6;     // numeric-looking labels

// Per-session allowlist (not persisted across browser restarts)
const sessionAllowlist = new Set();

// ------------------------- Utilities -------------------------
function debugLog(...args) {
  // Toggle on/off by commenting/uncommenting:
  console.log(...args);
}

function normalizeHost(host) {
  return host.trim().toLowerCase();
}

function containsAny(target, list) {
  const t = target.toLowerCase();
  for (const k of list) {
    if (!k) continue;
    if (t.includes(k.toLowerCase())) return true;
  }
  return false;
}

function listMatches(target, list) {
  const matched = [];
  const t = target.toLowerCase();
  for (const k of list) {
    if (!k) continue;
    if (t.includes(k.toLowerCase())) matched.push(k);
  }
  return matched;
}

// Detect punycode in host (labels starting with 'xn--')
function hasPunycode(host) {
  try {
    const labels = host.split('.');
    for (const lab of labels) {
      if (lab.startsWith("xn--")) return true;
    }
  } catch (e) {}
  return false;
}

// Detect any non-ASCII character in host (homograph attempt)
function hasNonAscii(host) {
  for (let i = 0; i < host.length; i++) {
    if (host.charCodeAt(i) > 127) return true;
  }
  return false;
}

// Suspicious TLD detection (basic: check suffix)
function suspiciousTld(host) {
  for (const tld of SUSPICIOUS_TLDS) {
    if (host.endsWith(tld)) return tld;
  }
  return null;
}

// Subdomain heuristics
function analyzeSubdomain(host) {
  // count labels, hyphens, numeric-only labels, length of host
  const labels = host.split('.');
  const labelCount = labels.length;
  let hyphenCount = 0;
  let numericLabelCount = 0;
  let longLabelCount = 0;
  for (const lab of labels) {
    hyphenCount += (lab.match(/-/g) || []).length;
    if (/^\d+$/.test(lab)) numericLabelCount++;
    if (lab.length >= 15) longLabelCount++;
  }
  return { labelCount, hyphenCount, numericLabelCount, longLabelCount };
}

// Normalize / extract host + path for matching
function hostAndPath(urlStr) {
  try {
    const u = new URL(urlStr);
    return (u.host + u.pathname + u.search).toLowerCase();
  } catch (e) {
    return (urlStr || "").toLowerCase();
  }
}

// Limit risk to 0..MAX_RISK
function clampRisk(r) {
  if (Number.isNaN(r) || r < 0) return 0;
  if (r > MAX_RISK) return MAX_RISK;
  return Math.round(r);
}

// ------------------------- Risk Scoring -------------------------
function scoreUrl(urlStr) {
  let risk = 0;
  const triggered = [];

  let host = "";
  try {
    const u = new URL(urlStr);
    host = normalizeHost(u.host);
  } catch (e) {
    host = normalizeHost(urlStr);
  }

  const target = hostAndPath(urlStr);

  // 1) Keyword matches (weighted)
  const highMatches = listMatches(target, HIGH_RISK_KEYWORDS);
  const medMatches = listMatches(target, MEDIUM_RISK_KEYWORDS);
  const lowMatches = listMatches(target, LOW_RISK_KEYWORDS);

  highMatches.forEach(k => { risk += WEIGHT_HIGH; if (!triggered.includes(k)) triggered.push(k + " (H)"); });
  medMatches.forEach(k => { risk += WEIGHT_MED; if (!triggered.includes(k)) triggered.push(k + " (M)"); });
  lowMatches.forEach(k => { risk += WEIGHT_LOW; if (!triggered.includes(k)) triggered.push(k + " (L)"); });

  // 2) Punycode / non-ascii
  if (hasPunycode(host)) {
    risk += WEIGHT_PUNYCODE;
    triggered.push("punycode");
  } else if (hasNonAscii(host)) {
    risk += WEIGHT_NON_ASCII;
    triggered.push("non-ascii");
  }

  // 3) Suspicious TLD
  const tld = suspiciousTld(host);
  if (tld) {
    risk += WEIGHT_SUSP_TLD;
    triggered.push(`tld:${tld}`);
  }

  // 4) Subdomain heuristics
  const sub = analyzeSubdomain(host);
  if (sub.labelCount >= 4) { // many labels = suspicious
    risk += WEIGHT_SUBDOMAIN_HEUR;
    triggered.push("many-subdomains");
  }
  if (sub.hyphenCount >= 3) { // lots of hyphens
    risk += WEIGHT_SUBDOMAIN_HEUR;
    triggered.push("many-hyphens");
  }
  if (sub.numericLabelCount >= 1) {
    risk += WEIGHT_DIGIT_HEUR;
    triggered.push("numeric-subdomain");
  }
  if (sub.longLabelCount >= 1) {
    risk += 4;
    triggered.push("long-label");
  }

  // 5) URL weirdness heuristics - lots of hyphens in total path, very long path, many query params
  const path = "";
  try { path = new URL(urlStr).pathname + new URL(urlStr).search; } catch(e){}
  const totalHyphens = (path.match(/-/g) || []).length;
  if (totalHyphens >= 6) {
    risk += 6;
    triggered.push("many-hyphens-path");
  }
  const queryCount = (new URL(urlStr).search || "").split("&").filter(s=>s).length;
  if (queryCount >= 6) { risk += 6; triggered.push("many-query-params"); }

  // cap and normalize to 0..MAX_RISK
  risk = clampRisk(risk);

  return { risk, triggered, host };
}

// ------------------------- Action on detection -------------------------
function handleRiskForTab(tabId, url) {
  if (!url) return;

  // if allowed in session, skip
  if (sessionAllowlist.has(url)) {
    debugLog("URL allowed in session:", url);
    // still send low-level info to popup
    const { risk, triggered } = scoreUrl(url);
    chrome.storage.local.set({ lastRisk: risk, lastTriggered: triggered, lastUrl: url });
    chrome.runtime.sendMessage({ type: "RISK_ALERT", score: risk, keywords: triggered, url });
    return;
  }

  const { risk, triggered, host } = scoreUrl(url);

  // store last result for popup
  chrome.storage.local.set({ lastRisk: risk, lastTriggered: triggered, lastUrl: url });

  // send live message to popup (if open)
  chrome.runtime.sendMessage({ type: "RISK_ALERT", score: risk, keywords: triggered, url }, () => {
    if (chrome.runtime.lastError) {
      // popup not open or no listener; that's fine
      debugLog("sendMessage error (popup probably closed):", chrome.runtime.lastError.message);
    }
  });

  debugLog("URL scored:", url, "->", risk, triggered);

  // notification for very high risk
  if (risk >= NOTIFY_THRESHOLD) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "High risk page detected",
      message: `Risk ${risk} — ${triggered.join(", ").slice(0,120)}`
    });
  }

  // If risk >= block threshold, redirect to warning page
  if (risk >= THRESHOLD_BLOCK) {
    // Attach original URL so warning.html can show it and allow proceed
    const warningUrl = chrome.runtime.getURL("warning.html") + "?orig=" + encodeURIComponent(url) + "&r=" + risk;
    debugLog("Redirecting tab to warning page:", warningUrl);
    chrome.tabs.update(tabId, { url: warningUrl }, () => {
      // Optionally log errors
      if (chrome.runtime.lastError) {
        debugLog("tabs.update error:", chrome.runtime.lastError.message);
      }
    });
  }
}

// ------------------------- Listeners -------------------------

// When tab is updated (navigation), evaluate
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Wait until navigation complete
  if (changeInfo.status === "complete" && tab && tab.url) {
    debugLog("Tab updated:", tabId, changeInfo, tab.url);
    handleRiskForTab(tabId, tab.url);
  }
});

// When user switches tabs, evaluate that tab's URL
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (chrome.runtime.lastError) {
      debugLog("tabs.get error:", chrome.runtime.lastError.message);
      return;
    }
    if (tab && tab.url) {
      debugLog("Tab activated - checking:", tab.id, tab.url);
      handleRiskForTab(tab.id, tab.url);
    }
  });
});

// Listen for messages from warning page (user clicked Proceed) or popup (manual override)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  if (msg.type === "ALLOW_ONCE" && msg.origUrl) {
    // user chose to proceed — add to session allowlist and open original URL
    sessionAllowlist.add(msg.origUrl);
    // open original URL in the same tab (if sender.tab exists) or new tab
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      chrome.tabs.update(tabId, { url: msg.origUrl });
    } else {
      chrome.tabs.create({ url: msg.origUrl });
    }
    sendResponse({ ok: true });
  }

  if (msg.type === "REQUEST_LAST") {
    // popup requested latest stored values
    chrome.storage.local.get(["lastRisk","lastTriggered","lastUrl"], data => {
      sendResponse(data);
    });
    // say we will respond asynchronously
    return true;
  }
});
