import React, { useState, useEffect } from 'react';
import {
  Package, MapPin, ShieldAlert, Plus, Calendar, X, ChevronLeft, ChevronDown,
  Search, Trash2, Lock, AlertTriangle, CheckCircle2, XCircle, FileSearch,
  ShoppingCart, Coins, LayoutGrid, Pencil, Circle, UtensilsCrossed
} from 'lucide-react';

const FACADE_IMG = "/facade.jpg";
const CROWD_IMG = "/crowd.jpg";

const COLORS = {
  bg: '#14161B',
  surface: '#1D2027',
  surfaceAlt: '#262A33',
  border: '#3A3F4A',
  text: '#F2F0EA',
  muted: '#9195A0',
  amber: '#F5B700',
  coral: '#E8543E',
  teal: '#4FB6A8',
  violet: '#9C8FD9',
};

const STATUS = {
  pendiente: { label: 'pendiente', color: COLORS.amber, icon: AlertTriangle },
  aprobada: { label: 'aprobada', color: COLORS.teal, icon: CheckCircle2 },
  denegada: { label: 'denegada', color: COLORS.coral, icon: XCircle },
};

const SECTION_META = {
  espacio: { label: 'Espacio necesario', color: COLORS.teal, icon: MapPin },
  materialComprar: { label: 'Material por comprar', color: COLORS.amber, icon: ShoppingCart },
  materialEscuela: { label: 'Material de la escuela', color: COLORS.violet, icon: Package },
  seguridad: { label: 'Seguridad', color: COLORS.coral, icon: ShieldAlert },
};
const SECTION_ORDER = ['espacio', 'materialComprar', 'materialEscuela', 'seguridad'];

const COMITES = [
  '8M', '16 de septiembre', 'Halloween', 'Navidad',
  '14 de febrero', 'Semana cultural', 'Último día', 'Anuario', 'Clubes', 'Deportes',
];

const FECHAS_FIJAS = {
  '8M': { mes: 3, dia: 8 },
  '16 de septiembre': { mes: 9, dia: 16 },
  'Halloween': { mes: 10, dia: 31 },
  'Navidad': { mes: 12, dia: 12 },
  '14 de febrero': { mes: 2, dia: 14 },
};
const DESTACADOS_SIN_FECHA = ['Semana cultural', 'Último día'];
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const PRESUPUESTO_DEFAULT = 2000;
const CLAVES_DEFAULT = {
  admin: 'Logisticacomite/LFM',
  comunicacion: 'comitecomunicacion/LFM',
  finanzas: 'comitefinanzas/LFM',
};

function proximaFecha(mes, dia) {
  const hoy = new Date();
  const hoyMid = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let candidata = new Date(hoy.getFullYear(), mes - 1, dia);
  if (candidata < hoyMid) candidata = new Date(hoy.getFullYear() + 1, mes - 1, dia);
  return candidata;
}
function nuevoId(existentes) {
  return `EVT-${String(existentes.length + 1).padStart(3, '0')}`;
}
function nuevoIdMenu(existentes) {
  return `MENU-${String(existentes.length + 1).padStart(3, '0')}`;
}
function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// Suma lo que ya se comprometió del presupuesto de un comité: material por comprar
// de las solicitudes de evento, más los platillos de menú (comprados o sus ingredientes).
function gastoComite(comite, submissions, menus, excluirId) {
  const deSolicitudes = (submissions || [])
    .filter(s => s.comite === comite && s.status !== 'denegada' && s.status !== 'eliminada' && s.id !== excluirId)
    .reduce((sum, s) => sum + (s.sections?.materialComprar?.items || []).reduce((a, it) => a + num(it.precio), 0), 0);
  const deMenus = (menus || [])
    .filter(m => m.comite === comite && m.status !== 'denegada' && m.status !== 'eliminada' && m.id !== excluirId)
    .reduce((sum, m) => sum + (m.tipo === 'casero' ? (m.ingredientes || []).reduce((a, it) => a + num(it.precio), 0) : num(m.precio)), 0);
  return deSolicitudes + deMenus;
}

const emptyEspacioItem = () => ({ lugar: '', paraQue: '' });
const emptyMatEscuelaItem = () => ({ lugar: '', material: '', caracteristicas: '', cantidad: '' });
const emptyMatComprarItem = () => ({ objeto: '', cantidad: '', color: '', calidad: '', marca: '', paquete: '', precio: '' });
const emptyIngredienteItem = () => ({ nombre: '', cantidad: '', precio: '' });

function seccionVacia(key) {
  if (key === 'seguridad') return { horaInicio: '', horaFin: '', responsable: '', riesgos: '', medida: '' };
  const empty = key === 'espacio' ? emptyEspacioItem : key === 'materialEscuela' ? emptyMatEscuelaItem : emptyMatComprarItem;
  return { horaInicio: '', horaFin: '', responsable: '', items: [empty()] };
}
function estadoInicialSecciones() {
  return { espacio: seccionVacia('espacio'), materialComprar: seccionVacia('materialComprar'), materialEscuela: seccionVacia('materialEscuela'), seguridad: seccionVacia('seguridad') };
}
function seccionTieneContenido(key, sec) {
  if (!sec) return false;
  if (key === 'seguridad') return !!(sec.riesgos || sec.medida);
  return (sec.items || []).some(it => Object.values(it).some(v => v && String(v).trim()));
}

const inputStyle = { background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.text };

function Field({ label, required, children }) {
  return (
    <label className="block mb-3">
      <span className="text-xs tracking-wide uppercase mb-1.5 block" style={{ color: COLORS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
        {label}{required && <span style={{ color: COLORS.coral }}> *</span>}
      </span>
      {children}
    </label>
  );
}
function TextInput(props) {
  return <input {...props} style={inputStyle} className={"w-full rounded-md px-3 py-2.5 text-sm outline-none " + (props.className || '')} />;
}
function TextArea(props) {
  return <textarea {...props} style={inputStyle} rows={props.rows || 2} className={"w-full rounded-md px-3 py-2.5 text-sm outline-none resize-none " + (props.className || '')} />;
}

function ItemsEditor({ items, setItems, empty, renderItem }) {
  const updateItem = (i, key, val) => setItems(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
  const addItem = () => setItems([...items, empty()]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="mb-3 p-3 rounded-lg relative" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
          {items.length > 1 && (
            <button onClick={() => removeItem(i)} className="absolute top-2 right-2 p-1"><X size={13} style={{ color: COLORS.muted }} /></button>
          )}
          {renderItem(it, (k, v) => updateItem(i, k, v))}
        </div>
      ))}
      <button onClick={addItem} className="mono text-xs flex items-center gap-1" style={{ color: COLORS.amber }}>
        <Plus size={12} /> agregar otro
      </button>
    </div>
  );
}

