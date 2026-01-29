(() => {
	const BUTTON_ID = 'qa-etalon-version-btn';
	const TARGET_INPUT_XPATH = "//input[@name='custom_field_17']";
	const TARGET_TD_XPATH = "//input[@name='custom_field_17']//ancestor::td";
	const CATEGORY_SELECT_SELECTOR = "select[name='category']";
	const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
	const STYLE_ID = 'qa-etalon-version-style';
	
	// Определяем тип страницы
	const isVuePage = () => window.location.pathname.includes('_vue.php');

	const evaluateXPath = (xpath, context = document) => {
		return document.evaluate(
			xpath,
			context,
			null,
			XPathResult.FIRST_ORDERED_NODE_TYPE,
			null
		).singleNodeValue;
	};

	const getTargetInput = () => evaluateXPath(TARGET_INPUT_XPATH);
	const getTargetTd = () => evaluateXPath(TARGET_TD_XPATH);

	const showToastSafe = (message) => {
		if (typeof showToast === 'function') {
			showToast(message);
		}
	};

	const ensureStyles = () => {
		if (document.getElementById(STYLE_ID)) return;
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			.qa-etalon-btn {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				padding: 4px 10px;
				border-radius: 6px;
				border: 1px solid rgba(94, 82, 64, 0.2);
				background: rgba(94, 82, 64, 0.12);
				color: #13343b;
				font-size: 12px;
				font-weight: 500;
				cursor: pointer;
				transition: all 150ms cubic-bezier(0.16, 1, 0.3, 1);
			}
			.qa-etalon-btn:hover {
				background: rgba(94, 82, 64, 0.2);
				border-color: rgba(94, 82, 64, 0.3);
			}
			.qa-etalon-btn:active {
				background: rgba(94, 82, 64, 0.25);
				transform: translateY(1px);
			}
			.qa-etalon-btn:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
			.qa-etalon-btn__dot {
				width: 8px;
				height: 8px;
				border-radius: 999px;
				background: #21808d;
				box-shadow: 0 0 0 2px rgba(33, 128, 141, 0.2);
			}
			
			/* Стили для темной темы (Vue версия) */
			body.dark .qa-etalon-btn {
				border: 1px solid rgba(255, 255, 255, 0.15);
				background: rgba(255, 255, 255, 0.08);
				color: #e8eaed;
			}
			body.dark .qa-etalon-btn:hover {
				background: rgba(255, 255, 255, 0.12);
				border-color: rgba(255, 255, 255, 0.25);
			}
			body.dark .qa-etalon-btn:active {
				background: rgba(255, 255, 255, 0.16);
			}
		`;
		document.head.appendChild(style);
	};

	const setButtonState = (button, { loading, message }) => {
		if (!button) return;
		if (typeof loading === 'boolean') {
			button.disabled = loading;
			button.dataset.loading = loading ? '1' : '0';
			
			// Обновляем текст для обеих версий
			if (isVuePage()) {
				button.textContent = loading ? 'Загрузка...' : 'Версия на эталоне';
			}
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
		button.className = isVuePage() ? 'qa-etalon-btn' : 'button';
		button.innerHTML = isVuePage() ? 'Версия на эталоне' : '<span>Версия на эталоне</span>';
		button.style.marginLeft = '8px';
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
	
	// Получение выбранной категории для Vue страницы
	const getSelectedCategoryVue = () => {
		const categoryLabel = Array.from(document.querySelectorAll('*')).find(el => 
			el.textContent.trim() === 'Категория' && el.childNodes.length === 1
		);

		if (!categoryLabel) return null;

		const container = categoryLabel.parentElement;
		const selectedItems = container?.querySelector('.selected-items');
		const selectedItem = selectedItems?.querySelector('.selected-item');

		return selectedItem ? selectedItem.textContent.trim() : null;
	};
	
	// Получение поля версии для Vue страницы
	const getVersionInputVue = () => document.querySelector('input[placeholder="0.0.0"]');
	
	// Показ уведомления для Vue страницы
	const showNotificationVue = (message, isError = false) => {
		const notification = document.createElement('div');
		notification.textContent = message;
		notification.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: ${isError ? '#f44336' : '#4CAF50'};
			color: white;
			padding: 12px 20px;
			border-radius: 6px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.15);
			z-index: 10000;
			font-size: 14px;
		`;
		document.body.appendChild(notification);
		setTimeout(() => notification.remove(), 3000);
	};

	const handleClick = async (button) => {
		let moduleName, versionInput;
		
		// Определяем версию страницы и получаем данные
		if (isVuePage()) {
			moduleName = getSelectedCategoryVue();
			versionInput = getVersionInputVue();
			
			if (!moduleName) {
				setButtonState(button, { message: 'Категория не выбрана' });
				showNotificationVue('Пожалуйста, выберите категорию (модуль)', true);
				return;
			}
		} else {
			const select = document.querySelector(CATEGORY_SELECT_SELECTOR);
			moduleName = select?.value?.trim();
			versionInput = getTargetInput();
			
			if (!moduleName) {
				setButtonState(button, { message: 'Категория не выбрана' });
				showToastSafe('Категория не выбрана');
				return;
			}
		}

		setButtonState(button, { loading: true, message: 'Загрузка версии...' });

		try {
			const xmlDoc = await fetchEtalonXml();
			const version = findModuleVersion(xmlDoc, moduleName);

			if (!version) {
				const message = `Версия не найдена для ${moduleName}`;
				setButtonState(button, { message });
				if (isVuePage()) {
					showNotificationVue(message, true);
				} else {
					showToastSafe(message);
				}
				return;
			}

			if (!versionInput) {
				setButtonState(button, { message: 'Поле версии не найдено' });
				if (isVuePage()) {
					showNotificationVue('Поле версии не найдено', true);
				} else {
					showToastSafe('Поле версии не найдено');
				}
				return;
			}

			versionInput.value = version;
			versionInput.dispatchEvent(new Event('input', { bubbles: true }));
			versionInput.dispatchEvent(new Event('change', { bubbles: true }));
			setButtonState(button, { message: `Вставлена версия ${version}` });
			
			if (isVuePage()) {
				showNotificationVue(`✓ Версия ${version} для ${moduleName} успешно вставлена`);
			}
		} catch (error) {
			console.error('Ошибка получения версии с эталона:', error);
			setButtonState(button, { message: 'Ошибка загрузки версии' });
			if (isVuePage()) {
				showNotificationVue('Ошибка при получении версии: ' + error.message, true);
			} else {
				showToastSafe('Ошибка загрузки версии');
			}
		} finally {
			setButtonState(button, { loading: false });
		}
	};

	const insertButtonIfNeeded = () => {
		if (isVuePage()) {
			// Логика для Vue версии
			const versionInput = getVersionInputVue();
			if (!versionInput) return false;

			const container = versionInput.closest('.form-field-content, .form-input-container');
			if (!container) return false;

			if (container.querySelector(`#${BUTTON_ID}`)) {
				return true;
			}

			const button = createButton();
			const inputContainer = versionInput.parentElement;
			if (inputContainer) {
				inputContainer.appendChild(button);
			} else {
				container.appendChild(button);
			}

			return true;
		} else {
			// Логика для старой версии
			const td = getTargetTd();
			if (!td) return false;

			if (td.querySelector(`#${BUTTON_ID}`)) {
				return true;
			}

			const button = createButton();
			const input = getTargetInput();
			if (input?.parentElement) {
				input.parentElement.appendChild(button);
			} else {
				td.appendChild(button);
			}

			return true;
		}
	};

	const init = () => {
		if (insertButtonIfNeeded()) return;

		const observer = new MutationObserver(() => {
			if (insertButtonIfNeeded()) {
				observer.disconnect();
			}
		});

		const root = document.documentElement || document.body;
		if (root) {
			observer.observe(root, { childList: true, subtree: true });
		}
		
		// Для Vue версии: дополнительная проверка через интервал
		if (isVuePage()) {
			const intervalId = setInterval(() => {
				if (insertButtonIfNeeded()) {
					clearInterval(intervalId);
				}
			}, 1000);
			
			setTimeout(() => clearInterval(intervalId), 10000);
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
