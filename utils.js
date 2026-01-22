function getPortalLinkFromTab(url)
{
    const regex = /https?:\/\/([^\/]+)/;
    const match = url.match(regex);
    if (match)
    {
        return domainWithSubdomain = match[1];
    }
    else
    {
        return null;
    }
}

function isPortalForTest(portalUrl)
{
    if (portalUrl == null)
        return false;
    const regex = /(hotfix[a-z]*|bx(?:stage|prod|create|test))[^\/]+\.bitrix24\.[a-z\.]+/;
    const match = portalUrl.match(regex);
    return match != null;
}

function reloadTabBypassCache(tabId)
{
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    if (!tabId) {
        return Promise.reject(new Error('tabId is required'));
    }

    if (typeof browser !== 'undefined') {
        return browserAPI.tabs.reload(tabId, { bypassCache: true });
    }

    return new Promise((resolve, reject) => {
        try {
            browserAPI.tabs.reload(tabId, { bypassCache: true }, () => {
                const error = chrome.runtime?.lastError;
                if (error) {
                    reject(new Error(error.message));
                } else {
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}