function EspacioFields(it, upd) {
  return (<>
    <Field label="Lugar" required><TextInput value={it.lugar} onChange={e => upd('lugar', e.target.value)} placeholder="Ej. afuera de la cafetería" /></Field>
    <Field label="¿Para qué?" required><TextArea value={it.paraQue} onChange={e => upd('paraQue', e.target.value)} placeholder="Ej. hacer la fila para el juego" /></Field>
  </>);
}
function MatEscuelaFields(it, upd) {
  return (<>
    <Field label="Lugar (dónde está / se necesita)" required><TextInput value={it.lugar} onChange={e => upd('lugar', e.target.value)} placeholder="Ej. bodega de intendencia" /></Field>
    <Field label="Material" required><TextInput value={it.material} onChange={e => upd('material', e.target.value)} placeholder="Ej. mesa, silla, cuerda" /></Field>
    <Field label="Características"><TextInput value={it.caracteristicas} onChange={e => upd('caracteristicas', e.target.value)} placeholder="Ej. cuerda de 5 metros" /></Field>
    <Field label="Cantidad" required><TextInput value={it.cantidad} onChange={e => upd('cantidad', e.target.value)} placeholder="Ej. 2" /></Field>
  </>);
}
function MatComprarFields(it, upd) {
  return (<>
    <Field label="Objeto" required><TextInput value={it.objeto} onChange={e => upd('objeto', e.target.value)} placeholder="Ej. paquete de globos" /></Field>
    <Field label="Cantidad" required><TextInput value={it.cantidad} onChange={e => upd('cantidad', e.target.value)} placeholder="Ej. 3 paquetes" /></Field>
    <Field label="Color / características"><TextInput value={it.color} onChange={e => upd('color', e.target.value)} placeholder="Ej. rojo y amarillo" /></Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Calidad (opcional)"><TextInput value={it.calidad} onChange={e => upd('calidad', e.target.value)} placeholder="Ej. resistente" /></Field>
      <Field label="Marca (opcional)"><TextInput value={it.marca} onChange={e => upd('marca', e.target.value)} placeholder="Ej. cualquiera" /></Field>
    </div>
    <Field label="Tipo de paquete (opcional)"><TextInput value={it.paquete} onChange={e => upd('paquete', e.target.value)} placeholder="Ej. bolsa de 100 piezas" /></Field>
    <Field label="Precio aproximado (total)" required><TextInput type="number" value={it.precio} onChange={e => upd('precio', e.target.value)} placeholder="Ej. 150" /></Field>
  </>);
}

function AccordionTile({ meta, sectionKey, open, onToggle, hasContent }) {
  const Icon = meta.icon;
  return (
    <button onClick={onToggle} className="rounded-xl p-4 text-left relative" style={{ background: open ? `${meta.color}18` : COLORS.surface, border: `1px solid ${open ? meta.color : COLORS.border}` }}>
      <Icon size={18} style={{ color: meta.color }} className="mb-2" />
      <div className="text-xs font-medium leading-tight">{meta.label}</div>
      {hasContent && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />}
    </button>
  );
}

function SectionEditor({ sectionKey, section, setSection, comite, submissions, menus, editingId }) {
  const meta = SECTION_META[sectionKey];
  const isArraySection = sectionKey !== 'seguridad';

  const restante = sectionKey === 'materialComprar'
    ? (PRESUPUESTO_DEFAULT - gastoComite(comite, submissions, menus, editingId)) - (section.items || []).reduce((a, it) => a + num(it.precio), 0)
    : null;

  return (
    <div className="mt-3 p-4 rounded-xl" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hora inicio"><TextInput type="time" value={section.horaInicio} onChange={e => setSection({ ...section, horaInicio: e.target.value })} /></Field>
        <Field label="Hora fin"><TextInput type="time" value={section.horaFin} onChange={e => setSection({ ...section, horaFin: e.target.value })} /></Field>
      </div>
      <Field label="Responsable"><TextInput value={section.responsable} onChange={e => setSection({ ...section, responsable: e.target.value })} placeholder="¿Quién se encarga de esto?" /></Field>

      {sectionKey === 'seguridad' && (<>
        <Field label="¿Qué elementos pueden resultar peligrosos?" required><TextArea value={section.riesgos} onChange={e => setSection({ ...section, riesgos: e.target.value })} placeholder="Ej. los globos son de látex" /></Field>
        <Field label="Medida específica (opcional)"><TextArea value={section.medida} onChange={e => setSection({ ...section, medida: e.target.value })} placeholder="Ej. verificar que no sean alérgicos al látex" /></Field>
      </>)}

      {isArraySection && (
        <ItemsEditor
          items={section.items}
          setItems={(items) => setSection({ ...section, items })}
          empty={sectionKey === 'espacio' ? emptyEspacioItem : sectionKey === 'materialEscuela' ? emptyMatEscuelaItem : emptyMatComprarItem}
          renderItem={sectionKey === 'espacio' ? EspacioFields : sectionKey === 'materialEscuela' ? MatEscuelaFields : MatComprarFields}
        />
      )}

      {sectionKey === 'materialComprar' && (
        <div className="mt-3 text-xs mono px-3 py-2 rounded-md" style={{ background: restante < 0 ? `${COLORS.coral}18` : COLORS.surfaceAlt, color: restante < 0 ? COLORS.coral : COLORS.muted }}>
          Presupuesto de {comite}: ${restante.toFixed(0)} restantes de ${PRESUPUESTO_DEFAULT} (incluyendo esta solicitud)
        </div>
      )}
    </div>
  );
}

// Indicador de "cuánto presupuesto le queda a este comité", visible sin importar qué se esté
// llenando (evento o menú). `extra` suma lo que ya llevas escrito en el formulario actual,
// que todavía no está guardado, para que el número se sienta en tiempo real.
function BudgetBadge({ comite, submissions, menus, presupuestos, excluirId, extra = 0 }) {
  const presu = presupuestos?.[comite] ?? PRESUPUESTO_DEFAULT;
  const gasto = gastoComite(comite, submissions, menus, excluirId) + extra;
  const restante = presu - gasto;
  return (
    <div className="mb-4 text-xs mono px-3 py-2 rounded-md" style={{ background: restante < 0 ? `${COLORS.coral}18` : COLORS.surfaceAlt, color: restante < 0 ? COLORS.coral : COLORS.muted, border: `1px solid ${restante < 0 ? COLORS.coral : COLORS.border}` }}>
      Presupuesto de {comite}: ${gasto.toFixed(0)} usados de ${presu} · ${restante.toFixed(0)} restantes
    </div>
  );
}

