import { createTheme } from "@mui/material/styles";
import { csCZ } from "@mui/x-data-grid/locales";

/** Sdílené tmavé téma + české řetězce pro MUI X Data Grid na více záložkách. */
export const muiAppDataGridTheme = createTheme(
  {
    palette: {
      mode: "dark",
      primary: { main: "#b7c4ff" },
      background: { default: "#0b1326", paper: "#171f33" }
    },
    typography: {
      fontFamily: `"Inter", ui-sans-serif, system-ui, sans-serif`
    }
  },
  csCZ
);
