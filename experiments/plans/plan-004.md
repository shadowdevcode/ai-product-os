# Plan: PM To-Do List MVP (Project "Clarity")

## Plan Summary
This plan outlines the architecture and implementation steps for "Clarity," an AI-powered task manager specifically designed for Product Managers. The MVP focuses on a single core differentiator: an AI agent that automatically categorizes dumped brain-thoughts into a PM-specific strategic framework (Urgent Unblock, Strategic Deep Work, Stakeholder Comms, Tactical Ops) and suggests priorities. The system will be intentionally simple, utilizing Next.js, Tailwind CSS for a premium UI, Supabase for fast data storage, and the Gemini API for categorization logic.

## Product Specification
- **Product Goal:** Reduce PM cognitive load by instantly organizing raw thoughts into a structured, PM-focused workflow.
- **Target User:** Product Managers (Associate to Lead) overwhelmed by context-switching.
- **User Journey:**
  1. User opens the web app.
  2. User quickly dumps a raw thought (e.g., "Need to review the Q3 roadmap with Sarah tomorrow" or "Dev is stuck on the auth token bug").
  3. AI instantly processes the thought, assigning it a category (Strategic, Unblock, etc.) and priority.
  4. The task appears in specialized Kanban/List lanes based on the AI's assessment.
  5. User can manually override the AI's choice if needed.
- **MVP Scope:**
  - Standard email/password or Google Auth.
  - Single input field optimized for speed (the "Brain Dump").
  - AI categorization engine using Gemini.
  - Dynamic UI displaying tasks categorized by PM domain (Unblocks, Strategy, Stakeholders, Chores).
- **Success Metrics:**
  - Tasks Categorized per Active User per Week (measuring engagement).
  - AI Override Rate (measuring categorization accuracy - lower is better).
- **Acceptance Criteria:**
  - A user can enter a free-text task.
  - The system successfully categorizes the task into one of the 4 defined PM domains within 2 seconds.
  - The UI updates optimistically or immediately upon categorization.

## UX Design
- **Aesthetic:** Clean, minimalist, modern ("Linear-esque" glassmorphism, subtle borders, high contrast typography). Dark mode by default for that premium dev-tool feel.
- **Layout:**
  - **Top Bar:** Quick entry input field (always focused on load). Large, inviting text: "What's on your mind?"
  - **Main Area:** 4 distinct columns or sections representing the PM Mental Model:
    1. 🚨 **Unblock** (Urgent engineering/design blockers)
    2. 🧠 **Strategy** (Roadmaps, PRDs, Deep Work)
    3. 🗣️ **Stakeholders** (Comms, updates, syncs)
    4. 🧹 **Ops & Chores** (Minor bugs, Jira hygiene)
- **Interaction Logic:** Hitting "Enter" in the input field immediately creates a skeleton loading state in the UI while the AI categorizes. Once categorized, it animates into the correct lane.

## System Architecture
- **Frontend Stack:** Next.js (App Router), React, Tailwind CSS.
- **Backend Stack:** Next.js API Routes (Serverless Functions).
- **AI Integration:** Google Gemini API (via `@google/genai` SDK).
- **Database/Auth:** Supabase (PostgreSQL + GoTrue Authentication).
- **Data Flow:**
  1. Client sends POST `/api/tasks` with raw task string.
  2. API Route calls Gemini AI with a specific prompt template outlining the PM categories.
  3. API Route parses the JSON response from Gemini (Category, Priority, Cleaned Title).
  4. API Route saves structured task to Supabase database.
  5. API Route returns created task to Client.

## Database Schema
**Table:** `tasks`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `raw_input` (Text)
- `title` (Text) - Cleaned up by AI
- `category` (Enum/Text: 'unblock', 'strategy', 'stakeholders', 'ops')
- `priority` (Enum/Text: 'high', 'medium', 'low')
- `status` (Enum/Text: 'todo', 'done')
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## Implementation Tasks
- [ ] **Task 1: Setup Infrastructure**
  - Initialize Next.js project with Tailwind.
  - Set up Supabase project and run initial SQL schema migration.
  - Configure environment variables (Supabase, Gemini).
- [ ] **Task 2: Build AI Categorization Service**
  - Create the precise Gemini prompt for PM categorization.
  - Implement the `/api/tasks` endpoint with structured JSON output from Gemini.
- [ ] **Task 3: Develop Primary UI / Database Integration**
  - Build the React components: Input Bar, Task Lanes, Task Item.
  - Integrate Supabase client to fetch tasks on load (`status = 'todo'`).
  - Wire up the frontend submission to the API and handle optimistic UI updates/loading states.
- [ ] **Task 4: Polish & Deslop**
  - Refine Tailwind styling for a premium feel (glassmorphism, transitions).
  - Add simple auth (or mock auth for MVP speed if desired).

## Risks
- **AI Latency:** If the Gemini call takes $>3$ seconds, the UI will feel sluggish. *Mitigation:* Use `gemini-2.5-flash` for speed.
- **Categorization Accuracy:** If the AI constantly miscategorizes, trust is lost. *Mitigation:* Spend significant time tuning the system prompt during Task 2. Use Structured Outputs (JSON Schema) to guarantee valid categories.
