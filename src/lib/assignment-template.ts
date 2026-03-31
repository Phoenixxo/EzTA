const allowedPlaceholders = [
  "assignment_name",
  "identifier",
  "github_username",
  "name",
  "group_name",
] as const;

type TemplatePreviewInput = {
  assignmentName: string;
  identifier?: string;
  githubUsername?: string;
  studentName?: string;
  groupName?: string;
};

export function validateRepoTemplate(template: string) {
  const trimmed = template.trim();
  if (!trimmed) {
    return "Repo template is required.";
  }

  const matches = [...trimmed.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const invalid = matches.filter(
    (match) => !allowedPlaceholders.includes(match as (typeof allowedPlaceholders)[number]),
  );

  if (invalid.length > 0) {
    return `Unknown placeholder${invalid.length === 1 ? "" : "s"}: ${invalid
      .map((value) => `{${value}}`)
      .join(", ")}`;
  }

  if (!trimmed.includes("{github_username}") && !trimmed.includes("{identifier}")) {
    return "Template should include {github_username} or {identifier} so each repo resolves uniquely.";
  }

  return "";
}

export function previewRepoTemplate(template: string, input: TemplatePreviewInput) {
  return [
    ["{assignment_name}", input.assignmentName.trim() || "unit10"],
    ["{identifier}", input.identifier?.trim() || "s1234567"],
    ["{github_username}", input.githubUsername?.trim() || "octocat"],
    ["{name}", input.studentName?.trim() || "Jane Student"],
    ["{group_name}", input.groupName?.trim() || "group-a"],
  ].reduce(
    (current, [placeholder, replacement]) =>
      current.split(placeholder).join(replacement),
    template,
  );
}

export function getRepoTemplateHelpText() {
  return "Available placeholders: {assignment_name}, {identifier}, {github_username}, {name}, {group_name}";
}
