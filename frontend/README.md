# Frontend - Todo UI

Next.js React application for managing todos with a clean, modern interface.

## Setup

1. **Install Dependencies**

    ```bash
    npm install
    ```

2. **Run Development Server**

    ```bash
    npm run dev
    ```

3. **Access Application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

-   `npm run dev` - Start development server
-   `npm run build` - Build for production
-   `npm run start` - Start production server
-   `npm run lint` - Run ESLint

## Features

-   ✅ Add new todos
-   ✅ Mark todos as complete/incomplete
-   ✅ Delete todos
-   ✅ Real-time updates
-   📱 Responsive design
-   ⚡ Fast performance with Next.js

## Tech Stack

-   **Framework**: Next.js 15.5.4
-   **UI Library**: React 19.1.0
-   **Language**: TypeScript
-   **Styling**: CSS Modules
-   **Linting**: ESLint

## API Integration

The frontend connects to the FastAPI backend at `http://localhost:8080` for all todo operations.

## Project Structure

```
frontend/
├── src/
│   └── app/
│       ├── globals.css      # Global styles
│       ├── layout.tsx       # Root layout
│       └── page.tsx         # Main todo interface
├── public/                  # Static assets
└── package.json            # Dependencies
```
