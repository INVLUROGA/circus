















// import React, { useState } from 'react';

// /**
//  * DaySchedule: vista de un día con columnas por recurso y filas para cada minuto.
//  * Etiqueta de hora sólo en el minuto 0 de cada hora (agrupación visual de 60 celdas por hora).
//  * Header y primera columna fijos, scroll vertical y horizontal mostrando sólo 4 recursos.
//  * Props:
//  *  - date: string ISO (e.g., '2025-06-10')
//  *  - startHour: número, hora inicial (por defecto 8)
//  *  - endHour: número, hora final (por defecto 18)
//  *  - resources: Array<{ resourceId: string, resourceTitle: string }>
//  *  - events: Array<{ start: string (ISO 'YYYY-MM-DDTHH:mm'), end: string, title: string, resourceId: string }>
//  */
// export const DaySchedule = ({ date, startHour = 8, endHour = 18, resources = [], events = [] }) => {
//   // Estado para rango de minutos (no altera slots)
//   const [minuteRange, setMinuteRange] = useState(60);

//   // Generar un slot por cada minuto desde startHour:00 hasta endHour:59
//   const slots = [];
//   for (let h = startHour; h <= endHour; h++) {
//     for (let m = 0; m < 60; m++) {
//       slots.push({ hour: h, minute: m });
//     }
//   }

//   // Ancho para scroll horizontal mostrando 4 recursos
//   const timeColWidth = 60;        // px ancho columna de hora
//   const resourceColWidth = 120;   // px ancho cada recurso
//   const visibleResources = 4;
//   const containerWidth = timeColWidth + resourceColWidth * visibleResources;

//   return (
//     <div style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: '600px', width: `${containerWidth}px` }}>
//       <table
//         style={{
//           borderCollapse: 'collapse',
//           borderSpacing: 0,
//           width: `${timeColWidth + resourceColWidth * resources.length}px`,
//         }}
//       >
//         <thead>
//           <tr>
//             {/* Selector de rango de minutos fijo */}
//             <th
//               style={{
//                 position: 'sticky',
//                 top: 0,
//                 left: 0,
//                 zIndex: 3,
//                 background: '#fff',
//                 width: `${timeColWidth}px`,
//                 padding: '0.25rem',
//                 border: '2px solid #dee2e6',
//               }}
//             >
//               <select
//                 className="form-select form-select-sm"
//                 value={minuteRange}
//                 onChange={e => setMinuteRange(parseInt(e.target.value, 10))}
//               >
//                 {[15, 30, 45, 60].map(val => (
//                   <option key={val} value={val}>{`${val} min`}</option>
//                 ))}
//               </select>
//             </th>
//             {resources.map(r => (
//               <th
//                 key={r.resourceId}
//                 style={{
//                   position: 'sticky',
//                   top: 0,
//                   zIndex: 2,
//                   background: '#fff',
//                   minWidth: `${resourceColWidth}px`,
//                   padding: '0.5rem',
//                   border: '2px solid #dee2e6',
//                 }}
//               >
//                 {r.resourceTitle}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {slots.map(slot => {
//             const hourLabel = slot.hour.toString().padStart(2, '0');
//             const minuteLabel = slot.minute.toString().padStart(2, '0');
//             const showLabel = slot.minute === 0;
//             const slotTime = new Date(`${date}T${hourLabel}:${minuteLabel}:00`);

//             return (
//               <tr key={`${hourLabel}-${minuteLabel}`}>              
//                 {/* Hora fija, etiqueta solo al inicio de cada hora */}
//                 <th
//                   scope="row"
//                   style={{
//                     position: 'sticky',
//                     left: 0,
//                     background: '#fff',
//                     zIndex: 1,
//                     padding: '0 4px',
//                     width: `${timeColWidth}px`,
//                     textAlign: 'right',
//                     fontSize: '0.75rem',
//                     border: '2px solid #dee2e6',
//                   }}
//                 >
//                   {showLabel ? `${hourLabel}:00` : ''}
//                 </th>
//                 {resources.map(r => {
//                   const cellEvents = events.filter(e => {
//                     if (e.resourceId !== r.resourceId) return false;
//                     const start = new Date(e.start);
//                     const end = new Date(e.end);
//                     return slotTime >= start && slotTime < end;
//                   });
//                   return (
//                     <td
//                       key={`${r.resourceId}-${hourLabel}-${minuteLabel}`}
//                       style={{
//                         padding: '0 4px',
//                         verticalAlign: 'top',
//                         minWidth: `${resourceColWidth}px`,
//                         fontSize: '0.7rem',
//                         border: '2px solid #dee2e6',
//                       }}
//                     >
//                       {cellEvents.map((evt, idx) => (
//                         <div key={idx} className="small">
//                           {evt.title}
//                         </div>
//                       ))}
//                     </td>
//                   );
//                 })}
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// // Ejemplo de uso en App.jsx:
// // import { DaySchedule } from './DaySchedule';
// //
// const resources = [...Array(8)].map((_, i) => ({ resourceId: `r${i}`, resourceTitle: `Recurso ${i+1}` }));
// const events = [
//   { start: '2025-06-10T10:00', end: '2025-06-10T11:30', title: 'Balayage', resourceId: 'r1' },
//   { start: '2025-06-10T12:15', end: '2025-06-10T12:45', title: 'Corte', resourceId: 'r2' },
// ];

// function App() {
//   return (
//     <DaySchedule
//       date="2025-06-10"
//       startHour={8}
//       endHour={18}
//       resources={resources}
//       events={events}
//     />
//   );
// }

// export default App;
