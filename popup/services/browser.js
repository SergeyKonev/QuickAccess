(function () {
    const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

    async function queryActiveTab() {
        if (typeof browser !== 'undefined') {
            return browserAPI.tabs.query({ active: true, currentWindow: true });
        }
        return new Promise((resolve) => {
            browserAPI.tabs.query({ active: true, currentWindow: true }, resolve);
        });
    }

    async function storageGet(keys) {
        if (typeof browser !== 'undefined') {
            return browserAPI.storage.local.get(keys);
        }
        return new Promise((resolve) => {
            browserAPI.storage.local.get(keys, resolve);
        });
    }

    async function storageSet(data) {
        if (typeof browser !== 'undefined') {
            return browserAPI.storage.local.set(data);
        }
        return new Promise((resolve) => {
            browserAPI.storage.local.set(data, resolve);
        });
    }

    window.qaBrowser = {
        browserAPI,
        queryActiveTab,
        storageGet,
        storageSet
    };
})();
