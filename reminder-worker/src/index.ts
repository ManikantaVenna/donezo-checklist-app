import { runScheduledReminders } from "./reminders";

export default {
  async fetch() {
    return Response.json({ ok: true, service: "donezo-reminders" });
  },

  async scheduled(controller, env) {
    const result = await runScheduledReminders(env, new Date(controller.scheduledTime));
    console.log(JSON.stringify({ event: "donezo_reminder_run", ...result }));
  },
} satisfies ExportedHandler<Env>;
