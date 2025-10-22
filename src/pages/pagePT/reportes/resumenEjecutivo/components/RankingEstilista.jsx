
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { NumberFormatMoney } from "@/components/CurrencyMask";
import { useTerminoMetodoPagoStore } from "@/hooks/hookApi/FormaPagoStore/useTerminoMetodoPagoStore";
import { PTApi } from "@/common/api/";

const thStyle = { border: "1px solid #ccc", padding: "8px", textAlign: "center", fontWeight: "bold" };
const tdStyle = { border: "1px solid #ccc", padding: "8px", textAlign: "center", fontSize: "20px" };
const tdfinal ={fontSize:25,color:"white"};
const toKey = (s = "") => String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const methodKey = (s = "") => toKey(s).replace(/\s+/g, "_");
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;

// Corrige redondeos
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
  const candidates = [
    venta?.detalleVenta_pagoVenta,
    venta?.detalle_pagoVenta,
    venta?.tb_pago_ventas,
    venta?.pago_venta,
    venta?.detalle_pagos,
  ];
  const arr = candidates.find(Array.isArray) || [];
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

// Convierte fechas a Lima
function toLimaDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utcMs - 5 * 60 * 60000);
  } catch {
    return null;
  }
}

// Filtro por mes y día
function filtrarVentasPorMes(ventas = [], filtro, initialDayArg = 1, cutDayArg) {
  if (!filtro || !filtro.mes || !filtro.anio) return ventas;
  const mapa = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  };
  const monthIdx = mapa[String(filtro.mes).toLowerCase().trim()] ?? -1;
  const yearNum = Number(filtro.anio);
  if (monthIdx < 0 || !Number.isFinite(yearNum)) return ventas;
  const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
  const from = Math.max(1, Math.min(Number(filtro.fromDay ?? initialDayArg ?? 1), lastDay));
  const to = Math.max(from, Math.min(Number(filtro.toDay ?? cutDayArg ?? lastDay), lastDay));

  return ventas.filter((v) => {
    const d = toLimaDate(v?.fecha_venta ?? v?.createdAt ?? v?.fecha);
    return d && d.getFullYear() === yearNum && d.getMonth() === monthIdx && d.getDate() >= from && d.getDate() <= to;
  });
}

