---
created: 2025-10-05T22:27:47Z
last_updated: 2025-10-05T22:27:47Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Root Directory Organization

```
clipgo/
├── .claude/                  # Claude Code PM system
│   ├── context/             # Project context documentation
│   ├── epics/               # Epic implementation plans
│   ├── prds/                # Product requirements
│   ├── rules/               # Development guidelines
│   ├── scripts/             # Management scripts
│   └── agents/              # Specialized agents
├── src/                     # Core source modules
│   ├── StorageManager.js    # Chrome Storage API wrapper
│   ├── CategoryManager.js   # Category CRUD operations
│   ├── ClipManager.js       # Clip data management
│   ├── I18nManager.js       # Internationalization
│   └── PopupManager.js      # Popup UI management
├── _locales/                # Localization files
│   ├── ko/                 # Korean translations
│   └── en/                 # English translations
├── icons/                   # Extension icons
├── ccpm/                    # Claude Code PM scripts
├── popup.html              # Main popup interface
├── popup.css               # Popup styles
├── popup.js                # Popup controller
├── popup-overlay.css       # Overlay popup styles
├── content.js              # Content script for web interaction
├── background.js           # Service worker
├── manifest.json           # Extension configuration
└── test-*.html             # Testing files
```

## File Naming Conventions

### Core Components
- **Manager Classes**: `*Manager.js` (StorageManager, CategoryManager, etc.)
- **Test Files**: `test-*.html/js` (test-popup-demo.html, test-basic-functionality.js)
- **Configuration**: `manifest.json`, `CLAUDE.md`
- **Documentation**: `README.md`, `README-TEST.md`

### Naming Patterns
- **Component Files**: kebab-case for HTML, camelCase for JS
- **Test Files**: `test-{feature}.{ext}` format
- **Internationalization**: `{language}/messages.json` in `_locales/`
- **Icons**: `icon{size}.png` format (16, 32, 48, 128px)

## Module Organization

### Core Architecture (MVP Pattern)
- **Model**: Chrome Storage API via StorageManager
- **View**: DOM elements managed by UIManager
- **Presenter**: Event handlers in popup.js and content.js

### Module Dependencies
```
manifest.json → background.js → content.js
                ↓            ↓
            popup.js ← StorageManager
                ↓
        CategoryManager, ClipManager, I18nManager
```

## Directory Purposes

### `.claude/` - Development Management
- **context/**: Project state and architecture documentation
- **epics/**: Feature implementation plans and task breakdowns
- **prds/**: Product requirements and specifications
- **rules/**: Coding standards and development patterns
- **scripts/**: Automation and management utilities

### `src/` - Core Business Logic
- **StorageManager.js**: Chrome Storage API abstraction
- **CategoryManager.js**: Hierarchical category operations
- **ClipManager.js**: Clip data CRUD operations
- **I18nManager.js**: Multi-language support
- **PopupManager.js**: UI component management

### `_locales/` - Internationalization
- **ko/**: Korean language support
- **en/**: English language support
- Structure follows Chrome extension i18n standards

### Testing Infrastructure
- **test-popup-demo.html**: Comprehensive popup testing
- **test-real-extension.html**: Real-world extension testing
- **test-basic-functionality.js**: Core functionality validation
- **test-sync.html**: Data synchronization testing

## Configuration Files

### Extension Configuration
- **manifest.json**: Chrome extension manifest (V3)
  - Permissions and host access
  - Content script configuration
  - Background service worker setup
  - Icons and action definitions

### Development Configuration
- **CLAUDE.md**: Project instructions and PM system config
- **.gitignore**: Git ignore rules
- **settings.local.json**: Local development settings

## Build and Deployment

### No Build Process
- Pure vanilla JavaScript implementation
- No bundlers or transpilation required
- Direct browser-ready files
- Chrome extension package: zip the entire directory

### Testing Setup
- Standalone HTML test files
- In-browser testing with Chrome DevTools
- No external testing framework dependencies

## File Responsibilities

### Core Files
- **manifest.json**: Extension registration and permissions
- **background.js**: Background service worker, context menus, shortcuts
- **content.js**: Web page interaction, text selection, overlay popup
- **popup.js**: Main popup UI logic and event handling
- **StorageManager.js**: Data persistence and retrieval

### UI Files
- **popup.html**: Main extension popup interface
- **popup.css**: Main popup styling
- **popup-overlay.css**: Overlay popup styling
- **icons/**: Extension icon assets

### Testing Files
- **test-*.html**: Various test interfaces
- **test-*.js**: Test automation and validation