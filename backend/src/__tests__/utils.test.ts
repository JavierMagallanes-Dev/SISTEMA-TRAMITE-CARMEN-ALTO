//PR-UNIT-01: formatFecha 
describe('PR-UNIT-01: formatFecha', () => {
  const formatFecha = (iso: string): string => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-PE', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  it('Debe formatear una fecha ISO correctamente', () => {
    const resultado = formatFecha('2026-05-11T00:00:00.000Z');
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('Debe retornar el valor original si la fecha es inválida', () => {
    const resultado = formatFecha('fecha-invalida');
    expect(resultado).toBe('fecha-invalida');
  });
});

//PR-UNIT-02: diasRestantes
describe('PR-UNIT-02: diasRestantes', () => {
  const diasRestantes = (fechaLimite: string): number => {
    const hoy  = new Date();
    const fin  = new Date(fechaLimite);
    return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  };

  it('Debe retornar número positivo para fecha futura', () => {
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 5);
    const resultado = diasRestantes(fechaFutura.toISOString());
    expect(resultado).toBeGreaterThan(0);
  });

  it('Debe retornar número negativo para fecha pasada', () => {
    const fechaPasada = new Date();
    fechaPasada.setDate(fechaPasada.getDate() - 5);
    const resultado = diasRestantes(fechaPasada.toISOString());
    expect(resultado).toBeLessThan(0);
  });

  it('Debe retornar aproximadamente 0 para fecha de hoy', () => {
    const hoy = new Date();
    const resultado = diasRestantes(hoy.toISOString());
    expect(resultado).toBeLessThanOrEqual(1);
  });
});

//PR-UNIT-03: generarCodigoExpediente
describe('PR-UNIT-03: Formato de código de expediente', () => {
  const validarFormato = (codigo: string): boolean => {
    return /^EXP-\d{4}-\d{6}$/.test(codigo);
  };

  it('Debe validar un código con formato correcto', () => {
    expect(validarFormato('EXP-2026-000001')).toBe(true);
  });

  it('Debe rechazar un código con formato incorrecto', () => {
    expect(validarFormato('EXP-26-001')).toBe(false);
  });

  it('Debe rechazar un código sin prefijo EXP', () => {
    expect(validarFormato('2026-000001')).toBe(false);
  });

  it('Debe validar el año actual en el código', () => {
    const anio = new Date().getFullYear();
    const codigo = `EXP-${anio}-000042`;
    expect(validarFormato(codigo)).toBe(true);
  });
});

// ── PR-UNIT-04: calcIniciales ────────────────────────────────
describe('PR-UNIT-04: calcIniciales', () => {
  const calcIniciales = (nombreCompleto: string): string => {
    const partes  = nombreCompleto.trim().split(/\s+/);
    const primera = partes[0]?.[0] ?? '';
    const segunda = partes[1]?.[0] ?? '';
    return (primera + segunda).toUpperCase() || 'U';
  };

  it('Debe generar iniciales de dos palabras', () => {
    expect(calcIniciales('Javier Magallanes')).toBe('JM');
  });

  it('Debe generar iniciales de nombre completo con varios apellidos', () => {
    expect(calcIniciales('Jorge Luis Altamirano Montalvo')).toBe('JL');
  });

  it('Debe retornar U para nombre vacío', () => {
    expect(calcIniciales('')).toBe('U');
  });

  it('Debe manejar nombre con espacios extra', () => {
    expect(calcIniciales('  Andru   Ramirez  ')).toBe('AR');
  });
});

// ── PR-UNIT-05: validarEmail ─────────────────────────────────
describe('PR-UNIT-05: Validación de email', () => {
  const validarEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  it('Debe aceptar email válido institucional', () => {
    expect(validarEmail('admin@carmenalto.gob.pe')).toBe(true);
  });

  it('Debe aceptar email válido personal', () => {
    expect(validarEmail('jhuniormaga415@gmail.com')).toBe(true);
  });

  it('Debe rechazar email sin arroba', () => {
    expect(validarEmail('emailsinArroba.com')).toBe(false);
  });

  it('Debe rechazar email sin dominio', () => {
    expect(validarEmail('usuario@')).toBe(false);
  });

  it('Debe rechazar email vacío', () => {
    expect(validarEmail('')).toBe(false);
  });
});

