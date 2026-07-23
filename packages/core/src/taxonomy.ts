export const PROGRAMMING_TAGS = [
  "programming",
  "frontend",
  "backend",
  "infrastructure",
  "devops",
  "cloud",
  "database",
  "testing",
  "security",
  "mobile",
  "data-ai",
  "api",
  "git",
  "tooling",
  "documentation",
  "design-system",
] as const;

export type ProgrammingTag = (typeof PROGRAMMING_TAGS)[number];
export type ProgrammingTagLocale = "en" | "ko";

export interface ProgrammingTagLabel {
  en: string;
  ko: string;
}

export const PROGRAMMING_TAG_LABELS = {
  programming: { en: "Programming", ko: "프로그래밍" },
  frontend: { en: "Frontend", ko: "프론트엔드" },
  backend: { en: "Backend", ko: "백엔드" },
  infrastructure: { en: "Infrastructure", ko: "인프라" },
  devops: { en: "DevOps", ko: "데브옵스" },
  cloud: { en: "Cloud", ko: "클라우드" },
  database: { en: "Database", ko: "데이터베이스" },
  testing: { en: "Testing", ko: "테스트" },
  security: { en: "Security", ko: "보안" },
  mobile: { en: "Mobile", ko: "모바일" },
  "data-ai": { en: "Data & AI", ko: "데이터·AI" },
  api: { en: "API", ko: "API" },
  git: { en: "Git", ko: "Git" },
  tooling: { en: "Tooling", ko: "개발 도구" },
  documentation: { en: "Documentation", ko: "문서화" },
  "design-system": { en: "Design System", ko: "디자인 시스템" },
} as const satisfies Record<ProgrammingTag, ProgrammingTagLabel>;

export interface ProgrammingAssetInput {
  name?: string;
  description?: string;
  path?: string;
}

export type ProgrammingAssetField = keyof ProgrammingAssetInput;

export interface ProgrammingKeywordEvidence {
  tag: ProgrammingTag;
  field: ProgrammingAssetField;
  keyword: string;
}

export interface ProgrammingClassification {
  programming: boolean;
  tags: ProgrammingTag[];
  evidence: ProgrammingKeywordEvidence[];
}

const KEYWORDS = {
  programming: [
    "programming",
    "software development",
    "software engineering",
    "source code",
    "codebase",
    "software developer",
    "web developer",
    "package.json",
    "tsconfig",
    "src",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".swift",
    "프로그래밍",
    "소프트웨어 개발",
    "소스 코드",
  ],
  frontend: [
    "frontend",
    "front-end",
    "react",
    "next.js",
    "nextjs",
    "vue",
    "angular",
    "svelte",
    "html",
    "css",
    "tailwind",
    "web ui",
    "프론트엔드",
  ],
  backend: [
    "backend",
    "back-end",
    "server-side",
    "node.js",
    "nodejs",
    "express",
    "fastapi",
    "django",
    "spring boot",
    "ruby on rails",
    "백엔드",
  ],
  infrastructure: [
    "infrastructure as code",
    "iac",
    "terraform",
    "pulumi",
    "ansible",
    "kubernetes",
    "helm",
    "docker",
    "인프라 자동화",
  ],
  devops: [
    "devops",
    "devsecops",
    "ci/cd",
    "continuous integration",
    "continuous delivery",
    "github actions",
    "jenkins",
    "deployment pipeline",
    "데브옵스",
  ],
  cloud: [
    "cloud computing",
    "cloud-native",
    "aws",
    "amazon web services",
    "azure",
    "google cloud",
    "gcp",
    "serverless",
    "lambda",
    "클라우드 네이티브",
    "클라우드 컴퓨팅",
  ],
  database: [
    "database",
    "sql",
    "postgres",
    "postgresql",
    "mysql",
    "sqlite",
    "mongodb",
    "redis",
    "schema migration",
    "데이터베이스",
  ],
  testing: [
    "unit test",
    "integration test",
    "end-to-end test",
    "e2e",
    "test automation",
    "vitest",
    "jest",
    "pytest",
    "playwright",
    "cypress",
    "테스트 자동화",
  ],
  security: [
    "application security",
    "cybersecurity",
    "devsecops",
    "vulnerability",
    "vulnerabilities",
    "penetration test",
    "secret scanning",
    "oauth",
    "authentication",
    "authorization",
    "encryption",
    "사이버 보안",
    "취약점",
  ],
  mobile: [
    "mobile app",
    "mobile development",
    "ios app",
    "android app",
    "react native",
    "flutter",
    "swiftui",
    "모바일 앱",
    "모바일 개발",
  ],
  "data-ai": [
    "artificial intelligence",
    "machine learning",
    "data science",
    "generative ai",
    "large language model",
    "llm",
    "pytorch",
    "tensorflow",
    "embedding",
    "retrieval augmented generation",
    "rag",
    "인공지능",
    "머신러닝",
    "데이터 과학",
  ],
  api: [
    "api",
    "rest api",
    "graphql",
    "grpc",
    "openapi",
    "webhook",
    "endpoint",
  ],
  git: [
    "git",
    "github",
    "gitlab",
    "version control",
    "pull request",
    "merge request",
    "버전 관리",
  ],
  tooling: [
    "developer tool",
    "build tool",
    "bundler",
    "compiler",
    "linter",
    "formatter",
    "eslint",
    "prettier",
    "webpack",
    "vite",
    "pnpm",
    "개발 도구",
  ],
  documentation: [
    "technical documentation",
    "api documentation",
    "documentation generator",
    "docs site",
    "readme",
    "jsdoc",
    "typedoc",
    "docusaurus",
    "기술 문서",
    "api 문서",
  ],
  "design-system": [
    "design system",
    "component library",
    "design token",
    "storybook",
    "ui kit",
    "디자인 시스템",
    "컴포넌트 라이브러리",
  ],
} as const satisfies Record<ProgrammingTag, readonly string[]>;

