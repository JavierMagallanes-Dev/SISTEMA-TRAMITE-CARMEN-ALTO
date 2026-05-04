// Página principal del portal ciudadano — Carmen Alto (v2 - Mejorada)
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import headerCA from '../assets/headerCA.webp';
import '../styles/homepage.css';

const PRIMARY = '#216ece';
const PRIMARY_DARKER = '#143f7a';


function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('show'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const TRAMITES = [
  { categoria: 'Licencias', nombre: 'Licencia de Funcionamiento', descripcion: 'Autorización para apertura y funcionamiento de establecimientos comerciales.', costo: 'S/ 120.00', plazo: '15 días', top: true, nuevo: false, popular: false },
  { categoria: 'Licencias', nombre: 'Renovación de Licencia', descripcion: 'Renovación anual de tu licencia de funcionamiento vigente.', costo: 'S/ 80.00', plazo: '10 días', top: false, nuevo: false, popular: true },
  { categoria: 'Licencias', nombre: 'Licencia de Construcción', descripcion: 'Permiso para construcción, ampliación o remodelación de edificaciones.', costo: 'S/ 200.00', plazo: '20 días', top: false, nuevo: false, popular: false },
  { categoria: 'Constancias', nombre: 'Certificado de No Adeudo', descripcion: 'Constancia que acredita que no tienes deudas tributarias.', costo: 'S/ 30.00', plazo: '5 días', top: false, nuevo: false, popular: true },
  { categoria: 'Constancias', nombre: 'Partida de Nacimiento', descripcion: 'Copia certificada del acta de nacimiento registrada en el municipio.', costo: 'S/ 15.00', plazo: '3 días', top: false, nuevo: false, popular: false },
  { categoria: 'Eventos', nombre: 'Autorización de Evento Público', descripcion: 'Permiso municipal para realizar ferias o actividades en espacios públicos.', costo: 'S/ 50.00', plazo: '7 días', top: false, nuevo: true, popular: false },
];

const FAQS = [
  { pregunta: '¿Es obligatorio iniciar mi trámite por internet?', respuesta: 'No es obligatorio. Puedes acercarte a Mesa de Partes en horario de oficina, pero el portal en línea te permite ahorrar tiempo y hacer seguimiento desde cualquier dispositivo.' },
  { pregunta: '¿Cuánto demora resolver un trámite?', respuesta: 'Cada trámite tiene un plazo TUPA específico (entre 3 y 30 días hábiles). El plazo empieza a contarse desde que el pago está verificado.' },
  { pregunta: '¿Qué hago si mi expediente fue observado?', respuesta: 'Ingresa a "Consultar estado" con tu código y verás los documentos solicitados. Súbelos en PDF directamente desde la página de tu expediente.' },
  { pregunta: '¿Cómo verifico que un documento es auténtico?', respuesta: 'Cada documento firmado digitalmente trae un código de verificación. Ingrésalo en "Verificar firma digital" para confirmar su autenticidad.' },
  { pregunta: '¿Tiene costo iniciar mi trámite por el portal?', respuesta: 'El registro es gratuito. Solo pagas el costo del trámite (TUPA), igual que en ventanilla.' },
];

const PASOS = [
  { num: 1, titulo: 'Regístrate en el portal', descripcion: 'Ingresa tus datos, elige el trámite y obtén tu código de expediente al instante.' },
  { num: 2, titulo: 'Realiza el pago', descripcion: 'Paga en línea con tarjeta, adjunta tu Yape/Plin o acércate a Caja municipal.' },
  { num: 3, titulo: 'Seguimiento en línea', descripcion: 'Consulta el avance de tu expediente en tiempo real desde cualquier dispositivo.' },
  { num: 4, titulo: 'Descarga tu documento', descripcion: 'Cuando esté firmado digitalmente, descárgalo directamente desde el portal.' },
];

const CATEGORIAS = ['Todos', 'Licencias', 'Constancias', 'Eventos'];

export default function HomePage() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [catActiva, setCatActiva] = useState('Todos');
  const heroImgRef = useRef<HTMLImageElement>(null);

  useReveal();

  useEffect(() => {
    const onScroll = () => {
      if (!heroImgRef.current) return;
      const y = window.scrollY;
      if (y < 700) heroImgRef.current.style.transform = `scale(1.1) translateY(${y * 0.15}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tramitesFiltrados = catActiva === 'Todos' ? TRAMITES : TRAMITES.filter((t) => t.categoria === catActiva);

  return (
    <div className="bg-white text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ── 1. HERO MEJORADO ─────────────────────────────────── */}
      <section className="relative min-h-600px flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img ref={heroImgRef} src={headerCA} alt="Carmen Alto" className="w-full h-full object-cover" style={{ filter: 'brightness(0.7)' }} />
          <div className="absolute inset-0 hero-overlay" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full py-24 lg:py-32">
          <div className="max-w-3xl">
            <span className="reveal inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-white/20 text-white backdrop-blur-md mb-6 border border-white/30">
              Municipalidad Distrital de Carmen Alto
            </span>
            <h1 className="reveal reveal-d1 text-white text-4xl sm:text-6xl font-extrabold leading-[1.1] tracking-tight">
              Gestiona tus trámites <br />
              <span className="grad-text-hero">con agilidad y transparencia</span>
            </h1>
            <p className="reveal reveal-d2 mt-6 text-lg sm:text-xl text-white/80 leading-relaxed max-w-2xl">
              Plataforma digital para ciudadanos de Carmen Alto. Registra expedientes, realiza pagos y obtén documentos oficiales sin salir de casa.
            </p>

            {/* Buscador Estilizado */}
            <div className="reveal reveal-d3 mt-10 p-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl max-w-lg">
               <div className="bg-white rounded-xl flex items-center p-1 overflow-hidden">
                <div className="pl-4 text-slate-400">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                </div>
                <input 
                  className="flex-1 px-3 py-3 outline-none text-sm font-bold text-slate-700 placeholder:text-slate-400 font-mono"
                  placeholder="EXP-2026-XXXXXX"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && codigo && navigate(`/consulta/${codigo}`)}
                />
                <button 
                  onClick={() => codigo && navigate(`/consulta/${codigo}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-lg active:scale-95"
                  style={{ background: PRIMARY }}>
                  Consultar
                </button>
               </div>
            </div>
          </div>
        </div>
        
        {/* Decoración inferior */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-0">
          <svg className="relative block w-full h-60px" viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,60 L1440,60 L1440,0 C1100,50 340,50 0,0 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── 2. CTAs PRINCIPALES ─────────────────────────────── */}
      <section className="bg-white relative -mt-8 z-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div onClick={() => navigate('/portal')} className="reveal reveal-d1 group cursor-pointer bg-white border border-slate-100 p-8 rounded-3xl shadow-xl shadow-slate-200/50 hover:border-blue-200 transition-all card-fancy">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Mesa de Partes Virtual</h3>
                <p className="text-slate-500 text-sm mt-1">Inicia solicitudes y adjunta documentos PDF de forma segura.</p>
              </div>
            </div>
          </div>

          <div onClick={() => navigate('/consulta')} className="reveal reveal-d2 group cursor-pointer bg-white border border-slate-100 p-8 rounded-3xl shadow-xl shadow-slate-200/50 hover:border-emerald-200 transition-all card-fancy">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Estado de Expediente</h3>
                <p className="text-slate-500 text-sm mt-1">Verifica en qué oficina se encuentra tu trámite ahora mismo.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. CATÁLOGO MEJORADO ────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="reveal text-3xl sm:text-4xl font-black text-slate-900">Trámites frecuentes</h2>
            <p className="reveal reveal-d1 text-slate-500 mt-4 max-w-2xl mx-auto">Selecciona una categoría y encuentra los requisitos para tu solicitud.</p>
            
            {/* Pill Filters */}
            <div className="reveal reveal-d2 flex justify-center gap-2 mt-8 overflow-x-auto pb-4">
              {CATEGORIAS.map((cat) => (
                <button key={cat} onClick={() => setCatActiva(cat)}
                  className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-sm ${catActiva === cat ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  style={catActiva === cat ? {background: PRIMARY} : {}}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tramitesFiltrados.map((t, i) => (
              <div key={i} className={`reveal reveal-d${(i % 3) + 1} p-6 rounded-3xl border border-slate-100 bg-white hover:shadow-2xl hover:shadow-slate-200/60 transition-all group relative overflow-hidden card-fancy`}>
                {t.top && <div className="ribbon">Destacado</div>}
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 block">{t.categoria}</span>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{t.nombre}</h3>
                <p className="text-slate-500 text-sm mt-2 line-clamp-2 leading-relaxed">{t.descripcion}</p>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Costo</p>
                      <p className="text-sm font-black text-slate-800">{t.costo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Respuesta</p>
                      <p className="text-sm font-black text-slate-800">{t.plazo}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/portal')} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. SECCIÓN GUÍA (Sin cambios estructurales) ────── */}
      <section className="relative overflow-hidden" style={{ background: '#f8fafc' }}>
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="reveal max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>Guía rápida</p>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">¿Cómo realizar tu trámite en línea?</h2>
            <p className="text-sm text-slate-500 mt-2">Cuatro pasos sencillos para tu gestión municipal.</p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] h-0.5 dotted-h" />
            <ol className="grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-4">
              {PASOS.map((paso, i) => (
                <li key={paso.num} className={`reveal reveal-d${i + 1} relative group`}>
                  <div className="flex lg:flex-col items-start gap-4 lg:gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-2xl font-black shadow-lg shadow-slate-200/50 group-hover:scale-110 transition-transform" style={{ color: PRIMARY }}>
                      {paso.num}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-900">{paso.titulo}</h3>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{paso.descripcion}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="reveal mt-12 inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-white shadow-lg shadow-slate-200/40 border border-slate-100">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Atención 24/7 en línea</p>
              <p className="text-xs text-slate-500">Registra y consulta cuando quieras. El pago en ventanilla es en horario de oficina.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FAQ + SOPORTE ───────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.8fr_1fr] gap-12">
          
          <div>
            <div className="reveal mb-10">
              <h2 className="text-3xl font-black text-slate-900">Resolvemos tus dudas</h2>
              <p className="text-slate-500 mt-3">Preguntas frecuentes sobre el uso del portal.</p>
            </div>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className={`reveal reveal-d${i + 1} bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden hover:border-blue-100 transition-colors`}>
                  <button 
                    className="w-full flex items-center justify-between p-6 text-left"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                    <span className="text-sm font-bold text-slate-800">{faq.pregunta}</span>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${faqOpen === i ? 'bg-blue-600 text-white rotate-45' : 'bg-white text-slate-400'}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </span>
                  </button>
                  <div className={`faq-body ${faqOpen === i ? 'open' : ''}`}>
                    <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{faq.respuesta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="lg:sticky lg:top-8 self-start">
            <div className="reveal p-8 rounded-2rem text-white relative overflow-hidden" 
                 style={{ background: `linear-gradient(145deg, ${PRIMARY_DARKER}, ${PRIMARY})` }}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              
              <h3 className="text-2xl font-bold">Canales de Soporte</h3>
              <p className="text-white/70 text-sm mt-3 leading-relaxed">¿Tienes inconvenientes con la plataforma? Nuestro equipo está listo para ayudarte.</p>
              
              <div className="mt-8 space-y-5">
                {[
                  { icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 12 19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z', label: 'Llámanos', value: '(066) 123-456' },
                  { icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6', label: 'Correo', value: 'tramites@muncarmenalto.gob.pe' },
                  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Horario', value: 'Lun – Vie · 8:00 – 16:30' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 group-hover:bg-white/20 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d={item.icon}/></svg>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-white/50">{item.label}</p>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => navigate('/portal')}
                className="mt-8 w-full bg-white text-blue-900 py-4 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 shadow-xl shadow-blue-900/20">
                Iniciar trámite ahora
              </button>
            </div>
          </aside>

        </div>
      </section>
    </div>
  );
}