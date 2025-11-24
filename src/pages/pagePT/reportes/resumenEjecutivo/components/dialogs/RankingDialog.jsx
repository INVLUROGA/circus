import React, { useState, useMemo } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputNumber } from "primereact/inputnumber";
import { NumberFormatMoney } from "@/components/CurrencyMask";

// Importamos la lógica del adaptador existente
import {
  pctLabel,
  buildResumenServicios,
  buildServicioTotals,
  calcProducto,
  buildTotalesProductos,
} from "../../adapters/detalleVentasLogic"; 

// === Estilos ===
const DARK = "#D6B400"; 
const sPanel = { border: `2px solid ${DARK}`, borderRadius: 10, overflow: "hidden", marginTop: 32, background: "#ffffff" };
const sPanelHeader = { background: DARK, color: "#fff", fontWeight: 900, textAlign: "center", fontSize: 24, padding: "10px 14px", letterSpacing: 0.2 };
const sPanelBody = { padding: 14 };
const thCell = { border: `1px solid ${DARK}`, padding: "8px 10px", fontSize: 22, textAlign: "center" };
const tdCell = { border: `1px solid ${DARK}`, padding: "8px 10px", fontSize: 22, textAlign: "center" };
const tdfinal = { fontSize: 25, color: "white", fontWeight: 700, textAlign: "center" };
const tableBase = { borderCollapse: "collapse", width: "100%", tableLayout: "fixed", border: `1px solid ${DARK}` };
const bodyCellGrid = { padding: "8px 10px", borderRight: `1px solid ${DARK}`, borderBottom: `1px solid ${DARK}`, fontSize: "22px", textAlign: "center" };
const bodyCellMoney = { ...bodyCellGrid };

