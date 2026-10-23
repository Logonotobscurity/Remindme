# SKILL: Re:Mind Me Daily Memory & Task Capture

Portable instruction for ChatGPT scheduled tasks, Claude scheduled tasks, and Grok Automations. Each platform runs this on its own scheduler. Re:Mind Me is the system of record only after it accepts a record. This skill does not read another platform's private history.

## Purpose

Record meaningful work from the current session, authorized connectors, and approved project sources. Emit one structured event per meaningful item, using the shared contract below.

## Hard limits

- Use only information actually available to this run. A schedule does not unlock other platforms' chats.
- Do not invent deadlines, events, progress, completions, or source references.
- Do not claim an action was completed without evidence in the available material.
- Do not expose credentials, database secrets, or unnecessary private conversation text.
- Do not write to external systems that are not explicitly authorized for this run.
- Never report that a record was stored unless the destination confirms the write and returns an identifier.
- If the inbox or Re:Mind Me is not connected, return the events in the response and set `delivery` to `not_delivered`. That is success at drafting, not success at storage.

## Daily workflow

1. Review only the current run's context, connected tools, and approved project sources.
2. Identify meaningful work: completed activities, decisions and rationale, research findings, ideas, outstanding tasks, explicitly scheduled reminders, blockers, and next steps.
3. Keep completed work separate from proposed work.
4. Emit one event per item. Do not collapse a day into one unstructured cell.
5. Reuse the same `event_id` when retrying an event. Do not mint a new id for a retry.
6. Write a daily report with: summary, completed work, decisions, research, outstanding tasks, upcoming commitments, blockers, and proposed next actions.
7. Report destination, record count, source coverage, and any failed writes.

## Event contract (schema 1.0)

Required on every event: `event_id`, `schema_version`, `event_type`, `source_platform`, `occurred_at`, `timezone`, `project`, `title`, `summary`, `status`, `approval_status`.

| Field | Rule |
|---|---|
| event_id | Stable id, `evt_` plus 8+ url-safe characters. Same id on retry. |
| schema_version | `1.0` |
| event_type | `activity.created`, `decision.created`, `idea.created`, `task.created`, `reminder.created`, `reminder.updated`, `reminder.completed`, `reminder.cancelled`, `report.created` |
| source_platform | `chatgpt`, `claude`, or `grok` — the platform running this skill |
| occurred_at | ISO 8601 timestamp |
| local_date | `YYYY-MM-DD` in the user's timezone |
| timezone | IANA name. Default `Africa/Lagos` unless the user has set another. |
| project | Short project name, or `Unassigned` |
| title | One line, max 240 characters |
| summary | Necessary facts only. No secrets. |
| status | `completed`, `proposed`, `pending`, or `cancelled` |
| due_at | ISO 8601 only when a deadline was actually established. Otherwise omit. |
| source_reference | Stable id or link from the source system. Omit if you do not have one. Do not invent one. |
| approval_status | `pending` until a person approves an external side effect |
| processing_status | `PENDING` when handed to an inbox. Omit when only drafted in the run output. |

Reminder events must also include a stable `reminder_id`. Updates and cancellations reuse that id. Do not create a second calendar event for an update.

## Delivery order

The inbox exists. Do not invent another one, and do not mark the schema as pending. `schema_version` is `1.0`.

1. Re:Mind Me MCP at `/api/v1/mcp`, if this client already has an OAuth or personal token. Map `activity.created`, `decision.created`, and `idea.created` to `capture_activity` or `capture_decision`. Map tasks to `capture_action_item`. Put `event_id` in `sourceReference`. The token's source is the source of record; do not override it in tool arguments.
2. Google Drive folder `ReMindMe_Automation_Inbox` (`1MUkpKQ1YOSwcogcwznD8G3FcHrnt7maP`): https://drive.google.com/drive/folders/1MUkpKQ1YOSwcogcwznD8G3FcHrnt7maP
   - Events sheet: `1Mq4yV91C1cMjrb1VmQ0c6yal7Y5bmvQdQaitZOq1gx8`
   - Daily Reports sheet: `1c90J8x5PxI8g9ia0tTuQxkeaT1smkJsk1fm_UOJoxOU`
   - Processing Log sheet: `1W2UmYiR6--I6Gz9XlwxSUwyYOTOLTW6eWSKoreDFAV8`
   Write one dated Google Sheet per run into that folder (`Events-YYYY-MM-DD`). Header row, then one event per row, using the columns in the Events sheet. Do not claim the row was stored until Drive returns a file id.
3. If Drive is disabled for this run, output the JSON and set `delivery` to `not_delivered`. Name that block explicitly. Do not create a substitute inbox.

Idempotency is required. A retry with the same `event_id` must not create a second row. Read the folder for that date before writing.

## Platform notes

- ChatGPT: once-daily scheduled task. Event-triggered tasks are not assumed; they are not available on Free or Go.
- Claude: scheduled task on a plan that can use skills and connectors. Install this text as the skill body.
- Grok: daily automation at 21:00 `Africa/Lagos`. Connected tools may be used. Do not pretend to read ChatGPT or Claude histories.
- Zapier is not a producer. It validates, deduplicates, and routes inbox rows into Re:Mind Me. Do not send Zapier database credentials.
