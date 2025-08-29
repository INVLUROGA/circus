import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { NumberFormatMoney } from '@/components/CurrencyMask';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useForm } from '@/hooks/useForm';
import { onAddItemsCarrito } from '@/store';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import Select from 'react-select';

const regAgregarCarrito = {
  id_empl: 0,
  monto_descuento: 0,
  cantidad: 1,
  porcentaje_descuento: 0
};

const PCTS = [0, 5, 10, 15, 20, 25, 30, 40, 50];

export const ModalAgregarCarrito = ({ show, onHide, servSelect }) => {
  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxEstilistas,
    DataVendedores: dataEstilistas
  } = useTerminoStore();
  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxAsistentesEstilistas,
    DataVendedores: dataAsistentesEstilistas
  } = useTerminoStore();
  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosxAsistentesManicuristas,
    DataVendedores: dataManicuristas
  } = useTerminoStore();
  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerEmpleadosJefesDeSalon,
    DataVendedores: dataJefesDeSalon
  } = useTerminoStore();
  const {
    obtenerEmpleadosxCargoxDepartamentoxEmpresa: obtenerRecepcionistas,
    DataVendedores: dataRecepcionista
  } = useTerminoStore();

  const dispatch = useDispatch();

  const {
    formState,
    id_empl,
    cantidad,
    monto_descuento,
    porcentaje_descuento,
    onInputChange,
    onInputChangeReact,
    onInputChangeFunction,
    onResetForm
  } = useForm(regAgregarCarrito);

  const [montoTotal, setMontoTotal] = useState(servSelect?.monto_default ?? 0);

  // Combina todos los cargos en un solo select
  const dataCargos = useMemo(
    () => [
      ...(dataEstilistas || []),
      ...(dataAsistentesEstilistas || []),
      ...(dataManicuristas || []),
      ...(dataJefesDeSalon || []),
      ...(dataRecepcionista || [])
    ],
    [dataEstilistas, dataAsistentesEstilistas, dataManicuristas, dataJefesDeSalon, dataRecepcionista]
  );

  // Cargar data cuando se abre el modal
  useEffect(() => {
    if (show) {
      obtenerEmpleadosxEstilistas(26, 5, 599);
      obtenerEmpleadosxAsistentesEstilistas(27, 5, 599);
      obtenerEmpleadosxAsistentesManicuristas(62, 5, 599);
      obtenerEmpleadosJefesDeSalon(29, 5, 599);
      obtenerRecepcionistas(63, 5, 599);
      // reset y set defaults por si cambias de servicio
      onResetForm();
      if (servSelect?.id_empl) onInputChangeFunction('id_empl', servSelect.id_empl);
      onInputChangeFunction('cantidad', 1);
      onInputChangeFunction('porcentaje_descuento', 0);
      onInputChangeFunction('monto_descuento', 0);
      setMontoTotal(servSelect?.monto_default ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, servSelect?.uid]);

  // Cálculo del total
  useEffect(() => {
    const base = Number(servSelect?.monto_default ?? 0);
    const cant = Math.min(4, Math.max(1, parseInt(cantidad || 1, 10)));
    const descSoles = Number(monto_descuento || 0);
    const pct = Math.max(0, Math.min(100, Number(porcentaje_descuento || 0)));

    let unit = base - descSoles;
    unit = unit - (unit * pct) / 100;
    const total = Math.max(0, unit * cant); // nunca negativo
    setMontoTotal(total);
  }, [monto_descuento, porcentaje_descuento, cantidad, servSelect?.monto_default]);

  // ==== Handlers ONCLICK ====
  const decCantidad = () => {
    const next = Math.max(1, Number(cantidad || 1) - 1);
    onInputChangeFunction('cantidad', next);
  };
  const incCantidad = () => {
    const next = Math.min(4, Number(cantidad || 1) + 1);
    onInputChangeFunction('cantidad', next);
  };
  const setCantidad = (n) => onInputChangeFunction('cantidad', Math.min(4, Math.max(1, n)));

  const setPorcentaje = (p) => onInputChangeFunction('porcentaje_descuento', p);

  const onCloseAgregarCarrito = () => {
    onHide();
    onResetForm();
  };

  const onClickAgregarItemsAlCarrito = () => {
    const labelEmpleado = dataCargos.find((o) => o.value === id_empl)?.label || '';
    dispatch(
      onAddItemsCarrito({
        ...formState,
        cantidad: Math.min(4, Math.max(1, Number(cantidad || 1))),
        monto_default: servSelect?.monto_default,
        labelSelectEmpl: labelEmpleado,
        labelServ: servSelect?.labelServ,
        uid: servSelect?.uid,
        id_servicio: servSelect?.id || servSelect?.id_servicio,
        tipo: servSelect?.tipo
      })
    );
    onCloseAgregarCarrito();
  };

  const footerTemplate = (
    <div className="flex justify-content-between align-items-center w-100">
      <h2 className="m-0">
        TOTAL:{' '}
        <SymbolSoles isbottom numero={<NumberFormatMoney amount={montoTotal} />} />
      </h2>
      <Button label={`AGREGAR (${cantidad || 1})`} onClick={onClickAgregarItemsAlCarrito} />
    </div>
  );

  const headerTemplate = (
    <>
    {JSON.stringify(servSelect, 2, null)}
      {servSelect?.labelServ}
    </>
  );

  return (
    <Dialog
      footer={footerTemplate}
      style={{ width: '40rem', height: 'auto' }}
      header={headerTemplate}
      visible={show}
      onHide={onCloseAgregarCarrito}
      modal
    >
      {/* Colaborador */}
      <div className="m-2">
        <Select
          onChange={(e) => onInputChangeReact(e, 'id_empl')}
          name="id_empl"
          placeholder="Seleccionar el colaborador"
          className="border-2 rounded-3 border-primary outline-none"
          options={dataCargos}
          value={dataCargos.find((o) => o.value === id_empl) || null}
          required
        />
      </div>

      {/* Cantidad con onClick */}
      <div className="m-2">
        <div className="flex gap-2 align-items-center">
          <Button
            type="button"
            icon="pi pi-minus"
            onClick={decCantidad}
            rounded
            outlined
          />
          <span className="px-3 py-2 border-round border-2 border-primary font-bold">
            {cantidad || 1}
          </span>
          <Button
            type="button"
            icon="pi pi-plus"
            onClick={incCantidad}
            rounded
            outlined
          />
          <div className="flex gap-2 ml-3">
            {[1, 2, 3, 4].map((n) => (
              <Button
                key={n}
                label={`${n}x`}
                onClick={() => setCantidad(n)}
                outlined={Number(cantidad || 1) !== n}
                severity={Number(cantidad || 1) === n ? 'primary' : undefined}
                size="small"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Descuento en soles (input libre) */}
      <div className="m-2">
        <input
          placeholder="DESCUENTO EN S/."
          className="border-2 rounded-3 border-primary w-100 p-1 outline-none border-gray-300 fw-bold font-13 p-2"
          id="monto_descuento"
          name="monto_descuento"
          value={monto_descuento}
          onChange={onInputChange}
          type="number"
          min={0}
        />
      </div>

      {/* Descuento % con onClick (chips) */}
      <div className="m-2">
        <div className="mb-2 fw-bold">DESCUENTO %</div>
        <div className="flex flex-wrap gap-2">
          {PCTS.map((p) => {
            const active = Number(porcentaje_descuento || 0) === p;
            return (
              <Button
                key={p}
                label={`${p}%`}
                onClick={() => setPorcentaje(p)}
                size="small"
                outlined={!active}
                severity={active ? 'primary' : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Resumen unitario (opcional) */}
      <div className="m-2">
        <small className="text-600">
          Precio base:{' '}
          <SymbolSoles isbottom numero={<NumberFormatMoney amount={servSelect?.monto_default || 0} />} />
          {'  '}|  Cantidad: <b>{cantidad || 1}</b>  |  % Desc: <b>{porcentaje_descuento || 0}%</b>
        </small>
      </div>
    </Dialog>
  );
};
