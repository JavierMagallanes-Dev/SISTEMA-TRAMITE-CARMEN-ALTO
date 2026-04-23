-- CreateEnum
CREATE TYPE "NombreRol" AS ENUM ('ADMIN', 'MESA_DE_PARTES', 'CAJERO', 'TECNICO', 'JEFE_AREA');

-- CreateEnum
CREATE TYPE "EstadoExpediente" AS ENUM ('PENDIENTE_PAGO', 'RECIBIDO', 'EN_REVISION_MDP', 'DERIVADO', 'EN_PROCESO', 'LISTO_DESCARGA', 'PDF_FIRMADO', 'RESUELTO', 'OBSERVADO', 'RECHAZADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('VERIFICADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "OperacionAuditoria" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "TipoAccion" AS ENUM ('REGISTRO', 'VERIFICACION_PAGO', 'ANULACION_PAGO', 'REVISION_MDP', 'DERIVACION', 'TOMA_EXPEDIENTE', 'OBSERVACION', 'VISTO_BUENO', 'DESCARGA_PDF', 'SUBIDA_PDF_FIRMADO', 'RECHAZO', 'ARCHIVADO', 'SUBSANACION');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "nombre" "NombreRol" NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "sigla" VARCHAR(10) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "dni" VARCHAR(8) NOT NULL,
    "nombre_completo" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "rolId" INTEGER NOT NULL,
    "areaId" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciudadanos" (
    "id" SERIAL NOT NULL,
    "dni" VARCHAR(8) NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellido_pat" VARCHAR(80) NOT NULL,
    "apellido_mat" VARCHAR(80) NOT NULL DEFAULT '',
    "email" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(15),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ciudadanos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_tramite" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "plazo_dias" INTEGER NOT NULL,
    "costo_soles" DECIMAL(8,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_tramite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedientes" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "ciudadanoId" INTEGER NOT NULL,
    "tipoTramiteId" INTEGER NOT NULL,
    "estado" "EstadoExpediente" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_limite" TIMESTAMP(3) NOT NULL,
    "fecha_resolucion" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,
    "url_pdf_firmado" VARCHAR(500),
    "codigo_verificacion_firma" VARCHAR(100),
    "fecha_firma" TIMESTAMP(3),
    "firmadoPorId" INTEGER,
    "registradoPorId" INTEGER,
    "areaActualId" INTEGER,

    CONSTRAINT "expedientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "cajeroId" INTEGER NOT NULL,
    "boleta" VARCHAR(50) NOT NULL,
    "monto_cobrado" DECIMAL(8,2) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'VERIFICADO',
    "motivo_anulacion" VARCHAR(200),
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo_accion" "TipoAccion" NOT NULL,
    "estado_resultado" "EstadoExpediente" NOT NULL,
    "comentario" TEXT,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "areaOrigenId" INTEGER,
    "areaDestinoId" INTEGER,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "url" TEXT NOT NULL,
    "tipo_mime" VARCHAR(100) NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "derivaciones_pendientes" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "token" VARCHAR(100) NOT NULL,
    "instrucciones" TEXT,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "areaDestinoId" INTEGER NOT NULL,

    CONSTRAINT "derivaciones_pendientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "expedienteId" INTEGER NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "enviado_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "tabla" VARCHAR(50) NOT NULL,
    "operacion" "OperacionAuditoria" NOT NULL,
    "registro_id" INTEGER,
    "datos_anteriores" JSONB,
    "datos_nuevos" JSONB,
    "usuario_bd" VARCHAR(100),
    "usuario_app_id" INTEGER,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "areas_nombre_key" ON "areas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "areas_sigla_key" ON "areas"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_dni_key" ON "usuarios"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_rolId_idx" ON "usuarios"("rolId");

-- CreateIndex
CREATE INDEX "usuarios_areaId_idx" ON "usuarios"("areaId");

-- CreateIndex
CREATE INDEX "usuarios_activo_idx" ON "usuarios"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "ciudadanos_dni_key" ON "ciudadanos"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "ciudadanos_email_key" ON "ciudadanos"("email");

-- CreateIndex
CREATE INDEX "ciudadanos_dni_idx" ON "ciudadanos"("dni");

-- CreateIndex
CREATE INDEX "ciudadanos_email_idx" ON "ciudadanos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_tramite_nombre_key" ON "tipos_tramite"("nombre");

-- CreateIndex
CREATE INDEX "tipos_tramite_activo_idx" ON "tipos_tramite"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "expedientes_codigo_key" ON "expedientes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "expedientes_codigo_verificacion_firma_key" ON "expedientes"("codigo_verificacion_firma");

-- CreateIndex
CREATE INDEX "expedientes_ciudadanoId_idx" ON "expedientes"("ciudadanoId");

-- CreateIndex
CREATE INDEX "expedientes_estado_idx" ON "expedientes"("estado");

-- CreateIndex
CREATE INDEX "expedientes_areaActualId_idx" ON "expedientes"("areaActualId");

-- CreateIndex
CREATE INDEX "expedientes_fecha_registro_idx" ON "expedientes"("fecha_registro");

-- CreateIndex
CREATE INDEX "expedientes_tipoTramiteId_idx" ON "expedientes"("tipoTramiteId");

-- CreateIndex
CREATE INDEX "expedientes_fecha_limite_idx" ON "expedientes"("fecha_limite");

-- CreateIndex
CREATE INDEX "pagos_expedienteId_idx" ON "pagos"("expedienteId");

-- CreateIndex
CREATE INDEX "pagos_cajeroId_idx" ON "pagos"("cajeroId");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- CreateIndex
CREATE INDEX "pagos_fecha_pago_idx" ON "pagos"("fecha_pago");

-- CreateIndex
CREATE INDEX "movimientos_expedienteId_idx" ON "movimientos"("expedienteId");

-- CreateIndex
CREATE INDEX "movimientos_usuarioId_idx" ON "movimientos"("usuarioId");

-- CreateIndex
CREATE INDEX "movimientos_fecha_hora_idx" ON "movimientos"("fecha_hora");

-- CreateIndex
CREATE INDEX "movimientos_tipo_accion_idx" ON "movimientos"("tipo_accion");

-- CreateIndex
CREATE INDEX "documentos_expedienteId_idx" ON "documentos"("expedienteId");

-- CreateIndex
CREATE UNIQUE INDEX "derivaciones_pendientes_token_key" ON "derivaciones_pendientes"("token");

-- CreateIndex
CREATE INDEX "derivaciones_pendientes_expedienteId_idx" ON "derivaciones_pendientes"("expedienteId");

-- CreateIndex
CREATE INDEX "derivaciones_pendientes_estado_idx" ON "derivaciones_pendientes"("estado");

-- CreateIndex
CREATE INDEX "derivaciones_pendientes_expires_at_idx" ON "derivaciones_pendientes"("expires_at");

-- CreateIndex
CREATE INDEX "notificaciones_expedienteId_idx" ON "notificaciones"("expedienteId");

-- CreateIndex
CREATE INDEX "notificaciones_enviado_idx" ON "notificaciones"("enviado");

-- CreateIndex
CREATE INDEX "notificaciones_canal_idx" ON "notificaciones"("canal");

-- CreateIndex
CREATE INDEX "auditoria_tabla_operacion_fecha_hora_idx" ON "auditoria"("tabla", "operacion", "fecha_hora");

-- CreateIndex
CREATE INDEX "auditoria_registro_id_idx" ON "auditoria"("registro_id");

-- CreateIndex
CREATE INDEX "auditoria_usuario_app_id_idx" ON "auditoria"("usuario_app_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_ciudadanoId_fkey" FOREIGN KEY ("ciudadanoId") REFERENCES "ciudadanos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_tipoTramiteId_fkey" FOREIGN KEY ("tipoTramiteId") REFERENCES "tipos_tramite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_firmadoPorId_fkey" FOREIGN KEY ("firmadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_areaActualId_fkey" FOREIGN KEY ("areaActualId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cajeroId_fkey" FOREIGN KEY ("cajeroId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_areaOrigenId_fkey" FOREIGN KEY ("areaOrigenId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_areaDestinoId_fkey" FOREIGN KEY ("areaDestinoId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derivaciones_pendientes" ADD CONSTRAINT "derivaciones_pendientes_areaDestinoId_fkey" FOREIGN KEY ("areaDestinoId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "derivaciones_pendientes" ADD CONSTRAINT "derivaciones_pendientes_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_expedienteId_fkey" FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
