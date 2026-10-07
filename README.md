# ForgePilot - AI Software Engineering Agent for VS Code

ForgePilot is an AI software engineer embedded directly inside VS Code. It automatically understands your existing codebase, implements tasks, fixes bugs, runs tests, and ensures no existing functionality is broken. It uses the GroqCloud API to interact with advanced language models like Qwen.

## Features

- **Context-Aware Repository Analysis**: ForgePilot inspects your workspace to detect languages, frameworks, and test runners (e.g., Python & pytest).
- **Intelligent Bug Fixing**: Identifies root causes and implements the smallest appropriate correct change.
- **Automated Regression Testing**: Automatically runs baseline tests, executes your test suite after modifications, and ensures tests pass.
- **Safety First**: Executes tests in your local environment, ensuring that code changes are verified.

## Quick Start (VS Code Extension)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) & npm installed.
- Python 3 & pytest (if running the fixture tests).
- A GroqCloud API key.

### 2. Clone the Repository
```bash
git clone https://github.com/advi-cyber/ForgePilot.git
cd ForgePilot
```

### 3. Setup Environment
Install the dependencies:
```bash
npm install
```

Set up your environment variables:
```bash
cp .env.example .env
```
Open `.env` and add your GroqCloud API key:
```env
GROQ_API_KEY=your_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

### 4. Build and Run
Compile the TypeScript code:
```bash
npm run compile
```

Open the project in VS Code:
```bash
code .
```
Press **F5** in VS Code. This will launch a new "Extension Development Host" window with ForgePilot loaded.

### 5. Using ForgePilot
In the new VS Code window:
1. Open a workspace or project.
2. Run the command **`ForgePilot: Start Agent`** from the Command Palette (`Cmd+Shift+P` on Mac, `Ctrl+Shift+P` on Windows).
3. Use the ForgePilot dashboard in the sidebar:
   - **🔍 SCAN**: Understand the repository architecture without modifying code.
   - **🧪 TEST**: Run test suites to validate current behavior.
   - **🔧 FIX**: Provide a task description to repair a bug safely.
   - **✨ ENHANCE**: Propose an enhancement for the agent to analyze and implement.

## Running the End-to-End Test

We provide an E2E script that runs ForgePilot over a local Python fixture containing an intentional bug.

```bash
# Ensure .env is properly configured first
npm test
```

This autonomously performs the following:
1. Detects the Python repository and pytest framework.
2. Runs baseline tests.
3. Determines the root cause of the bug.
4. Modifies the codebase to fix it.
5. Runs the test suite to verify the fix and prevent regressions.

## Architecture

ForgePilot operates via distinct phases:
- `RepositoryAnalyzer`: Inspects the workspace and extracts `RepoInfo`.
- `TestRunner`: Executes testing frameworks and parses pass/fail counts.
- `LLMProvider`: Handles interaction with LLM models using GroqCloud API.
- `ForgePilotAgent`: Orchestrates the engineering lifecycle (Analysis -> Baseline -> Plan -> Implement -> Test -> Report).

## Known Limitations

- Currently supports Python and pytest for automated testing.
- Complex multi-file refactors may require additional manual verification.
