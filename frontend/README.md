# Next.js Frontend Dashboard & Interactive Subject Labs

This web application serves as the interactive visualization interface for the *Huffman-Compressed Micro-Architecture Instruction Memory Simulator*. It is built using **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **@xyflow/react (React Flow)** for graph and tree visualizations, and **Recharts** for performance metrics.

---

## 🏛️ Architecture & Route Structure

The application features 7 distinct routes with a persistent sidebar layout ([`src/components/Sidebar.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/components/Sidebar.js)) mounted in [`src/app/layout.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/layout.js):

| Route | Page File | Purpose & Interactive Features |
| :--- | :--- | :--- |
| **`/`** | [`src/app/page.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/page.js) | **System Dashboard**: Real-time KPI summary cards, three dedicated Subject Lab cards with **"Open Lab"** direct links, Phase 8 simulation entry point, and live FastAPI backend connectivity indicator. |
| **`/flat`** | [`src/app/flat/page.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/flat/page.js) | **FLAT Automata Lab**: 12-bit control word binary validator, decoupled syntax and semantic checks, step-by-step state transition trace ($\delta(q, a)$), 2D DFA transition table with underlying NFA subset powerset mappings, and interactive React Flow state graph. |
| **`/daa`** | [`src/app/daa/page.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/daa/page.js) | **DAA Huffman Lab**: Token and text frequency counting, interactive React Flow binary prefix tree, Recharts frequency histogram, codebook table, copyable bitstream viewer, round-trip lossless verification, and timing metrics via Python FastAPI. |
| **`/coa`** | [`src/app/coa/page.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/coa/page.js) | **COA Micro-Architecture Lab**: Control Memory (ROM) table with active $\mu\text{PC}$ highlighting, 16-bit register file (`R0`–`R3`, `PC`, `IR`, `MAR`, `MDR`, `TEMP`), condition flag LEDs (`Z`, `S`, `C`, `V`), 256-word data memory inspector, active hardware control signals, and execution controls (Single Step, Run, Pause, Reset). |
| **`/simulation`**| [`src/app/simulation/page.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/simulation/page.js) | **End-to-End Simulation**: 10-stage automated pipeline orchestrating DAA compression $\rightarrow$ FLAT DFA validation $\rightarrow$ COA Control Store execution, with preset selection, live register updates, and safety halts. |
| **`/documentation`**| [`src/app/documentation/page.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/documentation/page.js) | **Documentation**: Theoretical reference covering 12-bit format specifications, Shannon entropy formulas, subset construction theory, and microinstruction control signal truth tables. |
| **`/about`** | [`src/app/about/page.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/app/about/page.js) | **About**: Educational mission, multidisciplinary synergy (FLAT + DAA + COA), and technology stack details. |

---

## 🧩 Architectural Design Principles

1. **Algorithm Reuse (Zero Duplication)**:
   - React components do not reimplement core algorithms.
   - Automata logic is imported directly from `@/lib/flat` (`nfa.js`, `subsetConstruction.js`, `validator.js`).
   - Micro-architecture simulation is imported directly from `@/lib/coa` (`microinstructions.js`, `controlMemory.js`, `registers.js`, `executionEngine.js`).
   - DAA compression is delegated to the Python backend via `@/lib/api.js`.
2. **Interactive Visualizations**:
   - **React Flow (`@xyflow/react`)**: Used in `/flat` (DFA state machine nodes and labeled transition edges) and `/daa` (hierarchical binary prefix tree with internal branch nodes and colored leaf nodes).
   - **Recharts**: Symbol frequency distribution bar chart with custom dark-mode tooltips.
3. **Resilient Network Client**:
   - [`src/lib/api.js`](file:///c:/Users/Dell/Desktop/micro_project-2/frontend/src/lib/api.js) encapsulates all HTTP calls to the Python backend.
   - Handles offline state gracefully with user-friendly alerts, loading state subscriptions, and input guards.

---

## 🚀 Setup & Installation

### Prerequisites
* **Node.js**: `v18.0.0` or higher (`v24.21.0` tested)
* **npm**: Node package manager

### 1. Install Dependencies
```bash
cd frontend
npm install
```

#### Key Dependencies in `package.json`:
* `next`: `16.0.1` (React 19)
* `react`: `19.2.0`
* `react-dom`: `19.2.0`
* `tailwindcss`: `^4.1.1`
* `@xyflow/react`: `^12.12.0` (React Flow)
* `recharts`: `^3.10.1`
* `lucide-react`: `^1.62.0`

### 2. Environment Configuration
Create `.env.local` from `.env.example`:
```bash
cp .env.example .env.local
```
Configuration variables:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
PORT=3000
```

---

## ⚙️ Running Locally

### Start Development Server
```bash
npm run dev
```
The application will start on:
* **URL:** `http://localhost:3000`

### Production Build
```bash
npm run build
npm run start
```

---

## 🧪 Testing & Verification

The frontend modules and API client are validated through automated unit and integration tests:

```bash
# Run API client and simulation bridge tests from repository root:
node --test tests/api-client.test.js tests/simulation-bridge.test.js

# Verify all Next.js routes and backend integration:
node tests/route-verifier.js
```

All 7 Next.js routes return `HTTP 200 OK` with zero server-side rendering or client compilation errors.
