// Модуль для управления формой активации купонов на страницах лицензий
class TariffLister {
    constructor() {
        this.browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        this.init();
    }

    // Функция для вывода ошибок в консоль
    printError(message) {
        console.error('TariffLister Error:', message);
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

    // Основная инициализация модуля
    init() {
        try {
            console.log('Инициализация TariffLister...');
            
            // Проверяем доступность settings
            if (typeof settings === 'undefined') {
                this.printError('Настройки (settings.js) не загружены');
                throw new Error('Настройки не загружены');
            }

            this.setupCouponActivationForm();
            this.setupTariffSelector();

            console.log('TariffLister успешно инициализирован');
        } catch (error) {
            console.error('Ошибка инициализации TariffLister:', error);
            this.printError(error.message || 'Неизвестная ошибка инициализации');
        }
    }

    // Настройка формы активации купона
    setupCouponActivationForm() {
        try {
            const activateCouponFormLink = document.querySelector(".ui-link[onclick=\"BX.toggle(BX('ActivateLicenseForm'))\"]");
            
            // Если ссылки для активации купона нет (на западных порталах)
            if (!activateCouponFormLink) {
                console.log('Ссылка активации купона не найдена, создаем...');
                this.insertCouponActivationFormLink();
            } else {
                console.log('Ссылка активации купона найдена');
            }
        } catch (error) {
            console.error('Ошибка настройки формы активации купона:', error);
            this.printError('Ошибка настройки формы активации купона');
        }
    }

    // Настройка селектора тарифов
    setupTariffSelector() {
        try {
            const couponInput = document.querySelector("input[name='coupon']");
            
            if (!couponInput) {
                console.log('Поле ввода купона не найдено');
                return;
            }

            console.log('Заменяем поле ввода купона на селектор тарифов...');
            this.replaceWithTariffSelector(couponInput);
        } catch (error) {
            console.error('Ошибка настройки селектора тарифов:', error);
            this.printError('Ошибка настройки селектора тарифов');
        }
    }

    // Вставка ссылки для активации формы купона (для западных порталов)
    insertCouponActivationFormLink() {
        try {
            const parentOfLicenseLinks = document.querySelector(".bx-license-section-info__wrap .bx-license-section-info-links");
            
            if (!parentOfLicenseLinks) {
                this.printError('Не найден родительский элемент для ссылок лицензий');
                throw new Error('Родительский элемент не найден');
            }

            const couponActivationFormLink = document.createElement("a");
            couponActivationFormLink.textContent = "Активировать купон";
            couponActivationFormLink.className = "ui-link";
            couponActivationFormLink.href = "javascript:void(0)";
            couponActivationFormLink.setAttribute('onclick', "BX.toggle(BX('ActivateLicenseForm'))");

            // Вставляем ссылку в начало или добавляем как первый элемент
            if (parentOfLicenseLinks.firstChild) {
                parentOfLicenseLinks.insertBefore(couponActivationFormLink, parentOfLicenseLinks.firstChild);
            } else {
                parentOfLicenseLinks.appendChild(couponActivationFormLink);
            }

            console.log('Ссылка активации купона успешно добавлена');
        } catch (error) {
            console.error('Ошибка вставки ссылки активации купона:', error);
            this.printError('Ошибка создания ссылки активации купона');
        }
    }

    // Замена input элемента на dropdown с тарифами из настроек
    replaceWithTariffSelector(inputElement) {
        try {
            if (!inputElement) {
                throw new Error('Элемент input не передан');
            }

            const selectElement = document.createElement('select');
            selectElement.name = inputElement.name;
            selectElement.className = 'bxhtmled-top-bar-select';

            const coupons = this.getLicenseCoupons();
            
            if (!coupons || coupons.length === 0) {
                this.printError('Купоны лицензий не настроены в settings.js');
                throw new Error('Купоны лицензий не настроены');
            }

            // Добавляем тарифы из настроек в селектор
            coupons.forEach(coupon => {
                if (!coupon.value || !coupon.name) {
                    console.warn('Некорректный купон:', coupon);
                    return;
                }
                
                const option = document.createElement('option');
                option.value = coupon.value;
                option.text = coupon.name;
                selectElement.appendChild(option);
            });

            // Заменяем input элемент на селектор
            inputElement.parentNode.replaceChild(selectElement, inputElement);
            
            console.log(`Селектор тарифов создан с ${coupons.length} опциями`);
        } catch (error) {
            console.error('Ошибка замены на селектор тарифов:', error);
            this.printError('Ошибка создания селектора тарифов');
        }
    }

    // Метод для получения купонов лицензий из настроек
    getLicenseCoupons() {
        return settings?.license_coupons || [];
    }

    // Метод для получения конкретного купона по значению
    getCouponByValue(value) {
        const coupons = this.getLicenseCoupons();
        return coupons.find(coupon => coupon.value === value);
    }

    // Метод для получения всех доступных значений купонов
    getAvailableCouponValues() {
        const coupons = this.getLicenseCoupons();
        return coupons.map(coupon => coupon.value);
    }
}

// Экспортируем класс для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TariffLister;
} else if (typeof window !== 'undefined') {
    window.TariffLister = TariffLister;
}

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    new TariffLister();
});

// Также инициализируем сразу, если DOM уже загружен
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new TariffLister();
    });
} else {
    new TariffLister();
}