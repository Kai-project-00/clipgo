---
created: 2025-10-05T22:27:47Z
last_updated: 2025-10-05T22:27:47Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## JavaScript Coding Standards

### Code Style
- **Indentation**: 2 spaces (no tabs)
- **Line Length**: Maximum 120 characters per line
- **Semicolons**: Required at end of statements
- **Quotes**: Single quotes for strings, template literals for interpolation
- **Variable Declaration**: Always use `const` and `let`, never `var`

### Naming Conventions
```javascript
// Classes: PascalCase
class StorageManager {
  constructor() {
    this.listeners = [];
  }
}

// Variables and Functions: camelCase
const userId = 'user-123';
function getUserData() {
  return userId;
}

// Constants: UPPER_SNAKE_CASE
const MAX_CLIP_LENGTH = 1000;
const API_ENDPOINT = 'https://api.example.com';

// Private Properties: leading underscore
class CategoryManager {
  constructor() {
    this._categories = new Map();
  }
}
```

### Function Declarations
```javascript
// Arrow functions for most cases
const saveClip = async (clip) => {
  try {
    await StorageManager.saveClip(clip);
    return true;
  } catch (error) {
    console.error('Failed to save clip:', error);
    return false;
  }
};

// Regular functions for class methods
class ClipManager {
  async deleteClip(clipId) {
    await StorageManager.delete(clipId);
  }
}
```

### Error Handling
```javascript
// Always use try-catch with async operations
async function riskyOperation() {
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw new Error(`Operation failed: ${error.message}`);
  }
}

// Validate inputs
function validateClip(clip) {
  if (!clip.title || typeof clip.title !== 'string') {
    throw new Error('Clip title is required and must be a string');
  }
  if (clip.title.length > 60) {
    throw new Error('Clip title must be less than 60 characters');
  }
}
```

## CSS Standards

### Naming Conventions
```css
/* BEM Methodology */
.category-tree {
  /* Block */
}

.category-tree__item {
  /* Element */
}

.category-tree__item--active {
  /* Modifier */
}

/* CSS Custom Properties */
:root {
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-background: #ffffff;
  --color-text: #1f2937;
}

/* Dark theme */
[data-theme="dark"] {
  --color-background: #1f2937;
  --color-text: #f9fafb;
}
```

### Organization
```css
/* 1. Variables and Imports */
@import url('fonts.css');

/* 2. Base Styles */
* {
  box-sizing: border-box;
}

/* 3. Layout Components */
.header {
  /* Header styles */
}

/* 4. Module Components */
.clip-card {
  /* Clip card styles */
}

/* 5. Utility Classes */
.u-hidden {
  display: none;
}

.u-text-center {
  text-align: center;
}
```

### Responsive Design
```css
/* Mobile-first approach */
.popup {
  width: 100%;
  max-width: 400px;
}

@media (min-width: 768px) {
  .popup {
    max-width: 600px;
  }
}
```

## HTML Standards

### Document Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClipGo - Save and organize AI conversations</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="app" data-theme="light">
    <header class="header">
      <h1 class="header__title">ClipGo</h1>
    </header>

    <main class="main">
      <!-- Main content -->
    </main>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### Accessibility
```html
<!-- Use semantic HTML -->
<nav aria-label="Main navigation">
  <ul class="nav-list">
    <li><a href="#" aria-current="page">Home</a></li>
    <li><a href="#">About</a></li>
  </ul>
</nav>

<!-- Form accessibility -->
<form aria-labelledby="form-title">
  <h2 id="form-title">Save Clip</h2>

  <div class="form-group">
    <label for="clip-title">Title</label>
    <input
      type="text"
      id="clip-title"
      name="title"
      required
      aria-describedby="title-help"
      maxlength="60"
    >
    <div id="title-help" class="help-text">
      Enter a descriptive title (max 60 characters)
    </div>
  </div>

  <button type="submit" class="btn btn--primary">
    Save Clip
  </button>
</form>
```

### Data Attributes
```html
<!-- Use data attributes for JavaScript hooks -->
<div class="category-tree" data-category-id="cat-123">
  <div class="category-item" data-category-id="cat-456">
    <span class="category-name">Technology</span>
    <button class="btn btn--icon" data-action="edit" aria-label="Edit category">
      <svg>...</svg>
    </button>
  </div>
</div>

<!-- Internationalization -->
<span data-i18n="save.clip">Save Clip</span>
<span data-i18n="category.create">Create Category</span>
```

## File Organization

### Directory Structure
```
src/
├── Manager.js           # Abstract base manager
├── StorageManager.js   # Storage operations
├── CategoryManager.js  # Category management
├── ClipManager.js      # Clip operations
└── I18nManager.js      # Internationalization

test/
├── test-manager.js     # Manager testing
├── test-storage.js     # Storage testing
└── test-ui.js          # UI component testing
```

### File Naming
- **JavaScript**: camelCase.js (storageManager.js)
- **CSS**: kebab-case.css (popup-styles.css)
- **HTML**: kebab-case.html (popup-overlay.html)
- **Test Files**: test-*.js (test-storage.js)

