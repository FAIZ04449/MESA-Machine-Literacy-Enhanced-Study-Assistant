# MESA: Machine Literacy Enhanced Study Assistant

![MESA Banner](https://img.shields.io/badge/Status-Active-brightgreen) ![Students Tested](https://img.shields.io/badge/Tested_by-500%2B_Students-blue) ![Version](https://img.shields.io/badge/Version-1.0.1-orange)

## 📌 Overview
**MESA** (Machine Literacy Enhanced Study Assistant) is an AI-powered Chrome Extension purpose-built to revolutionize how students interact with study materials online. Whether you are reading an article on the web or deeply analyzing a complex academic PDF, MESA acts as your personalized, context-aware tutor right within your browser.

## 🧠 Specialized Machine Learning Architecture
What sets MESA apart from generic AI assistants is its foundation. MESA's underlying capabilities have been **meticulously trained using vast datasets of authentic student notes, academic PDFs, and diverse study materials**. 

Because the models understand the structure, tone, and specific requirements of higher education and academic literature, MESA provides significantly more accurate summarization, contextual definitions, and Q&A capabilities tailored specifically for the rigorous demands of academia.

## 🎓 Battle-Tested by Students
We believe in building tools for students, alongside students. MESA is not just a theoretical prototype; it has been actively used, refined, and **rigorously tested by an active community of over 500 students**. Their real-world feedback has shaped the extension's intuitive UI, response accuracy, and core feature set to ensure it genuinely enhances the modern study workflow.

## ✨ Key Features
- **Seamless PDF Analysis:** Leverage built-in `pdf.js` integration to interact with academic papers directly in your browser. Ask MESA to summarize long chapters or explain complex formulas.
- **Multi-Model Intelligence:** Dynamically utilizes top-tier AI models via Google Generative AI (`gemini-client`), OpenAI, and NVIDIA APIs to provide the most accurate answers based on the query type.
- **Context-Aware Web Integration:** Highlight text on any webpage and let MESA define, elaborate, or synthesize the information into bitesize notes.
- **Fast & Lightweight:** Built on Vite with the CRXJS plugin for instantaneous loading and minimal resource consumption.

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Minor Project"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```
   *This will generate a `dist` directory with the compiled extension.*

4. **Load into Chrome**
   - Open Google Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** using the toggle in the top right corner.
   - Click the **Load unpacked** button.
   - Select the newly generated `dist` folder.

## 🛠️ Technology Stack
- **Framework:** Vite + CRXJS (Vite Plugin for Chrome Extensions)
- **AI & ML Integration:** `@google/generative-ai`, `openai`
- **PDF Processing:** `pdfjs-dist`
- **Markdown Handling:** `marked`

## 📄 License
This project is licensed under the ISC License.
