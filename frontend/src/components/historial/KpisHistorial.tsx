// src/components/historial/KpisHistorial.tsx
import { Card } from '../ui/Card';
import { CheckCircle, Archive, FileText } from 'lucide-react';

interface Props {
  totalResueltos:  number;
  totalArchivados: number;
  totalHistorial:  number;
}

export default function KpisHistorial({ totalResueltos, totalArchivados, totalHistorial }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalResueltos}</p>
            <p className="text-xs text-gray-500">Resueltos</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Archive size={20} className="text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalArchivados}</p>
            <p className="text-xs text-gray-500">Archivados</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalHistorial}</p>
            <p className="text-xs text-gray-500">Total historial</p>
          </div>
        </div>
      </Card>
    </div>
  );
}