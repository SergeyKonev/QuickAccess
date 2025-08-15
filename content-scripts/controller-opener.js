// Модуль для открытия контроллера с фильтрацией по порталу
class ControllerOpener {
    constructor() {
        this.browserAPI = typeof browser !== 'undefined' ? browser : chrome;
    }

    // Функция для вывода ошибок в консоль
    printError(message) {
        console.error('ControllerOpener Error:', message);
        // Или добавить в DOM, если есть элемент для сообщений
        try {
            const messageElement = document.getElementById('message');
            if (messageElement) {
                messageElement.textContent = message;
                messageElement.className = 'message error show';
                setTimeout(() => {
                    messageElement.classList.remove('show');
                }, 5000);
            }
        } catch (e) {
            // Игнорируем ошибки DOM в content script
        }
    }

    async openController() {
        try {
            console.log('Открытие контроллера...');
            
            // Проверяем доступность settings
            if (typeof settings === 'undefined') {
                this.printError('Настройки (settings.js) не загружены');
                throw new Error('Настройки не загружены');
            }

            // Используем настройки из файла settings.js
            const controllerUrlWithFilter = settings.controller_url_with_filter;
            console.log('URL контроллера:', controllerUrlWithFilter);
            
            if (!controllerUrlWithFilter) {
                this.printError('URL контроллера не настроен в settings.js');
                throw new Error('URL контроллера не настроен в settings.js');
            }

            // Проверяем доступность utils функций
            if (typeof getPortalLinkFromTab === 'undefined') {
                this.printError('Функция getPortalLinkFromTab не найдена (utils.js не загружен?)');
                throw new Error('utils.js не загружен');
            }

            // Получаем текущую активную вкладку
            let tabs;
            if (typeof browser !== 'undefined') {
                tabs = await this.browserAPI.tabs.query({active: true, currentWindow: true});
            } else {
                tabs = await new Promise((resolve) => {
                    this.browserAPI.tabs.query({active: true, currentWindow: true}, resolve);
                });
            }

            const activeTab = tabs[0];
            console.log('Активная вкладка:', activeTab);
            
            if (!activeTab?.url) {
                this.printError('Не удалось получить URL текущей вкладки');
                throw new Error('Не удалось получить URL текущей вкладки');
            }

            // Используем функцию из utils.js
            const portalLink = getPortalLinkFromTab(activeTab.url);
            console.log('Портал:', portalLink);
            
            if (!portalLink) {
                this.printError('Не удалось извлечь домен портала из URL: ' + activeTab.url);
                throw new Error('Не удалось извлечь домен портала');
            }

            // Используем функцию из utils.js
            const isTestPortal = isPortalForTest(portalLink);
            console.log('Тестовый портал?', isTestPortal);
            
            if (!isTestPortal) {
                const errorMsg = `Портал ${portalLink} не тестовый, зачем тебе контроллер? :)`;
                this.printError(errorMsg);
                throw new Error(errorMsg);
            }

            // Формируем URL контроллера с подставленным порталом
            const controllerUrlWithPortalFilter = controllerUrlWithFilter.replace('{portalUri}', encodeURIComponent(portalLink));
            console.log('Финальный URL контроллера:', controllerUrlWithPortalFilter);
            
            // Открываем новую вкладку с контроллером
            if (typeof browser !== 'undefined') {
                await this.browserAPI.tabs.create({ url: controllerUrlWithPortalFilter });
            } else {
                this.browserAPI.tabs.create({ url: controllerUrlWithPortalFilter });
            }

            console.log('Контроллер успешно открыт');
            return {
                success: true,
                message: `Контроллер открыт для портала: ${portalLink}`
            };

        } catch (error) {
            console.error('Ошибка открытия контроллера:', error);
            this.printError(error.message || 'Неизвестная ошибка открытия контроллера');
            return {
                success: false,
                message: error.message || 'Ошибка открытия контроллера'
            };
        }
    }

    // Метод для получения текущего URL контроллера из настроек
    getControllerUrl() {
        return settings?.controller_url_with_filter || '';
    }

    // Метод для получения купонов лицензий
    getLicenseCoupons() {
        return settings?.license_coupons || [];
    }

    // Метод-обертка для функции из utils.js (для совместимости API)
    getPortalLinkFromTab(url) {
        return getPortalLinkFromTab(url);
    }

    // Метод-обертка для функции из utils.js (для совместимости API)
    isPortalForTest(portalLink) {
        return isPortalForTest(portalLink);
    }
}

// Экспортируем класс для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ControllerOpener;
} else if (typeof window !== 'undefined') {
    window.ControllerOpener = ControllerOpener;
}

// Добавляем обработчик для кнопки контроллера
const controllerBtn = document.getElementById('openControllerLink');
if (controllerBtn) {
    controllerBtn.addEventListener('click', () => {
        console.log('Кнопка контроллера нажата'); // Отладочный вывод
        new ControllerOpener().openController();
    });
} else {
    console.error('Кнопка openControllerLink не найдена в DOM');
}