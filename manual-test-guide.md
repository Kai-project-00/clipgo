# 드래그 기능 수동 테스트 가이드

## 수정 완료 사항
✅ `manifest.json`의 ChatGPT/Claude.ai 콘텐츠 스크립트를 `test-simple.js`에서 `content.js`로 변경

## 배포 방법

### 1. Chrome 확장 프로그램 재로드
1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. 개발자 모드 활성화 (오른쪽 상단 토글)
4. ClipGo 확장 프로그램 찾기
5. 🔄 "새로고침" 버튼 클릭
6. 확장 프로그램이 업데이트되었는지 확인

### 2. ChatGPT 테스트
1. https://chat.openai.com/ 열기
2. 로그인되어 있지 않다면 로그인
3. 개발자 도구 열기 (F12)
4. Console 탭 선택
5. 다음 로그 확인:
   ```
   🎯 ClipGo Content Script Loaded
   ✅ Event listeners added successfully
   ```
6. 채팅창이나 인터페이스에서 아무 텍스트나 드래그 선택
7. 드래그 후 팝업이 나타나는지 확인
8. 팝업이 나타나면 성공!

### 3. Claude.ai 테스트
1. https://claude.ai/ 열기
2. 로그인되어 있지 않다면 로그인
3. 개발자 도구 열기 (F12)
4. Console 탭 선택
5. 동일한 로그 확인:
   ```
   🎯 ClipGo Content Script Loaded
   ✅ Event listeners added successfully
   ```
6. 페이지에서 텍스트 드래그 선택
7. 팝업이 나타나는지 확인

## 예상 결과

### 성공 시:
- 텍스트 드래그 시 바로 팝업이 나타남
- 팝업에는 "Save Clip" 버튼과 함께 제목, 미리보기 텍스트, 카테고리 선택이 표시됨
- 저장 후 확장 프로그램 팝업에서 클립이 보임

### 실패 시 확인할 사항:
1. **콘솔 에러 확인**: 개발자 도구 Console 탭에서 오류 메시지 확인
2. **스크립트 로딩**: "🎯 ClipGo Content Script Loaded" 로그가 있는지 확인
3. **권한 문제**: 확장 프로그램이 올바르게 로드되었는지 확인
4. **캐시 문제**: 페이지 새로고침 (Ctrl+R 또는 Cmd+R)

## 문제 해결

### 콘텐츠 스크립트가 로드되지 않을 경우:
1. 확장 프로그램 재로드
2. 페이지 하드 리프레시 (Ctrl+Shift+R 또는 Cmd+Shift+R)
3. 확장 프로그램 제거 후 다시 설치

### 팝업이 나타나지 않을 경우:
1. 다른 텍스트 선택 시도
2. 더 긴 텍스트 선택 (최소 5자 이상)
3. 페이지의 다른 부분에서 테스트

### 저장 기능이 동작하지 않을 경우:
1. 팝업의 "Save Clip" 버튼 클릭
2. 확장 프로그램 아이콘 클릭하여 저장된 클립 확인
3. 테스트 페이지에서 저장 확인