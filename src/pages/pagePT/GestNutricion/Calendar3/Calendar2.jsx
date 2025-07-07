import React, { useEffect, useState } from 'react'
import { useCalendarStore } from '../Calendar2/useCalendarStore'
import { DateMaskString } from '@/components/CurrencyMask';
import dayjs from 'dayjs';
import { Calendario } from './Calendario';

export const Calendar2 = () => {
    const { dataEmpleados, obtenerEmpleadosxDepartamento, obtenerEventoServicioxEmpresa  } = useCalendarStore()
        const [currentDate, setCurrentDate] = useState((DateMaskString(new Date().toISOString().slice(0, 10), 'YYYY-MM-DD', 'YYYY-MM-DD')));
    useEffect(() => {
      obtenerEmpleadosxDepartamento()
      obtenerEventoServicioxEmpresa(599, new Date(dayjs(currentDate).toISOString()))
      // console.log("aquii obbb", new Date(currentDate), {e: new Date(dayjs(currentDate).toISOString())});
    }, [currentDate])
  return (
    <div>
      <Calendario/>
      {/* <ItemEmpleado dataEmpleados={dataEmpleados[0]}/> */}
    </div>
  )
}

const ItemEmpleado = ({dataEmpleados})=>{
  return (
    <div>
      <div>
        {
          JSON.stringify(dataEmpleados)
        }
      </div>
    </div>
  )
}
