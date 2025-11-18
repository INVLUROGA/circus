import React, { useMemo, useState, useCallback, useEffect } from "react";
import { Button } from "primereact/button";
import { NumberFormatMoney } from "@/components/CurrencyMask";
import { useTerminoMetodoPagoStore } from "@/hooks/hookApi/FormaPagoStore/useTerminoMetodoPagoStore";
import  RankingDialog  from "./dialogs/RankingDialog";

// Helpers
const thStyle = { border: "1px solid #ccc", padding: "8px", textAlign: "center", fontWeight: "bold" };
const tdStyle = { border: "1px solid #ccc", padding: "8px", textAlign: "center", fontSize: "20px" };
const toKey = (s = "") => String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
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
  const arr = venta?.detalleVenta_pagoVenta || venta?.detalle_pagoVenta || venta?.tb_pago_ventas || venta?.pago_venta || venta?.detalle_pagos || [];
  return arr.map((p) => ({
    label: p?.parametro_forma_pago?.label_param ?? p?.parametro_forma_pago?.nombre ?? p?.forma ?? p?.id_forma_pago ?? "",
    monto: Number(p?.parcial_monto ?? p?.monto ?? p?.monto_pago ?? p?.importe ?? p?.monto_detalle) || 0,
  }));
};
function toLimaDate(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utcMs - 5 * 60 * 60000);
  } catch { return null; }
}
function filtrarVentasPorMes(ventas = [], filtro, initDay = 1, cutDay) {
  if (!filtro || !filtro.mes || !filtro.anio) return ventas;
  const mapa = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 };
  const m = mapa[String(filtro.mes).toLowerCase()];
  if (m == null) return ventas;
  const y = Number(filtro.anio);
  const last = new Date(y, m + 1, 0).getDate();
  const from = Math.max(1, Math.min(initDay, last));
  const to = Math.max(from, Math.min(cutDay || last, last));
  const inRangeLocal = (iso) => {
    if (!iso) return false;
    const d = toLimaDate(iso);
    if (!d) return false;
    return d.getFullYear() === y && d.getMonth() === m && d.getDate() >= from && d.getDate() <= to;
  };
  return ventas.filter((v) => {
    const fecha = v?.fecha_venta ?? v?.fecha ?? null;
    return inRangeLocal(fecha);
  });
}
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

