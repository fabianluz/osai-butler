
# 🤖 OutSystems AI Butler

**The local-first "Digital Twin" for AI-Assisted OutSystems Development.**

## 💡 The Problem

When using LLMs (ChatGPT, Claude) for OutSystems development, developers face two main issues:

1. **Hallucinations:** The AI guesses entity names or attributes that don't exist in your actual project.
2. **Context Friction:** Manually typing out your database schema and logic flow for the AI is tedious and error-prone.

## 🛠 The Solution

**OutSystems AI Butler** solves this by maintaining a structured, visual mirror of your O11 or ODC modules locally.

It allows you to:

1. **Import & Visualize:** Paste XML directly from Service Studio to see Entity Diagrams and Logic Flows.
2. **Visually Design:** Use a drag-and-drop **Visual IDE** to design logic, SQL queries, and JavaScript nodes.
3. **Generate Perfect Context:** Click one button to generate a hallucination-free JSON prompt for your AI.
4. **Round-Trip Engineering:** Export your designs back to **XML** to paste them directly into Service Studio.

<img width="1280" height="678" alt="image" src="https://github.com/user-attachments/assets/2e5e9de8-c7c2-43a5-a238-a5360c934059" />
<img width="2468" height="1320" alt="image" src="https://github.com/user-attachments/assets/8ae480f7-62de-4aaa-9603-aa409dc0eec9" />



---

## 🌟 New Features

### 1. 🎨 Visual Action Editor (IDE)

A fully interactive flow designer that mimics Service Studio.

* **Drag & Drop:** Drag nodes (If, Assign, Loop, SQL, etc.) from the toolbox directly onto the canvas.
* **Service Studio Styling:** Nodes look and feel like the real thing (Green Start, Red End, Blue Loops).
* **Smart Connectors:** Orthogonal "Step" lines that automatically route between nodes.
* **Property Inspector:** Edit SQL queries, JavaScript code, Assignments, and Conditional logic in a dedicated panel.

### 2. 💾 XML Export & Round-Tripping

You are no longer stuck in the app.

* **Export XML:** Download your defined Entities and Actions as a `.xml` file.
* **Service Studio Compatible:** The exported XML is formatted specifically for the OutSystems Clipboard. You can open the XML file, copy the content, and **paste it directly into Service Studio**.

### 3. 🤖 Prompt Library & AI Guidance

* **Suggested Prompts:** A built-in library of "System Prompts" engineered to get the best results from ChatGPT/Claude.
* **Context Export:** The "Copy for AI" button generates a token-optimized JSON representation of your module, ensuring the AI knows exactly which Tables and Variables exist.

### 4. 📦 Advanced Node Support

Full support for advanced logic patterns:

* **Server Side:** `SQL` (with query editor), `Execute Server Action`, `Aggregate`.
* **Client Side:** `JavaScript` (with code editor), `Message`, `Destination`.
* **Logic:** `ForEach` Loops, `Switch` blocks, `Exceptions`.

---

## 🏗 Architecture

* **Frontend:** React 18 + TypeScript + Vite.
* **Visualization:** React Flow (Diagrams) + Dagre (Auto-layout).
* **Database:** Dexie.js (IndexedDB wrapper) - **100% Local Storage**.
* **Parsing:** fast-xml-parser for clipboard compatibility.

---

## 🚀 How to Run Locally

### 1. Clone the Repo

```bash
git clone https://github.com/fabianluz/outsystems-ai-butler.git
cd outsystems-ai-butler

```

### 2. Install Dependencies

Ensure you have Node.js (v18+) installed.

```bash
npm install

```

### 3. Run the Application

```bash
npm run dev

```

Open your browser to `http://localhost:5173`.

---

## 📖 User Guide

### Phase 1: Import / Define

* **Option A (Manual):** Create a Project -> Module -> Add Entities/Actions manually.
* **Option B (From Service Studio):** Select your Entities/Actions in Service Studio, press `Ctrl+C`. In Butler, click **"📋 Import"** and paste the XML.
* **Option C (From AI):** Ask ChatGPT to "Generate OutSystems XML for a generic Customer entity". Paste the result into Butler.

### Phase 2: Refine & Design

* Go to an Action and click **"Edit"**.
* Drag **SQL nodes** to write complex queries.
* Drag **JavaScript nodes** to prototype client logic.
* Connect nodes to define the execution flow.

### Phase 3: Export to AI

* Click **"✨ Copy for AI"**.
* Paste into ChatGPT: *"Here is my current logic flow. Optimize the SQL query in the node named 'GetUserData'."*

### Phase 4: Export to OutSystems

* Click **"💾 Export XML"**.
* Open the downloaded file, copy the text.
* Paste directly into the **Logic Tab** or **Data Tab** of Service Studio.

---

## 🔮 Future Roadmap

* [ ] **Direct Clipboard Access:** Paste directly without the modal (requires browser permissions).
* [ ] **OML Parsing:** Upload binary `.oml` files to extract context automatically.
* [ ] **AI Agent Integration:** Connect directly to OpenAI API to generate nodes inside the Flow Editor. (50%, currently in testing)

## 📄 License

Distributed under the MIT License.
