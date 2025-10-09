// Popup.js - Main controller for the extension popup
class PopupController {
  constructor() {
    this.clips = [];
    this.categories = [];
    this.storageManager = null;
    this.categoryManager = null;
    this.clipManager = null;
    this.selectedCategoryId = null;
    this.init();
  }

  async init() {
    try {
      console.log('🚀 PopupController 초기화 시작...');

      // Check if required classes are available
      console.log('🔍 StorageManager available:', typeof StorageManager !== 'undefined');
      console.log('🔍 CategoryManager available:', typeof CategoryManager !== 'undefined');
      console.log('🔍 ClipManager available:', typeof ClipManager !== 'undefined');

      // Initialize StorageManager
      if (typeof StorageManager !== 'undefined') {
        console.log('📦 StorageManager 초기화 시작...');
        this.storageManager = new StorageManager();
        await this.storageManager.init();
        console.log('✅ StorageManager 초기화 완료:', this.storageManager.initialized);
      } else {
        console.error('❌ StorageManager 클래스를 찾을 수 없음');
        throw new Error('StorageManager class not found');
      }

      // Initialize CategoryManager
      if (typeof CategoryManager !== 'undefined' && this.storageManager) {
        console.log('📂 CategoryManager 초기화 시작...');
        this.categoryManager = new CategoryManager(this.storageManager);
        await this.categoryManager.init();
        console.log('✅ CategoryManager 초기화 완료');
      } else {
        console.warn('⚠️ CategoryManager를 초기화할 수 없음');
      }

      // Initialize ClipManager
      if (typeof ClipManager !== 'undefined' && this.storageManager) {
        console.log('📋 ClipManager 초기화 시작...');
        this.clipManager = new ClipManager(this.storageManager, this.categoryManager);
        await this.clipManager.init();
        console.log('✅ ClipManager 초기화 완료');
      } else {
        console.warn('⚠️ ClipManager를 초기화할 수 없음');
      }

      console.log('🔧 이벤트 리스너 설정...');
      this.setupEventListeners();

      console.log('📥 데이터 로딩 시작...');
      await this.loadData();

      console.log('🎨 뷰 업데이트 시작...');
      this.updateView();

      // 추가: 초기화 후 updateClipsList() 명시적 호출
      console.log('🔄 초기화 후 updateClipsList() 강제 호출...');
      setTimeout(() => {
        this.updateClipsList();
      }, 100);

      console.log('✅ PopupController 초기화 완료');
    } catch (error) {
      console.error('❌ Initialization error:', error);
      console.error('스택 트레이스:', error.stack);
      this.showToast(`Initialization failed: ${error.message}`, 'error');
    }
  }

