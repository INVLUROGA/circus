import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { NumberFormatMoney } from "@/components/CurrencyMask";
import { useTerminoMetodoPagoStore } from "@/hooks/hookApi/FormaPagoStore/useTerminoMetodoPagoStore";
import { Button } from "primereact/button";
const thStyle = { border: "1px solid #ccc", padding: "8px", textAlign: "center", fontWeight: "bold" };
const tdStyle = { border: "1px solid #ccc", padding: "8px", textAlign: "center", fontSize: "20px" };


const toKey = (s = "") =>
  String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const methodKey = (s = "") => toKey(s).replace(/\s+/g, "_");
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

const fixDeltaToTotal = (obj, total) => {
  const suma = round2(Object.values(obj).reduce((a, b) => a + Number(b || 0), 0));
  const delta = round2(total - suma);
  if (Math.abs(delta) >= 0.01) {
    const firstKey = Object.keys(obj)[0];
    if (firstKey) obj[firstKey] = round2((obj[firstKey] || 0) + delta);
  }
  return obj;
};

const repartirLineaPorMetodos = (totalLinea, pagosByMethod, headerLabel) => {
  const map = Object.fromEntries(Object.keys(headerLabel).map((k) => [k, 0]));
  const totalPagos = Object.values(pagosByMethod).reduce((a, b) => a + Number(b || 0), 0);
  if (totalPagos > 0) {
    for (const [raw, v] of Object.entries(pagosByMethod)) {
      const k = methodKey(raw);
      if (!k || !headerLabel[k]) continue;
      map[k] = round2(totalLinea * (Number(v) / totalPagos));
    }
  } else {
    const first = Object.keys(headerLabel)[0];
    if (first) map[first] = round2(totalLinea);
  }
  return fixDeltaToTotal(map, round2(totalLinea));
};

const getPagos = (venta) => {
  const arr =
    venta?.detalleVenta_pagoVenta ||
    venta?.detalle_pagoVenta ||
    venta?.tb_pago_ventas ||
    venta?.pago_venta ||
    venta?.detalle_pagos ||
    [];
  return arr.map((p) => ({
    label:
      p?.parametro_forma_pago?.label_param ??
      p?.parametro_forma_pago?.nombre ??
      p?.forma ??
      p?.id_forma_pago ??
      "",
    monto:
      Number(p?.parcial_monto ?? p?.monto ?? p?.monto_pago ?? p?.importe ?? p?.monto_detalle) || 0,
  }));
};


function toLimaDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utcMs - 5 * 60 * 60000);
  } catch {
    return null;
  }
}

function filtrarVentasPorMes(ventas = [], filtro, initDay = 1, cutDay) {
  if (!filtro || !filtro.mes || !filtro.anio) return ventas;
  const mapa = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8,
    octubre: 9, noviembre: 10, diciembre: 11,
  };
  const monthIdx = mapa[filtro.mes.toLowerCase()] ?? -1;
  if (monthIdx < 0) return ventas;
  const yearNum = Number(filtro.anio);
  const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
  const from = Math.max(1, Math.min(initDay, lastDay));
  const to = Math.max(from, Math.min(cutDay || lastDay, lastDay));

  return ventas.filter((v) => {
    const d = toLimaDate(v?.fecha_venta ?? v?.createdAt ?? v?.fecha);
    if (!d) return false;
    return (
      d.getFullYear() === yearNum &&
      d.getMonth() === monthIdx &&
      d.getDate() >= from &&
      d.getDate() <= to
    );
  });
}

