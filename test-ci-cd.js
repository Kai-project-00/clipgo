/**
 * ClipGo CI/CD 파이프라인 테스트
 * TDD 방식으로 개발된 CI/CD 파이프라인 검증
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting ClipGo CI/CD Pipeline Tests...');

class CICDTestSuite {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log(`📋 Running ${this.tests.length} CI/CD tests...\n`);

        for (const test of this.tests) {
            try {
                console.log(`🔍 Testing: ${test.name}`);
                await test.testFn();
                console.log(`✅ PASSED: ${test.name}\n`);
                this.passed++;
            } catch (error) {
                console.log(`❌ FAILED: ${test.name}`);
                console.log(`   Error: ${error.message}\n`);
                this.failed++;
            }
        }

        console.log(`📊 Test Results:`);
        console.log(`   ✅ Passed: ${this.passed}`);
        console.log(`   ❌ Failed: ${this.failed}`);
        console.log(`   📈 Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);

        if (this.failed > 0) {
            process.exit(1);
        }
    }

    expect(condition, message) {
        if (!condition) {
            throw new Error(message || 'Expectation failed');
        }
    }

    expectFileExists(filePath, message) {
        const exists = fs.existsSync(filePath);
        if (!exists) {
            throw new Error(message || `File not found: ${filePath}`);
        }
    }

    expectValidJson(filePath, message) {
        this.expectFileExists(filePath, message);
        try {
            JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            throw new Error(message || `Invalid JSON in ${filePath}: ${error.message}`);
        }
    }
}

const testSuite = new CICDTestSuite();

// GitHub Actions 워크플로우 테스트
testSuite.test('GitHub Actions workflow exists', () => {
    const workflowPath = '.github/workflows/ci-test.yml';
    testSuite.expectFileExists(workflowPath, 'GitHub Actions workflow file should exist');

    const content = fs.readFileSync(workflowPath, 'utf8');
    testSuite.expect(content.includes('ClipGo CI/CD Pipeline'), 'Workflow should have correct name');
    testSuite.expect(content.includes('npm test'), 'Workflow should run tests');
    testSuite.expect(content.includes('npm ci'), 'Workflow should install dependencies');
});

// Manifest 유효성 테스트
testSuite.test('Manifest.json validation', () => {
    testSuite.expectValidJson('manifest.json', 'manifest.json should be valid JSON');

    const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    testSuite.expect(manifest.name, 'Manifest should have name');
    testSuite.expect(manifest.version, 'Manifest should have version');
    testSuite.expect(manifest.manifest_version === 3, 'Manifest should be version 3');
    testSuite.expect(Array.isArray(manifest.content_scripts), 'Manifest should have content_scripts');
});

// Package.json 스크립트 테스트
testSuite.test('Package.json scripts configuration', () => {
    testSuite.expectValidJson('package.json', 'package.json should be valid JSON');

    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    testSuite.expect(pkg.scripts, 'Package should have scripts');
    testSuite.expect(pkg.scripts.test, 'Should have test script');
    testSuite.expect(pkg.scripts['test:playwright'], 'Should have playwright test script');
    testSuite.expect(pkg.scripts.validate, 'Should have validate script');
});

// 의존성 설치 테스트
testSuite.test('Dependencies installation', () => {
    try {
        execSync('npm list --depth=0', { stdio: 'pipe' });
        console.log('✅ Dependencies are installed');
    } catch (error) {
        throw new Error('Dependencies not properly installed');
    }
});

// 기본 테스트 실행 가능성 테스트
testSuite.test('Basic test execution', () => {
    try {
        const result = execSync('npm run validate', { encoding: 'utf8', stdio: 'pipe' });
        testSuite.expect(result.includes('✅ Manifest validation passed'), 'Validation should pass');
    } catch (error) {
        throw new Error(`Basic test execution failed: ${error.message}`);
    }
});

// Playwright MCP 테스트 환경 테스트
testSuite.test('Playwright MCP environment', () => {
    const mcpPath = 'playwright-mcp';
    testSuite.expectFileExists(mcpPath, 'Playwright MCP directory should exist');
    testSuite.expectFileExists(path.join(mcpPath, 'package.json'), 'MCP package.json should exist');
    testSuite.expectFileExists(path.join(mcpPath, 'tests'), 'MCP tests directory should exist');

    const testsDir = fs.readdirSync(path.join(mcpPath, 'tests'));
    testSuite.expect(testsDir.length > 0, 'Should have test files in MCP directory');
});

// 테스트 페이지 유효성 테스트
testSuite.test('Test pages availability', () => {
    const testPages = [
        'test-real-website.html',
        'test-chatgpt-simulation.html',
        'test-claude-simulation.html',
        'test-content-types.html'
    ];

    for (const page of testPages) {
        testSuite.expectFileExists(page, `Test page ${page} should exist`);
    }
});

// 소스 코드 구조 테스트
testSuite.test('Source code structure', () => {
    const requiredFiles = [
        'background.js',
        'content.js',
        'popup.js',
        'popup.html',
        'popup.css',
        'manifest.json',
        'src/StorageManager.js',
        'src/CategoryManager.js',
        'src/ClipManager.js'
    ];

    for (const file of requiredFiles) {
        testSuite.expectFileExists(file, `Required file ${file} should exist`);
    }
});

// Mock Chrome API 테스트
testSuite.test('Mock Chrome API availability', () => {
    testSuite.expectFileExists('test-mock-chrome-api.js', 'Mock Chrome API should exist');

    const mockApi = fs.readFileSync('test-mock-chrome-api.js', 'utf8');
    testSuite.expect(mockApi.includes('MockStorage'), 'Mock API should have MockStorage class');
    testSuite.expect(mockApi.includes('MockRuntime'), 'Mock API should have MockRuntime class');
});

// HTTP 서버 테스트
testSuite.test('HTTP test server', () => {
    const serverPath = 'playwright-mcp/test-http-server.js';
    testSuite.expectFileExists(serverPath, 'HTTP test server should exist');

    const serverCode = fs.readFileSync(serverPath, 'utf8');
    testSuite.expect(serverCode.includes('express'), 'Server should use Express');
    testSuite.expect(serverCode.includes('WebSocket'), 'Server should support WebSocket');
});

// 보안 검증 테스트
testSuite.test('Security validation', () => {
    // 기본적인 보안 체크 - 민감한 정보가 코드에 노출되지 않았는지 확인
    const jsFiles = [
        'background.js',
        'content.js',
        'popup.js',
        'src/StorageManager.js',
        'src/CategoryManager.js',
        'src/ClipManager.js'
    ];

    const sensitivePatterns = [
        /api[_-]?key/i,
        /secret/i,
        /password/i,
        /token/i,
        /private[_-]?key/i
    ];

    for (const file of jsFiles) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            for (const pattern of sensitivePatterns) {
                if (pattern.test(content)) {
                    // 의심스러운 패턴 발견 (주석이나 테스트 코드는 제외)
                    const lines = content.split('\n');
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (pattern.test(line) && !line.includes('//') && !line.includes('/*') && !line.includes('test')) {
                            console.log(`⚠️  Potential sensitive pattern found in ${file}:${i + 1}`);
                        }
                    }
                }
            }
        }
    }
});

// 테스트 실행
testSuite.run().catch(console.error);