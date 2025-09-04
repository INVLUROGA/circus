import { useVentasStore } from '@/hooks/hookApi/useVentasStore';
import React, { useEffect, useMemo, useState } from 'react';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';
import minMax from 'dayjs/plugin/minMax';
import 'dayjs/locale/es';

import { useCalendarDia } from './useCalendarDia';
import { PageBreadcrumb } from '@/components';
import { NumberFormatter } from '@/components/CurrencyMask';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(minMax);

// Todo en Lima
dayjs.tz.setDefault('America/Lima');

const DAYS = ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'];
const GRID = 'repeat(7, minmax(200px, 1fr))';
const GRID_SUMMARY = `repeat(${DAYS.length}, minmax(200px, 1fr))`; // 7 días + TODO
const YELLOW = '#FFF8B3'; // amarillo suave

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

  // ===== ACUMULADO GLOBAL (todos los datos en el rango implícito) =====
  const globalAgg = useMemo(() => {
    const byDow = Array.from({ length: 7 }, () => ({
      ventasServicios: 0,
      ventasProductos: 0,
      cantidadServicios: 0,
      cantidadProductos: 0,
      canjes: 0,
    }));
    let total = 0;

    if (!Array.isArray(dataVentas) || dataVentas.length === 0) {
      return { byDow, total, totales: { ventasServicios: 0, ventasProductos: 0, cantidadServicios: 0, cantidadProductos: 0, canjes: 0 } };
    }

    // Rango real de fechas con datos
    const fechas = dataVentas.map(v => dayjs.utc(v?.fecha_venta).tz());
    const globalStart = dayjs.min(fechas).startOf('day');
    const globalEnd   = dayjs.max(fechas).endOf('day');

    let d = globalStart.clone();
    while (d.isBefore(globalEnd) || d.isSame(globalEnd, 'day')) {
      const dkey = d.format('YYYY-MM-DD');
      const m = dailyMap.get(dkey);

      if (m) {
        const idx = d.isoWeekday() - 1; // 0..6 (LUN..DOM)
        const vs = Number(m?.ventasServicios || 0);
        const vp = Number(m?.ventasProductos || 0);
        const cs = Number(m?.cantidadServicios || 0);
        const cp = Number(m?.cantidadProductos || 0);
        const cj = (canjesMap.get(dkey)?.length) || 0;

        byDow[idx].ventasServicios  += vs;
        byDow[idx].ventasProductos  += vp;
        byDow[idx].cantidadServicios += cs;
        byDow[idx].cantidadProductos += cp;
        byDow[idx].canjes            += cj;

        total += (vs + vp);
      }

      d = d.add(1, 'day');
    }

    const totales = byDow.reduce((acc, x) => ({
      ventasServicios: acc.ventasServicios + x.ventasServicios,
      ventasProductos: acc.ventasProductos + x.ventasProductos,
      cantidadServicios: acc.cantidadServicios + x.cantidadServicios,
      cantidadProductos: acc.cantidadProductos + x.cantidadProductos,
      canjes: acc.canjes + x.canjes,
    }), { ventasServicios: 0, ventasProductos: 0, cantidadServicios: 0, cantidadProductos: 0, canjes: 0 });

    return { byDow, total, totales };
  }, [dataVentas, dailyMap, canjesMap]);

  return (
    <div>
    <PageBreadcrumb title="Acumulado anual por dia calendario" subName="Ventas" />
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
            gridTemplateColumns: GRID,
            borderBottom: '1px solid #ddd',
          }}
        >
          {/* {DAYS.map(d => (
            <div key={d} className="py-2 px-3 text-center fw-semibold bg-primary fs-2" style={{ borderRight: '1px solid #f1f1f1' }}>
              {d}
            </div>
          ))} */}
        </div>

        {/* ===== ACUMULADO GLOBAL (al final): LUN..DOM + TODO ===== */}
        <div className="mt-4" style={{ padding: '12px 8px 24px' }}>
          <div className="fs-2 fw-bold text-primary mb-2 text-center">Acumulado anual por día calendario</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: GRID_SUMMARY,
              border: '1px solid #eee',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {globalAgg.byDow.map((agg, i) => {
              const totalDia = agg.ventasServicios + agg.ventasProductos;
              const porcGlobal = globalAgg.total ? ((totalDia / globalAgg.total) * 100).toFixed(2) : '0.00';
              return (
                <div key={`global-dow-${i}`} style={{ borderRight: '1px solid #f1f1f1' }}>
                  <div className="fw-semibold mb-1 text-center bg-primary " style={{fontSize: '33px'}}>{DAYS[i]}</div>
                  <div className="fw-bold">VENTA TOTAL: {fmtMoney(totalDia)}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Ventas servicios: {fmtMoney(agg.ventasServicios)}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Ventas productos: {fmtMoney(agg.ventasProductos)}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Cant. servicios: {agg.cantidadServicios}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Cant. productos: {agg.cantidadProductos}
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    Canjes: {agg.canjes}
                  </div>
                  <div className="fw-bold text-primary fs-3">% ANUAL: {porcGlobal}</div>
                </div>
              );
            })}
            {/* Columna TODO global */}
          </div>
          <div className='d-flex justify-content-center'>
            <div className='mt-3' key="global-todo" style={{ padding: '8px 10px' }}>
              <div className="fw-semibold mb-1 text-center bg-dark text-white fs-3">acumulado anual</div>
              <div className="fw-bold" style={{ fontSize: 25 }}>VENTA TOTAL: {fmtMoney(globalAgg.total)}</div>
              <div className="text-muted" style={{ fontSize: 25 }}>
                Ventas servicios: {fmtMoney(globalAgg.totales.ventasServicios)}
              </div>
              <div className="text-muted" style={{ fontSize: 25 }}>
                Ventas productos: {fmtMoney(globalAgg.totales.ventasProductos)}
              </div>
              <div className="text-muted" style={{ fontSize: 25 }}>
                Cant. servicios: <NumberFormatter amount={globalAgg.totales.cantidadServicios}/>
              </div>
              <div className="text-muted" style={{ fontSize: 25 }}>
                Cant. productos: {globalAgg.totales.cantidadProductos}
              </div>
              <div className="text-muted" style={{ fontSize: 25 }}>
                Canjes: {globalAgg.totales.canjes}
              </div>
              <div className="fw-bold text-primary fs-3">100.00%</div>
            </div>
          </div>
          {/* <div className="text-end fw-bold mt-2 fs-1">TOTAL GLOBAL: {fmtMoney(globalAgg.total)}</div> */}
        </div>
      </div>
    </div>
  );
};
