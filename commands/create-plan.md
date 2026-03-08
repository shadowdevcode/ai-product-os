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

# Output Format

Return output using this structure.

---

Plan Summary

Product Specification

UX Design

System Architecture

Database Schema

Implementation Tasks

Risks

---

# Rules

Prefer simple architectures.

Optimize for MVP delivery.

Avoid unnecessary complexity.
