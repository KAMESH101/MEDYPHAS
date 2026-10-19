# Medyphas AI - Intelligence Hub (Client-Side)

The frontend interface for Medyphas AI, designed to provide a "Pixel Perfect" user experience. It uses a modern stack to deliver a responsive, accessible, and visually stunning application.

## 🎨 Client-Side Architecture

### Tech Stack
- **React 18**: Component-based UI library.
- **TypeScript**: Ensures type safety across props, state, and API responses.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS**: Utility-first styling framework.

### Key Features & "Good" Practices

1.  **Glassmorphism UI**
    - We use `backdrop-filter: blur(12px)` and semi-transparent backgrounds (`bg-white/10`) to create a premium, depth-rich interface.
    - Shadows (`shadow-clay`) are custom-configured in `tailwind.config.js` to enhance the 3D effect.

2.  **Global State Management**
    - **`AuthContext`**: Manages user sessions (Teacher/Doctor/Patient) and persists state via `localStorage`.
    - **`ThemeContext`**: Toggles between Dark/Light modes, respecting system preferences.

3.  **Performance Optimizations**
    - **Code Splitting**: Routes are lazy-loaded to reduce initial bundle size.
    - **Optimized Assets**: Images (like `Logo.png`) are served as distinct assets.
    - **Debounced Input**: The "Quick Fix" search debounces API calls to prevent flooding the backend.

4.  **Accessibility (a11y)**
    - Semantic HTML (`<nav>`, `<main>`, `<section>`).
    - Focus management for modals and forms.
    - High contrast text colors for readability.

## 📂 Component Structure

- **`components/`**: Reusable UI blocks.
    - `Sidebar.tsx`: Reliable navigation with active state highlighting.
    - `SymptomSearch.tsx`: The core of the "Quick Fix" feature, handling complex user input and API fetching.
- **`pages/`**: Route-specific views.
    - `Dashboard.tsx`: The main hub, dynamically rendering content based on User Role.
    - `QuickFix.tsx`: The AI interface for patients.

## 🚀 Setup

```bash
# Install Dependencies
npm install

# Start Dev Server
npm run dev

# Build for Production
npm run build
```
