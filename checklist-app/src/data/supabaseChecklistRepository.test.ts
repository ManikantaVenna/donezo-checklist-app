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

type UpdateCall = { taskId: string; sortOrder: number };
type PushUpsertCall = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
};
type PushDeleteCall = { userId: string; endpoint: string };

const updateState: {
  calls: UpdateCall[];
  failOnCall: number | null;
} = {
  calls: [],
  failOnCall: null,
};

const pushState: {
  upserts: PushUpsertCall[];
  deletes: PushDeleteCall[];
} = {
  upserts: [],
  deletes: [],
};

function fakeTasksTable() {
  return {
    update: (values: { sort_order: number }) => ({
      eq: (_userColumn: string, _userId: string) => ({
        eq: async (_idColumn: string, taskId: string) => {
          updateState.calls.push({ taskId, sortOrder: values.sort_order });
          if (updateState.failOnCall === updateState.calls.length) {
            return { error: new Error("write failed") };
          }
          return { error: null };
        },
      }),
    }),
  };
}

function fakeWebPushSubscriptionsTable() {
  return {
    upsert: async (values: PushUpsertCall, _options: { onConflict: string }) => {
      pushState.upserts.push(values);
      return { error: null };
    },
    delete: () => ({
      eq: (_userColumn: string, userId: string) => ({
        eq: async (_endpointColumn: string, endpoint: string) => {
          pushState.deletes.push({ userId, endpoint });
          return { error: null };
        },
      }),
    }),
  };
}

const rpcState: {
  calls: Array<{ fn: string; args: unknown }>;
  result: { error: { code?: string; message?: string } | null };
} = {
  calls: [],
  result: { error: null },
};

vi.mock("../lib/supabase", () => ({
  supabase: {
    channel: vi.fn(() => fakeChannel),
    removeChannel,
    from: vi.fn((tableName: string) => {
      if (tableName === "web_push_subscriptions") return fakeWebPushSubscriptionsTable();
      return fakeTasksTable();
    }),
    rpc: vi.fn(async (fn: string, args: unknown) => {
      rpcState.calls.push({ fn, args });
      return rpcState.result;
    }),
  },
}));

afterEach(() => {
  channelState.handlers = [];
  channelState.statusCallback = null;
  updateState.calls = [];
  updateState.failOnCall = null;
  pushState.upserts = [];
  pushState.deletes = [];
  rpcState.calls = [];
  rpcState.result = { error: null };
  vi.clearAllMocks();
  // The repository memoizes a missing reorder RPC; give each test a fresh module.
  vi.resetModules();
});

describe("supabaseChecklistRepository web push subscriptions", () => {
  it("saves a browser push subscription for the signed-in user", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");

    await supabaseChecklistRepository.saveWebPushSubscription!("user-1", {
      endpoint: "https://push.example/subscription-1",
      p256dh: "client-public-key",
      auth: "client-auth-secret",
      userAgent: "Mobile Safari",
    });

    expect(pushState.upserts).toEqual([
      {
        user_id: "user-1",
        endpoint: "https://push.example/subscription-1",
        p256dh: "client-public-key",
        auth: "client-auth-secret",
        user_agent: "Mobile Safari",
      },
    ]);
  });

  it("deletes a browser push subscription for the signed-in user", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");

    await supabaseChecklistRepository.deleteWebPushSubscription!("user-1", "https://push.example/subscription-1");

    expect(pushState.deletes).toEqual([
      {
        userId: "user-1",
        endpoint: "https://push.example/subscription-1",
      },
    ]);
  });
});

describe("supabaseChecklistRepository.subscribeToChanges", () => {
  it("reports the initial join, database events, and rejoins with distinct reasons", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");
    const onChange = vi.fn();

    const unsubscribe = supabaseChecklistRepository.subscribeToChanges!("user-1", onChange);

    expect(channelState.statusCallback).not.toBeNull();

    channelState.statusCallback!("SUBSCRIBED");
    expect(onChange).toHaveBeenLastCalledWith("initial-subscribe");

    channelState.handlers[0]();
    expect(onChange).toHaveBeenLastCalledWith("event");

    // A drop and automatic rejoin may have missed events.
    channelState.statusCallback!("SUBSCRIBED");
    expect(onChange).toHaveBeenLastCalledWith("resubscribe");
    expect(onChange).toHaveBeenCalledTimes(3);

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

describe("supabaseChecklistRepository.updateTaskOrders", () => {
  const changes = [
    { taskId: "task-a", sortOrder: 2, previousSortOrder: 1 },
    { taskId: "task-b", sortOrder: 1, previousSortOrder: 2 },
  ];

  it("applies the whole reorder through the atomic RPC when it is available", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");

    await supabaseChecklistRepository.updateTaskOrders("user-1", changes);

    expect(rpcState.calls).toEqual([
      {
        fn: "reorder_tasks",
        args: {
          changes: [
            { task_id: "task-a", sort_order: 2 },
            { task_id: "task-b", sort_order: 1 },
          ],
        },
      },
    ]);
    // No per-row updates when the transaction succeeded.
    expect(updateState.calls).toEqual([]);
  });

  it("surfaces RPC failures without falling back to non-atomic writes", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");
    rpcState.result = { error: { code: "P0001", message: "too many reorder changes" } };

    await expect(supabaseChecklistRepository.updateTaskOrders("user-1", changes)).rejects.toMatchObject({
      code: "P0001",
    });
    expect(updateState.calls).toEqual([]);
  });

  it("falls back to sequential writes when the RPC is not deployed and remembers the miss", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");
    rpcState.result = { error: { code: "PGRST202", message: "function not found" } };

    await supabaseChecklistRepository.updateTaskOrders("user-1", changes);
    expect(rpcState.calls).toHaveLength(1);
    expect(updateState.calls).toEqual([
      { taskId: "task-a", sortOrder: 2 },
      { taskId: "task-b", sortOrder: 1 },
    ]);

    // The missing function is memoized: the next reorder skips the RPC probe.
    updateState.calls = [];
    await supabaseChecklistRepository.updateTaskOrders("user-1", changes);
    expect(rpcState.calls).toHaveLength(1);
    expect(updateState.calls).toEqual([
      { taskId: "task-a", sortOrder: 2 },
      { taskId: "task-b", sortOrder: 1 },
    ]);
  });

  it("compensates already-applied rows when a fallback write fails", async () => {
    const { supabaseChecklistRepository } = await import("./supabaseChecklistRepository");
    rpcState.result = { error: { code: "PGRST202", message: "function not found" } };
    updateState.failOnCall = 2;

    await expect(supabaseChecklistRepository.updateTaskOrders("user-1", changes)).rejects.toThrow("write failed");

    expect(updateState.calls).toEqual([
      { taskId: "task-a", sortOrder: 2 },
      { taskId: "task-b", sortOrder: 1 },
      // Compensation restores the row that was already written.
      { taskId: "task-a", sortOrder: 1 },
    ]);
  });
});
