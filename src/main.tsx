import "./index.css";

import { BrowserRouter, Route, Routes, useSearchParams } from "react-router";
import { StrictMode, useMemo } from "react";

import { BaseOBRProvider } from "./react-obr/providers/BaseOBRProvider.tsx";
import Docs from "./views/Docs.tsx";
import Listings from "./views/Listings.tsx";
import Main from "./views/Main.tsx";
import NewSpellModal from "./views/NewSpellModal.tsx";
import SpellSelectionPopover from "./views/SpellSelectionPopover.tsx";
import Tutorials from "./views/Tutorials.tsx";
import { createRoot } from "react-dom/client";
import { ThemeProvider, useMediaQuery } from "@mui/material";
import { darkTheme, lightTheme } from "./config/theme.ts";

// eslint-disable-next-line react-refresh/only-export-components
function ExtensionMultiplexer() {
    const [searchParams] = useSearchParams();
    const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
    const children = useMemo(() => {
        if (searchParams.get("obrref")) {
            return (
                <BaseOBRProvider>
                    <ThemeProvider
                        theme={prefersDarkMode ? darkTheme : lightTheme}
                    >
                        <Routes>
                            <Route index element={<Main />} />
                            <Route
                                path="spell-selection-popover"
                                element={<SpellSelectionPopover />}
                            />
                            <Route
                                path="new-spell-modal/:spellID?"
                                element={<NewSpellModal />}
                            />
                        </Routes>
                    </ThemeProvider>
                </BaseOBRProvider>
            );
        }
        return (
            <Routes>
                <Route index element={<Docs />} />
                <Route path="tutorials" element={<Tutorials />} />
                <Route path="listings" element={<Listings />} />
            </Routes>
        );
    }, [prefersDarkMode, searchParams]);
    return children;
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <ExtensionMultiplexer />
        </BrowserRouter>
    </StrictMode>
);
