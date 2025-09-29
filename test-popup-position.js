/**
 * 확장 팝업 위치 계산 로직 테스트
 * TDD 방식으로 PopupManager의 위치 계산 기능을 테스트합니다
 */

class PopupPositionTest {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
    }

    // 헬퍼 함수: 테스트 결과 기록
    assert(condition, testName, errorMessage) {
        this.totalTests++;
        if (condition) {
            this.passedTests++;
            this.testResults.push(`✅ ${testName}`);
            return true;
        } else {
            this.testResults.push(`❌ ${testName}: ${errorMessage}`);
            return false;
        }
    }

    // 가상의 selection 객체 생성
    createMockSelection(rect) {
        return {
            getBoundingClientRect: () => ({
                left: rect.left || 0,
                top: rect.top || 0,
                right: rect.right || 100,
                bottom: rect.bottom || 50,
                width: rect.width || 100,
                height: rect.height || 50,
                ...rect
            })
        };
    }

    // 가상의 window 객체 생성
    createMockWindow(dimensions) {
        return {
            innerWidth: dimensions.innerWidth || 1024,
            innerHeight: dimensions.innerHeight || 768,
            scrollX: dimensions.scrollX || 0,
            scrollY: dimensions.scrollY || 0
        };
    }

    // 테스트 1: 기본 위치 계산 (화면 중앙에 가까운 위치)
    testBasicPositionCalculation() {
        console.log("🧪 테스트 1: 기본 위치 계산");

        const selection = this.createMockSelection({
            left: 100,
            top: 100,
            width: 200,
            height: 50
        });

        const window = this.createMockWindow({
            innerWidth: 1024,
            innerHeight: 768
        });

        // 예상 결과: 팝업이 선택 영역 근처에 위치
        const expectedPosition = {
            left: 100 + (200 / 2) - 150, // 선택 중앙 - 팝업 너비/2
            top: 100 + 50 + 10 // 선택 하단 + 10px 간격
        };

        const popupManager = new PopupManager();
        const actualPosition = popupManager.calculatePopupPosition(selection, window);

        this.assert(
            Math.abs(actualPosition.left - expectedPosition.left) < 5,
            "기본 위치 계산 정확성",
            `예상: ${expectedPosition.left}, 실제: ${actualPosition.left}`
        );

        this.assert(
            Math.abs(actualPosition.top - expectedPosition.top) < 5,
            "기본 수직 위치 계산 정확성",
            `예상: ${expectedPosition.top}, 실제: ${actualPosition.top}`
        );
    }

    // 테스트 2: 화면 경계 처리 (오른쪽 경계)
    testRightBoundaryHandling() {
        console.log("🧪 테스트 2: 오른쪽 화면 경계 처리");

        const selection = this.createMockSelection({
            left: 800,
            top: 100,
            width: 200,
            height: 50
        });

        const window = this.createMockWindow({
            innerWidth: 1024,
            innerHeight: 768
        });

        const popupManager = new PopupManager();
        const actualPosition = popupManager.calculatePopupPosition(selection, window);

        // 팝업이 화면 오른쪽을 넘지 않아야 함
        const popupWidth = 300; // 예상 팝업 너비
        this.assert(
            actualPosition.left + popupWidth <= window.innerWidth,
            "오른쪽 경계 미초과",
            `팝업 오른쪽: ${actualPosition.left + popupWidth}, 화면 너비: ${window.innerWidth}`
        );
    }

    // 테스트 3: 화면 경계 처리 (아래쪽 경계)
    testBottomBoundaryHandling() {
        console.log("🧪 테스트 3: 아래쪽 화면 경계 처리");

        const selection = this.createMockSelection({
            left: 100,
            top: 600,
            width: 200,
            height: 50
        });

        const window = this.createMockWindow({
            innerWidth: 1024,
            innerHeight: 768
        });

        const popupManager = new PopupManager();
        const actualPosition = popupManager.calculatePopupPosition(selection, window);

        // 팝업이 화면 아래쪽을 넘으면 선택 영역 위에 표시되어야 함
        const popupHeight = 400; // 예상 팝업 높이
        const isAboveSelection = actualPosition.top + popupHeight < selection.getBoundingClientRect().top;

        this.assert(
            actualPosition.top + popupHeight <= window.innerHeight || isAboveSelection,
            "아래쪽 경계 처리",
            "팝업이 화면을 넘지 않거나 선택 영역 위에 표시되어야 함"
        );
    }

    // 테스트 4: 스크롤 위치 고려
    testScrollPositionHandling() {
        console.log("🧪 테스트 4: 스크롤 위치 고려");

        const selection = this.createMockSelection({
            left: 100,
            top: 100,
            width: 200,
            height: 50
        });

        const window = this.createMockWindow({
            innerWidth: 1024,
            innerHeight: 768,
            scrollX: 100,
            scrollY: 200
        });

        const popupManager = new PopupManager();
        const actualPosition = popupManager.calculatePopupPosition(selection, window);

        // 스크롤 위치가 고려된 위치 계산
        this.assert(
            actualPosition.left >= window.scrollX,
            "수평 스크롤 위치 고려",
            `팝업 왼쪽: ${actualPosition.left}, 스크롤 X: ${window.scrollX}`
        );

        this.assert(
            actualPosition.top >= window.scrollY,
            "수직 스크롤 위치 고려",
            `팝업 상단: ${actualPosition.top}, 스크롤 Y: ${window.scrollY}`
        );
    }

    // 테스트 5: 매우 작은 선택 영역
    testSmallSelectionArea() {
        console.log("🧪 테스트 5: 매우 작은 선택 영역");

        const selection = this.createMockSelection({
            left: 50,
            top: 50,
            width: 10,
            height: 10
        });

        const window = this.createMockWindow({
            innerWidth: 1024,
            innerHeight: 768
        });

        const popupManager = new PopupManager();
        const actualPosition = popupManager.calculatePopupPosition(selection, window);

        // 매우 작은 선택 영역에서도 팝업이 적절히 위치해야 함
        this.assert(
            typeof actualPosition.left === 'number' && typeof actualPosition.top === 'number',
            "작은 선택 영역에서의 위치 계산",
            "위치가 숫자로 반환되어야 함"
        );
    }

    // 모든 테스트 실행
    runAllTests() {
        console.log("🚀 확장 팝업 위치 계산 테스트 시작\n");

        try {
            this.testBasicPositionCalculation();
            this.testRightBoundaryHandling();
            this.testBottomBoundaryHandling();
            this.testScrollPositionHandling();
            this.testSmallSelectionArea();
        } catch (error) {
            console.error("❌ 테스트 실행 중 오류 발생:", error);
            this.testResults.push(`❌ 테스트 실행 오류: ${error.message}`);
        }

        // 결과 요약
        console.log("\n📊 테스트 결과 요약");
        console.log("=".repeat(50));
        this.testResults.forEach(result => console.log(result));
        console.log("=".repeat(50));
        console.log(`총 테스트: ${this.totalTests}, 통과: ${this.passedTests}, 실패: ${this.totalTests - this.passedTests}`);
        console.log(`성공률: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

        return this.passedTests === this.totalTests;
    }
}

// 임시 PopupManager 클래스 (실제 구현 전용)
class PopupManager {
    calculatePopupPosition(selection, windowObj) {
        // 이 부분은 나중에 실제 구현할 것
        // 현재는 테스트를 위한 기본 구조만 반환
        const rect = selection.getBoundingClientRect();
        const popupWidth = 300;
        const popupHeight = 400;

        // 기본 위치: 선택 영역 중앙 아래
        let left = rect.left + (rect.width / 2) - (popupWidth / 2);
        let top = rect.bottom + 10;

        // 오른쪽 경계 체크
        if (left + popupWidth > windowObj.innerWidth) {
            left = windowObj.innerWidth - popupWidth - 20;
        }

        // 왼쪽 경계 체크
        if (left < 20) {
            left = 20;
        }

        // 아래쪽 경계 체크
        if (top + popupHeight > windowObj.innerHeight) {
            top = rect.top - popupHeight - 10;
        }

        // 위쪽 경계 체크
        if (top < 20) {
            top = 20;
        }

        return { left, top };
    }
}

// 테스트 실행
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PopupPositionTest, PopupManager };
} else {
    // 브라우저 환경에서 실행
    const test = new PopupPositionTest();
    const allPassed = test.runAllTests();

    if (allPassed) {
        console.log("\n🎉 모든 테스트 통과!");
    } else {
        console.log("\n⚠️ 일부 테스트 실패 - 구현이 필요합니다.");
    }
}