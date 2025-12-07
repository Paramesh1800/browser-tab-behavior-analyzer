// -----------------------------
// Auto-download detection patch
// -----------------------------

// Dangerous file extensions (case-insensitive)
const DANGEROUS_EXT = [".exe", ".msi", ".apk", ".bat", ".cmd", ".scr", ".jar", ".js"];

// Extra risk to add when an auto-download is detected
const DOWNLOAD_RISK_BOOST = 30; // big bump, tune as you like

// Helper: is filename suspicious by extension
function isDangerousFilename(filename) {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return DANGEROUS_EXT.some(ext => lower.endsWith(ext));
}

// Helper: perform actions when dangerous download detected
function handleDangerousDownload(downloadItem) {
  try {
    // use initiator if available (the page that started it)
    const initiator = downloadItem.incognito ? "" : (downloadItem.byExtensionId || downloadItem.incognito ? "" : (downloadItem.referrer || downloadItem.url || ""));
    const filename = downloadItem.filename || downloadItem.url || "";
    console.warn("Dangerous download detected:", filename, "initiator:", initiator);

    // If we can extract a tabId from downloadItem (available in some cases)
    // note: many times downloadItem.tabId exists; if not, we won't attempt redirect by tab
    const possibleTabId = typeof downloadItem.tabId === "number" ? downloadItem.tabId : null;

    // Compute current score for that URL (if we have tabId -> get tab url)
    if (possibleTabId !== null) {
      chrome.tabs.get(possibleTabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.warn("tabs.get error:", chrome.runtime.lastError.message);
          // fallback to treating as generic dangerous event
          boostGlobalRiskAndNotify(filename, possibleTabId);
          return;
        }
        const url = tab && tab.url ? tab.url : downloadItem.url;
        // We will compute base score using existing scoreUrl() if available
        let base = 0;
        try {
          const res = scoreUrl(url); // if you have scoreUrl implemented earlier
          base = res.risk || 0;
        } catch (e) {
          base = 0;
        }

        const newRisk = clampRisk(base + DOWNLOAD_RISK_BOOST);
        const triggered = (function(){
          try {
            const res = scoreUrl(url);
            return res.triggered || [];
          } catch (e) { return []; }
        })();

        // Add a download-trigger label
        if (!triggered.includes("auto-download")) triggered.push("auto-download");

        // persist and notify
        chrome.storage.local.set({ lastRisk: newRisk, lastTriggered: triggered, lastUrl: url }, () => {
          chrome.runtime.sendMessage({ type: "RISK_ALERT", score: newRisk, keywords: triggered, url });
        });

        // desktop notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon48.png",
          title: "Automatic download detected",
          message: `A file (${filename}) was downloaded from ${tab.url} — risk increased to ${newRisk}`
        });

        // If newRisk exceeds block threshold, redirect the tab to warning page
        if (newRisk >= THRESHOLD_BLOCK && possibleTabId !== null) {
          const warningUrl = chrome.runtime.getURL("warning.html") + "?orig=" + encodeURIComponent(url) + "&r=" + newRisk;
          chrome.tabs.update(possibleTabId, { url: warningUrl }, () => {
            if (chrome.runtime.lastError) console.warn("tabs.update error:", chrome.runtime.lastError.message);
          });
        }
      });
    } else {
      // No tabId: do a generic storage update & notify
      boostGlobalRiskAndNotify(filename, null);
    }
  } catch (err) {
    console.error("handleDangerousDownload error:", err);
  }
}

// Generic fallback when we don't have a tab id
function boostGlobalRiskAndNotify(filename, tabId) {
  // load lastRisk and increase
  chrome.storage.local.get(["lastRisk","lastTriggered","lastUrl"], data => {
    const base = data.lastRisk || 0;
    const triggered = data.lastTriggered || [];
    const url = data.lastUrl || "";

    const newRisk = clampRisk(base + DOWNLOAD_RISK_BOOST);
    if (!triggered.includes("auto-download")) triggered.push("auto-download");

    chrome.storage.local.set({ lastRisk: newRisk, lastTriggered: triggered, lastUrl: url }, () => {
      chrome.runtime.sendMessage({ type: "RISK_ALERT", score: newRisk, keywords: triggered, url });
    });

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Automatic download detected",
      message: `A file (${filename}) was downloaded — risk increased to ${newRisk}`
    });

    // If we had a lastUrl and newRisk >= block threshold, try to redirect every tab that matches lastUrl
    if (newRisk >= THRESHOLD_BLOCK && url) {
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          try {
            if (t.url && t.url.indexOf(url) === 0) {
              const warningUrl = chrome.runtime.getURL("warning.html") + "?orig=" + encodeURIComponent(url) + "&r=" + newRisk;
              chrome.tabs.update(t.id, { url: warningUrl });
            }
          } catch(e) {}
        }
      });
    }
  });
}

// Listener: react to actual downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
  try {
    // The downloadItem may include filename/url/tabId. Inspect it.
    const filename = downloadItem.filename || downloadItem.url || "";
    // If the filename is suspicious (dangerous ext), handle it
    if (isDangerousFilename(filename)) {
      handleDangerousDownload(downloadItem);
      return;
    }

    // Also check the download initiating URL or referrer (if present) for suspicious keywords
    const initiatorUrl = (downloadItem.referrer && downloadItem.referrer.url) ? downloadItem.referrer.url : (downloadItem.url || "");
    if (initiatorUrl && containsAny(initiatorUrl, HIGH_RISK_KEYWORDS.concat(MEDIUM_RISK_KEYWORDS))) {
      // suspicious initiator — treat as dangerous
      handleDangerousDownload(downloadItem);
    }
  } catch (err) {
    console.error("downloads.onCreated handler error:", err);
  }
});

// -----------------------------
// Simulation helper (for testing without making real downloads)
// -----------------------------
self.simulateDownload = function simulateDownload({ filename = "test.exe", url = "https://example.com/malicious/test.exe", tabId = null } = {}) {
  const fakeItem = {
    filename,
    url,
    tabId
  };
  console.warn("simulateDownload called:", fakeItem);
  handleDangerousDownload(fakeItem);
};