export const RankingEstilista = ({ dataVenta = [], filtrarFecha, initialDay = 1, cutDay }) => {
  const [q, setQ] = useState("");
  const { obtenerFormaDePagosActivos } = useTerminoMetodoPagoStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalData, setModalData] = useState(null);
  const [modalCostoServicios, setModalCostoServicios] = useState(0);

  useEffect(() => {
    obtenerFormaDePagosActivos().catch((err) => console.error("Error cargando métodos activos", err));
  }, []);

  const canon = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

  const ventasMes = useMemo(() => {
    if (Array.isArray(filtrarFecha)) {
      return filtrarFecha.flatMap((f) => filtrarVentasPorMes(dataVenta, f, initialDay, cutDay));
    }
    return filtrarVentasPorMes(dataVenta, filtrarFecha, initialDay, cutDay);
  }, [dataVenta, filtrarFecha, initialDay, cutDay]);

  function buildModalData(ventasEmpleado = [], empleadoKey) {
    const headerLabel = {};
    let totalCostoServiciosCalc = 0; // Acumulador para el costo de servicios

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
      const productos = Array.isArray(v?.detalle_ventaProductos) ? v.detalle_ventaProductos : Array.isArray(v?.detalle_ventaproductos) ? v.detalle_ventaproductos : [];

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

        // === CÁLCULO DE COSTO DE SERVICIO ===
        // Verificamos múltiples propiedades donde podría estar el precio de compra
        const costoUnit = Number(s?.circus_servicio?.precio_compra) || 
                          Number(s?.tb_servicio?.precio_compra) || 
                          Number(s?.costo) || 0;
        totalCostoServiciosCalc += (cantidad * costoUnit);
        // ======================================

        const totalLinea = cantidad * pVenta;
        const lineaMetodos = repartirLineaPorMetodos(totalLinea, pagosByMethod, headerLabel);
        for (const [k, vmet] of Object.entries(lineaMetodos)) totalesMetodo[k] += Number(vmet) || 0;
        serviciosFlat.push({
          nombre: s?.circus_servicio?.nombre_servicio || s?.tb_servicio?.nombre_servicio || s?.nombre_servicio || s?.nombre || "—",
          cantidad,
          pVenta,
          ...lineaMetodos,
        });
      }

      for (const p of productos) {
        const cantidad = Number(p?.cantidad ?? 1) || 1;
        const precioVentaU = Number(p?.tarifa_monto) || Number(p?.tb_producto?.prec_venta) || 0;
        const precioCompraU = Number(p?.tb_producto?.prec_compra) || 0;
        const nombre = p?.tb_producto?.nombre_producto || p?.nombre_producto || p?.nombre || "-";
        const totalLinea = precioVentaU * cantidad;
        const lineaMetodos = repartirLineaPorMetodos(totalLinea, pagosByMethod, headerLabel);
        for (const [k, vmet] of Object.entries(lineaMetodos)) {
          totalesMetodo[k] += Number(vmet) || 0;
        }
        productosFlat.push({ nombre, cantidad, precioVentaU, precioCompraU });
      }
    }

    const productosAgrupados = Object.values(productosFlat.reduce((acc, p) => {
        const key = `${p.nombre}-${p.metodo}-${p.precioVentaU}`;
        if (!acc[key]) acc[key] = { ...p, cantidad: 0 };
        acc[key].cantidad += Number(p.cantidad) || 0;
        return acc;
      }, {}));

    const serviciosAgrupados = Object.values(serviciosFlat.reduce((acc, s) => {
        const key = `${s.nombre}-${s.pVenta}`;
        if (!acc[key]) {
          acc[key] = { nombre: s.nombre, cantidad: 0, pVenta: s.pVenta, ...Object.fromEntries(Object.keys(headerLabel).map((k) => [k, 0])) };
        }
        acc[key].cantidad += s.cantidad;
        for (const k of Object.keys(headerLabel)) acc[key][k] += Number(s[k]) || 0;
        return acc;
      }, {}));

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

    const totalPVentaServs = serviciosOrdenados.reduce((a, s) => a + s.pVenta * s.cantidad, 0);
    const totalServCantidad = serviciosOrdenados.reduce((a, s) => a + s.cantidad, 0);
    const totalPVentaProd = productosOrdenados.reduce((a, p) => a + p.precioVentaU * p.cantidad, 0);
    const totalCantidad = productosOrdenados.reduce((a, p) => a + p.cantidad, 0);
    const RATE_IGV = 0.18, RATE_RENTA = 0.03, RATE_TARJ = 0.045;
    const methodsToShow = Object.keys(headerLabel).sort((a, b) => (totalesMetodo[b] || 0) - (totalesMetodo[a] || 0));
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
      totalCostoServicios: totalCostoServiciosCalc, // Devolvemos el costo
    };
  }

  const handleRowClick = useCallback((empleadoNombre) => {
      const key = canon(empleadoNombre);
      const ventasEmpleado = ventasMes.filter((v) => {
        const matchServ = (v?.detalle_ventaservicios || []).some((it) => canon(it?.empleado_servicio?.nombres_apellidos_empl) === key);
        const matchProd = (v?.detalle_ventaProductos || []).some((it) => canon(it?.empleado_producto?.nombres_apellidos_empl) === key);
        return matchServ || matchProd;
      });

      const data = buildModalData(ventasEmpleado, key);
      setModalTitle(`VENTAS — ${empleadoNombre.split(" ")[0]} — AL DÍA ${cutDay}`);
      setModalData(data);
      // Actualizamos el estado con el costo que calculamos
      setModalCostoServicios(data.totalCostoServicios); 
      setModalOpen(true);
    }, [ventasMes, cutDay]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar colaborador..." className="p-inputtext p-component" style={{ minWidth: 260, padding: 8 }} aria-label="Buscar colaborador" />
        {q && <Button label="Limpiar" onClick={() => setQ("")} severity="secondary" outlined />}
      </div>
      <TablaRanking ventas={ventasMes} onRowClick={handleRowClick} filtroNombre={q} />
      <RankingDialog 
        visible={modalOpen} 
        onHide={() => setModalOpen(false)} 
        title={modalTitle} 
        data={modalData} 
        totalCostoServicios={modalCostoServicios} // Pasamos el costo al dialog
      />
    </>
  );
};

