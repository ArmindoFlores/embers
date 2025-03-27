import { createTheme } from "@mui/material/styles";

export const lightTheme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#BB99FF",
        },
        background: {
            default: "transparent",
            paper: "transparent",
        },
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#BB99FF",
        },
        background: {
            default: "transparent",
            paper: "transparent",
        },
    },
});
