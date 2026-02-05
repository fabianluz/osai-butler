# 🤖 OutSystems AI Butler

**The missing link between Service Studio, Architecture Canvas, and Large Language Models.**

OutSystems AI Butler acts as a **"Digital Twin"** and **Architecture Governance Tool** for your OutSystems environment. It bridges the gap between visual low-code development, rigid architectural standards, and text-based AI models (like ChatGPT, Claude, or DeepSeek).

Whether you are building a Monolith in **O11** or Microservices in **ODC**, Butler ensures your AI assistant understands your specific context, dependencies, and architectural rules to generate hallucination-free code.

---

## 🌟 The Problem vs. The Solution

LLMs are great at writing generic code, but they fail at understanding **your specific project context**.

- **The Problem:** You ask an AI to "create a logic flow," but it invents tables that don't exist, references modules that create circular dependencies, or suggests placing core logic in the frontend layer.
- **The Solution:** Butler maintains a strict **JSON definition** of your project structure locally. It validates your architecture in real-time and feeds the AI a precise "System Manifest," ensuring every suggestion fits perfectly into your existing codebase.

---

## 🚀 Key Features

### 🏛️ Dual-Mode Architecture Governance

Butler creates a live diagram of your architecture and runs a real-time validator engine based on your platform choice:

#### 1. OutSystems 11 (O11) Mode

- **Structure:** Enforces the strict **3-Layer Canvas** (End-User, Core, Foundation).
- **Governance Rules:**
- ❌ **No Upward References:** Core cannot consume End-User.
- ❌ **No Side References:** End-User cannot consume End-User.
- ❌ **No Circular Dependencies.**

#### 2. OutSystems Developer Cloud (ODC) Mode

- **Structure:** Domain-Driven Design using **Apps** (Vertical Slices) and **Libraries** (Shared Components).
- **Governance Rules:**
- ✅ **Weak References:** Apps _can_ talk to Apps via **Service Actions** (APIs).
- ❌ **Data Isolation:** Apps _cannot_ read Entities from other Apps directly.
- ❌ **Library Constraints:** Libraries must be stateless and cannot consume Apps.

---

### 📦 The Digital Twin Editors

Model your application locally before touching Service Studio.

#### 🗄️ Data Layer

- **Entity Editor:** Define Attributes, Data Types, and Keys.
- **Visual ERD:** Auto-generates Entity Relationship Diagrams with automatic connector lines based on Foreign Keys (`CustomerId` -> `Customer`).

#### ⚡ Logic Layer

- **Visual Flow Editor:** A drag-and-drop canvas mimicking Service Studio.
- **Node Support:** `Start`, `End`, `If`, `Switch`, `Aggregate`, `SQL`, `ServerAction`, `ServiceAction`.
- **Flow Narratives:** Converts visual graphs into text-based logic narratives for LLM consumption.

#### 🖥️ UI & Interaction Layer

- **Screen Specs:** Define Inputs, Local Variables, and Archetypes (Dashboard, CRUD, Modal).
- **User Flow Diagram:** A visual map showing how Screens connect and navigate to one another (`ScanMode` -> `ProductDetail`).

---

### 🤖 AI Integration & Context Management

The core power of Butler is how it translates complex visual code into "LLM-Speak."

#### 1. The "System Manifest" (Master Prompt)

Click the **"Prompt Context"** button to generate a global architectural summary. This teaches the AI your system's high-level map (Module roles, Core entities, and API surfaces) before you ask specific questions.

#### 2. Token-Optimized Contexts

When copying module data for the AI, you can choose between two modes:

- **⚡ Summary Mode:** Strips visual coordinates and internal IDs. Converts logic graphs into text stories. _Best for high-level architectural questions._
- **📝 Verbose Mode:** Includes every pixel, attribute, and flow node. _Best for asking the AI to generate precise XML code._

#### 3. Modular "Split" Export

For large projects, sending the whole codebase hits token limits. The **"Split Modules"** export creates a ZIP file containing individual `.butler` context files for each module. You can feed the AI one module at a time while retaining global awareness.

---

## 📖 The "Architecture-First" Workflow

### Phase 1: Definition

1. Create a **Project** and select your platform (**O11** or **ODC**).
2. Create **Modules/Apps**.
3. Use the **Dependency Manager** to link them (e.g., "SmartPantry" consumes "VisionLib").
4. Watch the **Governance Box**: It will turn RED if you violate an architectural rule (e.g., strong coupling between ODC apps).

### Phase 2: Modeling

1. Enter a module. Define your **Entities** and **Actions**.
2. Use the **UI Editor** to define Screens and link them (creating a User Flow).
3. Validate logic flows using the visual diagram.

### Phase 3: AI Collaboration

1. Click **"Prompt Context"** and paste the system overview into ChatGPT/Claude.
2. Click **"✨ Copy for AI"** inside the specific module you are working on.
3. **Prompt:** _"Based on the context provided, write the SQL query for the 'GetLowStock' action in the 'SmartPantry' module. Ensure it filters by the 'InventoryItem' entity defined in the data layer."_

---

## 💾 Import & Export Ecosystem

### 1. Full Project Backup (`.butler`)

A JSON snapshot of the entire system. Use this for backups or sharing architecture with teammates. The import engine performs a **Deep Remap**, generating new UUIDs while preserving all internal links and diagram layouts.

### 2. Code Snippet Import (XML)

You can paste XML directly from OutSystems Service Studio (Ctrl+C on an Action or Entity) to import existing legacy code into Butler.

---

## 🛠️ Installation

### Prerequisites

- **Node.js** (v18+)
- **npm**

### Steps

1. **Clone the Repository**

```bash
git clone https://github.com/fabianluz/outsystems-ai-butler
cd outsystems-ai-butler

```

2. **Install Dependencies**

```bash
npm install
# Critical graph & utility libraries
npm install @xyflow/react dagre dexie jszip file-saver uuid

```

3. **Start the Application**

```bash
npm run dev

```

4. **Open in Browser**
   Navigate to `http://localhost:5173`

---

## 📄 License

MIT License. Free to use for personal and enterprise architecture planning.
