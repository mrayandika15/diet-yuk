import { analysisSchema } from "./domain";

export function parseAnalysis(content: string) {
  return analysisSchema.parse(
    JSON.parse(
      content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    ),
  );
}
