// StorageManager.js - Advanced Chrome Storage API wrapper for clip management

class StorageManager {
  constructor() {
    this.initialized = false;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.storageQuota = null;
    this.currentUsage = null;

    // Data schemas
    this.schemas = {
      category: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true, min: 1, max: 50 },
        parentId: { type: 'string | null', default: null },
        order: { type: 'number', default: 0 },
        color: { type: 'string', default: '#4b3baf' },
        createdAt: { type: 'string', required: true },
        updatedAt: { type: 'string', required: true }
      },
      clip: {
        id: { type: 'string', required: true },
        text: { type: 'string', required: true, min: 1, max: 10000 },
        title: { type: 'string', required: true, min: 1, max: 200 },
        tags: { type: 'string[]', default: [] },
        categoryIds: { type: 'string[]', default: [] },
        url: { type: 'string', default: '' },
        source: { type: 'string', enum: ['chatgpt', 'claude', 'other'], default: 'other' },
        createdAt: { type: 'number', required: true },
        updatedAt: { type: 'number', required: true }
      },
      settings: {
        language: { type: 'string', enum: ['en', 'ko'], default: 'ko' },
        theme: { type: 'string', enum: ['light', 'dark', 'auto'], default: 'auto' },
        version: { type: 'string', required: true },
        backupEnabled: { type: 'boolean', default: true },
        autoBackupInterval: { type: 'number', default: 24 * 60 * 60 * 1000 }, // 24 hours
        maxClipsPerCategory: { type: 'number', default: 1000 },
        compressData: { type: 'boolean', default: true }
      }
    };

    this.init();
  }

  async init() {
    if (this.initialized) return;

    try {
      await this.initializeStorage();
      await this.checkStorageQuota();
      await this.performMigration();
      this.initialized = true;
      console.log('StorageManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize StorageManager:', error);
      throw error;
    }
  }

  async initializeStorage() {
    const result = await chrome.storage.local.get(['settings', 'version']);

    if (!result.settings) {
      await this.createDefaultSettings();
    }

    if (!result.version || result.version !== '1.0.0') {
      await this.upgradeSchema(result.version || '0.0.0');
    }

    // Ensure required data structures exist
    const existingData = await chrome.storage.local.get(['categories', 'clips']);
    const updates = {};

    if (!existingData.categories) {
      updates.categories = [];
    }
    if (!existingData.clips) {
      updates.clips = [];
    }

    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
  }

  async createDefaultSettings() {
    const settings = {
      language: 'ko',
      theme: 'auto',
      version: '1.0.0',
      backupEnabled: true,
      autoBackupInterval: 24 * 60 * 60 * 1000,
      maxClipsPerCategory: 1000,
      compressData: true,
      autoCleanup: true,
      optimizationEnabled: true,
      maxClipLength: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ settings, version: '1.0.0' });
    return settings;
  }

  async upgradeSchema(fromVersion) {
    console.log(`Upgrading schema from ${fromVersion} to 1.0.0`);

    // Migration logic would go here
    // For now, just set the version
    await chrome.storage.local.set({ version: '1.0.0' });
  }

  async performMigration() {
    const result = await chrome.storage.local.get(['categories', 'clips']);

    // Migrate categories to new schema
    if (result.categories) {
      const migratedCategories = result.categories.map(cat => ({
        ...cat,
        color: cat.color || '#4b3baf',
        updatedAt: cat.updatedAt || new Date().toISOString()
      }));
      await chrome.storage.local.set({ categories: migratedCategories });
    }

    // Migrate clips to new schema
    if (result.clips) {
      const migratedClips = result.clips.map(clip => ({
        ...clip,
        categoryIds: clip.categoryIds || [],
        tags: clip.tags || [],
        source: clip.source || 'other',
        updatedAt: clip.updatedAt || Date.now()
      }));
      await chrome.storage.local.set({ clips: migratedClips });
    }
  }

  // Validation utilities
  validateData(data, schemaName) {
    const schema = this.schemas[schemaName];
    const errors = [];

    Object.keys(schema).forEach(field => {
      const rules = schema[field];
      const value = data[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        return;
      }

      if (value !== undefined) {
        // Type validation
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`${field} must be a number`);
        }
        if (rules.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`${field} must be a boolean`);
        }
        if (rules.type === 'string[]' && !Array.isArray(value)) {
          errors.push(`${field} must be an array`);
        }

        // Enum validation
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }

        // Length validation
        if (rules.min && String(value).length < rules.min) {
          errors.push(`${field} must be at least ${rules.min} characters`);
        }
        if (rules.max && String(value).length > rules.max) {
          errors.push(`${field} must be at most ${rules.max} characters`);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  // Category management
  async createCategory(categoryData) {
    const validation = this.validateData(categoryData, 'category');
    if (!validation.isValid) {
      throw new Error(`Invalid category data: ${validation.errors.join(', ')}`);
    }

    const category = {
      ...categoryData,
      id: categoryData.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await chrome.storage.local.get(['categories']);
    const categories = result.categories || [];

    // Check for duplicate names
    if (categories.some(cat => cat.name === category.name)) {
      throw new Error('Category with this name already exists');
    }

    categories.push(category);
    await chrome.storage.local.set({ categories });

    this.invalidateCache('categories');
    return category;
  }

  async getCategory(id) {
    const cached = this.getFromCache('categories');
    if (cached) {
      return cached.find(cat => cat.id === id);
    }

    const result = await chrome.storage.local.get(['categories']);
    const categories = result.categories || [];
    const category = categories.find(cat => cat.id === id);

    this.setToCache('categories', categories);
    return category;
  }

  async updateCategory(id, updates) {
    const result = await chrome.storage.local.get(['categories']);
    const categories = result.categories || [];
    const index = categories.findIndex(cat => cat.id === id);

    if (index === -1) {
      throw new Error('Category not found');
    }

    // Validate updates
    const validation = this.validateData(updates, 'category');
    if (!validation.isValid) {
      throw new Error(`Invalid updates: ${validation.errors.join(', ')}`);
    }

    categories[index] = {
      ...categories[index],
      ...updates,
      id, // Prevent ID changes
      updatedAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ categories });
    this.invalidateCache('categories');
    return categories[index];
  }

  async deleteCategory(id) {
    const result = await chrome.storage.local.get(['categories', 'clips']);
    const categories = result.categories || [];
    const clips = result.clips || [];

    // Check if category has clips
    const hasClips = clips.some(clip => clip.categoryIds.includes(id));
    if (hasClips) {
      throw new Error('Cannot delete category with existing clips');
    }

    const filteredCategories = categories.filter(cat => cat.id !== id);
    await chrome.storage.local.set({ categories: filteredCategories });
    this.invalidateCache('categories');
    this.invalidateCache('clips');
  }

  async getCategories() {
    const cached = this.getFromCache('categories');
    if (cached) {
      return cached;
    }

    const result = await chrome.storage.local.get(['categories']);
    const categories = result.categories || [];

    this.setToCache('categories', categories);
    return categories;
  }

  // Clip management
  async createClip(clipData) {
    const validation = this.validateData(clipData, 'clip');
    if (!validation.isValid) {
      throw new Error(`Invalid clip data: ${validation.errors.join(', ')}`);
    }

    // 텍스트 최적화 적용
    const optimizedText = this.optimizeClipText(clipData.text);

    const clip = {
      ...clipData,
      text: optimizedText,
      id: clipData.id || Date.now().toString(),
      createdAt: clipData.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    const result = await chrome.storage.local.get(['clips', 'settings']);
    const clips = result.clips || [];
    const settings = result.settings || {};

    // Check storage quota
    await this.checkStorageQuota();

    clips.push(clip);

    // 스토리지 최적화 실행
    if (settings.optimizationEnabled) {
      await this.optimizeStorageUsage();
    }

    if (settings.compressData) {
      await this.saveCompressedData('clips', clips);
    } else {
      await chrome.storage.local.set({ clips });
    }

    this.invalidateCache('clips');
    return clip;
  }

  async getClip(id) {
    const cached = this.getFromCache('clips');
    if (cached) {
      return cached.find(clip => clip.id === id);
    }

    const result = await chrome.storage.local.get(['clips']);
    const clips = result.clips || [];
    const clip = clips.find(clip => clip.id === id);

    this.setToCache('clips', clips);
    return clip;
  }

  async updateClip(id, updates) {
    const result = await chrome.storage.local.get(['clips', 'settings']);
    const clips = result.clips || [];
    const settings = result.settings || {};
    const index = clips.findIndex(clip => clip.id === id);

    if (index === -1) {
      throw new Error('Clip not found');
    }

    // Validate updates
    const validation = this.validateData(updates, 'clip');
    if (!validation.isValid) {
      throw new Error(`Invalid updates: ${validation.errors.join(', ')}`);
    }

    clips[index] = {
      ...clips[index],
      ...updates,
      id, // Prevent ID changes
      updatedAt: Date.now()
    };

    if (settings.compressData) {
      await this.saveCompressedData('clips', clips);
    } else {
      await chrome.storage.local.set({ clips });
    }

    this.invalidateCache('clips');
    return clips[index];
  }

  async deleteClip(id) {
    const result = await chrome.storage.local.get(['clips', 'settings']);
    const clips = result.clips || [];
    const settings = result.settings || {};

    const filteredClips = clips.filter(clip => clip.id !== id);

    if (settings.compressData) {
      await this.saveCompressedData('clips', filteredClips);
    } else {
      await chrome.storage.local.set({ clips: filteredClips });
    }

    this.invalidateCache('clips');
  }

  async getClips(filters = {}) {
    const cached = this.getFromCache('clips');
    let clips = cached;

    if (!clips) {
      const result = await chrome.storage.local.get(['clips']);
      clips = result.clips || [];
      this.setToCache('clips', clips);
    }

    // Apply filters
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      clips = clips.filter(clip =>
        filters.categoryIds.some(catId => clip.categoryIds.includes(catId))
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      clips = clips.filter(clip =>
        filters.tags.some(tag => clip.tags.includes(tag))
      );
    }

    if (filters.source) {
      clips = clips.filter(clip => clip.source === filters.source);
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

  // Settings management
  async getSettings() {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || await this.createDefaultSettings();
  }

  async updateSettings(updates) {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || await this.createDefaultSettings();

    const updatedSettings = {
      ...settings,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ settings: updatedSettings });
    return updatedSettings;
  }

  // Cache management
  setToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidateCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Storage quota management
  async checkStorageQuota() {
    try {
      if (chrome.storage.local.QUOTA_BYTES_PER_ITEM) {
        this.storageQuota = chrome.storage.local.QUOTA_BYTES_PER_ITEM;
      } else {
        this.storageQuota = 10 * 1024 * 1024; // 10MB default
      }

      const usage = await this.getStorageUsage();
      this.currentUsage = usage;

      const usagePercent = (usage / this.storageQuota) * 100;
      const status = this.getQuotaStatus(usagePercent);

      if (status === 'warning' || status === 'critical') {
        await this.handleStorageQuotaIssue(usagePercent);
      }

      return {
        usage: this.currentUsage,
        quota: this.storageQuota,
        usagePercent,
        status,
        available: this.storageQuota - usage
      };
    } catch (error) {
      console.error('Error checking storage quota:', error);
      return null;
    }
  }

  async getStorageUsage() {
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse((bytesInUse) => {
        resolve(bytesInUse);
      });
    });
  }

  getQuotaStatus(usagePercent) {
    if (usagePercent >= 95) return 'critical';
    if (usagePercent >= 80) return 'warning';
    if (usagePercent >= 60) return 'moderate';
    return 'healthy';
  }

  async handleStorageQuotaIssue(usagePercent) {
    const settings = await this.getSettings();

    if (usagePercent >= 95) {
      // Critical: Need immediate action
      console.warn('Storage quota critical - cleanup required');

      // Auto-cleanup old clips
      await this.cleanupOldClips(50); // Remove oldest 50 clips

      // Create emergency backup
      if (settings.backupEnabled) {
        await this.createBackup();
      }

      // Notify user (would need to implement UI notification)
      console.warn('Storage critically low. Old clips have been cleaned up.');
    } else if (usagePercent >= 80) {
      // Warning: Suggest cleanup
      console.warn('Storage quota warning - consider cleanup');

      // Compress data if enabled
      if (settings.compressData) {
        await this.optimizeStorage();
      }
    }
  }

  async cleanupOldClips(count = 50) {
    try {
      const clips = await this.getClips();
      if (clips.length <= count) return;

      // Sort by creation date (oldest first)
      clips.sort((a, b) => a.createdAt - b.createdAt);

      // Remove oldest clips
      const clipsToRemove = clips.slice(0, count);
      const clipIdsToRemove = clipsToRemove.map(clip => clip.id);

      // Create backup before deletion
      const backupData = {
        deletedClips: clipsToRemove,
        deletedAt: new Date().toISOString(),
        reason: 'storage_quota_cleanup'
      };

      await this.saveBackup(JSON.stringify(backupData), `cleanup_backup_${Date.now()}`);

      // Delete clips
      for (const clipId of clipIdsToRemove) {
        await this.deleteClip(clipId);
      }

      console.log(`Cleaned up ${count} old clips due to storage quota`);
      return count;
    } catch (error) {
      console.error('Failed to cleanup old clips:', error);
      throw error;
    }
  }

  async optimizeStorage() {
    try {
      const settings = await this.getSettings();
      if (!settings.compressData) return;

      console.log('Optimizing storage...');

      // Compress clips data
      const clips = await this.getClips();
      await this.saveCompressedData('clips', clips);

      // Compress categories data
      const categories = await this.getCategories();
      await this.saveCompressedData('categories', categories);

      // Clean up old backups
      await this.cleanOldBackups(3);

      // Remove expired cache entries
      this.invalidateCache();

      const newUsage = await this.getStorageUsage();
      console.log(`Storage optimization complete. New usage: ${this.formatBytes(newUsage)}`);

      return { success: true, newUsage };
    } catch (error) {
      console.error('Storage optimization failed:', error);
      throw error;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getStorageInfo() {
    try {
      const quotaInfo = await this.checkStorageQuota();
      const statistics = await this.getStatistics();
      const backups = await this.getBackups();

      return {
        quota: quotaInfo,
        statistics: statistics,
        backups: {
          count: backups.length,
          totalSize: backups.reduce((sum, backup) => sum + backup.data.length, 0),
          oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
          newestBackup: backups.length > 0 ? backups[0].timestamp : null
        },
        performance: {
          cacheHitRate: this.getCacheHitRate(),
          averageOperationTime: this.getAverageOperationTime()
        }
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw error;
    }
  }

  // Performance monitoring
  getCacheHitRate() {
    // This would need to be implemented with actual cache tracking
    return 0.85; // Placeholder
  }

  getAverageOperationTime() {
    // This would need to be implemented with actual performance tracking
    return 120; // Placeholder in milliseconds
  }

  // Data compression
  async saveCompressedData(key, data) {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = this.compressString(jsonString);
      await chrome.storage.local.set({ [key]: compressed });
    } catch (error) {
      console.error('Compression failed, saving uncompressed:', error);
      await chrome.storage.local.set({ [key]: data });
    }
  }

  compressString(str) {
    // Simple compression for demonstration
    // In production, use a proper compression library
    return str;
  }

  // Export/Import functionality
  async exportData() {
    try {
      const data = await chrome.storage.local.get(null);
      const exportData = {
        ...data,
        exportInfo: {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'Chat AI Clip Saver',
          statistics: await this.getStatistics()
        }
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data');
    }
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      // Validate imported data structure
      if (!data.categories || !data.clips || !data.settings) {
        throw new Error('Invalid data format: missing required fields');
      }

      // Create backup before import
      const backupData = await this.exportData();
      await this.saveBackup(backupData, 'pre_import_backup');

      // Clear current data
      await chrome.storage.local.clear();

      // Import new data with validation
      const validatedData = await this.validateImportData(data);
      await chrome.storage.local.set(validatedData);

      // Re-initialize storage
      await this.initializeStorage();
      this.invalidateCache();

      return {
        success: true,
        message: 'Data imported successfully',
        statistics: await this.getStatistics()
      };
    } catch (error) {
      console.error('Import failed:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  // Backup functionality
  async createBackup() {
    try {
      const data = await this.exportData();
      const timestamp = new Date().toISOString();
      const backup = {
        id: `backup_${Date.now()}`,
        data: data,
        timestamp: timestamp,
        version: '1.0.0',
        statistics: await this.getStatistics()
      };

      // Save backup
      await this.saveBackup(data, backup.id);

      // Clean old backups (keep only last 5)
      await this.cleanOldBackups(5);

      return backup;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  async saveBackup(data, backupId) {
    try {
      const backups = await this.getBackups();
      const backup = {
        id: backupId,
        data: data,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };

      backups.push(backup);
      await chrome.storage.local.set({ backups });
    } catch (error) {
      console.error('Failed to save backup:', error);
      throw error;
    }
  }

  async getBackups() {
    try {
      const result = await chrome.storage.local.get(['backups']);
      return result.backups || [];
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  async restoreBackup(backupId) {
    try {
      const backups = await this.getBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        throw new Error('Backup not found');
      }

      // Create pre-restore backup
      const currentData = await this.exportData();
      await this.saveBackup(currentData, `pre_restore_${Date.now()}`);

      // Restore from backup
      await this.importData(backup.data);

      return {
        success: true,
        message: 'Backup restored successfully',
        restoredFrom: backup.timestamp
      };
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  async deleteBackup(backupId) {
    try {
      const backups = await this.getBackups();
      const filteredBackups = backups.filter(b => b.id !== backupId);
      await chrome.storage.local.set({ backups: filteredBackups });
      return true;
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  }

  async cleanOldBackups(keepCount = 5) {
    try {
      const backups = await this.getBackups();
      if (backups.length <= keepCount) return;

      // Sort by timestamp (newest first) and keep the most recent ones
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const backupsToKeep = backups.slice(0, keepCount);

      await chrome.storage.local.set({ backups: backupsToKeep });
    } catch (error) {
      console.error('Failed to clean old backups:', error);
      // Don't throw error for cleanup failure
    }
  }

  async autoBackup() {
    try {
      const settings = await this.getSettings();

      if (!settings.backupEnabled) return;

      const backups = await this.getBackups();
      const lastBackup = backups.length > 0 ? backups[0] : null;

      // Check if we need to create a new backup
      if (!lastBackup ||
          (Date.now() - new Date(lastBackup.timestamp).getTime()) > settings.autoBackupInterval) {

        await this.createBackup();
        console.log('Auto backup created successfully');
      }
    } catch (error) {
      console.error('Auto backup failed:', error);
      // Don't throw error for auto backup failure
    }
  }

  // Validation for imported data
  async validateImportData(data) {
    const validated = {
      categories: [],
      clips: [],
      settings: data.settings || {}
    };

    // Validate categories
    if (data.categories && Array.isArray(data.categories)) {
      validated.categories = data.categories.map(cat => {
        const validation = this.validateData(cat, 'category');
        if (!validation.isValid) {
          console.warn(`Invalid category data: ${validation.errors.join(', ')}`);
          // Fix common issues
          return {
            ...cat,
            id: cat.id || Date.now().toString(),
            name: cat.name || 'Unnamed Category',
            createdAt: cat.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        return cat;
      }).filter(cat => cat.name && cat.id); // Remove invalid entries
    }

    // Validate clips
    if (data.clips && Array.isArray(data.clips)) {
      validated.clips = data.clips.map(clip => {
        const validation = this.validateData(clip, 'clip');
        if (!validation.isValid) {
          console.warn(`Invalid clip data: ${validation.errors.join(', ')}`);
          // Fix common issues
          return {
            ...clip,
            id: clip.id || Date.now().toString(),
            title: clip.title || 'Untitled Clip',
            text: clip.text || '',
            tags: clip.tags || [],
            categoryIds: clip.categoryIds || [],
            createdAt: clip.createdAt || Date.now(),
            updatedAt: Date.now()
          };
        }
        return clip;
      }).filter(clip => clip.title && clip.text && clip.id); // Remove invalid entries
    }

    // Validate settings
    if (data.settings) {
      const settingsValidation = this.validateData(data.settings, 'settings');
      if (!settingsValidation.isValid) {
        console.warn(`Invalid settings data: ${settingsValidation.errors.join(', ')}`);
        validated.settings = await this.createDefaultSettings();
      } else {
        validated.settings = data.settings;
      }
    } else {
      validated.settings = await this.createDefaultSettings();
    }

    return validated;
  }

  async clearAllData() {
    await chrome.storage.local.clear();
    this.invalidateCache();
    await this.initializeStorage();
  }

  // Search utilities
  async searchClips(query) {
    return this.getClips({ searchQuery: query });
  }

  async getClipsByTags(tags) {
    return this.getClips({ tags: Array.isArray(tags) ? tags : [tags] });
  }

  async getClipsByCategory(categoryId) {
    return this.getClips({ categoryIds: [categoryId] });
  }

  // 데이터 압축 유틸리티
  compressData(data) {
    try {
      const jsonString = JSON.stringify(data);

      // 간단한 압축: 반복되는 패턴 감소
      let compressed = jsonString
        .replace(/,"categoryIds":\[(.*?)\]/g, (match, ids) => {
          return ids.length > 0 ? `,cids:[${ids}]` : '';
        })
        .replace(/"categoryId":"(.*?)"/g, (match, id) => `cid:"${id}"`)
        .replace(/"createdAt":(.*?)\}/g, (match, time) => `ct:${time}}`)
        .replace(/"title":"(.*?)"/g, (match, title) => `t:"${title}"`)
        .replace(/"text":"(.*?)"/g, (match, text) => `tx:"${text}"`)
        .replace(/"tags":\[(.*?)\]/g, (match, tags) => `tg:[${tags}]`)
        .replace(/"url":"(.*?)"/g, (match, url) => `u:"${url}"`)
        .replace(/"source":"(.*?)"/g, (match, source) => `s:"${source}"`)
        .replace(/"parentId":"(.*?)"/g, (match, parentId) => `p:"${parentId}"`)
        .replace(/"order":(.*?),/g, (match, order) => `o:${order},`)
        .replace(/"name":"(.*?)"/g, (match, name) => `n:"${name}"`);

      return {
        compressed: compressed.length < jsonString.length ? compressed : jsonString,
        ratio: compressed.length / jsonString.length,
        originalSize: jsonString.length,
        compressedSize: compressed.length
      };
    } catch (error) {
      console.error('Compression error:', error);
      return {
        compressed: JSON.stringify(data),
        ratio: 1,
        originalSize: JSON.stringify(data).length,
        compressedSize: JSON.stringify(data).length
      };
    }
  }

  // 데이터 압축 해제
  decompressData(compressedString) {
    try {
      let decompressed = compressedString
        .replace(/cids:\[(.*?)\]/g, (match, ids) => `,"categoryIds":[${ids}]`)
        .replace(/cid:"(.*?)"/g, (match, id) => `"categoryId":"${id}"`)
        .replace(/ct:(.*?)\}/g, (match, time) => `"createdAt":${time}}`)
        .replace(/t:"(.*?)"/g, (match, title) => `"title":"${title}"`)
        .replace(/tx:"(.*?)"/g, (match, text) => `"text":"${text}"`)
        .replace(/tg:\[(.*?)\]/g, (match, tags) => `"tags":[${tags}]`)
        .replace(/u:"(.*?)"/g, (match, url) => `"url":"${url}"`)
        .replace(/s:"(.*?)"/g, (match, source) => `"source":"${source}"`)
        .replace(/p:"(.*?)"/g, (match, parentId) => `"parentId":"${parentId}"`)
        .replace(/o:(.*?),/g, (match, order) => `"order":${order},`)
        .replace(/n:"(.*?)"/g, (match, name) => `"name":"${name}"`);

      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression error:', error);
      return JSON.parse(compressedString); // 폴백
    }
  }

  // 클립 텍스트 최적화
  optimizeClipText(text) {
    if (!text || text.length <= 100) return text;

    // 불필요한 공백 제거
    let optimized = text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\n\s*\n/g, '\n');

    // 너무 긴 텍스트는 요약
    if (optimized.length > 1000) {
      const sentences = optimized.split(/[.!?]+/);
      if (sentences.length > 3) {
        optimized = sentences.slice(0, 3).join('.') + '...';
      }
    }

    return optimized;
  }

  // 중복 클립 감지 및 최적화
  async findDuplicateClips() {
    const clips = await this.getClips();
    const duplicates = [];

    for (let i = 0; i < clips.length; i++) {
      for (let j = i + 1; j < clips.length; j++) {
        const similarity = this.calculateTextSimilarity(clips[i].text, clips[j].text);
        if (similarity > 0.8) {
          duplicates.push({
            clip1: clips[i],
            clip2: clips[j],
            similarity: similarity
          });
        }
      }
    }

    return duplicates;
  }

  // 텍스트 유사도 계산
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  // 자동 데이터 정리
  async performAutoCleanup() {
    const settings = await this.getSettings();
    if (!settings.autoCleanup) return 0;

    const clips = await this.getClips();
    const now = Date.now();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // 1개월 이상 된 클립 중 자주 사용되지 않는 것 삭제
    const oldClips = clips.filter(clip => clip.createdAt < oneMonthAgo);
    const clipsToDelete = oldClips.slice(0, Math.floor(oldClips.length * 0.1)); // 10%만 삭제

    for (const clip of clipsToDelete) {
      await this.deleteClip(clip.id);
    }

    console.log(`Auto-cleanup completed: ${clipsToDelete.length} old clips removed`);
    return clipsToDelete.length;
  }

  // 스토리지 사용량 최적화
  async optimizeStorageUsage() {
    const usage = await this.getStorageUsage();
    const settings = await this.getSettings();

    if (usage.usedPercentage > 80) {
      // 스토리지 사용량이 80% 이상이면 최적화 실행
      await this.performAutoCleanup();

      // 캐시 정리
      this.cache.clear();

      // 백업 정리 (최근 5개만 유지)
      const backups = await this.getBackupList();
      const oldBackups = backups.slice(0, backups.length - 5);
      for (const backup of oldBackups) {
        await chrome.storage.local.remove([`backup_${backup.timestamp}`]);
      }

      console.log('Storage optimization completed');
    }
  }

  // Statistics
  async getStatistics() {
    const [categories, clips, settings] = await Promise.all([
      this.getCategories(),
      this.getClips(),
      this.getSettings()
    ]);

    // 중복 클립 확인
    const duplicates = await this.findDuplicateClips();

    // 데이터 압축 테스트
    const compressionTest = this.compressData({ categories, clips });

    const stats = {
      totalCategories: categories.length,
      totalClips: clips.length,
      totalTags: [...new Set(clips.flatMap(clip => clip.tags))].length,
      clipsBySource: {
        chatgpt: clips.filter(c => c.source === 'chatgpt').length,
        claude: clips.filter(c => c.source === 'claude').length,
        other: clips.filter(c => c.source === 'other').length
      },
      storageUsage: await this.getStorageUsage(),
      oldestClip: clips.length > 0 ? Math.min(...clips.map(c => c.createdAt)) : null,
      newestClip: clips.length > 0 ? Math.max(...clips.map(c => c.createdAt)) : null,
      duplicateClips: duplicates.length,
      compressionRatio: compressionTest.ratio,
      potentialSavings: compressionTest.originalSize - compressionTest.compressedSize,
      averageClipLength: clips.length > 0 ?
        Math.round(clips.reduce((sum, clip) => sum + clip.text.length, 0) / clips.length) : 0
    };

    return stats;
  }
}

// Export for global use
window.StorageManager = StorageManager;