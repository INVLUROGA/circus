// DropWrapper.jsx
import { useDrop } from 'react-dnd';
import React from 'react';
import dayjs from 'dayjs';
import { useCalendarStore } from './useCalendarStore';
import { confirmDialog } from 'primereact/confirmdialog';
import { DateMask } from '@/components/CurrencyMask';

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

      // Obtener la posición del drop dentro de la cuadrícula
      const yInViewport = clientOffset.y - scrollRef.current.getBoundingClientRect().top;
      const yContent = yInViewport + scrollRef.current.scrollTop;
      const yHours = yContent - headerHeight;

      // Calcular la hora de inicio desde la parte superior del contenedor del evento
      const minutosDesdeInicio = Math.round(yHours / minuteHeight);
      const horaInicio = startHour * 60 + minutosDesdeInicio;
      const nuevaHora = dayjs(date).startOf('day').add(horaInicio, 'minute');

      // Calcular la duración del evento y la nueva hora de fin
      const duracionMin = dayjs(item.end).diff(dayjs(item.start), 'minute');
      const nuevaHoraFin = nuevaHora.add(duracionMin, 'minute');

      const eventoModificado = {
        ...item,
        start: nuevaHora.toISOString(),
        end: nuevaHoraFin.toISOString(),
        id_empl: r.resourceId,
      };

      const accept = () => {
        console.log("evento modificado", {eventoModificado, startHour, minutosDesdeInicio, nuevaHora: DateMask({date: nuevaHora}), horaFin: DateMask({date: nuevaHoraFin})});
        // Puedes actualizar el evento aquí, por ejemplo:
        putEventoServicioxEmpresa({fecha_fin: DateMask({date: nuevaHoraFin}), fecha_inicio: DateMask({date: nuevaHora}), id_empl: r.resourceId}, null, dayjs(date), item.id)
      };
      const reject = () => {
        // Manejar el rechazo de la modificación aquí
      };

      confirmDialog({
        message: 'ESTÁS SEGURO QUE QUIERES MODIFICAR?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        defaultFocus: 'accept',
        accept,
        reject
      });
    },
  }));

  return (
    <div ref={dropRef} style={{ position: 'relative', cursor: 'pointer', height: `${timesHeight}px` }}>
      {children}
    </div>
  );
};
