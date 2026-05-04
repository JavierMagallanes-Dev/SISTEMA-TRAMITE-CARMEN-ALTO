// src/pages/HomePage.tsx

// Página principal del portal ciudadano — Carmen Alto.

import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import headerCA from '../assets/headerCA.webp';

import '../styles/homepage.css';

const PRIMARY       = '#216ece';

const PRIMARY_DARKER = '#143f7a';

const TINT          = '#eaf2fb';



// ── Hook reveal on scroll ────────────────────────────────────

function useReveal() {

  useEffect(() => {

    const io = new IntersectionObserver((entries) => {

      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('show'); });

    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    return () => io.disconnect();

  }, []);

}



// ── Tramites estáticos (en producción vendrían del backend) ──

const TRAMITES = [

  { categoria: 'Licencias',    nombre: 'Licencia de Funcionamiento',     descripcion: 'Autorización para apertura y funcionamiento de establecimientos comerciales.',  costo: 'S/ 120.00', plazo: '15 días', top: true,  nuevo: false, popular: false },

  { categoria: 'Licencias',    nombre: 'Renovación de Licencia',         descripcion: 'Renovación anual de tu licencia de funcionamiento vigente.',                     costo: 'S/ 80.00',  plazo: '10 días', top: false, nuevo: false, popular: true  },

  { categoria: 'Licencias',    nombre: 'Licencia de Construcción',       descripcion: 'Permiso para construcción, ampliación o remodelación de edificaciones.',          costo: 'S/ 200.00', plazo: '20 días', top: false, nuevo: false, popular: false },

  { categoria: 'Constancias',  nombre: 'Certificado de No Adeudo',       descripcion: 'Constancia que acredita que no tienes deudas tributarias con la municipalidad.',  costo: 'S/ 30.00',  plazo: '5 días',  top: false, nuevo: false, popular: true  },

  { categoria: 'Constancias',  nombre: 'Partida de Nacimiento',          descripcion: 'Copia certificada del acta de nacimiento registrada en el municipio.',            costo: 'S/ 15.00',  plazo: '3 días',  top: false, nuevo: false, popular: false },

  { categoria: 'Eventos',      nombre: 'Autorización de Evento Público', descripcion: 'Permiso municipal para realizar eventos, ferias o actividades en espacios públicos.', costo: 'S/ 50.00', plazo: '7 días', top: false, nuevo: true,  popular: false },

];

const FAQS = [

  { pregunta: '¿Es obligatorio iniciar mi trámite por internet?',     respuesta: 'No es obligatorio. Puedes acercarte a Mesa de Partes en horario de oficina, pero el portal en línea te permite ahorrar tiempo y hacer seguimiento desde cualquier dispositivo.' },

  { pregunta: '¿Cuánto demora resolver un trámite?',                   respuesta: 'Cada trámite tiene un plazo TUPA específico (entre 3 y 30 días hábiles). El plazo empieza a contarse desde que el pago está verificado.' },

  { pregunta: '¿Qué hago si mi expediente fue observado?',             respuesta: 'Ingresa a "Consultar estado" con tu código y verás los documentos que el área te solicita. Súbelos en PDF directamente desde la página de tu expediente.' },

  { pregunta: '¿Cómo verifico que un documento es auténtico?',         respuesta: 'Cada documento firmado digitalmente trae un código de verificación. Ingrésalo en "Verificar firma digital" y te confirmaremos su autenticidad y vigencia.' },

  { pregunta: '¿Tiene costo iniciar mi trámite por el portal?',        respuesta: 'El registro es gratuito. Solo pagas el costo del trámite (TUPA), igual que en ventanilla. No cobramos comisiones adicionales por usar el portal.' },

];



const PASOS = [

  { num: 1, titulo: 'Regístrate en el portal',   descripcion: 'Ingresa tus datos, elige el trámite y obtén tu código de expediente al instante.' },

  { num: 2, titulo: 'Realiza el pago',            descripcion: 'Paga en línea con tarjeta, adjunta tu Yape/Plin o acércate a Caja municipal.' },

  { num: 3, titulo: 'Seguimiento en línea',       descripcion: 'Consulta el avance de tu expediente en tiempo real desde cualquier dispositivo.' },

  { num: 4, titulo: 'Descarga tu documento',      descripcion: 'Cuando esté firmado digitalmente, descárgalo directamente desde el portal.' },

];



const CATEGORIAS = ['Todos', 'Licencias', 'Constancias', 'Eventos'];

