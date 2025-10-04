// content.js - Text selection handling for ChatGPT and Claude pages

/**
 * PopupManager - 확장 팝업 관리자
 * 페이지 내에서 표시되는 저장 팝업의 생명주기를 관리합니다.
 * TDD 방식으로 개발되었습니다.
 */
class PopupManager {
    constructor() {
        this.popup = null;
        this.isVisible = false;
        this.currentSelection = null;
        this.popupWidth = 320;
        this.popupHeight = 450;
        this.margin = 20;
        this.spacing = 10;
    }

    /**
     * 선택된 텍스트 기반으로 팝업 표시
     * @param {Selection} selection - 사용자가 선택한 텍스트
     * @param {Object} options - 추가 옵션
     */
    showSelectionPopup(selection, options = {}) {
        // 성능 측정 시작
        const startTime = performance.now();

        if (!selection || selection.toString().trim().length === 0) {
            console.warn('PopupManager: 선택된 텍스트가 없습니다.');
            return;
        }

        this.currentSelection = selection;

        // 팝업이 이미 존재하면 제거
        this.hideSelectionPopup();

        // 팝업 생성
        this.popup = this.createPopupElement();

        // 위치 계산 및 설정
        const position = this.calculatePopupPosition(selection, window);
        this.setPopupPosition(position);

        // 팝업 내용 채우기
        this.populatePopupContent(selection, options);

        // DOM에 추가
        document.body.appendChild(this.popup);
        this.isVisible = true;

        // 이벤트 리스너 설정
        this.setupEventListeners();

        // 접근성 포커스
        const titleInput = this.popup.querySelector('#popup-title-input');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }

        // 성능 측정 완료
        const endTime = performance.now();
        const loadTime = endTime - startTime;

        console.log(`⏱️ 팝업 로딩 시간: ${loadTime.toFixed(2)}ms`);

