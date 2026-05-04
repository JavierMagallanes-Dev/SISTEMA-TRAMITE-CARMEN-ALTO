// src/components/mesa-partes/FormRegistrar.tsx
// Formulario para registrar un nuevo expediente en Mesa de Partes.

import { useRef }  from 'react';
import Button      from '../ui/Button';
import Input       from '../ui/Input';
import { Search, FileText, Upload, X } from 'lucide-react';
import type { TipoTramite, FormRegistro } from '../../hooks/useMesaPartes';

interface Props {
  form:              FormRegistro;
  setF:              (field: string, value: string) => void;
  tipos:             TipoTramite[];
  archivoPdf:        File | null;
  buscandoDni:       boolean;
  loading:           boolean;
  onBuscarDni:       () => void;
  onArchivoChange:   (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLimpiarArchivo:  () => void;
  onRegistrar:       () => void;
  onCancelar:        () => void;
}

export default function FormRegistrar({
  form, setF, tipos, archivoPdf,
  buscandoDni, loading,
  onBuscarDni, onArchivoChange, onLimpiarArchivo,
  onRegistrar, onCancelar,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* DNI + Buscar */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            label="DNI del ciudadano"
            placeholder="12345678"
            value={form.dni}
            onChange={(e) => setF('dni', e.target.value)}
            maxLength={8}
            required
          />
        </div>
        <Button
          variant="secondary"
          icon={<Search size={14} />}
          loading={buscandoDni}
          onClick={onBuscarDni}
          disabled={form.dni.length !== 8}>
          Buscar DNI
        </Button>
      </div>

      {/* Campos personales */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Nombres"          value={form.nombres}      onChange={(e) => setF('nombres', e.target.value)}      required />
        <Input label="Apellido paterno" value={form.apellido_pat} onChange={(e) => setF('apellido_pat', e.target.value)} required />
        <Input label="Apellido materno" value={form.apellido_mat} onChange={(e) => setF('apellido_mat', e.target.value)} />
        <Input label="Teléfono"         value={form.telefono}     onChange={(e) => setF('telefono', e.target.value)}     placeholder="987654321" />
      </div>

      <Input label="Email" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} required />

      {/* Tipo de trámite */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Tipo de trámite <span className="text-red-500">*</span>
        </label>
        <select
          value={form.tipoTramiteId}
          onChange={(e) => setF('tipoTramiteId', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500">
          <option value="">Seleccionar trámite...</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} — S/ {Number(t.costo_soles).toFixed(2)} ({t.plazo_dias} días)
            </option>
          ))}
        </select>
      </div>

      {/* Documento adjunto */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">
          Documento adjunto <span className="text-gray-400 font-normal">— opcional</span>
        </label>
        {archivoPdf ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <FileText size={16} className="text-green-600 shrink-0" />
            <p className="text-sm font-medium text-green-700 flex-1 truncate">{archivoPdf.name}</p>
            <p className="text-xs text-green-500">{(archivoPdf.size / 1024).toFixed(1)} KB</p>
            <button onClick={onLimpiarArchivo} className="text-gray-400 hover:text-red-500">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <Upload size={20} className="mx-auto text-gray-400 mb-1" />
            <p className="text-sm text-gray-500">Haz clic para seleccionar un PDF (Máx 10MB)</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={onArchivoChange}
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button
          variant="primary"
          icon={<FileText size={14} />}
          loading={loading}
          onClick={onRegistrar}>
          Registrar expediente
        </Button>
      </div>
    </div>
  );
}