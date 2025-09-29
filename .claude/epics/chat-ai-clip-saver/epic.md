---
name: chat-ai-clip-saver
status: backlog
created: 2025-09-27T22:05:47Z
progress: 0%
prd: .claude/prds/chat-ai-clip-saver.md
github: [Will be updated when synced to GitHub]
---

# Epic: chat-ai-clip-saver

## Overview
Chrome Extension을 활용한 AI 대화 클립 저장 시스템으로, Manifest V3 기반으로 구현. 사용자가 ChatGPT, Claude 등 AI 서비스에서 텍스트를 선택하여 빠르게 저장하고, Notion-style 계층형 카테고리로 관리할 수 있는 기능 제공.

## Architecture Decisions

### 기술 스택 선택
- **프레임워크**: 순수 Vanilla JavaScript (번들러 없음, 최소화된 패키지 의존성)
- **드래그&드롭**: SortableJS 라이브러리 (가볍고 안정적인 구현을 위해)
- **상태 관리**: Chrome Storage API + 간단한 Observer 패턴
- **스타일링**: 순수 CSS + CSS 변수로 다크모드 지원

### 아키텍처 패턴
- **MVP 패턴**: Model(Chrome Storage) - View(DOM) - Presenter(이벤트 핸들러)
- **모듈화**: 기능별로 분리된 모듈 구조 (storage, ui, category, clip, i18n)
- **이벤트 기반**: 컴포넌트 간 통신을 커스텀 이벤트로 처리

### 데이터 저장소
- **chrome.storage.local**: 모든 데이터를 브라우저 로컬에 저장
- **스키마 버전 관리**: 마이그레이션을 위한 버전 정보 저장
- **데이터 모델**: Category와 Clip 타입으로 계층 구조 구현

## Technical Approach

### Frontend Components
1. **Popup UI (popup.html/js)**
   - 왼쪽: 카테고리 트리 사이드바
   - 오른쪽: 클립 카드 리스트
   - 상단: 저장 폼 (선택 텍스트 미리보기)

2. **Content Script (content.js)**
   - 텍스트 선택 감지
   - 저장 팝업 트리거
   - Shadow DOM 지원

3. **Background Script (background.js)**
   - 컨텍스트 메뉴 관리
   - 단축키 처리
   - 메시지 라우팅

### 데이터 모델
```typescript
// Storage Schema
{
  categories: Category[],
  clips: Clip[],
  settings: {
    language: 'en' | 'ko',
    theme: 'light' | 'dark',
    version: string
  }
}
```

### 핵심 모듈
1. **StorageManager**: chrome.storage API 래퍼
2. **CategoryManager**: 카테고리 CRUD 및 계층 관리
3. **ClipManager**: 클립 저장 및 관리
4. **DragDropManager**: SortableJS 기반 드래그&드롭
5. **I18nManager**: 다국어 처리
6. **UIManager**: DOM 조작 및 이벤트 핸들링

## Implementation Strategy

### 개발 단계
1. **기반 구축** (1일)
   - Manifest V3 설정
   - 기본 파일 구조
   - Storage Manager 구현

2. **카테고리 시스템** (2일)
   - 계층 구조 데이터 모델
   - 트리 UI 컴포넌트
   - 드래그&드롭 기능

3. **클립 저장 시스템** (2일)
   - 텍스트 선택 및 저장
   - 메타데이터 자동 생성
   - 카드 UI 컴포넌트

4. **i18n 및 UX 개선** (1일)
   - 다국어 지원
   - 다크 모드
   - 토스트 알림

### 위험 완화
- **Chrome API 호환성**: Manifest V3 제약사항 검증
- **성능**: 대용량 데이터 처리 최적화 (최대 1000개 클립 기준)
- **사용자 데이터**: 마이그레이션 및 백업 방안 고려

## Tasks Created
- [ ] 001.md - Project Structure & Manifest Setup (parallel: true, 6h)
- [ ] 002.md - Storage System Implementation (parallel: false, 8h)
- [ ] 003.md - Category Data Model & Core Logic (parallel: false, 8h)
- [ ] 004.md - Clip Management System (parallel: true, 8h)
- [ ] 005.md - UI Components & Library Interface (parallel: true, 10h)
- [ ] 006.md - Drag & Drop Implementation (parallel: true, 8h)
- [ ] 007.md - Internationalization (i18n) System (parallel: true, 6h)
- [ ] 008.md - Testing, Optimization & Deployment (parallel: false, 8h)
- [ ] 009.md - On-Page Save Pop-up UI Development (parallel: true, 12h)
- [ ] 010.md - Pop-up Integration & Event Handling (parallel: false, 8h)
- [ ] 011.md - Pop-up Testing & UX Polish (parallel: false, 6h)

**Total tasks**: 11
**Parallel tasks**: 7
**Sequential tasks**: 4
**Estimated total effort**: 86 hours (약 11일)

### Task Dependency Flow
```
001 (Setup) → 002 (Storage) → 003 (Categories)
                ↓
                004 (Clip Mgmt) → 005 (UI) → 006 (Drag&Drop)
                ↓              ↓           ↓
                007 (i18n) ←────┘           ↓
                ↓                          ↓
                009 (Pop-up UI) ←──────────┘
                ↓
                010 (Integration) → 011 (Testing & Polish)
```

## Dependencies

### 외부 의존성
- **SortableJS**: 드래그&드롭 라이브러리 (CDN 또는 패키지)
- **Chrome Extensions API**: Manifest V3 권한
- **ES6+**: 최신 JavaScript 기능

### 내부 의존성
- Chrome 브라우저 (Manifest V3 지원)
- Edge Chromium 호환성 검증
- 로컬 스토리지 제약사항 (~10MB)

## Success Criteria (Technical)

### 성능 기준
- 저장 응답 시간: < 200ms
- UI 렌더링: < 100ms (300개 클립 기준)
- 스토리지 사용: < 5MB (초기 MVP)

### 품질 기준
- 크로스 브라우저 호환성: Chrome 90+, Edge 90+
- 에러 처리: 모든 API 호출 에러 핸들링
- 접근성: 키보드 네비게이션 지원

### 수용 기준
- PRD의 모든 MVP 기능 구현
- 한국어/영어 다국어 완전 지원
- 드래그&드롭 인터랙션 정상 작동
- 카테고리 계층 구조 3단계까지 지원

## Estimated Effort

### 시간 추정
- **총 개발 기간**: 6일 (8시간/일 기준)
- **인력**: 1명 (풀스택 개발자)
- **크리티컬 패스**: 데이터 모델 → 카테고리 시스템 → 클립 저장 시스템

### 리소스 요구사항
- Chrome 개발 환경
- Manifest V3 테스트 환경
- 기본 디자인 시안 (Figma 또는 Sketch)

### 리스크 요소
- **중간**: Chrome Storage API 제한사항
- **낮음**: SortableJS 통합 복잡성
- **낮음**: i18n 구현 난이도

### 병렬 작업 가능성
- UI 개발과 백엔드 로직 병렬 개발 가능
- 다국어 지원은 독립적으로 개발 가능