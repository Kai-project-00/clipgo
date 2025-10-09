---
created: 2025-10-05T22:27:47Z
last_updated: 2025-10-05T22:27:47Z
version: 1.0
author: Claude Code PM System
---

# System Patterns & Architecture

## Architectural Patterns

### MVP (Model-View-Presenter) Pattern
**Implementation**: Chrome extension components follow MVP separation

- **Model**: Chrome Storage API + Manager classes
  - Data persistence and business logic
  - StorageManager handles data operations
  - CategoryManager and ClipManager for domain logic

- **View**: DOM elements and UI components
  - popup.html and overlay popup HTML
  - CSS-styled interface elements
  - No business logic in view layer

- **Presenter**: Event handlers and controllers
  - popup.js for main popup interactions
  - content.js for web page interactions
  - background.js for system-level operations

### Event-Driven Architecture
**Implementation**: Chrome extension messaging and custom events

```javascript
// Message passing between components
chrome.runtime.sendMessage({type: 'SAVE_CLIP', data: clip});
chrome.storage.onChanged.addListener((changes, namespace) => {
  // Handle storage changes
});
```

### Observer Pattern
**Implementation**: Storage change listeners and UI updates

```javascript
// StorageManager notifies listeners of changes
class StorageManager {
  constructor() {
    chrome.storage.onChanged.addListener(this.notifyListeners);
  }

  notifyListeners(changes, namespace) {
    // Notify UI components of data changes
  }
}
```

## Data Flow Patterns

### Data Persistence Flow
```
User Action → Presenter → Manager → Chrome Storage → UI Update
```

### Component Communication Flow
```
Content Script → Background Script → Popup → Storage Manager
     ↓              ↓              ↓           ↓
Text Selection → Message Routing → UI Update → Data Persist
```

### State Management Pattern
**Implementation**: Chrome Storage as single source of truth

- **Centralized State**: All data in chrome.storage.local
- **Change Notification**: Storage event listeners for state sync
- **Optimistic Updates**: UI updates before storage confirmation
- **Conflict Resolution**: Last-write-wins for concurrent updates

## Design Patterns

### Module Pattern
**Implementation**: Manager classes with encapsulated functionality

```javascript
class StorageManager {
  constructor() {
    this.listeners = [];
  }

  async save(key, value) {
    // Implementation details
  }
}
```

### Factory Pattern
**Implementation**: Component creation and management

```javascript
class ComponentFactory {
  static createCategory(categoryData) {
    return new Category(categoryData);
  }
}
```

### Command Pattern
**Implementation**: Action handling and undo/redo (future)

```javascript
class CommandManager {
  execute(command) {
    command.execute();
    this.history.push(command);
  }
}
```

## UI Patterns

### Component-Based Architecture
**Implementation**: Reusable UI components

- **Category Tree**: Hierarchical category display
- **Clip Cards**: Individual clip representation
- **Overlay Popup**: In-page save interface
- **Toast Notifications**: User feedback

### State Synchronization Pattern
**Implementation**: Keep UI in sync with storage state

```javascript
// UI updates when storage changes
chrome.storage.onChanged.addListener((changes) => {
  updateUI(changes);
});
```

### Event Delegation Pattern
**Implementation**: Efficient event handling for dynamic content

```javascript
// Single event listener for multiple elements
document.addEventListener('click', (e) => {
  if (e.target.matches('.clip-card')) {
    handleClipClick(e);
  }
});
```

## Data Patterns

### Schema Version Management
**Implementation**: Handle data structure evolution

```javascript
const CURRENT_VERSION = 1;
async function migrateStorage() {
  const data = await chrome.storage.local.get(['version']);
  if (data.version < CURRENT_VERSION) {
    // Migration logic
  }
}
```

### Indexing Pattern
**Implementation**: Fast lookup for large datasets

```javascript
// Build indexes for common queries
function buildIndexes(categories, clips) {
  return {
    categoryById: new Map(categories.map(c => [c.id, c])),
    clipsByCategory: groupClipsByCategory(clips)
  };
}
```

### Caching Pattern
**Implementation**: In-memory cache for performance

```javascript
class Cache {
  constructor() {
    this.data = new Map();
    this.ttl = 5 * 60 * 1000; // 5 minutes
  }

  get(key) {
    const item = this.data.get(key);
    if (item && Date.now() - item.timestamp < this.ttl) {
      return item.value;
    }
    return null;
  }
}
```

## Integration Patterns

### Chrome Extension API Integration
**Implementation**: Abstraction layer for browser APIs

```javascript
class ChromeAPI {
  static async storage(key, value) {
    return chrome.storage.local.set({[key]: value});
  }

  static async sendMessage(message) {
    return chrome.runtime.sendMessage(message);
  }
}
```

### Content Script Integration
**Implementation**: Safe interaction with web pages

```javascript
class ContentScript {
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  createOverlay() {
    // Create shadow DOM for isolation
  }
}
```

### Internationalization Pattern
**Implementation**: Consistent localization across components

```javascript
class I18nManager {
  getMessage(key, params = {}) {
    let message = chrome.i18n.getMessage(key);
    Object.entries(params).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
    return message;
  }
}
```

## Error Handling Patterns

### Graceful Degradation
**Implementation**: Handle API failures gracefully

```javascript
async function saveClip(clip) {
  try {
    await StorageManager.saveClip(clip);
    showSuccessToast();
  } catch (error) {
    showErrorToast();
    logError(error);
  }
}
```

### Validation Pattern
**Implementation**: Input validation at multiple levels

```javascript
class Validator {
  static validateClip(clip) {
    const errors = [];
    if (!clip.title || clip.title.length > 60) {
      errors.push('Title must be 1-60 characters');
    }
    return errors;
  }
}
```

## Performance Patterns

### Lazy Loading Pattern
**Implementation**: Load data on demand

```javascript
class LazyLoader {
  constructor(loader) {
    this.loader = loader;
    this.cache = new Map();
  }

  async load(key) {
    if (!this.cache.has(key)) {
      this.cache.set(key, await this.loader(key));
    }
    return this.cache.get(key);
  }
}
```

### Debouncing Pattern
**Implementation**: Handle rapid user input

```javascript
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

### Virtual Scrolling Pattern
**Implementation**: Efficient rendering of large lists

```javascript
class VirtualScroller {
  constructor(container, items, itemHeight) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
  }

  render(scrollTop) {
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleItems, this.items.length);
    // Render only visible items
  }
}
```