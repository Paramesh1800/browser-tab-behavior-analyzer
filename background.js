let tabHistory=[];

chrome.tabs.onCreated.addListener((tab) => {
	console.log("Tab opened:", tab.id, tab.url);
        let timeNow = Date.now();

	tabHistory.push({
		id:tab.id,
		url:tab.url,
		time:timeNow
	});
	
    tabHistory = tabHistory.filter(item => (timeNow - item.time) <= 5000);

	if (tabHistory.length > 3) {
        console.log("⚠ Suspicious behavior detected! Multiple tabs opened quickly.");
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    console.log("Tab closed:", tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log("Tab updated:", tabId, changeInfo);
});
