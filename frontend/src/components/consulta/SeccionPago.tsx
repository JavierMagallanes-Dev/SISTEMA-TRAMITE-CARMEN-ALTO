// src/components/consulta/SeccionPago.tsx
import StripePago from '../shared/StripePago';
import { CheckCircle, CreditCard, ImageIcon, ShieldCheck, FileText, Upload, X } from 'lucide-react';
import { PRIMARY, PRIMARY_DARKER, ACCENT, TINT } from '../../hooks/useConsulta';
import type { ExpedientePublico, OpcionPago } from '../../hooks/useConsulta';

interface Props {
  expediente:           ExpedientePublico;
  opcionPago:           OpcionPago;
  setOpcionPago:        (v: OpcionPago) => void;
  comprobante:          File | null;
  setComprobante:       (f: File | null) => void;
  subiendoComp:         boolean;
  comprobanteSubido:    boolean;
  yaSubioComprobante:   boolean;
  comprobanteInputRef:  React.RefObject<HTMLInputElement | null>;
  onComprobanteChange:  (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubirComprobante:   () => void;
  onPagoExito:          () => void;
}

export default function SeccionPago({
  expediente, opcionPago, setOpcionPago,
  comprobante, setComprobante, subiendoComp,
  comprobanteSubido, yaSubioComprobante,
  comprobanteInputRef, onComprobanteChange,
  onSubirComprobante, onPagoExito,
}: Props) {
  return (
    <div className="p-5 sm:p-6">
      <div className="relative">
        <div className="absolute -inset-px rounded-2xl opacity-60 blur-xl pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${PRIMARY}40, ${ACCENT}40)` }} />
        <div className="relative bg-white rounded-2xl border border-[#c7d8f0] overflow-hidden">

          {/* Monto */}
          <div className="px-5 py-4 border-b border-[#c7d8f0] flex items-center justify-between gap-4"
            style={{ background: `linear-gradient(to right, ${TINT}, white)` }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: PRIMARY }}>
                <CreditCard size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: PRIMARY_DARKER }}>Monto a pagar</p>
                <p className="text-2xl font-bold" style={{ color: PRIMARY_DARKER }}>S/ {Number(expediente.tipoTramite.costo_soles).toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Trámite</p>
              <p className="text-xs font-medium text-slate-700 truncate max-w-160px">{expediente.tipoTramite.nombre}</p>
            </div>
          </div>

          <div className="p-5">
            {opcionPago === 'stripe' ? (
              <StripePago codigo={expediente.codigo} onExito={onPagoExito} onCancel={() => setOpcionPago('seleccion')} />
            ) : (yaSubioComprobante || comprobanteSubido) ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-green-800">Comprobante recibido</p>
                  <p className="text-xs text-green-700 mt-0.5">El cajero revisará y verificará tu pago pronto.</p>
                </div>
              </div>
            ) : opcionPago === 'comprobante' ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700">Adjunta tu comprobante de pago</p>
                {comprobante ? (
                  <div className="flex items-center gap-3 p-3 bg-white border border-orange-200 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <ImageIcon size={16} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{comprobante.name}</p>
                      <p className="text-[11px] text-slate-500">{(comprobante.size / 1024).toFixed(0)} KB · listo para enviar</p>
                    </div>
                    <button onClick={() => setComprobante(null)} className="text-slate-400 hover:text-rose-500 p-1">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => comprobanteInputRef.current?.click()}
                    className="rounded-xl p-5 text-center cursor-pointer transition-colors"
                    style={{ border: '1.5px dashed #fdba74', background: 'linear-gradient(180deg, #fffbf5, #fff7ed)' }}>
                    <div className="w-9 h-9 rounded-lg bg-orange-100 mx-auto flex items-center justify-center">
                      <Upload size={16} className="text-orange-500" />
                    </div>
                    <p className="text-sm font-semibold text-orange-700 mt-2">Toca para adjuntar</p>
                    <p className="text-[11px] text-orange-600/80 mt-0.5">JPG, PNG, WEBP o PDF · máx 10MB</p>
                  </div>
                )}
                <input ref={comprobanteInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={onComprobanteChange} />
                {comprobante && (
                  <button onClick={onSubirComprobante} disabled={subiendoComp}
                    className="w-full py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-60">
                    {subiendoComp ? 'Enviando…' : 'Enviar comprobante'}
                  </button>
                )}
                <button onClick={() => { setOpcionPago('seleccion'); setComprobante(null); }}
                  className="w-full text-xs text-slate-400 hover:text-slate-600">← Volver a opciones de pago</button>
              </div>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-700 mb-3 text-center">¿Cómo deseas pagar?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => setOpcionPago('comprobante')}
                    className="text-left p-4 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all bg-white">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <ImageIcon size={15} className="text-orange-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Adjuntar comprobante</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">Yape, Plin, transferencia bancaria o depósito</p>
                    <div className="text-[11px] font-semibold text-orange-600 flex items-center gap-1">
                      <span>Subir imagen o PDF</span><span>→</span>
                    </div>
                  </button>
                  <button onClick={() => setOpcionPago('stripe')}
                    className="text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden"
                    style={{ borderColor: PRIMARY, background: `linear-gradient(135deg, ${TINT}, white)` }}>
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded-md" style={{ background: PRIMARY }}>Inmediato</span>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: PRIMARY }}>
                        <CreditCard size={15} />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Pago en línea</p>
                    </div>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">Tarjeta de crédito o débito · Visa, Mastercard, Amex</p>
                    <div className="text-[11px] font-semibold flex items-center gap-1.5" style={{ color: PRIMARY }}>
                      <ShieldCheck size={11} /><span>Procesado por Stripe</span>
                    </div>
                  </button>
                </div>
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                    <FileText size={15} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-900">¿Prefieres pagar en persona?</p>
                    <p className="text-[11px] text-amber-700">Acércate a Caja municipal con tu boleta. L–V de 8:00 a 16:30.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}