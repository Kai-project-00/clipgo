# CLAUDE.md

## Project Configuration
- Project Name: clipgo
- Language: Korean (primary), English (for technical terms)
- Development Environment: Local workspace

## Project Management System
This project uses Claude Code PM (ccpm) for structured development workflow.

### Available Commands
- `/pm:init` - Initialize the PM system
- `/pm:prd-new feature-name` - Create new product requirements
- `/pm:epic-decompose feature-name` - Break down features into tasks
- `/pm:epic-oneshot feature-name` - Create and sync all at once
- `/pm:issue-start issue-number` - Start working on a specific issue
- `/pm:status` - Check overall project status

### Project Structure
- `.claude/` - Claude Code PM configuration and workspace
- `.claude/epics/` - Epic implementation plans
- `.claude/prds/` - Product requirement documents
- `.claude/rules/` - Development rules and guidelines

## Development Guidelines
- Follow the 5-phase discipline: Brainstorm, Document, Plan, Execute, Track
- Every line of code must trace back to a specification
- Use parallel execution when possible for faster development
- Maintain full traceability from idea to production
