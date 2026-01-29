// Класс для управления интеграцией с Kibana
class KibanaManager {
    constructor() {
        this.currentSite = '';
        this.browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        this.messageTimeout = null;
        
        // Проверяем доступность settings при инициализации
        if (typeof settings === 'undefined') {
            console.warn('Settings не загружены при инициализации KibanaManager');
        }
        
        this.init();
    }

    async init() {
        await this.loadCurrentSite();
        this.bindEvents();
    }

    async loadCurrentSite() {
        try {
            let tabs;
            if (typeof browser !== 'undefined') {
                tabs = await this.browserAPI.tabs.query({active: true, currentWindow: true});
            } else {
                tabs = await new Promise((resolve) => {
                    this.browserAPI.tabs.query({active: true, currentWindow: true}, resolve);
                });
            }
            
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                this.currentSite = url.hostname;
            } else {
                this.currentSite = 'localhost';
            }
        } catch (error) {
            console.error('Ошибка получения текущего сайта для Kibana:', error);
            this.currentSite = 'localhost';
        }
        
        const currentSiteElement = document.getElementById('currentSiteKibana');
        if (currentSiteElement) {
            currentSiteElement.textContent = this.currentSite;
        }
    }

    bindEvents() {
        // Кнопка переключения дропдауна
        const toggleBtn = document.getElementById('openKibanaToggle');
        const dropdown = document.getElementById('kibanaDropdown');
        
        if (toggleBtn && dropdown) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
        }

        // Закрытие дропдауна при клике вне его
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        // Основная кнопка Kibana (открывает RU по умолчанию)
        const openKibanaBtn = document.getElementById('openKibanaBtn');
        if (openKibanaBtn) {
            openKibanaBtn.addEventListener('click', async () => {
                const urlKey = await this.getKibanaForThisSite(this.currentSite);
                this.openKibana(urlKey, 'Kibana AUTO');
            });
        }

        // Кнопка открытия Kibana RU
        const openKibanaRuBtn = document.getElementById('openKibanaRuBtn');
        if (openKibanaRuBtn) {
            openKibanaRuBtn.addEventListener('click', () => {
                this.openKibana('kibana_ru_url', 'Kibana RU');
            });
        }

        // Кнопка открытия Kibana COM
        const openKibanaComBtn = document.getElementById('openKibanaComBtn');
        if (openKibanaComBtn) {
            openKibanaComBtn.addEventListener('click', () => {
                this.openKibana('kibana_com_url', 'Kibana COM');
            });
        }
    }

    async getKibanaForThisSite(siteUrl) {
        if (siteUrl.includes("bxcreate") 
            || siteUrl.includes("bxtest")) {
            return "kibana_com_url";
        }
        else if (siteUrl.endsWith(".ru")
        || siteUrl.endsWith(".by")
        || siteUrl.endsWith(".kz")){
            return "kibana_ru_url";
        }
        else {
            return "kibana_com_url";
        }
    }

    async openKibana(urlKey, displayName) {
        try {
            // Проверяем доступность settings
            if (typeof settings === 'undefined') {
                this.showMessage('Настройки (settings.js) не загружены', 'error');
                console.error('Settings не загружены для открытия Kibana');
                return;
            }

            // Получаем URL Kibana из настроек
            const kibanaUrl = settings?.[urlKey];
            
            if (!kibanaUrl) {
                this.showMessage(`URL ${displayName} не настроен в settings.js`, 'error');
                console.error(`${urlKey} не настроен в settings`);
                return;
            }

            // Подставляем текущий домен в URL - заменяем ВСЕ вхождения
            const finalKibanaUrl = kibanaUrl.replace(/{portalUrl}/g, encodeURIComponent(this.currentSite));
            
            console.log(`Открытие ${displayName} для портала:`, this.currentSite);
            console.log(`URL ${displayName}:`, finalKibanaUrl);
            
            // Открываем новую вкладку с Kibana
            if (typeof browser !== 'undefined') {
                await this.browserAPI.tabs.create({url: finalKibanaUrl});
            } else {
                this.browserAPI.tabs.create({url: finalKibanaUrl});
            }
            
            // Показываем сообщение об успехе
            this.showMessage(`${displayName} открыта для ${this.currentSite}`, 'success');
            
            // Закрываем popup после небольшой задержки
            setTimeout(() => {
                window.close();
            }, 1000);
            
        } catch (error) {
            console.error(`Ошибка открытия ${displayName}:`, error);
            this.showMessage(`Ошибка открытия ${displayName}: ` + error.message, 'error');
        }
    }

    showMessage(text, type = 'info') {
        // Используем общий элемент сообщений
        const message = document.getElementById('message');
        if (!message) return;
        
        message.textContent = text;
        message.className = `message ${type}`;
        message.classList.add('show');

        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        this.messageTimeout = setTimeout(() => {
            message.classList.remove('show');
        }, 3000);
    }
}

// Глобальная переменная для доступа к менеджеру Kibana
let kibanaManager = null;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем только после полной загрузки
    setTimeout(() => {
        kibanaManager = new KibanaManager();
        // Делаем доступным глобально для других модулей
        window.kibanaManager = kibanaManager;
    }, 100);
});