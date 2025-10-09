// background.js - Service worker for context menu and background tasks
importScripts('src/StorageManager.js', 'src/CategoryManager.js', 'src/ClipManager.js');

class BackgroundService {
  constructor() {
    this.storageManager = null;
    this.categoryManager = null;
    this.clipManager = null;
    this.init();
  }

  async init() {
    try {
      console.log('🎯 FULL BACKGROUND SCRIPT LOADED!');

      // Initialize managers
      this.storageManager = new StorageManager();
      await this.storageManager.init();

      this.categoryManager = new CategoryManager(this.storageManager);
      await this.categoryManager.init();

      this.clipManager = new ClipManager(this.storageManager, this.categoryManager);
      await this.clipManager.init();

      // Set up context menu
      this.setupContextMenu();

      // Set up message listeners
      this.setupMessageListeners();

      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();

      console.log('✅ Full background script initialized successfully');
    } catch (error) {
      console.error('❌ Background script initialization failed:', error);
    }
  }

  setupContextMenu() {
    try {
      chrome.contextMenus.create({
        id: 'save-clip',
        title: 'ClipGo로 저장',
        contexts: ['selection']
      });

      chrome.contextMenus.create({
        id: 'save-with-category',
        title: 'ClipGo로 카테고리와 함께 저장',
        contexts: ['selection']
      });

      chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'save-clip') {
          this.handleSaveClip(info.selectionText, tab);
        } else if (info.menuItemId === 'save-with-category') {
          this.handleSaveClipWithCategory(info.selectionText, tab);
        }
      });
    } catch (error) {
      console.error('Context menu setup failed:', error);
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Background received message:', request);

      if (request.action === 'saveClip') {
        this.handleSaveClip(request.data.text, request.data.tab)
          .then(result => sendResponse({ success: true, result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Async response
      }

      if (request.action === 'getCategories') {
        this.categoryManager.getAllCategories()
          .then(categories => sendResponse({ success: true, categories }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
      }

      if (request.action === 'test') {
        sendResponse({ status: 'ok' });
      }
    });
  }

  setupKeyboardShortcuts() {
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'save-clip') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'saveSelectedText' });
          }
        });
      }
    });
  }

  async handleSaveClip(selectedText, tab) {
    if (!selectedText || selectedText.trim().length === 0) {
      throw new Error('선택된 텍스트가 없습니다');
    }

    const clipData = {
      id: Date.now().toString(),
      text: selectedText.trim(),
      url: tab.url,
      title: tab.title || 'Untitled',
      category: '기본',
      tags: [],
      createdAt: new Date().toISOString()
    };

    await this.clipManager.addClip(clipData);

    // Broadcast storage change
    await this.broadcastStorageChange('clips', { added: [clipData] });

    return clipData;
  }

  async handleSaveClipWithCategory(selectedText, tab) {
    if (!selectedText || selectedText.trim().length === 0) {
      throw new Error('선택된 텍스트가 없습니다');
    }

    // For now, use default category. In future, show category selection UI
    return this.handleSaveClip(selectedText, tab);
  }

  async broadcastStorageChange(dataType, changes) {
    try {
      const tabs = await chrome.tabs.query({});
      const message = { action: 'storageChanged', dataType, changes };

      const promises = tabs.map(tab => {
        return chrome.tabs.sendMessage(tab.id, message).catch(error => {
          // 메시지 전송 실패는 무시 (확장 프로그램 컨텍스트가 아닌 탭)
        });
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to broadcast storage change:', error);
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();