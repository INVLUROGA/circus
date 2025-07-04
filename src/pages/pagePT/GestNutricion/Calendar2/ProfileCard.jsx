import { DateMask } from '@/components/CurrencyMask';
import { arrayEstadosCitas } from '@/types/type';
import { Badge } from 'primereact/badge';
import React from 'react'

export const ProfileCard = ({img, dataxIdcli}) => {
  return (
    
    <div className="w-[280px] bg-white rounded-xl shadow p-3 font-sans m-1">
      <div className="flex items-center gap-3 mb-2">
        <img
          src={img} // Reemplaza con la URL o ruta local
          alt="User"
          className="w-2 h-12 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold text-gray-800 m-0">{dataxIdcli.empleado.nombre_empl.split(' ')[0]}</p>
          <p className="text-sm text-gray-500 m-0">
                                <DateMask date={dataxIdcli.start} defaultFormat={'YYYY-MM-DDThh:mm:ss.000'} format={'DD dddd [de] MMMM [DEL] YYYY [A LAS] hh:mm A'} />
            
          </p>

          <Badge className={`font-semibold ${arrayEstadosCitas.find(estado=>estado.value===dataxIdcli.id_estado).bg}`} value={arrayEstadosCitas.find(estado=>estado.value===dataxIdcli.id_estado).label}/>
        </div>
      </div>
      <div className="flex items-start">
        {
            dataxIdcli.eventos.map(evento=>{
                return(
                    <div>
                    <p className="font-semibold text-gray-800 my-1">{evento.nombre_servicio}</p>
                    <p className="text-sm text-gray-500">{evento.duracion} MIN</p>
                    </div>
                )
            })
        }
      </div>
    </div>
  );
}
