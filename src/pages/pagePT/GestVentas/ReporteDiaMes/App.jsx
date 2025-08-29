import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isoWeek from 'dayjs/plugin/isoWeek';
import minMax from "dayjs/plugin/minMax";
dayjs.extend(minMax);
dayjs.extend(utc);
dayjs.extend(isoWeek);

const DAYS = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
const fmtMoney = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(Number(n || 0));

export const App = () => {
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    obtenerTablaVentas(599);
  }, []);

  // Mapa diario: YYYY-MM-DD -> métricas
  const dailyMap = useMemo(() => {
    const acc = new Map();
    if (!Array.isArray(dataVentas)) return acc;

    for (const v of dataVentas) {
      // 👉 convertir fecha a hora Lima (-05:00)
      const fechaLima = dayjs.utc(v?.fecha_venta).subtract(5, 'hour');
      const dkey = fechaLima.format('YYYY-MM-DD');

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

      // Comprobantes
      ref.cantidadComprobantes += 1;
    }
    return acc;
  }, [dataVentas]);

  // Calcular rango desde/hasta (también restando -5h)
  const { startMonday, endSunday } = useMemo(() => {
    const fechas = Array.isArray(dataVentas)
      ? dataVentas.map(v => dayjs.utc(v.fecha_venta).subtract(5, 'hour'))
      : [];

    const minData = fechas.length ? dayjs.min(fechas) : dayjs.utc();
    const maxData = fechas.length ? dayjs.max(fechas) : dayjs.utc();

    const minUtc = desde ? dayjs.utc(desde).startOf('day') : minData.startOf('day');
    const maxUtc = hasta ? dayjs.utc(hasta).endOf('day') : maxData.endOf('day');

    const startMonday = minUtc.startOf('isoWeek'); // lunes
    const endSunday = maxUtc.endOf('isoWeek'); // domingo
    return { startMonday, endSunday };
  }, [dataVentas, desde, hasta]);

  // Generar semanas completas LUN→DOM
  const weeks = useMemo(() => {
    const days = [];
    let cursor = startMonday.clone();
    while (cursor.isSame(endSunday) || cursor.isBefore(endSunday)) {
      days.push(cursor.clone());
      cursor = cursor.add(1, 'day');
    }
    const rows = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [startMonday, endSunday]);

  return (
    <div>
      <div className="row g-2 mb-3">
        <div className="col">
          <label>DESDE</label>
          <input type="date" className="form-control" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="col">
          <label>HASTA</label>
          <input type="date" className="form-control" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
      </div>

      <div style={{ maxHeight: 520, overflow: 'auto', border: '1px solid #eee', borderRadius: 12 }}>
        <div
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
          {DAYS.map(d => (
            <div key={d} className="py-2 px-3 text-center fw-semibold" style={{ borderRight: '1px solid #f1f1f1' }}>
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div
            key={`w-${wi}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(200px, 1fr))',
              borderBottom: '1px solid #f6f6f6',
            }}
          >
            {week.map((d) => {
              const dkey = d.format('YYYY-MM-DD');
              const metrics = dailyMap.get(dkey) || {
                ventasProductos: 0,
                cantidadProductos: 0,
                ventasServicios: 0,
                cantidadServicios: 0,
                cantidadComprobantes: 0,
              };
              const tituloDia = d.locale('es').format('D [de] MMMM YYYY');
              return (
                <div key={dkey} style={{ padding: 12, borderRight: '1px solid #f6f6f6' }}>
                  <div className="fw-bold mb-2">{tituloDia}</div>
                  <ul style={{ fontSize: 13, lineHeight: 1.4 }}>
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
