import { Row, Col, Card, Button } from 'react-bootstrap';
import '@fullcalendar/react';
import FullCalendarWidget from './FullCalendarWidget';
import AddEditEvent from './AddEditEvent';
import { useCalendar } from './hooks';
import SidePanel from './SidePanel';
import { PageBreadcrumb } from '@/components';
import App from '../Calendar2/App';
import { momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
export const CalendarApp = ({tipo_serv}) => {
	const {
		isOpen,
		onOpenModal,
		onCloseModal,
		isEditable,
		eventData,
		// events,
		onDateClick,
		onEventClick,
		onDrop,
		onEventDrop,
		onUpdateEvent,
		onRemoveEvent,
		onAddEvent,
	} = useCalendar();
// 1. Crea el localizer (aquí con moment, pero podrías usar date-fns, dayjs, etc.)
	const localizer = momentLocalizer(moment);
// Ejemplo de eventos, cada uno asociado a un recurso
const events = [
  {
    title: 'Evento A',
    start: new Date(2025, 4, 27, 9, 0),
    end:   new Date(2025, 4, 27, 10, 0),
    resourceId: 'recurso1'
  },
  {
    title: 'Evento B',
    start: new Date(2025, 4, 27, 11, 0),
    end:   new Date(2025, 4, 27, 12, 0),
    resourceId: 'recurso2'
  },
  {
    title: 'Evento C',
    start: new Date(2025, 4, 27, 14, 0),
    end:   new Date(2025, 4, 27, 15, 30),
    resourceId: 'recurso3'
  },
];
	return (
		<>
			<PageBreadcrumb title={tipo_serv=='NUTRI'?"Agendas citas nutricionista": "Agenda citas estilistas"} subName="Apps" />

			<Row>
				<Col>
					<Card>
						<Card.Body style={{height: '100%'}}>
							<Row>
								<Col xl={12}>
								
									{/* fullcalendar control */}
									<App
										onDateClick={onDateClick}
										onEventClick={onEventClick}
										onDrop={onDrop}
										onEventDrop={onEventDrop}
										events={events}
										localizer={localizer}
										tipo_serv={tipo_serv}
									/>
								</Col>
							</Row>
						</Card.Body>
					</Card>
				</Col>
			</Row>

			{/* add new event modal */}
		</>
	);
};


								{/* <div id="leyenda">
										<div className='container-leyenda'>
											<div id="columna">
												<div className="cuadrado leyenda-confirmada"></div>
												<span id="titulo-ayuda-leyenda">Confirmada</span>
											</div>
											<div id="columna">
												<div className="cuadrado leyenda-asistio cuadrado"></div>
												<span id="titulo-ayuda-leyenda">Asistió</span>
											</div>
											<div id="columna">
												<div className="cuadrado leyenda-cancelada"></div>
												<span id="titulo-ayuda-leyenda">Cancelada</span>
											</div>
											<div id="columna">
												<div className="cuadrado leyenda-no-asistio cuadrado"></div>
												<span id="titulo-ayuda-leyenda">No asistió</span>
											</div>
										</div>
									</div>
									<br/> */}