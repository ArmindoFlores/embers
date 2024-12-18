import "./index.css";

import { BrowserRouter, Route, Routes } from "react-router";

import { BaseOBRProvider } from "./react-obr/providers/BaseOBRProvider.tsx";
import Main from "./views/Main.tsx";
import SpellPopover from "./views/SpellPopover.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <BaseOBRProvider>
                <Routes>
                    <Route index element={<Main />} />
                    <Route path="popover" element={<SpellPopover />} />
                </Routes>
            </BaseOBRProvider>
        </BrowserRouter>
    </StrictMode>,
);
