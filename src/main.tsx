import "./index.css"

import App from "./App.tsx"
import { BaseOBRProvider } from "./react-obr/providers/BaseOBRProvider.tsx";
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BaseOBRProvider proxy={false}>
            <App />
        </BaseOBRProvider>
    </StrictMode>,
);
