const CATEGORY_RULES = [
  ["frontend", ["frontend", "react", "vue", "angular", "svelte", "css", "tailwind", "web-ui"]],
  ["backend", ["backend", "server", "express", "django", "rails", "fastapi", "spring"]],
  ["infrastructure", ["infrastructure", "infra", "terraform", "kubernetes", "k8s", "ansible"]],
  ["devops", ["devops", "ci-cd", "continuous-integration", "deploy", "deployment", "docker"]],
  ["cloud", ["cloud", "aws", "azure", "gcp", "serverless", "lambda"]],
  ["database", ["database", "postgres", "postgresql", "mysql", "sqlite", "mongodb", "redis", "supabase", "sql"]],
  ["testing", ["testing", "test", "qa", "playwright", "vitest", "jest", "cypress"]],
  ["security", ["security", "secure", "auth", "oauth", "vulnerability", "sast"]],
  ["mobile", ["mobile", "ios", "android", "react-native", "flutter", "swiftui"]],
  ["data-ai", ["data-ai", "machine-learning", "artificial-intelligence", "llm", "model", "huggingface", "rag", "vector"]],
  ["api", ["api", "graphql", "grpc", "openapi", "mcp"]],
  ["git", ["git", "github", "gitlab", "version-control"]],
  ["tooling", ["tooling", "tool", "cli", "codex", "automation", "developer-experience"]],
  ["documentation", ["documentation", "docs", "document", "markdown", "technical-writing"]],
  ["design-system", ["design-system", "design-tokens", "figma", "component-library", "storybook"]],
];

const normalize = (value) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const hasTerm = (haystack, term) =>
  haystack === term ||
  haystack.startsWith(`${term}-`) ||
  haystack.endsWith(`-${term}`) ||
  haystack.includes(`-${term}-`);

/**
 * Infer a stable set of broad programming tags from display-safe names and
 * relative paths. The category order is part of the public output contract.
 */
export function inferProgrammingTags(...inputs) {
  const haystack = normalize(inputs.filter(Boolean).join(" "));

  if (!haystack) {
    return [];
  }

  return CATEGORY_RULES.filter(([, terms]) =>
    terms.some((term) => hasTerm(haystack, term)),
  ).map(([category]) => category);
}

export const PROGRAMMING_TAGS = Object.freeze(
  CATEGORY_RULES.map(([category]) => category),
);
