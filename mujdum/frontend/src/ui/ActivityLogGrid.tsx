import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import {
  DataGrid,
  type GridCellParams,
  type GridColDef,
  type GridRowClassNameParams,
  type GridRowHeightParams
} from "@mui/x-data-grid";
import { muiAppDataGridTheme } from "./muiAppDataGridTheme";

export type ActivityLogItem = {
  id?: string;
  index?: string;
  "@timestamp"?: string;
  level?: string;
  event?: string;
  message?: string;
  data?: Record<string, unknown>;
};

type ActivityLogRow = {
  rowId: string;
  ts: string;
  level: string;
  event: string;
  message: string;
  dataJson: string;
  isDetailRow?: boolean;
};

const COLUMN_COUNT = 4;

function mapItems(items: ActivityLogItem[]): ActivityLogRow[] {
  return items.map((e, idx) => ({
    rowId: `${idx}-${e.id ?? e.index ?? "na"}-${e["@timestamp"] ?? ""}`,
    ts: typeof e["@timestamp"] === "string" ? e["@timestamp"] : "",
    level: e.level ?? "—",
    event: e.event ?? "—",
    message: e.message ?? "—",
    dataJson: JSON.stringify(e.data ?? {}, null, 2)
  }));
}

function DetailPanel({
  row,
  onClose
}: Readonly<{
  row: ActivityLogRow;
  onClose: () => void;
}>) {
  const hasPayload = row.dataJson !== "{}" && row.dataJson.trim() !== "";
  const detailTitle = row.ts
    ? new Date(row.ts).toLocaleString("cs-CZ")
    : "—";

  return (
    <Box sx={{ width: "100%", py: 1 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          mb: 1
        }}
      >
        <div>
          <Typography variant="subtitle2" component="p" sx={{ m: 0 }}>
            Detail záznamu
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", opacity: 0.75, mt: 0.25 }}
          >
            {detailTitle} · {row.level} · {row.message}
          </Typography>
        </div>
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          Zavřít
        </Button>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: "rgba(0,0,0,0.25)",
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "auto",
          maxHeight: 250
        }}
      >
        {hasPayload ? row.dataJson : "Žádná dodatečná data."}
      </Box>
    </Box>
  );
}

export default function ActivityLogGrid({
  rows
}: Readonly<{
  rows: ActivityLogItem[];
}>) {
  const baseRows = useMemo(() => mapItems(rows), [rows]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedRowId(null);
  }, [rows]);

  useEffect(() => {
    if (!expandedRowId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedRowId(null);
    }
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [expandedRowId]);

  const gridRows = useMemo(() => {
    if (!expandedRowId) return baseRows;
    const result: ActivityLogRow[] = [];
    for (const row of baseRows) {
      result.push(row);
      if (row.rowId === expandedRowId) {
        result.push({
          ...row,
          rowId: `detail-${row.rowId}`,
          isDetailRow: true
        });
      }
    }
    return result;
  }, [baseRows, expandedRowId]);

  const columns = useMemo<GridColDef<ActivityLogRow>[]>(
    () => [
      {
        field: "ts",
        headerName: "Čas",
        width: 190,
        colSpan: (_value, row) => (row.isDetailRow ? COLUMN_COUNT : 1),
        sortComparator: (a, b) =>
          new Date(String(a)).getTime() - new Date(String(b)).getTime(),
        renderCell: (params) => {
          if (params.row.isDetailRow) {
            return (
              <DetailPanel
                row={params.row}
                onClose={() => setExpandedRowId(null)}
              />
            );
          }
          return params.row.ts
            ? new Date(params.row.ts).toLocaleString("cs-CZ")
            : "—";
        }
      },
      {
        field: "level",
        headerName: "Úroveň",
        width: 100
      },
      {
        field: "event",
        headerName: "Událost",
        width: 160
      },
      {
        field: "message",
        headerName: "Zpráva",
        flex: 1,
        minWidth: 220
      }
    ],
    []
  );

  function handleCellClick(params: GridCellParams<ActivityLogRow>) {
    if (params.row.isDetailRow) return;
    setExpandedRowId((prev) =>
      prev === params.row.rowId ? null : params.row.rowId
    );
  }

  function rowClassName(params: GridRowClassNameParams<ActivityLogRow>) {
    if (params.row.isDetailRow) return "activity-log-inline-detail";
    return expandedRowId === params.row.rowId
      ? "activity-log-detail-row"
      : "";
  }

  function getRowHeight(params: GridRowHeightParams) {
    const row = params.model as ActivityLogRow;
    if (row.isDetailRow) return "auto" as const;
    return undefined;
  }

  return (
    <ThemeProvider theme={muiAppDataGridTheme}>
      <CssBaseline />
      <div className="dictGridRoot">
        <DataGrid
          label="Aktivitní log"
          rows={gridRows}
          columns={columns}
          getRowId={(r) => r.rowId}
          getRowClassName={rowClassName}
          getRowHeight={getRowHeight}
          rowSelection={false}
          disableRowSelectionOnClick
          onCellClick={handleCellClick}
          showToolbar
          pagination
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
            sorting: { sortModel: [{ field: "ts", sort: "desc" }] }
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
            },
            "& .MuiDataGrid-row": {
              cursor: "pointer"
            },
            "& .activity-log-detail-row": {
              backgroundColor: "rgba(183, 196, 255, 0.1)",
              "&:hover": {
                backgroundColor: "rgba(183, 196, 255, 0.14)"
              }
            },
            "& .activity-log-inline-detail": {
              cursor: "default",
              backgroundColor: "rgba(6, 14, 32, 0.92)",
              borderBottom: "1px solid rgba(255,255,255,0.14)",
              "&:hover": {
                backgroundColor: "rgba(6, 14, 32, 0.92)"
              }
            },
            "& .activity-log-inline-detail .MuiDataGrid-cell": {
              overflow: "visible",
              whiteSpace: "normal",
              maxHeight: "none !important",
              alignItems: "flex-start"
            }
          }}
        />
      </div>
    </ThemeProvider>
  );
}