function rankingPorEmpleado(ventas = []) {
  const map = new Map();
  const ventasPorEmpleado = new Map();
  const getAcc = (empleado) => {
    if (!map.has(empleado)) {
      map.set(empleado, {
        empleado,
        totalVentas: 0,
        cantidadVentas: 0,
        ventasProductos: 0,
        cantidadProductos: 0,
        ventasServicios: 0,
        cantidadServicios: 0,
      });
      ventasPorEmpleado.set(empleado, new Set());
    }
    return map.get(empleado);
  };

  for (const v of ventas) {
    const idVenta = v?.id ?? v?.numero_transac;
    if (Array.isArray(v?.detalle_ventaProductos)) {
      for (const it of v.detalle_ventaProductos) {
        const empleado = it?.empleado_producto?.nombres_apellidos_empl;
        if (!empleado) continue;
        const cantidad = Number(it?.cantidad) || 0;
        const precio = Number(it?.tarifa_monto) || Number(it?.tb_producto?.prec_venta) || 0;
        const importe = precio * cantidad;
        const acc = getAcc(empleado);
        acc.ventasProductos += importe;
        acc.cantidadProductos += cantidad;
        ventasPorEmpleado.get(empleado).add(idVenta);
      }
    }
    if (Array.isArray(v?.detalle_ventaservicios)) {
      for (const it of v.detalle_ventaservicios) {
        const empleado = it?.empleado_servicio?.nombres_apellidos_empl;
        if (!empleado) continue;
        const cantidad = Number(it?.cantidad) || 0;
        const precio = Number(it?.tarifa_monto) || 0;
        const importe = precio * cantidad;
        const acc = getAcc(empleado);
        acc.ventasServicios += importe;
        acc.cantidadServicios += cantidad;
        ventasPorEmpleado.get(empleado).add(idVenta);
      }
    }
  }

  const out = [];
  for (const [empleado, acc] of map.entries()) {
    acc.totalVentas = acc.ventasProductos + acc.ventasServicios;
    acc.cantidadVentas = ventasPorEmpleado.get(empleado)?.size ?? 0;
    out.push(acc);
  }
  return out.sort((a, b) => b.totalVentas - a.totalVentas);
}

export const RankingEstilista = ({ dataVenta = [], filtrarFecha, initialDay = 1, cutDay }) => {
  const [q,setQ]=useState('');
  const normq = (s='') => String(s).normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');
  const matchIncludes = (haystack, needle) => normq(haystack).includes(normq(needle));
  const { obtenerFormaDePagosActivos } = useTerminoMetodoPagoStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    obtenerFormaDePagosActivos().catch((err) =>
      console.error("Error cargando métodos activos", err)
    );
  }, []);


