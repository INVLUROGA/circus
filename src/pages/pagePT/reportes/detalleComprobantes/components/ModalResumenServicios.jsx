import React, { useState, useMemo, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Dialog } from 'primereact/dialog';
import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { NumberFormatMoney } from '@/components/CurrencyMask';
import { aggregateServicios, rankColaboradores, sortRows } from '../adapters/reporteUtils'; 
import dayjs from 'dayjs';
import 'dayjs/locale/es'; 
import PTApi from '@/common/api/PTApi';
import * as XLSX from 'xlsx'; 

// --- COMPONENTE FILA EDITABLE ---
const EditableRow = ({ item, empleadosDisponibles, serviciosDisponibles, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    id_empl: item.id_empl || item.empleado_servicio?.id,
    id_servicio: item.id_servicio,
    tarifa_monto: item.tarifa_monto
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!editData.id_empl) return alert("⚠ Debes seleccionar un colaborador");
    if (!editData.id_servicio) return alert("⚠ Debes seleccionar un servicio");

    setLoading(true);
    const success = await onSave(item.id, editData);
    setLoading(false);
    if (success) setIsEditing(false);
  };

  const currentEmplName = item.empleado_servicio?.nombres_apellidos_empl || "Sin Asignar";
  const currentServicioName = item.circus_servicio?.nombre_servicio || "Sin servicio";

  if (!isEditing) {
    return (
      <tr>
        <td>{dayjs(item.createdAt || item.fecha_venta).format("DD/MM/YYYY")}</td>
        <td className="fw-bold text-secondary">{currentServicioName}</td>
        <td>{currentEmplName}</td>
        <td className="text-end"><NumberFormatMoney amount={item.tarifa_monto} /></td>
        <td className="text-center">
          <Button
            variant="outline-primary"
            size="sm"
            className="rounded-circle"
            onClick={() => setIsEditing(true)}
            title="Editar"
          >
            <i className="fas fa-pencil-alt"></i>
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="table-warning border border-warning">
      <td>{dayjs(item.createdAt || item.fecha_venta).format("DD/MM/YYYY")}</td>
      <td>
        <Form.Select
          size="sm"
          className="border-warning"
          value={editData.id_servicio || ""}
          onChange={(e) =>
            setEditData({ ...editData, id_servicio: Number(e.target.value) })
          }
        >
          <option value="" disabled>Seleccionar servicio...</option>
          {serviciosDisponibles.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Form.Select>
      </td>
      <td>
        <Form.Select
          size="sm"
          className="border-warning"
          value={editData.id_empl || ""}
          onChange={(e) =>
            setEditData({ ...editData, id_empl: Number(e.target.value) })
          }
        >
          <option value="" disabled>Seleccionar colaborador...</option>
          {empleadosDisponibles.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </Form.Select>
      </td>
      <td>
        <Form.Control
          type="number"
          step="0.10"
          size="sm"
          className="text-end border-warning fw-bold"
          value={editData.tarifa_monto}
          onChange={(e) =>
            setEditData({ ...editData, tarifa_monto: e.target.value })
          }
        />
      </td>
      <td className="text-center">
        <div className="d-flex gap-1 justify-content-center">
          <Button
            variant="success"
            size="sm"
            onClick={handleSave}
            disabled={loading}
            title="Guardar"
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsEditing(false)}
            title="Cancelar"
          >
            <i className="fas fa-times"></i>
          </Button>
        </div>
      </td>
    </tr>
  );
};

// --- COMPONENTE PRINCIPAL ---
export const ModalResumenServicios = ({
  show,
  onHide,
  label,
  ventasRaw,
  serviciosRaw,
}) => {
  const [groupBy, setGroupBy] = useState("servicio-empleado");
  const [filtroServ, setFiltroServ] = useState("");
  const [sortServBy, setSortServBy] = useState("total");
  const [sortServDir, setSortServDir] = useState("desc");
  const [isEditMode, setIsEditMode] = useState(false);

  const [servicios, setServicios] = useState(serviciosRaw || []);

  useEffect(() => {
    setServicios(serviciosRaw || []);
  }, [serviciosRaw]);

  const cantidadServicios = servicios.length;
  const totalServicios = servicios.reduce(
    (s, x) => s + Number(x?.tarifa_monto || 0),
    0
  );

  // 1. Lógica Resumen
  const itemsResumen = useMemo(
    () => aggregateServicios(servicios, groupBy),
    [servicios, groupBy]
  );

  // 2. Lógica Ranking
  const rankingServBase = useMemo(
    () =>
      rankColaboradores(
        servicios,
        (s) => s?.empleado_servicio?.nombres_apellidos_empl,
        (s) => s?.tarifa_monto
      ),
    [servicios]
  );
  const rankingServ = useMemo(
    () => sortRows(rankingServBase, sortServBy, sortServDir),
    [rankingServBase, sortServBy, sortServDir]
  );

  const toggleSort = (by) => {
    setSortServDir((prev) =>
      sortServBy === by ? (prev === "asc" ? "desc" : "asc") : "desc"
    );
    setSortServBy(by);
  };

  // 3. DATA DETALLADA PARA EXCEL
  const dataDetallada = useMemo(() => {
    if (!ventasRaw) return [];
    dayjs.locale('es');

    const filas = [];
    ventasRaw.forEach(venta => {
        // a) Datos Generales
        const fecha = dayjs(venta.fecha_venta).format("DD/MM/YYYY"); 
        const tipoComprobante = venta.id_tipoFactura === 699 ? 'EBOLETA' : (venta.id_tipoFactura === 700 ? 'EFACTURA' : 'TICKET');
        const numComprobante = venta.numero_transac;
        const tipoCliente = venta.id_cli ? "REGULAR" : "PÚBLICO";
        const cliente = venta.tb_cliente 
            ? `${venta.tb_cliente.nombres_apellidos_cli}` 
            : 'Público General';
        
        // --- CORRECCIÓN AQUÍ ---
        // Leemos 'tb_empleado' (singular) según tu JSON
        const responsableVenta = venta.tb_empleado?.nombres_apellidos_empl // <--- Prioridad 1 (Tu JSON)
                              || venta.tb_empleados?.nombres_apellidos_empl // <--- Fallback (Plural)
                              || (venta.id_empl ? `ID: ${venta.id_empl}` : '');

        // b) Calcular totales
        const totalVenta = (venta.detalle_ventaservicios?.reduce((acc, s) => acc + Number(s.tarifa_monto), 0) || 0) +
                           (venta.detalle_ventaProductos?.reduce((acc, p) => acc + Number(p.tarifa_monto || p.precio_venta), 0) || 0);

        // c) Pagos
        let pagoEfectivo = 0;
        let pagoElect = 0;
        let tipoOpElect = [];
        let numOper = [];

        if (venta.detalleVenta_pagoVenta) {
            venta.detalleVenta_pagoVenta.forEach(pago => {
                const label = pago.parametro_forma_pago?.label_param || '';
                const monto = Number(pago.parcial_monto || 0);
                
                if (label.toUpperCase().includes('EFECTIVO')) {
                    pagoEfectivo += monto;
                } else {
                    pagoElect += monto;
                    const labelTarjeta = pago.parametro_tarjeta?.label_param || label;
                    if(!tipoOpElect.includes(labelTarjeta)) tipoOpElect.push(labelTarjeta);
                    if(pago.n_operacion && !numOper.includes(pago.n_operacion)) numOper.push(pago.n_operacion);
                }
            });
        }

        // d) Procesar SERVICIOS
        if(venta.detalle_ventaservicios?.length > 0){
            venta.detalle_ventaservicios.forEach(serv => {
                filas.push({
                    "FECHA": fecha,
                    "COM": tipoComprobante,
                    "#COMP": numComprobante,
                    "T-CLIENTE": tipoCliente,
                    "CLIENTE": cliente,
                    "TOTAL COMP": Number(totalVenta).toFixed(2),
                    "CLASE": "SERVICIO",
                    "PRODUCTO / SERVICIO": serv.circus_servicio?.nombre_servicio || 'Servicio',
                    "EMPLEADO": serv.empleado_servicio?.nombres_apellidos_empl || 'Sin Asignar',
                    "CANT": serv.cantidad,
                    "SUB TOTAL": Number(serv.tarifa_monto).toFixed(2),
                    "DESC": "0", 
                    "TOTAL": Number(serv.tarifa_monto * serv.cantidad).toFixed(2),
                    "EFC - S/": Number(pagoEfectivo).toFixed(2),
                    "TIPO OP. ELECT": tipoOpElect.join(' / '),
                    "#OPER": numOper.join(' / '),
                    "OP. ELECT - S/": Number(pagoElect).toFixed(2),
                    "RECEPCIÓN": responsableVenta // <--- AHORA SÍ DEBE SALIR EL NOMBRE
                });
            });
        }
    });
    
    return filas.sort((a, b) => {
        const [d1, m1, y1] = a.FECHA.split('/');
        const [d2, m2, y2] = b.FECHA.split('/');
        return new Date(y2, m2-1, d2) - new Date(y1, m1-1, d1);
    });
  }, [ventasRaw]);

  // --- FUNCIÓN EXPORTAR EXCEL NATIVO ---
  const exportarExcelNativo = () => {
    if (dataDetallada.length === 0) {
        return alert("No hay datos para exportar.");
    }

    const ws = XLSX.utils.json_to_sheet(dataDetallada);

    // Definir ANCHO DE COLUMNAS
    const wscols = [
        { wch: 12 }, // FECHA
        { wch: 10 }, // COM
        { wch: 15 }, // #COMP
        { wch: 10 }, // T-CLIENTE
        { wch: 35 }, // CLIENTE
        { wch: 12 }, // TOTAL COMP
        { wch: 10 }, // CLASE
        { wch: 30 }, // PRODUCTO / SERVICIO
        { wch: 30 }, // EMPLEADO
        { wch: 6 },  // CANT
        { wch: 10 }, // SUB TOTAL
        { wch: 6 },  // DESC
        { wch: 10 }, // TOTAL
        { wch: 10 }, // EFC - S/
        { wch: 15 }, // TIPO OP. ELECT
        { wch: 12 }, // #OPER
        { wch: 12 }, // OP. ELECT - S/
        { wch: 25 }, // RECEPCIÓN
    ];

    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Servicios");
    XLSX.writeFile(wb, `Reporte_Servicios_${dayjs().format("DD-MM-YYYY_HHmm")}.xlsx`);
  };

  // 4. Listas para edición
  const empleadosDisponibles = useMemo(() => {
    const map = new Map();
    servicios.forEach(s => {
      const id = s.id_empl || s.empleado_servicio?.id;
      const nombre = s.empleado_servicio?.nombres_apellidos_empl;
      if (id && nombre) map.set(id, { id, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [servicios]);

  const serviciosCatalogo = useMemo(() => {
    const map = new Map();
    servicios.forEach(s => {
      const id = s.id_servicio;
      const nombre = s.circus_servicio?.nombre_servicio;
      if (id && nombre) map.set(id, { id, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [servicios]);


  const updateServiceBackend = async (id, data) => {
    try {
      const { data: result } = await PTApi.put(
        `/venta/update-detalle-servicio/${id}`,
        {
          id_empl: Number(data.id_empl),
          tarifa_monto: Number(data.tarifa_monto),
          id_servicio: Number(data.id_servicio),
        }
      );

      if (result.ok) {
        const newServId = Number(data.id_servicio);
        setServicios(prev =>
          prev.map(s => {
            if (s.id !== id) return s;
            const scInfo = serviciosCatalogo.find(sc => sc.id === newServId);
            return {
              ...s,
              id_empl: Number(data.id_empl),
              tarifa_monto: Number(data.tarifa_monto),
              id_servicio: newServId,
              circus_servicio: scInfo
                ? { ...(s.circus_servicio || {}), id_servicio: scInfo.id, nombre_servicio: scInfo.nombre }
                : s.circus_servicio,
            };
          })
        );
        alert("✅ Servicio actualizado correctamente.");
        return true;
      } else {
        alert("⚠ Error del servidor: " + (result.msg || result.error));
        return false;
      }
    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión con el servidor.");
      return false;
    }
  };

  return (
    <Dialog
      header={`Resumen de servicios — ${label}`}
      visible={show}
      onHide={onHide}
      style={{ width: "95vw", maxWidth: "1800px" }}
      centered
      scrollable
    >
      <div className="p-3">
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-3 bg-light p-3 rounded border shadow-sm">
          <div className="d-flex align-items-center gap-4">
            <Button
              variant={isEditMode ? "warning" : "outline-dark"}
              className="fw-bold d-flex align-items-center gap-2 shadow-sm"
              onClick={() => setIsEditMode(!isEditMode)}
              style={{ minWidth: "140px" }}
            >
              <i className={`fas ${isEditMode ? "fa-times" : "fa-edit"}`} />
              {isEditMode ? "Salir Edición" : "Editar Datos"}
            </Button>

            <div className="border-start ps-4">
              <div className="fs-5 m-0 text-secondary">
                Total servicios: <strong>{cantidadServicios}</strong>
              </div>
              <div className="fs-4 m-0 d-flex align-items-center gap-2">
                Venta Total:
                <strong className="text-success">
                  <SymbolSoles
                    size={28}
                    bottomClasss={"6"}
                    numero={<NumberFormatMoney amount={totalServicios} />}
                  />
                </strong>
              </div>
            </div>
          </div>

          <div className="d-flex gap-4 align-items-center">
            {!isEditMode && (
              <Form.Check
                type="switch"
                id="switch-group-serv"
                className="fs-5 fw-bold text-secondary"
                label={
                  groupBy === "servicio"
                    ? "Agrupar: Solo Servicio"
                    : "Agrupar: Servicio + Colaborador"
                }
                checked={groupBy === "servicio"}
                onChange={(e) =>
                  setGroupBy(e.target.checked ? "servicio" : "servicio-empleado")
                }
              />
            )}

            <div className="d-flex gap-2">
              <input
                type="text"
                className="form-control"
                placeholder="Buscar..."
                value={filtroServ}
                onChange={(e) => setFiltroServ(e.target.value)}
                style={{ width: "200px" }}
              />
              
              <Button
                variant="success"
                onClick={exportarExcelNativo} 
                className="fw-bold d-flex align-items-center gap-2"
              >
                <i className="fas fa-file-excel" /> Excel (Servicios)
              </Button>
            </div>
          </div>
        </div>

        {/* CONTENIDO */}
        {isEditMode ? (
          <div className="animate__animated animate__fadeIn">
             <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
              <i className="fas fa-exclamation-triangle fs-4" />
              <div>
                <strong>Modo Edición Activado:</strong> Los cambios se guardan inmediatamente en la base de datos.
              </div>
            </div>
            <div className="table-responsive border rounded shadow-sm" style={{ maxHeight: "600px", overflowY: "auto" }}>
              <table className="table table-hover align-middle mb-0 bg-white">
                <thead className="table-warning sticky-top">
                  <tr>
                    <th style={{ width: "120px" }}>Fecha</th>
                    <th>Servicio</th>
                    <th>Colaborador Asignado</th>
                    <th className="text-end" style={{ width: "150px" }}>Monto (S/.)</th>
                    <th className="text-center" style={{ width: "120px" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {servicios
                    .filter((s) => {
                      const q = filtroServ.toLowerCase();
                      return (
                        !q ||
                        s.circus_servicio?.nombre_servicio?.toLowerCase().includes(q) ||
                        s.empleado_servicio?.nombres_apellidos_empl?.toLowerCase().includes(q)
                      );
                    })
                    .map((servicio) => (
                      <EditableRow
                        key={servicio.id}
                        item={servicio}
                        empleadosDisponibles={empleadosDisponibles}
                        serviciosDisponibles={serviciosCatalogo}
                        onSave={updateServiceBackend}
                      />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="animate__animated animate__fadeIn">
            {/* VISTA RESUMEN */}
            <h5 className="text-primary fw-bold mt-2">
              {groupBy === "servicio" ? "Resumen por Servicio" : "Resumen Detallado (Servicio + Colaborador)"}
            </h5>
            <div className="table-responsive mb-4 border rounded shadow-sm" style={{ maxHeight: "350px", overflowY: "auto" }}>
              <table className="table table-sm table-striped align-middle mb-0">
                <thead className="table-dark sticky-top">
                  <tr>
                    <th>#</th>
                    <th>Servicio</th>
                    <th>Colaborador</th>
                    <th className="text-end">Cantidad</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsResumen
                    .filter((it) => {
                      const q = filtroServ.toLowerCase();
                      return !q || it.servicio.toLowerCase().includes(q) || it.empleado.toLowerCase().includes(q);
                    })
                    .map((it, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{it.servicio}</td>
                        <td className={it.empleado === "—" ? "text-muted fst-italic" : ""}>{it.empleado}</td>
                        <td className="text-end">{it.cantidad}</td>
                        <td className="text-end">
                          <SymbolSoles size={14} bottomClasss={"4"} numero={<NumberFormatMoney amount={it.total} />} />
                        </td>
                        <td className="text-end">
                          <SymbolSoles size={14} bottomClasss={"4"} numero={<NumberFormatMoney amount={it.total / (it.cantidad || 1)} />} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="row">
              {/* RANKING COLABORADORES */}
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h5 className="text-primary fw-bold m-0">Ranking Colaboradores</h5>
                  <div className="btn-group btn-group-sm">
                    <Button variant={sortServBy === 'total' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('total')}>Monto</Button>
                    <Button variant={sortServBy === 'promedio' ? 'primary' : 'outline-primary'} onClick={() => toggleSort('promedio')}>Ticket</Button>
                  </div>
                </div>
                <div className="table-responsive border rounded shadow-sm" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-primary sticky-top">
                      <tr>
                        <th>#</th>
                        <th>Colaborador</th>
                        <th className="text-end">Monto</th>
                        <th className="text-end">Cant.</th>
                        <th className="text-end">Promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingServ
                        .filter(r => !filtroServ || r.colaborador.toLowerCase().includes(filtroServ.toLowerCase()))
                        .map((r, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td className="fw-bold">{r.colaborador}</td>
                            <td className="text-end text-success fw-bold">
                              <SymbolSoles size={14} bottomClasss={'4'} numero={<NumberFormatMoney amount={r.total} />} />
                            </td>
                            <td className="text-end">{r.cantidad}</td>
                            <td className="text-end"><NumberFormatMoney amount={r.promedio} /></td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};