// Ranking de empleados
function rankingPorEmpleado(ventas = []) {
  const map = new Map();
  const ventasPorEmpleado = new Map();
  const getAcc = (empleado) => {
    if (!map.has(empleado)) {
      map.set(empleado, { empleado, totalVentas: 0, cantidadVentas: 0, ventasProductos: 0, cantidadProductos: 0, ventasServicios: 0, cantidadServicios: 0 });
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
const getServiceName = (it) =>
  it?.circus_servicio?.nombre_servicio ||
  it?.circus_servicio?.nombre_serv ||
  it?.tb_servicio?.nombre_servicio ||
  it?.tb_servicio?.nombre_serv ||
  it?.servicio?.nombre_servicio ||
  it?.servicio?.nombre_serv ||
  it?.nombre_servicio ||
  it?.nombre ||
  "—";

export const RankingEstilista = ({ dataVenta = [], filtrarFecha, initialDay = 1, cutDay }) => {
  const { obtenerFormaDePagosActivos } = useTerminoMetodoPagoStore();
  const [dataFormaPagoActivoVentas, setDataFormaPagoActivoVentas] = useState([]);
  const [dataFormaPagoParams, setDataFormaPagoParams] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await obtenerFormaDePagosActivos();
        setDataFormaPagoActivoVentas(resp?.data ?? resp ?? []);
      } catch (err) {
        console.error("Error cargando métodos activos", err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await PTApi.get("/parametros/get_params/formapago/formapago");
        setDataFormaPagoParams(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error cargando parámetros", err);
      }
    })();
  }, []);

  const ventasMes = useMemo(
    () =>
      Array.isArray(filtrarFecha)
        ? filtrarFecha.flatMap((f) => filtrarVentasPorMes(dataVenta, f, initialDay, cutDay))
        : filtrarVentasPorMes(dataVenta, filtrarFecha, initialDay, cutDay),
    [dataVenta, filtrarFecha, initialDay, cutDay]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState(null);

  function buildModalData(ventasEmpleado = []) {
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
      const productos = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos : [];
      const servicios = Array.isArray(v?.detalle_ventaservicios) ? v.detalle_ventaservicios : [];

      const pagosByMethod = getPagos(v).reduce((acc, p) => {
        const k = methodKey(p.label);
        if (k) acc[k] = (acc[k] || 0) + p.monto;
        return acc;
      }, {});

      for (const it of servicios) {
        const cantidad = Number(it?.cantidad ?? 1) || 0;
        const pVenta = Number(it?.tarifa_monto) || 0;
        const totalLinea = cantidad * pVenta;
        const lineaMetodos = repartirLineaPorMetodos(totalLinea, pagosByMethod, headerLabel);
        for (const [k, vmet] of Object.entries(lineaMetodos)) totalesMetodo[k] += Number(vmet) || 0;
     serviciosFlat.push({
 nombre: getServiceName(it),
  cantidad,
  pVenta,
  ...lineaMetodos,
});

      }

      for (const it of productos) {
        const cantidad = Number(it?.cantidad ?? 1) || 0;
        const precioVentaU = Number(it?.tarifa_monto) || Number(it?.tb_producto?.prec_venta) || 0;
        const precioCompraU = Number(it?.tb_producto?.prec_compra) || 0;
        productosFlat.push({
          nombre: it?.tb_producto?.nombre_producto || it?.nombre_producto || it?.nombre || "-",
          cantidad,
          precioVentaU,
          precioCompraU,
        });
      }
    }

    const totalPVentaServs = serviciosFlat.reduce((a, s) => a + (Number(s.pVenta) || 0) * (Number(s.cantidad) || 0), 0);
    const totalServCantidad = serviciosFlat.reduce((a, s) => a + (Number(s.cantidad) || 0), 0);
    const totalPVentaProd = productosFlat.reduce((a, p) => a + (Number(p.precioVentaU) || 0) * (Number(p.cantidad) || 0), 0);
    const totalCantidad = productosFlat.reduce((a, p) => a + (Number(p.cantidad) || 0), 0);

    const serviciosOrdenados = serviciosFlat.sort((a, b) => b.pVenta * b.cantidad - a.pVenta * a.cantidad);
    const productosAgrupados = productosFlat;

    const methodsToShow = Object.keys(headerLabel).sort((a, b) => (totalesMetodo[b] || 0) - (totalesMetodo[a] || 0));
    const RATE_IGV = 0.18, RATE_RENTA = 0.03, RATE_TARJ = 0.045;

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
      productosAgrupados,
      modalResumen,
    };
  }

  const handleRowClick = useCallback(
    (empleadoNombre) => {
      const ventasEmpleado = ventasMes.filter((v) => {
        const matchServ = (v?.detalle_ventaservicios || []).some(
          (it) => it?.empleado_servicio?.nombres_apellidos_empl === empleadoNombre
        );
        const matchProd = (v?.detalle_ventaProductos || []).some(
          (it) => it?.empleado_producto?.nombres_apellidos_empl === empleadoNombre
        );
        return matchServ || matchProd;
      });

      const data = buildModalData(ventasEmpleado);
setModalTitle(`VENTAS — ${empleadoNombre.split(" ")[0]} — AL DÍA DE CORTE ${cutDay}`);
      setModalData(data);
      setModalOpen(true);
    },
    [ventasMes]
  );

  return (
    <>
      <TablaRanking titulo="" ventas={ventasMes} onRowClick={handleRowClick} />
      <Dialog
header={
  <div
    style={{
      textAlign: "center",
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    }}
  >
    {modalTitle || "VENTAS"}
  </div>
}
        visible={modalOpen}
        style={{ width: "100vw", maxWidth: "1400px", margin: "0 auto" }}
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
        {!modalData ? <div>Sin ventas para esta selección.</div> : <RankingDialogContent modalData={modalData} modalTitle={`VENTAS — AL DÍA DE CORTE — ${modalTitle.split("—")[1] || ""}`} />
}
      </Dialog>
    </>
  );
};