        // 성능 모니터링
        this.monitorPerformance(loadTime, options);
    }

    /**
     * 팝업 숨기기
     */
    hideSelectionPopup() {
        if (this.popup && this.popup.parentNode) {
            this.popup.parentNode.removeChild(this.popup);
            this.popup = null;
            this.isVisible = false;
            this.currentSelection = null;
        }
    }

    /**
     * 팝업 HTML 요소 생성
     * @returns {HTMLElement} 팝업 요소
     */
    createPopupElement() {
        const popup = document.createElement('div');
        popup.className = 'chat-ai-popup-overlay';
        popup.setAttribute('role', 'dialog');
        popup.setAttribute('aria-modal', 'true');
        popup.setAttribute('aria-label', 'Save Clip');
        popup.tabIndex = '0';

        // 기본 HTML 구조
        popup.innerHTML = `
            <div class="popup-container">
                <div class="popup-header">
                    <div class="header-left">
                        <span class="app-logo">📋</span>
                        <h2 class="popup-title">Save Clip</h2>
                    </div>
                    <button class="close-btn" aria-label="Close popup">&times;</button>
                </div>

                <div class="popup-content">
                    <div class="form-group">
                        <label for="popup-title-input">
                            <span class="label-icon">📝</span>
                            Title
                        </label>
                        <input
                            type="text"
                            id="popup-title-input"
                            class="title-input"
                            placeholder="AI personalized learning algorithms | ChatGPT"
                            maxlength="60"
                        />
                    </div>

                    <div class="form-group">
                        <label for="popup-preview-text">
                            <span class="label-icon">📖</span>
                            Preview
                        </label>
                        <div id="popup-preview-text" class="preview-text" readonly></div>
                    </div>

                    <div class="form-group">
                        <label for="popup-category-select">
                            <span class="label-icon">📂</span>
                            Category
                        </label>
                        <select id="popup-category-select" class="category-select">
                            <option value="">Select Category</option>
                        </select>
                    </div>

                    <button id="popup-save-btn" class="save-btn">
                        Save Clip
                    </button>
                </div>
            </div>
        `;

        return popup;
    }

    /**
     * 팝업 위치 계산
     * @param {Selection} selection - 선택 영역
     * @param {Window} windowObj - 윈도우 객체
     * @returns {Object} {left, top} 위치 정보
     */
    calculatePopupPosition(selection, windowObj) {
        const rect = selection.getBoundingClientRect();
        const scrollTop = windowObj.scrollY || windowObj.pageYOffset;
        const scrollLeft = windowObj.scrollX || windowObj.pageXOffset;

        // 기본 위치: 선택 영역 중앙 아래
        let left = rect.left + scrollLeft + (rect.width / 2) - (this.popupWidth / 2);
        let top = rect.bottom + scrollTop + this.spacing;

        // 오른쪽 경계 체크
        if (left + this.popupWidth > windowObj.innerWidth + scrollLeft - this.margin) {
            left = windowObj.innerWidth + scrollLeft - this.popupWidth - this.margin;
        }

        // 왼쪽 경계 체크
        if (left < scrollLeft + this.margin) {
            left = scrollLeft + this.margin;
        }

        // 아래쪽 경계 체크
        if (top + this.popupHeight > windowObj.innerHeight + scrollTop - this.margin) {
            // 선택 영역 위에 표시
            top = rect.top + scrollTop - this.popupHeight - this.spacing;
        }

        // 위쪽 경계 체크
        if (top < scrollTop + this.margin) {
            top = scrollTop + this.margin;
        }

        return { left, top };
    }

    /**
     * 팝업 위치 설정
     * @param {Object} position - {left, top} 위치
     */
    setPopupPosition(position) {
        if (!this.popup) return;

        this.popup.style.position = 'absolute';
        this.popup.style.left = `${position.left}px`;
        this.popup.style.top = `${position.top}px`;
        this.popup.style.zIndex = '10000';
    }

    /**
     * 팝업 내용 채우기
     * @param {Selection} selection - 선택된 텍스트
     * @param {Object} options - 추가 옵션
     */
    populatePopupContent(selection, options = {}) {
        const selectedText = selection.toString().trim();

        // 제목 자동 생성
        const titleInput = this.popup.querySelector('#popup-title-input');
        const autoTitle = this.generateAutoTitle(selectedText, options);
        titleInput.value = autoTitle;

        // 미리보기 텍스트
        const previewText = this.popup.querySelector('#popup-preview-text');
        const preview = this.generatePreviewText(selectedText);
        previewText.textContent = preview;

        // 카테고리 옵션 (나중에 CategoryManager와 연동)
        this.populateCategoryOptions(options.categories || []);
    }

    /**
     * 자동 제목 생성
     * @param {string} text - 선택된 텍스트
     * @param {Object} options - 옵션
     * @returns {string} 생성된 제목
     */
    generateAutoTitle(text, options = {}) {
        const firstLine = text.split('\n')[0].trim();
        const truncatedTitle = firstLine.length > 40 ?
            firstLine.substring(0, 37) + '...' : firstLine;

        const aiService = options.aiService || this.detectAIService() || 'AI';

        return `${truncatedTitle} | ${aiService}`;
    }

    /**
     * 미리보기 텍스트 생성
     * @param {string} text - 선택된 텍스트
     * @returns {string} 미리보기 텍스트
     */
    generatePreviewText(text) {
        const lines = text.split('\n');
        // 첫 줄 제외
        const remainingLines = lines.slice(1).join('\n').trim();

        if (remainingLines.length === 0) {
            return text.length > 100 ? text.substring(0, 97) + '...' : text;
        }

        return remainingLines.length > 100 ?
            remainingLines.substring(0, 97) + '...' : remainingLines;
    }

    /**
     * AI 서비스 감지
     * @returns {string|null} 감지된 AI 서비스명
     */
    detectAIService() {
        const hostname = window.location.hostname;
        const url = window.location.href;

        // OpenAI 계열
        if (hostname.includes('chat.openai.com')) return 'ChatGPT';
        if (hostname.includes('openai.com')) return 'OpenAI';

        // Anthropic 계열
        if (hostname.includes('claude.ai')) return 'Claude';
        if (hostname.includes('anthropic.com')) return 'Anthropic';

        // Google 계열
        if (hostname.includes('gemini.google.com')) return 'Gemini';
        if (hostname.includes('bard.google.com')) return 'Bard';
        if (hostname.includes('notebooklm.google.com')) return 'NotebookLM';

        // Microsoft 계열
        if (hostname.includes('copilot.microsoft.com')) return 'Copilot';
        if (hostname.includes('bing.com')) return 'Bing Chat';

        // 기타 AI 서비스
        if (hostname.includes('perplexity.ai')) return 'Perplexity';
        if (hostname.includes('poe.com')) return 'Poe';
        if (hostname.includes('character.ai')) return 'Character AI';
        if (hostname.includes('huggingface.co')) return 'HuggingFace';
        if (hostname.includes('anthropic.com')) return 'Anthropic';
        if (hostname.includes('mistral.ai')) return 'Mistral';
        if (hostname.includes('groq.com')) return 'Groq';
        if (hostname.includes('replit.com')) return 'Replit';
        if (hostname.includes('codeium.com')) return 'Codeium';
        if (hostname.includes('tabnine.com')) return 'Tabnine';

        // URL 패턴 기반 추가 감지
        if (url.includes('/chat') || url.includes('/ai')) {
            // 일반적인 AI 채팅 인터페이스
            if (hostname.includes('github')) return 'GitHub Copilot';
            if (hostname.includes('stackoverflow')) return 'Stack Overflow AI';
        }

        return null;
    }

    /**
     * 카테고리 옵션 채우기
     * @param {Array} categories - 카테고리 목록
     */
    populateCategoryOptions(categories) {
        const select = this.popup.querySelector('#popup-category-select');

        // 기존 옵션 제거 (첫 번째 옵션 제외)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // 카테고리 옵션 추가
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        if (!this.popup) return;

        // 닫기 버튼
        const closeBtn = this.popup.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.hideSelectionPopup());

        // 저장 버튼
        const saveBtn = this.popup.querySelector('#popup-save-btn');
        saveBtn.addEventListener('click', () => this.handleSave());

        // 카테고리 선택 - Select 요소 특수 처리
        const categorySelect = this.popup.querySelector('#popup-category-select');
        if (categorySelect) {
            // Select 요소의 모든 마우스 이벤트에 대해 버블링 방지
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                categorySelect.addEventListener(eventType, (event) => {
                    event.stopPropagation(); // Select 요소의 이벤트 버블링 방지
                });
            });

            // Select 옵션들에 대한 이벤트 처리 (이벤트 위임)
            categorySelect.addEventListener('click', (event) => {
                // 실제 옵션이 클릭되었을 때만 처리
                if (event.target.tagName === 'OPTION') {
                    event.stopPropagation();
                    console.log('카테고리 옵션 선택:', event.target.value);
                }
            });

            // change 이벤트는 정상적으로 동작해야 함
            categorySelect.addEventListener('change', (event) => {
                console.log('카테고리 변경:', event.target.value);
            });
        }

        // 팝업 내부 모든 인터랙티브 요소에 대한 포괄적 이벤트 처리
        const interactiveElements = this.popup.querySelectorAll('input, button, textarea, [tabindex]');
        interactiveElements.forEach(element => {
            // 모든 인터랙티브 요소의 마우스 이벤트에 대해 버블링 방지
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                element.addEventListener(eventType, (event) => {
                    event.stopPropagation(); // 모든 인터랙티브 요소의 이벤트 버블링 방지
                });
            });
        });

        // 팝업 전체에 대한 이벤트 위임 패턴
        this.popup.addEventListener('mousedown', (event) => {
            // 팝업 내부의 모든 요소 클릭 시 버블링 방지
            if (event.target.closest('.popup-container')) {
                event.stopPropagation();
            }
        });

        // 외부 클릭 감지
        document.addEventListener('click', this.handleOutsideClick.bind(this));

        // ESC 키 감지
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // 키보드 네비게이션
        this.popup.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
    }

    /**
     * 외부 클릭 처리
     * @param {MouseEvent} event
     */
    handleOutsideClick(event) {
        if (this.popup && !this.popup.contains(event.target)) {
            this.hideSelectionPopup();
        }
    }

    /**
     * 키 다운 이벤트 처리
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        if (event.key === 'Escape' && this.isVisible) {
            this.hideSelectionPopup();
            event.preventDefault();
        }
    }

    /**
     * 키보드 네비게이션 처리
     * @param {KeyboardEvent} event
     */
    handleKeyboardNavigation(event) {
        // Tab 키로 포커스 이동 관리
        if (event.key === 'Tab') {
            const focusableElements = this.popup.querySelectorAll(
                'button, input, select, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }

    /**
     * 저장 처리
     */
    handleSave() {
        const title = this.popup.querySelector('#popup-title-input').value.trim();
        const categoryId = this.popup.querySelector('#popup-category-select').value;

        if (!title) {
            alert('제목을 입력해주세요.');
            return;
        }

        // 실제 저장 로직은 나중에 ClipManager와 연동
        console.log('저장될 클립:', {
            title,
            categoryId,
            text: this.currentSelection.toString(),
            url: window.location.href,
            source: this.detectAIService()
        });

        // 저장 완료 토스트 표시
        this.showToast('Saved ✓');

        // 팝업 닫기
        this.hideSelectionPopup();
    }

    /**
     * 토스트 메시지 표시
     * @param {string} message - 표시할 메시지
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'chat-ai-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(toast);

        // 표시
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // 자동 제거
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 2000);
    }

    /**
     * 성능 모니터링
     * @param {number} loadTime - 로딩 시간
     * @param {Object} options - 추가 옵션
     */
    monitorPerformance(loadTime, options = {}) {
        // 성능 기준 설정
        const performanceThresholds = {
            excellent: 100,  // 100ms 미만: 우수
            good: 200,       // 200ms 미만: 양호
            poor: 500        // 500ms 미만: 개선 필요
        };

        let performanceLevel;
        if (loadTime < performanceThresholds.excellent) {
            performanceLevel = '우수';
        } else if (loadTime < performanceThresholds.good) {
            performanceLevel = '양호';
        } else {
            performanceLevel = '개선 필요';
        }

        console.log(`📊 성능 평가: ${performanceLevel} (${loadTime.toFixed(2)}ms)`);

        // 성능 데이터 저장 (추후 분석을 위해)
        this.savePerformanceData({
            loadTime,
            performanceLevel,
            timestamp: Date.now(),
            url: window.location.href,
            aiService: options.aiService || 'unknown',
            isShadowDOM: options.isShadowDOM || false
        });
    }

    /**
     * 성능 데이터 저장
     * @param {Object} data - 성능 데이터
     */
    savePerformanceData(data) {
        try {
            // Chrome 스토리지에 성능 데이터 저장
            const key = 'popup_performance_data';
            chrome.storage.local.get([key], (result) => {
                const existingData = result[key] || [];
                existingData.push(data);

                // 최대 100개 데이터만 유지
                if (existingData.length > 100) {
                    existingData.shift();
                }

                chrome.storage.local.set({ [key]: existingData });
            });
        } catch (error) {
            console.warn('성능 데이터 저장 실패:', error);
        }
    }

    /**
     * 이벤트 리스너 정리
     */
    cleanup() {
        this.hideSelectionPopup();
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

class TextSelectionHandler {
  constructor() {
    this.currentSelection = '';
    this.isInitialized = false;
    this.popupManager = null;
    this.shadowDOMObservers = [];
    this.init();
  }

  async init() {
    console.log('🎯 ClipGo Content Script initialized');

    // Load CSS for popup styling
    this.loadPopupCSS();

    // Initialize PopupManager (now included directly)
    this.popupManager = new PopupManager();
    console.log('✅ PopupManager initialized');

    // Check if we're in ChatGPT or Claude
    const isChatGPT = window.location.href.includes('chat.openai.com');
    const isClaude = window.location.href.includes('claude.ai');

    console.log('🌐 Page detected - ChatGPT:', isChatGPT, 'Claude:', isClaude);

    // Force initialization with multiple attempts for ChatGPT/Claude
    if (isChatGPT || isClaude) {
      this.initializeForSecureSites();
    } else {
      // Normal initialization for other sites
      setTimeout(() => {
        console.log('⚡ Setting up event listeners...');
        this.setupEventListeners();
      }, 1000);
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Message received:', request);

      if (request.action === 'getSelectedText') {
        console.log('📝 Returning selected text:', this.currentSelection);
        sendResponse({ text: this.currentSelection });
      } else if (request.action === 'getCategories') {
        this.handleGetCategories(sendResponse);
        return true; // Indicates async response
      } else if (request.action === 'saveCurrentSelection') {
        console.log('💾 User triggered save!');
        this.handleUserTriggeredSave();
        return true;
      }
    });
  }

  initializeForSecureSites() {
    console.log('🔒 Initializing for secure site (ChatGPT/Claude)...');

    // Multiple attempts with increasing delays
    const attempts = [1000, 3000, 5000, 8000];

    attempts.forEach((delay, index) => {
      setTimeout(() => {
        if (!this.isInitialized) {
          console.log(`🔄 Attempt ${index + 1} to setup event listeners (${delay}ms)...`);
          this.setupEventListeners();
        }
      }, delay);
    });
  }

  setupEventListeners() {
    console.log('🎧 Setting up text selection listeners...');

    // Check if document is ready
    if (!document || !document.addEventListener) {
      console.log('❌ Document not ready yet');
      return;
    }

    // Mark as initialized
    this.isInitialized = true;

    // More robust event detection for React apps
    const handleSelection = (event) => {
      // Debounce to avoid multiple triggers
      clearTimeout(this.selectionTimeout);
      this.selectionTimeout = setTimeout(() => {
        this.handleTextSelection(event);
      }, 300);
    };

    // Try multiple event types with capture
    try {
      document.addEventListener('mouseup', handleSelection, true);
      document.addEventListener('keyup', handleSelection, true);
      document.addEventListener('selectionchange', handleSelection, true);

      // Also try window events for more coverage
      window.addEventListener('mouseup', handleSelection, true);
      window.addEventListener('keyup', handleSelection, true);

      // Shadow DOM 지원 설정
      this.setupShadowDOMListeners(handleSelection);

      console.log('✅ Event listeners added successfully');
    } catch (error) {
      console.error('❌ Error adding event listeners:', error);
    }

    // Add drag and drop support with higher priority
    this.setupDragAndDrop();

    // Test selection immediately
    this.testSelection();
  }

  testSelection() {
    // Test if we can detect current selection
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      console.log('🧪 Found existing selection:', selection.toString().substring(0, 100));
      this.currentSelection = selection.toString().trim();
    } else {
      console.log('🧪 No existing selection found');
    }
  }

  async handleGetCategories(sendResponse) {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCategories' });
      sendResponse(response);
    } catch (error) {
      console.error('Error getting categories:', error);
      sendResponse({ error: error.message });
    }
  }

  handleTextSelection(event = null) {
    try {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        this.currentSelection = '';
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        this.currentSelection = selectedText;
        console.log('Text selected:', selectedText.substring(0, 100)); // Debug log

        // Shadow DOM 여부 확인
        const isShadowDOM = event ? this.isInShadowDOM(event.target) : false;

        // Show popup for all sites including AI sites
        if (this.popupManager) {
          this.popupManager.showSelectionPopup(selection, {
            aiService: this.detectAIService(),
            isShadowDOM: isShadowDOM
          });
        } else {
          console.warn('PopupManager not loaded yet');
        }
      }
    } catch (error) {
      console.error('Error in handleTextSelection:', error);
    }
  }

  /**
   * Shadow DOM 리스너 설정
   * @param {Function} handleSelection - 선택 핸들러
   */
  setupShadowDOMListeners(handleSelection) {
    // Shadow DOM 관찰자 설정
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.traverseAndAddShadowListeners(node, handleSelection);
          }
        });
      });
    });

    // 전체 문서 관찰
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.shadowDOMObservers.push(observer);

    // 기존 요소들에 대해서도 Shadow DOM 리스너 추가
    this.traverseAndAddShadowListeners(document.body, handleSelection);

    console.log('🌑 Shadow DOM listeners configured');
  }

  /**
   * 요소와 그 자식들을 순회하며 Shadow DOM 리스너 추가
   * @param {Node} node - 시작 노드
   * @param {Function} handleSelection - 선택 핸들러
   */
  traverseAndAddShadowListeners(node, handleSelection) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node;

    // Shadow Root 확인
    if (element.shadowRoot) {
      element.shadowRoot.addEventListener('mouseup', handleSelection, true);
      element.shadowRoot.addEventListener('keyup', handleSelection, true);
      console.log('🌑 Added listeners to Shadow DOM:', element);
    }

    // 자식 요소들 순회
    const children = element.children;
    for (let i = 0; i < children.length; i++) {
      this.traverseAndAddShadowListeners(children[i], handleSelection);
    }
  }

  /**
   * 요소가 Shadow DOM 내부에 있는지 확인
   * @param {Element} element - 확인할 요소
   * @returns {boolean} Shadow DOM 내부 여부
   */
  isInShadowDOM(element) {
    while (element) {
      if (element.getRootNode() instanceof ShadowRoot) {
        return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  handleUserTriggeredSave() {
    try {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        this.showToast('Please select some text first', 'error');
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        this.currentSelection = selectedText;
        if (this.popupManager) {
          this.popupManager.showSelectionPopup(selection, {
            aiService: this.detectAIService()
          });
        } else {
          console.warn('PopupManager not loaded yet');
        }
        console.log('User-triggered save for:', selectedText.substring(0, 100)); // Debug log
      } else {
        this.showToast('No text selected', 'error');
      }
    } catch (error) {
      console.error('Error in handleUserTriggeredSave:', error);
      this.showToast('Error saving selection', 'error');
    }
  }

  setupDragAndDrop() {
    let draggedText = '';

    // Handle drag start
    document.addEventListener('dragstart', (e) => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        draggedText = selection.toString().trim();
        if (draggedText.length > 0) {
          this.currentSelection = draggedText;

          // Add visual feedback
          const dragImage = document.createElement('div');
          dragImage.textContent = '💾 Save Clip';
          dragImage.style.cssText = `
            position: fixed;
            top: -1000px;
            left: -1000px;
            background: #6c5ce7;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
          `;
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 50, 20);

          // Clean up drag image
          setTimeout(() => {
            dragImage.remove();
          }, 100);
        }
      }
    });

    // Handle drag end
    document.addEventListener('dragend', (e) => {
      draggedText = '';
      this.removeDragTarget();
    });

    // Handle drag over
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedText.length > 0) {
        this.showDragTarget(e.clientX, e.clientY);
      }
    });

    // Handle drop
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedText.length > 0) {
        if (this.popupManager) {
          this.popupManager.showSelectionPopup(window.getSelection(), {
            aiService: this.detectAIService()
          });
        } else {
          console.warn('PopupManager not loaded yet');
        }
        draggedText = '';
      }
      this.removeDragTarget();
    });

    // Handle drag leave
    document.addEventListener('dragleave', (e) => {
      if (e.clientX === 0 && e.clientY === 0) {
        this.removeDragTarget();
      }
    });
  }

  showDragTarget(x, y) {
    // Remove existing target
    this.removeDragTarget();

    // Create drop target indicator
    const target = document.createElement('div');
    target.id = 'clip-drag-target';
    target.style.cssText = `
      position: fixed;
      top: ${y - 30}px;
      left: ${x - 50}px;
      width: 100px;
      height: 60px;
      background: rgba(108, 92, 231, 0.2);
      border: 2px dashed #6c5ce7;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999997;
      pointer-events: none;
      animation: pulse 1s infinite;
    `;
    target.innerHTML = '<span style="color: #6c5ce7; font-weight: 500; font-size: 12px;">💾 Drop to save</span>';

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.5; transform: scale(0.95); }
        50% { opacity: 1; transform: scale(1.05); }
        100% { opacity: 0.5; transform: scale(0.95); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(target);
  }

  removeDragTarget() {
    const target = document.getElementById('clip-drag-target');
    if (target) {
      target.remove();
    }
  }

  showSavePopup(selection) {
    // Remove any existing popups
    this.removeSavePopup();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Detect source
    const source = this.detectSource();
    const defaultTitle = this.generateDefaultTitle(this.currentSelection, source);

    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.id = 'clip-saver-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    `;

    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'clip-saver-popup';
    // Get translations from Chrome i18n API
    const saveClipText = chrome.i18n.getMessage('saveClip') || 'Save Clip';
    const titleText = chrome.i18n.getMessage('title') || 'Title';
    const previewText = chrome.i18n.getMessage('preview') || 'Preview';
    const categoriesText = chrome.i18n.getMessage('categories') || 'Category';
    const selectCategoryText = chrome.i18n.getMessage('selectCategory') || 'Select Category';
    const cancelText = chrome.i18n.getMessage('cancel') || 'Cancel';

    popup.innerHTML = `
      <div class="popup-header">
        <div class="popup-title">${saveClipText}</div>
      </div>

      <div class="popup-form">
        <div class="form-group">
          <label class="form-label">
            <span class="label-icon">📝</span>
            ${titleText}
          </label>
          <input type="text" id="clip-title-input" class="form-input"
                 placeholder="AI personalized learning algorithms | ChatGPT"
                 value="${defaultTitle}" maxlength="60">
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="label-icon">📖</span>
            ${previewText}
          </label>
          <div class="preview-area">
            ${this.generatePreview(this.currentSelection, defaultTitle)}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="label-icon">📂</span>
            ${categoriesText}
          </label>
          <div class="category-selector">
            <select id="clip-category-select" class="form-select">
              <option value="">${selectCategoryText}</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button id="cancel-save-btn" class="btn btn-secondary">${cancelText}</button>
          <button id="save-clip-btn" class="btn btn-primary">${saveClipText}</button>
        </div>
      </div>
    `;

    // Add popup styles
    const popupStyles = document.createElement('style');
    popupStyles.textContent = this.getPopupStyles();
    document.head.appendChild(popupStyles);

    // Append to overlay
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Add event listeners
    this.addPopupEventListeners(popup);

    // Load categories
    this.loadCategories();

    // Focus on title input
    setTimeout(() => {
      document.getElementById('clip-title-input').focus();
    }, 100);

    // Auto-hide after 30 seconds of inactivity (increased from 10)
    this.popupTimeout = setTimeout(() => {
      this.removeSavePopup();
    }, 30000);
  }

  removeSavePopup() {
    const overlay = document.getElementById('clip-saver-overlay');
    if (overlay) {
      overlay.remove();
    }
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
  }

  removeSelectionIndicator() {
    const indicator = document.getElementById('clip-saver-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  detectSource() {
    const url = window.location.href;
    if (url.includes('chat.openai.com')) return 'ChatGPT';
    if (url.includes('claude.ai')) return 'Claude';
    return 'AI';
  }

  generateDefaultTitle(text, source) {
    const firstLine = text.split('\n')[0].trim();
    const truncated = firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;
    return `${truncated} | ${source}`;
  }

  generatePreview(text, title) {
    const titlePart = title.split(' | ')[0];
    const firstLine = text.split('\n')[0].trim();
    let previewText = text;

    // Remove the title part from the beginning if it exists
    if (firstLine.startsWith(titlePart.substring(0, 20))) {
      previewText = text.substring(firstLine.length).trim();
    }

    // Get first 1-2 lines, max 100 characters
    const lines = previewText.split('\n').filter(line => line.trim());
    let result = '';

    for (const line of lines) {
      if (result.length + line.length > 100) break;
      result += (result ? '\n' : '') + line;
    }

    return result.length > 100 ? result.substring(0, 97) + '...' : result;
  }

  getPopupStyles() {
    return `
      #clip-saver-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2d3436;
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        z-index: 999999;
        animation: slideUp 0.3s ease-out;
      }

      #clip-saver-overlay {
        z-index: 999998;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translate(-50%, -40%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%);
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .popup-header {
        text-align: center;
        margin-bottom: 20px;
      }

      .popup-title {
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
      }

      .popup-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-label {
        font-size: 14px;
        font-weight: 500;
        color: #b2bec3;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .label-icon {
        font-size: 16px;
      }

      .form-input, .form-select {
        padding: 12px 16px;
        border: 1px solid #636e72;
        border-radius: 8px;
        background: #34495e;
        color: #ffffff;
        font-size: 14px;
        transition: all 0.2s ease;
      }

      .form-input:focus, .form-select:focus {
        outline: none;
        border-color: #6c5ce7;
        box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
      }

      .form-input::placeholder {
        color: #95a5a6;
      }

      .preview-area {
        padding: 12px 16px;
        border: 1px solid #636e72;
        border-radius: 8px;
        background: #2c3e50;
        color: #b2bec3;
        font-size: 14px;
        line-height: 1.5;
        max-height: 80px;
        overflow-y: auto;
        white-space: pre-wrap;
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 8px;
      }

      .btn {
        padding: 12px 24px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 80px;
      }

      .btn-secondary {
        background: #34495e;
        color: #b2bec3;
      }

      .btn-secondary:hover {
        background: #2c3e50;
      }

      .btn-primary {
        background: linear-gradient(135deg, #6c5ce7, #4b3baf);
        color: white;
      }

      .btn-primary:hover {
        background: linear-gradient(135deg, #5a4fd1, #3f2e96);
        transform: translateY(-1px);
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }
    `;
  }

  addPopupEventListeners(popup) {
    // Cancel button
    const cancelBtn = popup.querySelector('#cancel-save-btn');
    cancelBtn.addEventListener('click', () => {
      this.removeSavePopup();
    });

    // Save button
    const saveBtn = popup.querySelector('#save-clip-btn');
    saveBtn.addEventListener('click', () => {
      this.saveClipFromPopup();
    });

    // Enter key to save
    const titleInput = popup.querySelector('#clip-title-input');
    titleInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveClipFromPopup();
      }
    });

    // Click outside to close
    const overlay = document.getElementById('clip-saver-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.removeSavePopup();
      }
    });

    // Reset timeout on user interaction
    const resetTimeout = () => {
      if (this.popupTimeout) {
        clearTimeout(this.popupTimeout);
      }
      this.popupTimeout = setTimeout(() => {
        this.removeSavePopup();
      }, 30000);
    };

    [titleInput, saveBtn, cancelBtn].forEach(element => {
      element.addEventListener('input', resetTimeout);
      element.addEventListener('click', resetTimeout);
    });
  }

  async loadCategories() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getCategories' });
      const select = document.getElementById('clip-category-select');

      if (response && response.categories) {
        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select Category</option>';

        // Add categories to the dropdown
        response.categories.forEach(category => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async saveClipFromPopup() {
    const titleInput = document.getElementById('clip-title-input');
    const categorySelect = document.getElementById('clip-category-select');
    const saveBtn = document.getElementById('save-clip-btn');

    // Validate input
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }

    // Disable save button during operation
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const categoryId = categorySelect.value || null;

      await chrome.runtime.sendMessage({
        action: 'saveClipFromSelection',
        text: this.currentSelection,
        url: window.location.href,
        title: document.title,
        clipOptions: {
          title,
          categoryIds: categoryId ? [categoryId] : []
        }
      });

      this.removeSavePopup();
      this.showToast('✓ Saved', 'success');
    } catch (error) {
      console.error('Error saving clip:', error);
      this.showToast('Error saving clip', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Clip';
    }
  }

  async saveClipFromSelection() {
    if (!this.currentSelection) return;

    try {
      // Open popup and pre-fill the selected text
      await chrome.runtime.sendMessage({
        action: 'saveClipFromSelection',
        text: this.currentSelection,
        url: window.location.href,
        title: document.title
      });

      this.showToast('Opening popup to save clip...', 'info');
      this.removeSelectionIndicator();
    } catch (error) {
      console.error('Error saving clip from selection:', error);
      this.showToast('Error opening save popup', 'error');
    }
  }

  showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToast = document.getElementById('clip-saver-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Get translated message if available
    let translatedMessage = message;
    if (chrome.i18n) {
      const messageMap = {
        '✓ Saved': 'clipSaved',
        'Error saving clip': 'errorSavingClip',
        'Opening popup to save clip...': 'openingSavePopup',
        'Error opening save popup': 'errorOpeningSavePopup'
      };

      const translationKey = messageMap[message];
      if (translationKey) {
        translatedMessage = chrome.i18n.getMessage(translationKey) || message;
      }
    }

    const toast = document.createElement('div');
    toast.id = 'clip-saver-toast';
    toast.textContent = translatedMessage;

    // Color scheme based on type
    const colors = {
      success: '#00b894',
      error: '#d63031',
      info: '#4A90E2'
    };

    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type] || colors.success};
      color: white;
      padding: 16px 24px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10002;
      box-shadow: 0 8px 20px rgba(0,0,0,0.3);
      animation: toastSlideUp 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;

    // Add toast animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes toastSlideUp {
        0% {
          opacity: 0;
          transform: translateX(-50%) translateY(100px) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      toast.style.animation = 'toastSlideUp 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) reverse';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2000);
  }

  /**
   * Load popup CSS
   */
  loadPopupCSS() {
    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('popup-overlay.css');
      link.type = 'text/css';
      document.head.appendChild(link);
      console.log('✅ Popup CSS loaded');
    } catch (error) {
      console.error('❌ Error loading popup CSS:', error);
    }
  }

  }

// Initialize the text selection handler
const textSelectionHandler = new TextSelectionHandler();

// Export for debugging
window.textSelectionHandler = textSelectionHandler;