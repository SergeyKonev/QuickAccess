// Пример файла настроек для расширения Quick Access
// Скопируйте этот файл как shared/settings.js и измените настройки под свои нужды

const settings = {
    // URL контроллера с подстановкой портала
    // {portalUri} будет заменен на домен текущей страницы
    controller_url_with_filter: "http://localhost:12345/controller?filter={portalUri}",
    
    // Купоны лицензий (используются в других модулях)
    license_coupons: [
        "TEST_COUPON_1",
        "TEST_COUPON_2", 
        "DEMO_LICENSE"
    ],
    
    // Путь для выполнения PHP кода (используется в сниппетах)
    // Этот путь должен существовать на вашем сервере и обрабатывать параметры:
    // ?PHPCode=y&CODE={закодированный_php_код}
    php_execution_path: "/admin/debug.php",
    
    // Альтернативные варианты путей:
    // php_execution_path: "/debug/execute.php"
    // php_execution_path: "/tools/eval.php"  
    // php_execution_path: "/dev/runner.php"
    
    // URL Kibana RU с подстановкой домена портала
    // {portalUrl} будет заменен на домен текущей страницы (ВСЕ вхождения)
    kibana_ru_url: "http://kibana-ru.example.com/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:'logstash-*',interval:auto,query:(query_string:(analyze_wildcard:!t,query:'host:\"{portalUrl}\" AND environment:\"{portalUrl}\"')),sort:!('@timestamp',desc))",
    
    // URL Kibana COM с подстановкой домена портала
    // {portalUrl} будет заменен на домен текущей страницы (ВСЕ вхождения) 
    kibana_com_url: "http://kibana-com.example.com/app/kibana#/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))&_a=(columns:!(_source),index:'logstash-*',interval:auto,query:(query_string:(analyze_wildcard:!t,query:'host:\"{portalUrl}\" AND region:\"com\"')),sort:!('@timestamp',desc))"
    
    // Примеры других URL Kibana:
    // kibana_ru_url: "https://your-kibana-ru.com/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))&_a=(columns:!(_source),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'logs-*',key:host,negate:!f,params:(query:'{portalUrl}'),type:phrase),query:(match:(host:(query:'{portalUrl}',type:phrase))))),index:'logs-*')"
    // kibana_com_url: "http://elastic-com.local:5601/app/discover#/?_g=(time:(from:now-1h,to:now))&_a=(index:'filebeat-*',query:(match:(host:'{portalUrl}')))"
    // 
    // Пример с множественными заменами {portalUrl}:
    // kibana_ru_url: "https://kibana-ru.com/app/discover#/?_g=(time:(from:now-30m,to:now))&_a=(query:(bool:(must:!((match:(host:'{portalUrl}')),(match:(environment:'{portalUrl}')),(match:(datacenter:'ru'))))))"
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = settings;
} else if (typeof window !== 'undefined') {
    window.settings = settings;
}