export default function HomePage() {

  const navigate             = useNavigate();

  const [codigo, setCodigo]  = useState('');

  const [faqOpen, setFaqOpen] = useState<number | null>(0);

  const [catActiva, setCatActiva] = useState('Todos');

  const heroImgRef           = useRef<HTMLImageElement>(null);



  useReveal();



  // Parallax hero

  useEffect(() => {

    const onScroll = () => {

      if (!heroImgRef.current) return;

      const y = window.scrollY;

      if (y < 700) heroImgRef.current.style.transform = `scale(1.1) translateY(${y * 0.18}px)`;

    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);

  }, []);



  const tramitesFiltrados = catActiva === 'Todos'

    ? TRAMITES

    : TRAMITES.filter((t) => t.categoria === catActiva);



  return (

    <div className="bg-white text-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>





      {/* ── 1. HERO ─────────────────────────────────────── */}

      <section className="relative overflow-hidden">

        <div className="relative" style={{ height: '580px' }}>

          <img ref={heroImgRef} src={headerCA} alt="Carmen Alto"

            className="absolute inset-0 w-full h-full object-cover"

            style={{ transform: 'scale(1.1)', willChange: 'transform', transition: 'transform .15s linear' }} />

          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(20,63,122,.55) 0%,rgba(20,63,122,.72) 60%,rgba(20,63,122,.92) 100%)' }} />



          {/* Formas decorativas */}

          <div className="float-y absolute top-20 right-12 w-32 h-32 rounded-full opacity-30"

            style={{ background: 'radial-gradient(circle,#4abdef 0%,transparent 70%)', animationDelay: '0s' }} />

          <div className="float-y absolute bottom-32 left-8 w-24 h-24 rounded-full opacity-25"

            style={{ background: 'radial-gradient(circle,#4abdef 0%,transparent 70%)', animationDelay: '-3s' }} />



          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 sm:pt-24 h-full flex flex-col">

            <h1 className="reveal text-white text-3xl sm:text-5xl font-bold leading-tight mt-5 max-w-3xl">

              Tus trámites municipales,<br />

              <span className="grad-text-hero">desde casa.</span>

            </h1>

            <p className="reveal reveal-d1 mt-4 max-w-xl text-base sm:text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,.85)' }}>

              Registra tu solicitud, sigue su avance en tiempo real y descarga tu documento firmado digitalmente — sin colas ni esperas.

            </p>



            {/* Buscador integrado */}

            <div className="reveal reveal-d2 mt-7 max-w-2xl">

              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,.75)' }}>

                ¿Ya tienes tu código?

              </p>

              <div className="bg-white rounded-xl p-2 flex items-center gap-2 shadow-2xl">

                <div className="pl-3 text-slate-400">

                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />

                  </svg>

                </div>

                <input

                  className="flex-1 px-2 py-3 outline-none text-sm font-semibold tracking-wider text-slate-800 placeholder:text-slate-400 font-mono"

                  placeholder="EXP-2026-000001"

                  value={codigo}

                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}

                  onKeyDown={(e) => e.key === 'Enter' && codigo && navigate(`/consulta/${codigo}`)}

                />

                <button

                  onClick={() => codigo && navigate(`/consulta/${codigo}`)}

                  className="px-5 py-3 rounded-lg text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"

                  style={{ background: PRIMARY }}>

                  Consultar estado

                </button>

              </div>

            </div>

          </div>

        </div>



        {/* Wave separator */}

        <svg className="block w-full -mt-px" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: 50 }}>

          <path d="M0,30 C240,60 480,0 720,20 C960,40 1200,10 1440,30 L1440,60 L0,60 Z" fill="white" />

        </svg>

      </section>



      {/* ── 2. CTAs principales ──────────────────────────── */}

      <section className="bg-white relative -mt-12 z-10">

        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Registrar */}

          <button onClick={() => navigate('/portal')}

            className="reveal card-fancy group bg-white border border-slate-200 rounded-2xl p-6 text-left relative overflow-hidden"

            style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04),0 12px 32px -16px rgba(33,110,206,.20)' }}>

            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 transition-all group-hover:opacity-20 group-hover:scale-110"

              style={{ background: PRIMARY }} />

            <div className="cat-chip">

              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

                <path d="M14 2v6h6M16 13H8M16 17H8" />

              </svg>

            </div>

            <h3 className="text-lg font-bold text-slate-900 mt-4">Registrar trámite</h3>

            <p className="text-sm text-slate-500 mt-1 leading-relaxed">

              Inicia tu solicitud en línea y recibe tu código de expediente al instante.

            </p>

            <div className="flex items-center gap-1.5 text-sm font-semibold mt-4" style={{ color: PRIMARY }}>

              Iniciar ahora

              <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">

                <path d="M5 12h14M12 5l7 7-7 7" />

              </svg>

            </div>

          </button>



          {/* Consultar */}

          <button onClick={() => navigate('/consulta')}

            className="reveal reveal-d1 card-fancy group bg-white border border-slate-200 rounded-2xl p-6 text-left relative overflow-hidden"

            style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04),0 12px 32px -16px rgba(33,110,206,.20)' }}>

            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-10 transition-all group-hover:opacity-20 group-hover:scale-110"

              style={{ background: '#16a34a' }} />

            <div className="cat-chip" style={{ background: 'linear-gradient(135deg,#dcfce7,white)', borderColor: '#bbf7d0', color: '#16a34a' }}>

              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />

              </svg>

            </div>

            <h3 className="text-lg font-bold text-slate-900 mt-4">Consultar estado</h3>

            <p className="text-sm text-slate-500 mt-1 leading-relaxed">

              Sigue tu expediente en tiempo real y descarga tu documento firmado.

            </p>

            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 mt-4">

              Consultar

              <svg className="transition-transform group-hover:translate-x-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">

                <path d="M5 12h14M12 5l7 7-7 7" />

              </svg>

            </div>

          </button>

        </div>

      </section>



      {/* ── 3. Trámites más solicitados ──────────────────── */}

      <section className="bg-white py-16 sm:py-20">

        <div className="max-w-6xl mx-auto px-6">

          <div className="flex items-end justify-between flex-wrap gap-3 mb-8">

            <div className="reveal max-w-xl">

              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>Trámites · Catálogo</p>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">Los trámites más solicitados</h2>

              <p className="text-sm text-slate-500 mt-2 leading-relaxed">

                Iniciamos el catálogo con los procedimientos de mayor demanda.

              </p>

            </div>

            <button onClick={() => navigate('/portal')}

              className="reveal reveal-d1 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"

              style={{ color: PRIMARY }}>

              Ver todos los trámites

              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">

                <path d="M5 12h14M12 5l7 7-7 7" />

              </svg>

            </button>

          </div>



          {/* Filter pills */}

          <div className="reveal pill-row flex gap-2 overflow-x-auto pb-2 mb-6">

            {CATEGORIAS.map((cat) => (

              <button key={cat} onClick={() => setCatActiva(cat)}

                className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"

                style={catActiva === cat

                  ? { background: PRIMARY, color: 'white' }

                  : { background: '#f1f5f9', color: '#475569' }}>

                {cat}

              </button>

            ))}

          </div>



          {/* Grid trámites */}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {tramitesFiltrados.map((t, i) => (

              <button key={i} onClick={() => navigate('/portal')}

                className={`reveal card-fancy group bg-white border border-slate-200 rounded-2xl p-5 text-left relative overflow-hidden reveal-d${(i % 3) + 1}`}>

                {t.top && <div className="ribbon">Top</div>}

                <div className="flex items-start justify-between">

                  <div className="cat-chip">

                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />

                    </svg>

                  </div>

                  {t.popular && (

                    <span className="tag-pop text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">Popular</span>

                  )}

                  {t.nuevo && (

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={{ background: '#dcfce7', color: '#166534' }}>Nuevo</span>

                  )}

                </div>

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-4">{t.categoria}</p>

                <h3 className="text-base font-bold text-slate-900 mt-1">{t.nombre}</h3>

                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t.descripcion}</p>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Costo</p>

                    <p className="text-sm font-bold" style={{ color: t.costo === 'Gratuito' ? '#16a34a' : PRIMARY }}>{t.costo}</p>

                  </div>

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Plazo</p>

                    <p className="text-sm font-bold text-slate-700">{t.plazo}</p>

                  </div>

                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 group-hover:text-white transition-colors"

                    style={{}}

                    onMouseEnter={(e) => (e.currentTarget.style.background = PRIMARY)}

                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}>

                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">

                      <path d="M5 12h14M12 5l7 7-7 7" />

                    </svg>

                  </span>

                </div>

              </button>

            ))}

          </div>

        </div>

      </section>



      {/* ── 4. ¿Cómo realizar tu trámite? ───────────────── */}

      <section className="relative overflow-hidden" style={{ background: '#f8fafc' }}>

        <div className="absolute inset-0 bg-grid opacity-50" />

        <div className="relative max-w-6xl mx-auto px-6 py-16 sm:py-20">

          <div className="reveal max-w-2xl mb-10">

            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>Guía rápida</p>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">¿Cómo realizar tu trámite en línea?</h2>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">

              En cuatro pasos sencillos puedes registrar tu solicitud, pagar y descargar tu documento.

            </p>

          </div>



          <div className="relative">

            {/* Línea punteada desktop */}

            <div className="hidden lg:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 dotted-h" />

            <ol className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-4">

              {PASOS.map((paso, i) => (

                <li key={paso.num} className={`reveal reveal-d${i + 1} relative`}>

                  <div className="flex lg:flex-col items-start gap-4 lg:gap-3">

                    <div className="relative shrink-0">

                      <div className="w-16 h-16 rounded-full bg-white border-2 flex items-center justify-center"

                        style={{ borderColor: PRIMARY, boxShadow: '0 1px 2px rgba(15,23,42,.04),0 4px 16px -8px rgba(15,23,42,.10)' }}>

                        <span className="font-bold text-2xl" style={{ color: PRIMARY }}>{paso.num}</span>

                      </div>

                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md"

                        style={{ background: paso.num === 4 ? '#16a34a' : PRIMARY }}>

                        {paso.num === 1 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}

                        {paso.num === 2 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>}

                        {paso.num === 3 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}

                        {paso.num === 4 && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}

                      </div>

                    </div>

                    <div className="flex-1 lg:pt-2">

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Paso {paso.num}</p>

                      <h3 className="text-base font-bold text-slate-900">{paso.titulo}</h3>

                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{paso.descripcion}</p>

                    </div>

                  </div>

                </li>

              ))}

            </ol>

          </div>



          {/* Nota 24/7 */}

          <div className="reveal mt-10 inline-flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200">

            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: TINT, color: PRIMARY }}>

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />

              </svg>

            </div>

            <div>

              <p className="text-xs font-bold text-slate-800">Atención 24/7 en línea</p>

              <p className="text-[11px] text-slate-500">Registra y consulta cuando quieras. El pago en ventanilla en horario de oficina.</p>

            </div>

          </div>

        </div>

      </section>



      {/* ── 5. FAQ + Soporte ─────────────────────────────── */}

      <section className="bg-white py-16 sm:py-20">

        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[2fr_1fr] gap-10">



          {/* FAQ */}

          <div>

            <div className="reveal max-w-xl mb-8">

              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: PRIMARY }}>Preguntas frecuentes</p>

              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">Resolvemos tus dudas</h2>

              <p className="text-sm text-slate-500 mt-2 leading-relaxed">

                Si tu duda no aparece aquí, escríbenos a{' '}

                <span className="font-medium" style={{ color: PRIMARY }}>tramites@muncarmenalto.gob.pe</span>

              </p>

            </div>

            <div className="space-y-3">

              {FAQS.map((faq, i) => (

                <div key={i} className={`reveal reveal-d${Math.min(i + 1, 4)} bg-white border border-slate-200 rounded-xl overflow-hidden`}>

                  <button

                    className="w-full flex items-center justify-between gap-4 p-5 text-left"

                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}>

                    <span className="text-sm font-bold text-slate-900">{faq.pregunta}</span>

                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 transition-transform"

                      style={{ background: PRIMARY, transform: faqOpen === i ? 'rotate(45deg)' : 'none' }}>

                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">

                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />

                      </svg>

                    </span>

                  </button>

                  <div className={`faq-body ${faqOpen === i ? 'open' : ''}`}>

                    <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.respuesta}</div>

                  </div>

                </div>

              ))}

            </div>

          </div>



          {/* Sidebar soporte */}

          <aside className="lg:sticky lg:top-6 self-start">

            <div className="reveal rounded-2xl p-6 text-white relative overflow-hidden"

              style={{ background: `linear-gradient(135deg, ${PRIMARY_DARKER}, ${PRIMARY})`, boxShadow: '0 1px 2px rgba(15,23,42,.04),0 12px 32px -16px rgba(33,110,206,.20)' }}>

              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full"

                style={{ background: 'radial-gradient(circle,rgba(74,189,239,.4),transparent 70%)' }} />

              <p className="text-[11px] font-bold uppercase tracking-widest mb-2 relative" style={{ color: 'rgba(255,255,255,.7)' }}>

                ¿Necesitas ayuda?

              </p>

              <h3 className="text-xl font-bold leading-tight relative">Estamos aquí para ti</h3>

              <p className="text-sm leading-relaxed mt-2 relative" style={{ color: 'rgba(255,255,255,.8)' }}>

                Nuestro equipo de Mesa de Partes resuelve tus consultas en horario de oficina.

              </p>

              <div className="space-y-3 mt-5 relative">

                {[

                  { icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 12 19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z', label: 'Mesa de Partes', value: '(066) 123-456' },

                  { icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6', label: 'Correo', value: 'tramites@muncarmenalto.gob.pe' },

                  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM12 6v6l4 2', label: 'Horario', value: 'Lun – Vie · 8:00 – 16:30' },

                ].map((item, i) => (

                  <div key={i} className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,.15)' }}>

                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">

                        <path d={item.icon} />

                      </svg>

                    </div>

                    <div>

                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,.6)' }}>{item.label}</p>

                      <p className="text-sm font-semibold">{item.value}</p>

                    </div>

                  </div>

                ))}

              </div>

              <button

                onClick={() => navigate('/portal')}

                className="mt-6 w-full py-2.5 rounded-lg text-sm font-bold transition-colors relative hover:opacity-90"

                style={{ background: 'white', color: PRIMARY_DARKER }}>

                Iniciar trámite ahora

              </button>

            </div>

          </aside>

        </div>

      </section>

    </div>

  );

}