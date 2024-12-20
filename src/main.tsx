import "./index.css";

import { BrowserRouter, Route, Routes } from "react-router";

import { BaseOBRProvider } from "./react-obr/providers/BaseOBRProvider.tsx";
import Main from "./views/Main.tsx";
import SpellSelectionPopover from "./views/SpellSelectionPopover.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <BaseOBRProvider>
                <Routes>
                    <Route index element={<Main />} />
                    <Route path="spell-selection-popover" element={<SpellSelectionPopover />} />
                </Routes>
            </BaseOBRProvider>
        </BrowserRouter>
    </StrictMode>,
);
