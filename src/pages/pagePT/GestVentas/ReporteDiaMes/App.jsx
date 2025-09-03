import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import React, { useEffect, useMemo, useState } from 'react';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';
import minMax from 'dayjs/plugin/minMax';
import 'dayjs/locale/es';

import { useCalendarDia } from './useCalendarDia';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(minMax);

// Todo en Lima
dayjs.tz.setDefault('America/Lima');

const DAYS = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
const fmtMoney = (n) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 })
    .format(Number(n || 0));

export const App = () => {
  const { obtenerTablaVentas, dataVentas } = useVentasStore();
  const { dataClientes = [], obtenerClientes } = useCalendarDia();

  const [desde, setDesde] = useState(''); // 'YYYY-MM-DD'
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    obtenerTablaVentas(599);
    obtenerClientes();
  }, []);

  // --- Ventas por día (clave Lima YYYY-MM-DD)
  const dailyMap = useMemo(() => {
    const acc = new Map();
    if (!Array.isArray(dataVentas)) return acc;

    for (const v of dataVentas) {
      const dkey = dayjs.utc(v?.fecha_venta).tz().format('YYYY-MM-DD');

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

      if (Array.isArray(v?.detalle_ventaProductos)) {
        for (const p of v.detalle_ventaProductos) {
          ref.ventasProductos  += Number(p?.tarifa_monto) || 0;
          ref.cantidadProductos += Number(p?.cantidad) || 0;
        }
      }
      if (Array.isArray(v?.detalle_ventaservicios)) {
        for (const s of v.detalle_ventaservicios) {
          ref.ventasServicios  += Number(s?.tarifa_monto) || 0;
          ref.cantidadServicios += Number(s?.cantidad) || 0;
        }
      }
      ref.cantidadComprobantes += 1;
    }
    return acc;
  }, [dataVentas]);

  // --- Canjes por día (excluye tipoCli_cli === 84)
  const canjesMap = useMemo(() => {
    const map = new Map();
    const base = Array.isArray(dataClientes) ? dataClientes.filter(c => c?.tipoCli_cli !== 84) : [];
    for (const c of base) {
      const key = dayjs.utc(c?.createdAt).tz().format('YYYY-MM-DD');
      const arr = map.get(key) || [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [dataClientes]);

  // --- Rango (en Lima) para acotar meses a mostrar
  const { startMonday, endSunday } = useMemo(() => {
    const fechas = Array.isArray(dataVentas)
      ? dataVentas.map(v => dayjs.utc(v?.fecha_venta).tz())
      : [];

    const minData = fechas.length ? dayjs.min(fechas) : dayjs().tz();
    const maxData = fechas.length ? dayjs.max(fechas) : dayjs().tz();

    const minLocal = desde ? dayjs.tz(desde, 'America/Lima').startOf('day') : minData.startOf('day');
    const maxLocal = hasta ? dayjs.tz(hasta, 'America/Lima').endOf('day')   : maxData.endOf('day');

    return {
      startMonday: minLocal.startOf('isoWeek'),
      endSunday:   maxLocal.endOf('isoWeek'),
    };
  }, [dataVentas, desde, hasta]);

  // --- Secciones por mes: { monthId, monthTitle, monthMoment, weeks[][] }
  const monthSections = useMemo(() => {
    const sections = [];
    let mCursor = startMonday.startOf('month');
    const mLast   = endSunday.startOf('month');

    while (!mCursor.isAfter(mLast, 'month')) {
      const monthId = mCursor.format('YYYY-MM');
      const monthTitle = mCursor.locale('es').format('MMMM YYYY').toUpperCase();

      const monthStart = mCursor.startOf('month').startOf('isoWeek');
      const monthEnd   = mCursor.endOf('month').endOf('isoWeek');

      const days = [];
      let d = monthStart.clone();
      while (d.isBefore(monthEnd) || d.isSame(monthEnd, 'day')) {
        days.push(d);
        d = d.add(1, 'day');
      }
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

      sections.push({ monthId, monthTitle, monthMoment: mCursor.clone(), weeks });
      mCursor = mCursor.add(1, 'month');
    }
    return sections;
  }, [startMonday, endSunday]);

  return (
    <div>
      {/* Filtros */}
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

      {/* Calendario con header sticky */}
      <div style={{ maxHeight: 520, overflow: 'auto', border: '1px solid #eee', borderRadius: 12 }}>
        {/* Cabecera (sticky) */}
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
            <div key={d} className="py-2 px-3 text-center fw-semibold bg-primary fs-2" style={{ borderRight: '1px solid #f1f1f1' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Secciones por mes */}
        {monthSections.map(section => (
          <div key={section.monthId} style={{ padding: '12px 8px 32px' }}>
            {/* Título del mes */}
            <div className="fs-1 fw-bold text-primary mb-3 text-center" style={{ letterSpacing: 1 }}>
              {section.monthTitle}
            </div>

            {/* Semanas del mes */}
            {section.weeks.map((week, wi) => {
                // 🔶 Semana parcial si alguno de sus días NO pertenece al mes de la sección
              const isPartialWeek = week.some(d => !d.isSame(section.monthMoment, 'month'));
              return (
                <div
                  key={`${section.monthId}-w${wi}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(200px, 1fr))',
                    borderBottom: '1px solid #f6f6f6',
                  }}
                >
                  {week.map((d) => {
                                const dkey = d.format('YYYY-MM-DD');
                        const isOutside = !d.isSame(section.monthMoment, 'month');

                        // ⛔️ Si la semana es parcial y este día NO es del mes de la sección:
                        // deja la celda vacía amarilla (sin título ni métricas)
                        if (isPartialWeek && isOutside) {
                          return (
                            <div
                              key={dkey}
                              style={{
                                borderRight: '1px solid #f6f6f6',
                                background: 'white',
                                minHeight: 140,
                              }}
                            />
                          );
                        }
                        const metrics = dailyMap.get(dkey) || {
                          ventasProductos: 0,
                          cantidadProductos: 0,
                          ventasServicios: 0,
                          cantidadServicios: 0,
                          cantidadComprobantes: 0,
                        };
                        const tituloDia = d.locale('es').format('D [de] MMMM');
                        const canjesCount = (canjesMap.get(dkey)?.length) || 0;
                        
                        
                        return (
                          <div
                            key={dkey}
                            style={{
                              borderRight: '1px solid #f6f6f6',
                              background: isOutside ? '#fafafa' : 'transparent',
                              opacity: isOutside ? 0.75 : 1,
                            }}
                          >
                            <div className="fw-bold mb-2 text-white bg-primary text-center fs-3">
                              {tituloDia} {isOutside}
                            </div>
                            <ul style={{ fontSize: 15, lineHeight: 1.4, marginBottom: 10 }}>
                              <li className={metrics.ventasServicios > 0 ? 'fw-bold' : 'fw-light'}>
                                Ventas servicios: {fmtMoney(metrics.ventasServicios)}
                              </li>
                              <li className={metrics.cantidadServicios > 0 ? 'fw-bold' : 'fw-light'}>
                                Cant. servicios: {metrics.cantidadServicios}
                              </li>
                              <li className={metrics.ventasProductos > 0 ? 'fw-bold' : 'fw-light'}>
                                Ventas productos: {fmtMoney(metrics.ventasProductos)}
                              </li>
                              <li className={metrics.cantidadProductos > 0 ? 'fw-bold' : 'fw-light'}>
                                Cant. productos: {metrics.cantidadProductos}
                              </li>
                              {/* <li className={metrics.cantidadComprobantes > 0 ? 'fw-bold' : 'fw-light'}>
                                Comprobantes: {metrics.cantidadComprobantes}
                              </li> */}
                              <li className={canjesCount > 0 ? 'fw-bold' : 'fw-light'}>Canjes: {canjesCount}</li>
                            </ul>
                          </div>
                        );
                    })}
                  
                </div>
              )
            }
            )}

            {/* Espacio prudente entre meses */}
            <div style={{ height: 16 }} />
          </div>
        ))}
      </div>
    </div>
  );
};