function RankingDialogContent({ modalData, totalCostoServiciosProp }) {
  const [rateIgv, setRateIgv] = useState(0.18);
  const [rateRenta, setRateRenta] = useState(0.03);
  const [rateTarjeta, setRateTarjeta] = useState(0.045);
  const [rateComisionEstilista, setRateComisionEstilista] = useState(0.30); 
  const [rateComisionProducto, setRateComisionProducto] = useState(0.10);   
  const [activeRateEditor, setActiveRateEditor] = useState(null);

const resumenServicios = useMemo(() => {
  const brutoServicios = Number(modalData.totalPVentaServs || 0);
  const brutoProductos = Number(modalData.totalPVentaProd || 0);

  // 👉 VENTA BRUTA TOTAL = servicios + productos (8185)
  const brutoTotal = brutoServicios + brutoProductos;

  const costoTotal = Number(totalCostoServiciosProp || 0);

  return buildResumenServicios({
    modalResumen: { bruto: brutoTotal },
    totalCostoServicios: costoTotal,
    rateIgv,
    rateRenta,
    rateTarjeta,
    rateComisionEstilista,
  });
}, [
  modalData.totalPVentaServs,
  modalData.totalPVentaProd,
  totalCostoServiciosProp,
  rateIgv,
  rateRenta,
  rateTarjeta,
  rateComisionEstilista,
]);


  // 2. Totales Detalle Serviciosa
  const servicioTotals = useMemo(() => buildServicioTotals(modalData), [modalData]);

  // 3. Totales Productos
  const totalesProductos = useMemo(() => 
    buildTotalesProductos(modalData.productosAgrupados, {
      rateIgv, rateTarjeta, rateRenta, rateComision: rateComisionProducto,
    }), 
    [modalData.productosAgrupados, rateIgv, rateTarjeta, rateRenta, rateComisionProducto]
  );

  const fmtInt = (n) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(Number(n || 0));
  const breakTwoWords = (label) => {
    const parts = String(label ?? "").trim().split(/\s+/);
    return parts.length === 2 ? <>{parts[0]}<br />{parts[1]}</> : label;
  };

  const renderRateInput = (value, setter) => (
    <div style={{ marginTop: 4 }}>
        <InputNumber
        value={value * 100} onValueChange={(e) => setter((e.value || 0) / 100)}
        mode="decimal" minFractionDigits={0} maxFractionDigits={2} suffix="%"
        inputStyle={{ textAlign: "center", fontWeight: "bold", fontSize: 12 }}
        style={{ width: 70 }} autoFocus onBlur={() => setActiveRateEditor(null)}
        />
    </div>
  );

  return (
    <>
      {/* KPIs */}
      <div className="bg-primary fs-2 fw-bold text-center py-2" style={{ borderRadius: 6 }}>
        DETALLE DE PRODUCTOS Y SERVICIOS
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <div style={{ borderRadius: 12, padding: 12, background: "#fffef5", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "Cantidad de servicios", value: modalData.totalServCantidad },
              { label: "Venta Servicios", value: <NumberFormatMoney amount={modalData.totalPVentaServs} /> },
              { label: "Cantidad de productos", value: modalData.totalCantidad },
              { label: "Venta Productos", value: <NumberFormatMoney amount={modalData.totalPVentaProd} /> },
            ].map((item, i) => (
              <div key={i} style={{ border: "2px solid #d4af37", borderRadius: 8, padding: 12, background: "#fff" }}>
                <div style={{ fontSize: 15, opacity: 0.7, textAlign: "center" }}>{item.label}</div>
                <div style={{ fontWeight: 800, fontSize: 25, textAlign: "center" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métodos de Pago */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, margin: "20px 0" }}>
        {modalData.methodsToShow.map((m) => (
          <div key={m} style={{ border: "2px solid #d4af37", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 15, opacity: 0.7, textAlign: "center" }}>{modalData.headerLabel[m] || m}</div>
            <div style={{ fontWeight: 800, fontSize: 25, textAlign: "center" }}>
              <NumberFormatMoney amount={modalData.totalPorMetodo?.[m] || 0} />
            </div>
          </div>
        ))}
      </div>

      {/* === TABLA 1: RESUMEN DE VENTAS (EDITABLE) === */}
      <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 1000, textAlign: "center", fontSize: 25, marginBottom: 8 }}>VENTAS POR SERVICIOS</div>
          <table style={{ ...tableBase, fontSize: 20 }}>
            <thead className="bg-primary text-white">
              <tr>
                <th style={thCell}>VENTA<br/>BRUTA</th>
                <th style={thCell}>IGV<br/>
                    <span style={{ cursor: "pointer", textDecoration: "underline dotted" }} onClick={(e) => { e.stopPropagation(); setActiveRateEditor(activeRateEditor === 'igv' ? null : 'igv'); }}>
                        (-{pctLabel(rateIgv)})
                    </span>
                    {activeRateEditor === 'igv' && renderRateInput(rateIgv, setRateIgv)}
                </th>
                <th style={thCell}>RENTA<br/>
                    <span style={{ cursor: "pointer", textDecoration: "underline dotted" }} onClick={(e) => { e.stopPropagation(); setActiveRateEditor(activeRateEditor === 'renta' ? null : 'renta'); }}>
                        (-{pctLabel(rateRenta)})
                    </span>
                    {activeRateEditor === 'renta' && renderRateInput(rateRenta, setRateRenta)}
                </th>
                <th style={thCell}>TARJETA<br/>
                    <span style={{ cursor: "pointer", textDecoration: "underline dotted" }} onClick={(e) => { e.stopPropagation(); setActiveRateEditor(activeRateEditor === 'tarjeta' ? null : 'tarjeta'); }}>
                        (-{pctLabel(rateTarjeta)})
                    </span>
                    {activeRateEditor === 'tarjeta' && renderRateInput(rateTarjeta, setRateTarjeta)}
                </th>
                <th style={thCell}>COSTO<br/>SERVICIOS</th>
                <th style={thCell}>COMISIÓN<br/>ESTILISTA<br/>
                    <span style={{ cursor: "pointer", textDecoration: "underline dotted" }} onClick={(e) => { e.stopPropagation(); setActiveRateEditor(activeRateEditor === 'comisionEst' ? null : 'comisionEst'); }}>
                        (-{pctLabel(rateComisionEstilista)})
                    </span>
                    {activeRateEditor === 'comisionEst' && renderRateInput(rateComisionEstilista, setRateComisionEstilista)}
                </th>
                <th style={thCell}>INGRESO<br/>NETO</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdCell}><NumberFormatMoney amount={resumenServicios.bruto }/></td>
                <td style={{ ...tdCell, color: "red" }}>- <NumberFormatMoney amount={resumenServicios.igvMonto} /></td>
                <td style={{ ...tdCell, color: "red" }}>- <NumberFormatMoney amount={resumenServicios.rentaMonto} /></td>
                <td style={{ ...tdCell, color: "red" }}>- <NumberFormatMoney amount={resumenServicios.tarjetaMonto} /></td>
                <td style={{ ...tdCell, color: "red" }}>- <NumberFormatMoney amount={resumenServicios.costoTotal} /></td>
                <td style={{ ...tdCell, color: "red" }}>- <NumberFormatMoney amount={resumenServicios.comisionEstilistaMonto} /></td>
                <td style={{ ...tdfinal, color: "#007b00" }}><NumberFormatMoney amount={resumenServicios.ingresoNeto} /></td>
              </tr>
            </tbody>
          </table>
      </div>

      {/* === TABLA 2: DETALLE SERVICIOS === */}
      <div style={sPanel}>
        <div style={{ fontSize: 25 }} className="text-white bg-primary text-center">DETALLE DE SERVICIOS</div>
        <div style={sPanelBody}>
          <table style={tableBase}>
            <thead className="text-white bg-primary">
              <tr>
                <th style={{ ...thCell, width: 60 }}>Item</th>
                <th style={thCell}>Servicio</th>
                <th style={thCell}>Precio Unit.</th>
                <th style={{ width: 90, fontSize: 22, textAlign: "center", border: `1px solid ${DARK}` }}>Cant.</th>
                <th style={thCell}>Venta Total</th>
                {modalData.methodsToShow.map((m) => <th key={m} style={thCell}>{breakTwoWords(modalData.headerLabel[m] || m)}</th>)}
              </tr>
            </thead>
            <tbody>
              {modalData.serviciosOrdenados.map((s, i) => {
                const totalLinea = (Number(s.pVenta) || 0) * (Number(s.cantidad) || 0);
                return (
                  <tr className="text-center" key={i} style={i % 2 ? { background: "#fcfcfc" } : null}>
                    <td style={tdCell}>{i + 1}</td>
                    <td style={{ ...tdCell, textAlign: "left", fontWeight: 700 }}>{s.nombre}</td>
                    <td style={tdCell}><NumberFormatMoney amount={s.pVenta || 0} /></td>
                    <td style={tdCell}>{fmtInt(s.cantidad || 0)}</td>
                    <td style={tdCell}><NumberFormatMoney amount={totalLinea} /></td>
                    {modalData.methodsToShow.map((m) => (
                      <td key={m} style={tdCell}><NumberFormatMoney amount={Number(s[m]) || 0} /></td>
                    ))}
                  </tr>
                );
              })}
              <tr className="text-white" style={{ background: DARK, fontWeight: 700 }}>
                  <td style={tdfinal}></td>
                  <td style={{ ...tdfinal, textAlign: "right" }}>TOTAL SERVICIOS</td>
                  <td style={tdfinal}></td>
                  <td style={tdfinal}>{modalData.serviciosOrdenados.reduce((a, b) => a + (Number(b.cantidad) || 0), 0)}</td>
                  <td style={tdfinal}></td>
                  {modalData.methodsToShow.map(m => (
                      <td key={m} style={tdfinal}><NumberFormatMoney amount={servicioTotals.totalsByMethod[m]} /></td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* === TABLA 3: PRODUCTOS === */}
      <div style={{ ...sPanel, marginTop: 40 }}>
        <div style={sPanelHeader}>PRODUCTOS VENDIDOS</div>
        <div style={sPanelBody}>
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0, border: `2px solid ${DARK}`, fontSize: 18 }}>
            <thead>
              <tr>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800, width: 60 }}>Item</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800, textAlign: "left" }}>Producto</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Cant.</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>P. Unit</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Venta</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>IGV<br/>(-{pctLabel(rateIgv)})</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Tarjeta<br/>(-{pctLabel(rateTarjeta)})</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Renta<br/>(-{pctLabel(rateRenta)})</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Costo</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Util.<br/>Bruta</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>
                    Comisión<br/>
                    <span 
                        style={{ cursor: "pointer", textDecoration: "underline dotted", color: "#ffeb3b" }}
                        onClick={(e) => { e.stopPropagation(); setActiveRateEditor(activeRateEditor === 'comisionProd' ? null : 'comisionProd'); }}
                    >
                        (-{pctLabel(rateComisionProducto)})
                    </span>
                    {activeRateEditor === 'comisionProd' && renderRateInput(rateComisionProducto, setRateComisionProducto)}
                </th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Util.<br/>Neta</th>
                <th style={{ ...bodyCellGrid, background: DARK, color: "#fff", fontWeight: 800 }}>Util.<br/>x Prod.</th>
              </tr>
            </thead>
            <tbody>
              {modalData.productosAgrupados.length === 0 ? (
                <tr><td colSpan={13} style={{ ...bodyCellGrid, textAlign: "center" }}>No se vendieron productos.</td></tr>
              ) : (
                <>
                  {modalData.productosAgrupados.map((p, i) => {
                      const calc = calcProducto(p, { rateIgv, rateTarjeta, rateRenta, rateComision: rateComisionProducto });
                      return (
                        <tr key={i} style={i % 2 ? { background: "#fcfcfc" } : null}>
                          <td style={{ ...bodyCellGrid, fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ ...bodyCellGrid, textAlign: "left", fontWeight: 700 }}>{p.nombre}</td>
                          <td style={bodyCellGrid}>{p.cantidad}</td>
                          <td style={{ ...bodyCellGrid, fontWeight: 600 }}><NumberFormatMoney amount={p.precioVentaU || 0} /></td>
                          <td style={{ ...bodyCellGrid, fontWeight: 600, color: "#007b00" }}><NumberFormatMoney amount={calc.venta} /></td>
                          <td style={{ ...bodyCellGrid, color: "red" }}><NumberFormatMoney amount={calc.igv} /></td>
                          <td style={{ ...bodyCellGrid, color: "red" }}><NumberFormatMoney amount={calc.tarjeta} /></td>
                          <td style={{ ...bodyCellGrid, color: "red" }}><NumberFormatMoney amount={calc.renta} /></td>
                          <td style={{ ...bodyCellGrid, color: "red" }}><NumberFormatMoney amount={calc.compra} /></td>
                          <td style={{ ...bodyCellGrid, fontWeight: 600, color: "green" }}><NumberFormatMoney amount={calc.utilBase} /></td>
                          <td style={{ ...bodyCellGrid, color: "red" }}><NumberFormatMoney amount={calc.comision} /></td>
                          <td style={{ ...bodyCellGrid, fontWeight: 700, color: calc.utilFinal >= 0 ? "#007b00" : "red" }}><NumberFormatMoney amount={calc.utilFinal} /></td>
                          <td style={{ ...bodyCellGrid, fontWeight: 700, color: calc.utilPorProducto >= 0 ? "#007b00" : "red" }}><NumberFormatMoney amount={calc.utilPorProducto} /></td>
                        </tr>
                      );
                  })}
                  {/* Totales Productos */}
                   <tr style={{ background: DARK, color: "#fff", fontWeight: 900 }}>
                        <td style={bodyCellGrid}></td>
                        <td style={{ ...bodyCellGrid, textAlign: "left" }}>TOTALES</td>
                        <td style={bodyCellGrid}>{totalesProductos.totalCantidad}</td>
                        <td style={bodyCellGrid}></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalVenta} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalIGV} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalTarjeta} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalRenta} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalCompra} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalUtilBase} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalComision} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.totalUtilFinal} /></td>
                        <td style={{ ...bodyCellGrid, fontSize: 25 }}><NumberFormatMoney amount={totalesProductos.utilPromedioProducto} /></td>
                    </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function RankingDialog({ visible, onHide, title, data, totalCostoServicios = 0 }) {
  return (
    <Dialog
      header={<div style={{ textAlign: "center", fontSize: 30, fontWeight: 800 }}>{title}</div>}
      visible={visible}
      style={{ width: "100vw", maxWidth: "150vw", margin: "0 auto", borderRadius: "12px" }}
      modal
      onHide={onHide}
      footer={<div className="flex justify-end gap-2"><Button label="Cerrar" onClick={onHide} severity="secondary" /></div>}
    >
      {!data ? <div className="p-4 text-center text-xl">Sin ventas para esta selección.</div> : 
        <RankingDialogContent modalData={data} totalCostoServiciosProp={totalCostoServicios} />
      }
    </Dialog>
  );
}