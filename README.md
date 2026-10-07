# ForgePilot - AI Software Engineering Agent for VS Code

ForgePilot is an AI software engineer embedded directly inside VS Code. It automatically understands your existing codebase, implements tasks, fixes bugs, runs tests, and ensures no existing functionality is broken. It uses the GroqCloud API to interact with advanced language models like Qwen.

## Features

- **VS Code Native UI**: A sleek, premium, developer-focused dashboard embedded directly inside VS Code's sidebar. Information dense, responsive, and beautifully integrated with dark/light themes.
- **Context-Aware Analysis**: ForgePilot inspects your workspace to detect languages, frameworks, and test runners. It features robust support for Python virtual environments (e.g., `.venv` resolving) out of the box.
- **Intelligent Bug Fixing**: Uses the GroqCloud API with the Qwen model to identify root causes and implement the smallest appropriate correct change. Includes robust, safe JSON extraction preventing corrupted generations.
- **Automated Regression Testing**: Automatically runs baseline tests, executes your test suite after modifications, and ensures tests pass before reporting completion.
- **Safety First**: Executes tests in your local environment, ensuring that code changes are verified. Prevents malformed LLM outputs from applying unsafe partial file changes.

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
- `TestRunner`: Smartly executes testing frameworks, seamlessly resolving local virtual environments.
- `LLMProvider`: Robustly handles interactions and rate-limit constraints with LLM models using GroqCloud API.
- `ForgePilotAgent`: Orchestrates the engineering lifecycle, rigorously parsing and validating LLM-generated execution plans.
- `WebviewManager`: Manages the rich, native UI, cleanly segregating interface logic from backend execution.

## Known Limitations

- Currently supports Python and pytest for automated testing.
- Complex multi-file refactors may require additional manual verification.
