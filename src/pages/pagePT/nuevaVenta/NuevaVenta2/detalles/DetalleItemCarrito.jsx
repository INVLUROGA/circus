import { SymbolSoles } from '@/components/componentesReutilizables/SymbolSoles'
import { NumberFormatMoney } from '@/components/CurrencyMask'
import { Button } from 'primereact/button'
import React from 'react'
// Mantenemos el import de la función 'confirmDialog', pero ya no necesitamos 'ConfirmDialog' componente aquí
import { confirmDialog } from 'primereact/confirmdialog'; 

export const DetalleItemCarrito = ({c, onClickRemoveItemCarrito, onClickEditItemCarrito}) => {

  const confirmarEliminacion = () => {
    confirmDialog({
      message: '¿Estás seguro de que deseas eliminar este servicio del carrito?',
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptClassName: 'p-button-danger',
      accept: () => onClickRemoveItemCarrito(c.uid),
      reject: () => {}
    });
  };

  return (
    <div className="col-12">
        {/* HE BORRADO <ConfirmDialog /> DE AQUÍ PORQUE YA ESTÁ EN EL PADRE */}
        
          <div className="flex flex-column xl:flex-row xl:align-items-start py-1 gap-1">
              <div style={{width: '100%'}} className="flex flex-row lg:flex-row justify-content-between align-items-center xl:align-items-start lg:flex-1 gap-4">
                  <div className="flex flex-column lg:align-items-start">
                      <div className="flex flex-column gap-1">
                          <div className="text-4xl font-bold">{c.labelServ}</div>
                      </div>
                      <div className="flex flex-column">
                          <span className="flex align-items-center gap-2">
                              <i className="pi pi-user"></i>
                              <h4 className="font-semibold">{c.labelSelectEmpl.split(' ')[0]}</h4>
                          </span>
                      </div>
                      <div className="flex flex-column">
                          <span className="flex align-items-center gap-2">
                              <h4 className="font-semibold">{c.cantidad} UNID. x S/. <NumberFormatMoney amount={c.monto_default}/> = S/. <NumberFormatMoney amount={c.cantidadxMontoDefault}/></h4>
                          </span>
                      </div>
                      <div className="flex flex-column">
                          <span className="flex align-items-center gap-2">
                              <h4>DESCUENTOS: <NumberFormatMoney amount={c.monto_descuento}/></h4>
                          </span>
                      </div>
                  </div>
                  <div className="flex flex-row lg:flex-column align-items-center lg:align-items-end gap-1 lg:gap-2">
                      <span className="text-3xl font-semibold">
                          <SymbolSoles isbottom={true} numero={<NumberFormatMoney amount={c.tarifa}/>}/>
                      </span>
                      
                      <Button icon="pi pi-pencil" onClick={()=>onClickEditItemCarrito(c.uid)} label=""></Button>
                      <Button icon="pi pi-trash" severity="danger" onClick={confirmarEliminacion} label=""></Button>
                  </div>
              </div>
          </div>
      </div>
  )
}