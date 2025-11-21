  import React, { useEffect, useMemo, useState } from "react";
  import { Col, Row } from "react-bootstrap";
  import { useVentasStore } from "./useVentasStore";
  import { ventasToExecutiveData } from "./adapters/ventasToExecutiveData";
  import ExecutiveTable from "./components/ExecutiveTable";
  import { PageBreadcrumb } from "@/components";
  import { ClientesPorOrigen } from "./components/ClientesPorOrigen";
  import { ComparativoVsActual } from "./components/ComparativoVsActual";
  import { buildDataMktByMonth } from "./adapters/buildDataMktByMonth";
  import { GraficoLinealInversionRedes } from "./components/GraficoLinealInversionRedes";
  import { RankingEstilista } from "./components/RankingEstilista";
  import { MatrizEmpleadoMes } from "./components/MatrizEmpleadoMes";
  import { TopControls } from "./components/TopControls";
      import PTApi from '@/common/api/PTApi';

  import MatrizServicios from "./components/MatrizServicios";
  const generarMesesDinamicos = (cantidad = 8, baseMonth1to12, baseYear) => {
    const meses = [
      "enero","febrero","marzo","abril","mayo","junio",
      "julio","agosto","septiembre","octubre","noviembre","diciembre"
    ];
    const mesesLabel = meses.map(m => m.toUpperCase());

    const baseMonthIdx = (baseMonth1to12 ?? (new Date().getMonth() + 1)) - 1;
    const y = baseYear ?? new Date().getFullYear();

    const out = [];
    for (let i = cantidad - 1; i >= 0; i--) {
      const d = new Date(y, baseMonthIdx - i, 1);
      const m = d.getMonth();
      out.push({ label: mesesLabel[m], anio: String(d.getFullYear()), mes: meses[m] });
    }
    return out;
  };

  export const App = ({ id_empresa }) => {
    const {
      obtenerTablaVentas,
      dataVentas,
      obtenerLeads,
      dataLead,
      dataLeadPorMesAnio
    } = useVentasStore();

    useEffect(() => {
      obtenerTablaVentas(599);
      obtenerLeads(599);
    }, [id_empresa]);

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [cutDay, setCutDay] = useState(new Date().getDate());
    const [initDay, setInitDay] = useState(1);
    const year = new Date().getFullYear();
  const [tasaCambio, setTasaCambio] = React.useState(3.37); // 👈 estado global

  const [canalParams, setCanalParams] = useState([]);

useEffect(() => {
  (async () => {
    try {
      const { data } = await PTApi.get(
        '/parametros/get_params/inversion/redes'
      );

      const mapped = (Array.isArray(data) ? data : []).map(d => ({
        id_param: d.value,
        label_param: d.label,
      }));

      setCanalParams(mapped);
    } catch (e) {
      console.warn(
        'No se pudieron cargar canalParamsSSS, uso fallback 1514/1515:',
        e?.message
      );
      setCanalParams([
        { id_param: 1514, label_param: 'TIKTOK ADS' },
        { id_param: 1515, label_param: 'META ADS'  },
      ]);
    }
  })();
}, []);

    const mesesDinamicos = useMemo(
      () => generarMesesDinamicos(8, selectedMonth, year),
      [selectedMonth, year]
    );
    const mesesEmpleados = useMemo(
      () => generarMesesDinamicos(5, selectedMonth, year),
      [selectedMonth, year]
    );
  const handleSetUltimoDiaMesesDinamicos = () => {
    const lastDaysMap = mesesDinamicos.reduce((acc, f) => {
      const monthIdx = new Date(`${f.anio}-${f.mes}-01`).getMonth();
      const lastDay = new Date(f.anio, monthIdx + 1, 0).getDate();
      acc[f.mes] = lastDay;
      return acc;
    }, {});
    setCutDay(lastDaysMap[meses[selectedMonth - 1]] || 30);
  };
    const dataMkt = useMemo(
      () => buildDataMktByMonth(dataLead, initDay, cutDay,canalParams),
      [dataLead, initDay, cutDay,canalParams]
    );
  //añadir los id de las futuras parametros
    const DIGITAL_ORIGIN_IDS = useMemo(() => new Set([1452, 1453]), []);
    const toDateSafe = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const countDigitalClientsForMonth = (ventasList, anio, mesNombre, fromDay, cut) => {
      const MESES = [
        "enero","febrero","marzo","abril","mayo","junio",
        "julio","agosto","septiembre","octubre","noviembre","diciembre"
      ];
      const mLower = String(mesNombre).toLowerCase();
      const monthIdx = MESES.indexOf(mLower);
      if (monthIdx < 0) return 0;

      const uniques = new Set();

      for (const v of (ventasList || [])) {
        const d = toDateSafe(v?.fecha_venta);
        if (!d) continue;
        if (d.getFullYear() !== Number(anio)) continue;
        if (d.getMonth() !== monthIdx) continue;

        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const from = Math.max(1, Math.min(Number(fromDay || 1), last));
        const to   = Math.max(from, Math.min(Number(cut || last), last));
        const dia  = d.getDate();
        if (dia < from || dia > to) continue;

        const idOrigen = Number(v?.id_origen ?? v?.origen);
        if (!Number.isNaN(idOrigen) && DIGITAL_ORIGIN_IDS.has(idOrigen)) {
          const idCli =
            v?.id_cli ??
            v?.tb_cliente?.id_cli ??
            v?.tb_ventum?.id_cli ??
            v?.venta?.id_cli ??
            v?.id;
          if (idCli != null) uniques.add(String(idCli));
        }
      }

      return uniques.size;
    };
const countClientsForMonthByOrigin = (ventasList, anio, mesNombre, fromDay, cut, allowed) => {
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const mLower = String(mesNombre).toLowerCase();
  const monthIdx = MESES.indexOf(mLower);
  if (monthIdx < 0) return 0;

  const uniques = new Set();
  for (const v of (ventasList || [])) {
    const d = toDateSafe(v?.fecha_venta || v?.fecha );
    if (!d || d.getFullYear() !== Number(anio) || d.getMonth() !== monthIdx) continue;

    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const from = Math.max(1, Math.min(Number(fromDay || 1), last));
    const to   = Math.max(from, Math.min(Number(cut || last), last));
    const dia  = d.getDate();
    if (dia < from || dia > to) continue;

    const idOrigen = Number(v?.id_origen ?? v?.origen);
    if (allowed.has(idOrigen)) {
      const idCli = v?.id_cli ?? v?.tb_cliente?.id_cli ?? v?.tb_ventum?.id_cli ?? v?.venta?.id_cli ?? v?.id;
      if (idCli != null) uniques.add(String(idCli));
    }
  }
  return uniques.size;
};

    const dataMktWithCac = useMemo(() => {
      const base = { ...(dataMkt || {}) };

     const META_ORIGINS   = new Set([1452, 1453,1454,1526]); 
     const TIKTOK_ORIGINS = new Set([1526]);       

for (const f of mesesDinamicos) {
  const mesKey = f.mes === "septiembre" ? "setiembre" : f.mes;
  const key = `${f.anio}-${mesKey}`;
  const obj = { ...(base[key] || {}) };

  const clientesMeta   = countClientsForMonthByOrigin(dataVentas || [], f.anio, f.mes, initDay, cutDay, META_ORIGINS);
  const clientesTikTok = countClientsForMonthByOrigin(dataVentas || [], f.anio, f.mes, initDay, cutDay, TIKTOK_ORIGINS);

  obj.clientes_meta     = clientesMeta;
  obj.clientes_tiktok   = clientesTikTok;
  obj.clientes_digitales = clientesMeta + clientesTikTok; // si quieres mantener el total

  base[key] = obj;
}

      return base;
    }, [dataMkt, dataVentas, mesesDinamicos, initDay, cutDay, countDigitalClientsForMonth]);

    const mesesLabel = [
      "ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
      "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"
    ];
    const meses = [
      "enero","febrero","marzo","abril","mayo","junio",
      "julio","agosto","septiembre","octubre","noviembre","diciembre"
    ];

    const filtrarFechaRanking = useMemo(() => {
      const mesNombre = meses[selectedMonth - 1];
      const mesLabel = mesesLabel[selectedMonth - 1];
      return [{ label: mesLabel, anio: year.toString(), mes: mesNombre }];
    }, [selectedMonth, year]);
const originMap = {
    1458: "WALKING",
                    1457: "VIP",
                    1456: "TELEVISION",
                    1455: "REGULAR",
                    1454: "WSP organico",
                    1453: "INSTAGRAM",
                    1452: "FACEBOOK",
                    1451: "YOHANDRY",
                    1450: "CANJE",
                    1449: "Preferencial",
                    1526: "TIKTOK,",
  0: "OTROS",                   
  "": "OTROS",               
  null: "OTROS", undefined: "OTROS" 
};
    return (
      <>
        <PageBreadcrumb title="INFORME GERENCIAL" subName="Ventas" />

        {/* SELECTORES */}
        <div className="header-centrado">
          <TopControls
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            initDay={initDay}
            setInitDay={setInitDay}
            cutDay={cutDay}
            setCutDay={setCutDay}
            year={year}
              onUseLastDay={handleSetUltimoDiaMesesDinamicos}
               tasaCambio={tasaCambio}       
        onChangeTasaCambio={setTasaCambio} 
          />
  </div>

        {/* CONTENIDO PRINCIPAL */}
        <Row>
          <Col lg={12} className="pt-0">
            <Row>
              <Col lg={12} className="mb-5">
                <ExecutiveTable
                  ventas={dataVentas}
                  fechas={mesesDinamicos}
                  dataMktByMonth={dataMktWithCac} 
                  initialDay={initDay}
                  cutDay={cutDay}
                  originMap={originMap}  
                  tasaCambio={tasaCambio}       
                />
              </Col>

              <Col lg={12} className="mb-8">
                <ClientesPorOrigen
                  ventas={dataVentas}
                  fechas={mesesDinamicos}
                  initialDay={initDay}
                  cutDay={cutDay}
                  selectedMonth={selectedMonth}
                  originMap={{
                    1458: "WALKING",
                    1457: "VIP",
                    1456: "TELEVISION",
                    1455: "REGULAR",
                    1454: "WSP organico",
                    1453: "INSTAGRAM",
                    1452: "FACEBOOK",
                    1451: "YOHANDRY",
                    1450: "CANJE",
                    1449: "Preferencial",
                    1526: "TIKTOK,"
                  }}
                />
              </Col>
            </Row>
          </Col>

          {/* COMPARATIVOS Y GRÁFICOS */}
          <Col lg={12}>
            <Row className="gx-3 gy-4">
              <Col lg={12} className="mb-6">
                <ComparativoVsActual
                  fechas={mesesDinamicos}
                  ventas={dataVentas}
                  initialDay={initDay}
                  cutDay={cutDay}
                />
              </Col>
              <Col lg={12}>
                <GraficoLinealInversionRedes
                  data={dataLeadPorMesAnio}
                  fechas={[new Date()]}
                />
              </Col>
            </Row>
          </Col>

          {/* RANKING DINÁMICO */}
          <Col lg={12} className="mb-5">
            <RankingEstilista
              dataVenta={dataVentas}
              filtrarFecha={filtrarFechaRanking}
              initialDay={initDay}
              cutDay={cutDay}
            />
          </Col>

          {/* MATRICES */}
          <Col lg={12} className="mb-5">
            <MatrizEmpleadoMes
              dataVenta={dataVentas}
              filtrarFecha={mesesEmpleados}
              datoEstadistico="Total Ventas"
                initialDay={initDay}

              cutDay={cutDay}
            />
          </Col>

          <Col lg={12} className="mb-5">
            <MatrizEmpleadoMes
              dataVenta={dataVentas}
              filtrarFecha={mesesEmpleados}
              datoEstadistico="Cant. Ventas"
              cutDay={cutDay}
            />
          </Col>

          <Col lg={12} className="mb-5">
            <MatrizEmpleadoMes
              dataVenta={dataVentas}
              filtrarFecha={mesesEmpleados}
              datoEstadistico="Ventas Productos"
              cutDay={cutDay}
            />
          </Col>

          <Col lg={12} className="mb-5">
            <MatrizEmpleadoMes
              dataVenta={dataVentas}
              filtrarFecha={mesesEmpleados}
              datoEstadistico="Cant. Productos"
              cutDay={cutDay}
            />
          </Col>

          <Col lg={12} className="mb-5">
            <MatrizServicios
              ventas={dataVentas}
              fechas={mesesDinamicos}
              selectedMonth={selectedMonth}
              initialDay={initDay}
              cutDay={cutDay}
            />
          </Col>
        </Row>
      </>
    );
  };