## Comments and Documentation

### JavaScript Comments
```javascript
/**
 * Save a clip to storage with validation
 * @param {Object} clip - Clip object to save
 * @param {string} clip.title - Clip title (required)
 * @param {string} clip.text - Clip content (required)
 * @param {string[]} clip.categoryIds - Array of category IDs
 * @returns {Promise<boolean>} True if save successful
 * @throws {Error} If validation fails or save operation fails
 */
async function saveClip(clip) {
  // Implementation
}

// Single line comments for complex logic
if (clip.title.length > 60) {
  // Truncate title if too long
  clip.title = clip.title.substring(0, 57) + '...';
}
```

### CSS Comments
```css
/* ============================================
   Header Component
   ============================================ */
.header {
  background: var(--color-primary);
  color: white;
  padding: 1rem;
}

/* Navigation within header */
.header__nav {
  display: flex;
  gap: 1rem;
}

/* ============================================
   Utility Classes
   ============================================ */
.u-hidden {
  display: none !important;
}
```

## Chrome Extension Specific

### Manifest Standards
```json
{
  "manifest_version": 3,
  "name": "ClipGo",
  "version": "1.0.0",
  "description": "Save and organize AI conversations",
  "permissions": [
    "storage",
    "scripting",
    "contextMenus",
    "activeTab",
    "clipboardWrite"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  }
}
```

### Content Script Patterns
```javascript
// Content script isolation
(function() {
  'use strict';

  // Create shadow DOM for isolation
  const shadowRoot = document.createElement('div');
  shadowRoot.attachShadow({mode: 'open'});

  // Inject styles
  const styles = document.createElement('style');
  styles.textContent = `
    /* Scoped styles */
    .overlay-popup {
      position: fixed;
      z-index: 10000;
    }
  `;
  shadowRoot.shadowRoot.appendChild(styles);

  // Clean up on page unload
  window.addEventListener('unload', () => {
    // Clean up event listeners and DOM
  });
})();
```

### Message Passing
```javascript
// Standardized message format
const MESSAGES = {
  SAVE_CLIP: 'SAVE_CLIP',
  DELETE_CLIP: 'DELETE_CLIP',
  UPDATE_CATEGORY: 'UPDATE_CATEGORY'
};

// Send message
chrome.runtime.sendMessage({
  type: MESSAGES.SAVE_CLIP,
  data: clipData
});

// Receive message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case MESSAGES.SAVE_CLIP:
      handleSaveClip(message.data);
      sendResponse({success: true});
      break;
  }
});
```

## Testing Standards

### Test Organization
```javascript
// Test file structure
describe('StorageManager', () => {
  let storageManager;

  beforeEach(() => {
    storageManager = new StorageManager();
  });

  afterEach(() => {
    // Clean up
  });

  describe('saveClip', () => {
    it('should save clip successfully', async () => {
      const clip = createTestClip();
      const result = await storageManager.saveClip(clip);
      expect(result).toBe(true);
    });

    it('should throw error for invalid clip', async () => {
      const invalidClip = {title: ''};
      await expect(storageManager.saveClip(invalidClip))
        .rejects.toThrow('Clip title is required');
    });
  });
});
```

## Git Commit Standards

### Commit Message Format
```bash
# Type(scope): description
#
# Detailed explanation
#
# Closes #issue-number

feat(storage): add clip backup functionality
- Implement automatic backup of clips before major operations
- Add backup restoration functionality
- Add backup status indicators
- Closes #123

fix(popup): resolve category dropdown event bubbling
- Stop event propagation in category dropdown
- Add proper event delegation
- Fix popup closing when selecting categories
- Closes #456

docs(readme): update installation instructions
- Add Chrome Web Store installation steps
- Update developer mode instructions
- Fix broken links
```

### Branch Naming
- `feature/feature-name` (feature/drag-drop)
- `fix/issue-description` (fix/popup-closing)
- `docs/documentation-update` (docs/api-docs)
- `hotfix/urgent-fix` (hotfix/security-patch)

## Performance Guidelines

### Memory Management
```javascript
// Clean up event listeners
class Component {
  constructor() {
    this.handlers = new Map();
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.handlers.set(handler, {element, event});
  }

  destroy() {
    for (const [handler, {element, event}] of this.handlers) {
      element.removeEventListener(event, handler);
    }
    this.handlers.clear();
  }
}

// Debounce rapid events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

### Storage Optimization
```javascript
// Batch storage operations
class StorageBatch {
  constructor() {
    this.operations = [];
    this.timeout = null;
  }

  add(key, value) {
    this.operations.push({key, value});
    this.scheduleFlush();
  }

  scheduleFlush() {
    if (!this.timeout) {
      this.timeout = setTimeout(() => this.flush(), 100);
    }
  }

  async flush() {
    if (this.operations.length > 0) {
      const data = {};
      this.operations.forEach(({key, value}) => {
        data[key] = value;
      });
      await chrome.storage.local.set(data);
      this.operations = [];
    }
    this.timeout = null;
  }
}
```