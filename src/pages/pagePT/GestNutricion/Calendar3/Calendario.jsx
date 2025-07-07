import React, { useMemo, useState } from 'react'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { Calendar, dateFnsLocalizer, momentLocalizer } from 'react-big-calendar';
import { startOfWeek, getDay, format, parse } from 'date-fns';
import 'dayjs/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { es } from 'date-fns/locale';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import { ModalCustomEvento } from '../Calendar2/ModalCustomEvento';
dayjs.locale('es')
const locales = {
  'es': es,
};
const DragAndDropCalendar = withDragAndDrop(Calendar);

 // Componente personalizado para las celdas de tiempo
 const TimeSlotWrapper = ({ children, value }) => {
  const day = value.getDay(); // Obtener el día de la semana (0 = domingo, 6 = sábado)
  const hour = value.getHours(); // Obtener la hora del día
  const minutes = value.getMinutes(); // Obtener los minutos

  // Deshabilitar filas en sábado de 1pm a 6:30pm
  if (
    day === 6 && // Sábado
    (
      (hour === 13) || // 1pm
      (hour > 13 && hour < 18) || // De 2pm a 5pm
      (hour === 18 && minutes === 0) // 6pm exacto
    )
  ) {
    return (
      <div style={{ backgroundColor: '#e0e0e0', pointerEvents: 'none', display: 'none' }}>
        {children}
      </div>
    );
  }

  return children;
};
const eventStyleGetter = (event, start, end, isSelected) => {
  const style = {
    color: 'black',
    fontFamily: '"Poppins", sans-serif',
    fontWeight: '400',
    borderRadius: '0px',
    border: 'none',
    padding: '2px 4px',
    fontSize: '15px',
  };
  let className = ''
  if (event.status_cita==="500") {
    className = 'leyenda-confirmada'
  }
  if(event.status_cita=="501"){
    className = 'leyenda-asistio'
  }
  if(event.status_cita=="502"){
    className = 'leyenda-no-asistio'
  }
  if(event.status_cita=="503"){
    className = 'leyenda-cancelada'
  }
  return {
    style: style,
    className: className
  };
};
export const Calendario = () => {
      const [selectDATE, setselectDATE] = useState({start: '', end: ''})
      const [onModalAddEditEvent, setonModalAddEditEvent] = useState(false)
      const [idCita, setidCita] = useState(0)
      const { minutosperCita } = useSelector(i=>i.ui)
    const { defaultDate, formats, views } = useMemo(
      () => ({
        defaultDate: new Date(2015, 3, 13),
        formats: {
          timeGutterFormat: (date, culture, localizer) =>
            localizer.format(date, 'hh:mm a', culture),
        },
      }),
      []
    )
    
      const onCloseModalAddEditEvent = ()=>{
        setonModalAddEditEvent(false)
      }
    const localizer = dateFnsLocalizer({
      format: (date, formatStr, locale) => format(date, formatStr, { locale: locales['es'] }),
      parse: (dateString, formatString, locale) => parse(dateString, formatString, new Date(), { locale: locales['es'] }),
      startOfWeek: (date, locale) => startOfWeek(date, { locale: locales['es'] }),
      getDay: (date, locale) => {
        const day = getDay(date);
        // Ajusta el día para que comience desde el lunes (0 para domingo, 1 para lunes, ..., 6 para sábado)
        return day
      },
      locales,
      formats: {
        timeGutterFormat: (date, culture, localizer) =>
          localizer.format(date, 'h:mm A', culture), // Formato de hora con AM/PM
      },
      culture: 'es',
    });
    
      const onDoubleSelectEvent = (e)=>{
        const dateSelect = {start: new Date(e.start), end: new Date(e.end)}
        setidCita(e.id)
        setonModalAddEditEvent(true)
        setselectDATE({...dateSelect})
      }
      
      const handleSelectSlot = (slotInfo) => {
        setidCita(0)
        
        // const dateSelect = {start: new Date(start), end: new Date(end)}
        // Crear un nuevo evento con un único slot
        const newEvent = {
          start: slotInfo.start,
          end: dayjs(slotInfo.start).add(minutosperCita.value, 'minute').toDate(), // Duración fija de 20 minutos usando dayjs
          minD: minutosperCita.value,
          title: 'Nuevo evento',
        };
        // console.log("hand", slotInfo);
        setonModalAddEditEvent(true)
        setselectDATE({...newEvent})
      };
    //   const handleEventDrop = async({ event, start, end, allDay }) => {
    //     // Determinar la semana del nuevo inicio (puedes ajustar esta lógica según tus necesidades)
    //     const startWeek = moment(start).week();

    //     // Contar eventos en la misma semana (excluyendo el que se está moviendo)
    //     const eventsInWeek = newData.filter(
    //       e => moment(e.start).week() === startWeek && e.id !== event.id
    //     );

    //     const targetDate = moment(start).format('YYYY-MM-DD');
    //     const eventsInCell = newData.filter(
    //       e => moment(e.start).format('YYYY-MM-DD') === targetDate && e.id !== event.id
    //     );
    //     const isEventCell = await existeFechaInicio(eventsInCell, start, end)
    //     if (isEventCell) {
    //       alert('No se pueden mezclar más de dos eventos en la misma celda de semana.');
    //       return; // Cancela el drop
    //     }
    //     await confirmDialog({
    //                     message: `Seguro que quieres actualizar la cita al ${start}?`,
    //                     header: 'Actualizar fecha de cita',
    //                     icon: 'pi pi-info-circle',
    //                     defaultFocus: 'reject',
    //                     acceptClassName: 'p-button-danger',
    //                     accept:  ()=>{
    //                       onPutCita({fecha_init: start, fecha_final: end, id: event.id, isUpdateTime: true}, tipo_serv)
    //                       return 
    //                     },
    //                 });
    //     // Si la validación pasa, actualiza el evento con las nuevas fechas
    //     // const updatedEvent = { ...event, start, end, allDay };
    //     // const nextEvents = events.map(e => (e.id === event.id ? updatedEvent : e));
    //     // setevents(nextEvents);
    //   };
  return (
    
              <div id="calendar">
                <DragAndDropCalendar
                  localizer={localizer}
                  events={[]}
                  onDoubleClickEvent={onDoubleSelectEvent}
                //   onEventDrop={handleEventDrop}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: 700 }}
                //   views={['week']}
                  eventPropGetter={eventStyleGetter}
                  defaultView="week"
                  components={{
                    event: CustomEvent,  // Utiliza el componente personalizado para mostrar solo el título del evento
                    // timeSlotWrapper 
                    timeSlotWrapper: TimeSlotWrapper,
                  }}
                  messages={{
                    next: "SEMANA SIGUIENTE",
                    today: "Hoy",
                    previous: "SEMANA ANTERIOR",
                    month: "Mes",
                    week: "Semana",
                    day: "Día",
                    agenda: "Agenda",
                    // showMore: total => `+ Ver más (123)`
                  }}
                  step={10}
                  timeslots={1}
                  min={new Date(2024, 0, 1, 8, 0, 0)} // Mostrar desde las 6:00 AM
                  max={new Date(2024, 0, 1, 21, 50, 0)} // Hasta las 11:59 PM
                  formats={formats}
                  onSelectSlot={handleSelectSlot}
                  selectable="ignoreEvents"
                />
                
                <ModalCustomEvento
                    resor={[]}
                    show={onModalAddEditEvent}
                    onShowCustomEvento={()=>setonModalAddEditEvent(true)}
                    onHide={onCloseModalAddEditEvent}
                />
              </div>
  )
}