const canon = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();  const ventasMes = useMemo(() => {
    if (Array.isArray(filtrarFecha)) {
      return filtrarFecha.flatMap((f) =>
        filtrarVentasPorMes(dataVenta, f, initialDay, cutDay)
      );
    }
    return filtrarVentasPorMes(dataVenta, filtrarFecha, initialDay, cutDay);
  }, [dataVenta, filtrarFecha, initialDay, cutDay]);

  function buildModalData(ventasEmpleado = [], empleadoKey /* <- canon(nombre) */) {
  const headerLabel = {};
  for (const v of ventasEmpleado) {
    for (const p of getPagos(v)) {
      const k = methodKey(p.label);
      if (k && !headerLabel[k]) headerLabel[k] = String(p.label || k);
    }
  }
  if (Object.keys(headerLabel).length === 0) {
    ["Efectivo", "Tarjeta", "Yape", "Plin"].forEach((lbl) => (headerLabel[methodKey(lbl)] = lbl));
  }

  const serviciosFlat = [];
  const productosFlat = [];
  const totalesMetodo = Object.fromEntries(Object.keys(headerLabel).map((k) => [k, 0]));

  for (const v of ventasEmpleado) {
    const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];
    const productos = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos : [];

    const pagosByMethod = getPagos(v).reduce((acc, p) => {
      const k = methodKey(p.label);
      if (k) acc[k] = (acc[k] || 0) + Number(p.monto || 0);
      return acc;
    }, {});

    for (const s of servicios) {
      const emp = canon(s?.empleado_servicio?.nombres_apellidos_empl);
      if (emp !== empleadoKey) continue; 

      const cantidad = Number(s?.cantidad ?? 1) || 0;
      const pVenta = Number(s?.tarifa_monto) || 0;
      const totalLinea = cantidad * pVenta;

      const lineaMetodos = repartirLineaPorMetodos(totalLinea, pagosByMethod, headerLabel);
      for (const [k, vmet] of Object.entries(lineaMetodos)) totalesMetodo[k] += Number(vmet) || 0;

      serviciosFlat.push({
        nombre:
          s?.circus_servicio?.nombre_servicio ||
          s?.tb_servicio?.nombre_servicio ||
          s?.nombre_servicio ||
          s?.nombre ||
          "—",
        cantidad,
        pVenta,
        ...lineaMetodos,
      });
    }

for (const p of productos) {
  const cantidad       = Number(p?.cantidad ?? 1) || 1;
  const precioVentaU   = Number(p?.tarifa_monto) || Number(p?.tb_producto?.prec_venta) || 0;
  const precioCompraU  = Number(p?.tb_producto?.prec_compra) || 0;
  const nombre         = p?.tb_producto?.nombre_producto || p?.nombre_producto || p?.nombre || "-";
  const totalLinea     = precioVentaU * cantidad;

  const lineaMetodos = repartirLineaPorMetodos(totalLinea, pagosByMethod, headerLabel);
  for (const [k, vmet] of Object.entries(lineaMetodos)) {
    totalesMetodo[k] += Number(vmet) || 0;
  }

  productosFlat.push({
    nombre,
    cantidad,
    precioVentaU,
    precioCompraU,
  });
}
    
  }
  const productosAgrupados = Object.values(
    productosFlat.reduce((acc, p) => {
      const key = `${p.nombre}-${p.metodo}-${p.precioVentaU}`;
      if (!acc[key])
        acc[key] = { ...p, cantidad: 0 };
    acc[key].cantidad += Number(p.cantidad) || 0;
      return acc;
    }, {})
  );

  const serviciosAgrupados = Object.values(
    serviciosFlat.reduce((acc, s) => {
      const key = `${s.nombre}-${s.pVenta}`;
      if (!acc[key])
        acc[key] = {
          nombre: s.nombre,
          cantidad: 0,
          pVenta: s.pVenta,
          ...Object.fromEntries(Object.keys(headerLabel).map((k) => [k, 0])),
        };
      acc[key].cantidad += s.cantidad;
      for (const k of Object.keys(headerLabel))
        acc[key][k] += Number(s[k]) || 0;
      return acc;
    }, {})
  );

  const serviciosOrdenados = [...serviciosAgrupados].sort((a, b) => {
    const totalA = (a.pVenta || 0) * (a.cantidad || 0);
    const totalB = (b.pVenta || 0) * (b.cantidad || 0);
    return totalB - totalA;
  });

