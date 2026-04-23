// prisma/seed.ts
// Datos iniciales para la demo del sistema.
// Ejecutar con: npm run db:seed

import { PrismaClient, NombreRol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // ── 1. ROLES ──────────────────────────────────────────────────
  // El modelo Rol solo tiene: id, nombre (NombreRol enum)
  // Sin campo descripcion — no existe en el schema v3
  console.log('📋 Creando roles...');

  const roles = await Promise.all([
    prisma.rol.upsert({ where: { nombre: 'ADMIN'         }, update: {}, create: { nombre: 'ADMIN'         } }),
    prisma.rol.upsert({ where: { nombre: 'MESA_DE_PARTES'}, update: {}, create: { nombre: 'MESA_DE_PARTES'} }),
    prisma.rol.upsert({ where: { nombre: 'CAJERO'        }, update: {}, create: { nombre: 'CAJERO'        } }),
    prisma.rol.upsert({ where: { nombre: 'TECNICO'       }, update: {}, create: { nombre: 'TECNICO'       } }),
    prisma.rol.upsert({ where: { nombre: 'JEFE_AREA'     }, update: {}, create: { nombre: 'JEFE_AREA'     } }),
  ]);

  const getRol = (nombre: NombreRol) => roles.find(r => r.nombre === nombre)!.id;
  console.log(`   ✅ ${roles.length} roles creados`);

  // ── 2. ÁREAS ──────────────────────────────────────────────────
  console.log('🏢 Creando áreas...');

  const areas = await Promise.all([
    prisma.area.upsert({ where: { sigla: 'MDP'  }, update: {}, create: { nombre: 'Mesa de Partes',                                sigla: 'MDP'  } }),
    prisma.area.upsert({ where: { sigla: 'SAL'  }, update: {}, create: { nombre: 'Subgerencia de Autorizaciones y Licencias',      sigla: 'SAL'  } }),
    prisma.area.upsert({ where: { sigla: 'GDUR' }, update: {}, create: { nombre: 'Gerencia de Desarrollo Urbano y Rural',          sigla: 'GDUR' } }),
    prisma.area.upsert({ where: { sigla: 'SRT'  }, update: {}, create: { nombre: 'Subgerencia de Rentas y Tributación',            sigla: 'SRT'  } }),
    prisma.area.upsert({ where: { sigla: 'SRC'  }, update: {}, create: { nombre: 'Subgerencia de Registros Civiles',               sigla: 'SRC'  } }),
    prisma.area.upsert({ where: { sigla: 'GSM'  }, update: {}, create: { nombre: 'Gerencia de Servicios Municipales',              sigla: 'GSM'  } }),
  ]);

  const getArea = (sigla: string) => areas.find(a => a.sigla === sigla)!.id;
  console.log(`   ✅ ${areas.length} áreas creadas`);

  // ── 3. TIPOS DE TRÁMITE ───────────────────────────────────────
  // El modelo TipoTramite no tiene area_destino_id en schema v3.
  // El área destino se define al momento de derivar el expediente.
  console.log('📄 Creando tipos de trámite...');

  const tramites = [
    { nombre: 'Licencia de Funcionamiento',      costo_soles: 120.00, plazo_dias: 15 },
    { nombre: 'Renovación de Licencia',          costo_soles:  80.00, plazo_dias: 10 },
    { nombre: 'Licencia de Construcción',        costo_soles: 200.00, plazo_dias: 20 },
    { nombre: 'Certificado de No Adeudo',        costo_soles:  30.00, plazo_dias:  5 },
    { nombre: 'Partida de Nacimiento',           costo_soles:  15.00, plazo_dias:  3 },
    { nombre: 'Autorización de Evento Público',  costo_soles:  50.00, plazo_dias:  7 },
  ];

  for (const t of tramites) {
    await prisma.tipoTramite.upsert({
      where:  { nombre: t.nombre },
      update: {},
      create: { ...t, activo: true },
    });
  }
  console.log(`   ✅ ${tramites.length} tipos de trámite creados`);

  // ── 4. USUARIOS DE DEMO ───────────────────────────────────────
  // Contraseñas del 1 al 6 según el ejemplo del equipo
  console.log('👥 Creando usuarios de demo...');

  const hash = async (pwd: string) => bcrypt.hash(pwd, 10);

  const usuarios = [
    // ── Admin ──────────────────────────────────────────────────
    {
      dni:             '00000001',
      nombre_completo: 'Javier Magallanes Rodriguez',
      email:           'admin@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('ADMIN'),
      areaId:          getArea('MDP'),
    },
    // ── Cajero ─────────────────────────────────────────────────
    {
      dni:             '00000002',
      nombre_completo: 'Luis Carrasco Huarcaya',
      email:           'cajero@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('CAJERO'),
      areaId:          getArea('SRT'),
    },
    // ── Mesa de Partes ─────────────────────────────────────────
    {
      dni:             '00000003',
      nombre_completo: 'Andru Antony Ramirez Rodriguez',
      email:           'mdp@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('MESA_DE_PARTES'),
      areaId:          getArea('MDP'),
    },
    // ── Técnicos ───────────────────────────────────────────────
    {
      dni:             '00000004',
      nombre_completo: 'Jorge Luis Altamirano Montalvo',
      email:           'tecnico.sal@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('TECNICO'),
      areaId:          getArea('SAL'),
    },
    {
      dni:             '00000006',
      nombre_completo: 'Josue Cordova Garcia',
      email:           'tecnico.gdur@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('TECNICO'),
      areaId:          getArea('GDUR'),
    },
    {
      dni:             '00000008',
      nombre_completo: 'Tecnico SRT Demo',
      email:           'tecnico.srt@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('TECNICO'),
      areaId:          getArea('SRT'),
    },
    {
      dni:             '00000010',
      nombre_completo: 'Tecnico SRC Demo',
      email:           'tecnico.src@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('TECNICO'),
      areaId:          getArea('SRC'),
    },
    {
      dni:             '00000012',
      nombre_completo: 'Tecnico GSM Demo',
      email:           'tecnico.gsm@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('TECNICO'),
      areaId:          getArea('GSM'),
    },
    // ── Jefes de Área ──────────────────────────────────────────
    {
      dni:             '00000005',
      nombre_completo: 'Jazmin Josselin Taboada Vilca',
      email:           'jefe.sal@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('JEFE_AREA'),
      areaId:          getArea('SAL'),
    },
    {
      dni:             '00000007',
      nombre_completo: 'Jefe GDUR Demo',
      email:           'jefe.gdur@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('JEFE_AREA'),
      areaId:          getArea('GDUR'),
    },
    {
      dni:             '00000009',
      nombre_completo: 'Jefe SRT Demo',
      email:           'jefe.srt@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('JEFE_AREA'),
      areaId:          getArea('SRT'),
    },
    {
      dni:             '00000011',
      nombre_completo: 'Jefe SRC Demo',
      email:           'jefe.src@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('JEFE_AREA'),
      areaId:          getArea('SRC'),
    },
    {
      dni:             '00000013',
      nombre_completo: 'Jefe GSM Demo',
      email:           'jefe.gsm@carmenalto.gob.pe',
      password_hash:   await hash('123456'),
      rolId:           getRol('JEFE_AREA'),
      areaId:          getArea('GSM'),
    },
  ];

  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where:  { email: u.email },
      update: {},
      create: u,
    });
  }
  console.log(`   ✅ ${usuarios.length} usuarios creados`);

  // ── Resumen ───────────────────────────────────────────────────
  console.log('\n✅ Seed completado exitosamente.\n');
  console.log('👤 Credenciales demo (todos con contraseña: 123456)');
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│ ROL          │ EMAIL                          │ CONTRASEÑA       │');
  console.log('├──────────────────────────────────────────────────────────────────┤');
  console.log('│ Admin        │ admin@carmenalto.gob.pe        │ 123456           │');
  console.log('│ Cajero       │ cajero@carmenalto.gob.pe       │ 123456           │');
  console.log('│ Mesa Partes  │ mdp@carmenalto.gob.pe          │ 123456           │');
  console.log('│ Técnico SAL  │ tecnico.sal@carmenalto.gob.pe  │ 123456           │');
  console.log('│ Jefe SAL     │ jefe.sal@carmenalto.gob.pe     │ 123456           │');
  console.log('│ Técnico GDUR │ tecnico.gdur@carmenalto.gob.pe │ 123456           │');
  console.log('│ Jefe GDUR    │ jefe.gdur@carmenalto.gob.pe    │ 123456           │');
  console.log('└──────────────────────────────────────────────────────────────────┘\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });