import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles';
import { CurrencyMask, NumberFormatMoney } from '@/components/CurrencyMask';
import { useTerminoStore } from '@/hooks/hookApi/useTerminoStore';
import { useForm } from '@/hooks/useForm';
import { onAddItemsCarrito } from '@/store';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog'
import { InputNumber } from 'primereact/inputnumber';
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import Select from 'react-select';
const regAgregarCarrito = {
  id_empl: 0,
  monto_descuento: 0.00,
  cantidad: 1,
  porcentaje_descuento: 0
}
export const ModalAgregarCarrito = ({ show, onHide, servSelect }) => {
  const { obtenerEmpleadosxCargoxDepartamentoxEmpresa:obtenerEmpleadosxEstilistas, DataVendedores:dataEstilistas } = useTerminoStore();
  const { obtenerEmpleadosxCargoxDepartamentoxEmpresa:obtenerEmpleadosxAsistentesEstilistas, DataVendedores:dataAsistentesEstilistas } = useTerminoStore();
  const { obtenerEmpleadosxCargoxDepartamentoxEmpresa:obtenerEmpleadosxAsistentesManicuristas, DataVendedores:dataManicuristas } = useTerminoStore();
  const { obtenerEmpleadosxCargoxDepartamentoxEmpresa:obtenerEmpleadosJefesDeSalon, DataVendedores:dataJefesDeSalon } = useTerminoStore();
  const { obtenerEmpleadosxCargoxDepartamentoxEmpresa:obtenerRecepcionistas, DataVendedores:dataRecepcionista } = useTerminoStore();
  const [montoTotal, setMontoTotal] = useState(servSelect?.monto_default); // Estado para monto calculado
  const dispatch = useDispatch()
  const { formState, id_empl, cantidad, monto_descuento, porcentaje_descuento, onInputChange, onInputChangeReact, onInputChangeFunction, onResetForm } = useForm(regAgregarCarrito);
  const [labelSelectEmpl, setlabelSelectEmpl] = useState('')
  useEffect(() => {
    if(show){
      obtenerEmpleadosxEstilistas(26, 5, 599);
      obtenerEmpleadosxAsistentesEstilistas(27, 5, 599)
      obtenerEmpleadosxAsistentesManicuristas(62, 5, 599)
      obtenerEmpleadosJefesDeSalon(29, 5, 599)
      obtenerRecepcionistas(63, 5, 599)
    }
        // Si hay un empleado por defecto, lo seteamos en el formState
    if (servSelect?.id_empl) {
      onInputChangeFunction("id_empl", servSelect?.id_empl);
    }
  }, [show]);

  const dataCargos = [
    ...dataEstilistas,
    ...dataAsistentesEstilistas,
    ...dataManicuristas,
    ...dataJefesDeSalon,
    ...dataRecepcionista
  ]
    // Función para manejar cambios en cantidad y restringir valores
    const handleCantidadChange = (e) => {
      let value = e.target.value; // Convertir a número
      console.log(value);
      if(value<3){
        return onInputChange(e);
      }
      onInputChange(e);
    };

  useEffect(() => {
    let nuevoMonto = servSelect?.monto_default;

    // Aplicar descuento en soles
    if (monto_descuento) {
      nuevoMonto -= parseFloat(monto_descuento) || 0;
    }

    // Aplicar descuento en porcentaje
    if (porcentaje_descuento) {
      nuevoMonto -= (nuevoMonto * (parseFloat(porcentaje_descuento) || 0)) / 100;
    }

    // Multiplicar por la cantidad
    nuevoMonto *= parseInt(cantidad) || 1;

    setMontoTotal(nuevoMonto);
  }, [monto_descuento, porcentaje_descuento, cantidad, show]);
  const onCloseAgregarCarrito = ()=>{
    onHide()
    onResetForm()
  }
  const onClickAgregarItemsAlCarrito = ()=>{
    dispatch(onAddItemsCarrito({...formState, monto_default: servSelect?.monto_default, labelSelectEmpl: dataCargos.find((option) => option.value === (id_empl))?.label, labelServ: servSelect?.labelServ, uid: servSelect?.uid, id_servicio: servSelect?.id, tipo: servSelect?.tipo}))
    onCloseAgregarCarrito()
  }
  
  const footerTemplate = (
    <div className="">
      <h1 className="float-start">
        TOTAL: <SymbolSoles isbottom numero={<NumberFormatMoney amount={montoTotal} />} />
      </h1>
      <Button label="AGREGAR" onClick={onClickAgregarItemsAlCarrito}/>
    </div>
  );

  const headerTemplate =(
    <>
    QUE LO VEA CARLOS SI ESTO ES CERO: 
    {servSelect?.labelServ}
    </>
  )

  
  
  return (
    <Dialog footer={footerTemplate} style={{ width: "40rem", height: "50rem" }} header={headerTemplate} visible={show} onHide={onCloseAgregarCarrito}>
      <div className="m-2">
        {/* <label className="form-label">COLABORADOR</label> */}
        <Select
          onChange={(e) => {
            onInputChangeReact(e, "id_empl")
          }}
          name="id_empl"
          placeholder={"Seleccionar el colaborador"}
          className="border-2 rounded-3 border-primary outline-none"
          // classNamePrefix="react-select"
          options={dataCargos}
          value={dataCargos.find((option) => option.value === (id_empl)) || null}
          required
        />
      </div>
      <div className="m-2">
        {/* <label className="form-label">CANTIDAD</label> */}
        <input placeholder='CANTIDAD' value={cantidad} max={4} name="cantidad" onChange={handleCantidadChange} type="number"
                          className='border-2 rounded-3 border-primary w-100 p-1 outline-none border-gray-300 fw-bold font-13 p-2'
         />
      </div>
      <div className="m-2">
        {/* <label className="form-label">DESCUENTO EN S/.</label> */}
        <input placeholder='DESCUENTO EN S/.' className='border-2 rounded-3 border-primary w-100 p-1 outline-none border-gray-300 fw-bold font-13 p-2'
 id="monto_descuento" name="monto_descuento" value={monto_descuento} onChange={(e) => onInputChange(e)} required />
      </div>
      <div className="m-2">
        {/* <label className="form-label">DESCUENTO EN %</label> */}
        <input placeholder='DESCUENTO EN %'
                          className='border-2 rounded-3 border-primary w-100 p-1 outline-none border-gray-300 fw-bold font-13 p-2'
        type="number" value={porcentaje_descuento} name="porcentaje_descuento" onChange={onInputChange} />
      </div>
    </Dialog>
  );
};