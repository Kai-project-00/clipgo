/**
 * ClipGo 테스트용 모의 Chrome API
 * 실제 Chrome 확장 프로그램 없이도 테스트할 수 있도록 모의 API를 제공합니다.
 */

// 모의 스토리지 시스템
class MockStorage {
    constructor() {
        this.data = {};
        this.listeners = [];
        // 테스트를 위한 초기 데이터 설정
        this.data = {
            'categories': [
                { id: 'general', name: '일반', description: '일반적인 클립' },
                { id: 'work', name: '업무', description: '업무 관련 클립' }
            ],
            'clips': []
        };
    }

    get(keys, callback) {
        // 디버깅을 위해 즉시 실행
        setTimeout(() => {
            const result = {};
            if (Array.isArray(keys)) {
                keys.forEach(key => {
                    if (this.data[key] !== undefined) {
                        result[key] = this.data[key];
                    }
                });
            } else if (typeof keys === 'string') {
                if (this.data[keys] !== undefined) {
                    result[keys] = this.data[keys];
                }
            } else {
                // 모든 데이터 반환
                Object.assign(result, this.data);
            }
            console.log('MockStorage.get:', keys, '->', result);
            callback(result);
        }, 1); // 지연 시간을 1ms로 줄임
    }

    set(items, callback) {
        setTimeout(() => {
            console.log('MockStorage.set:', items);
            Object.assign(this.data, items);
            console.log('MockStorage.data after set:', this.data);
            this.listeners.forEach(listener => listener());
            if (callback) callback();
        }, 1); // 지연 시간을 1ms로 줄임
    }

    remove(keys, callback) {
        setTimeout(() => {
            if (Array.isArray(keys)) {
                keys.forEach(key => delete this.data[key]);
            } else {
                delete this.data[keys];
            }
            this.listeners.forEach(listener => listener());
            if (callback) callback();
        }, 10);
    }

    clear(callback) {
        setTimeout(() => {
            this.data = {};
            this.listeners.forEach(listener => listener());
            if (callback) callback();
        }, 10);
    }

    onChanged = {
        addListener: (callback) => {
            this.listeners.push(callback);
        }
    };
}

// 모의 Runtime API
class MockRuntime {
    constructor() {
        this.messageListeners = [];
        this.id = 'test-extension-id';
    }

    sendMessage(message, callback) {
        setTimeout(() => {
            // 백그라운드 스크립트 응답 모의
            const response = {
                success: true,
                timestamp: Date.now(),
                action: message.action || 'unknown'
            };
            if (callback) callback(response);
        }, 50);
    }

    onMessage = {
        addListener: (callback) => {
            this.messageListeners.push(callback);
        }
    };
}

// 모의 Chrome API 객체
const mockChrome = {
    runtime: new MockRuntime(),
    storage: {
        local: new MockStorage(),
        sync: new MockStorage()
    },
    tabs: {
        query: (queryInfo, callback) => {
            setTimeout(() => {
                callback([{ id: 1, url: window.location.href }]);
            }, 10);
        }
    }
};

// 테스트 환경에서만 모의 API를 window 객체에 추가
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.chrome = mockChrome;
    console.log('🧪 Mock Chrome API loaded for testing');

    // 테스트를 위한 초기 데이터 설정
    window.chrome.storage.local.set({
        'categories': [
            { id: 'general', name: '일반', description: '일반적인 클립' },
            { id: 'work', name: '업무', description: '업무 관련 클립' }
        ],
        'clips': []
    });
}

// 모듈로도 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = mockChrome;
}