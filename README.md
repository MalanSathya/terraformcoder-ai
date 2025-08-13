# ✨ AI Terraform Coder ✨

Welcome to **AI Terraform Coder**! 🚀 This isn't just another code generator; it's your intelligent co-pilot for crafting production-grade, modular, and super cost-efficient Terraform infrastructure. Say goodbye to manual coding and hello to infrastructure as code, powered by cutting-edge AI!

## 🌟 Features That Shine

*   **AI-Powered Terraform Magic**: Just tell us what you dream of, and our AI conjures up the perfect Terraform code. It's like having a DevOps wizard at your fingertips! 🧙‍♂️
*   **Cloud-Agnostic Awesomeness**: Whether you're an AWS enthusiast, an Azure aficionado, or a GCP guru, we've got you covered. Generate code for all your favorite cloud providers! ☁️
*   **Diagrams That Dazzle**: See your infrastructure come to life with stunning, automatically generated architecture diagrams using Mermaid.js. Understand your setup at a glance! 📊
*   **File Hierarchy, Untangled**: No more guessing where files go! Our app provides a crystal-clear, tree-like view of your generated Terraform project structure. 🌳
*   **Explanations That Enlighten**: Each piece of generated code comes with AI-powered explanations, breaking down its purpose, resources, and key considerations. Learn as you build! 💡
*   **Clean Code, Happy DevOps**: We're obsessed with generating clean, modular, and maintainable Terraform code that adheres to enterprise best practices. Your future self will thank you! 💖

## 🛠️ Tech Stack Superpowers

**Backend (The Brains):**
*   Python 🐍
*   FastAPI (Blazing fast APIs!) ⚡
*   Mistral AI (Our intelligent core) 🧠
*   Supabase (Your data's cozy home) 🏡
*   httpx (For seamless API communication) 🌐

**Frontend (The Beauty):**
*   React (Dynamic user interfaces) ⚛️
*   JavaScript/JSX (The language of the web) 💻
*   Tailwind CSS (Styling, but make it snappy!) 💅
*   Mermaid.js (Diagrams that tell a story) 📈

## 🚀 Get Started (It's Easier Than You Think!)

### Prerequisites (The Essentials)

Make sure you have these power tools in your arsenal:

*   **Python 3.8+** (The latest and greatest!)
*   **Node.js and npm** (or yarn, if you're fancy)

### Backend Setup (Ignite the AI!)

1.  **Hop into the backend directory:**
    ```bash
    cd terraformcoder-ai/backend
    ```
2.  **Forge a Python virtual environment (your isolated workspace):**
    ```bash
    python -m venv venv
    ```
3.  **Awaken your virtual environment:**
    *   **Windows:**
        ```bash
        .\venv\Scripts\activate
        ```
    *   **macOS/Linux:**
        ```bash
        source venv/bin/activate
        ```
4.  **Install the Python magic (dependencies):**
    ```bash
    pip install -r requirements.txt
    ```
5.  **Craft your `.env` file (where the secrets live!):**
    In the `terraformcoder-ai/backend` directory, create a file named `.env` and fill it with your precious environment variables. This is vital for the AI to work its wonders!

    ```
    MISTRAL_API_KEY="your_mistral_api_key_here"
    SUPABASE_URL="your_supabase_url_here"
    SUPABASE_ANON_KEY="your_supabase_anon_key_here"
    JWT_SECRET_KEY="a_super_duper_secret_key_for_jwt"
    MERMAID_API_TOKEN="your_mermaid_chart_api_token_here"
    # MERMAID_API_URL="https://api.mermaidchart.com/v1/render" # Optional, defaults to this
    ```
    *   **`MISTRAL_API_KEY`**: Your golden ticket to the Mistral AI model. 🎟️
    *   **`SUPABASE_URL` and `SUPABASE_ANON_KEY`**: Connect to your Supabase project. 🔗
    *   **`JWT_SECRET_KEY`**: A robust, random key for secure JWT authentication. Keep it safe! 🔒
    *   **`MERMAID_API_TOKEN`**: Your special pass from mermaidchart.com for rendering those gorgeous diagrams. 🎨

6.  **Fire up the backend server (let the magic begin!):**
    ```bash
    uvicorn api.index:app --host 0.0.0.0 --port 8000 --reload
    ```
    Your backend API will be humming along at `http://localhost:8000`. 🥳

### Frontend Setup (Behold the User Interface!)

1.  **Leap into the frontend directory:**
    ```bash
    cd terraformcoder-ai/frontend/terraformcoder-frontend
    ```
2.  **Install the Node.js goodies (dependencies):**
    ```bash
    npm install
    # or yarn install, if you prefer
    ```
3.  **Create your frontend `.env` file (connecting to the brains):**
    In the `terraformcoder-ai/frontend/terraformcoder-frontend` directory, create a file named `.env` and add this:

    ```
    REACT_APP_BACKEND_URL="http://localhost:8000"
    ```
    *   **`REACT_APP_BACKEND_URL`**: This tells your frontend where to find your awesome backend API. 🤝

4.  **Launch the frontend development server (see it in action!):**
    ```bash
    npm start
    # or yarn start
    ```
    Your beautiful frontend application will magically appear in your browser, usually at `http://localhost:3000`. ✨

## 💡 How to Use (Your Journey to Infrastructure Nirvana)

1.  **Open the App**: Point your browser to the frontend URL (e.g., `http://localhost:3000`).
2.  **Describe Your Dream**: In the input field, simply describe the cloud infrastructure you envision. The more detail, the better! ✍️
3.  **Pick Your Cloud**: Select your preferred cloud provider: AWS, Azure, or GCP. 🎯
4.  **Generate!**: Hit that "Generate" button and watch the AI work its wonders, delivering your Terraform code and a stunning architecture diagram. 🚀
5.  **Review & Download**: Explore the generated code, dive into the AI-powered explanations, and admire your new diagrams. Copy the code or download the files with ease! 💾

## 🎨 Mermaid Chart Integration (Diagrams on Demand!)

This project seamlessly integrates with [mermaidchart.com](https://mermaidchart.com) to bring your architecture diagrams to life! The backend uses your `MERMAID_API_TOKEN` to securely render and generate shareable links for your diagrams. Make sure this token is correctly configured in your backend's `.env` file to unlock its full potential. 🔓

## 🌲 File Hierarchy (No More Guesswork!)

Our application intelligently generates a clear, tree-like file hierarchy for your AI-produced Terraform files. This gives you an instant, intuitive understanding of your project's structure. 🗺️

## 👋 Contributing (Join the Fun!)

Got ideas? Found a bug? Want to make it even better? We welcome contributions with open arms! Feel free to submit issues or pull requests. Let's build something amazing together! 🤝