import React,{useState} from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { NumberFormatMoney } from "@/components/CurrencyMask";
import { InputNumber } from "primereact/inputnumber";


const round2 = (x) =>
  Math.round((Number(x) + Number.EPSILON) * 100) / 100;

export const DetalleVentasDialog = ({
  open,
  title,
  onClose,
  modalRows,
  modalResumen,
  modalData,
  empleadoObjetivo,
  serieEmpleadoMes,
  deltasEmpleadoMes,
  headerLabel,
  baseTableStyle,
  thStyle,
  tdStyle,
  tdTotales,
  // tasas (por si quieres moverlas aquí o hacerlas editables)
  rateIgv = 0.18,
  rateRenta = 0.03,
  rateTarjeta = 0.045,
  rateComision = 0.10,
  setRateIgv,
  setRateRenta,
  setRateTarjeta,
}) => {
    const [activeRateEditor, setActiveRateEditor] = useState(null); // 'tarjeta' | 'igv' | 'renta' | null

  return (
    <Dialog
      header={
        <div
          style={{
            textAlign: "center",
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 0.5,
          }}
        >
          {title || "Ventas"}
        </div>
      }
      visible={open}
      style={{
        width: "100vw",
        maxWidth: "150vw",
        margin: "0 auto",
        borderRadius: "12px",
      }}
      modal
      onHide={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cerrar" onClick={onClose} />
        </div>
      }
    >
      {(!modalRows || modalRows.length === 0) ? (
        <div className="py-2">Sin ventas para esta celda.</div>
      ) : (
        <>
          {/* === Título === */}
          <div
            className="bg-primary fs-2 fw-bold text-center py-2"
            style={{
              fontWeight: 1000,
              marginBottom: 10,
              textAlign: "center",
              fontSize: 25,
              letterSpacing: 0.3,
              marginTop: 4,
              borderRadius: 6,
            }}
          >
            DETALLE DE PRODUCTOS Y SERVICIOS
          </div>

          {/* === Tarjetas resumen === */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                borderRadius: 12,
                padding: 12,
                background: "#fffef5",
                textAlign: "center",
                alignItems: "center",
                marginBottom: 16,
                display: "inline-block",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0,1fr))",
                  gap: 10,
                }}
              >
                {[
                  { label: "Cantidad de servicios", value: modalData.totalServCantidad },
                  {
                    label: "Venta Servicios",
                    value: <NumberFormatMoney amount={modalData.totalPVentaServs} />,
                  },
                  { label: "Cantidad de productos", value: modalData.totalCantidad },
                  {
                    label: "Venta Productos",
                    value: <NumberFormatMoney amount={modalData.totalPVentaProd} />,
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      border: "2px solid #d4af37",
                      borderRadius: 8,
                      padding: 12,
                      background: "#fff",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 0 10px rgba(212,175,55,0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: 15, opacity: 0.7 }}>{item.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 25 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* === Resumen por método de pago === */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
              textAlign: "center",
              margin: "10px 0 18px",
              justifyContent: "center",
            }}
          >
            {Object.entries(headerLabel)
              .sort(
                (a, b) =>
                  (modalData.totalPorMetodo[b[0]] || 0) -
                  (modalData.totalPorMetodo[a[0]] || 0)
              )
              .map(([key, label]) => (
                <div
                  key={key}
                  style={{
                    padding: 12,
                    border: "2px solid #d4af37",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontSize: 15, opacity: 0.7 }}>
                    {label.toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 25 }}>
                    <NumberFormatMoney
                      amount={modalData.totalPorMetodo[key] || 0}
                    />
                  </div>
                </div>
              ))}
          </div>
{modalResumen && (
  <div style={{ marginTop: 80 }}>
    <div
      style={{
        fontWeight: 700,
        marginBottom: 8,
        textAlign: "center",
        fontSize: 30,
      }}
    >
      VENTAS POR SERVICIOS
    </div>

    {(() => {
      const bruto = Number(modalResumen.bruto || 0);

      // Tasas
      const rateComisionEstilista = 0.30;

      // 1) Tarjeta sobre venta bruta
      const tarjeta = round2(bruto * rateTarjeta);

      // 2) Ingreso neto base después de tarjeta
      const ingresoBase = round2(bruto - tarjeta);

      // 3) IGV y Renta sobre ingresoBase
      const igv = round2(ingresoBase * rateIgv);
      const renta = round2(ingresoBase * rateRenta);

      // 4) Ingreso neto antes de comisión del estilista
      const ingresoNetoSinComision = round2(ingresoBase - igv - renta);

      // 5) Comisión estilista (30% del ingreso neto sin comisión)
      const comisionEstilista = round2(
        ingresoNetoSinComision * rateComisionEstilista
      );

      // 6) Ingreso neto final (última columna)
      const ingresoNetoFinal = round2(
        ingresoNetoSinComision - comisionEstilista
      );

      // Estilos inputs pequeños (si dejas edición de tasas)
      const tinyInputStyle = {
        width: 60,
        height: 22,
        fontSize: 10,
      };
      const tinyInputInnerStyle = {
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 10,
        padding: "0 4px",
      };
      const clickableSpan = {
        cursor: "pointer",
        textDecoration: "underline dotted",
        fontWeight: 700,
        fontSize: 14,
        display: "inline-block",
        marginTop: 2,
      };

      return (
        <table
          style={{
            ...baseTableStyle,
            margin: "24px auto 12px",
            fontSize: 22,
          }}
        >
          <thead>
            <tr style={{ fontSize: 22 }}>
              {/* VENTA BRUTA */}
              <th className="bg-primary" style={thStyle}>
                VENTA
                <br />
                BRUTA
              </th>

              {/* TARJETA */}
              <th className="bg-primary" style={thStyle}>
                TARJETA
                <br />
                <span
                  style={clickableSpan}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRateEditor((cur) =>
                      cur === "tarjeta" ? null : "tarjeta"
                    );
                  }}
                >
                  (-{(rateTarjeta * 100).toFixed(2)}%)
                </span>
                {typeof setRateTarjeta === "function" &&
                  activeRateEditor === "tarjeta" && (
                    <div style={{ marginTop: 2 }}>
                      <InputNumber
                        autoFocus
                        value={round2(rateTarjeta * 100)}
                        onValueChange={(e) =>
                          setRateTarjeta((e.value || 0) / 100)
                        }
                        mode="decimal"
                        minFractionDigits={0}
                        maxFractionDigits={2}
                        suffix="%"
                        inputStyle={tinyInputInnerStyle}
                        style={tinyInputStyle}
                        onBlur={() =>
                          setActiveRateEditor((cur) =>
                            cur === "tarjeta" ? null : cur
                          )
                        }
                      />
                    </div>
                  )}
              </th>

              {/* INGRESO NETO BASE */}
              <th className="bg-primary" style={thStyle}>
                INGRESO
                <br />
                NETO BASE
              </th>

              {/* IGV */}
              <th className="bg-primary" style={thStyle}>
                IGV
                <br />
                <span
                  style={clickableSpan}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRateEditor((cur) =>
                      cur === "igv" ? null : "igv"
                    );
                  }}
                >
                  (-{(rateIgv * 100).toFixed(2)}%)
                </span>
                {typeof setRateIgv === "function" &&
                  activeRateEditor === "igv" && (
                    <div style={{ marginTop: 2 }}>
                      <InputNumber
                        autoFocus
                        value={round2(rateIgv * 100)}
                        onValueChange={(e) =>
                          setRateIgv((e.value || 0) / 100)
                        }
                        mode="decimal"
                        minFractionDigits={0}
                        maxFractionDigits={2}
                        suffix="%"
                        inputStyle={tinyInputInnerStyle}
                        style={tinyInputStyle}
                        onBlur={() =>
                          setActiveRateEditor((cur) =>
                            cur === "igv" ? null : cur
                          )
                        }
                      />
                    </div>
                  )}
              </th>

              {/* RENTA */}
              <th className="bg-primary" style={thStyle}>
                RENTA
                <br />
                <span
                  style={clickableSpan}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRateEditor((cur) =>
                      cur === "renta" ? null : "renta"
                    );
                  }}
                >
                  (-{(rateRenta * 100).toFixed(2)}%)
                </span>
                {typeof setRateRenta === "function" &&
                  activeRateEditor === "renta" && (
                    <div style={{ marginTop: 2 }}>
                      <InputNumber
                        autoFocus
                        value={round2(rateRenta * 100)}
                        onValueChange={(e) =>
                          setRateRenta((e.value || 0) / 100)
                        }
                        mode="decimal"
                        minFractionDigits={0}
                        maxFractionDigits={2}
                        suffix="%"
                        inputStyle={tinyInputInnerStyle}
                        style={tinyInputStyle}
                        onBlur={() =>
                          setActiveRateEditor((cur) =>
                            cur === "renta" ? null : cur
                          )
                        }
                      />
                    </div>
                  )}
              </th>

              {/* COMISIÓN ESTILISTA */}
              <th className="bg-primary" style={thStyle}>
                COMISIÓN
                <br />
                ESTILISTA
                <br />
                (30%)
              </th>

              {/* INGRESO NETO FINAL */}
              <th className="bg-primary" style={thStyle}>
                INGRESO
                <br />
                NETO
              </th>
            </tr>
          </thead>

          <tbody>
            <tr>
              {/* Venta Bruta */}
              <td style={tdTotales}>
                <NumberFormatMoney amount={bruto} />
              </td>

              {/* Tarjeta */}
              <td style={{ ...tdTotales, color: "red" }}>
                - <NumberFormatMoney amount={tarjeta} />
              </td>

              {/* Ingreso Neto Base */}
              <td style={{ ...tdTotales, fontWeight: 700 }}>
                <NumberFormatMoney amount={ingresoBase} />
              </td>

              {/* IGV */}
              <td style={{ ...tdTotales, color: "red" }}>
                - <NumberFormatMoney amount={igv} />
              </td>

              {/* Renta */}
              <td style={{ ...tdTotales, color: "red" }}>
                - <NumberFormatMoney amount={renta} />
              </td>

              {/* Comisión Estilista */}
              <td
                style={{
                  ...tdTotales,
                  fontWeight: 700,
                  color: "red",
                }}
              >
                - <NumberFormatMoney amount={comisionEstilista} />
              </td>

              {/* Ingreso Neto Final */}
              <td
                style={{
                  ...tdTotales,
                  fontWeight: 700,
                  color: "#007b00",
                }}
              >
                <NumberFormatMoney amount={ingresoNetoFinal} />
              </td>
            </tr>
          </tbody>
        </table>
      );
    })()}
  </div>
)}


          {/* === DETALLE DE SERVICIOS === */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              marginTop: "100px",
            }}
          >
            <div style={{ marginTop: 6, position: "relative" }}>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 20,
                  fontSize: 30,
                  textAlign: "center",
                }}
              >
                DETALLE DE SERVICIOS
              </div>
              <table
                style={{
                  ...baseTableStyle,
                  width: "100%",
                  minWidth: "100%",
                  tableLayout: "fixed",
                  position: "relative",
                }}
              >
                <thead>
                  <tr>
                    <th
                      className="bg-primary"
                      style={{
                        ...thStyle,
                        width: "60px",
                        minWidth: "60px",
                        maxWidth: "60px",
                      }}
                    >
                      Item
                    </th>
                    <th className="bg-primary" style={thStyle}>
                      Servicio
                    </th>
                    <th className="bg-primary" style={thStyle}>
                      Cant.
                    </th>
                    <th className="bg-primary" style={thStyle}>
                      Precio
                      <br />
                      Unitario
                    </th>
                    <th
                      className="bg-primary"
                      style={thStyle}
                      dangerouslySetInnerHTML={{
                        __html: "Venta<br/>Total",
                      }}
                    />
                    {modalData.methodsToShow.map((m) => (
                      <th
                        key={m}
                        className="bg-primary"
                        style={thStyle}
                        dangerouslySetInnerHTML={{
                          __html: (headerLabel[m] || m).replace(
                            /\s+/g,
                            "<br/>"
                          ),
                        }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modalData.serviciosOrdenados.map((s, i) => {
                    const totalLinea =
                      (Number(s.pVenta) || 0) *
                      (Number(s.cantidad) || 0);
                    const vals = Object.fromEntries(
                      modalData.methodsToShow.map((m) => [
                        m,
                        round2(Number(s[m]) || 0),
                      ])
                    );
                    let suma = round2(
                      modalData.methodsToShow.reduce(
                        (a, k) => a + (vals[k] || 0),
                        0
                      )
                    );
                    let delta = round2(totalLinea - suma);

                    return (
                      <tr
                        key={i}
                        style={
                          i % 2
                            ? { background: "#fcfcfc" }
                            : null
                        }
                      >
                        <td
                          className="bg-primary"
                          style={{
                            ...tdStyle,
                            fontWeight: 700,
                            width: 64,
                            textAlign: "center",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          className="bg-primary"
                          style={{
                            ...tdStyle,
                            textAlign: "left",
                            fontWeight: 600,
                            whiteSpace: "normal",
                            wordWrap: "break-word",
                            maxWidth: 250,
                          }}
                        >
                          {s.nombre}
                        </td>
                        <td style={tdStyle}>{s.cantidad}</td>
                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 600,
                          }}
                        >
                          {s.pVenta ? (
                            <NumberFormatMoney
                              amount={s.pVenta}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            fontWeight: 600,
                          }}
                        >
                          <NumberFormatMoney
                            amount={totalLinea}
                          />
                        </td>
                        {modalData.methodsToShow.map((m, idx) => {
                          let val = vals[m] || 0;
                          if (
                            idx === 0 &&
                            Math.abs(delta) >= 0.01
                          ) {
                            val = round2(val + delta);
                            delta = 0;
                          }
                          return (
                            <td key={m} style={tdStyle}>
                              <NumberFormatMoney
                                amount={val || 0}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {modalData.serviciosOrdenados.length > 0 && (
                    <tr className="bg-primary text-dark">
                      <td style={tdStyle} />
                      <td
                        style={{
                          ...tdTotales,
                          fontWeight: 800,
                          textAlign: "right",
                          WebkitTextFillColor: "white",
                        }}
                      >
                        TOTAL SERVICIOS
                      </td>
                      <td
                        style={{
                          ...tdTotales,
                          fontWeight: 800,
                          WebkitTextFillColor: "white",
                        }}
                      >
                        {modalData.serviciosOrdenados.reduce(
                          (a, b) =>
                            a +
                            (Number(b.cantidad) || 0),
                          0
                        )}
                      </td>
                      <td
                        style={{
                          ...tdTotales,
                          fontWeight: 800,
                        }}
                      />
                      {(() => {
                        const totalPVentaServs = round2(
                          modalData.serviciosOrdenados.reduce(
                            (acc, s) =>
                              acc +
                              (Number(s.pVenta) || 0) *
                                (Number(s.cantidad) ||
                                  0),
                            0
                          )
                        );
                        const totalsByMethod =
                          modalData.methodsToShow.reduce(
                            (acc, m) => {
                              acc[m] = round2(
                                modalData.serviciosOrdenados.reduce(
                                  (sum, s) =>
                                    sum +
                                    (Number(s[m]) ||
                                      0),
                                  0
                                )
                              );
                              return acc;
                            },
                            {}
                          );
                        let sumMethods = round2(
                          modalData.methodsToShow.reduce(
                            (a, m) =>
                              a +
                              (totalsByMethod[m] ||
                                0),
                            0
                          )
                        );
                        let delta = round2(
                          totalPVentaServs -
                            sumMethods
                        );
                        if (
                          Math.abs(delta) >=
                            0.01 &&
                          modalData.methodsToShow[0]
                        ) {
                          const first =
                            modalData
                              .methodsToShow[0];
                          totalsByMethod[first] =
                            round2(
                              (totalsByMethod[first] ||
                                0) + delta
                            );
                        }
                        return (
                          <>
                            {modalData.methodsToShow.map(
                              (m) => (
                                <td
                                  key={m}
                                  style={{
                                    ...tdTotales,
                                    fontWeight: 800,
                                    WebkitTextFillColor:
                                      "white",
                                  }}
                                >
                                  <NumberFormatMoney
                                    amount={
                                      totalsByMethod[m]
                                    }
                                  />
                                </td>
                              )
                            )}
                            <td
                              style={{
                                ...tdTotales,
                                fontWeight: 800,
                                color: "white",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  totalPVentaServs
                                }
                              />
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* === COMPARATIVA MENSUAL DEL COLABORADOR === */}
          {empleadoObjetivo &&
            serieEmpleadoMes.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 24,
                    textAlign: "center",
                    marginBottom: 10,
                    letterSpacing: 0.3,
                  }}
                >
                  RESUMEN POR MES –{" "}
                  {empleadoObjetivo.toUpperCase()}
                </div>

                <table
                  style={{
                    ...baseTableStyle,
                    width: "100%",
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        className="bg-primary"
                        style={thStyle}
                      >
                        Concepto
                      </th>
                      {serieEmpleadoMes.map((pt) => (
                        <th
                          key={pt.label}
                          className="bg-primary"
                          style={thStyle}
                        >
                          {pt.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td
                        className="bg-primary"
                        style={{
                          ...tdStyle,
                          fontWeight: 800,
                        }}
                      >
                        TOTAL MES
                      </td>
                      {serieEmpleadoMes.map(
                        (pt, i) => (
                          <td
                            key={`t-${i}`}
                            style={{
                              ...tdStyle,
                              fontSize: 22,
                              fontWeight:
                                i ===
                                serieEmpleadoMes.length -
                                  1
                                  ? 800
                                  : 600,
                            }}
                            title={`Total ${pt.label}`}
                          >
                            <NumberFormatMoney
                              amount={pt.total}
                            />
                          </td>
                        )
                      )}
                    </tr>

                    <tr>
                      <td
                        className="bg-primary"
                        style={{
                          ...tdStyle,
                          fontWeight: 800,
                        }}
                      >
                        VAR. VS MES SIGUIENTE
                      </td>
                      {deltasEmpleadoMes.map(
                        (delta, i) => {
                          const pt =
                            serieEmpleadoMes[i];
                          if (delta == null) {
                            return (
                              <td
                                key={`d-${i}`}
                                style={{
                                  ...tdStyle,
                                  fontSize: 22,
                                  fontWeight: 800,
                                }}
                                title={`Total ${pt.label}`}
                              >
                                <NumberFormatMoney
                                  amount={
                                    pt.total
                                  }
                                />
                              </td>
                            );
                          }
                          const color =
                            delta > 0
                              ? "#007b00"
                              : delta < 0
                              ? "red"
                              : "#000";
                          return (
                            <td
                              key={`d-${i}`}
                              style={{
                                ...tdStyle,
                                fontSize: 22,
                                color,
                                fontWeight: 700,
                              }}
                              title={`${serieEmpleadoMes[i + 1].label} – ${pt.label}`}
                            >
                              <NumberFormatMoney
                                amount={delta}
                              />
                            </td>
                          );
                        }
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

          {/* === PRODUCTOS VENDIDOS === */}
          <div
            style={{
              justifySelf: "center",
              marginTop: "100px",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 10,
                fontSize: 30,
                textAlign: "center",
              }}
            >
              PRODUCTOS VENDIDOS
            </div>

            <table
              style={{
                ...baseTableStyle,
                width: "100%",
                minWidth: 0,
                margin: 0,
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  <th
                    className="bg-primary"
                    style={{
                      ...thStyle,
                      width: "60px",
                      minWidth: "60px",
                      maxWidth: "60px",
                      textAlign: "center",
                    }}
                  >
                    Item
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Producto
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Cantidad
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Precio
                    <br />
                    Unitario
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Precio
                    <br />
                    Venta
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    IGV
                    <br />
                    (-{(rateIgv * 100).toFixed(2)}%)
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Tarjeta
                    <br />
                    (-{(rateTarjeta * 100).toFixed(2)}%)
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Renta
                    <br />
                    (-{(rateRenta * 100).toFixed(2)}%)
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Costo
                    <br />
                    Compra
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Utilidad
                    <br />
                    Bruta
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Comisión
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Utilidad
                    <br />
                    Neta
                  </th>
                  <th
                    className="bg-primary"
                    style={thStyle}
                  >
                    Utilidad
                    <br />
                    por producto
                  </th>
                </tr>
              </thead>
              <tbody>
                {modalData.productosAgrupados.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      style={tdStyle}
                    >
                      No se vendieron productos.
                    </td>
                  </tr>
                ) : (
                  <>
                    {modalData.productosAgrupados
                      .slice()
                      .sort((a, b) => {
                        const cantDiff =
                          (b.cantidad || 0) -
                          (a.cantidad || 0);
                        if (cantDiff !== 0)
                          return cantDiff;
                        return (
                          (b.precioVentaU ||
                            0) -
                          (a.precioVentaU || 0)
                        );
                      })
                      .map((p, i) => {
                        const cantidad =
                          p.cantidad || 0;
                        const venta =
                          (p.precioVentaU || 0) *
                          cantidad;
                        const compra =
                          (p.precioCompraU || 0) *
                          cantidad;
                        const igv =
                          venta * rateIgv;
                        const tarjeta =
                          venta *
                          rateTarjeta;
                        const renta =
                          venta *
                          rateRenta;
                        const utilBase =
                          venta -
                          igv -
                          tarjeta -
                          renta -
                          compra;
                        const comision =
                          utilBase *
                          rateComision;
                        const utilFinal =
                          utilBase -
                          comision;
                        const utilPorProducto =
                          cantidad > 0
                            ? utilFinal /
                              cantidad
                            : 0;

                        return (
                          <tr
                            key={i}
                            style={
                              i % 2
                                ? {
                                    background:
                                      "#fcfcfc",
                                  }
                                : null
                            }
                          >
                            <td
                              className="bg-primary"
                              style={{
                                ...tdStyle,
                                width: "60px",
                                minWidth:
                                  "60px",
                                maxWidth:
                                  "60px",
                                textAlign:
                                  "center",
                              }}
                            >
                              {i + 1}
                            </td>
                            <td
                              className="bg-primary text-dark"
                              style={{
                                ...tdStyle,
                                textAlign:
                                  "left",
                                fontWeight: 700,
                                whiteSpace:
                                  "normal",
                                wordWrap:
                                  "break-word",
                                maxWidth: 750,
                              }}
                            >
                              {p.nombre}
                            </td>
                            <td
                              style={tdStyle}
                            >
                              {cantidad}
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 600,
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  p.precioVentaU ||
                                  0
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 600,
                                color:
                                  "#007b00",
                              }}
                            >
                              <NumberFormatMoney
                                amount={venta}
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                color:
                                  "red",
                              }}
                            >
                              <NumberFormatMoney
                                amount={igv}
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                color:
                                  "red",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  tarjeta
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                color:
                                  "red",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  renta
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                color:
                                  "red",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  compra
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 600,
                                color:
                                  "green",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  utilBase
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                color:
                                  "red",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  comision
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 700,
                                color:
                                  utilFinal >=
                                  0
                                    ? "#007b00"
                                    : "red",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  utilFinal
                                }
                              />
                            </td>
                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 700,
                                color:
                                  utilPorProducto >=
                                  0
                                    ? "#007b00"
                                    : "red",
                              }}
                            >
                              <NumberFormatMoney
                                amount={
                                  utilPorProducto
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}

                    {/* Totales productos */}
                    {(() => {
                      let totalCantidad = 0;
                      let totalVenta = 0;
                      let totalIGV = 0;
                      let totalTarjeta = 0;
                      let totalRenta = 0;
                      let totalCompra = 0;
                      let totalUtilBase = 0;
                      let totalComision = 0;
                      let totalUtilFinal = 0;

                      modalData.productosAgrupados.forEach(
                        (p) => {
                          const cant =
                            p.cantidad ||
                            0;
                          const venta =
                            (p.precioVentaU ||
                              0) * cant;
                          const compra =
                            (p.precioCompraU ||
                              0) * cant;
                          const igv =
                            venta *
                            rateIgv;
                          const tarjeta =
                            venta *
                            rateTarjeta;
                          const renta =
                            venta *
                            rateRenta;
                          const utilBase =
                            venta -
                            igv -
                            tarjeta -
                            renta -
                            compra;
                          const comision =
                            utilBase *
                            rateComision;
                          const utilFinal =
                            utilBase -
                            comision;

                          totalCantidad += cant;
                          totalVenta += venta;
                          totalIGV += igv;
                          totalTarjeta += tarjeta;
                          totalRenta += renta;
                          totalCompra += compra;
                          totalUtilBase += utilBase;
                          totalComision += comision;
                          totalUtilFinal += utilFinal;
                        }
                      );

                      const utilPromedioProducto =
                        totalCantidad > 0
                          ? totalUtilFinal /
                            totalCantidad
                          : 0;

                      return (
                        <tr
                          style={{
                            backgroundColor:
                              "var(--primary-color)",
                          }}
                        >
                          <td
                            className="bg-primary text-dark"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                            }}
                          />
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            TOTALES
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            {totalCantidad}
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                            }}
                          />
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={totalVenta}
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={totalIGV}
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={
                                totalTarjeta
                              }
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={
                                totalRenta
                              }
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={
                                totalCompra
                              }
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              color: "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={
                                totalUtilBase
                              }
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 1000,
                              color: "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={
                                totalComision
                              }
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 800,
                              color:
                                totalUtilFinal >=
                                0
                                  ? "white"
                                  : "red",
                            }}
                          >
                            <NumberFormatMoney
                              amount={
                                totalUtilFinal
                              }
                            />
                          </td>
                          <td
                            className="bg-primary"
                            style={{
                              ...tdTotales,
                              fontWeight: 800,
                              WebkitTextFillColor:
                                "white",
                            }}
                          >
                            <NumberFormatMoney
                              amount={
                                utilPromedioProducto
                              }
                            />
                          </td>
                        </tr>
                      );
                    })()}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Dialog>
  );
};