function EventForm({ mode, editingId, comite, setComite, actividad, setActividad, dia, setDia, horaInicio, setHoraInicio, horaFin, setHoraFin,
  sections, setSections, nombre, setNombre, correo, setCorreo, submissions, menus, presupuestos, onSubmit, onBack }) {
  const [open, setOpen] = useState({});

  // Solo una pestaña abierta a la vez: al abrir otra, se cierra la anterior (sin perder lo llenado, que vive en `sections`).
  const toggle = (k) => setOpen(o => (o[k] ? {} : { [k]: true }));
  const setSection = (k, val) => setSections(s => ({ ...s, [k]: val }));

  const puedeEnviar = comite && actividad && dia && horaInicio && horaFin && nombre && correo;
  const extraDraft = (sections.materialComprar?.items || []).reduce((a, it) => a + num(it.precio), 0);

  return (
    <div className="px-5 pt-8">
      <BackHeader onBack={onBack} title={mode === 'editar-propio' ? `Editando ${editingId}` : 'Actividad a realizar'} />

      {mode === 'editar-propio' && (
        <div className="mb-4 px-3 py-2 rounded-md text-xs" style={{ background: `${COLORS.amber}15`, color: COLORS.amber, border: `1px solid ${COLORS.amber}44` }}>
          Al guardar cambios, tu solicitud vuelve a estado <b>pendiente</b> para que logística la revise de nuevo.
        </div>
      )}

      <Field label="Comité" required>
        <select value={comite} onChange={e => setComite(e.target.value)} style={inputStyle} className="w-full rounded-md px-3 py-2.5 text-sm outline-none">
          {COMITES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <BudgetBadge comite={comite} submissions={submissions} menus={menus} presupuestos={presupuestos} excluirId={editingId} extra={extraDraft} />

      <Field label="Descripción de la actividad" required>
        <TextArea value={actividad} onChange={e => setActividad(e.target.value)} placeholder="Ej. Juego de inflar globos" />
      </Field>

      <Field label="Día" required><TextInput type="date" value={dia} onChange={e => setDia(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3 mb-2">
        <Field label="Hora inicio" required><TextInput type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} /></Field>
        <Field label="Hora fin" required><TextInput type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 mb-1">
        {SECTION_ORDER.map(key => (
          <AccordionTile key={key} meta={SECTION_META[key]} sectionKey={key} open={!!open[key]} onToggle={() => toggle(key)} hasContent={seccionTieneContenido(key, sections[key])} />
        ))}
      </div>
      {SECTION_ORDER.map(key => open[key] && (
        <SectionEditor key={key} sectionKey={key} section={sections[key]} setSection={(v) => setSection(key, v)} comite={comite} submissions={submissions} menus={menus} editingId={editingId} />
      ))}

      <div className="my-6 h-px" style={{ backgroundImage: `repeating-linear-gradient(to right, ${COLORS.border} 0 6px, transparent 6px 12px)` }} />

      <Field label="Tu nombre" required><TextInput value={nombre} onChange={e => setNombre(e.target.value)} /></Field>
      <Field label="Tu correo" required><TextInput type="email" value={correo} onChange={e => setCorreo(e.target.value)} /></Field>

      <button onClick={onSubmit} disabled={!puedeEnviar} className="w-full mt-2 rounded-xl py-3.5 display text-sm disabled:opacity-40" style={{ background: COLORS.amber, color: '#14161B' }}>
        {mode === 'editar-propio' ? 'GUARDAR CAMBIOS' : 'ENVIAR SOLICITUD'}
      </button>
    </div>
  );
}

function MenuForm({ mode, editingId, comite, setComite, platillo, setPlatillo, dia, setDia, horaInicio, setHoraInicio, horaFin, setHoraFin,
  tipo, setTipo, ingredientes, setIngredientes, precioComprado, setPrecioComprado, nombre, setNombre, correo, setCorreo,
  submissions, menus, presupuestos, onSubmit, onBack }) {

  const extraDraft = tipo === 'casero' ? (ingredientes || []).reduce((a, it) => a + num(it.precio), 0) : num(precioComprado);
  const puedeEnviar = comite && platillo && dia && horaInicio && horaFin && tipo && nombre && correo && (tipo === 'comprado' ? precioComprado : true);

  return (
    <div className="px-5 pt-8">
      <BackHeader onBack={onBack} title={mode === 'editar-propio' ? `Editando ${editingId}` : 'Añadir platillo'} />

      <Field label="Comité" required>
        <select value={comite} onChange={e => setComite(e.target.value)} style={inputStyle} className="w-full rounded-md px-3 py-2.5 text-sm outline-none">
          {COMITES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <BudgetBadge comite={comite} submissions={submissions} menus={menus} presupuestos={presupuestos} excluirId={editingId} extra={extraDraft} />

      <Field label="Nombre del platillo" required><TextInput value={platillo} onChange={e => setPlatillo(e.target.value)} placeholder="Ej. pan de muerto" /></Field>
      <Field label="Día" required><TextInput type="date" value={dia} onChange={e => setDia(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hora inicio" required><TextInput type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} /></Field>
        <Field label="Hora fin" required><TextInput type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} /></Field>
      </div>

      <Field label="¿Casero o comprado?" required>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTipo('casero')} className="flex-1 rounded-md py-2.5 text-sm" style={{ background: tipo === 'casero' ? COLORS.amber : COLORS.surfaceAlt, color: tipo === 'casero' ? '#14161B' : COLORS.text }}>Casero</button>
          <button type="button" onClick={() => setTipo('comprado')} className="flex-1 rounded-md py-2.5 text-sm" style={{ background: tipo === 'comprado' ? COLORS.amber : COLORS.surfaceAlt, color: tipo === 'comprado' ? '#14161B' : COLORS.text }}>Comprado</button>
        </div>
      </Field>

      {tipo === 'casero' && (
        <div className="mt-2 mb-2">
          <div className="text-xs mono uppercase mb-2" style={{ color: COLORS.violet }}>Ingredientes por comprar</div>
          <ItemsEditor
            items={ingredientes}
            setItems={setIngredientes}
            empty={emptyIngredienteItem}
            renderItem={(it, upd) => (<>
              <Field label="Ingrediente" required><TextInput value={it.nombre} onChange={e => upd('nombre', e.target.value)} placeholder="Ej. harina" /></Field>
              <Field label="Cantidad" required><TextInput value={it.cantidad} onChange={e => upd('cantidad', e.target.value)} placeholder="Ej. 1 kg" /></Field>
              <Field label="Precio aproximado" required><TextInput type="number" value={it.precio} onChange={e => upd('precio', e.target.value)} placeholder="Ej. 40" /></Field>
            </>)}
          />
        </div>
      )}

      {tipo === 'comprado' && (
        <Field label="Precio aproximado" required><TextInput type="number" value={precioComprado} onChange={e => setPrecioComprado(e.target.value)} placeholder="Ej. 250" /></Field>
      )}

      <div className="my-6 h-px" style={{ backgroundImage: `repeating-linear-gradient(to right, ${COLORS.border} 0 6px, transparent 6px 12px)` }} />

      <Field label="Tu nombre" required><TextInput value={nombre} onChange={e => setNombre(e.target.value)} /></Field>
      <Field label="Tu correo" required><TextInput type="email" value={correo} onChange={e => setCorreo(e.target.value)} /></Field>

      <button onClick={onSubmit} disabled={!puedeEnviar} className="w-full mt-2 rounded-xl py-3.5 display text-sm disabled:opacity-40" style={{ background: COLORS.amber, color: '#14161B' }}>
        {mode === 'editar-propio' ? 'GUARDAR CAMBIOS' : 'ENVIAR PLATILLO'}
      </button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('home');
  const [mode, setMode] = useState('crear');
  const [editingId, setEditingId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastId, setLastId] = useState(null);
  const [lastKind, setLastKind] = useState('evento'); // 'evento' | 'menu' — para saber qué mostrar/repetir en la confirmación

  // form state (evento)
  const [comite, setComite] = useState(COMITES[0]);
  const [actividad, setActividad] = useState('');
  const [dia, setDia] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [sections, setSections] = useState(estadoInicialSecciones());
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');

  // form state (menú)
  const [menus, setMenus] = useState([]);
  const [mEditingId, setMEditingId] = useState(null);
  const [mComite, setMComite] = useState(COMITES[0]);
  const [platillo, setPlatillo] = useState('');
  const [mDia, setMDia] = useState('');
  const [mHoraInicio, setMHoraInicio] = useState('');
  const [mHoraFin, setMHoraFin] = useState('');
  const [tipoPlatillo, setTipoPlatillo] = useState('');
  const [ingredientes, setIngredientes] = useState([emptyIngredienteItem()]);
  const [precioComprado, setPrecioComprado] = useState('');
  const [mNombre, setMNombre] = useState('');
  const [mCorreo, setMCorreo] = useState('');

  const [panelUnlocked, setPanelUnlocked] = useState(false);
  const [panelRole, setPanelRole] = useState(null); // 'admin' | 'comunicacion' | 'finanzas'
  const [claves, setClaves] = useState(CLAVES_DEFAULT);
  const [pass, setPass] = useState('');
  const [panelTab, setPanelTab] = useState('tabla');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [presupuestos, setPresupuestos] = useState({});

  const [buscarFolio, setBuscarFolio] = useState('');
  const [buscarCorreo, setBuscarCorreo] = useState('');
  const [buscarError, setBuscarError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await window.storage.get('solicitudes', true);
      setSubmissions(res ? JSON.parse(res.value) : []);
    } catch (e) { setSubmissions([]); }
    try {
      const res2 = await window.storage.get('presupuestos', true);
      setPresupuestos(res2 ? JSON.parse(res2.value) : {});
    } catch (e) { setPresupuestos({}); }
    try {
      const res3 = await window.storage.get('menus', true);
      setMenus(res3 ? JSON.parse(res3.value) : []);
    } catch (e) { setMenus([]); }
    try {
      const res4 = await window.storage.get('claves', true);
      setClaves(res4 ? { ...CLAVES_DEFAULT, ...JSON.parse(res4.value) } : CLAVES_DEFAULT);
    } catch (e) { setClaves(CLAVES_DEFAULT); }
    setLoading(false);
  }
  async function save(next) {
    setSubmissions(next);
    try { await window.storage.set('solicitudes', JSON.stringify(next), true); } catch (e) {}
  }
  async function saveClaves(next) {
    setClaves(next);
    try { await window.storage.set('claves', JSON.stringify(next), true); } catch (e) {}
  }
  async function saveMenus(next) {
    setMenus(next);
    try { await window.storage.set('menus', JSON.stringify(next), true); } catch (e) {}
  }
  async function savePresupuestos(next) {
    setPresupuestos(next);
    try { await window.storage.set('presupuestos', JSON.stringify(next), true); } catch (e) {}
  }
  function presupuestoDe(c) { return presupuestos[c] ?? PRESUPUESTO_DEFAULT; }

  function entrarPanel() {
    const rol = Object.keys(claves).find(r => claves[r] === pass);
    if (!rol) return;
    setPanelRole(rol);
    setPanelUnlocked(true);
    setPanelTab(rol === 'finanzas' ? 'presupuestos' : rol === 'comunicacion' ? 'planning' : 'tabla');
  }

  function resetForm() {
    setComite(COMITES[0]); setActividad(''); setDia(''); setHoraInicio(''); setHoraFin('');
    setSections(estadoInicialSecciones()); setNombre(''); setCorreo('');
  }
  function startCreate() {
    setMode('crear'); setEditingId(null); resetForm(); setView('form');
  }

  function resetMenuForm() {
    setMComite(COMITES[0]); setPlatillo(''); setMDia(''); setMHoraInicio(''); setMHoraFin('');
    setTipoPlatillo(''); setIngredientes([emptyIngredienteItem()]); setPrecioComprado('');
    setMNombre(''); setMCorreo('');
  }
  function startCreateMenu() {
    setMode('crear'); setMEditingId(null); resetMenuForm(); setView('menuForm');
  }

  async function submit() {
    if (mode === 'editar-propio' && editingId) {
      const record = { id: editingId, comite, actividad, dia, horaInicio, horaFin, sections, nombre, correo, status: 'pendiente', editedAt: new Date().toISOString() };
      const next = submissions.map(s => s.id === editingId ? { ...s, ...record } : s);
      await save(next);
      setLastId(editingId);
      setLastKind('evento');
      setView('confirm');
      return;
    }
    const id = nuevoId(submissions);
    const record = { id, comite, actividad, dia, horaInicio, horaFin, sections, nombre, correo, status: 'pendiente', createdAt: new Date().toISOString() };
    await save([record, ...submissions]);
    setLastId(id);
    setLastKind('evento');
    setView('confirm');
  }

  async function submitMenu() {
    if (mode === 'editar-propio' && mEditingId) {
      const record = { id: mEditingId, comite: mComite, platillo, dia: mDia, horaInicio: mHoraInicio, horaFin: mHoraFin, tipo: tipoPlatillo, ingredientes, precio: precioComprado, nombre: mNombre, correo: mCorreo, status: 'pendiente', editedAt: new Date().toISOString() };
      const next = menus.map(m => m.id === mEditingId ? { ...m, ...record } : m);
      await saveMenus(next);
      setLastId(mEditingId);
      setLastKind('menu');
      setView('confirm');
      return;
    }
    const id = nuevoIdMenu(menus);
    const record = { id, comite: mComite, platillo, dia: mDia, horaInicio: mHoraInicio, horaFin: mHoraFin, tipo: tipoPlatillo, ingredientes, precio: precioComprado, nombre: mNombre, correo: mCorreo, status: 'pendiente', createdAt: new Date().toISOString() };
    await saveMenus([record, ...menus]);
    setLastId(id);
    setLastKind('menu');
    setView('confirm');
  }

  function buscarMiFolio() {
    setBuscarError('');
    const folio = buscarFolio.trim().toLowerCase();
    const correoBuscado = buscarCorreo.trim().toLowerCase();
    const enEventos = submissions.find(s => s.id.toLowerCase() === folio && (s.correo || '').toLowerCase() === correoBuscado);
    const enMenus = !enEventos && menus.find(m => m.id.toLowerCase() === folio && (m.correo || '').toLowerCase() === correoBuscado);
    const encontrada = enEventos || enMenus;
    if (!encontrada) { setBuscarError('No encontramos una solicitud con ese folio y correo.'); return; }
    if (encontrada.status === 'eliminada') { setBuscarError('Esta solicitud fue eliminada por el equipo de logística.'); return; }
    if (enMenus) {
      setMode('editar-propio'); setMEditingId(encontrada.id);
      setMComite(encontrada.comite); setPlatillo(encontrada.platillo); setMDia(encontrada.dia || '');
      setMHoraInicio(encontrada.horaInicio || ''); setMHoraFin(encontrada.horaFin || '');
      setTipoPlatillo(encontrada.tipo || ''); setIngredientes(encontrada.ingredientes?.length ? encontrada.ingredientes : [emptyIngredienteItem()]);
      setPrecioComprado(encontrada.precio || '');
      setMNombre(encontrada.nombre || ''); setMCorreo(encontrada.correo || '');
      setView('menuForm');
      return;
    }
    setMode('editar-propio'); setEditingId(encontrada.id);
    setComite(encontrada.comite); setActividad(encontrada.actividad); setDia(encontrada.dia || '');
    setHoraInicio(encontrada.horaInicio || ''); setHoraFin(encontrada.horaFin || '');
    setSections(encontrada.sections || estadoInicialSecciones());
    setNombre(encontrada.nombre || ''); setCorreo(encontrada.correo || '');
    setView('form');
  }

  async function setStatus(id, status) {
    await save(submissions.map(s => s.id === id ? { ...s, status } : s));
  }
  async function remove(id) {
    // Borrado suave: queda marcada como eliminada (no desaparece del todo) para poder avisarle
    // a quien la creó si intenta buscar ese folio más tarde.
    await save(submissions.map(s => s.id === id ? { ...s, status: 'eliminada' } : s));
    if (expandedId === id) { setExpandedId(null); setEditRecord(null); }
  }
  async function setMenuStatus(id, status) {
    await saveMenus(menus.map(m => m.id === id ? { ...m, status } : m));
  }
  async function removeMenu(id) {
    await saveMenus(menus.map(m => m.id === id ? { ...m, status: 'eliminada' } : m));
  }
  function openEdit(s) {
    setExpandedId(s.id);
    setEditRecord({ ...s, sections: s.sections || estadoInicialSecciones() });
  }
  async function saveEdit() {
    await save(submissions.map(s => s.id === editRecord.id ? { ...editRecord } : s));
    setExpandedId(null); setEditRecord(null);
  }

  const eventosConFecha = Object.entries(FECHAS_FIJAS).map(([nombre, { mes, dia }]) => ({ nombre, fecha: proximaFecha(mes, dia), sinFecha: false })).sort((a, b) => a.fecha - b.fecha);
  const eventosSinFecha = DESTACADOS_SIN_FECHA.map(nombre => ({ nombre, fecha: null, sinFecha: true }));
  const eventosDestacados = [...eventosConFecha, ...eventosSinFecha];
  const comitesContinuos = COMITES.filter(c => !FECHAS_FIJAS[c] && !DESTACADOS_SIN_FECHA.includes(c));

  const filtered = submissions
    .filter(s => s.status !== 'eliminada')
    .filter(s => !search || s.comite.toLowerCase().includes(search.toLowerCase()) || (s.actividad || '').toLowerCase().includes(search.toLowerCase()));
  const aprobadas = submissions.filter(s => s.status === 'aprobada' && s.dia).sort((a, b) => (a.dia + (a.horaInicio||'')).localeCompare(b.dia + (b.horaInicio||'')));

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Caveat:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .display { font-family: 'Archivo Black', sans-serif; letter-spacing: -0.01em; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .hand { font-family: 'Caveat', cursive; }
        select { color-scheme: dark; }
        .grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.05; mix-blend-mode: overlay; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
      `}</style>
      <div className="grain" />

      <div className="max-w-3xl mx-auto pb-16">

        {view === 'home' && (
          <>
            <div className="relative w-full overflow-hidden mb-6" style={{ height: '170px' }}>
              <img src={FACADE_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(0.9)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,22,27,0.1) 0%, rgba(20,22,27,0.75) 100%)' }} />
              <div className="absolute top-4 right-4">
                <button onClick={() => setView('panel')} className="p-2.5 rounded-full backdrop-blur-sm" style={{ background: 'rgba(29,32,39,0.6)', border: `1px solid ${COLORS.border}` }}>
                  <Lock size={16} style={{ color: COLORS.text }} />
                </button>
              </div>
            </div>

            <div className="px-5">
              <div className="flex gap-2 mb-3">
                <button onClick={startCreate} className="flex-1 rounded-xl p-5 flex items-center justify-between" style={{ background: COLORS.amber }}>
                  <div className="display text-lg" style={{ color: '#14161B' }}>+ CREAR SOLICITUD</div>
                  <Plus size={28} style={{ color: '#14161B' }} />
                </button>
                <button onClick={() => setView('menu')} className="rounded-xl px-4 flex flex-col items-center justify-center gap-1" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                  <UtensilsCrossed size={16} style={{ color: COLORS.muted }} />
                  <span className="text-[10px]" style={{ color: COLORS.muted }}>Menú</span>
                </button>
              </div>

              <button onClick={() => { setBuscarError(''); setBuscarFolio(''); setBuscarCorreo(''); setView('buscar'); }} className="w-full mb-8 rounded-xl p-4 flex items-center gap-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                <FileSearch size={20} style={{ color: COLORS.muted }} />
                <div className="text-left">
                  <div className="text-sm font-medium">Editar mi solicitud</div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>Consulta o modifica un folio ya enviado</div>
                </div>
              </button>

              <div className="flex items-center gap-2 mb-3">
                <Calendar size={15} style={{ color: COLORS.muted }} />
                <h2 className="mono text-xs tracking-widest uppercase" style={{ color: COLORS.muted }}>Próximos eventos</h2>
              </div>
              <div className="space-y-2 mb-8">
                {eventosDestacados.map(ev => (
                  <div key={ev.nombre} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                    <div className="font-medium text-sm">{ev.nombre}</div>
                    {!ev.sinFecha && (
                      <div className="mono text-xs" style={{ color: COLORS.muted }}>{ev.fecha.getDate()} {MESES[ev.fecha.getMonth()]}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Circle size={15} style={{ color: COLORS.muted }} />
                <h2 className="mono text-xs tracking-widest uppercase" style={{ color: COLORS.muted }}>Actividades continuas</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {comitesContinuos.map(c => <span key={c} className="text-xs px-3 py-1.5 rounded-full" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.muted }}>{c}</span>)}
              </div>
            </div>
          </>
        )}

        {view === 'buscar' && (
          <div className="px-5 pt-8">
            <BackHeader onBack={() => setView('home')} title="Editar mi solicitud" />
            <p className="text-sm mb-5" style={{ color: COLORS.muted }}>Ingresa el folio que te dimos al enviar tu solicitud y el correo con el que la registraste.</p>
            <Field label="Folio" required><TextInput value={buscarFolio} onChange={e => setBuscarFolio(e.target.value)} placeholder="Ej. EVT-001" /></Field>
            <Field label="Correo" required><TextInput type="email" value={buscarCorreo} onChange={e => setBuscarCorreo(e.target.value)} /></Field>
            {buscarError && <div className="text-sm mb-4" style={{ color: COLORS.coral }}>{buscarError}</div>}
            <button onClick={buscarMiFolio} disabled={!buscarFolio || !buscarCorreo} className="w-full rounded-xl py-3.5 display text-sm disabled:opacity-40" style={{ background: COLORS.amber, color: '#14161B' }}>BUSCAR SOLICITUD</button>
          </div>
        )}

        {view === 'form' && (
          <EventForm mode={mode} editingId={editingId} comite={comite} setComite={setComite} actividad={actividad} setActividad={setActividad}
            dia={dia} setDia={setDia} horaInicio={horaInicio} setHoraInicio={setHoraInicio} horaFin={horaFin} setHoraFin={setHoraFin}
            sections={sections} setSections={setSections} nombre={nombre} setNombre={setNombre} correo={correo} setCorreo={setCorreo}
            submissions={submissions} menus={menus} presupuestos={presupuestos} onSubmit={submit} onBack={() => setView(mode === 'editar-propio' ? 'buscar' : 'home')} />
        )}

        {view === 'menu' && (
          <div className="px-5 pt-8">
            <BackHeader onBack={() => setView('home')} title="Menú de eventos" />
            <button onClick={startCreateMenu} className="w-full mb-6 rounded-xl p-4 flex items-center justify-between" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center gap-2">
                <UtensilsCrossed size={18} style={{ color: COLORS.amber }} />
                <span className="text-sm font-medium">Añadir platillo</span>
              </div>
              <Plus size={18} style={{ color: COLORS.muted }} />
            </button>

            <div className="space-y-2">
              {menus.filter(m => m.status !== 'eliminada').map(m => (
                <div key={m.id} className="rounded-lg p-3" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">{m.platillo}</div>
                    <span className="text-xs mono" style={{ color: COLORS.muted }}>{m.dia}</span>
                  </div>
                  <div className="text-xs" style={{ color: COLORS.muted }}>{m.comite} · {m.tipo === 'casero' ? 'casero' : 'comprado'}</div>
                </div>
              ))}
              {menus.filter(m => m.status !== 'eliminada').length === 0 && <div className="text-sm text-center py-8" style={{ color: COLORS.muted }}>Aún no hay platillos registrados.</div>}
            </div>
          </div>
        )}

        {view === 'menuForm' && (
          <MenuForm mode={mode} editingId={mEditingId} comite={mComite} setComite={setMComite} platillo={platillo} setPlatillo={setPlatillo}
            dia={mDia} setDia={setMDia} horaInicio={mHoraInicio} setHoraInicio={setMHoraInicio} horaFin={mHoraFin} setHoraFin={setMHoraFin}
            tipo={tipoPlatillo} setTipo={setTipoPlatillo} ingredientes={ingredientes} setIngredientes={setIngredientes}
            precioComprado={precioComprado} setPrecioComprado={setPrecioComprado} nombre={mNombre} setNombre={setMNombre} correo={mCorreo} setCorreo={setMCorreo}
            submissions={submissions} menus={menus} presupuestos={presupuestos} onSubmit={submitMenu} onBack={() => setView(mode === 'editar-propio' ? 'buscar' : 'menu')} />
        )}

        {view === 'confirm' && (
          <div className="relative" style={{ minHeight: '480px' }}>
            <img src={CROWD_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(20,22,27,0.55) 0%, rgba(20,22,27,0.88) 60%, rgba(20,22,27,0.98) 100%)' }} />
            <div className="relative flex flex-col items-center text-center px-5 pt-24">
              <div className="hand text-2xl mb-3" style={{ color: COLORS.amber }}>¡ya quedó!</div>
              <div className="rounded-xl p-8 w-full backdrop-blur-sm" style={{ background: 'rgba(29,32,39,0.85)', border: `1px solid ${COLORS.border}` }}>
                <CheckCircle2 size={36} style={{ color: COLORS.amber }} className="mx-auto mb-4" />
                <div className="mono text-xs tracking-widest uppercase mb-1" style={{ color: COLORS.muted }}>{mode === 'editar-propio' ? 'Cambios guardados' : 'Folio generado'}</div>
                <div className="display text-3xl mb-4">{lastId}</div>
                <div className="text-sm" style={{ color: COLORS.muted }}>{mode === 'editar-propio' ? 'Tu solicitud fue actualizada y quedó marcada como pendiente de revisión.' : 'Logística revisará tu solicitud. Guarda este folio por si necesitas darle seguimiento.'}</div>
              </div>
              <div className="flex gap-3 mt-6 w-full">
                <button onClick={lastKind === 'menu' ? startCreateMenu : startCreate} className="flex-1 rounded-lg py-3 text-sm border backdrop-blur-sm" style={{ borderColor: COLORS.border, color: COLORS.text, background: 'rgba(29,32,39,0.5)' }}>{lastKind === 'menu' ? 'Otro platillo' : 'Otra solicitud'}</button>
                <button onClick={() => setView('home')} className="flex-1 rounded-lg py-3 text-sm display" style={{ background: COLORS.amber, color: '#14161B' }}>Volver al inicio</button>
              </div>
            </div>
          </div>
        )}

        {view === 'panel' && !panelUnlocked && (
          <div className="flex flex-col items-center pt-16 text-center px-5">
            <Lock size={28} style={{ color: COLORS.muted }} className="mb-4" />
            <div className="mono text-xs tracking-widest uppercase mb-4" style={{ color: COLORS.muted }}>Panel de logística</div>
            <TextInput type="password" placeholder="Clave del equipo" value={pass} onChange={e => setPass(e.target.value)} className="max-w-xs" />
            <button onClick={entrarPanel} className="mt-4 px-6 py-2.5 rounded-lg display text-sm" style={{ background: COLORS.amber, color: '#14161B' }}>ENTRAR</button>
            <button onClick={() => setView('home')} className="mt-3 text-xs" style={{ color: COLORS.muted }}>Volver</button>
          </div>
        )}

        {view === 'panel' && panelUnlocked && (
          <div className="px-5 pt-8">
            <BackHeader onBack={() => setView('home')} title="Panel de logística" />

            <div className="flex gap-2 mb-5" style={{ flexWrap: 'wrap' }}>
              {[['tabla','Solicitudes',LayoutGrid],['menu','Menú',UtensilsCrossed],['planning','Planning',Calendar],['presupuestos','Presupuestos',Coins],['ajustes','Ajustes',Lock]]
                .filter(([key]) => panelRole === 'admin' || (panelRole === 'comunicacion' && key === 'planning') || (panelRole === 'finanzas' && key === 'presupuestos'))
                .map(([key,label,Icon]) => (
                <button key={key} onClick={() => setPanelTab(key)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs" style={{ minWidth: '45%', background: panelTab===key ? COLORS.amber : COLORS.surface, color: panelTab===key ? '#14161B' : COLORS.muted, border: `1px solid ${panelTab===key?COLORS.amber:COLORS.border}` }}>
                  <Icon size={13}/>{label}
                </button>
              ))}
            </div>

            {panelTab === 'tabla' && panelRole === 'admin' && (
              <>
                <div className="flex items-center gap-2 mb-4 rounded-md px-3" style={inputStyle}>
                  <Search size={14} style={{ color: COLORS.muted }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar comité o actividad..." className="bg-transparent outline-none py-2.5 text-sm w-full" style={{ color: COLORS.text }} />
                </div>

                {loading && <div className="text-sm text-center py-8" style={{ color: COLORS.muted }}>Cargando...</div>}
                {!loading && filtered.length === 0 && <div className="text-sm text-center py-12" style={{ color: COLORS.muted }}>Sin solicitudes todavía.</div>}

                <div className="overflow-x-auto -mx-5 px-5 mb-2">
                  <div style={{ minWidth: '900px' }}>
                    <div className="flex gap-2 mono text-[10px] uppercase pb-2" style={{ color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>
                      <div style={{ width: 70 }}>Folio</div>
                      <div style={{ width: 100 }}>Comité</div>
                      <div style={{ width: 140 }}>Actividad</div>
                      <div style={{ width: 100 }}>Día/Hora</div>
                      <div style={{ width: 130 }}>Espacios</div>
                      <div style={{ width: 130 }}>Mat. escuela</div>
                      <div style={{ width: 150 }}>Mat. comprar</div>
                      <div style={{ width: 90 }}>Estado</div>
                      <div style={{ width: 90 }}>Acciones</div>
                    </div>
                    {filtered.map(s => (
                      <div key={s.id} className="flex gap-2 text-xs py-3 items-start" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <div className="mono" style={{ width: 70, color: COLORS.amber }}>{s.id}</div>
                        <div style={{ width: 100 }}>{s.comite}</div>
                        <div style={{ width: 140 }} className="truncate">{s.actividad}</div>
                        <div style={{ width: 100, color: COLORS.muted }}>{s.dia}<br/>{s.horaInicio}-{s.horaFin}</div>
                        <div style={{ width: 130, color: COLORS.muted }}>{(s.sections?.espacio?.items||[]).map(i=>i.lugar).filter(Boolean).join(', ') || '—'}</div>
                        <div style={{ width: 130, color: COLORS.muted }}>{(s.sections?.materialEscuela?.items||[]).map(i=>i.material).filter(Boolean).join(', ') || '—'}</div>
                        <div style={{ width: 150, color: COLORS.muted }}>
                          {(s.sections?.materialComprar?.items||[]).map(i=>i.objeto).filter(Boolean).join(', ') || '—'}
                          {(s.sections?.materialComprar?.items||[]).length>0 && <div className="mono" style={{color:COLORS.amber}}>${(s.sections.materialComprar.items.reduce((a,i)=>a+num(i.precio),0)).toFixed(0)}</div>}
                        </div>
                        <div style={{ width: 90 }}>
                          <span className="px-2 py-0.5 rounded-full" style={{ background: `${STATUS[s.status]?.color||COLORS.amber}22`, color: STATUS[s.status]?.color||COLORS.amber }}>{STATUS[s.status]?.label||s.status}</span>
                        </div>
                        <div style={{ width: 90 }} className="flex gap-2">
                          <button onClick={() => openEdit(s)}><Pencil size={13} style={{ color: COLORS.muted }} /></button>
                          <button onClick={() => remove(s.id)}><Trash2 size={13} style={{ color: COLORS.muted }} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {expandedId && editRecord && (
                  <div className="rounded-xl p-4 mt-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="display text-sm">{editRecord.id} · {editRecord.comite}</div>
                      <button onClick={() => { setExpandedId(null); setEditRecord(null); }}><X size={16} style={{ color: COLORS.muted }} /></button>
                    </div>
                    <div className="text-xs mb-3" style={{ color: COLORS.muted }}>{editRecord.nombre} · {editRecord.correo}</div>

                    <Field label="Actividad"><TextArea value={editRecord.actividad} onChange={e => setEditRecord({ ...editRecord, actividad: e.target.value })} /></Field>
                    <Field label="Día"><TextInput type="date" value={editRecord.dia} onChange={e => setEditRecord({ ...editRecord, dia: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Hora inicio"><TextInput type="time" value={editRecord.horaInicio} onChange={e => setEditRecord({ ...editRecord, horaInicio: e.target.value })} /></Field>
                      <Field label="Hora fin"><TextInput type="time" value={editRecord.horaFin} onChange={e => setEditRecord({ ...editRecord, horaFin: e.target.value })} /></Field>
                    </div>

                    {SECTION_ORDER.map(key => (
                      <div key={key} className="mt-3">
                        <div className="text-xs mono uppercase mb-1" style={{ color: SECTION_META[key].color }}>{SECTION_META[key].label}</div>
                        <SectionEditor sectionKey={key} section={editRecord.sections?.[key] || seccionVacia(key)} setSection={(v) => setEditRecord({ ...editRecord, sections: { ...editRecord.sections, [key]: v } })} comite={editRecord.comite} submissions={submissions} menus={menus} editingId={editRecord.id} />
                      </div>
                    ))}

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setStatus(editRecord.id, 'aprobada')} className="flex-1 rounded-md py-2 text-xs flex items-center justify-center gap-1" style={{ background: `${COLORS.teal}22`, color: COLORS.teal }}><CheckCircle2 size={12}/> Aprobar</button>
                      <button onClick={() => setStatus(editRecord.id, 'denegada')} className="flex-1 rounded-md py-2 text-xs flex items-center justify-center gap-1" style={{ background: `${COLORS.coral}22`, color: COLORS.coral }}><XCircle size={12}/> Denegar</button>
                    </div>
                    <button onClick={saveEdit} className="w-full mt-2 rounded-md py-2.5 text-xs display" style={{ background: COLORS.amber, color: '#14161B' }}>GUARDAR CAMBIOS</button>
                  </div>
                )}
              </>
            )}

            {panelTab === 'planning' && (panelRole === 'admin' || panelRole === 'comunicacion') && (
              <div className="overflow-x-auto -mx-5 px-5">
                <div style={{ minWidth: '700px' }}>
                  <div className="flex gap-2 mono text-[10px] uppercase pb-2" style={{ color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ width: 90 }}>Fecha</div>
                    <div style={{ width: 100 }}>Horario</div>
                    <div style={{ width: 180 }}>Actividad</div>
                    <div style={{ width: 320 }}>Detalles</div>
                  </div>
                  {aprobadas.length === 0 && <div className="text-sm text-center py-10" style={{ color: COLORS.muted }}>Aún no hay solicitudes aprobadas con fecha.</div>}
                  {aprobadas.map(s => {
                    const detalles = [
                      ...(s.sections?.espacio?.items||[]).map(i=>`Espacio: ${i.lugar}`),
                      ...(s.sections?.materialEscuela?.items||[]).map(i=>`Escuela: ${i.material}`),
                      ...(s.sections?.materialComprar?.items||[]).map(i=>`Comprar: ${i.objeto}`),
                      s.sections?.seguridad?.riesgos ? `Seguridad: ${s.sections.seguridad.riesgos}` : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <div key={s.id} className="flex gap-2 text-xs py-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <div className="mono" style={{ width: 90, color: COLORS.muted }}>{s.dia}</div>
                        <div className="mono" style={{ width: 100, color: COLORS.muted }}>{s.horaInicio}-{s.horaFin}</div>
                        <div style={{ width: 180 }}>{s.actividad} <span style={{color:COLORS.muted}}>({s.comite})</span></div>
                        <div style={{ width: 320, color: COLORS.muted }}>{detalles || '—'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {panelTab === 'menu' && panelRole === 'admin' && (
              <div className="space-y-3">
                {menus.filter(m => m.status !== 'eliminada').length === 0 && <div className="text-sm text-center py-10" style={{ color: COLORS.muted }}>Sin platillos registrados.</div>}
                {menus.filter(m => m.status !== 'eliminada').map(m => {
                  const St = STATUS[m.status] || STATUS.pendiente;
                  const costo = m.tipo === 'casero' ? (m.ingredientes || []).reduce((a, it) => a + num(it.precio), 0) : num(m.precio);
                  return (
                    <div key={m.id} className="rounded-lg p-4" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed size={14} style={{ color: COLORS.violet }} />
                          <span className="mono text-xs" style={{ color: COLORS.violet }}>{m.id}</span>
                          <span className="text-xs" style={{ color: COLORS.muted }}>· {m.comite}</span>
                        </div>
                        <button onClick={() => removeMenu(m.id)}><Trash2 size={13} style={{ color: COLORS.muted }} /></button>
                      </div>
                      <div className="text-sm font-medium mb-1">{m.platillo}</div>
                      <div className="text-xs mb-2" style={{ color: COLORS.muted }}>{m.dia} · {m.horaInicio}-{m.horaFin} · {m.tipo === 'casero' ? 'casero' : 'comprado'} · ${costo.toFixed(0)}</div>
                      {m.tipo === 'casero' && (m.ingredientes || []).length > 0 && (
                        <div className="text-xs mb-2" style={{ color: COLORS.muted }}>Ingredientes: {m.ingredientes.map(i => i.nombre).filter(Boolean).join(', ')}</div>
                      )}
                      <div className="flex items-center justify-between pt-2 gap-2 flex-wrap" style={{ borderTop: `1px dashed ${COLORS.border}` }}>
                        <span className="text-xs" style={{ color: COLORS.muted }}>{m.nombre} · {m.correo}</span>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setMenuStatus(m.id, 'aprobada')} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: m.status==='aprobada' ? `${COLORS.teal}33` : COLORS.surfaceAlt, color: COLORS.teal }}><CheckCircle2 size={11}/> Aprobar</button>
                          <button onClick={() => setMenuStatus(m.id, 'denegada')} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: m.status==='denegada' ? `${COLORS.coral}33` : COLORS.surfaceAlt, color: COLORS.coral }}><XCircle size={11}/> Denegar</button>
                          <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: `${St.color}22`, color: St.color }}><St.icon size={11}/> {St.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {panelTab === 'presupuestos' && (panelRole === 'admin' || panelRole === 'finanzas') && (
              <div className="space-y-2">
                {COMITES.map(c => {
                  const gasto = gastoComite(c, submissions, menus);
                  const presu = presupuestoDe(c);
                  return (
                    <div key={c} className="rounded-lg p-3 flex items-center justify-between" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                      <div>
                        <div className="text-sm font-medium">{c}</div>
                        <div className="mono text-xs" style={{ color: gasto > presu ? COLORS.coral : COLORS.muted }}>${gasto.toFixed(0)} usados de</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="mono text-xs" style={{ color: COLORS.muted }}>$</span>
                        <input type="number" value={presu} onChange={e => savePresupuestos({ ...presupuestos, [c]: num(e.target.value) })} style={inputStyle} className="w-20 rounded-md px-2 py-1.5 text-sm outline-none mono" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {panelTab === 'ajustes' && panelRole === 'admin' && (
              <div>
                <div className="text-xs mb-4" style={{ color: COLORS.muted }}>Cambia aquí las claves de acceso al panel. Se guardan de inmediato para todos.</div>
                {[['admin','Logística (acceso completo)'],['comunicacion','Comité de comunicación (solo Planning)'],['finanzas','Comité de finanzas (solo Presupuestos)']].map(([key, label]) => (
                  <Field key={key} label={label}>
                    <TextInput
                      value={claves[key] || ''}
                      onChange={e => setClaves({ ...claves, [key]: e.target.value })}
                      onBlur={() => saveClaves(claves)}
                    />
                  </Field>
                ))}
                <div className="text-xs mono px-3 py-2 rounded-md" style={{ background: COLORS.surfaceAlt, color: COLORS.muted }}>
                  Los cambios se guardan al salir de cada casilla (no hace falta un botón aparte).
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BackHeader({ onBack, title }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="p-2 rounded-full" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}><ChevronLeft size={16} /></button>
      <h1 className="display text-lg">{title.toUpperCase()}</h1>
    </div>
  );
}
