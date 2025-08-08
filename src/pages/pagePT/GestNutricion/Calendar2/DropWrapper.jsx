// DropWrapper.jsx
import { useDrop } from 'react-dnd';
import React from 'react';
import dayjs from 'dayjs';
import { useCalendarStore } from './useCalendarStore';
import { confirmDialog } from 'primereact/confirmdialog';

export const DropWrapper = ({
  r,
  date,
  startHour,
  minuteHeight,
  headerHeight,
  onOpenModalCustomEvento,
  timesHeight,
  children,
  scrollRef
}) => {
  const { putEventoServicioxEmpresa } = useCalendarStore()
  const [, dropRef] = useDrop(() => ({
    accept: 'EVENT',
    drop: (item, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset || !scrollRef.current) return;

      const yInViewport = clientOffset.y - scrollRef.current.getBoundingClientRect().top;
      const yContent = yInViewport + scrollRef.current.scrollTop;
      const yHours = yContent - headerHeight;

      const minutosDesdeInicio = Math.round(yHours / minuteHeight);
      const horaInicio = startHour * 60 + minutosDesdeInicio;
      const nuevaHora = dayjs(date).startOf('day').add(horaInicio, 'minute');
      const duracionMin = dayjs(item.end).diff(dayjs(item.start), 'minute');
      const nuevaHoraFin = nuevaHora.add(duracionMin, 'minute');

      const eventoModificado = {
        ...item,
        start: nuevaHora.toISOString(),
        end: nuevaHoraFin.toISOString(),
        id_empl: r.resourceId,
      };
      console.log("evento modificado", {eventoModificado, startHour: startHour, minutosDesdeInicio, nuevaHora: nuevaHora.toISOString(), horaFin: nuevaHoraFin.toISOString()});
      
      const accept = () => {
              putEventoServicioxEmpresa({fecha_fin: nuevaHoraFin.toISOString(), fecha_inicio: nuevaHora.toISOString(), id_empl: r.resourceId}, null, nuevaHora.toISOString(), item.id)
          // toast.current.show({ severity: 'info', summary: 'Confirmed', detail: 'You have accepted', life: 3000 });
      }
      const reject = () => {
          // toast.current.show({ severity: 'warn', summary: 'Rejected', detail: 'You have rejected', life: 3000 });
      }
      //   onOpenModalCustomEvento(eventoModificado);
          confirmDialog({
              message: 'ESTAS SEGURO QUE QUIERES MODIFICAR?',
              header: 'Confirmation',
              icon: 'pi pi-exclamation-triangle',
              defaultFocus: 'accept',
              accept, 
              reject
          });
      // onOpenModalCustomEvento(eventoModificado);
    },
  }));

  return (
    <div ref={dropRef} style={{ position: 'relative', cursor: 'pointer', height: `${timesHeight}px` }}>
      {children}
    </div>
  );
};
