// Схема настроек расширения Quick Access
// Этот файл определяет структуру формы настроек и дефолтные значения.
// Пользовательские значения хранятся в chrome.storage.local и загружаются через settings-loader.js.

const settingsSchema = [
    { key: 'controller_url_with_filter', label: 'URL контроллера', type: 'text',
      value: "" },

    { key: 'php_execution_path', label: 'Путь выполнения PHP', type: 'text',
      value: "/admin/debug.php" },

    { key: 'kibana_ru_url', label: 'Kibana RU URL', type: 'text',
      value: "" },

    { key: 'kibana_com_url', label: 'Kibana COM URL', type: 'text',
      value: "" },

    '---',

    { key: 'market_subscription_url', label: 'URL подписки маркета', type: 'text',
      value: "" },

    { key: 'network_email', label: 'Email нетворка', type: 'text',
      value: "" },

    { key: 'network_password', label: 'Пароль нетворка', type: 'password',
      value: "" },

    '---',

    { key: 'license_coupons', label: 'Купоны лицензий', type: 'coupons',
      value: [] },
];

// Собираем плоский объект settings из схемы
const settings = {};
for (const item of settingsSchema) {
    if (typeof item === 'string') continue;
    settings[item.key] = item.value;
}

if (typeof window !== 'undefined') {
    window.settingsSchema = settingsSchema;
    window.settings = settings;
}
