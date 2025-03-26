import "./index.css";

import { BrowserRouter, Route, Routes, useSearchParams } from "react-router";
import { Paper, ThemeProvider } from "@mui/material";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { darkTheme, lightTheme } from "./config/theme.ts";

import { BaseOBRProvider } from "./react-obr/providers/BaseOBRProvider.tsx";
import Docs from "./views/Docs.tsx";
import Listings from "./views/Listings.tsx";
import Main from "./views/Main.tsx";
import NewSpellModal from "./views/NewSpellModal.tsx";
import OBR from "@owlbear-rodeo/sdk";
import SpellSelectionPopover from "./views/SpellSelectionPopover.tsx";
import Tutorials from "./views/Tutorials.tsx";
import { createRoot } from "react-dom/client";

// eslint-disable-next-line react-refresh/only-export-components
function ExtensionMultiplexer() {
    const [searchParams] = useSearchParams();
    const [themeMode, setThemeMode] = useState<"DARK" | "LIGHT">("DARK");

    useEffect(() => {
        // Fetch the theme mode from OBR and set it
        OBR.theme.getTheme().then((theme) => {
            setThemeMode(theme.mode);
        });

        OBR.theme.onChange((theme) => {
            setThemeMode(theme.mode);
        });
    }, [searchParams]);

    const children = useMemo(() => {
        if (searchParams.get("obrref")) {
            return (
                <BaseOBRProvider>
                    <ThemeProvider
                        theme={themeMode === "DARK" ? darkTheme : lightTheme}
                    >
                        <Paper sx={{ backgroundColor: "transparent" }}>
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
                        </Paper>
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
    }, [searchParams, themeMode]);

    return children;
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <ExtensionMultiplexer />
        </BrowserRouter>
    </StrictMode>
);
