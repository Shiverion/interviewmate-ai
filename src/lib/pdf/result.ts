export type ParsingResult = {
  status:
    | "success"
    | "partial"
    | "failed"
    | "no_extractable_text"
    | "unsupported";
  text: string;
  pageCount: number;
  characterCount: number;
  warnings: string[];
  failureReason: string | null;
};
export function parsingFailure(
  status: ParsingResult["status"],
  reason: string
): ParsingResult {
  return {
    status,
    text: "",
    pageCount: 0,
    characterCount: 0,
    warnings: [],
    failureReason: reason,
  };
}
export function validatedCvText(result: ParsingResult | undefined) {
  return result &&
    ["success", "partial"].includes(result.status) &&
    typeof result.text === "string" &&
    !/^\s*(\[?SERVER_ERROR\]?|Internal Server Error|Error:)/i.test(result.text)
    ? result.text
    : "";
}
