const TOKEN = /\{([a-zA-Z0-9_]+)\}/g;

export const DEFAULT_NAMING_TEMPLATE = "{order}_{garment}_{size}_{item}";

export const BUILTIN_TOKENS = [
  "order",
  "garment",
  "size",
  "item",
  "quantity",
  "customer",
  "date",
] as const;

export function extractTokens(template: string): string[] {
  const found: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN.source, "g");
  while ((match = re.exec(template))) {
    found.push(match[1]);
  }
  return found;
}

export function sanitizeFileName(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_\-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "untitled";
}

export function renderNamingTemplate(
  template: string,
  values: Record<string, string | number | boolean | null | undefined>,
  extraKeys: string[] = [],
): { fileName: string; unknownTokens: string[] } {
  const allowed = new Set<string>([...BUILTIN_TOKENS, ...extraKeys]);
  const unknownTokens: string[] = [];
  const fileName = template.replace(TOKEN, (_, key: string) => {
    if (!allowed.has(key) && !(key in values)) {
      unknownTokens.push(key);
      return `{${key}}`;
    }
    const raw = values[key];
    if (raw === undefined || raw === null || raw === "") return "";
    return sanitizeFileName(String(raw));
  });
  return { fileName: sanitizeFileName(fileName.replace(/_+/g, "_")), unknownTokens };
}
