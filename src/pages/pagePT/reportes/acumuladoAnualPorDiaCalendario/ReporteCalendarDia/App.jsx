import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(utc);
dayjs.extend(isoWeek);

// Orden LUN-DOM
const DAYS = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(Number(n || 0));

export const App = () => {
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const [desde, setDesde] = useState(''); // YYYY-MM-DD
  const [hasta, setHasta] = useState(''); // YYYY-MM-DD

  useEffect(() => {
    obtenerTablaVentas(599);
  }, []);

  // 1) Mapa diario rápido: "YYYY-MM-DD" -> { métricas }
  const dailyMap = useMemo(() => {
    const acc = new Map();

    if (!Array.isArray(dataVentas)) return acc;

    for (const v of dataVentas) {
      const dkey = dayjs.utc(v?.fecha_venta).format('YYYY-MM-DD');
      if (!acc.has(dkey)) {
        acc.set(dkey, {
          ventasProductos: 0,
          cantidadProductos: 0,
          ventasServicios: 0,
          cantidadServicios: 0,
          cantidadComprobantes: 0,
        });
      }
      const ref = acc.get(dkey);

      // Productos
      if (Array.isArray(v.detalle_ventaProductos)) {
        for (const p of v.detalle_ventaProductos) {
          ref.ventasProductos += Number(p?.tarifa_monto ?? 0) || 0;
          ref.cantidadProductos += Number(p?.cantidad ?? 0) || 0;
        }
      }
      // Servicios
      if (Array.isArray(v.detalle_ventaservicios)) {
        for (const s of v.detalle_ventaservicios) {
          ref.ventasServicios += Number(s?.tarifa_monto ?? 0) || 0;
          ref.cantidadServicios += Number(s?.cantidad ?? 0) || 0;
        }
      }
      // Comprobantes (1 por venta)
      ref.cantidadComprobantes += 1;
    }

    return acc;
  }, [dataVentas]);

  // 2) Rango efectivo (si no eliges fechas, usa min/max de los datos)
  const { startMonday, endSunday } = useMemo(() => {
    const dates = Array.isArray(dataVentas)
      ? dataVentas.map(v => v?.fecha_venta).filter(Boolean)
      : [];

    const minData = dates.length
      ? dayjs.utc(dates.reduce((a, b) => (dayjs.utc(a).isBefore(b) ? a : b))).startOf('day')
      : (desde ? dayjs.utc(desde).startOf('day') : dayjs.utc().startOf('isoWeek')); // fallback: semana actual

    const maxData = dates.length
      ? dayjs.utc(dates.reduce((a, b) => (dayjs.utc(a).isAfter(b) ? a : b))).endOf('day')
      : (hasta ? dayjs.utc(hasta).endOf('day') : dayjs.utc().endOf('isoWeek')); // fallback

    const minUtc = desde ? dayjs.utc(desde).startOf('day') : minData;
    const maxUtc = hasta ? dayjs.utc(hasta).endOf('day') : maxData;

    // Alinear a semanas ISO (Lunes inicio, Domingo fin)
    const startMonday = minUtc.startOf('isoWeek'); // Lunes
    const endSunday = maxUtc.endOf('isoWeek');     // Domingo

    return { startMonday, endSunday };
  }, [dataVentas, desde, hasta]);

  // 3) Construir matriz de semanas (cada fila = 7 días LUN→DOM)
  const weeks = useMemo(() => {
    const days = [];
    let cursor = startMonday.clone();
    while (cursor.isSame(endSunday) || cursor.isBefore(endSunday)) {
      days.push(cursor.clone());
      cursor = cursor.add(1, 'day');
    }
    // chunk de 7
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [startMonday, endSunday]);

  // 4) Título del rango (bonito)
  const tituloRango = useMemo(() => {
    const fmt = (d) =>
      d.locale('es').format("D [de] MMMM [de] YYYY"); // ej: 13 de agosto de 2025
    return `${fmt(startMonday)} — ${fmt(endSunday)}`;
  }, [startMonday, endSunday]);

  return (
    <div>
      {/* Filtros de fecha */}
      <div className="row g-2 mb-3">
        {/* <div className="col">
          <label>DESDE</label>
          <input
            type="date"
            className="form-control"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="col">
          <label>HASTA</label>
          <input
            type="date"
            className="form-control"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div> */}
      </div>

      {/* Título del rango */}
      <div className="card mb-2">
        <div className="card-body fw-bold">
          {tituloRango}
        </div>
      </div>

      {/* Contenedor scroll + header sticky */}
      <div
        className="mini-cal-container"
        style={{
          maxHeight: 520,
          overflow: 'auto',
          border: '1px solid #eee',
          borderRadius: 12,
        }}
      >
        {/* Header (sticky) */}
        <div
          className="mini-cal-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            background: '#fff',
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(200px, 1fr))',
            borderBottom: '1px solid #ddd',
          }}
        >
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-2 px-3 text-center fw-semibold"
              style={{ borderRight: '1px solid #f1f1f1' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Celdas por semana */}
        {weeks.map((week, wi) => (
          <div
            key={`w-${wi}`}
            className="mini-cal-row"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(200px, 1fr))',
              borderBottom: '1px solid #f6f6f6',
            }}
          >
            {week.map((d) => {
              const key = d.utc().format('YYYY-MM-DD');
              const metrics = dailyMap.get(key) || {
                ventasProductos: 0,
                cantidadProductos: 0,
                ventasServicios: 0,
                cantidadServicios: 0,
                cantidadComprobantes: 0,
              };
              const tituloDia = d.locale('es').format('D [de] MMMM [de] YYYY'); // ej: 13 de agosto de 2025
              return (
                <div
                  key={key}
                  className="mini-cal-cell"
                  style={{
                    padding: 12,
                    borderRight: '1px solid #f6f6f6',
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span
                      className="badge text-bg-light"
                      title={tituloDia}
                      style={{ fontWeight: 600 }}
                    >
                      {tituloDia}
                    </span>
                  </div>
                  <ul className="mb-0" style={{ fontSize: 13, lineHeight: 1.4 }}>
                    <li>Ventas productos: {fmtMoney(metrics.ventasProductos)}</li>
                    <li>Cant. productos: {metrics.cantidadProductos}</li>
                    <li>Ventas servicios: {fmtMoney(metrics.ventasServicios)}</li>
                    <li>Cant. servicios: {metrics.cantidadServicios}</li>
                    <li>Comprobantes: {metrics.cantidadComprobantes}</li>
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
