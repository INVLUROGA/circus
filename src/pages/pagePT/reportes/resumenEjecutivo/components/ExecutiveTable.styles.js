// components/ExecutiveTable.styles.js

export const COLORS = {
  red: "#c00000",
  white: "#ffffff",
  black: "#000000",
  gold: "#ffc000",
  grey: "#e9eef6",
  border: "1px solid #333",
};

const baseText = {
  fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif",
  color: COLORS.black,
};

const baseCell = {
  border: COLORS.border,
  padding: "8px 10px",
  fontSize: 28,
  textAlign: "center",
};

export const STYLES = {
  wrap: {
    ...baseText,
  },

  // --- Títulos y Chips ---
  chipContainer: {
    textAlign: "center",
    marginTop: 40,
    marginBottom: 8,
  },
  chipTitle: {
    display: "inline-block",
    background: COLORS.black,
    color: COLORS.white,
    padding: "12px 32px",
    borderRadius: 4,
    fontWeight: 700,
    letterSpacing: 0.3,
    fontSize: 25,
  },

  // --- Tablas ---
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },

  thMes: {
    color: COLORS.white,
    background: COLORS.red,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 23,
    padding: "10px",
  },
  thLeft: {
    color: COLORS.white,
    background: COLORS.red,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 23,
    padding: "10px",
    width: 260,
  },

  // Cabeceras para tablas de origen (si las usas)
  thOriginCorner: {
    background: COLORS.gold,
    color: COLORS.black,
    textAlign: "center",
    width: 260,
  },
  thOriginMonth: {
    background: COLORS.gold,
    color: COLORS.black,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 23,
    padding: "10px",
  },

  // Celdas
  cell: {
    ...baseCell,
    background: COLORS.white,
  },
  cellBold: {
    ...baseCell,
    background: COLORS.white,
    fontWeight: 700,
  },
  cellFirstGold: {
    ...baseCell,
    background: COLORS.gold,
    color: COLORS.black,
    fontWeight: 800,
  },

  // Filas y celdas especiales
  rowBlack: {
    background: COLORS.black,
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 25,
  },
  rowRedFooter: {
    background: COLORS.red,
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 25,
  },

  // 👉 esto es tu cellBlack
  cellBlack: {
    ...baseCell,
    background: "transparent",
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 25,
  },

  cellWhite: {
    ...baseCell,
    background: COLORS.white,
    color: COLORS.black,
    fontWeight: 700,
    fontSize: 25,
  },

  cellFooterRed: {
    ...baseCell,
    background: COLORS.gold,
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 25,
  },
};

export const getPctCellStyle = (pct) => ({
  ...baseCell,
  background: COLORS.white,
  color: pct >= 100 ? "#00a100" : COLORS.red,
  fontWeight: 700,
  fontSize: 25,
});

export const getCellStyle = (isLast) => ({
  ...baseCell,
  background: isLast ? COLORS.gold : COLORS.white,
  color: isLast ? COLORS.white : COLORS.black,
  fontWeight: isLast ? 700 : "normal",
  fontSize: 25,
});

export const getThStyle = (isLast) => ({
  ...STYLES.thMes,
  background: COLORS.gold,
  color: COLORS.black,
  fontSize: 25,
});

// === Mapeos para que coincidan con tus imports ===
export const gold = COLORS.gold;

export const sWrap = STYLES.wrap;
export const sTable = STYLES.table;
export const sThMes = STYLES.thMes;
export const sThLeft = STYLES.thLeft;

export const sCell = STYLES.cell;
export const sCellBold = STYLES.cellBold;

export const sRowBlack = STYLES.rowBlack;
export const sRowRed = STYLES.rowRedFooter;

export const chipContainer = STYLES.chipContainer;
export const chipTitle = STYLES.chipTitle;

export const rowBlackStyle = STYLES.rowBlack;
export const rowRedFooterStyle = STYLES.rowRedFooter;

export const cellBlack = STYLES.cellBlack;
export const cellWhite = STYLES.cellWhite;
export const cellFooterRed = STYLES.cellFooterRed;

export const cellStyle = getCellStyle;
export const thStyle = getThStyle;
export const pctCellStyle = getPctCellStyle;
