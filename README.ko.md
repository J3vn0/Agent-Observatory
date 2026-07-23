<div align="center">

# Agent Observatory

### 내 AI 에이전트 환경을 한곳에서 관찰하는 로컬 우선 컨트롤 플레인

Codex와 Claude의 프로젝트, 세션, 서브에이전트, 스킬, 플러그인, 훅,
MCP 서버를 개인정보 보호 중심의 대시보드에서 확인합니다.

**한국어** · [English](./README.md) · [설치 안내](./SETUP.md) · [아키텍처](./docs/architecture/ARCHITECTURE.md)

![Local First](https://img.shields.io/badge/local--first-yes-13765a?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-171714?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Codex + Claude](https://img.shields.io/badge/environments-Codex%20%2B%20Claude-e17a45?style=flat-square)

</div>

---

## 왜 Agent Observatory인가요?

AI 코딩 환경을 사용하다 보면 프로젝트, 에이전트, 스킬, 플러그인,
MCP 서버가 빠르게 늘어납니다. Agent Observatory는 흩어진 로컬 상태를
하나의 이해하기 쉬운 지도로 정리합니다.

| | 기능 | 확인할 수 있는 것 |
|---|---|---|
| ◎ | **통합 인벤토리** | Codex, Claude, 공용 에이전트 자산을 한 화면에서 확인 |
| ◫ | **프로젝트 범위** | 전체, 환경별, 개별 프로젝트 내역을 자유롭게 전환 |
| ⑂ | **에이전트 계층** | 기본 세션과 그 아래 생성된 서브에이전트 관계 추적 |
| ◇ | **안전한 관찰** | 대화나 인증정보를 제외한 표시 안전 메타데이터만 제공 |

## 주요 화면

| 페이지 | 용도 |
|---|---|
| **개요** | 환경 상태와 프로젝트, 세션, 서브에이전트, 스킬, 플러그인 수 확인 |
| **프로젝트** | 로컬 프로젝트 내역과 프로젝트별 세션·서브에이전트 수 확인 |
| **에이전트** | 기본 세션, 서브에이전트, 부모 관계, 역할, 관찰 시각 확인 |
| **레지스트리** | 설명 가능한 중복 탐지와 프로젝트 간 글로벌 에이전트 승격 미리보기 |
| **스킬** | 프런트엔드, 백엔드, 클라우드, 보안, 데이터·AI 등 태그 기반 검색 |
| **연동** | 플러그인, 훅, MCP 서버의 상태와 출처 확인 |
| **그래프** | 환경에서 프로젝트, 세션, 서브에이전트로 이어지는 관계 시각화 |

인터페이스는 한국어와 영어를 지원하며, 화이트 기반 데스크톱 UI와
작은 화면을 위한 반응형 레이아웃을 제공합니다.

## 동작 방식

~~~mermaid
flowchart LR
  C["Codex<br/>~/.codex"] --> D["로컬 데몬<br/>127.0.0.1"]
  L["Claude<br/>~/.claude"] --> D
  A["공용 에이전트<br/>~/.agents"] --> D
  D --> R["마스킹 및 정규화"]
  R --> S["안전한 스냅샷 API"]
  S --> W["Observatory 대시보드"]
  W --> P["전체 / 환경 / 프로젝트 범위"]
~~~

루프백 전용 데몬이 환경마다 다른 로컬 구조를 읽고 다음 공통 모델로
정규화합니다.

~~~text
환경
  +-- 프로젝트
      +-- 기본 세션
          +-- 서브에이전트 세션
~~~

Codex의 부모 관계는 안전한 <code>session_meta</code> 필드에서, Claude의 부모 관계는
프로젝트 세션과 중첩된 <code>subagents</code> 폴더 구조에서 가져옵니다.

## 개인정보 보호 경계

Agent Observatory는 기본적으로 읽기 전용입니다. 핵심 로컬 탐색에는
클라우드 계정, 텔레메트리 서비스, 모델 API가 필요하지 않습니다.

| 대시보드에 전달되는 정보 | 전달하지 않는 정보 |
|---|---|
| 환경 식별자 | 대화 메시지와 프롬프트 |
| 정제된 프로젝트 이름 | 에이전트 지침과 설명 |
| 불투명 세션 식별자 | 명령어, 인자, 도구 입력 및 출력 |
| 부모 세션 관계 | URL, 헤더, 토큰 및 인증정보 |
| 명시적으로 저장된 역할 메타데이터 | 환경변수 값과 신뢰 해시 |
| 관찰 시각 | 사용자명과 전체 홈 디렉터리 경로 |
| 설치 자산 이름과 상태 | 임의의 로컬 파일 내용 |

자동화 테스트에는 가짜 비밀값, 사용자명, 전체 경로가 결과에 포함되지
않는지 확인하는 센티널 검사가 포함됩니다.

## 빠른 시작

### 요구 사항

- Node.js 20 이상
- npm 10 이상
- 선택 사항: <code>~/.codex</code>, <code>~/.claude</code>, <code>~/.agents</code>의 로컬 데이터

### 설치 및 실행

~~~bash
git clone https://github.com/J3vn0/Agent-Observatory.git
cd Agent-Observatory
npm install
~~~

로컬 데몬을 실행합니다.

~~~bash
npm run dev:daemon
~~~

두 번째 터미널에서 대시보드를 실행합니다.

~~~bash
npm run dev:dashboard
~~~

브라우저에서 **http://127.0.0.1:4173**을 엽니다.

데몬이 연결되면 헤더에 **실시간**이 표시됩니다. 데몬을 사용할 수 없을
때에는 샘플 데이터가 대체 데이터임을 명확하게 표시합니다.

## 선택적 경로 설정

기본 경로를 사용하면 <code>.env</code> 파일이 필요하지 않습니다. 로컬 폴더가
다른 위치에 있을 때만 다음 값을 설정하세요.

~~~dotenv
AGENT_OBSERVATORY_CODEX_HOME=
AGENT_OBSERVATORY_CLAUDE_HOME=
AGENT_OBSERVATORY_AGENTS_HOME=
AGENT_OBSERVATORY_PORT=4317
VITE_OBSERVATORY_API=
~~~

전체 설정과 개인정보 보호 설명은 [SETUP.md](./SETUP.md)를 참고하세요.

## 검증

~~~bash
npm run typecheck
npm test
npm run build
~~~

기본 테스트는 외부 MCP 서버, 금융 데이터 제공자, 모델 API 없이 실행됩니다.

## 저장소 구조

~~~text
apps/
  dashboard/       React + Vite 기반 Observatory
  daemon/          루프백 전용 스캐너와 스냅샷 API
packages/
  core/            그래프, 환경, 프로젝트, 세션, 분류 계약
  finance/         향후 금융 확장을 위한 도메인 가드레일
docs/              아키텍처, 제품, 디자인, 금융 문서
obsidian/          지속적인 프로젝트 메모리와 작업 기록
~~~

## 현재 상태

**v0.4.0 — 에이전트 레지스트리와 승격 미리보기**

- [x] Codex 및 Claude 환경 어댑터
- [x] 전체, 환경, 프로젝트 범위
- [x] 기본 세션과 서브에이전트 관계
- [x] 태그 기반 스킬 및 연동 레지스트리
- [x] 반응형 한국어·영어 대시보드
- [x] 비밀정보를 제외하는 로컬 스냅샷 계약
- [x] 설명 가능한 프로젝트 에이전트 유사도와 승격 후보
- [ ] 설명 가능한 스킬 유사도
- [ ] 승인 기반의 되돌릴 수 있는 승격 실행
- [ ] 스킬 사용자화 및 생명주기 관리 흐름
- [ ] 추가 에이전트 환경 어댑터
- [ ] 읽기 전용 금융 관찰 팩

## 로드맵 원칙

1. **변경하기 전에 관찰합니다.** 설치, 비활성화, 삭제보다 탐색과 비교를
   먼저 제공합니다.
2. **모든 점수를 설명합니다.** 유사도와 상태에는 사용자가 확인할 수 있는
   근거가 함께 제공되어야 합니다.
3. **데몬은 로컬에 둡니다.** 브라우저에는 무제한 경로나 인증정보 값을
   전달하지 않습니다.
4. **금융 데이터는 근거를 우선합니다.** 향후 시장·공시 기능에는 출처,
   관찰 시각, 최신성 정보를 표시합니다.

> Agent Observatory는 투자 자문을 제공하거나 거래를 실행하지 않습니다.
> 금융 기능은 향후 읽기 전용 확장으로 개발할 예정입니다.

## 기여

이슈와 범위가 명확한 Pull Request를 환영합니다. 어댑터는 읽기 전용으로
유지하고 개인정보 보호 경계를 지켜주세요. 변경 제출 전 검증 명령을
실행하는 것을 권장합니다.
