import React, { useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { NumberFormatMoney } from '@/components/CurrencyMask';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useComandasStore } from './useComandasStore';
import { useForm } from '@/hooks/useForm';

// ---------- utils ----------
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const toNum = (v, d = 0) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : d;
};
const round2 = (n) => Math.round(n * 100) / 100;
const toStr = (v) => (v == null ? null : String(v));

// ---------- estado inicial para useForm ----------
const regAgregarCarrito = {
  id_empl: null,
  id_servicio: null,
  cantidad: 1,
  descuentoSoles: 0,
  descuentoPorc: 0,
  lastEdited: null, // 'soles' | 'porc' | null
};

export const ModalCustomClase = ({ show, onHide, id_venta=16735 }) => {
  const { obtenerServicios, dataView, onPostServiciosVenta } = useComandasStore();

  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxEstilistas,
    DataVendedores: dataEstilistas,
  } = useTerminoStore();

  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxAsistentesEstilistas,
    DataVendedores: dataAsistentesEstilistas,
  } = useTerminoStore();

  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxAsistentesManicuristas,
    DataVendedores: dataManicuristas,
  } = useTerminoStore();

  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosJefesDeSalon,
    DataVendedores: dataJefesDeSalon,
  } = useTerminoStore();

  // -------- useForm ----------
  const {
    formState,
    onInputChange,
    onInputChangeReact,
    onInputChangeFunction,
    onResetForm,
  } = useForm(regAgregarCarrito);

  const { id_empl, id_servicio, cantidad, descuentoSoles, descuentoPorc, lastEdited } = formState;

  // -------- Cargas al abrir ----------
  useEffect(() => {
    if (show) {
      obtenerEmpleadosxEstilistas(26, 5, 599);
      obtenerEmpleadosxAsistentesEstilistas(27, 5, 599);
      obtenerEmpleadosxAsistentesManicuristas(62, 5, 599);
      obtenerEmpleadosJefesDeSalon(29, 5, 599);
      obtenerServicios();
    }
  }, [show]);

  // -------- Normalizar opciones: value siempre string; precio robusto ----------
  const servicios = useMemo(
    () =>
      (dataView ?? []).map((o) => ({
        ...o,
        value: toStr(o.value),
        // toma el primer campo de precio disponible
        precio_norm:
          toNum(o.precio_venta) ||
          toNum(o.precio) ||
          toNum(o.monto_default) ||
          0,
      })),
    [dataView]
  );

  const estilistas = useMemo(
    () => (dataEstilistas ?? []).map((o) => ({ ...o, value: toStr(o.value) })),
    [dataEstilistas]
  );
  const asistentesEstilistas = useMemo(
    () => (dataAsistentesEstilistas ?? []).map((o) => ({ ...o, value: toStr(o.value) })),
    [dataAsistentesEstilistas]
  );
  const manicuristas = useMemo(
    () => (dataManicuristas ?? []).map((o) => ({ ...o, value: toStr(o.value) })),
    [dataManicuristas]
  );
  const jefesSalon = useMemo(
    () => (dataJefesDeSalon ?? []).map((o) => ({ ...o, value: toStr(o.value) })),
    [dataJefesDeSalon]
  );

  const dataCargos = useMemo(
    () => [...estilistas, ...asistentesEstilistas, ...manicuristas, ...jefesSalon],
    [estilistas, asistentesEstilistas, manicuristas, jefesSalon]
  );

  // -------- Derivados (precio, subtotal, total) ----------
  const servicioSeleccionado = useMemo(
    () => servicios.find((o) => o.value === toStr(id_servicio)) ?? null,
    [servicios, id_servicio]
  );

  const precioUnit = toNum(servicioSeleccionado?.precio_norm, 0);
  const qty = clamp(toNum(cantidad, 1), 1, 9999);
  const subTotal = round2(precioUnit * qty);

  const dSoles = clamp(round2(toNum(descuentoSoles, 0)), 0, subTotal);
  const dPorc = clamp(round2(toNum(descuentoPorc, 0)), 0, 100);
  const total = round2(subTotal - dSoles);

  // -------- Enlace bidireccional descuentos ----------
  const setBothBySoles = (nuevoSoles) => {
    const soles = clamp(round2(toNum(nuevoSoles, 0)), 0, subTotal);
    const porc = subTotal > 0 ? round2((soles / subTotal) * 100) : 0;
    onInputChangeFunction('descuentoSoles', soles);
    onInputChangeFunction('descuentoPorc', porc);
    onInputChangeFunction('lastEdited', 'soles');
  };

  const setBothByPorc = (nuevoPorc) => {
    const porc = clamp(round2(toNum(nuevoPorc, 0)), 0, 100);
    const soles = round2((subTotal * porc) / 100);
    onInputChangeFunction('descuentoPorc', porc);
    onInputChangeFunction('descuentoSoles', soles);
    onInputChangeFunction('lastEdited', 'porc');
  };

  // Recalcular cuando cambie precio/cantidad/servicio respetando lo último editado
  useEffect(() => {
    if (!show) return;
    if (lastEdited === 'soles') {
      setBothBySoles(dSoles);
    } else if (lastEdited === 'porc') {
      setBothByPorc(dPorc);
    } else {
      if (id_servicio) {
        onInputChangeFunction('descuentoSoles', null);
        onInputChangeFunction('descuentoPorc', null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precioUnit, qty, id_servicio, show]);

  // -------- Handlers ----------
  const handleSelectEmpleado = (opt) => {
    onInputChangeReact(opt, 'id_empl'); // tu hook guarda opt.value
  };

  const handleSelectServicio = (opt) => {
    onInputChangeReact(opt, 'id_servicio');
  };

  const handleCantidad = (e) => {
    const v = clamp(parseInt(e.target.value || '1', 10), 1, 9999);
    onInputChange({ target: { name: 'cantidad', value: v } });
  };

  const handleDescSoles = (e) => setBothBySoles(e.target.value);
  const handleDescPorc = (e) => setBothByPorc(e.target.value);

  const onClose = () => {
    onHide?.();
    onResetForm();
  };

  const onAgregar = () => {
    onPostServiciosVenta(id_venta, {...formState, tarifa_monto: total})
    onClose();
  };

  const footerTemplate = (
    <div className="d-flex align-items-center justify-content-between w-100">
      <h3 className="m-0">
        TOTAL:{' '}
        <SymbolSoles isbottom numero={<NumberFormatMoney amount={total} />} />
      </h3>
      <Button
        label="AGREGAR"
        onClick={onAgregar}
        disabled={!id_servicio || !id_empl}
      />
    </div>
  );

  return (
    <Dialog
      header="AGREGAR SERVICIO"
      footer={footerTemplate}
      style={{ width: '40rem', height: 'auto', maxWidth: '95vw' }}
      visible={show}
      onHide={onClose}
      blockScroll
      modal
    >
      <div className="m-2">
        <label className="form-label">COLABORADOR</label>
        <Select
          name="id_empl"
          placeholder="Seleccionar el colaborador"
          className="react-select"
          classNamePrefix="react-select"
          options={dataCargos}
          value={dataCargos.find((o) => o.value === toStr(id_empl)) ?? null}
          onChange={handleSelectEmpleado}
          isClearable
        />
      </div>

      <div className="m-2">
        <label className="form-label">SERVICIO</label>
        <Select
          name="id_servicio"
          placeholder="Seleccionar el servicio"
          className="react-select"
          classNamePrefix="react-select"
          options={servicios}
          value={servicios.find((o) => o.value === toStr(id_servicio)) ?? null}
          onChange={handleSelectServicio}
          isClearable
        />
        <small className="text-muted d-block mt-1">
          Precio unitario:{' '}
          <SymbolSoles isbottom numero={<NumberFormatMoney amount={precioUnit} />} />
        </small>
      </div>

      <div className="m-2">
        <label className="form-label">CANTIDAD</label>
        <input
          type="number"
          min={1}
          step={1}
          value={qty}
          onChange={handleCantidad}
          className="form-control"
        />
      </div>

      <div className="m-2">
        <label className="form-label">DESCUENTO EN S/</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={dSoles}
          onChange={handleDescSoles}
          className="form-control"
          // habilitado si hay servicio seleccionado, sin depender de subTotal
          disabled={!id_servicio}
        />
        <small className="text-muted">
          Subtotal:{' '}
          <SymbolSoles isbottom numero={<NumberFormatMoney amount={subTotal} />} /> — Máx. descuento:{' '}
          <SymbolSoles isbottom numero={<NumberFormatMoney amount={subTotal} />} />
        </small>
      </div>

      <div className="m-2">
        <label className="form-label">DESCUENTO EN %</label>
        <input
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={dPorc}
          onChange={handleDescPorc}
          className="form-control"
          // habilitado si hay servicio seleccionado
          disabled={!id_servicio}
        />
      </div>

      <div className="m-2">
        <div className="d-flex justify-content-between">
          <span>
            Subtotal:{' '}
            <SymbolSoles isbottom numero={<NumberFormatMoney amount={subTotal} />} />
          </span>
          <span>
            Descuento:{' '}
            <SymbolSoles isbottom numero={<NumberFormatMoney amount={dSoles} />} /> ({dPorc}%)
          </span>
          <strong>
            Total:{' '}
            <SymbolSoles isbottom numero={<NumberFormatMoney amount={total} />} />
          </strong>
        </div>
      </div>
    </Dialog>
  );
};