const productosOrdenados = [...productosAgrupados].sort((a, b) => {
  const totalA = (a.precioVentaU || 0) * (a.cantidad || 0);
  const totalB = (b.precioVentaU || 0) * (b.cantidad || 0);
  return totalB - totalA;
});

  const totalPVentaServs = serviciosOrdenados.reduce(
    (a, s) => a + s.pVenta * s.cantidad,
    0
  );
  const totalServCantidad = serviciosOrdenados.reduce(
    (a, s) => a + s.cantidad,
    0
  );
  const totalPVentaProd = productosOrdenados.reduce(
    (a, p) => a + p.precioVentaU * p.cantidad,
    0
  );
  const totalCantidad = productosOrdenados.reduce(
    (a, p) => a + p.cantidad,
    0
  );

  const RATE_IGV = 0.18,
    RATE_RENTA = 0.03,
    RATE_TARJ = 0.045;

  const methodsToShow = Object.keys(headerLabel).sort(
    (a, b) => (totalesMetodo[b] || 0) - (totalesMetodo[a] || 0)
  );

  const modalResumen = {
    bruto: totalPVentaServs,
    igv: totalPVentaServs * RATE_IGV,
    renta: totalPVentaServs * RATE_RENTA,
    tarjeta: totalPVentaServs * RATE_TARJ,
    neto: totalPVentaServs * (1 - RATE_IGV - RATE_RENTA - RATE_TARJ),
  };

  return {
    totalServCantidad,
    totalPVentaServs,
    totalCantidad,
    totalPVentaProd,
    methodsToShow,
    headerLabel,
    totalPorMetodo: totalesMetodo,
    serviciosOrdenados,
    productosAgrupados: productosOrdenados,
    modalResumen,
  };
}

  const handleRowClick = useCallback(
  (empleadoNombre) => {
    const key = canon(empleadoNombre);

    const ventasEmpleado = ventasMes.filter((v) => {
      const matchServ = (v?.detalle_ventaservicios || []).some(
        (it) => canon(it?.empleado_servicio?.nombres_apellidos_empl) === key
      );
      const matchProd = (v?.detalle_ventaProductos || []).some(
        (it) => canon(it?.empleado_producto?.nombres_apellidos_empl) === key
      );
      return matchServ || matchProd;
    });

    const data = buildModalData(ventasEmpleado, key); // << pasamos la clave
    setModalTitle(`VENTAS — ${empleadoNombre.split(" ")[0]} — AL DÍA ${cutDay}`);
    setModalData(data);
    setModalOpen(true);
  },
  [ventasMes, cutDay]
);


  return (
    <>
     <div style={{  display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-start' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar colaborador..."
          className="p-inputtext p-component"
          style={{ minWidth: 260, padding: 8 }}
          aria-label="Buscar colaborador"
        />
        {q && <Button label="Limpiar" onClick={() => setQ('')} severity="secondary" outlined />}
      </div>
      <TablaRanking ventas={ventasMes} onRowClick={handleRowClick} filtroNombre={q}/>
      <Dialog
        header={<div style={{ textAlign: "center", fontSize: 30, fontWeight: 800 }}>{modalTitle}</div>}
        visible={modalOpen}
        style={{ width: "100vw",  margin: "0 auto" }}
        modal
        onHide={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cerrar
            </button>
          </div>
        }
      >
        {!modalData ? <div>Sin ventas para esta selección.</div> : <RankingDialogContent modalData={modalData} />}
      </Dialog>
    </>
  );
};




function RankingDialogContent({ modalData }) {
  const th = { fontSize: 22, textAlign: "center" };

  // === estilos para panel oscuro con bordes ===
  const DARK = "#D6B400"; // bg-dark
  const sPanel = {
    border: `2px solid ${DARK}`,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 32,
    background: "#ffffff",
  };
  const sPanelHeader = {
    background: DARK,
    color: "#fff",
    fontWeight: 900,
    textAlign: "center",
    fontSize: 24,
    padding: "10px 14px",
    letterSpacing: 0.2,
  };
  const sPanelBody = { padding: 14 };

  const thCell = { ...th, border: `1px solid ${DARK}`, padding: "8px 10px" };
  const tdCell = { border: `1px solid ${DARK}`, padding: "8px 10px", fontSize: 22 };
  const tableBase = {
    borderCollapse: "collapse",
    width: "100%",
    tableLayout: "fixed",
    border: `1px solid ${DARK}`,
  };
const tdfinal = { fontSize: 25, color: "white" };
const tdinicio={fontSize:22}

  return (
    <>
      <div className="bg-primary fs-2 fw-bold text-center py-2" style={{ borderRadius: 6 }}>
        DETALLE DE PRODUCTOS Y SERVICIOS
      </div>
      {/* === KPIs === */}
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, margin: "20px 0" }}>
        {modalData.methodsToShow.map((m) => (
          <div key={m} style={{ border: "2px solid #d4af37", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 15, opacity: 0.7, textAlign: "center" }}>{modalData.headerLabel[m] || m}</div>
            <div style={{ fontWeight: 800, fontSize: 25, textAlign: "center" }}>
              <NumberFormatMoney amount={modalData.totalPorMetodo?.[m] || 0} />a¿
            </div>
          </div>
        ))}
      </div>

      {/* === Resumen servicios === */}
      {modalData.modalResumen && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 1000, textAlign: "center", fontSize: 25 }}>VENTAS POR SERVICIOS</div>
          <table style={{ ...tableBase, fontSize: 20, textAlign: "center" }}>
            <thead className="bg-primary text-white">
              <tr>
                <th style={thCell}>Venta Bruta</th>
                <th style={thCell}>IGV (-18%)</th>
                <th style={thCell}>Renta (-3%)</th>
                <th style={thCell}>Tarjeta (-4.5%)</th>
                <th style={thCell}>Venta Neta</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdCell, fontSize: "25px" }}>
                  <NumberFormatMoney amount={modalData.modalResumen.bruto} />
                </td>
                <td style={{ ...tdCell, color: "red" }}>
                  - <NumberFormatMoney amount={modalData.modalResumen.igv} />
                </td>
                <td style={{ ...tdCell, color: "red" }}>
                  - <NumberFormatMoney amount={modalData.modalResumen.renta} />
                </td>
                <td style={{ ...tdCell, color: "red" }}>
                  - <NumberFormatMoney amount={modalData.modalResumen.tarjeta} />
                </td>
                <td style={{ ...tdfinal, color: "#007b00", fontWeight: 700 }}>
                  <NumberFormatMoney amount={modalData.modalResumen.neto} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* === DETALLE DE SERVICIOS (panel con borde oscuro) === */}
      <div style={sPanel}>
        <div style={{fontSize:25}} className="text-white bg-primary text-center" >DETALLE DE SERVICIOS</div>
        <div style={sPanelBody}>
          <table style={tableBase}>
            <thead className="text-white bg-primary" >
              <tr>
                <th style={{ ...thCell, width: "60px", minWidth: "60px", maxWidth: "60px" }}>Item</th>
                <th style={{ ...thCell, textAlign: "left" }}>Servicio</th>
                <th style={thCell}>Precio Unitario</th>
                <th style={thCell}>Venta Total</th>
                {modalData.methodsToShow.map((m) => (
                  <th key={m} style={thCell}>
                    {modalData.headerLabel[m] || m}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {modalData.serviciosOrdenados.map((s, i) => {
                const totalLinea = (s.pVenta || 0) * (s.cantidad || 0);
                return (
                  <tr key={i} style={i % 2 ? { background: "#fcfcfc" } : null}>
                    <td style={tdCell}>{i + 1}</td>
                    <td style={{ ...tdCell, textAlign: "left", fontWeight: 700, whiteSpace: "normal", wordWrap: "break-word" }}>
                      {s.nombre || s.circus_servicio?.nombre_servicio || "—"}
                    </td>
                    <td style={{...tdCell,textAlign:"center"}}>
                      <NumberFormatMoney amount={s.pVenta || 0} />
                    </td>
                    <td style={{...tdCell,textAlign:"center"}}>
                      <NumberFormatMoney amount={totalLinea} />
                    </td>
                    {modalData.methodsToShow.map((m) => (
                      <td key={m} style={{...tdCell,textAlign:"center"}}>
                        <NumberFormatMoney amount={Number(s[m]) || 0} />
                      </td>
                    ))}
                  </tr>
                );
              })}

              {(() => {
                const servicios = modalData.serviciosOrdenados || [];
                const totales = {};
                const promedios = {};
                modalData.methodsToShow.forEach((m) => {
                  const valores = servicios.map((s) => Number(s[m]) || 0);
                  const suma = valores.reduce((a, b) => a + b, 0);
                  const prom = suma / (valores.length || 1);
                  totales[m] = suma;
                  promedios[m] = prom;
                });
                const totalVenta = servicios.reduce((acc, s) => acc + (s.pVenta || 0) * (s.cantidad || 0), 0);

                return (
                  <tr className="text-white" style={{ background: DARK, fontWeight: 700 }}>
                    <td style={{ ...tdfinal, textAlign: "center", fontSize: 19 }}>TOTAL</td>
                    <td style={{ ...tdfinal, textAlign: "center" }}>—</td>
                    <td style={{ ...tdfinal, textAlign: "center" }} />
                    <td style={{ ...tdfinal, textAlign: "center" }}>
                      <NumberFormatMoney amount={totalVenta} />
                    </td>
                    {modalData.methodsToShow.map((m) => (
                      <td key={m} style={{ ...tdfinal, textAlign: "center" }}>
                        {totales[m] > promedios[m] ? <NumberFormatMoney amount={totales[m]} /> : "—"}
                      </td>
                    ))}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

{/* === PRODUCTOS VENDIDOS === */}
<div style={{ ...sPanel, marginTop: 40 }}>
  <div style={sPanelHeader}>PRODUCTOS VENDIDOS</div>
  <div style={sPanelBody}>
    {(() => {
      const tableGrid = {
        width: "100%",
        tableLayout: "fixed",
        borderCollapse: "separate",
        borderSpacing: 0,
        border: `2px solid ${DARK}`, // marco externo
        fontSize: 18,
      };
      const headCellGrid = {
        background: DARK,
        color: "#fff",
        fontWeight: 800,
        textAlign: "center",
        padding: "8px 10px",
        borderRight: `1px solid ${DARK}`,
        borderBottom: `1px solid ${DARK}`,
      };
      const bodyCellGrid = {
        padding: "8px 10px",
        borderRight: `1px solid ${DARK}`,
        borderBottom: `1px solid ${DARK}`,
        fontSize:"22px"
      };
      const bodyCellMoney = { ...bodyCellGrid, textAlign: "center" };

      return (
        <table style={tableGrid}>
          <thead>
            <tr>
              <th style={{ ...headCellGrid, width: 60, minWidth: 60 }}>ITEM</th>
              <th style={{ ...headCellGrid, textAlign: "left" }}>PRODUCTO</th>
              <th style={headCellGrid}>CANTIDAD</th>
              <th style={headCellGrid}>PRECIO UNITARIO</th>
              <th style={headCellGrid}>PRECIO VENTA</th>
              <th style={headCellGrid}>IGV (-18%)</th>
              <th style={headCellGrid}>TARJETA (-4.5%)</th>
              <th style={headCellGrid}>RENTA (-3%)</th>
              <th style={headCellGrid}>COSTO COMPRA</th>
              <th style={headCellGrid}>UTILIDAD BRUTA</th>
              <th style={headCellGrid}>COMISIÓN</th>
              <th style={headCellGrid}>UTILIDAD NETA</th>
            </tr>
          </thead>

          <tbody>
            {modalData.productosAgrupados.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ ...bodyCellGrid, textAlign: "center" }}>
                  No se vendieron productos.
                </td>
              </tr>
            ) : (
              <>
                {(() => {
                  const RATE_IGV = 0.18;
                  const RATE_TARJETA = 0.045;
                  const RATE_RENTA = 0.03;
                  const RATE_COMISION = 0.1;

                  const productosUnificados = Object.values(
                    modalData.productosAgrupados.reduce((acc, p) => {
                      const key = `${p.nombre}-${p.precioVentaU}-${p.precioCompraU}`;
                      if (!acc[key]) acc[key] = { ...p, cantidad: 0 };
                      acc[key].cantidad += Number(p.cantidad) || 0;
                      return acc;
                    }, {})
                  );

                  const productosOrdenados = [...productosUnificados].sort((a, b) => {
                    const totalA = (a.precioVentaU || 0) * (a.cantidad || 0);
                    const totalB = (b.precioVentaU || 0) * (b.cantidad || 0);
                    return totalB - totalA;
                  });

                  return productosOrdenados.map((p, i) => {
                    const venta = (p.precioVentaU || 0) * (p.cantidad || 0);
                    const compra = (p.precioCompraU || 0) * (p.cantidad || 0);
                    const igv = venta * RATE_IGV;
                    const tarjeta = venta * RATE_TARJETA;
                    const renta = venta * RATE_RENTA;
                    const utilBruta = venta - igv - tarjeta - renta - compra;
                    const comision = utilBruta * RATE_COMISION;
                    const utilNeta = utilBruta - comision;

                    return (
                      <tr key={i} style={i % 2 ? { background: "#fcfcfc" } : null}>
                        <td style={{ ...bodyCellGrid, textAlign: "center", fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ ...bodyCellGrid, textAlign: "left", fontWeight: 700, whiteSpace: "normal", wordWrap: "break-word", maxWidth: 350 }}>
                          {p.nombre}
                        </td>
                        <td style={{ ...bodyCellGrid, textAlign: "center" }}>{p.cantidad}</td>
                        <td style={bodyCellMoney}><NumberFormatMoney amount={p.precioVentaU || 0} /></td>
                        <td style={{ ...bodyCellMoney, fontWeight: 600, color: "#007b00" }}>
                          <NumberFormatMoney amount={venta} />
                        </td>
                        <td style={{ ...bodyCellMoney, color: "red" }}>
                          <NumberFormatMoney amount={igv} />
                        </td>
                        <td style={{ ...bodyCellMoney, color: "red" }}>
                          <NumberFormatMoney amount={tarjeta} />
                        </td>
                        <td style={{ ...bodyCellMoney, color: "red" }}>
                          <NumberFormatMoney amount={renta} />
                        </td>
                        <td style={{ ...bodyCellMoney, color: "red" }}>
                          <NumberFormatMoney amount={compra} />
                        </td>
                        <td style={{ ...bodyCellMoney, fontWeight: 600, color: "green" }}>
                          <NumberFormatMoney amount={utilBruta} />
                        </td>
                        <td style={{ ...bodyCellMoney, color: "red" }}>
                          <NumberFormatMoney amount={comision} />
                        </td>
                        <td style={{ ...bodyCellMoney, fontWeight: 700, color: utilNeta >= 0 ? "#007b00" : "red" }}>
                          <NumberFormatMoney amount={utilNeta} />
                        </td>
                      </tr>
                    );
                  });
                })()}

                {/* TOTALES */}
                {(() => {
                  const RATE_IGV = 0.18;
                  const RATE_TARJETA = 0.045;
                  const RATE_RENTA = 0.03;
                  const RATE_COMISION = 0.1;

                  const productos = modalData.productosAgrupados;
                  const totalVenta = productos.reduce((a, p) => a + (p.precioVentaU || 0) * (p.cantidad || 0), 0);
                  const totalCompra = productos.reduce((a, p) => a + (p.precioCompraU || 0) * (p.cantidad || 0), 0);
                  const totalIGV = totalVenta * RATE_IGV;
                  const totalTarjeta = totalVenta * RATE_TARJETA;
                  const totalRenta = totalVenta * RATE_RENTA;
                  const totalUtilBruta = totalVenta - totalIGV - totalTarjeta - totalRenta - totalCompra;
                  const totalComision = totalUtilBruta * RATE_COMISION;
                  const totalUtilNeta = totalUtilBruta - totalComision;
                  const totalCantidad = productos.reduce((a, p) => a + (p.cantidad || 0), 0);

                  return (
                    <tr style={{ background: DARK, color: "#fff", fontWeight: 900 }}>
                      <td style={bodyCellGrid}></td>
                      <td style={{ ...bodyCellGrid, textAlign: "left" }}>TOTALES</td>
                      <td style={{ ...bodyCellGrid, textAlign: "center" }}>{totalCantidad}</td>
                      <td style={bodyCellGrid}></td>
                      <td style={{ ...bodyCellGrid, textAlign: "center",fontSize:25 }}>
                        <NumberFormatMoney amount={totalVenta} />
                      </td>
                      <td style={{ ...bodyCellGrid, textAlign: "center",fontSize:25 }}>
                        <NumberFormatMoney amount={totalIGV} />
                      </td>
                      <td style={{ ...bodyCellGrid, textAlign: "center",fontSize:25 }}>
                        <NumberFormatMoney amount={totalTarjeta} />
                      </td>
                      <td style={{ ...bodyCellGrid, textAlign: "center" ,fontSize:25}}>
                        <NumberFormatMoney amount={totalRenta} />
                      </td>
                      <td style={{ ...bodyCellGrid, textAlign: "center", fontSize:25 }}>
                        <NumberFormatMoney amount={totalCompra} />
                      </td>
                      <td style={{ ...bodyCellGrid, textAlign: "center",fontSize:25 }}>
                        <NumberFormatMoney amount={totalUtilBruta} />
                      </td>
                      <td style={{ ...bodyCellGrid, textAlign: "center",fontSize:25 }}>
                        <NumberFormatMoney amount={totalComision} />
                      </td>
                      <td style={{ ...bodyCellGrid, textAlign: "center" ,fontSize:25}}>
                        <NumberFormatMoney amount={totalUtilNeta} />
                      </td>
                    </tr>
                  );
                })()}
              </>
            )}
          </tbody>
        </table>
      );
    })()}
  </div>
</div>

    </>
  );
}



function TablaRanking({ ventas, onRowClick, filtroNombre='' }) {
  const ranking = useMemo(() => rankingPorEmpleado(ventas), [ventas]);
const norm = (s='') => String(s).normalize('NFKC').toLowerCase().trim().replace(/\s+/g,' ');
  const rankingFiltrado = useMemo(() => {
    if (!filtroNombre) return ranking;
    const q = norm(filtroNombre);
    return ranking.filter(r => norm(r.empleado).includes(q));
 }, [ranking, filtroNombre]);
  const totalClientes = rankingFiltrado.reduce((a, r) => a + (r.cantidadVentas || 0), 0);
  const totalCantServ = rankingFiltrado.reduce((a, r) => a + (r.cantidadServicios || 0), 0);
  const totalVentasServ = rankingFiltrado.reduce((a, r) => a + (r.ventasServicios || 0), 0);
  const totalCantProd = rankingFiltrado.reduce((a, r) => a + (r.cantidadProductos || 0), 0);
  const totalVentasProd = rankingFiltrado.reduce((a, r) => a + (r.ventasProductos || 0), 0);
  const totalGeneral = rankingFiltrado.reduce((a, r) => a + (r.totalVentas || 0), 0);

  return (
    <div style={{ marginBottom: 24 }}>
      
      <div
        style={{
          textAlign: "center",
          fontSize: 30,
          fontWeight: 800,
          marginBottom: 20,
        }}
      >
        DETALLE DE VENTAS TOTAL POR MES
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr className="bg-primary fs-3 text-white">
              <th style={thStyle}>Colaborador</th>
              <th style={thStyle}>Clientes</th>
              <th style={thStyle}>Cantidad <br/>Servicios</th>
              <th style={thStyle}>Ventas<br/> Servicios</th>
              <th style={thStyle}>Cantidad<br/>Productos</th>
              <th style={thStyle}>Ventas <br/> Productos</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rankingFiltrado.map((r, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick(r.empleado)}
                style={{ cursor: "pointer" }}
              >
                <td className="bg-primary text-white" style={tdStyle}>
                  {r.empleado.split(" ")[0]}
                </td>
                <td style={tdStyle}>{r.cantidadVentas}</td>
                <td style={tdStyle}>{r.cantidadServicios}</td>
                <td style={tdStyle}>
                  <NumberFormatMoney amount={r.ventasServicios} />
                </td>
                <td style={tdStyle}>{r.cantidadProductos}</td>
                <td style={tdStyle}>
                  <NumberFormatMoney amount={r.ventasProductos} />
                </td>
                <td className="bg-primary text-white" style={tdStyle}>
                  <NumberFormatMoney amount={r.totalVentas} />
                </td>
              </tr>
            ))}

            {/* === FILA DE TOTALES === */}
            <tr
              className="bg-primary text-white"
              style={{ fontWeight: 800, fontSize: 18 }}
            >
              <td style={tdStyle}>TOTAL</td>
              <td style={tdStyle}>{totalClientes}</td>
              <td style={tdStyle}>{totalCantServ}</td>
              <td style={tdStyle}>
                <NumberFormatMoney amount={totalVentasServ} />
              </td>
              <td style={tdStyle}>{totalCantProd}</td>
              <td style={tdStyle}>
                <NumberFormatMoney amount={totalVentasProd} />
              </td>
              <td style={tdStyle}>
                <NumberFormatMoney amount={totalGeneral} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}