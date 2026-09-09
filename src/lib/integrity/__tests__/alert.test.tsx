import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import IntegrityAlert from "@/components/interview/IntegrityAlert";
import { useControlStore } from "../control-store";
import { newCheckpoint, run } from "../session-control";
beforeEach(() => {
  useControlStore.setState({
    record: run(newCheckpoint("alert-test"), 100000),
    storageFailed: false,
  });
  HTMLDialogElement.prototype.showModal = jest.fn(function (
    this: HTMLDialogElement
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (
    this: HTMLDialogElement
  ) {
    this.removeAttribute("open");
  });
});
function phase(phase: "paused" | "final_warning" | "ended") {
  act(() => {
    const s = useControlStore.getState().record!;
    useControlStore.setState({
      record: {
        ...s,
        phase,
        interruptions:
          phase === "paused" ? 1 : phase === "final_warning" ? 2 : 3,
      },
    });
  });
}
test("full-screen pause is modal and requires explicit resuming", async () => {
  const resume = jest.fn();
  render(<IntegrityAlert onResume={resume} />);
  phase("paused");
  const modal = screen.getByRole("dialog");
  expect(modal).toHaveAttribute("aria-modal", "true");
  expect(screen.getByRole("alert")).toHaveTextContent("Interview paused");
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(modal, cancel);
  expect(cancel.defaultPrevented).toBe(true);
  await act(async () => {
    fireEvent.click(
      screen.getByText("I understand — resume with a new question")
    );
  });
  expect(resume).toHaveBeenCalledTimes(1);
});
test("final warning explains the penalty and ended sessions cannot resume", () => {
  render(<IntegrityAlert />);
  phase("final_warning");
  expect(screen.getByRole("alert")).toHaveTextContent("15 continuous seconds");
  phase("ended");
  expect(
    screen.queryByText("I understand — resume with a new question")
  ).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Interview ended");
});
test("Indonesian pause and final warning are available", () => {
  render(<IntegrityAlert language="Bahasa Indonesia" />);
  phase("paused");
  expect(screen.getByRole("alert")).toHaveTextContent("Wawancara dijeda");
  phase("final_warning");
  expect(screen.getByRole("alert")).toHaveTextContent("Peringatan terakhir");
});
test("unsupported audio keeps the visual alert available", () => {
  render(<IntegrityAlert />);
  fireEvent.click(screen.getByText("Enable & test alert sound"));
  expect(screen.getByRole("status")).toHaveTextContent("Sound is unavailable");
  phase("paused");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
test("optional sound plays on pause and final warning, and mute suppresses the end sound", async () => {
  const start = jest.fn(),
    close = jest.fn(async () => {});
  const audio = {
    state: "running",
    currentTime: 0,
    destination: {},
    close,
    resume: jest.fn(async () => {}),
    createOscillator: () => ({
      frequency: { value: 0 },
      connect: jest.fn(),
      disconnect: jest.fn(),
      start,
      stop: jest.fn(),
    }),
    createGain: () => ({
      gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
    }),
  };
  const original = Object.getOwnPropertyDescriptor(window, "AudioContext");
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: jest.fn(() => audio),
  });
  try {
    const view = render(<IntegrityAlert />);
    expect(start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Enable & test alert sound"));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    phase("paused");
    phase("final_warning");
    expect(start).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByText("Mute alert sound"));
    phase("ended");
    expect(start).toHaveBeenCalledTimes(3);
    expect(close).toHaveBeenCalledTimes(1);
    view.unmount();
  } finally {
    if (original) Object.defineProperty(window, "AudioContext", original);
    else Reflect.deleteProperty(window, "AudioContext");
  }
});
