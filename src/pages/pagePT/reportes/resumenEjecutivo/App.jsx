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
import { MatrizServicios } from "./components/MatrizServicios";

const generarMesesDinamicos = (cantidad = 8, baseMonth1to12, baseYear) => {
  const meses = ["enero","febrero","marzo","abril","mayo","junio",
                 "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const mesesLabel = meses.map(m => m.toUpperCase());

  const baseMonthIdx = (baseMonth1to12 ?? (new Date().getMonth()+1)) - 1;
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
  const { obtenerTablaVentas, dataVentas, obtenerLeads, dataLead, dataLeadPorMesAnio } = useVentasStore();

  useEffect(() => { 
    obtenerTablaVentas(599); 
    obtenerLeads(599);
  }, [id_empresa]);

  // === estado global de control ===
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [cutDay, setCutDay] = useState(new Date().getDate());
  const [initDay, setInitDay] = useState(1);
  const year = new Date().getFullYear();

const mesesDinamicos = useMemo(() => generarMesesDinamicos(8,selectedMonth,year), [selectedMonth, year]);
const mesesEmpleados = useMemo(() => generarMesesDinamicos(5,selectedMonth,year), [selectedMonth, year]);

  const columns = useMemo(
    () => mesesDinamicos.map(m => ({ key: m.mes, label: m.label, currency: "S/." })),
    [mesesDinamicos]
  );

  const marketing = {
    inversion_redes: { marzo: 1098, abril: 3537, mayo: 4895, junio: 4622, julio: 4697, agosto: 5119, septiembre: 0 },
    leads:           { marzo: 84, abril: 214, mayo: 408, junio: 462, julio: 320, agosto: 417, septiembre: 0 },
    cpl:             { marzo: 13.07, abril: 16.53, mayo: 12, junio: 10, julio: 14.68, agosto: 12.28, septiembre: 0 },
    cac:             { marzo: null, abril: null, mayo: null, junio: null, julio: null, agosto: null, septiembre: 0 },
  };

  const tableData = useMemo(() => ventasToExecutiveData({
    ventas: dataVentas,
    columns,
    titleLeft: "CIRCUS",
    titleRight: `RESUMEN EJECUTIVO HASTA EL ${cutDay} DE CADA MES`,
    marketing,
    cutDay,
    initDay,
    footerFullMonth: true
  }), [dataVentas, columns, marketing, cutDay, initDay]);

  const dataMkt = buildDataMktByMonth(dataLead, initDay, cutDay);

  // === generación dinámica del filtro para RankingEstilista ===
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

  // === render principal ===
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
        />
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <Row>
        <Col lg={12} className="pt-0">
          <Row>
            <Col lg={12} className="mb-4">
              <ExecutiveTable
                ventas={dataVentas}
                fechas={mesesDinamicos}
                dataMktByMonth={dataMkt}
                initialDay={initDay}
                cutDay={cutDay}
              />
            </Col>

            <Col lg={12}>
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
                  1454: "whatsapp",
                  1453: "INSTAGRAM",
                  1452: "FACEBOOK",
                  1451: "YOHANDRY",
                  1450: "CANJE",
                  1449: "Preferencial",
                }}
              />
            </Col>
          </Row>
        </Col>

        {/* COMPARATIVOS Y GRÁFICOS */}
        <Col lg={12}>
          <Row>
            <Col lg={12} className="mb-4">
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
        <Col lg={12}>
          <RankingEstilista
            dataVenta={dataVentas}
            filtrarFecha={filtrarFechaRanking}
            initialDay={initDay}
            cutDay={cutDay}
          />
        </Col>

        {/* MATRICES */}
        <Col lg={12}>
          <MatrizEmpleadoMes
            dataVenta={dataVentas}
            filtrarFecha={mesesEmpleados}
            datoEstadistico="Total Ventas"
            cutDay={cutDay}
          />
        </Col>
        <Col lg={12}>
          <MatrizEmpleadoMes
            dataVenta={dataVentas}
            filtrarFecha={mesesEmpleados}
            datoEstadistico="Total Servicios"
            cutDay={cutDay}
          />
        </Col>
        <Col lg={12}>
          <MatrizEmpleadoMes
            dataVenta={dataVentas}
            filtrarFecha={mesesEmpleados}
            datoEstadistico="Cant. Ventas"
            cutDay={cutDay}
          />
        </Col>
        <Col lg={12}>
          <MatrizEmpleadoMes
            dataVenta={dataVentas}
            filtrarFecha={mesesEmpleados}
            datoEstadistico="Ventas Productos"
            cutDay={cutDay}
          />
        </Col>
        <Col lg={12}>
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
