// background.js - Service worker for context menu and background tasks

class BackgroundService {
  constructor() {
    this.storageManager = null;
    this.init();
  }

  async init() {
    try {
      // Initialize StorageManager
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
        await this.storageManager.init();
      }

      // Set up context menu
      this.setupContextMenu();

      // Set up message listeners
      this.setupMessageListeners();

      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();

      // Set up storage listeners
      this.setupStorageListeners();
    } catch (error) {
      console.error('Background service initialization failed:', error);
    }
  }

  setupContextMenu() {
    // Create context menu item for saving clips
    chrome.contextMenus.create({
      id: 'save-clip',
      title: '텍스트를 클립으로 저장',
      contexts: ['selection']
    });

    // Create context menu for saving with category
    chrome.contextMenus.create({
      id: 'save-clip-with-category',
      title: '카테고리와 함께 클립 저장',
      contexts: ['selection']
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'save-clip' || info.menuItemId === 'save-clip-with-category') {
        this.handleContextMenuAction(info, tab);
      }
    });
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'saveClipFromSelection':
          this.handleSaveClipFromSelection(request, sender);
          sendResponse({ success: true });
          break;

        case 'getCategories':
          this.getCategories().then(categories => {
            sendResponse({ categories });
          });
          return true; // Indicates async response

        case 'saveClip':
          this.saveClip(request.clip).then(() => {
            sendResponse({ success: true });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true;

        case 'updateClip':
          this.updateClip(request.clipId, request.updates).then(() => {
            sendResponse({ success: true });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true;

        case 'deleteClip':
          this.deleteClip(request.clipId).then(() => {
            sendResponse({ success: true });
          }).catch(error => {
            sendResponse({ success: false, error: error.message });
          });
          return true;

        case 'getClips':
          this.getClips(request.filters).then(clips => {
            sendResponse({ clips });
          });
          return true;
      }
    });
  }

  setupKeyboardShortcuts() {
    // Keyboard shortcuts are handled by the manifest commands
    // This listener handles the command events
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'save-clip') {
        this.handleKeyboardShortcut();
      }
    });
  }

  setupStorageListeners() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        // Handle storage changes if needed
        console.log('Storage changed:', changes);
      }
    });
  }

  async handleContextMenuAction(info, tab) {
    const selectedText = info.selectionText.trim();
    if (!selectedText) return;

    try {
      const clip = {
        id: Date.now().toString(),
        text: selectedText,
        title: this.generateTitle(selectedText),
        tags: [],
        categoryIds: [],
        url: tab.url,
        source: this.getSourceFromUrl(tab.url),
        createdAt: Date.now()
      };

      // Save the clip
      await this.saveClip(clip);

      // Show notification
      this.showNotification('클립 저장 완료', `'${clip.title}'이 저장되었습니다`);

      // If it's the "save with category" action, open popup
      if (info.menuItemId === 'save-clip-with-category') {
        chrome.action.openPopup();
      }
    } catch (error) {
      console.error('Error saving clip from context menu:', error);
      this.showNotification('저장 오류', '클립 저장 중 오류가 발생했습니다');
    }
  }

  async handleSaveClipFromSelection(request, sender) {
    try {
      const clip = {
        id: Date.now().toString(),
        text: request.text,
        title: this.generateTitle(request.text),
        tags: [],
        categoryIds: [],
        url: request.url,
        source: this.getSourceFromUrl(request.url),
        createdAt: Date.now()
      };

      await this.saveClip(clip);
      chrome.action.openPopup();
    } catch (error) {
      console.error('Error saving clip from selection:', error);
    }
  }

  handleKeyboardShortcut() {
    // Handle Ctrl+Shift+S or Cmd+Shift+S
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: () => {
            const selection = window.getSelection();
            return selection ? selection.toString().trim() : '';
          }
        }, (results) => {
          if (results && results[0] && results[0].result) {
            this.handleSaveClipFromSelection({
              text: results[0].result,
              url: tabs[0].url,
              title: tabs[0].title
            });
          }
        });
      }
    });
  }

  generateTitle(text) {
    if (text.length <= 50) {
      return text;
    }
    return text.substring(0, 47) + '...';
  }

  getSourceFromUrl(url) {
    if (!url) return 'other';
    if (url.includes('chat.openai.com')) return 'chatgpt';
    if (url.includes('claude.ai')) return 'claude';
    return 'other';
  }

  async saveClip(clip) {
    try {
      if (this.storageManager && this.storageManager.initialized) {
        return await this.storageManager.createClip(clip);
      } else {
        // Fallback to old implementation
        const result = await chrome.storage.local.get(['clips']);
        const clips = result.clips || [];
        clips.push(clip);
        await chrome.storage.local.set({ clips });
        return clip;
      }
    } catch (error) {
      console.error('Error saving clip:', error);
      throw error;
    }
  }

  async updateClip(clipId, updates) {
    try {
      if (this.storageManager && this.storageManager.initialized) {
        return await this.storageManager.updateClip(clipId, updates);
      } else {
        // Fallback to old implementation
        const result = await chrome.storage.local.get(['clips']);
        const clips = result.clips || [];
        const clipIndex = clips.findIndex(clip => clip.id === clipId);

        if (clipIndex === -1) {
          throw new Error('Clip not found');
        }

        clips[clipIndex] = { ...clips[clipIndex], ...updates };
        await chrome.storage.local.set({ clips });
        return clips[clipIndex];
      }
    } catch (error) {
      console.error('Error updating clip:', error);
      throw error;
    }
  }

  async deleteClip(clipId) {
    try {
      if (this.storageManager && this.storageManager.initialized) {
        await this.storageManager.deleteClip(clipId);
      } else {
        // Fallback to old implementation
        const result = await chrome.storage.local.get(['clips']);
        const clips = result.clips || [];
        const filteredClips = clips.filter(clip => clip.id !== clipId);
        await chrome.storage.local.set({ clips: filteredClips });
      }
    } catch (error) {
      console.error('Error deleting clip:', error);
      throw error;
    }
  }

  async getClips(filters = {}) {
    try {
      if (this.storageManager && this.storageManager.initialized) {
        return await this.storageManager.getClips(filters);
      } else {
        // Fallback to old implementation
        const result = await chrome.storage.local.get(['clips']);
        let clips = result.clips || [];

        // Apply filters
        if (filters.categoryId) {
          clips = clips.filter(clip => clip.categoryIds.includes(filters.categoryId));
        }

        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          clips = clips.filter(clip =>
            clip.title.toLowerCase().includes(query) ||
            clip.text.toLowerCase().includes(query) ||
            clip.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }

        // Sort by creation date (newest first)
        clips.sort((a, b) => b.createdAt - a.createdAt);

        return clips;
      }
    } catch (error) {
      console.error('Error getting clips:', error);
      throw error;
    }
  }

  async getCategories() {
    try {
      if (this.storageManager && this.storageManager.initialized) {
        return await this.storageManager.getCategories();
      } else {
        // Fallback to old implementation
        const result = await chrome.storage.local.get(['categories']);
        let categories = result.categories || [];

        // Create default category if none exist
        if (categories.length === 0) {
          const defaultCategory = {
            id: 'default',
            name: 'General',
            parentId: null,
            order: 0,
            createdAt: Date.now()
          };
          categories.push(defaultCategory);
          await chrome.storage.local.set({ categories });
        }

        return categories;
      }
    } catch (error) {
      console.error('Error getting categories:', error);
      throw error;
    }
  }

  showNotification(title, message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message
    });
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();

// Export for debugging
self.backgroundService = backgroundService;