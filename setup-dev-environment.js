#!/usr/bin/env node

/**
 * ClipGo 개발 환경 설정 스크립트
 * TDD 방식으로 개발된 개발 환경 자동화 도구
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up ClipGo Development Environment...\n');

class DevEnvironmentSetup {
    constructor() {
        this.steps = [];
        this.completed = [];
        this.failed = [];
    }

    step(name, fn) {
        this.steps.push({ name, fn });
    }

    async run() {
        console.log(`📋 Setting up ${this.steps.length} development components...\n`);

        for (const step of this.steps) {
            try {
                console.log(`🔧 ${step.name}...`);
                await step.fn();
                console.log(`✅ ${step.name} completed\n`);
                this.completed.push(step.name);
            } catch (error) {
                console.log(`❌ ${step.name} failed: ${error.message}\n`);
                this.failed.push(step.name);
            }
        }

        this.printSummary();
    }

    printSummary() {
        console.log('📊 Setup Summary:');
        console.log(`   ✅ Completed: ${this.completed.length}`);
        console.log(`   ❌ Failed: ${this.failed.length}`);

        if (this.completed.length > 0) {
            console.log('\n🎉 Successfully set up:');
            this.completed.forEach(step => console.log(`   • ${step}`));
        }

        if (this.failed.length > 0) {
            console.log('\n⚠️  Failed to set up:');
            this.failed.forEach(step => console.log(`   • ${step}`));
            console.log('\nYou may need to set these up manually.');
        }

        if (this.failed.length === 0) {
            console.log('\n🚀 Development environment is ready!');
            console.log('\nNext steps:');
            console.log('   1. Run "npm test" to verify everything works');
            console.log('   2. Run "npm run test:playwright" to run Playwright tests');
            console.log('   3. Start development with your preferred tools');
        }
    }

    runCommand(command, options = {}) {
        try {
            execSync(command, { stdio: 'pipe', ...options });
            return true;
        } catch (error) {
            throw new Error(`Command failed: ${command}`);
        }
    }

    fileExists(filePath) {
        return fs.existsSync(filePath);
    }

    createDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    writeFile(filePath, content) {
        fs.writeFileSync(filePath, content);
    }
}

const setup = new DevEnvironmentSetup();

// Node.js 및 npm 확인
setup.step('Check Node.js and npm', () => {
    setup.runCommand('node --version');
    setup.runCommand('npm --version');
    console.log('   Node.js and npm are available');
});

// 의존성 설치
setup.step('Install dependencies', () => {
    setup.runCommand('npm ci');
    console.log('   Dependencies installed successfully');
});

// Playwright MCP 설치
setup.step('Setup Playwright MCP', () => {
    if (setup.fileExists('playwright-mcp')) {
        process.chdir('playwright-mcp');
        setup.runCommand('npm ci');
        process.chdir('..');
        console.log('   Playwright MCP dependencies installed');
    } else {
        throw new Error('Playwright MCP directory not found');
    }
});

// Playwright 브라우저 설치
setup.step('Install Playwright browsers', () => {
    if (setup.fileExists('playwright-mcp')) {
        process.chdir('playwright-mcp');
        setup.runCommand('npx playwright install');
        process.chdir('..');
        console.log('   Playwright browsers installed');
    }
});

// 개발용 VSCode 설정 생성
setup.step('Create VSCode configuration', () => {
    const vscodeDir = '.vscode';
    setup.createDirectory(vscodeDir);

    const launchJson = {
        "version": "0.2.0",
        "configurations": [
            {
                "name": "Debug Extension",
                "type": "node",
                "request": "launch",
                "program": "${workspaceFolder}/test-extension.js",
                "outFiles": ["${workspaceFolder}/**/*.js"],
                "env": {
                    "NODE_ENV": "development"
                }
            },
            {
                "name": "Debug Test Server",
                "type": "node",
                "request": "launch",
                "program": "${workspaceFolder}/playwright-mcp/test-http-server.js",
                "outFiles": ["${workspaceFolder}/**/*.js"]
            }
        ]
    };

    const settingsJson = {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": true
        },
        "javascript.validate.enable": true,
        "html.validate.scripts": true,
        "files.associations": {
            "*.js": "javascript"
        },
        "search.exclude": {
            "**/node_modules": true,
            "**/playwright-mcp/node_modules": true,
            "**/test-results": true
        }
    };

    const extensionsJson = {
        "recommendations": [
            "ms-vscode.vscode-json",
            "esbenp.prettier-vscode",
            "dbaeumer.vscode-eslint",
            "ms-playwright.playwright"
        ]
    };

    setup.writeFile(path.join(vscodeDir, 'launch.json'), JSON.stringify(launchJson, null, 2));
    setup.writeFile(path.join(vscodeDir, 'settings.json'), JSON.stringify(settingsJson, null, 2));
    setup.writeFile(path.join(vscodeDir, 'extensions.json'), JSON.stringify(extensionsJson, null, 2));

    console.log('   VSCode configuration created');
});

