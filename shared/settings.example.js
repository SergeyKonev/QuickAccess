// Пример файла настроек для расширения Quick Access
// Скопируйте этот файл как shared/settings.js и измените настройки под свои нужды
//
// Чтобы добавить новую настройку — добавьте объект в массив settingsSchema.
// Форма в табе настроек сгенерируется автоматически.
//
// Поддерживаемые типы полей:
//   text     — обычный текстовый инпут
//   password — инпут с маской
//   coupons  — список пар {name, value} с кнопкой добавления
//   ---      — строка-разделитель (просто '---' в массиве)

const settingsSchema = [
    { key: 'controller_url_with_filter', label: 'URL контроллера', type: 'text',
      value: "http://localhost:12345/controller?filter={portalUri}" },

    { key: 'php_execution_path', label: 'Путь выполнения PHP', type: 'text',
      value: "/admin/debug.php" },

    { key: 'kibana_ru_url', label: 'Kibana RU URL', type: 'text',
      value: "http://kibana-ru.example.com/app/kibana#/discover?query={portalUrl}" },

    { key: 'kibana_com_url', label: 'Kibana COM URL', type: 'text',
      value: "http://kibana-com.example.com/app/kibana#/discover?query={portalUrl}" },

    '---',

    { key: 'market_subscription_url', label: 'URL подписки маркета', type: 'text',
      value: "http://your-server.example.com:33666/controller/endpoint" },

    { key: 'network_email', label: 'Email нетворка', type: 'text',
      value: "your_email@bitrix.ru" },

    { key: 'network_password', label: 'Пароль нетворка', type: 'password',
      value: "your_password" },

    '---',

    { key: 'license_coupons', label: 'Купоны лицензий', type: 'coupons',
      value: [
        { name: "Тестовый", value: "TEST_COUPON_1" },
        { name: "Демо",     value: "DEMO_LICENSE" },
      ] },
];

// Собираем плоский объект settings из схемы
const settings = {};
for (const item of settingsSchema) {
    if (typeof item === 'string') continue;
    settings[item.key] = item.value;
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { settings, settingsSchema };
} else if (typeof window !== 'undefined') {
    window.settings = settings;
    window.settingsSchema = settingsSchema;
}
