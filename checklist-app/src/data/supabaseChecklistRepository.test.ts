import { afterEach, describe, expect, it, vi } from "vitest";

type StatusCallback = (status: string, err?: Error) => void;

const channelState: {
  handlers: Array<() => void>;
  statusCallback: StatusCallback | null;
} = {
  handlers: [],
  statusCallback: null,
};

const fakeChannel = {
  on: vi.fn((_event: string, _filter: unknown, handler: () => void) => {
    channelState.handlers.push(handler);
    return fakeChannel;
  }),
  subscribe: vi.fn((callback?: StatusCallback) => {
    channelState.statusCallback = callback ?? null;
    return fakeChannel;
  }),
};

const removeChannel = vi.fn();

vi.mock("../lib/supabase", () => ({
  supabase: {
    channel: vi.fn(() => fakeChannel),
    removeChannel,
  },
}));

afterEach(() => {
  channelState.handlers = [];
  channelState.statusCallback = null;
  vi.clearAllMocks();
});

describe("supabaseChecklistRepository.subscribeToChanges", () => {
  it("does not trigger a refresh for the initial subscription but reconciles after a rejoin", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");
    const onChange = vi.fn();

    const unsubscribe = supabaseChecklistRepository.subscribeToChanges!("user-1", onChange);

    expect(channelState.statusCallback).not.toBeNull();

    // Initial connect: the app has just fetched its snapshot; no extra refresh.
    channelState.statusCallback!("SUBSCRIBED");
    expect(onChange).not.toHaveBeenCalled();

    // Database change events flow through.
    channelState.handlers[0]();
    expect(onChange).toHaveBeenCalledTimes(1);

    // A drop and automatic rejoin may have missed events: reconcile once.
    channelState.statusCallback!("SUBSCRIBED");
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(fakeChannel);
  });

  it("logs channel failures without resubscribing manually", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const onChange = vi.fn();

    supabaseChecklistRepository.subscribeToChanges!("user-1", onChange);
    channelState.statusCallback!("CHANNEL_ERROR", new Error("socket closed"));

    expect(warn).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    // Supabase retries the channel itself; we must not create a second one.
    expect(fakeChannel.subscribe).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });
});
