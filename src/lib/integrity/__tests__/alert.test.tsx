import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import IntegrityAlert from "@/components/interview/IntegrityAlert";
import { useIntegrityStore } from "../store";
import { initialState, observe, start } from "../policy";

beforeEach(() => {
  useIntegrityStore.setState({
    record: start({ ...initialState("alert-test"), acknowledgedAt: 1 }, 1000),
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});
function event(hidden = true, duration = 3000) {
  act(() => {
    const record = useIntegrityStore.getState().record!;
    const at = 20000 + record.sequence * 20000;
    useIntegrityStore.setState({
      record: observe(
        observe(record, hidden, false, at),
        false,
        true,
        at + duration
      ),
    });
  });
}
test("only new qualifying hidden events alert; dismissing never clears the record", () => {
  render(<IntegrityAlert />);
  event(true, 2999);
  event(false, 12000);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  event();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Your interview page was hidden"
  );
  fireEvent.click(screen.getByText("Got it, continue"));
  act(() => useIntegrityStore.getState().explain(2, "technical_issue"));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(useIntegrityStore.getState().record?.count).toBe(1);
  expect(useIntegrityStore.getState().record?.active).toBe(true);
  event();
  expect(screen.getByRole("alert")).toHaveTextContent("Recorded events: 2");
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("restored history does not replay alerts and completion suppresses them", () => {
  event();
  render(<IntegrityAlert />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  event();
  act(() => useIntegrityStore.getState().finish());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("Indonesian alert escalates at three and five without terminating", () => {
  render(<IntegrityAlert language="Bahasa Indonesia" />);
  for (let i = 0; i < 3; i++) event();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Batas peringatan tercapai"
  );
  for (let i = 0; i < 2; i++) event();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Peninjauan manusia disarankan"
  );
  expect(useIntegrityStore.getState().record?.active).toBe(true);
});
test("sound requires opt-in, plays once per event, and stops after mute", async () => {
  const oscillator = {
    frequency: { value: 0 },
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null,
  };
  const audio = {
    state: "running",
    currentTime: 0,
    destination: {},
    resume: jest.fn(async () => {}),
    close: jest.fn(async () => {}),
    createOscillator: jest.fn(() => oscillator),
    createGain: jest.fn(() => ({
      gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
  };
  const original = Object.getOwnPropertyDescriptor(window, "AudioContext");
  const constructor = jest.fn(() => audio);
  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: constructor,
  });
  try {
    const view = render(<IntegrityAlert />);
    event();
    expect(constructor).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Enable & test alert sound"));
    await waitFor(() => expect(oscillator.start).toHaveBeenCalledTimes(1));
    event();
    expect(oscillator.start).toHaveBeenCalledTimes(2);
    act(() => useIntegrityStore.getState().explain(1, "interruption"));
    expect(oscillator.start).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText("Mute alert sound"));
    event();
    expect(oscillator.start).toHaveBeenCalledTimes(2);
    expect(audio.close).toHaveBeenCalledTimes(1);
    view.unmount();
  } finally {
    if (original) Object.defineProperty(window, "AudioContext", original);
    else Reflect.deleteProperty(window, "AudioContext");
  }
});
test("unsupported audio leaves a usable visual reminder", () => {
  render(<IntegrityAlert />);
  fireEvent.click(screen.getByText("Enable & test alert sound"));
  expect(screen.getByRole("status")).toHaveTextContent("Sound is unavailable");
  event();
  expect(screen.getByRole("alert")).toBeInTheDocument();
});
