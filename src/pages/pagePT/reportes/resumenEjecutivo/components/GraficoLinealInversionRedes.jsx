import React, { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

const ID_META = 1515;
const ID_TIKTOK = 1514;

export const GraficoLinealInversionRedes = ({ data }) => {
  // "todos" | "meta" | "tiktok"
  const [filtro, setFiltro] = useState("todos");

  // Asegura arreglo y usa los 4 más recientes en orden cronológico
  const firstFour = (Array.isArray(data) ? data : []).slice(0, 4).reverse();

  // Mes base para categorías
 // Determinar mes con datos más recientes
const latestItems = firstFour
  .flatMap((m) => m.items || [])
  .filter((i) => i.fecha)
  .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

const baseMonth = latestItems[0]
  ? dayjs(latestItems[0].fecha)
  : dayjs();

const daysInMonth = baseMonth.daysInMonth();



  // === Eje X: "LUNES 1", "MARTES 2", ...
  const categories = Array.from({ length: daysInMonth }, (_, i) => {
    const d = baseMonth.date(i + 1);
    return `${d.format("dddd").toUpperCase()} ${i + 1}`;
  });

  // === Conteo por día para Meta y TikTok (para mostrar en eje X y tooltip)
  const leadsByLabel = Object.fromEntries(
    categories.map((c) => [c, { meta: 0, tiktok: 0 }])
  );

  for (const m of firstFour) {
    const items = Array.isArray(m.items) ? m.items : [];
    for (const it of items) {
      const d = dayjs(it.fecha);
      if (!d.isValid()) continue;
      if (d.month() !== baseMonth.month() || d.year() !== baseMonth.year())
        continue;

      const label = `${d.format("dddd").toUpperCase()} ${d.date()}`;
      const id = Number(it?.id_red);
      const cant = Number(
        typeof it?.cantidad === "string" ? it.cantidad.trim() : it?.cantidad
      );

      if (!Number.isFinite(cant)) continue;
      if (id === ID_META) leadsByLabel[label].meta += cant;
      if (id === ID_TIKTOK) leadsByLabel[label].tiktok += cant;
    }
  }

  const series = useMemo(() => {
    const filtroId =
        filtro === "meta" ? ID_META : filtro === "tiktok" ? ID_TIKTOK : null;
    return firstFour.map((m, idx) => {
      const items = Array.isArray(m.items) ? m.items : [];
      const puntos =[];

      for (const it of items) {
        const d = dayjs(it.fecha);
        if (!d.isValid()) continue;

        const id= Number(it?.id_red);
        if(filtroId && id !==filtroId) continue;

        const val = Number(it?.cantidad ?? 0);
        if(!Number.isFinite(val)) continue;

        const label = `${d.format("MMMM").toUpperCase()} ${d.date()}`;
      puntos.push({ x: label, y: val });
    }
    return{
      name: m?.fecha ?? `Serie ${idx + 1}`,
      data: puntos,
    };
  });
}, [firstFour, filtro]);

  const options = {
    chart: { type: "line", toolbar: { show: false }, parentHeightOffset: 0 },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 4 },
    grid: { padding: { bottom: 120, left: 8, right: 8 } },
    xaxis: {
      categories,
      labels: {
        rotate: -90,
        rotateAlways: true,
        hideOverlappingLabels: false,
        trim: false,
        style: { fontSize: "10px", cssClass: "xlab-2lines" },
        formatter: (val) => {
          const l = leadsByLabel[val] || { meta: 0, tiktok: 0 };
          const info =
            filtro === "meta"
              ? `META: ${l.meta}`
              : filtro === "tiktok"
              ? `TIKTOK: ${l.tiktok}`
              : `META: ${l.meta}   TIKTOK: ${l.tiktok}`;
          return `${val}\n${info}`;
        },
        offsetY: 8,
        minHeight: 90,
        maxHeight: 150,
      },
    },
yaxis: {
  title: { text: "CANTIDAD" },
  min: 0,
  forceNiceScale: true,
  decimalsInFloat: 0,
  labels: { formatter: (val) => Math.round(val) },
},
    legend: { position: "top", floating: true, offsetY: 8 },
    tooltip: {
      shared: true,
      intersect: false,
      custom: ({ dataPointIndex }) => {
        const label = categories[dataPointIndex];
        const { meta, tiktok } = leadsByLabel[label] || { meta: 0, tiktok: 0 };
        return `<div class="apex-tooltip">
          <div style="font-weight:700;margin-bottom:4px">${label}</div>
          <div>META: <b>${meta}</b> &nbsp;•&nbsp; TIKTOK: <b>${tiktok}</b></div>
        </div>`;
      },
    },
  };

  return (
    <>
      {/* Filtros locales */}
      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <button
          className={`btn ${filtro === "todos" ? "btn-warning" : "btn-outline-warning"}`}
          onClick={() => setFiltro("todos")}
        >
          TODOS
        </button>
        <button
          className={`btn ${filtro === "meta" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setFiltro("meta")}
        >
          META
        </button>
        <button
          className={`btn ${filtro === "tiktok" ? "btn-danger" : "btn-outline-danger"}`}
          onClick={() => setFiltro("tiktok")}
        >
          TIKTOK
        </button>
      </div>

      {/* Permite salto de línea en etiquetas del eje X */}
      <style>{`
        .apexcharts-xaxis text, .xlab-2lines { white-space: pre-line; }
      `}</style>

      <Chart options={options} series={series} type="line" height={450} />
    </>
  );
};
