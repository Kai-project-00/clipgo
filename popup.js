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
      // Initialize StorageManager
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
        await this.storageManager.init();
      }

      // Initialize CategoryManager
      if (typeof CategoryManager !== 'undefined' && this.storageManager) {
        this.categoryManager = new CategoryManager(this.storageManager);
        await this.categoryManager.init();
      }

      // Initialize ClipManager
      if (typeof ClipManager !== 'undefined' && this.storageManager) {
        this.clipManager = new ClipManager(this.storageManager, this.categoryManager);
        await this.clipManager.init();
      }

      this.setupEventListeners();
      this.loadData();
      this.updateView();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showToast('Initialization failed', 'error');
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
  }

  async loadData() {
    try {
      // Load categories
      if (this.categoryManager) {
        this.categories = await this.categoryManager.getAllCategories();
      }

      // Load clips
      if (this.clipManager) {
        this.clips = await this.clipManager.getAllClips();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Error loading data', 'error');
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
    const container = document.getElementById('clips-container');
    const emptyState = document.getElementById('empty-state');

    if (!container) return;

    // Filter clips by selected category
    let filteredClips = this.clips;
    if (this.selectedCategoryId) {
      filteredClips = this.clips.filter(clip =>
        clip.categoryIds && clip.categoryIds.includes(this.selectedCategoryId)
      );
    }

    if (filteredClips.length === 0) {
      container.innerHTML = '';
      emptyState?.classList.remove('hidden');
    } else {
      emptyState?.classList.add('hidden');
      container.innerHTML = filteredClips.map(clip => this.createClipCard(clip)).join('');

      // Add event listeners to clip cards
      container.querySelectorAll('.clip-card').forEach(card => {
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