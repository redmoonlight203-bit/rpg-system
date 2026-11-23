"use client";

import { useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { mensajeError } from "../../../lib/errores";
import { Cabecera, Secciones } from "../../../components/layout/Cabecera";
import { Button } from "../../../components/ui/Button";
import {useDialogo} from "../../../components/Dialogo";

interface Deuda {
  id: string;
  user_id: string;
  titulo: string;
  mensaje: string;
  estado: string;
  created_at: string;
  fecha_pago_solicitado?: string;
}
type Filtro = "pendientes" | "activos" | "cerrados" | "todos";

const ESTADO: Record<string, { texto: string; tono: string }> = {
  pendiente_aprobacion: { texto: "Pendiente de aprobar", tono: "oro" },
  aprobada: { texto: "Pacto activo", tono: "exito" },
  pendiente_pago_confirmacion: { texto: "Cobrado · esperando al jugador", tono: "oro" },
  completada: { texto: "Saldado", tono: "neutro" },
  rechazada: { texto: "Rechazado", tono: "peligro" },
};
const GRUPO: Record<Filtro, string[]> = {
  pendientes: ["pendiente_aprobacion"],
  activos: ["aprobada", "pendiente_pago_confirmacion"],
  cerrados: ["completada", "rechazada"],
  todos: [],
};

export default function DeudasKuroi() {
  const {confirmar}=useDialogo();
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [ocupado, setOcupado] = useState("");

  const cargarDeudas = async () => {
    setCargando(true);
    setError("");
    const [d, p] = await Promise.all([
      supabase.from("deudas_kuroi").select("id,user_id,titulo,mensaje,estado,created_at,fecha_pago_solicitado").order("created_at", { ascending: false }),
      supabase.from("perfiles").select("id,nombre,email"),
    ]);
    if (d.error) setError(mensajeError(d.error, "No se pudieron cargar los pactos."));
    else setDeudas(d.data as Deuda[]);
    if (!p.error) setNombres(Object.fromEntries((p.data || []).map((x: { id: string; nombre?: string; email?: string }) => [x.id, x.nombre || x.email || "Jugador"])));
    setCargando(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de la pantalla
    void cargarDeudas();
  }, []);

  const resolverDeuda = async (deudaId: string, nuevoEstado: "aprobada" | "rechazada" | "pendiente_pago_confirmacion") => {
    const updateData: { estado: string; fecha_pago_solicitado?: string } = { estado: nuevoEstado };
    if (nuevoEstado === "pendiente_pago_confirmacion") {
      // El servidor fija la fecha del cobro; el jugador tiene 2 días para confirmarlo o impugnarlo.
      updateData.fecha_pago_solicitado = new Date().toISOString();
      if (!(await confirmar({titulo:"Cobrar pacto",mensaje:"¿Cobrar este pacto? El jugador tendrá 2 días para confirmar el pago o impugnarlo.",aceptar:"Cobrar"}))) return;
    } else if (!(await confirmar(nuevoEstado === "aprobada" ? {titulo:"Aprobar pacto",mensaje:"¿Aprobar este pacto?",aceptar:"Aprobar"} : {titulo:"Rechazar pacto",mensaje:"¿Rechazar este pacto? El jugador verá que fue rechazado.",aceptar:"Rechazar",peligro:true}))) return;

    setOcupado(deudaId);
    const { error } = await supabase.from("deudas_kuroi").update(updateData).eq("id", deudaId);
    setOcupado("");
    if (error) setError(mensajeError(error, "No se pudo actualizar el pacto."));
    else void cargarDeudas();
  };

  const cuenta = (f: Filtro) => (f === "todos" ? deudas.length : deudas.filter((d) => GRUPO[f].includes(d.estado)).length);
  const visibles = filtro === "todos" ? deudas : deudas.filter((d) => GRUPO[filtro].includes(d.estado));

  return (
    <main>
      <Cabecera
        kanji="借"
        migas="Kuroi · Economía"
        titulo="Pactos y deudas"
        subtitulo="Lo que prometiste en persona a cada jugador. Aprueba o rechaza sus promesas y cóbralas cuando llegue el momento: el jugador tiene 2 días para confirmar el pago o impugnarlo."
      />
      <Secciones
        etiqueta="Filtrar pactos"
        valor={filtro}
        onCambio={(id) => setFiltro(id as Filtro)}
        items={[
          { id: "pendientes", etiqueta: "Por aprobar", cuenta: cuenta("pendientes") },
          { id: "activos", etiqueta: "Activos", cuenta: cuenta("activos") },
          { id: "cerrados", etiqueta: "Cerrados", cuenta: cuenta("cerrados") },
          { id: "todos", etiqueta: "Todos", cuenta: cuenta("todos") },
        ]}
      />

      {error && (
        <p role="alert" className="y-error" style={{ marginBottom: 24 }}>
          {error} <Button variant="secondary" onClick={() => void cargarDeudas()}>Reintentar</Button>
        </p>
      )}

      {cargando ? (
        <p role="status" className="y-vacio">Abriendo la bóveda de pactos…</p>
      ) : visibles.length === 0 ? (
        <div className="y-vacio">
          <strong>{filtro === "pendientes" ? "No hay pactos por aprobar" : "No hay pactos en esta sección"}</strong>
          Los jugadores registran aquí lo que les prometiste desde su menú «Pactos con Kuroi».
        </div>
      ) : (
        <div className="y-rejilla">
          {visibles.map((item) => {
            const e = ESTADO[item.estado] || { texto: item.estado, tono: "neutro" };
            return (
              <article key={item.id} aria-labelledby={`pacto-${item.id}`} style={{ display: "flex", flexDirection: "column" }}>
                <div className="y-tarjeta-meta">
                  <span className={`y-chip y-chip--${e.tono}`}>{e.texto}</span>
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString("es")}</time>
                </div>
                <h2 id={`pacto-${item.id}`} className="y-tarjeta-titulo">{item.titulo}</h2>
                <p className="y-nota" style={{ margin: 0 }}>De {nombres[item.user_id] || "un jugador"}</p>
                <blockquote className="y-cita">{item.mensaje}</blockquote>
                <div className="y-tarjeta-acciones" style={{ marginTop: "auto" }}>
                  {item.estado === "pendiente_aprobacion" && (
                    <>
                      <Button disabled={!!ocupado} loading={ocupado === item.id} onClick={() => resolverDeuda(item.id, "aprobada")}>Aprobar</Button>
                      <Button variant="secondary" disabled={!!ocupado} onClick={() => resolverDeuda(item.id, "rechazada")}>Rechazar</Button>
                    </>
                  )}
                  {item.estado === "aprobada" && (
                    <Button disabled={!!ocupado} loading={ocupado === item.id} onClick={() => resolverDeuda(item.id, "pendiente_pago_confirmacion")}>
                      <Check size={16} aria-hidden="true" /> Cobrar pacto
                    </Button>
                  )}
                  {item.estado === "pendiente_pago_confirmacion" && (
                    <p className="y-nota" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                      <Clock size={16} aria-hidden="true" /> Esperando a que el jugador confirme el pago (2 días).
                    </p>
                  )}
                  {item.estado === "completada" && <p className="y-nota" style={{ margin: 0 }}>Pacto saldado.</p>}
                  {item.estado === "rechazada" && <p className="y-nota" style={{ margin: 0 }}>Rechazaste este pacto.</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