function RankingDialogContent({ modalData }) {
  const th = { fontSize: 20, textAlign: "center" };

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
                <div style={{ fontSize: 15, opacity: 0.7 }}>{item.label}</div>
                <div style={{ fontWeight: 800, fontSize: 25 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === Totales por método === */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, margin: "20px 0" }}>
        {modalData.methodsToShow.map((m) => (
          <div key={m} style={{ border: "2px solid #d4af37", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 15, opacity: 0.7 }}>{modalData.headerLabel[m] || m}</div>
            <div style={{ fontWeight: 800, fontSize: 25 }}>
              <NumberFormatMoney amount={modalData.totalPorMetodo?.[m] || 0} />
            </div>
          </div>
        ))}
      </div>

      {/* === Resumen servicios === */}
      {modalData.modalResumen && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 900, textAlign: "center", fontSize: 25 }}>
            VENTAS POR SERVICIOS
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 20, textAlign: "center" }}>
            <thead className="bg-primary text-white">
              <tr>
                <th>Venta Bruta</th>
                <th>IGV (-18%)</th>
                <th>Renta (-3%)</th>
                <th>Tarjeta (-4.5%)</th>
                <th>Ingreso Neto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><NumberFormatMoney amount={modalData.modalResumen.bruto} /></td>
                <td style={{ color: "red" }}>- <NumberFormatMoney amount={modalData.modalResumen.igv} /></td>
                <td style={{ color: "red" }}>- <NumberFormatMoney amount={modalData.modalResumen.renta} /></td>
                <td style={{ color: "red" }}>- <NumberFormatMoney amount={modalData.modalResumen.tarjeta} /></td>
                <td style={{ color: "#007b00", fontWeight: 700 }}>
                  <NumberFormatMoney amount={modalData.modalResumen.neto} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* === Detalle servicios === */}
  <div style={{ marginTop: 32 }}>
  <div style={{ fontWeight: 700, textAlign: "center", fontSize: 24, marginBottom: 10 }}>
    DETALLE DE SERVICIOS
  </div>

  <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
    <thead className="bg-primary text-white">
      <tr>
        <th style={{ ...th, width: "60px", minWidth: "60px", maxWidth: "60px" }}>Item</th>
        <th style={{ ...th, textAlign: "left" }}>Servicio</th>
        <th style={th}>Precio Unitario</th>
        <th style={th}>Venta Total</th>
        {modalData.methodsToShow.map((m) => (
          <th key={m} style={th}>{modalData.headerLabel[m] || m}</th>
        ))}
      </tr>
    </thead>

    <tbody>
      {modalData.serviciosOrdenados.map((s, i) => {
        const totalLinea = (s.pVenta || 0) * (s.cantidad || 0);
        return (
          <tr key={i} style={i % 2 ? { background: "#fcfcfc" } : null}>
            <td style={{ ...th }}>{i + 1}</td>
           <td style={{ ...th, textAlign: "left", fontWeight: 700, whiteSpace: "normal", wordWrap: "break-word" }}>
  {s.nombre || s.circus_servicio?.nombre_servicio || "—"}
</td>

            <td style={{ ...th }}>
              <NumberFormatMoney amount={s.pVenta || 0} />
            </td>
            <td style={{ ...th }}>
              <NumberFormatMoney amount={totalLinea} />
            </td>
            {modalData.methodsToShow.map((m) => (
              <td key={m} style={{ ...th }}>
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

        const totalVenta = servicios.reduce(
          (acc, s) => acc + (s.pVenta || 0) * (s.cantidad || 0),
          0
        );

        return (
          <tr className="bg-primary text-white" style={{ fontWeight: 700 }}>
            <td style={{ textAlign: "center",fontSize:19 }}>TOTAL</td>
                        <td style={{...tdfinal, textAlign: "center" }}>—</td>

            <td style={{...tdfinal, textAlign: "center" }}></td>
            <td style={{ ...tdfinal,textAlign: "center" }}>
              <NumberFormatMoney amount={totalVenta} />
            </td>
            {modalData.methodsToShow.map((m) => (
              <td key={m} style={{...tdfinal, textAlign: "center" }}>
                {totales[m] > promedios[m] ? (
                  <NumberFormatMoney amount={totales[m]} />
                ) : (
                  "—"
                )}
              </td>
            ))}
          </tr>
        );
      })()}
    </tbody>
  </table>
</div>

{/* === PRODUCTOS VENDIDOS === */}
<div style={{ marginTop: 40 }}>
  <div style={{ fontWeight: 700, textAlign: "center", fontSize: 24 }}>
    PRODUCTOS VENDIDOS
  </div>

  <table
    style={{
      borderCollapse: "collapse",
      width: "100%",
      tableLayout: "fixed",
      fontSize: 18,
    }}
  >
    <thead>
      <tr className="bg-primary text-white">
        <th style={{ ...th, width: "60px", minWidth: "60px", textAlign: "center" }}>Item</th>
        <th style={{ ...th, textAlign: "left" }}>Producto</th>
        <th style={th}>Cantidad</th>
        <th style={th}>Precio Unitario</th>
        <th style={th}>Precio Venta</th>
        <th style={th}>IGV (-18%)</th>
        <th style={th}>Tarjeta (-4.5%)</th>
        <th style={th}>Renta (-3%)</th>
        <th style={th}>Costo Compra</th>
        <th style={th}>Utilidad Bruta</th>
        <th style={th}>Comisión</th>
        <th style={th}>Utilidad Neta</th>
      </tr>
    </thead>

    <tbody>
      {modalData.productosAgrupados.length === 0 ? (
        <tr>
          <td colSpan={12} style={{ textAlign: "center", padding: 10 }}>
            No se vendieron productos.
          </td>
        </tr>
      ) : (
        <>
          {(() => {
            const RATE_IGV = 0.18;
            const RATE_TARJETA = 0.045;
            const RATE_RENTA = 0.03;
            const RATE_COMISION = 0.10; // ajusta si manejas otro porcentaje

            return modalData.productosAgrupados.map((p, i) => {
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
                  <td
                    style={{
                      textAlign: "center",
                      fontWeight: 600,
                      background: "var(--bs-primary)",
                      color: "white",
                    }}
                  >
                    {i + 1}
                  </td>

                  {/* PRODUCTO */}
                  <td
                    style={{
                      textAlign: "left",
                      fontWeight: 700,
                      padding: "8px 12px",
                      whiteSpace: "normal",
                      wordWrap: "break-word",
                      maxWidth: 350,
                    }}
                  >
                    {p.nombre}
                  </td>

                  <td style={{ textAlign: "center" }}>{p.cantidad}</td>

                  <td style={{ textAlign: "center" }}>
                    <NumberFormatMoney amount={p.precioVentaU || 0} />
                  </td>

                  <td style={{ textAlign: "center", fontWeight: 600, color: "#007b00" }}>
                    <NumberFormatMoney amount={venta} />
                  </td>

                  <td style={{ textAlign: "center", color: "red" }}>
                    <NumberFormatMoney amount={igv} />
                  </td>

                  <td style={{ textAlign: "center", color: "red" }}>
                    <NumberFormatMoney amount={tarjeta} />
                  </td>

                  <td style={{ textAlign: "center", color: "red" }}>
                    <NumberFormatMoney amount={renta} />
                  </td>

                  <td style={{ textAlign: "center", color: "red" }}>
                    <NumberFormatMoney amount={compra} />
                  </td>

                  <td style={{ textAlign: "center", fontWeight: 600, color: "green" }}>
                    <NumberFormatMoney amount={utilBruta} />
                  </td>

                  <td style={{ textAlign: "center", color: "red" }}>
                    <NumberFormatMoney amount={comision} />
                  </td>

                  <td
                    style={{
                      textAlign: "center",
                      fontWeight: 700,
                      color: utilNeta >= 0 ? "#007b00" : "red",
                    }}
                  >
                    <NumberFormatMoney amount={utilNeta} />
                  </td>
                </tr>
              );
            });
          })()}

          {/* === FILA DE TOTALES === */}
          {(() => {
            const RATE_IGV = 0.18;
            const RATE_TARJETA = 0.045;
            const RATE_RENTA = 0.03;
            const RATE_COMISION = 0.10;

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
              <tr className="bg-primary text-white" style={{ fontWeight: 900 }}>
                <td></td>
                <td style={{ textAlign: "left" }}>TOTALES</td>
                <td style={{ textAlign: "center" }}>{totalCantidad}</td>
                <td></td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalVenta} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalIGV} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalTarjeta} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalRenta} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalCompra} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalUtilBruta} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalComision} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <NumberFormatMoney amount={totalUtilNeta} />
                </td>
              </tr>
            );
          })()}
        </>
      )}
    </tbody>
  </table>
</div>


    </>
  );
}


function TablaRanking({ ventas, onRowClick }) {
  const ranking = useMemo(() => rankingPorEmpleado(ventas), [ventas]);

  // Calcular totales generales
  const totalClientes = ranking.reduce((acc, r) => acc + (r.cantidadVentas || 0), 0);
  const totalCantServ = ranking.reduce((acc, r) => acc + (r.cantidadServicios || 0), 0);
  const totalVentasServ = ranking.reduce((acc, r) => acc + (r.ventasServicios || 0), 0);
  const totalCantProd = ranking.reduce((acc, r) => acc + (r.cantidadProductos || 0), 0);
  const totalVentasProd = ranking.reduce((acc, r) => acc + (r.ventasProductos || 0), 0);
  const totalGeneral = ranking.reduce((acc, r) => acc + (r.totalVentas || 0), 0);

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
              <th style={thStyle}>Cant. Serv.</th>
              <th style={thStyle}>Ventas Serv.</th>
              <th style={thStyle}>Cant. Prod.</th>
              <th style={thStyle}>Ventas Prod.</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, idx) => (
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