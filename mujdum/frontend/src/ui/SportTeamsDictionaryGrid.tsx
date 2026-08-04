import { useMemo } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { muiAppDataGridTheme } from "./muiAppDataGridTheme";

export type SportTeamRow = {
  id: number;
  name: string;
  thesportsdb_team_id: string;
  sport: string | null;
  league_hint: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function SportTeamsDictionaryGrid({
  rows,
  onToggleActive
}: Readonly<{
  rows: SportTeamRow[];
  onToggleActive: (row: SportTeamRow, active: boolean) => void;
}>) {
  const columns = useMemo<GridColDef<SportTeamRow>[]>(
    () => [
      {
        field: "id",
        headerName: "#",
        width: 72,
        type: "number"
      },
      {
        field: "name",
        headerName: "Název",
        flex: 1,
        minWidth: 140
      },
      {
        field: "thesportsdb_team_id",
        headerName: "TheSportsDB ID",
        width: 130
      },
      {
        field: "sport",
        headerName: "Sport",
        width: 100,
        valueFormatter: (v) => (v ? String(v) : "—")
      },
      {
        field: "league_hint",
        headerName: "Liga (nápověda)",
        flex: 1,
        minWidth: 120,
        valueFormatter: (v) => (v ? String(v) : "—")
      },
      {
        field: "active",
        headerName: "Aktivní",
        width: 88,
        type: "boolean"
      },
      {
        field: "actions",
        headerName: "",
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <button
            type="button"
            className="ghostButton"
            onClick={() =>
              onToggleActive(params.row, !params.row.active)
            }
          >
            {params.row.active ? "Deaktivovat" : "Aktivovat"}
          </button>
        )
      }
    ],
    [onToggleActive]
  );

  return (
    <ThemeProvider theme={muiAppDataGridTheme}>
      <CssBaseline />
      <div className="dictGridRoot">
        <DataGrid
          label="Číselník týmů"
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          rowSelection={false}
          disableRowSelectionOnClick
          showToolbar
          pagination
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
            sorting: { sortModel: [{ field: "name", sort: "asc" }] }
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              showHistoryControls: false
            }
          }}
          sx={{
            border: "none",
            backgroundColor: "transparent",
            "& .MuiDataGrid-footerContainer": {
              borderTopColor: "rgba(255,255,255,0.12)"
            },
            "& .MuiDataGrid-columnHeaders": {
              borderBottomColor: "rgba(255,255,255,0.12)"
            },
            "& .MuiDataGrid-cell": {
              borderBottomColor: "rgba(255,255,255,0.06)"
            }
          }}
        />
      </div>
    </ThemeProvider>
  );
}
