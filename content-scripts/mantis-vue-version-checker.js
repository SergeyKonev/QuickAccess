(() => {
	const BUTTON_ID = 'qa-etalon-version-btn-vue';
	const VERSION_INPUT_SELECTOR = 'input[placeholder="0.0.0"]';
	const ETALON_URL = 'https://etalon.bitrix24.ru/aqua/aquaversion.php';
	const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
	const STYLE_ID = 'qa-etalon-version-style-vue';

	const ensureStyles = () => {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			.qa-etalon-btn-vue {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				padding: 6px 12px;
				margin-left: 8px;
				border-radius: 6px;
				border: 1px solid rgba(94, 82, 64, 0.2);
				background: rgba(94, 82, 64, 0.12);
				color: #13343b;
				font-size: 12px;
				font-weight: 500;
				cursor: pointer;
				transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
			}
			.qa-etalon-btn-vue:hover {
				background: rgba(94, 82, 64, 0.2);
				border-color: rgba(94, 82, 64, 0.3);
			}
			.qa-etalon-btn-vue:active {
				background: rgba(94, 82, 64, 0.25);
				transform: translateY(1px);
			}
			.qa-etalon-btn-vue:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
			
			/* Стили для темной темы */
			body.dark .qa-etalon-btn-vue {
				border: 1px solid rgba(255, 255, 255, 0.15);
				background: rgba(255, 255, 255, 0.08);
				color: #e8eaed;
			}
			body.dark .qa-etalon-btn-vue:hover {
				background: rgba(255, 255, 255, 0.12);
				border-color: rgba(255, 255, 255, 0.25);
			}
			body.dark .qa-etalon-btn-vue:active {
				background: rgba(255, 255, 255, 0.16);
			}
		`;
		document.head.appendChild(style);
	};

	const setButtonState = (button, { loading, message }) => {
		if (!button) return;
		if (typeof loading === 'boolean') {
			button.disabled = loading;
			button.textContent = loading ? 'Загрузка...' : 'Версия на эталоне';
		}
		if (message) {
			button.title = message;
		}
	};

	const createButton = () => {
		ensureStyles();
		const button = document.createElement('button');
		button.id = BUTTON_ID;
		button.type = 'button';
		button.className = 'qa-etalon-btn-vue';
		button.textContent = 'Версия на эталоне';
		button.title = 'Получить текущую версию модуля с эталона';
		button.addEventListener('click', () => handleClick(button));
		return button;
	};

	const fetchEtalonXml = async () => {
		if (!browserAPI?.runtime?.sendMessage) {
			throw new Error('runtime.sendMessage недоступен');
		}

		let response;
		if (typeof browser !== 'undefined') {
			response = await browserAPI.runtime.sendMessage({ type: 'FETCH_ETALON_XML' });
		} else {
			response = await new Promise((resolve) => {
				browserAPI.runtime.sendMessage({ type: 'FETCH_ETALON_XML' }, (result) => {
					const lastError = browserAPI.runtime?.lastError;
					if (lastError) {
						resolve({ success: false, error: lastError.message || 'Message failed' });
						return;
					}
					resolve(result);
				});
			});
		}

		if (!response?.success) {
			throw new Error(response?.error || 'Ошибка загрузки XML');
		}

		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(response.xmlText, 'text/xml');
		return xmlDoc;
	};

	const findModuleVersion = (xmlDoc, moduleName) => {
		const modules = Array.from(xmlDoc.getElementsByTagName('module'));
		const target = moduleName.trim();
		const match = modules.find((moduleNode) => {
			const idNode = moduleNode.getElementsByTagName('id')[0];
			const id = idNode ? idNode.textContent.trim() : '';
			return id === target;
		});

		const versionNode = match?.getElementsByTagName('version')[0];
		const version = versionNode ? versionNode.textContent.trim() : '';
		return version || null;
	};

	const getSelectedCategory = () => {
		// Ищем контейнер с категорией
		const categoryLabel = Array.from(document.querySelectorAll('*')).find(el => 
			el.textContent.trim() === 'Категория' && el.childNodes.length === 1
		);

		if (!categoryLabel) return null;

		const container = categoryLabel.parentElement;
		const selectedItems = container?.querySelector('.selected-items');
		const selectedItem = selectedItems?.querySelector('.selected-item');

		if (selectedItem) {
			return selectedItem.textContent.trim();
		}

		// Если ничего не выбрано, возвращаем null
		return null;
	};

	const handleClick = async (button) => {
		const moduleName = getSelectedCategory();

		if (!moduleName) {
			setButtonState(button, { message: 'Категория не выбрана' });
			alert('Пожалуйста, выберите категорию (модуль) перед получением версии');
			return;
		}

		setButtonState(button, { loading: true, message: 'Загрузка версии...' });

		try {
			const xmlDoc = await fetchEtalonXml();
			const version = findModuleVersion(xmlDoc, moduleName);

			if (!version) {
				const message = `Версия не найдена для ${moduleName}`;
				setButtonState(button, { message });
				alert(message);
				return;
			}

			const input = document.querySelector(VERSION_INPUT_SELECTOR);
			if (!input) {
				setButtonState(button, { message: 'Поле версии не найдено' });
				alert('Поле версии не найдено на странице');
				return;
			}

			input.value = version;
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
			
			setButtonState(button, { message: `Вставлена версия ${version}` });
			
			// Показываем уведомление
			const notification = document.createElement('div');
			notification.textContent = `✓ Версия ${version} для ${moduleName} успешно вставлена`;
			notification.style.cssText = `
				position: fixed;
				top: 20px;
				right: 20px;
				background: #4CAF50;
				color: white;
				padding: 12px 20px;
				border-radius: 6px;
				box-shadow: 0 4px 12px rgba(0,0,0,0.15);
				z-index: 10000;
				font-size: 14px;
			`;
			document.body.appendChild(notification);
			setTimeout(() => notification.remove(), 3000);

		} catch (error) {
			console.error('Ошибка получения версии с эталона:', error);
			setButtonState(button, { message: 'Ошибка загрузки версии' });
			alert('Ошибка при получении версии с эталона: ' + error.message);
		} finally {
			setButtonState(button, { loading: false });
		}
	};

	const insertButtonIfNeeded = () => {
		// Ищем поле версии
		const versionInput = document.querySelector(VERSION_INPUT_SELECTOR);
		if (!versionInput) return false;

		// Проверяем, не добавлена ли уже кнопка
		const container = versionInput.closest('.form-field-content, .form-input-container');
		if (!container) return false;

		if (container.querySelector(`#${BUTTON_ID}`)) {
			return true;
		}

		// Добавляем кнопку
		const button = createButton();
		const inputContainer = versionInput.parentElement;
		if (inputContainer) {
			inputContainer.appendChild(button);
		} else {
			container.appendChild(button);
		}

		return true;
	};

	const init = () => {
		// Пробуем сразу вставить кнопку
		if (insertButtonIfNeeded()) return;

		// Если не получилось, наблюдаем за изменениями DOM
		const observer = new MutationObserver(() => {
			if (insertButtonIfNeeded()) {
				observer.disconnect();
			}
		});

		const root = document.documentElement || document.body;
		if (root) {
			observer.observe(root, { childList: true, subtree: true });
		}

		// Также пробуем периодически (на случай динамической загрузки Vue)
		const intervalId = setInterval(() => {
			if (insertButtonIfNeeded()) {
				clearInterval(intervalId);
			}
		}, 1000);

		// Останавливаем через 10 секунд
		setTimeout(() => clearInterval(intervalId), 10000);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
