import { useMemo } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { muiAppDataGridTheme } from "./muiAppDataGridTheme";

export type DictionaryRoom = {
  id: number;
  name: string;
  created_at: string;
};

export default function RoomsDictionaryGrid({
  rows
}: Readonly<{
  rows: DictionaryRoom[];
}>) {
  const columns = useMemo<GridColDef<DictionaryRoom>[]>(
    () => [
      {
        field: "id",
        headerName: "#",
        width: 88,
        type: "number",
        align: "left",
        headerAlign: "left"
      },
      {
        field: "name",
        headerName: "Název",
        flex: 1,
        minWidth: 160
      },
      {
        field: "created_at",
        headerName: "Vytvořeno",
        flex: 1,
        minWidth: 190,
        sortComparator: (a, b) =>
          new Date(String(a)).getTime() - new Date(String(b)).getTime(),
        renderCell: (params) =>
          new Date(params.row.created_at).toLocaleString("cs-CZ")
      }
    ],
    []
  );

  return (
    <ThemeProvider theme={muiAppDataGridTheme}>
      <CssBaseline />
      <div className="dictGridRoot">
        <DataGrid
          label="Číselník místností"
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
