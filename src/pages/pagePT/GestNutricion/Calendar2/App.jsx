// ScheduleTable.jsx
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { DateMask, DateMaskString, FormatoDateMask } from '@/components/CurrencyMask';
import { Chip } from 'primereact/chip';
import SimpleBar from 'simplebar-react';
import { ModalCustomEvento } from './ModalCustomEvento';
import { useCalendarStore } from './useCalendarStore';
import { arrayCargoEmpl } from '@/types/type';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import config from '@/config';
import { ModalInfoEvento } from './ModalInfoEvento';
const dividirEventosPorColumna = (eventos) => {
  const columnas = [];

  eventos.forEach((evento) => {
    let colocado = false;
    for (const columna of columnas) {
      const enConflicto = columna.some((e) =>
        (new Date(evento.start) < new Date(e.end)) &&
        (new Date(evento.end) > new Date(e.start))
      );
      if (!enConflicto) {
        columna.push(evento);
        colocado = true;
        break;
      }
    }

    if (!colocado) {
      columnas.push([evento]);
    }
  });

  return columnas; // Array de columnas, cada una con eventos que no se cruzan entre sí
};
const ResourcesTitle = ({height,lineHeight, boxShadow, onOpenModalCustomEvento, labelNombre, resource, eventosDelRecurso})=>{
  const { resourceTitle, cargo_empl, resourceId, urlImageAvatar } = resource;
    const ahora = dayjs(); // Fecha y hora actual

    const eventosPasados = eventosDelRecurso.filter(e => dayjs(e.start).isBefore(ahora));
  return (
    
            <div
              className='bg-black text-primary'
              style={{
                height: height,
                textAlign: 'center',
                background: 'rgb(249 249 249)',
                boxShadow: boxShadow,
                borderBottom: '1px solid #ccc',
                fontWeight: 'bold',
                position: 'sticky',
                top: 0,
                zIndex: 29,
                backgroundClip: 'padding-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
          <div className='text-center d-flex align-items-center'>
            <div>
              <img src={urlImageAvatar} className="rounded-circle" width={120} height={120} />
            </div>
            <div className='mx-2'>
              <div className='fs-1'>{resourceTitle.split(' ')[0]}</div>
              <div className=''>{arrayCargoEmpl.find(e=>e.value===cargo_empl)?.label}</div>
              <div className=''><span className='fs-3'>CITAS: <span className='text-ISESAC'>{eventosPasados.length}</span>/<span className='text-change'>{eventosDelRecurso.length}</span></span> </div>
            </div>
            <div>
              {/* <Button className='m-1 p-1' onClick={()=>onOpenModalCustomEvento(resource)}>Agregar evento</Button> */}
              {/* <Button className='m-1 p-1'>Todo los eventos</Button> */}
            </div>
          </div>
            </div>
  )
}

const getEstado = (status) => {
    
    switch (status) {
        case '500':
            return 'leyenda-confirmada';
        case '501':
            return 'leyenda-cancelada';
  
        case '502':
            return 'leyenda-asistio';
        case '503':
            return 'leyenda-no-asistio'
        default:
          return 'leyenda-null'
    }
  };
const EventItem = ({start, end, top,
height,
title,
onOpenModalInfoEvento,
e})=>{
  // console.log({tiene: e});
  
  return (
    <div
  key={e.title}
  className={`${getEstado(`${e.id_estado}`)} `}
  onClick={()=>onOpenModalInfoEvento(e)}
  style={{
  cursor: 'pointer',
  position: 'absolute',
  top: top,
  left: 4,
  right: 4,
  height: height,
  background: '#99CCF8',
  borderRadius: 3,
  padding: '0 2px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  overflowX: 'hidden',
  borderLeft: '8px solid #2169A8',
  transition: 'box-shadow 0.2s ease',
  boxShadow: '0 0 0 transparent', // sombra inicial
}}
onMouseEnter={(e) => {
  e.currentTarget.style.boxShadow = '0px 4px 50px rgba(0, 0, 0, 0.8)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.boxShadow = '0 0 0 transparent';
}}
  whileHover={{ scale: 1.2 }}
  transition={{ type: 'tween', duration: 0.2 }}
  title={`${e.title} — ${start.toLocaleTimeString()} to ${end.toLocaleTimeString()}`}
>
  <SimpleBar  style={{ flex: '1 1 auto', maxHeight: '100%' }}>
    {/* Contenido fijo arriba */}
    {/* {`${JSON.stringify(e)}`} */}
    <div style={{ flex: '0 0 auto' }}>
      <h5 className='fw-medium font-16'><DateMask date={start} format={'hh:mm A'}/> - <DateMask date={end} format={'hh:mm A'}/> ({e.eventos.length} {e.eventos.length===1?'SERVICIO':'SERVICIOS'})</h5>
      <span className='fs-5'>{e.title}</span>
      <div className='fs-5'><span className='fw-bold'>COMENTARIO: </span>{e.comentario}</div>
    </div>
    <span className='d-flex flex-column'>
    {
      e.eventos?.map(serv=>{
        return (
        <Chip label={`${serv?.nombre_servicio} : ${serv?.duracion} min`} className='m-1 font-12 bg-black text-white' />
        )
      })

    }
        {/* <Chip label="CORTE DE DAMA NORMAL" className='m-1 font-12 bg-black text-white' />
        <Chip label="BALAYAGE" className='m-1 font-12 bg-black text-white' />
        <Chip label="BALAYAGE" className='m-1 font-12 bg-black text-white' />
        <Chip label="BALAYAGE" className='m-1 font-12 bg-black text-white' /> */}
    </span>
      {/* cualquier otro chip extra irá a la siguiente línea y dentro del scroll */}
  </SimpleBar>
</div>
  )
}


const ScheduleTable = ({
  date,
  startHour,
  endHour,
  resources,
  events,
  onOpenModalCustomEvento,
  onOpenModalInfoEvento
}) => {
  // 1. Intervalo en minutos
  const [slotMinutes, setSlotMinutes] = useState(60);

  // 2. Dimensiones fijas
  const slotHeight = 150; // px que ocupa cada bloque de `slotMinutes`
  const minuteHeight = slotHeight / slotMinutes; // px por minuto
  const headerHeight = 130; // altura de la parte “sticky” (selector + títulos)

  // 3. Altura total del bloque de horas (scroll vertical)
  const totalMinutes = (endHour - startHour) * 60;
  const timesHeight = totalMinutes * minuteHeight;
  const totalHeight = headerHeight + timesHeight;

  // 4. Array de marcas cada `slotMinutes`
  const timeMarks = [];
  for (let m = 0; m <= totalMinutes; m += slotMinutes) {
    timeMarks.push(m);
  }

  // 5. Ancho total de TODO el contenido (columna horas + recursos)
  const hourColumnWidth = 80;
  const resourceWidth = 350;
const totalWidth = hourColumnWidth + resources.reduce((acc, r) => {
  const eventosDelRecurso = events.filter((e) =>
    e.id_empl === r.resourceId && dayjs(e.start).format('YYYY-MM-DD') === date
  );
  const columnas = dividirEventosPorColumna(eventosDelRecurso);
  const nCols = columnas.length || 1;
  return acc + (nCols * resourceWidth);
}, 0);

  // 6. Estados para la línea guía y la etiqueta de hora
  const [hoverY, setHoverY] = useState(null);    // desplazamiento vertical dentro del contenido
  const [hoverTime, setHoverTime] = useState(''); // etiqueta “hh:mm A”
  const [scrollX, setScrollX] = useState(0);     // scroll horizontal actual
  const scrollRef = useRef(null);

  // 7. Cambiar intervalo (select)
  const handleChange = (e) => setSlotMinutes(parseInt(e.target.value, 10));

  // 8. En cada movimiento del cursor, calculamos la Y “real” (Y + scrollTop) y la hora
  const handleMouseMove = (evt) => {
    if (!scrollRef.current) return;
    // 8a. Rectángulo de la zona visible
    const rect = scrollRef.current.getBoundingClientRect();
    // 8b. Y relativa a la parte visible del scrollable
    const yInViewport = evt.clientY - rect.top;
    // 8c. scrollTop actual (para Y real)
    const scrollTop = scrollRef.current.scrollTop;
    // 8d. Posición “real” dentro del contenido
    const yContent = yInViewport + scrollTop;
    // 8e. Offset dentro de la zona de horas (restamos headerHeight)
    let yHours = yContent - headerHeight;
    // 🔁 Redondear a los steps (ajustar la línea a cada bloque visual)
    const stepSize = slotMinutes * minuteHeight;
    yHours = Math.round(yHours / stepSize) * stepSize;

    // 8f. Si está fuera de la zona de horas, ocultamos
    if (yHours < 0 || yHours > timesHeight) {
      setHoverY(null);
      setHoverTime('');
      return;
    }

    // 9. Convertir píxeles a minutos desde startHour
    const minutosDesdeInicio = yHours / minuteHeight;
    const totalMinutosDelDia = startHour * 60 + minutosDesdeInicio;
    const horaEntera = Math.floor(totalMinutosDelDia / 60);
    const minutosEnteros = Math.floor(totalMinutosDelDia % 60);

    // 10. Formatear a “hh:mm A”
    const timeLabel = dayjs()
      .hour(horaEntera)
      .minute(minutosEnteros)
      .format('hh:mm A');

    setHoverY(yHours);
    setHoverTime(timeLabel);

    // 11. También actualizamos scrollX aquí (porque evt proviene de un movimiento sobre el scroll container)
    setScrollX(scrollRef.current.scrollLeft);
  };

  // 12. En cada scroll horizontal, actualizamos scrollX
  const handleScroll = () => {
    if (!scrollRef.current) return;
    setScrollX(scrollRef.current.scrollLeft);
  };

  // 13. Al salir, ocultar la línea y la etiqueta
  const handleMouseLeave = () => {
    setHoverY(null);
    setHoverTime('');
  };
  const handleGridClick = (evt, resource) => {
  if (!scrollRef.current) return;

  // 1) Obtener rectángulo visible del contenedor
  const rect = scrollRef.current.getBoundingClientRect();
  // 2) Y relativa dentro del viewport
  const yInViewport = evt.clientY - rect.top;
  // 3) scrollTop actual
  const scrollTop = scrollRef.current.scrollTop;
  // 4) Y “real” dentro de la cuadrícula (incluye header)
  const yContent = yInViewport + scrollTop;
  // 5) Restar headerHeight para quedarnos en zona de horas
  const yHours = yContent - headerHeight;

  // Si haces clic fuera de la zona de horas (por encima o debajo), puedes ignorar
  if (yHours < 0 || yHours > timesHeight) {
    return;
  }

// 🔁 Redondear yHours a pasos (igual que en handleMouseMove)
const stepSize = slotMinutes * minuteHeight;
const yHoursRounded = Math.round(yHours / stepSize) * stepSize;

// Convertimos a minutos desde el inicio
const minutosDesdeInicio = yHoursRounded / minuteHeight;
  // Redondear al minuto exacto (o al bloque de slotMinutes más cercano)
  const totalMinutosDelDia = startHour * 60 + minutosDesdeInicio;
  const horaEntera = Math.floor(totalMinutosDelDia / 60);
  const minutosEnteros = Math.floor(totalMinutosDelDia % 60);

  // 7) Construir un Date o simplemente formatear cadena
  const fechaHora = dayjs(date + ' ' + `${horaEntera.toString().padStart(2, '0')}:${minutosEnteros
    .toString()
    .padStart(2, '0')}`)
    .format('YYYY-MM-DDTHH:mm');
    
  // 8) Llamas a onOpenModalCustomEvento enviando resource y la hora calculada
  
  onOpenModalCustomEvento({
    id_empl: resource.resourceId,
    // resourceData: resource,
    fecha_inicio: fechaHora,
    comentario: '',
    id_origen: 0,
    status_cita: 0,
    fecha_fin: null,
    id: 0
  });
};

  return (
    // 14. Contenedor “scrollable” (horizontal + vertical)
    <div
      ref={scrollRef}
      style={{
        position: 'relative',
        overflow: 'auto',
        border: '1px solid #ccc',
        height: '70vh', // +1 para asegurar scroll vertical
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onScroll={handleScroll}
    >
      {/* 15. Wrapper que HACE scroll: TODO el contenido ancho (horas + recursos) */}
      <div
        style={{
          display: 'flex',
          position: 'relative',
          height: totalHeight,
          width: `${totalWidth}px`, // ancho fijo = 80 + recursos * 400
        }}
      >
        {/* --------------------- Columna izquierda (horas) --------------------- */}
        <div
          style={{
            flex: `0 0 ${hourColumnWidth}px`,
            position: 'sticky',
            left: 0,
            top: 0,
            zIndex: 30,
            background: '#fff',
            borderRight: '1px solid #ccc',
            height: totalHeight,
          }}
        >
          {/* Selector de intervalo */}
          <div
            style={{
              height: `${headerHeight}px`,
              borderBottom: '1px solid #ccc',
              background: '#f7f7f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 31,
            }}
          >
            <select value={slotMinutes} onChange={handleChange}>
              {[60, 45, 30, 15].map((v) => (
                <option key={v} value={v}>
                  {`${v} min`}
                </option>
              ))}
            </select>
          </div>

          {/* Rango de horas (debajo del selector) */}
          <div style={{ position: 'relative', height: `${timesHeight}px` }}>
            {timeMarks.map((m) => {
              const topPx = m * minuteHeight;
              const hour = Math.floor((startHour * 60 + m) / 60);
              const mins = (startHour * 60 + m) % 60;
              const label = `${hour.toString().padStart(2, '0')}:${mins
                .toString()
                .padStart(2, '0')}`;
              return (
                <div
                  key={m}
                  style={{
                    position: 'absolute',
                    top: `${topPx}px`,
                    left: 0,
                    right: 0,
                    height: `${slotHeight}px`,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 4,
                      background: '#fff',
                      padding: '0 2px',
                      fontSize: '14px',
                    }}
                  >
                    <DateMask date={label} defaultFormat={'hh:mm'} format={'hh:mm A'} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* -------------------- Columnas de recursos -------------------- */}
        {resources.map((r) => {
  const eventosDelRecurso = events
    .filter((e) => e.id_empl === r.resourceId && dayjs(e.start).format('YYYY-MM-DD') === date);

  const columnasDeEventos = dividirEventosPorColumna(eventosDelRecurso);
  const tieneSolapamiento = columnasDeEventos.length > 1;

  const anchoRecurso = tieneSolapamiento
    ? columnasDeEventos.length * resourceWidth
    : resourceWidth;

  return (
    <div
      key={r.resourceId}
      style={{
        flex: `0 0 ${anchoRecurso}px`,
        position: 'relative',
        height: totalHeight,
        borderRight: '3px solid #ccc',
      }}
    >
      {/* Header del recurso */}
      <ResourcesTitle
        resource={r}
        eventosDelRecurso={eventosDelRecurso}
        boxShadow={''}
        onOpenModalCustomEvento={onOpenModalCustomEvento}
        height={`${headerHeight}px`}
      />

      {/* Zona de eventos */}
      <div style={{ position: 'relative', height: `${timesHeight}px` }}>
        {/* Líneas horarias */}
        {timeMarks.map((m) => (
          <div
            key={m}
            onClick={(evt) => handleGridClick(evt, r)}
            style={{
              position: 'absolute',
              top: `${m * minuteHeight}px`,
              left: 0,
              right: 0,
              borderTop: '1px solid #eee',
              height: `${slotHeight}px`,
            }}
          />
        ))}

        {/* Eventos distribuidos por columnas internas */}
        {columnasDeEventos.map((columnaEventos, indexColumna) => {
          const anchoColumnaInterna = 100 / columnasDeEventos.length;

          return columnaEventos.map((e) => {
            const start = new Date(e.start);
            const end = new Date(e.end);
            const offsetPx = ((start.getHours() * 60 + start.getMinutes()) - startHour * 60) * minuteHeight;
            const eventHeight = ((end - start) / 60000) * minuteHeight;

            return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  top: `${offsetPx}px`,
                  left: `${(anchoColumnaInterna * indexColumna)}%`,
                  width: `${anchoColumnaInterna}%`,
                  height: `${eventHeight}px`,
                }}
              >
                <EventItem
                  start={start}
                  end={end}
                  top={`0px`}
                  height={`100%`}
                  onOpenModalInfoEvento={onOpenModalInfoEvento}
                  e={e}
                />
              </div>
            );
          });
        })}
      </div>
    </div>
  );
})}
        {/* -------------------- LÍNEA GUÍA (dentro del wrapper que scrollea) -------------------- */}
        {hoverY !== null && (
          <div
            style={{
              position: 'absolute',
              top: `${headerHeight + hoverY}px`,
              left: 0,
              width: `${totalWidth}px`, // abarca todo el contenido
              height: '1px',
              backgroundColor: 'red',
              zIndex: 999,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* -------------------- ETIQUETA DE HORA (AHORA pegada al borde IZQUIERDO de la vista) -------------------- */}
      {hoverY !== null && (
        <div
          style={{
            position: 'absolute',
            top: `${headerHeight + hoverY - 10}px`,
            left: `${scrollX}px`,      // “pegada” al scroll horizontal
            width: `${hourColumnWidth}px`,
            backgroundColor: '#fff',
            padding: '2px 4px',
            fontSize: '12px',
            textAlign: 'center',
            border: '1px solid #ccc',
            borderRadius: '2px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {hoverTime}
        </div>
      )}
    </div>
  );
};


ScheduleTable.propTypes = {
  date: PropTypes.string.isRequired,
  startHour: PropTypes.number.isRequired,
  endHour: PropTypes.number.isRequired,
  resources: PropTypes.arrayOf(
    PropTypes.shape({ resourceId: PropTypes.string.isRequired, resourceTitle: PropTypes.string.isRequired })
  ).isRequired,
  events: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string, title: PropTypes.string.isRequired, start: PropTypes.string.isRequired, end: PropTypes.string.isRequired, resourceId: PropTypes.string.isRequired })
  ).isRequired,
};
function App() {
  const [isOpenModalCustomEvento, setisOpenModalCustomEvento] = useState(false)
  const [isOpenModalInfoEvento, setisOpenModalInfoEvento] = useState(false)
  const [resor, setResor] = useState({})
  const { dataEmpleados, obtenerEmpleadosxDepartamento, obtenerEventoServicioxEmpresa  } = useCalendarStore()
  const [dataCitas, setdataCitas] = useState([])
  const {dataView} = useSelector(e=>e.DATA)
  useEffect(() => {
    setdataCitas(dataView)
  }, [dataView])
  const onOpenModalCustomEvento = (resort)=>{
    console.log(resort);
    
    setResor(resort)
    setisOpenModalCustomEvento(true)
  }
  
  const onOpenModalInfoEvento = (resort)=>{
    setResor(resort)
    setisOpenModalInfoEvento(true)
  }
  const onCloseModalInfoEvento = ()=>{
    setisOpenModalInfoEvento(false)
  }

  const dataEmplOrden = [
    {resourceId: 3550, orden: 100},
    {resourceId: 3567, orden: 200},
    {resourceId: 3568, orden: 300},
    {resourceId: 3556, orden: 400},
    {resourceId: 3553, orden: 500},
  ]

  const resourcesEmpleados = dataEmpleados.map(e=>{
    return {
      resourceId: Number(e.value),
      resourceTitle: e.label,
      cargo_empl: e.cargo_empl,
      urlImageAvatar: `${config.API_IMG.AVATAR_EMPL}${e.tb_images[e.tb_images.length-1].name_image}`
    }
  })
  
  const ordenMap = new Map(
    dataEmplOrden.map(({ resourceId, orden }) => [resourceId, orden])
  );
  const resourcesEmpleadosOrdenados = resourcesEmpleados
    .slice() // para no mutar el original
    .sort((a, b) => {
      const ordenA = ordenMap.get(a.resourceId) ?? Infinity;
      const ordenB = ordenMap.get(b.resourceId) ?? Infinity;
      return ordenA - ordenB;
    });
  const onCloseModalCustomEvento = ()=>{
    setisOpenModalCustomEvento(false)
  }
    const [currentDate, setCurrentDate] = useState((DateMaskString(new Date().toISOString().slice(0, 10), 'YYYY-MM-DD', 'YYYY-MM-DD')));
      // Ref para el input type="date"
  const inputRef = useRef(null);

  useEffect(() => {
    obtenerEmpleadosxDepartamento()
    obtenerEventoServicioxEmpresa(599, new Date(dayjs(currentDate).toISOString()))
    // console.log("aquii obbb", new Date(currentDate), {e: new Date(dayjs(currentDate).toISOString())});
  }, [currentDate])
    // Cuando el usuario haga clic en el DateMask, forzamos el foco / showPicker del <input>
  const handleDateMaskClick = () => {
    if (inputRef.current) {
      // Algunos navegadores modernos (Chrome, Edge, etc.) soportan showPicker()
      if (typeof inputRef.current.showPicker === 'function') {
        inputRef.current.showPicker();
      } else {
        // En otros navegadores bastará con hacer focus()
        inputRef.current.focus();
      }
    }
  };
    // Actualizamos el estado cuando el usuario selecciona otra fecha en el <input>
  const handleInputChange = (e) => {
    setCurrentDate(e.target.value);
  };

  // Función para restar un día
  const handlePrevDay = () => {
    const prev = dayjs(currentDate).subtract(1, 'day');
    setCurrentDate(prev.format('YYYY-MM-DD'));
  };
  
  // Función para sumar un día
  const handleNextDay = () => {
    const next = dayjs(currentDate).add(1, 'day');
    setCurrentDate(next.format('YYYY-MM-DD'));
  };

  return (
    <div>
            {/* Botón "retroceder" */}
            
												<div className="chart-widget-list d-flex">
												<p>
													<i className="mdi mdi-square leyenda-confirmada"></i> Confirmada
												</p>
												<p>
													<i className="mdi mdi-square leyenda-cancelada"></i> Cancelada
												</p>
												<p className="mb-0">
													<i className="mdi mdi-square leyenda-asistio"></i> Asistió
												</p>
												<p className="mb-0">
													<i className="mdi mdi-square leyenda-no-asistio"></i> No asistió
												</p>
												</div>
                      <div className='d-flex align-items-center justify-content-center'>
                        {/* Botón anterior */}
                        <button
                          onClick={handlePrevDay}
                          aria-label="Fecha anterior"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '1.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          ◀
                        </button>

                        {/* Texto de la fecha */}
                        <div className='fs-1 text-center' style={{width: '700px'}} onClick={handleDateMaskClick}>
                          <DateMask date={currentDate} format={'dddd DD [DE] MMMM [DEL] YYYY'} />
                        </div>

                        {/* Input invisible */}
                        <input
                          ref={inputRef}
                          type="date"
                          value={currentDate}
                          onChange={handleInputChange}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            pointerEvents: 'none' // evita problemas de clic si hay superposición
                          }}
                        />

                        {/* Botón siguiente */}
                        <button
                          onClick={handleNextDay}
                          aria-label="Fecha siguiente"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: '1.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          ▶
                        </button>
                      </div>
      <ScheduleTable
        date={currentDate}
        onOpenModalCustomEvento={onOpenModalCustomEvento}
        startHour={9}
        endHour={21}
        resources={resourcesEmpleadosOrdenados}
        events={dataCitas}
        onOpenModalInfoEvento={onOpenModalInfoEvento}
      />
      <ModalCustomEvento resor={resor} show={isOpenModalCustomEvento} onShowCustomEvento={onOpenModalCustomEvento} onHide={onCloseModalCustomEvento}/>
      <ModalInfoEvento show={isOpenModalInfoEvento} onHide={onCloseModalInfoEvento} resor={resor}/>
    </div>
  );
}

export default App;
