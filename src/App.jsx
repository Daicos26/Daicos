import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Check, RefreshCw, ClipboardList, CircleAlert } from "lucide-react";
import { supabase } from "./supabaseClient";

const INK = "#0B1620";
const PANEL = "#111F2B";
const PANEL_2 = "#16283A";
const LINE = "#26394B";
const TEXT = "#E7EEF3";
const MUTED = "#7C93A6";
const TEAL = "#2FD8C4";
const AMBER = "#F0A93A";
const CORAL = "#E8664F";
const ZONE_COLORS = ["#2FD8C4", "#F0A93A", "#7EA8FF", "#E8664F", "#B486E8", "#6EDB8F", "#F2C94C", "#5FB0D9"];

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return d;
  }
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [projectNames, setProjectNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [zonaFilter, setZonaFilter] = useState("Todas");
  const [proyectoFilter, setProyectoFilter] = useState("Todos");
  const [resolvingId, setResolvingId] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const fetchRows = useCallback(async () => {
    setError(null);
    const [{ data, error: err }, { data: proyectosData }] = await Promise.all([
      supabase.from("devoluciones").select("*").eq("resuelto", false).order("created_at", { ascending: false }),
      supabase.from("proyectos").select("*"),
    ]);
    if (err) {
      setError(err.message);
    } else {
      setRows(data || []);
      setLastSync(new Date());
    }
    if (proyectosData) {
      const map = {};
      for (const p of proyectosData) map[p.campaign_id] = p.nombre;
      setProjectNames(map);
    }
    setLoading(false);
  }, []);

  const proyectoNombre = useCallback((id) => projectNames[id] || (id ? `Proyecto ${id}` : "Sin proyecto"), [projectNames]);

  useEffect(() => {
    fetchRows();
    // refresco por sondeo cada 20s, funciona haya o no realtime activado
    const poll = setInterval(fetchRows, 20000);

    // intento de suscripción realtime (si está activada en Supabase, las
    // actualizaciones llegan al instante; si no, el sondeo de arriba cubre)
    const channel = supabase
      .channel("devoluciones-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "devoluciones" }, () => fetchRows())
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [fetchRows]);

  async function resolve(id) {
    setResolvingId(id);
    const { error: err } = await supabase
      .from("devoluciones")
      .update({ resuelto: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (!err) setRows((prev) => prev.filter((r) => r.id !== id));
    setResolvingId(null);
  }

  const zonaOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.zona || "Sin clasificar"))).sort();
  }, [rows]);

  const proyectoOptions = useMemo(() => {
    const ids = Array.from(new Set(rows.map((r) => r.proyecto).filter(Boolean)));
    return ids.map((id) => ({ id, nombre: proyectoNombre(id) })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rows, proyectoNombre]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      if (zonaFilter !== "Todas" && (r.zona || "Sin clasificar") !== zonaFilter) return false;
      if (proyectoFilter !== "Todos" && String(r.proyecto) !== String(proyectoFilter)) return false;
      if (!q) return true;
      return [r.cliente, r.zona, r.numero, proyectoNombre(r.proyecto), r.agente].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, zonaFilter, proyectoFilter, proyectoNombre]);

  const zoneCounts = useMemo(() => {
    const m = {};
    for (const r of filteredRows) {
      const z = r.zona || "Sin clasificar";
      m[z] = (m[z] || 0) + 1;
    }
    return Object.entries(m).map(([zona, cantidad]) => ({ zona, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
  }, [filteredRows]);

  return (
    <div style={{ background: INK, color: TEXT, minHeight: "100vh", fontFamily: "'IBM Plex Sans', ui-sans-serif, system-ui", padding: "28px 24px" }}>
      <style>{`
        .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        ::selection { background: ${TEAL}55; }
        .scroll::-webkit-scrollbar { width: 8px; }
        .scroll::-webkit-scrollbar-thumb { background: ${LINE}; border-radius: 4px; }
        button { font-family: inherit; cursor: pointer; }
        input { font-family: inherit; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24, maxWidth: 1180, margin: "0 auto 24px" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 1, color: MUTED, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardList size={13} /> DEVOLUCIONES DE LLAMADA · PENDIENTES
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="mono" style={{ fontSize: 44, fontWeight: 600, lineHeight: 1 }}>{rows.length}</span>
            <span style={{ color: MUTED, fontSize: 15 }}>seguimientos pendientes ahora mismo</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 12, color: MUTED }}>
            {lastSync ? `Actualizado ${lastSync.toLocaleTimeString("es-ES")}` : ""}
          </span>
          <button
            onClick={fetchRows}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px 12px", color: MUTED, fontSize: 13 }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 1180, margin: "0 auto 20px", background: `${CORAL}18`, border: `1px solid ${CORAL}55`, color: CORAL, borderRadius: 10, padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <CircleAlert size={16} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13 }}>
            No se pudo conectar con la base de datos: {error}
            <div style={{ color: MUTED, marginTop: 4 }}>Revisa que la política de lectura (RLS) esté activada en la tabla "devoluciones".</div>
          </div>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ maxWidth: 1180, margin: "0 auto", color: MUTED, padding: 50, textAlign: "center", border: `1px dashed ${LINE}`, borderRadius: 12 }}>
          No hay seguimientos pendientes ahora mismo. En cuanto un agente cierre una llamada como "Seguimiento", aparecerá aquí solo.
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, alignItems: "start" }}>
          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${LINE}` }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Pendientes</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <select
                  value={zonaFilter}
                  onChange={(e) => setZonaFilter(e.target.value)}
                  style={{ background: INK, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 8px", fontSize: 12 }}
                >
                  <option value="Todas">Todas las zonas</option>
                  {zonaOptions.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
                <select
                  value={proyectoFilter}
                  onChange={(e) => setProyectoFilter(e.target.value)}
                  style={{ background: INK, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 8px", fontSize: 12, maxWidth: 160 }}
                >
                  <option value="Todos">Todos los proyectos</option>
                  {proyectoOptions.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  style={{ background: INK, color: TEXT, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, width: 140 }}
                />
              </div>
            </div>
            <div className="scroll" style={{ maxHeight: 560, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: PANEL_2 }}>
                    <th style={{ textAlign: "left", padding: "9px 14px", color: MUTED, fontWeight: 500 }}>Cliente</th>
                    <th style={{ textAlign: "left", padding: "9px 14px", color: MUTED, fontWeight: 500 }}>Zona</th>
                    <th style={{ textAlign: "left", padding: "9px 14px", color: MUTED, fontWeight: 500 }}>Proyecto</th>
                    <th style={{ textAlign: "left", padding: "9px 14px", color: MUTED, fontWeight: 500 }}>Creado</th>
                    <th style={{ textAlign: "center", padding: "9px 14px", color: MUTED, fontWeight: 500 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${LINE}` }}>
                      <td style={{ padding: "9px 14px" }}>
                        <div style={{ fontWeight: 500 }}>{r.cliente || "—"}</div>
                        <div className="mono" style={{ color: MUTED, fontSize: 11.5 }}>{r.numero}</div>
                      </td>
                      <td style={{ padding: "9px 14px", color: TEXT }}>{r.zona || "Sin clasificar"}</td>
                      <td style={{ padding: "9px 14px", color: MUTED, fontSize: 12.5 }}>{proyectoNombre(r.proyecto)}</td>
                      <td className="mono" style={{ padding: "9px 14px", color: MUTED, fontSize: 12 }}>{formatDate(r.fecha_llamada || r.created_at)}</td>
                      <td style={{ padding: "9px 14px", textAlign: "center" }}>
                        <button
                          onClick={() => resolve(r.id)}
                          disabled={resolvingId === r.id}
                          title="Marcar como resuelto"
                          style={{ background: resolvingId === r.id ? LINE : `${TEAL}22`, color: TEAL, border: `1px solid ${TEAL}55`, borderRadius: 6, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}
                        >
                          <Check size={13} /> Resuelto
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Pendientes por zona</div>
            <ResponsiveContainer width="100%" height={Math.max(200, zoneCounts.length * 30)}>
              <BarChart data={zoneCounts} layout="vertical" margin={{ left: 10, right: 24 }}>
                <CartesianGrid stroke={LINE} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: MUTED, fontSize: 11 }} axisLine={{ stroke: LINE }} tickLine={false} />
                <YAxis type="category" dataKey="zona" tick={{ fill: TEXT, fontSize: 11.5 }} width={120} axisLine={{ stroke: LINE }} tickLine={false} />
                <Tooltip contentStyle={{ background: PANEL_2, border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: TEXT }} />
                <Bar dataKey="cantidad" radius={[0, 4, 4, 0]}>
                  {zoneCounts.map((_, i) => <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
