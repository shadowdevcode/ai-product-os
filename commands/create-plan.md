# Command: /create-plan

Purpose:
Convert a validated product opportunity into a structured development plan.

This command coordinates multiple agents to create a clear execution roadmap.

Agents involved:

Product Agent
Design Agent
Backend Architect Agent
Database Architect Agent

---

# Role

You are responsible for transforming a validated opportunity into a concrete product development plan.

You must prioritize clarity, feasibility, and fast learning cycles.

---

# Input

You will receive:

Validated exploration output from the /explore command.

This includes:

Problem
User
Opportunity
MVP experiment
Risks

---

# Process

Follow this sequence.

---

## 1 Product Specification

Use the Product Agent to generate:

product goal
target user
user journey
MVP scope
success metrics
acceptance criteria

---

## 2 UX Design

Use the Design Agent to define:

user flow
screens
UI components
interaction logic

---

## 3 System Architecture

Use the Backend Architect Agent to define:

system architecture
services
API endpoints
data flow
infrastructure needs

---

## 4 Database Schema

Use the Database Architect Agent to define:

database choice
tables
fields
relationships
indexes

---

## 5 Implementation Tasks

Break the project into tasks.

Example:

Task 1: Setup frontend project
Task 2: Implement file upload
Task 3: Implement AI processing
Task 4: Store results in database
Task 5: Display results UI

---

## 6 JSON Implementation Manifest

After defining Implementation Tasks in markdown, produce a machine-readable JSON manifest alongside the markdown spec.

This manifest enables parallel execution, dependency validation, and automated progress tracking.

**Required structure**:

```json
{
  "issue": "issue-007",
  "project": "project-name",
  "phases": [
    {
      "id": "phase-1",
      "name": "Backend Foundation",
      "parallel": false,
      "depends_on": [],
      "tasks": [
        {
          "id": "T1",
          "name": "Setup database schema",
          "agent": "backend-engineer",
          "files_to_create": ["schema.sql"],
          "files_to_modify": [],
          "verification": "psql -c '\\dt' | grep table_name",
          "test_file": "__tests__/api/schema.test.ts"
        }
      ]
    },
    {
      "id": "phase-2",
      "name": "API Routes",
      "parallel": false,
      "depends_on": ["phase-1"],
      "tasks": [
        {
          "id": "T2",
          "name": "Implement POST /api/resource",
          "agent": "backend-engineer",
          "files_to_create": ["src/app/api/resource/route.ts"],
          "files_to_modify": [],
          "verification": "curl -X POST http://localhost:3000/api/resource",
          "test_file": "__tests__/api/resource.test.ts"
        }
      ]
    },
    {
      "id": "phase-3",
      "name": "Frontend Pages",
      "parallel": true,
      "depends_on": ["phase-1"],
      "tasks": [
        {
          "id": "T3",
          "name": "Implement main page",
          "agent": "frontend-engineer",
          "files_to_create": ["src/app/page.tsx"],
          "files_to_modify": ["src/app/layout.tsx"],
          "verification": "npm run build",
          "test_file": "__tests__/pages/main.test.tsx"
        }
      ]
    }
  ],
  "env_vars": ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  "schema_tables": ["table_name"],
  "posthog_events": ["event_name_1", "event_name_2"]
}
```

**Rules**:
- `depends_on`: List phase IDs this phase requires to be complete first
- `parallel: true`: Phase can execute concurrently with other `parallel: true` phases at the same dependency level
- `verification`: Shell command to verify the task output is correct
- `posthog_events`: Must match the events defined in the metric plan — used by execute-plan telemetry verification

Save the manifest to `experiments/plans/manifest-<issue_number>.json`.

# Added: 2026-03-22 — JSON manifest requirement (claude-caliper alignment)

---

# Output Format

Return output using this structure.

---

Plan Summary

Product Specification

UX Design

System Architecture

Database Schema

Implementation Tasks

JSON Implementation Manifest (save to experiments/plans/manifest-<issue_number>.json)

Risks

---

# Rules

Prefer simple architectures.

Optimize for MVP delivery.

Avoid unnecessary complexity.
