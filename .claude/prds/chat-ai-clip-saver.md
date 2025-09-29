---
name: chat-ai-clip-saver
description: ChatGPT, Claude 등 AI 대화 서비스에서 사용자가 원하는 대화 조각을 저장하고 관리하는 Chrome 확장 프로그램
status: backlog
created: 2025-09-27T17:57:00Z
---

# PRD – Chat AI Clip Saver (MVP with Notion-style Categories & i18n)

## 1. 제품 개요

- **목표**: ChatGPT, Claude 등 AI 대화 서비스에서 사용자가 원하는 대화 조각을 저장하고, Notion 같은 계층형 카테고리 + 직관적 드래그 인터랙션으로 관리.
- **차별점**:
  - 부분 저장 + 초고속 복사
  - Notion-like 카테고리 관리(계층/드래그&드롭)
  - Gen Z 친화적 빠른 UX, 글로벌 다국어(i18n) 지원

## 2. 주요 사용자 시나리오

1. ChatGPT 답변 중 문단을 드래그 → 확장 팝업 → 클립 저장 (자동 제목, 태그, 카테고리 지정).
2. Claude 아이디어 중 일부 저장 → "아이디어/Startup" 하위카테고리에 분류.
3. 라이브러리에서 클립을 드래그 → 카테고리 사이드바로 이동 → 즉시 분류 재조정.
4. 카테고리 자체를 드래그&드롭으로 순서/계층 변경.

## 3. 기능 범위 (MVP)

### ✅ 포함
- **텍스트 저장**: 선택 영역 기반
- **메타데이터 기록**: 제목(자동/수정), 태그, 출처 URL, 서비스 구분, 생성 시각
- **카테고리 관리**: Notion-style
  - 계층 구조 지원 (상위/하위 카테고리)
  - 카테고리 생성/삭제/이름 수정
  - 드래그&드롭으로 순서/계층 변경
  - 클립 → 카테고리로 드래그&드롭 이동
- **라이브러리 관리**
  - 사이드바 = 카테고리 트리
  - 메인 영역 = 해당 카테고리 클립 카드
  - Copy / Open / Delete 버튼
- **i18n**: 자동 브라우저 언어 감지, en 기본 + ko 지원
- **저장 위치**: chrome.storage.local

### ❌ 제외 (추후 확장)
- 검색 (텍스트/태그 기반)
- 내보내기 (PDF/Markdown/JSON)
- 동기화 (Notion, Supabase, Google Drive 등)
- 자동 태깅/분류
- 전체 세션 자동 캡처

## 4. UX 흐름

### 1. 선택 후 저장 (On-Page Save Pop-up)
- 사용자가 텍스트 드래그 → 페이지 내 확장 팝업 표시
- **팝업 구성**:
  - **헤더**: "Save Clip" 타이틀 (중앙 정렬) + 앱 로고 아이콘 (좌측)
  - **제목 입력 필드**:
    - 레이블: "Title" (📝 아이콘 포함)
    - 기본값: 드래그된 텍스트 첫 30-40자 + | + AI 서비스명
    - 최대 60자 (백엔드 검증)
    - 수정 가능
  - **미리보기 영역**:
    - 레이블: "Preview" (📖 아이콘 포함)
    - 내용: 제목에 사용된 첫 줄 제외 후 80-100자
    - 읽기 전용, 스크롤 가능
  - **카테고리 선택**:
    - 레이블: "Category" (📂 아이콘 포함)
    - 계층형 트리 드롭다운
    - 최근 사용/추천 카테고리 기본 선택
  - **저장 버튼**:
    - 텍스트: "Save Clip"
    - 그라데이션 스타일 (보라색 계열)
- **팝업 특징**:
  - 다크 모드 (OS/브라우저 테마 자동 감지)
  - 드래그 영역 근처에 위치 (화면 경계 처리)
  - 외부 클릭/ESC 키로 닫기
  - 키보드 네비게이션 지원
- **저장 완료**: 화면 하단 중앙에 "Saved ✓" 토스트 (2초 자동 사라짐)

