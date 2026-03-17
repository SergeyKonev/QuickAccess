const ETALON_URL = 'https://etalon.bitrix24.ru/aqua/aquaversion.php';
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message?.type) return;

    if (message.type === 'FETCH_ETALON_XML') {
        fetch(ETALON_URL, { credentials: 'omit' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.text();
            })
            .then((xmlText) => {
                sendResponse({ success: true, xmlText });
            })
            .catch((error) => {
                sendResponse({ success: false, error: error.message || 'Fetch failed' });
            });
        return true;
    }

    if (message.type === 'MARKET_SUBSCRIPTION') {
        fetch(message.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            body: JSON.stringify(message.body)
        })
            .then(async (response) => {
                const text = await response.text();
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${text}`);
                }
                sendResponse({ success: true, text });
            })
            .catch((error) => {
                sendResponse({ success: false, error: error.message || 'Fetch failed' });
            });
        return true;
    }
});
