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

function showToast(message, options = {})
{
    if (!message) return;

    const {
        duration = 4000,
        background = '#d32f2f',
        color = '#fff'
    } = options;

    const containerId = 'qa-etalon-toast-container';
    let container = document.getElementById(containerId);
    if (!container)
    {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.right = '16px';
        container.style.bottom = '16px';
        container.style.zIndex = '2147483647';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.background = background;
    toast.style.color = color;
    toast.style.padding = '8px 12px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    toast.style.fontSize = '12px';
    toast.style.maxWidth = '320px';
    toast.style.wordBreak = 'break-word';
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
        if (container.childElementCount === 0)
        {
            container.remove();
        }
    }, duration);
}