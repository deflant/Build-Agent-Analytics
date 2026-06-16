# Build Agent Analytics

Dashboard analytics application for visualizing **Build Agent** usage statistics — including conversations, messages, checkpoints, application correlations, and agent performance metrics.

Built on ServiceNow using the **Now SDK Fluent DSL** (v4.7.2) with a React-based UI Page.

---

## Features

| View | Description |
|------|-------------|
| **Applications** | Lists all applications touched by Build Agent, with conversation and checkpoint counts |
| **App Detail** | Deep dive into a single application — metadata composition (tables, UI pages, workspaces, portals, widgets, flows), related conversations, and timelines |
| **Conversation Detail** | Full conversation thread with messages, checkpoints, and change summaries rendered in Markdown |
| **Performance** | Agent-level KPIs — task telemetry, build-fix cycles, error rates, working duration breakdowns |

### Additional Capabilities

- **KPI Cards** — at-a-glance metrics for key statistics
- **Build Error Display** — structured visualization of build errors and fix cycles
- **Markdown & Mermaid Rendering** — rich content display for agent messages and summaries
- **Per-user Settings** — persistent user preferences stored in a custom table
- **Complexity Scoring** — heuristic estimation of task complexity
- **Token Estimation** — approximate token usage from conversation content

---

## Project Structure

```
├── now.config.json              # ServiceNow app configuration
├── package.json                 # Dependencies and scripts
└── src/
    ├── client/                  # React SPA (UI Page)
    │   ├── app.tsx              # Root component with SPA routing
    │   ├── app.css              # Application styles
    │   ├── index.html           # HTML entry point
    │   ├── main.tsx             # React DOM mount
    │   ├── components/          # UI components
    │   │   ├── AgentPerformance.tsx
    │   │   ├── AppDetail.tsx
    │   │   ├── Applications.tsx
    │   │   ├── BuildErrorDisplay.tsx
    │   │   ├── ConversationDetail.tsx
    │   │   ├── DataTable.tsx
    │   │   ├── KpiCard.tsx
    │   │   ├── MarkdownRenderer.tsx
    │   │   └── Navigation.tsx
    │   ├── services/
    │   │   └── api.ts           # ServiceNow Table API client
    │   └── utils/
    │       ├── complexity.ts    # Task complexity heuristics
    │       ├── fields.ts        # Field extraction helpers
    │       ├── tokenEstimation.ts
    │       └── workingDuration.ts
    ├── fluent/                  # ServiceNow Fluent metadata
    │   ├── navigation/
    │   │   └── menu.now.ts      # Application menu module
    │   ├── tables/
    │   │   └── settings.now.ts  # User settings table
    │   └── ui-pages/
    │       └── analytics.now.ts # UI Page definition
    └── server/
        └── tsconfig.json        # Server-side TypeScript config
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.2, TypeScript |
| Rendering | [marked](https://github.com/markedjs/marked) (Markdown), [mermaid](https://mermaid.js.org/) (diagrams) |
| Platform | ServiceNow (Table API, UI Page) |
| SDK | `@servicenow/sdk` 4.7.2 (Fluent DSL) |

---

## ServiceNow Tables Used

| Table | Purpose |
|-------|---------|
| `sn_build_agent_conversation` | Build Agent conversations |
| `sn_build_agent_message` | Individual messages within conversations |
| `sn_build_agent_checkpoint` | Install checkpoints per conversation |
| `sn_build_agent_task_telemetry` | Task-level performance telemetry |
| `sn_build_agent_event_telemetry` | Event-level telemetry (steps within a task) |
| `x_snc_build_agranx_settings` | Per-user application settings (custom) |
| `sys_app` | Application names resolution |

---

## Getting Started

### Prerequisites

- ServiceNow instance with **Build Agent** enabled
- Now CLI / Now SDK installed locally

### Build & Deploy

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Deploy to your ServiceNow instance
npm run deploy
```

### Access the Dashboard

Once deployed, navigate to the **Build Agent Analytics** module in the application navigator, or open:

```
https://<instance>.service-now.com/x_snc_build_agranx_analytics.do
```

---

## Configuration

| Scope | Value |
|-------|-------|
| Application Scope | `x_snc_build_agranx` |
| Scope ID | `748e8d343b2987149a1600b693e45a0c` |

User preferences (e.g., column visibility, sort order) are automatically persisted per user in the `x_snc_build_agranx_settings` table.

---

## Development

```bash
# Type-check server-side code
npx tsc --project src/server/tsconfig.json --noEmit

# Type-check client-side code
npx tsc --project src/client/tsconfig.json --noEmit
```

Fluent metadata files (`.now.ts`) live under `src/fluent/` and are compiled into platform artifacts during the build step.

---

## License

UNLICENSED — internal use only.