const NON_PROGRAMMING_CONTEXT = [
  "finance",
  "financial",
  "investment",
  "investor",
  "portfolio",
  "stock",
  "equity",
  "securities",
  "accounting",
  "tax",
  "legal",
  "law",
  "lawsuit",
  "court",
  "contract",
  "regulatory",
  "compliance",
  "금융",
  "투자",
  "증권",
  "회계",
  "세금",
  "법률",
  "계약",
] as const;

const TECHNICAL_ANCHORS = [
  "software development",
  "software engineering",
  "source code",
  "codebase",
  "software developer",
  "web developer",
  "repository",
  "framework",
  "library",
  "web app",
  "server",
  "deployment",
  "package.json",
  "프로그래밍",
  "소프트웨어 개발",
  "소스 코드",
  ...KEYWORDS.frontend,
  ...KEYWORDS.backend,
  ...KEYWORDS.infrastructure,
  ...KEYWORDS.devops,
  ...KEYWORDS.testing,
] as const;

const FIELDS: ProgrammingAssetField[] = ["name", "description", "path"];
const PROGRAMMING_TAG_SET = new Set<string>(PROGRAMMING_TAGS);

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

function containsKeyword(value: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`,
    "u",
  ).test(value);
}

function containsAnyKeyword(
  values: readonly string[],
  keywords: readonly string[],
): boolean {
  return values.some((value) =>
    keywords.some((keyword) => containsKeyword(value, normalize(keyword))),
  );
}

export function isProgrammingTag(value: string): value is ProgrammingTag {
  return PROGRAMMING_TAG_SET.has(value);
}

export function getProgrammingTagLabel(
  tag: ProgrammingTag,
  locale: ProgrammingTagLocale,
): string {
  return PROGRAMMING_TAG_LABELS[tag][locale];
}

export function classifyProgrammingAsset(
  input: ProgrammingAssetInput,
): ProgrammingClassification {
  const normalizedFields = FIELDS.map((field) => ({
    field,
    value: normalize(input[field] ?? ""),
  }));
  const evidence: ProgrammingKeywordEvidence[] = [];

  for (const tag of PROGRAMMING_TAGS) {
    for (const { field, value } of normalizedFields) {
      if (!value) {
        continue;
      }

      for (const keyword of KEYWORDS[tag]) {
        if (containsKeyword(value, normalize(keyword))) {
          evidence.push({ tag, field, keyword });
        }
      }
    }
  }

  const values = normalizedFields.map(({ value }) => value);
  const hasNonProgrammingContext = containsAnyKeyword(
    values,
    NON_PROGRAMMING_CONTEXT,
  );
  const hasTechnicalAnchor = containsAnyKeyword(values, TECHNICAL_ANCHORS);

  if (hasNonProgrammingContext && !hasTechnicalAnchor) {
    return { programming: false, tags: [], evidence: [] };
  }

  const matchedTags = PROGRAMMING_TAGS.filter((tag) =>
    evidence.some((item) => item.tag === tag),
  );
  const programming = matchedTags.length > 0;
  const tags = programming
    ? [
        "programming" as const,
        ...matchedTags.filter((tag) => tag !== "programming"),
      ]
    : [];

  return { programming, tags, evidence };
}
