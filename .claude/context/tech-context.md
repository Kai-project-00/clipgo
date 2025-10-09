---
created: 2025-10-05T22:27:47Z
last_updated: 2025-10-05T22:27:47Z
version: 1.0
author: Claude Code PM System
---

# Technology Context

## Core Technologies

### Platform
- **Chrome Extension API** (Manifest V3)
  - Service Worker architecture
  - Content scripts for web interaction
  - Chrome Storage API for data persistence
  - Chrome i18n API for localization

### Language & Runtime
- **JavaScript** (ES6+)
  - Vanilla JS implementation (no frameworks)
  - Chrome extension APIs
  - Service Worker context
  - Content script context

### Styling
- **Pure CSS**
  - CSS variables for theming
  - Flexbox and Grid layouts
  - Custom animations and transitions
  - Dark/light theme support

### Data Storage
- **Chrome Storage API**
  - `chrome.storage.local` for persistent data
  - No external databases
  - Schema version management
  - ~10MB storage limit

## Dependencies & Libraries

### External Dependencies
- **SortableJS** (planned for drag & drop)
  - Lightweight drag and drop library
  - For category and clip reordering
  - CDN or package distribution

### Chrome APIs Used
- **storage**: Data persistence
- **scripting**: Web page interaction
- **contextMenus**: Right-click menus
- **activeTab**: Current tab access
- **clipboardWrite**: Copy to clipboard
- **tabs**: Tab management
- **i18n**: Internationalization
- **commands**: Keyboard shortcuts

### No Build Tools
- **Zero bundlers**: No webpack, rollup, or parcel
- **No transpilation**: Direct ES6+ in browser
- **No package manager**: Manual library inclusion
- **No CSS preprocessors**: Pure CSS

## Development Environment

### Browser Requirements
- **Chrome 90+** (primary target)
- **Microsoft Edge 90+** (secondary target)
- **Manifest V3** support required

### Development Tools
- **Chrome DevTools**: Debugging and testing
- **Chrome Extension Management**: Loading unpacked extensions
- **Git**: Version control
- **VS Code/Editor**: Code editing

### Testing Environment
- **Chrome Extension Developer Mode**
- **Manual testing through test HTML files**
- **Console debugging for service worker and content scripts**
- **Performance profiling through DevTools**

## Technical Architecture

### Extension Components

#### Background Service Worker (`background.js`)
- **Responsibilities**:
  - Context menu management
  - Keyboard shortcut handling
  - Message routing between components
  - Extension lifecycle management
- **Limitations**: Manifest V3 restrictions, no DOM access

#### Content Script (`content.js`)
- **Responsibilities**:
  - Text selection detection
  - Overlay popup injection and management
  - Communication with background script
  - Shadow DOM support
- **Scope**: Web page context, limited extension API access

#### Popup Interface (`popup.html/js`)
- **Responsibilities**:
  - Main extension UI
  - Category and clip management
  - User settings and preferences
  - Data visualization and interaction
- **Context**: Extension popup sandbox

#### Manager Modules (`src/`)
- **StorageManager.js**: Chrome Storage API abstraction
- **CategoryManager.js**: Category CRUD operations
- **ClipManager.js**: Clip data management
- **I18nManager.js**: Localization handling
- **PopupManager.js**: UI component management

### Data Flow

```
Web Page → content.js → background.js → popup.js
     ↓           ↓           ↓           ↓
Text Selection → Overlay → Storage → UI Updates
```

### Communication Patterns
- **Message Passing**: Chrome extension messaging API
- **Event-Driven**: Custom events for component communication
- **Direct Calls**: Local module method invocations
- **Storage Events**: Chrome storage change listeners

## Performance Considerations

### Storage Optimization
- **Local Storage**: Chrome storage.local (~10MB limit)
- **Data Indexing**: Efficient lookup for large datasets
- **Caching**: In-memory caching for frequently accessed data
- **Batch Operations**: Group storage operations for efficiency

### UI Performance
- **Virtual Rendering**: For large lists of clips/categories
- **Lazy Loading**: Load data on demand
- **CSS Hardware Acceleration**: For smooth animations
- **Event Delegation**: Minimize event listeners

### Memory Management
- **Garbage Collection**: Proper cleanup of event listeners
- **Circular References**: Avoid memory leaks in closures
- **Large Objects**: Split large data into manageable chunks

## Security & Privacy

### Data Protection
- **Local Storage**: All data stored locally, no server transmission
- **No Telemetry**: No usage analytics or tracking
- **Permission Minimization**: Request only necessary permissions
- **Content Security**: Proper CSP headers for web-accessible resources

### Extension Security
- **Manifest V3**: Latest security standards
- **Content Script Isolation**: Limited web page access
- **Host Permissions**: `<all_urls>` for universal access
- **User Control**: Clear permission requests and controls

## Compatibility & Constraints

### Browser Compatibility
- **Chrome 90+**: Primary target platform
- **Edge 90+**: Secondary target (Chromium-based)
- **Firefox**: Not supported (different extension architecture)
- **Safari**: Not supported (different extension architecture)

### Technical Constraints
- **Manifest V3**: Service worker limitations, no persistent background
- **Storage Limits**: ~10MB local storage limit
- **Memory Limits**: Browser memory constraints
- **API Restrictions**: Chrome extension API limitations
- **Cross-Origin**: Web page access restrictions

### Development Constraints
- **No Framework Dependencies**: Pure vanilla JS
- **Minimal External Libraries**: Only SortableJS planned
- **No Build Process**: Direct deployment
- **Manual Testing**: No automated testing framework