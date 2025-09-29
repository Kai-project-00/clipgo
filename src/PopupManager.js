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
        this.popup.focus();
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
     * 팝업 위치 계산 (테스트에서 검증된 로직)
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

        if (hostname.includes('chat.openai.com')) return 'ChatGPT';
        if (hostname.includes('claude.ai')) return 'Claude';
        if (hostname.includes('gemini.google.com')) return 'Gemini';
        if (hostname.includes('bard.google.com')) return 'Bard';

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
     * 이벤트 리스너 정리
     */
    cleanup() {
        this.hideSelectionPopup();
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleKeyDown);
    }
}

// 전역으로 내보내기
if (typeof window !== 'undefined') {
    window.PopupManager = PopupManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PopupManager;
}