// .env 파일 생성 (개발용)
setup.step('Create environment files', () => {
    const envContent = `# ClipGo Development Environment
NODE_ENV=development
# Add your development-specific environment variables here

# Test Configuration
TEST_PORT=3000
TEST_TIMEOUT=30000

# Chrome Extension Development (optional)
# CHROME_EXTENSION_ID=your-extension-id
# CHROME_EXTENSION_PATH=your-extension-path
`;

    setup.writeFile('.env.development', envContent);
    console.log('   Environment files created');
});

// 개발용 스크립트 업데이트
setup.step('Update development scripts', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

    // 개발용 스크립트 추가
    pkg.scripts = {
        ...pkg.scripts,
        "dev": "npm run dev:setup && npm run dev:server",
        "dev:setup": "node setup-dev-environment.js",
        "dev:server": "npm run start:test-server",
        "dev:test": "npm run test:all",
        "dev:watch": "npm run test:playwright -- --watch",
        "dev:debug": "node --inspect-brk test-extension.js",
        "dev:clean": "rm -rf node_modules playwright-mcp/node_modules playwright-mcp/test-results && npm install",
        "dev:logs": "tail -f playwright-mcp/server.log",
        "dev:reset": "npm run dev:clean && npm run dev:setup"
    };

    setup.writeFile('package.json', JSON.stringify(pkg, null, 2));
    console.log('   Development scripts updated');
});

// Git hooks 설정
setup.step('Setup Git hooks', () => {
    const hooksDir = '.git/hooks';
    setup.createDirectory(hooksDir);

    const preHook = `#!/bin/bash
# ClipGo Pre-commit Hook

echo "🧪 Running pre-commit checks..."

# Run basic tests
npm run test:basic > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Basic tests failed. Please fix before committing."
    exit 1
fi

# Validate manifest
npm run validate > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Manifest validation failed. Please fix before committing."
    exit 1
fi

echo "✅ Pre-commit checks passed!"
`;

    setup.writeFile(path.join(hooksDir, 'pre-commit'), preHook);
    setup.runCommand(`chmod +x ${path.join(hooksDir, 'pre-commit')}`);

    console.log('   Git hooks configured');
});

// 개발 문서 생성
setup.step('Create development documentation', () => {
    const devDocs = `# ClipGo Development Guide

## 🚀 Quick Start

1. **Setup Development Environment**
   \`\`\`bash
   npm run dev:setup
   \`\`\`

2. **Start Test Server**
   \`\`\`bash
   npm run dev:server
   \`\`\`

3. **Run Tests**
   \`\`\`bash
   npm run dev:test
   \`\`\`

4. **Development Mode**
   \`\`\`bash
   npm run dev
   \`\`\`

## 🧪 Testing

### Basic Tests
\`\`\`bash
npm run test:basic
\`\`\`

### Extension Tests
\`\`\`bash
npm run test:extension
\`\`\`

### Playwright Tests
\`\`\`bash
npm run test:playwright
\`\`\`

### Watch Mode
\`\`\`bash
npm run dev:watch
\`\`\`

## 🔧 Development Tools

### VSCode Configuration
- Debug configurations for extension and test server
- ESLint and Prettier integration
- Playwright extension recommended

### Test Server
- Runs on http://localhost:3000
- Serves test pages for Playwright MCP
- WebSocket support for real-time testing

### Mock Chrome API
- Full Chrome API simulation
- Works in regular browser environment
- Enables testing without actual Chrome extension

## 📁 Project Structure

\`\`\`
clipgo/
├── src/                    # Core manager classes
│   ├── StorageManager.js   # Storage management
│   ├── CategoryManager.js  # Category handling
│   └── ClipManager.js      # Clip operations
├── playwright-mcp/         # Playwright MCP integration
│   ├── tests/             # Automated tests
│   └── test-http-server.js # Test server
├── test-*.html             # Test pages
├── test-*.js               # Test scripts
├── .github/workflows/      # CI/CD pipelines
└── .vscode/               # VSCode configuration
\`\`\`

## 🚀 Deployment

### Local Testing
\`\`\`bash
npm run test:all
\`\`\`

### CI/CD
- Automatic testing on push/PR
- Deployment on release
- Test report generation

### Chrome Web Store
1. Build extension: \`npm run build\` (when implemented)
2. Upload to Chrome Web Store
3. Publish for review

## 🐛 Debugging

### Extension Debugging
\`\`\`bash
npm run dev:debug
\`\`\`

### Test Server Logs
\`\`\`bash
npm run dev:logs
\`\`\`

### Reset Development Environment
\`\`\`bash
npm run dev:reset
\`\`\`

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: \`npm run test:all\`
5. Submit a pull request

## 📞 Support

- GitHub Issues: Report bugs and request features
- Documentation: Check README.md and inline comments
- Tests: All functionality is covered by automated tests

---
*Generated by setup-dev-environment.js*
`;

    setup.writeFile('DEVELOPMENT.md', devDocs);
    console.log('   Development documentation created');
});

// 설정 실행
setup.run().catch(console.error);