### 2. 라이브러리 보기
- 왼쪽: 카테고리 트리 (계층 접기/펼치기, 순서/계층 드래그 변경)
- 오른쪽: 해당 카테고리 클립 카드 목록 (최신순)
- 카드: 제목, 본문 요약, 태그/카테고리 뱃지, 메타정보
- Copy / Open / Delete 액션
- 클립 카드 드래그 → 사이드바 카테고리로 이동 가능

## 5. 기술 요구사항

- **플랫폼**: Chrome Extension (Manifest V3), Edge Chromium 호환
- **구성**:
  - manifest.json: 권한(storage, scripting, contextMenus, clipboardWrite)
  - background.js: 단축키, 컨텍스트 메뉴, 저장 핸들러
  - content.js: 선택 텍스트 추출 및 확장 팝업 관리 (Shadow DOM 대응)
  - popup.html/js: UI (사이드바 트리 + 카드 리스트 + 저장 뷰)
  - popup-overlay.html/js: 페이지 내 확장 팝업 컴포넌트
  - _locales/<lang>/messages.json: 다국어 지원(en/ko)
  - 저장소: chrome.storage.local

### 확장 팝업 기술 요구사항
- **팝업 컨테이너**: content.js에 동적으로 삽입되는 DOM 요소
- **위치 계산**: 드래그 선택 영역 기준으로 팝업 위치 자동 계산
- **테마 감지**: window.matchMedia('(prefers-color-scheme: dark)')를 이용한 다크모드 지원
- **포지셔닝**: CSS position: absolute/fixed로 화면 경계 처리
- **이벤트 처리**: 외부 클릭 감지, ESC 키 이벤트 리스너
- **애니메이션**: CSS transition으로 부드러운 표시/숨김 효과
- **접근성**: ARIA 속성, 키보드 네비게이션, 포커스 관리

### 타입 정의
```typescript
type Category = { id: string; name: string; parentId?: string; order: number; };
type Clip = {
  id: string;
  text: string;
  title: string;
  tags: string[];
  categoryIds: string[];
  url: string;
  source: 'chatgpt' | 'claude' | 'other';
  createdAt: number;
};
```

### 드래그&드롭
- 경량 라이브러리(SortableJS or native HTML5 drag&drop) 사용
- 카테고리 및 클립 이동 모두 지원

## 6. 비기능 요구사항

- **성능**:
  - 저장/복사 <200ms, 300개 클립/50개 카테고리에서도 지연 없음
  - 확장 팝업 표시 <100ms
  - 팝업 위치 계산 <50ms
- **사용성**:
  - 최소 클릭 → 저장, 단축키 지원(Ctrl/Cmd+Shift+S)
  - 팝업 표시 후 키보드로 모든 필드에 접근 가능
  - 외부 클릭 시 자동 닫기
- **호환성**: 최신 Chrome, Edge Chromium
- **프라이버시**: 브라우저 로컬 저장만, 외부 전송 없음

## 7. UX 디테일

- 토스트 알림: "Saved ✓", "Copied ✓"
- 최근 태그/카테고리 자동 제안
- 다크 모드 자동 감지
- 빈 상태 문구: "드래그 → 팝업 열기 → 저장 ✨"
- 계층형 카테고리 트리 UI: 펼치기/접기 지원

## 8. 다국어(i18n)

- _locales/en/messages.json, _locales/ko/messages.json
- HTML: data-i18n 속성 + applyI18n() 치환
- JS 문자열: chrome.i18n.getMessage()
- 동적 데이터(태그/카테고리)는 번역하지 않음

## 9. 성공 지표

- 저장 성공률 ≥95%
- 저장→복사 완료 <2초
- 설치 후 24시간 내 2회 이상 저장한 사용자 비율 ≥35%
- 카테고리 드래그&드롭 사용 경험률 ≥50%

## 10. 향후 확장 로드맵

1. 검색 기능(태그/본문)
2. 내보내기(PDF/Markdown/JSON)
3. 동기화(Notion, Supabase, Google Drive)
4. 자동 태깅/AI 분류
5. 고급 뷰 (다중 선택/삭제, 즐겨찾기, 그리드 뷰)