function TablaRanking({ ventas, onRowClick, filtroNombre = "" }) {
  const ranking = useMemo(() => rankingPorEmpleado(ventas), [ventas]);
  const norm = (s = "") => String(s).normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
  const rankingFiltrado = useMemo(() => {
    if (!filtroNombre) return ranking;
    const q = norm(filtroNombre);
    return ranking.filter((r) => norm(r.empleado).includes(q));
  }, [ranking, filtroNombre]);

  const totalClientes = rankingFiltrado.reduce((a, r) => a + (r.cantidadVentas || 0), 0);
  const totalCantServ = rankingFiltrado.reduce((a, r) => a + (r.cantidadServicios || 0), 0);
  const totalVentasServ = rankingFiltrado.reduce((a, r) => a + (r.ventasServicios || 0), 0);
  const totalCantProd = rankingFiltrado.reduce((a, r) => a + (r.cantidadProductos || 0), 0);
  const totalVentasProd = rankingFiltrado.reduce((a, r) => a + (r.ventasProductos || 0), 0);
  const totalGeneral = rankingFiltrado.reduce((a, r) => a + (r.totalVentas || 0), 0);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", fontSize: 30, fontWeight: 800, marginBottom: 20 }}>DETALLE DE VENTAS TOTAL POR MES</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr className="bg-primary fs-3 text-white">
              <th style={thStyle}>Colaborador</th>
              <th style={thStyle}>Clientes</th>
              <th style={thStyle}>Cantidad <br />Servicios</th>
              <th style={thStyle}>Ventas<br /> Servicios</th>
              <th style={thStyle}>Cantidad<br />Productos</th>
              <th style={thStyle}>Ventas <br /> Productos</th>
              <th style={thStyle}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rankingFiltrado.map((r, idx) => (
              <tr key={idx} onClick={() => onRowClick(r.empleado)} style={{ cursor: "pointer" }}>
                <td className="bg-primary text-white" style={tdStyle}>{r.empleado.split(" ")[0]}</td>
                <td style={tdStyle}>{r.cantidadVentas}</td>
                <td style={tdStyle}>{r.cantidadServicios}</td>
                <td style={tdStyle}><NumberFormatMoney amount={r.ventasServicios} /></td>
                <td style={tdStyle}>{r.cantidadProductos}</td>
                <td style={tdStyle}><NumberFormatMoney amount={r.ventasProductos} /></td>
                <td className="bg-primary text-white" style={tdStyle}><NumberFormatMoney amount={r.totalVentas} /></td>
              </tr>
            ))}
            <tr className="bg-primary text-white" style={{ fontWeight: 800, fontSize: 18 }}>
              <td style={tdStyle}>TOTAL</td>
              <td style={tdStyle}>{totalClientes}</td>
              <td style={tdStyle}>{totalCantServ}</td>
              <td style={tdStyle}><NumberFormatMoney amount={totalVentasServ} /></td>
              <td style={tdStyle}>{totalCantProd}</td>
              <td style={tdStyle}><NumberFormatMoney amount={totalVentasProd} /></td>
              <td style={tdStyle}><NumberFormatMoney amount={totalGeneral} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}