  setupEventListeners() {
    // Header actions
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.showSettingsPanel();
    });

    // Test injection button
    document.getElementById('test-inject-btn')?.addEventListener('click', () => {
      this.testInjection();
    });

    // Save current selection button
    document.getElementById('save-selection-btn')?.addEventListener('click', () => {
      this.saveCurrentSelection();
    });

    // Library view
    document.getElementById('add-category-btn')?.addEventListener('click', () => {
      this.showAddCategoryDialog();
    });

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchClips(e.target.value);
      });
    }

    const categorySearchInput = document.getElementById('category-search-input');
    if (categorySearchInput) {
      categorySearchInput.addEventListener('input', (e) => {
        this.searchCategories(e.target.value);
      });
    }

    // Settings panel
    document.getElementById('close-settings')?.addEventListener('click', () => {
      this.hideSettingsPanel();
    });

    // Language and theme selectors
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.changeLanguage(e.target.value);
      });
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.changeTheme(e.target.value);
      });
    }

    // 스토리지 변경 리스너 설정
    this.setupStorageChangeListener();

    // 팝업 가시성 변경 감지
    this.setupVisibilityChangeListener();
  }

  /**
   * 스토리지 변경 리스너 설정
   */
  setupStorageChangeListener() {
    // 백그라운드에서 오는 스토리지 변경 메시지 수신
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'storageChanged') {
        console.log('Popup received storage change message:', request.dataType);
        this.handleStorageChange(request.dataType, request.changes);
      }
    });

    // 탭 메시지 수신 (드래그 팝업에서 오는 메시지)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'storageChanged') {
        console.log('Popup received tab message:', request.dataType);
        this.handleStorageChange(request.dataType, request.changes);
        sendResponse({success: true});
      }
    });

    // 직접 스토리지 변경 감지
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        Object.keys(changes).forEach(key => {
          if (key === 'clips' || key === 'categories') {
            console.log('Popup detected direct storage change:', key);
            this.handleStorageChange(key, changes[key]);
          }
        });
      }
    });
  }

  /**
   * 스토리지 변경 처리
   * @param {string} dataType - 변경된 데이터 타입
   * @param {Object} changes - 변경 정보
   */
  handleStorageChange(dataType, changes) {
    console.log(`🔄 Storage changed: ${dataType}`, changes);

    // 변경된 데이터만 새로고침
    if (dataType === 'clips') {
      this.refreshClipsData();
    } else if (dataType === 'categories') {
      this.refreshCategoriesData();
    }

    // 알림 표시
    this.showSyncNotification(dataType);
  }

  /**
   * 클립 데이터 새로고침
   */
  async refreshClipsData() {
    try {
      if (this.clipManager) {
        const clips = await this.clipManager.getAllClips();
        this.clips = clips;
        this.updateClipsList();
        console.log('🔄 Clips data refreshed');
      }
    } catch (error) {
      console.error('Error refreshing clips data:', error);
    }
  }

  /**
   * 카테고리 데이터 새로고침
   */
  async refreshCategoriesData() {
    try {
      if (this.categoryManager) {
        const categories = await this.categoryManager.getAllCategories();
        this.categories = categories;
        this.updateCategoryTree();
        console.log('🔄 Categories data refreshed');
      }
    } catch (error) {
      console.error('Error refreshing categories data:', error);
    }
  }

  /**
   * 동기화 알림 표시
   * @param {string} dataType - 동기화된 데이터 타입
   */
  showSyncNotification(dataType) {
    const messages = {
      clips: '클립 데이터가 동기화되었습니다',
      categories: '카테고리 데이터가 동기화되었습니다'
    };

    const message = messages[dataType] || '데이터가 동기화되었습니다';

    // 작은 알림 표시
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    notification.textContent = '🔄 ' + message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // 3초 후 제거
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * 팝업 가시성 변경 감지
   */
  setupVisibilityChangeListener() {
    // 팝업 가시성 변경 감지
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 팝업이 다시 보일 때 데이터 새로고침
        this.refreshDataOnVisibilityChange();
      }
    });

    // 페이지 포커스 시 데이터 새로고침
    window.addEventListener('focus', () => {
      this.refreshDataOnVisibilityChange();
    });
  }

  /**
   * 팝업 가시성 변경 시 데이터 새로고침
   */
  async refreshDataOnVisibilityChange() {
    try {
      console.log('🔄 Refreshing data on visibility change');

      // 마지막 새로고침 시간 확인 (과도한 새로고침 방지)
      const now = Date.now();
      if (this.lastRefreshTime && now - this.lastRefreshTime < 1000) {
        return;
      }

      this.lastRefreshTime = now;

      // 백그라운드에서 최신 데이터 요청
      const response = await chrome.runtime.sendMessage({ action: 'refreshData' });

      if (response && response.success) {
        const { clips, categories } = response.data;

        // 캐시된 데이터 업데이트
        this.clips = clips || this.clips;
        this.categories = categories || this.categories;

        // UI 업데이트
        this.updateView();

        console.log('🔄 Data refreshed from background');
      }
    } catch (error) {
      console.error('Error refreshing data on visibility change:', error);
    }
  }

  async loadData() {
    try {
      console.log('🔄 PopupController.loadData() 시작...');

      // Check if managers are initialized
      if (!this.storageManager) {
        console.error('StorageManager not initialized');
        this.showToast('StorageManager not initialized', 'error');
        return;
      }

      if (!this.storageManager.initialized) {
        console.error('StorageManager not properly initialized');
        this.showToast('StorageManager initialization failed', 'error');
        return;
      }

      console.log('✅ StorageManager initialized:', this.storageManager.initialized);

      // Load categories
      if (this.categoryManager) {
        console.log('📂 카테고리 로딩 시작...');
        this.categories = await this.categoryManager.getAllCategories();
        console.log('✅ 카테고리 로딩 완료:', this.categories.length, '개');
      } else {
        console.warn('⚠️ CategoryManager not initialized');
      }

      // Load clips
      if (this.clipManager) {
        console.log('📋 클립 로딩 시작...');
        this.clips = await this.clipManager.getAllClips();
        console.log('✅ 클립 로딩 완료:', this.clips.length, '개');
      } else {
        console.warn('⚠️ ClipManager not initialized');
      }

      console.log('✅ 모든 데이터 로딩 완료');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      console.error('스택 트레이스:', error.stack);
      this.showToast(`Error loading data: ${error.message}`, 'error');
    }
  }

  updateView() {
    this.updateCategoryTree();
    this.updateClipsList();
  }

  updateCategoryTree() {
    const tree = document.getElementById('category-tree');
    if (!tree) return;

    tree.innerHTML = '';

    // Add "All Clips" option
    const allItem = document.createElement('div');
    allItem.className = 'category-item active';
    allItem.innerHTML = '<span class="category-icon">📁</span><span class="category-name">All Clips</span>';
    allItem.addEventListener('click', () => this.filterByCategory(null));
    tree.appendChild(allItem);

    // Add categories
    this.categories.forEach(category => {
      const categoryItem = this.createCategoryItem(category);
      tree.appendChild(categoryItem);
    });
  }

  createCategoryItem(category, level = 0) {
    const item = document.createElement('div');
    item.className = 'category-item';
    item.style.marginLeft = `${level * 12}px`;

    const hasChildren = this.categories.filter(c => c.parentId === category.id).length > 0;

    item.innerHTML = `
      <span class="category-icon">📂</span>
      <span class="category-name">${category.name}</span>
      ${hasChildren ? '<span class="category-toggle">▶</span>' : ''}
    `;

    item.addEventListener('click', () => this.filterByCategory(category.id));

    // Add children
    if (hasChildren) {
      const children = this.categories.filter(c => c.parentId === category.id);
      children.forEach(child => {
        const childItem = this.createCategoryItem(child, level + 1);
        item.appendChild(childItem);
      });
    }

    return item;
  }

  updateClipsList() {
    console.log('🔄 updateClipsList() 호출됨');
    console.log('📊 현재 클립 수:', this.clips ? this.clips.length : 'undefined');

    const container = document.getElementById('clips-container');
    const emptyState = document.getElementById('empty-state');

    console.log('🔍 container element:', container ? '찾음' : '찾지 못함');
    console.log('🔍 emptyState element:', emptyState ? '찾음' : '찾지 못함');

    if (!container) {
      console.error('❌ clips-container element를 찾을 수 없음');
      return;
    }

    // Filter clips by selected category
    let filteredClips = this.clips || [];
    console.log('📋 필터링 전 클립 수:', filteredClips.length);

    if (this.selectedCategoryId) {
      filteredClips = this.clips.filter(clip =>
        clip.categoryIds && clip.categoryIds.includes(this.selectedCategoryId)
      );
      console.log('📋 카테고리 필터링 후 클립 수:', filteredClips.length);
    }

    console.log('🎬 최종 표시할 클립 수:', filteredClips.length);

    if (filteredClips.length === 0) {
      container.innerHTML = '';
      emptyState?.classList.remove('hidden');
      console.log('📭 빈 상태 표시');
    } else {
      emptyState?.classList.add('hidden');
      console.log('📄 클립 카드 생성 시작...');

      const clipCards = filteredClips.map(clip => this.createClipCard(clip));
      console.log('📄 생성된 클립 카드 수:', clipCards.length);

      container.innerHTML = clipCards.join('');
      console.log('✅ 클립 카드 HTML 적용 완료');

      // Add event listeners to clip cards
      const cards = container.querySelectorAll('.clip-card');
      console.log('🔗 이벤트 리스너 추가할 카드 수:', cards.length);

      cards.forEach(card => {
        const clipId = card.getAttribute('data-clip-id');

        // Copy button
        card.querySelector('[data-action="copy"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.copyClip(clipId);
        });

        // Open button
        card.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openClip(clipId);
        });

        // Delete button
        card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteClip(clipId);
        });
      });

      console.log('✅ 모든 이벤트 리스너 추가 완료');
    }
  }

  createClipCard(clip) {
    const timeAgo = this.getTimeAgo(clip.createdAt);
    const source = clip.source || 'Unknown';

    return `
      <div class="clip-card" data-clip-id="${clip.id}">
        <div class="clip-card-header">
          <div class="clip-card-title">${this.escapeHtml(clip.title)}</div>
          <div class="clip-card-meta">
            <span class="source">${source}</span>
            <span class="time">${timeAgo}</span>
          </div>
        </div>
        <div class="clip-card-content">
          ${this.escapeHtml(clip.text.substring(0, 200))}...
        </div>
        <div class="clip-card-actions">
          <button class="icon-btn" data-action="copy" title="Copy">📋</button>
          <button class="icon-btn" data-action="open" title="Open">🔗</button>
          <button class="icon-btn" data-action="delete" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }

  filterByCategory(categoryId) {
    this.selectedCategoryId = categoryId;

    // Update active state
    document.querySelectorAll('.category-item').forEach(item => {
      item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Update header
    const headerTitle = document.getElementById('selected-category-title');
    if (headerTitle) {
      headerTitle.textContent = categoryId ?
        `Clips in ${this.categories.find(c => c.id === categoryId)?.name || 'Unknown'}` :
        'All Clips';
    }

    this.updateClipsList();
  }

  searchClips(query) {
    const container = document.getElementById('clips-container');
    if (!container) return;

    const filtered = this.clips.filter(clip =>
      clip.title.toLowerCase().includes(query.toLowerCase()) ||
      clip.text.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No clips found</p></div>';
    } else {
      container.innerHTML = filtered.map(clip => this.createClipCard(clip)).join('');
    }
  }

  searchCategories(query) {
    const tree = document.getElementById('category-tree');
    if (!tree) return;

    const filtered = this.categories.filter(category =>
      category.name.toLowerCase().includes(query.toLowerCase())
    );

    tree.innerHTML = filtered.map(category => this.createCategoryItem(category)).join('');
  }

  async copyClip(clipId) {
    try {
      const clip = this.clips.find(c => c.id === clipId);
      if (clip) {
        await navigator.clipboard.writeText(clip.text);
        this.showToast('Copied ✓');
      }
    } catch (error) {
      console.error('Error copying clip:', error);
      this.showToast('Error copying clip', 'error');
    }
  }

  openClip(clipId) {
    const clip = this.clips.find(c => c.id === clipId);
    if (clip && clip.url) {
      chrome.tabs.create({ url: clip.url });
    }
  }

  async deleteClip(clipId) {
    if (confirm('Are you sure you want to delete this clip?')) {
      try {
        await this.clipManager.deleteClip(clipId);
        this.clips = this.clips.filter(c => c.id !== clipId);
        this.updateClipsList();
        this.showToast('Clip deleted');
      } catch (error) {
        console.error('Error deleting clip:', error);
        this.showToast('Error deleting clip', 'error');
      }
    }
  }

  showAddCategoryDialog() {
    // Create modal dialog instead of prompt
    const modal = document.createElement('div');
    modal.id = 'category-modal';
    modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Create New Category</h3>
            <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            <input type="text" id="category-name-input" class="form-input"
                   placeholder="Enter category name..." maxlength="30">
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('category-name-input').dispatchEvent(new KeyboardEvent('keypress', {key: 'Enter'}))">Create</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .modal-content {
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        width: 90%;
        max-width: 400px;
        box-shadow: var(--shadow-lg);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--border-color);
      }

      .modal-header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: var(--font-size-lg);
      }

      .modal-close-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        font-size: var(--font-size-xl);
        cursor: pointer;
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        transition: all 0.2s ease;
      }

      .modal-close-btn:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      .modal-body {
        padding: var(--spacing-lg);
      }

      .modal-footer {
        display: flex;
        gap: var(--spacing-sm);
        justify-content: flex-end;
        padding: var(--spacing-lg);
        border-top: 1px solid var(--border-color);
      }
    `;

    document.head.appendChild(styles);

    // Focus on input
    setTimeout(() => {
      const input = document.getElementById('category-name-input');
      input.focus();

      // Handle Enter key
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const name = input.value.trim();
          if (name) {
            this.addCategory(name);
            modal.remove();
          }
        }
      });
    }, 100);
  }

  async addCategory(name) {
    try {
      const category = {
        id: 'category-' + Date.now(),
        name: name,
        parentId: null,
        order: this.categories.length,
        createdAt: Date.now()
      };

      await this.categoryManager.createCategory(category);
      this.categories.push(category);
      this.updateCategoryTree();
      this.showToast('Category created');
    } catch (error) {
      console.error('Error creating category:', error);
      this.showToast('Error creating category', 'error');
    }
  }

  showSettingsPanel() {
    document.getElementById('settings-panel')?.classList.remove('hidden');
  }

  hideSettingsPanel() {
    document.getElementById('settings-panel')?.classList.add('hidden');
  }

  changeLanguage(lang) {
    // This would be implemented with I18nManager
    console.log('Language changed to:', lang);
  }

  changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    // Save theme preference
    if (this.storageManager) {
      this.storageManager.setSettings({ theme });
    }
  }

  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async saveCurrentSelection() {
    try {
      console.log('💾 Save button clicked!');

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📂 Current tab:', tab);

      if (!tab) {
        console.log('❌ No active tab found');
        this.showToast('No active tab found', 'error');
        return;
      }

      // Check if we're in ChatGPT or Claude
      const isChatGPT = tab.url.includes('chat.openai.com');
      const isClaude = tab.url.includes('claude.ai');
      console.log('🤖 Is ChatGPT:', isChatGPT, 'Is Claude:', isClaude);

      if (!isChatGPT && !isClaude) {
        console.log('❌ Not on ChatGPT or Claude');
        this.showToast('Select text on ChatGPT or Claude first', 'error');
        return;
      }

      // First try to send message to existing content script
      try {
        console.log('📤 Sending message to content script...');
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'saveCurrentSelection' });
        console.log('📥 Response from content script:', response);
      } catch (messageError) {
        console.log('⚠️ Content script not responding, trying injection...', messageError);
        // If content script doesn't respond, try to inject it
        await this.injectContentScript(tab.id);
        // Try again after injection
        setTimeout(async () => {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'saveCurrentSelection' });
            console.log('📥 Response after injection:', response);
          } catch (retryError) {
            console.error('❌ Still failed after injection:', retryError);
            this.showToast('Failed to save selection', 'error');
          }
        }, 500);
      }

      // Close popup after saving
      setTimeout(() => {
        window.close();
      }, 1000);

    } catch (error) {
      console.error('❌ Error saving current selection:', error);
      this.showToast('Error saving selection', 'error');
    }
  }

  async injectContentScript(tabId) {
    try {
      console.log('🚀 Injecting content script into tab:', tabId);

      // Try to inject the content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });

      console.log('✅ Content script injected successfully');

      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error('❌ Failed to inject content script:', error);
      throw error;
    }
  }

  async testInjection() {
    try {
      console.log('🧪 Testing injection...');

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        alert('No active tab found!');
        return;
      }

      console.log('📂 Testing on tab:', tab.url);

      // Try to inject a simple test script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          console.log('🎯 INJECTION TEST SUCCESSFUL!');
          alert('🎯 ClipGo injection test successful!');
          return 'Injection worked!';
        }
      });

      alert('✅ Test script injected successfully! Check console for message.');

    } catch (error) {
      console.error('❌ Injection test failed:', error);
      alert('❌ Injection test failed: ' + error.message);
    }
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.className = `toast ${type}`;
      toast.classList.remove('hidden');

      setTimeout(() => {
        toast.classList.add('hidden');
      }, 3000);
    }
  }
}

// Initialize popup controller
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});