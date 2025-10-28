import React, { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import "dayjs/locale/es";
dayjs.extend(utc);
dayjs.locale("es");

export const GraficoLinealInversionRedes = ({ data = [] }) => {
  const [red, setRed] = useState("ambos");

  // ------------------------ Helpers ------------------------
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const getId = (it) =>
    Number(
      it?.id_param ??
        it?.idRed ??
        it?.id_red ??
        it?.id_canal ??
        it?.canal_id ??
        it?.origen_id ??
        it?.id
    );

  const labelFrom = (it) =>
    it?.parametro?.label_param ??
    it?.label_param ??
    it?.nombre_param ??
    it?.canal ??
    it?.red ??
    it?.origen ??
    it?.origen_label ??
    it?.label ??
    "";

  const detectNetwork = (it) => {
    const id = getId(it);
    if (id === 1515) return "meta";
    if (id === 1514) return "tiktok";

    const L = norm(labelFrom(it));
    if (/(meta|facebook|instagram)/.test(L)) return "meta";
    if (/tiktok/.test(L)) return "tiktok";
    return "desconocido";
  };

  const keepByFilter = (it) => {
    if (red === "ambos") return true;
    return detectNetwork(it) === red;
  };

  // ------------------------ Corrección principal ------------------------

  // Determina el mes base del contenedor (no del primer item)
  const parseMonthFromContainer = (m) => {
    const raw =
      m?.fecha || m?.month || m?.mes || m?.label || m?.nombre || m?.key || "";
    const d = dayjs.utc(raw).isValid() ? dayjs.utc(raw) : dayjs.utc(String(raw));
    return d.isValid() ? d.startOf("month") : null;
  };

  // Ordena por mes ascendente y toma los últimos 4
  const monthsSorted = (Array.isArray(data) ? data : [])
    .map((m) => ({ m, base: parseMonthFromContainer(m) }))
    .filter((x) => x.base)
    .sort((a, b) => a.base.valueOf() - b.base.valueOf())
    .map((x) => x.m);

  const lastFour = monthsSorted.slice(-4); // últimos 4 meses

  // ------------------------ Series ------------------------
  const series = useMemo(() => {
    return lastFour.map((m, idx) => {
      const items = Array.isArray(m?.items) ? m.items.filter(keepByFilter) : [];
      const base = parseMonthFromContainer(m) || dayjs.utc();
      const daysInMonth = base.daysInMonth();
      const buckets = Array(daysInMonth).fill(0);

      for (const it of items) {
        const d = dayjs.utc(it?.fecha);
        if (!d.isValid()) continue;
        if (!d.isSame(base, "month")) continue; // solo cuenta si pertenece al mes del contenedor

        const day = d.date();
        const raw =
          typeof it?.cantidad === "string" ? it.cantidad.trim() : it?.cantidad;
        const val = Number(raw);
        buckets[day - 1] += Number.isFinite(val) ? val : 0;
      }

      return {
        name: m?.fecha ?? m?.label ?? `Serie ${idx + 1}`,
        data: buckets,
      };
    });
  }, [lastFour, red]);

  // ------------------------ Ejes ------------------------
  const baseMonthForAxis = useMemo(() => {
    const last = lastFour[lastFour.length - 1];
    const base = parseMonthFromContainer(last);
    return base || dayjs.utc();
  }, [lastFour]);

  const daysInMonth = baseMonthForAxis.daysInMonth();
  const categories = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const d = baseMonthForAxis.date(i + 1);
        return `${d.format("dddd")} ${i + 1}`.toUpperCase();
      }),
    [baseMonthForAxis, daysInMonth]
  );

  // ------------------------ Config Apex ------------------------
  const options = {
    chart: { type: "line", toolbar: { show: false }, parentHeightOffset: 0 },
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 4 },
    grid: { padding: { bottom: 90, left: 8, right: 8 } },
    xaxis: {
      categories,
      labels: {
        rotate: -90,
        rotateAlways: true,
        hideOverlappingLabels: false,
        trim: false,
        style: { fontSize: "10px" },
        offsetY: 8,
        minHeight: 80,
        maxHeight: 120,
      },
    },
    yaxis: { title: { text: "CANTIDAD" } },
    legend: { position: "top", floating: true, offsetY: 8 },
    tooltip: {
      x: { show: true },
      y: { formatter: (val) => `${val}` },
    },
  };

  // ------------------------ Filtros con iconos ------------------------
  const ICONS = {
    ambos: { src: "/assets/change-logo-dark-transparente-6852406f.png", label: "Ambos", color: "#888" },
    meta: { src: "/meta.jpg", color: "#0d6efd", label: "Meta" },
    tiktok: { src: "/tiktok.png", color: "#000000", label: "TikTok" },
  };

  const IconFilter = ({ keyName }) => {
    const active = red === keyName;
    const { src, color, label } = ICONS[keyName];
    return (
      <button
        onClick={() => setRed(keyName)}
        aria-label={label}
        title={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 54,
          height: 54,
          borderRadius: "999px",
          border: `2px solid ${active ? color : "transparent"}`,
          background: "transparent",
          padding: 4,
          cursor: "pointer",
          transition: "all .15s ease",
          boxShadow: active ? `0 0 0 2px ${color}22` : "none",
        }}
      >
        <img
          src={src}
          alt={label}
          style={{
            width: 52,
            height: 52,
            objectFit: "contain",
            transform: active ? "scale(1.05)" : "scale(1)",
          }}
        />
      </button>
    );
  };

  // ------------------------ Render ------------------------
  return (
    <div>
      {/* Filtro de redes */}
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <IconFilter keyName="ambos" />
        <IconFilter keyName="meta" />
        <IconFilter keyName="tiktok" />
      </div>

      <Chart options={options} series={series} type="line" height={500} />
    </div>
  );
};
  