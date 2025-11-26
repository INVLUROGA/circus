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
  headerRed: {
    background: COLORS.black, // En tu ejemplo era negro el fondo del título grande
    color: COLORS.white,
    textAlign: "center",
    padding: "25px 12px",
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
  
  // Cabeceras Generales (Rojas)
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

  // Cabeceras para Tablas de Origen (Doradas)
  thOriginCorner: { // <--- PARA LA ESQUINA VACÍA DORADA
    background: COLORS.gold,
    color: COLORS.black,
    textAlign: "center",
    width: 260,
  },
  thOriginMonth: { // <--- PARA LOS MESES DORADOS
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
  cellFirstGold: { // Primera columna dorada
    ...baseCell,
    background: COLORS.gold,
    color: COLORS.black,
    fontWeight: 800,
  },
  
  // Footers y Totales
  rowBlack: {
    background: COLORS.black,
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 25,
  },
  cellBlackTransparent: {
    ...baseCell,
    background: "transparent",
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
  cellFooterRed: {
    ...baseCell,
    background: COLORS.gold, // En tu imagen el footer rojo tiene celdas doradas? o al revés? Ajustado a tu código.
    color: COLORS.white,
    fontWeight: 700,
    fontSize: 25,
  },
  cellFooterGold: {
     ...baseCell,
     background: COLORS.gold,
     color: COLORS.black,
     fontWeight: 800,
  },
  
  // Celdas de Alcance
  cellAlcanceTitle: {
    ...baseCell,
    background: COLORS.gold,
    color: COLORS.white, // O black según diseño exacto
    fontWeight: 700,
  },
};

// Helpers de estilo dinámico
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
  fontSize: isLast ? 25 : 25,
});

export const getThStyle = (isLast) => ({
  ...STYLES.thMes,
  background: COLORS.gold, // En tu código original forzabas gold aquí
  color: COLORS.black,
  fontSize: 25,
});