# Omi-inspired layer

Additive components that match the Omi frames. MindOrb is untouched.

## Drop-in usage (inside RemindApp.tsx)

```tsx
import { ListeningPill, RecapScroller, SessionList, TasksView } from "@/components/omi";
import { toRecaps, toSessionGroups, toTasks, overdueCount } from "@/components/omi/useOmiData";

// Under the existing <MindOrb />
<ListeningPill listening={listening} onPause={stopCapture} />

// Home content
<RecapScroller recaps={toRecaps(reminders)} />
<SessionList groups={toSessionGroups(reminders)} />

// Tasks tab
<TasksView
  tasks={toTasks(reminders)}
  overdueCount={overdueCount(reminders)}
  onAdd={() => setTab("remind")}
/>
```

No changes are required to MindOrb or the core state machine.
