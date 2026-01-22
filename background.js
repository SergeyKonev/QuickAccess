const ETALON_URL = 'https://etalon.bitrix24.ru/aqua/aquaversion.php';
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'FETCH_ETALON_XML') {
        return;
    }

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
});
