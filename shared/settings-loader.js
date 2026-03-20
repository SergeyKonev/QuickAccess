// Загрузка настроек из chrome.storage.local с фолбэком на дефолты из settings.js
// Данные в storage хранятся в base64-кодировке (обфускация от случайного просмотра)
(function () {
    const STORAGE_KEY = 'extensionSettings';

    // Дефолтные значения берутся из settings.js (загружается раньше)
    const defaults = window.settings ? JSON.parse(JSON.stringify(window.settings)) : {};

    function encode(obj) {
        return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
    }

    function decode(str) {
        return JSON.parse(decodeURIComponent(escape(atob(str))));
    }

    async function loadSettings() {
        try {
            const result = await window.qaBrowser.storageGet([STORAGE_KEY]);
            const raw = result[STORAGE_KEY];
            if (!raw) return;

            const stored = typeof raw === 'string' ? decode(raw) : raw;
            if (stored && typeof stored === 'object') {
                Object.assign(window.settings, stored);
            }
        } catch (error) {
            console.warn('Ошибка загрузки настроек из storage:', error);
        }
    }

    async function saveSettings(newSettings) {
        try {
            Object.assign(window.settings, newSettings);
            await window.qaBrowser.storageSet({ [STORAGE_KEY]: encode(newSettings) });
        } catch (error) {
            console.error('Ошибка сохранения настроек в storage:', error);
            throw error;
        }
    }

    function getDefaults() {
        return defaults;
    }

    window.settingsLoader = { loadSettings, saveSettings, getDefaults };
})();
