import { render, screen } from "@testing-library/react";
import KeyGate from "@/components/layout/KeyGate";
import {
  evaluationHeaders,
  getProviderKey,
  saveEvaluationProvider,
  saveProviderKey,
  clearAllKeys,
} from "@/lib/keys/store";
beforeEach(() => localStorage.clear());
test("workspace content is visible without an API key", () => {
  render(
    <KeyGate>
      <h1>Workspace without a key</h1>
    </KeyGate>
  );
  expect(screen.getByRole("heading")).toHaveTextContent(
    "Workspace without a key"
  );
});
test("provider keys remain separate and evaluation uses only the chosen key", () => {
  saveProviderKey("openai", "test-openai");
  saveProviderKey("gemini", "test-gemini");
  saveEvaluationProvider("gemini");
  expect(evaluationHeaders()).toEqual({
    "x-ai-provider": "gemini",
    "x-ai-key": "test-gemini",
  });
  saveProviderKey("gemini", "");
  expect(getProviderKey("openai")).toBe("test-openai");
  expect(evaluationHeaders()["x-ai-key"]).toBe("");
  clearAllKeys();
  expect(getProviderKey("openai")).toBeNull();
});
