import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { AuthProvider, useAuthContext } from "./AuthProvider";
let changed: (user: unknown) => void;
const reset = jest.fn(),
  setInterview = jest.fn(),
  setControl = jest.fn(),
  setIntegrity = jest.fn();
jest.mock("firebase/auth", () => ({
  onIdTokenChanged: (_: unknown, cb: typeof changed) => {
    changed = cb;
    return jest.fn();
  },
}));
jest.mock("@/lib/firebase/config", () => ({
  auth: {},
  isFirebaseReady: () => true,
}));
jest.mock("@/lib/store/useInterviewStore", () => ({
  useInterviewStore: {
    getState: () => ({ reset }),
    setState: (...args: unknown[]) => setInterview(...args),
  },
}));
jest.mock("@/lib/integrity/control-store", () => ({
  useControlStore: { setState: (...args: unknown[]) => setControl(...args) },
}));
jest.mock("@/lib/integrity/store", () => ({
  useIntegrityStore: {
    setState: (...args: unknown[]) => setIntegrity(...args),
  },
}));
function PrivateView() {
  const { user } = useAuthContext();
  const [cachedOwner] = useState(user?.uid);
  return <p>Cached owner: {cachedOwner || "none"}</p>;
}
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
test("switching accounts remounts private pages and clears another account's recovery and credentials", () => {
  localStorage.setItem("interview-account", "a");
  render(
    <AuthProvider>
      <PrivateView />
    </AuthProvider>
  );
  act(() => changed({ uid: "a", emailVerified: true }));
  localStorage.setItem("interview-store", "private CV");
  localStorage.setItem("interview-recovery-v1:secret", "private conversation");
  localStorage.setItem("interviewmate_openai", "fake-key");
  sessionStorage.setItem("interview-integrity:secret", "private");
  expect(screen.getByText("Cached owner: a")).toBeInTheDocument();
  // Another tab may have already updated the shared marker. This tab must still clear its memory.
  localStorage.setItem("interview-account", "b");
  act(() => changed({ uid: "b", emailVerified: true }));
  expect(screen.getByText("Cached owner: b")).toBeInTheDocument();
  expect(localStorage.getItem("interview-store")).toBeNull();
  expect(localStorage.getItem("interview-recovery-v1:secret")).toBeNull();
  expect(localStorage.getItem("interviewmate_openai")).toBeNull();
  expect(sessionStorage.getItem("interview-integrity:secret")).toBeNull();
  expect(setInterview).toHaveBeenCalledWith({ _sessionContext: undefined });
  expect(setControl).toHaveBeenCalledWith({ record: null });
  expect(setIntegrity).toHaveBeenCalledWith({ record: null });
});
test("a reload/token refresh for the same account preserves interview recovery", () => {
  localStorage.setItem("interview-account", "a");
  localStorage.setItem("interview-recovery-v1:session", "saved answer");
  render(
    <AuthProvider>
      <PrivateView />
    </AuthProvider>
  );
  act(() => changed({ uid: "a", emailVerified: true }));
  act(() => changed({ uid: "a", emailVerified: true }));
  expect(reset).not.toHaveBeenCalled();
  expect(localStorage.getItem("interview-recovery-v1:session")).toBe(
    "saved answer"
  );
  act(() => changed(null));
  expect(localStorage.getItem("interview-recovery-v1:session")).toBeNull();
  expect(screen.getByText("Cached owner: none")).toBeInTheDocument();
});
