<div align="center">

# Agent Observatory

### 에이전트가 무엇을 사용하는지 보고, 중복을 이해하고, 공유할 대상만 승격하세요.

Codex와 Claude의 프로젝트, 세션, 서브에이전트, 스킬, 플러그인, 훅,
MCP 서버와 승인 기반 에이전트 승격을 탐색하는 로컬 우선 컨트롤
플레인입니다.

**한국어** · [English](./README.md) · [설치 안내](./SETUP.md) · [호환성](./docs/COMPATIBILITY.ko.md) · [아키텍처](./docs/architecture/ARCHITECTURE.md) · [배포 전략](./docs/architecture/DEPLOYMENT_STRATEGY.md)

![Local First](https://img.shields.io/badge/local--first-yes-13765a?style=flat-square)
![Package](https://img.shields.io/badge/package-0.4.0-201f1b?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Codex + Claude](https://img.shields.io/badge/environments-Codex%20%2B%20Claude-e17a45?style=flat-square)

</div>

![Agent Observatory 개요 화면](./docs/assets/readme/agent-observatory-overview.png)

> 문서 이미지는 README 전용 demo snapshot으로 생성했습니다. 기여자의
> 실제 프로젝트, 로컬 경로, 프롬프트, 세션 내용, 인증정보를 사용하지 않습니다.

## 이 프로젝트가 필요한 이유

AI 개발 환경은 빠르게 파편화됩니다. 글로벌 에이전트와 프로젝트 전용
에이전트가 섞이고, 여러 도구에 스킬과 플러그인이 쌓입니다. 같은 역할이
다른 이름으로 반복되면서 다음 질문에 답하기 어려워집니다.

- 어떤 에이전트와 기능이 설치되어 있는가?
- 각 스킬을 실제로 사용하는 프로젝트는 어디인가?
- 두 에이전트는 중복인가, 관련 역할인가, 별도 책임인가?
- 반복되는 프로젝트 에이전트를 글로벌로 승격해야 하는가?
- 승격하면 어떤 파일이 생성되고 안전하게 되돌릴 수 있는가?

Agent Observatory는 표시하기 안전한 로컬 메타데이터를 설명 가능한
인벤토리, 레지스트리, 관계 그래프로 바꿉니다.

## 현재 할 수 있는 작업

| 영역 | 현재 기능 |
|---|---|
| **관찰** | 허용된 로컬 경로에서 Codex, Claude, 공용 에이전트 메타데이터 탐색 |
| **범위 선택** | 전체, 환경별, 개별 프로젝트 화면 전환 |
| **찾기** | 프로젝트·에이전트 검색과 스킬·플러그인·훅·MCP 서버 필터 |
| **설명** | 간단한 역할 설명, 출처, 태그, 반복 실행 횟수 확인 |
| **비교** | 프로젝트 에이전트의 이름, 역할, 태그, 기능, 관찰된 스킬을 필드별 근거로 비교 |
| **그래프** | 환경, 프로젝트, 역할, 스킬 관계와 관찰 영향·활용 신호 확인 |
| **승격** | 명시적 승인 후 공용 Markdown 또는 Codex TOML 에이전트 정의 미리보기·생성 |
| **Finance Lab** | 비용·안전장치를 포함한 연결되지 않은 개인화·리서치 흐름 데모 |

## AI 환경 호환성

여기서 호환된다는 말은 Agent Observatory가 **로컬 메타데이터를 탐색하고
정규화할 수 있다**는 뜻입니다. 기반 모델을 직접 호출하거나 내장한다는
뜻은 아닙니다. GPT, Claude, Gemini 중 어떤 모델을 쓰는지가 아니라 해당
환경의 파일 형식과 세션 기록을 읽을 수 있는지가 통합 수준을 결정합니다.

| 환경 | 수준 | 현재 Agent Observatory에서 가능한 작업 |
|---|---|---|
| **OpenAI Codex** | ✅ 네이티브 어댑터 | `~/.codex`의 프로젝트, 세션, 서브에이전트와 로컬 기능 메타데이터 탐색; Codex TOML 에이전트 정의 생성 전 미리보기 지원 |
| **Anthropic Claude Code** | ✅ 네이티브 어댑터 | `~/.claude`의 프로젝트, 세션, 서브에이전트와 로컬 기능 메타데이터 탐색; 관찰한 프로필을 공용 또는 Codex 승격 형식으로 정규화 |
| **공용 `~/.agents` 정의** | 🧩 공용 매니페스트 | 재사용 가능한 에이전트·기능 정의 탐색; 실행 세션은 네이티브 환경 어댑터에서 가져옴 |
| **Cursor** | 🧭 어댑터 후보 | Cursor 자체는 MCP를 지원하지만, 아직 Cursor 프로젝트·규칙·세션을 자동 스캔하지 않음 |
| **Gemini CLI** | 🧭 어댑터 후보 | Gemini CLI는 MCP 설정과 상태를 제공하지만, 아직 `~/.gemini`를 스캔하지 않음 |
| **GitHub Copilot** | 🧭 어댑터 후보 | 커스텀 에이전트 프로필, 스킬, MCP 설정을 지원하며 저장소·CLI 어댑터는 계획 단계 |
| **Windsurf** | 🧭 어댑터 후보 | Cascade는 MCP 설정을 지원하지만, 아직 Windsurf 상태를 탐색하지 않음 |
| **OpenCode** | 🧭 어댑터 후보 | 주·서브에이전트 정의, 권한, MCP 설정을 제공하지만 전용 어댑터가 없음 |
| **Cline** | 🧭 어댑터 후보 | 프로젝트·글로벌 에이전트, 스킬, 훅, 플러그인, MCP 설정, 세션 저장소를 제공하지만 전용 어댑터가 없음 |

근거, 공식 문서 링크, 예상 스캔 경로, 어댑터 우선순위는
[상세 호환성 매트릭스](./docs/COMPATIBILITY.ko.md)에서 확인할 수 있습니다.
새 어댑터는 정규화 그래프 계약을 바꾸지 않고 탐색·비교 범위를 확장하도록
설계합니다.

> [!NOTE]
> 현재 Agent Observatory는 승인된 경로에서 발견한 **MCP 설정을
> 인벤토리화**합니다. 모든 MCP 클라이언트가 접속하는 범용 MCP 서버는
> 아직 아니며, 인벤토리를 만들기 위해 MCP 도구를 임의로 실행하지 않습니다.

그래프의 활용도 점수는 관찰 사용량, 연결 수, 프로젝트 범위를 이용한
상대 proxy입니다. 성공률, 결과 품질, 토큰 효율을 측정한 점수가 아닙니다.

## 빠른 시작

### 요구 사항

- Node.js 20 이상
- npm
- 선택 사항: `~/.codex`, `~/.claude`, `~/.agents`의 로컬 메타데이터

### 설치

~~~bash
git clone https://github.com/J3vn0/Agent-Observatory.git
cd Agent-Observatory
npm install
~~~

> [!IMPORTANT]
> 모든 npm 명령은 `package.json`이 있는 저장소 루트에서 실행해야 합니다.
> npm이 `Could not read package.json`을 표시한다면 현재 폴더를 먼저
> 확인하세요.

### 실행

터미널 1:

~~~bash
npm run dev:daemon
~~~

터미널 2:

~~~bash
npm run dev:dashboard
~~~

브라우저에서 [http://127.0.0.1:4173](http://127.0.0.1:4173)을 엽니다.

- **실시간**은 루프백 데몬이 현재 로컬 snapshot을 반환했다는 의미입니다.
- **대체 데이터**는 데몬을 사용할 수 없어 안전한 샘플을 표시한다는 의미입니다.

PowerShell에서는 실행 위치를 다음처럼 확인할 수 있습니다.

~~~powershell
Get-Location
Test-Path .\package.json
~~~

`Test-Path` 결과가 `True`여야 합니다. 경로 재정의와 문제 해결 방법은
[SETUP.md](./SETUP.md)를 참고하세요.

## 3분 제품 둘러보기

### 1. 관찰 범위 선택

전체 환경에서 시작해 Codex 또는 Claude로 좁힌 다음 하나의 프로젝트를
선택합니다. 프로젝트와 세션 활동은 선택 범위를 따르며, 설치 기능 수치는
현재 snapshot 전체 인벤토리를 설명합니다.

### 2. 반복 에이전트를 승격 전에 검토

![Agent Registry 승격 후보](./docs/assets/readme/agent-observatory-registry.png)

Registry는 여러 프로젝트에 반복되는 에이전트 정의를 묶고 왜 비슷한지
보여줍니다. 후보를 선택하면 이름, 역할, 태그, 기능, 스킬 근거를 확인할 수
있습니다. 정확한 대상을 계획하고 승인하기 전까지 승격은 읽기 전용입니다.

승격 실행에는 다음 안전장치가 적용됩니다.

- 짧은 유효시간을 가진 계획
- 루프백 origin 검사
- 명시적 승인 헤더
- 새 파일만 만드는 원자적 생성
- 덮어쓰기 대신 충돌 거부
- 데몬 세션이 작업을 보유하고 있을 때만 가능한 해시 보호 되돌리기

### 3. 관계와 관찰 활용도 확인

![에이전트와 스킬 관계 그래프](./docs/assets/readme/agent-observatory-graph.png)

그래프는 환경, 프로젝트, 관찰된 에이전트 역할과 스킬을 연결합니다.
강조된 테두리와 연결선은 현재 화면에서 더 강한 관찰 근거를 뜻합니다.
노드를 선택하면 관찰 사용량, 연결 수, 프로젝트 범위와 설명 출처를 확인할
수 있습니다.

같은 설명이 반복된다고 반드시 중복 에이전트인 것은 아닙니다. 스캐너는
프롬프트와 세션 메시지를 노출하는 대신 개인정보 보호용 공통 역할 설명을
사용하므로, 역할이 같은 별도 실행이 동일한 설명을 공유할 수 있습니다.

### 4. 기능 카탈로그 검색

![Agent Observatory 연동 카탈로그](./docs/assets/readme/agent-observatory-integrations.png)

스킬과 연동은 별도 페이지로 나뉩니다. 이름·설명으로 검색하고, 연동을
플러그인·훅·MCP 서버로 필터링해 태그, 상태, 활성 여부, 관찰 출처를
확인할 수 있습니다.

### 5. 금융 리서치 구성 시제품

![Agent Observatory Finance Lab](./docs/assets/readme/agent-observatory-finance.png)

Finance Lab은 연결되지 않은 인터랙티브 데모입니다. 리서치 성향, 후보
기능, 실행 주기 초안, 예상 토큰 비용, 읽기 전용 가드레일을 구성합니다.
실시간 시장 데이터에 연결하거나, 실제 예약 작업을 생성하거나, 종목을
추천하거나, 거래를 실행하지 않습니다.

## 시스템 작동 방식

~~~mermaid
flowchart LR
  C["Codex 메타데이터"] --> D["루프백 데몬"]
  L["Claude 메타데이터"] --> D
  A["공용 에이전트 매니페스트"] --> D
  D --> R["마스킹 및 정규화"]
  R --> S["안전한 snapshot API"]
  S --> W["React 대시보드"]
  W --> O["관찰"]
  W --> X["비교"]
  W --> G["그래프"]
  W --> P["승인 기반 승격 미리보기"]
~~~

현재 데몬은 `127.0.0.1:4317`에서 작은 JSON HTTP API를 제공합니다.
개발 중에는 Vite가 `127.0.0.1:4173` 대시보드의 `/api`와 `/health`를
데몬으로 전달합니다.

환경마다 다른 구조는 다음 공통 모델로 정규화합니다.

~~~text
환경
  └── 프로젝트
      ├── 기본 세션
      └── 서브에이전트 실행
          └── 관찰된 스킬
~~~

안전하게 확인할 수 있는 경우 부모 세션 메타데이터도 수집합니다. Agents와
Graph 페이지는 시각적 중복을 줄이기 위해 여러 실행을 역할 중심으로 묶습니다.

## 기술 스택

| 계층 | 기술 | 선택 이유 |
|---|---|---|
| **런타임** | Node.js 20+, ESM | 스캔, 로컬 API, 스크립트, 워크스페이스 도구를 하나의 크로스플랫폼 런타임으로 실행 |
| **모노레포** | npm workspaces, lockfile v3 | 대시보드, 데몬, core 계약, finance 정책을 하나의 설치·검증 흐름으로 관리 |
| **대시보드** | React 19, React DOM 19 | 데스크톱 작업 공간과 상호작용 가능한 근거 패널 구성 |
| **언어** | TypeScript 5.8 | 그래프, 환경, 레지스트리, 금융 계약 공유 |
| **빌드 도구** | Vite 6 | 빠른 로컬 개발, React 컴파일, 프로덕션 번들, API proxy |
| **내비게이션·상태** | React hooks, URL hash routing | 라우터·전역 상태 라이브러리 없이 가벼운 로컬 내비게이션 제공 |
| **UI** | Plain CSS, Lucide React | 작은 의존성으로 화이트 기반 데스크톱 디자인 시스템 구현 |
| **로컬 API** | Node `http`, `fs`, `path`, `crypto` | Express 같은 서버 프레임워크 없이 루프백 전용 JSON 서비스 구현 |
| **Core 도메인** | TypeScript ESM 패키지 | 결정론적 분류, 범위, 실행 집계, 유사도, 그래프 계약 |
| **Finance 도메인** | TypeScript ESM 패키지 | 리서치 성향, 안전 정책, 출처 규칙, 데모 가드레일 |
| **테스트** | Vitest 3, Node 내장 test runner | TypeScript 패키지는 Vitest, 의존성이 적은 데몬은 `node --test` 사용 |
| **현재 저장 방식** | fixture fallback, 인메모리 캐시·실행 상태, 제한적 `localStorage` | 영구 저장 계약을 설계하는 동안 MVP를 로컬·저의존성으로 유지 |

### 데이터베이스와 배포 방향

현재 MVP는 데이터베이스, 클라우드 계정, 컨테이너 런타임, 모델 API,
외부 MCP 서버 없이 실행할 수 있습니다.

- SQLite는 정규화된 관찰 데이터를 위한 로컬 영구 저장 계층으로 계획합니다.
- Supabase는 계정, 팀, 정제된 공용 정의, 금융 수집 결과를 위한 선택적
  동기화 계층 후보이며 비공개 로컬 스캔 저장소를 대체하지 않습니다.
- Docker는 호스팅 서비스, 격리 워커, 재현 가능한 통합 환경에서만
  선택적으로 사용합니다.

아키텍처 문서는 현재 구현과 목표 설계를 함께 다룹니다.
[ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)와
[DEPLOYMENT_STRATEGY.md](./docs/architecture/DEPLOYMENT_STRATEGY.md)를
참고하세요.

## 개인정보 보호와 변경 경계

탐색은 기본적으로 읽기 전용입니다. 대시보드는 제한 없는 로컬 내용이 아닌
표시하기 안전한 메타데이터만 받습니다.

| 대시보드에 반환 | 반환하지 않음 |
|---|---|
| 환경 식별자와 탐지 상태 | 대화 메시지 또는 프롬프트 |
| 정제된 프로젝트 라벨 | 에이전트 지침 또는 임의 소스 파일 |
| 불투명 세션 식별자와 관계 | 명령, 인자, 도구 입력 또는 출력 |
| 명시된 역할·스킬 귀속 | URL, 헤더, 토큰 또는 환경 변수 값 |
| 설치 기능 이름, 태그, 상태 | 사용자명, 절대 홈 경로 또는 인증정보 |
| 관찰 시각과 마스킹 요약 | 인증정보를 포함한 설정 값 |

승인된 Registry 승격만 제한적인 쓰기 예외입니다. 새 정의를 생성하며 기존
대상 파일은 덮어쓰지 않습니다.

## 설정

기본 경로를 사용한다면 `.env` 파일이 필요하지 않습니다.

~~~dotenv
AGENT_OBSERVATORY_CODEX_HOME=
AGENT_OBSERVATORY_CLAUDE_HOME=
AGENT_OBSERVATORY_AGENTS_HOME=
AGENT_OBSERVATORY_PORT=4317
VITE_OBSERVATORY_API=
~~~

유용한 로컬 확인 명령:

~~~bash
# 데몬 상태
curl http://127.0.0.1:4317/health

# 표시 안전하게 정규화된 snapshot
curl http://127.0.0.1:4317/api/snapshot
~~~

## 저장소 구조

~~~text
apps/
  dashboard/       React + Vite 작업 공간과 근거 중심 페이지
  daemon/          루프백 스캐너, snapshot API, 승격 계획기
packages/
  core/            그래프, 레지스트리, 범위, 분류, 유사도 계약
  finance/         금융 리서치 성향, 정책, 가드레일
scripts/
  capture-readme-screenshots.mjs
docs/
  architecture/    현재·목표 아키텍처 결정
  assets/readme/   문서 전용 snapshot과 제품 스크린샷
  design/          대시보드·상호작용 명세
  finance/         금융 확장 계획
obsidian/          장기 프로젝트 메모와 작업 로그
~~~

## 검증

~~~bash
npm run typecheck
npm test
npm run build
~~~

기본 테스트는 외부 MCP 서버, 금융 제공자, 데이터베이스, 모델 API를
요구하지 않습니다.

대시보드가 크게 변경되면 README 이미지를 다시 생성합니다.

~~~bash
npm run docs:screenshots
~~~

캡처 스크립트는 합성 snapshot과 루프백 전용 임시 서버를 사용합니다.
커밋하기 전에 생성된 이미지를 모두 검토하세요.

## 현재 범위와 로드맵

| 상태 | 기능 |
|---|---|
| ✅ 사용 가능 | Codex·Claude 환경 탐색 |
| ✅ 사용 가능 | 전체·환경·프로젝트 범위 |
| ✅ 사용 가능 | 프로젝트·세션·서브에이전트 인벤토리와 역할 집계 |
| ✅ 사용 가능 | 검색 가능한 스킬·연동 카탈로그 |
| ✅ 사용 가능 | 설명 가능한 프로젝트 에이전트 비교와 승격 후보 |
| ✅ 사용 가능 | 새 에이전트 정의 미리보기·생성·해시 보호 되돌리기 |
| ✅ 사용 가능 | 근거 기반 상대 신호를 표시하는 에이전트·스킬 그래프 |
| 🧪 데모 | 금융 개인화와 워크플로 구성 |
| 🛠 계획 | SQLite 영구 저장과 과거 사용 지표 |
| 🛠 계획 | 설명 가능한 스킬·플러그인 유사도와 생명주기 관리 |
| 🛠 계획 | 토큰·비용 예산을 포함한 에이전트 기능 채택 |
| 🛠 계획 | 승인된 읽기 전용 금융 데이터 수집기 |
| 🛠 계획 | 선택적 Supabase 계정·팀 동기화 |

> [!CAUTION]
> Agent Observatory는 투자 자문을 제공하거나 거래를 실행하지 않습니다.

## 기여

이슈와 범위가 명확한 Pull Request를 환영합니다. 스캐너를 읽기 전용으로
유지하고, 개인정보 보호 경계를 지키며, 구현 기능과 계획 기능을 구분하고,
변경 제출 전에 검증 명령을 실행해 주세요.

[J3vn0](https://github.com/J3vn0)가 만들고 있습니다.
