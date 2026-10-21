# 0004 · Producción en un solo servidor de AWS Lightsail, con backups fuera del servidor

- **Estado:** aceptada (octubre 2026). Reemplaza el plan de Render + Vercel + Neon + R2 + Resend (`render.yaml` queda
  como alternativa).
- **Contexto:** presupuesto de ~US$20 por mes, todo en un proveedor, y lo que no se puede perder son los pedidos y los
  datos con los que Gaby trabaja. En Render la API tiene que estar siempre prendida (tareas programadas), Vercel no
  permite uso comercial en el plan gratis y Neon gratis duerme: separados, pasan el presupuesto. En las nubes
  "grandes", una base administrada sola cuesta la mitad del presupuesto.
- **Decisión:** un servidor Lightsail de 2 GB con Docker Compose (`deploy/docker-compose.yml`): Caddy (HTTPS
  automático), tienda (Next standalone), API, Postgres 17 y un servicio de backups. La base vive en un disco aparte.
  Postgres sube cada cambio a un bucket privado con WAL-G (como mucho 1 minuto de atraso) y hay copia completa diaria,
  `pg_dump` diario y mensual, prueba de restauración semanal automática y avisos por mail (SES). Fotos en un bucket
  público de Lightsail (el mismo `S3ImageStorage`). Precios en [COSTOS.md](../COSTOS.md).
- **Consecuencias:** ~US$16 por mes y todo en AWS. El servidor queda a nuestro cargo (actualizaciones automáticas de
  seguridad, `deploy/update.sh`); si se cae, avisa la alarma de Lightsail y se levanta desde el snapshot o desde
  cero con `deploy/restore.sh`. No hay alta disponibilidad: un deploy o un reinicio cortan unos segundos. Las copias
  se prueban solas (`mg-restore-check`) y en la CI (`deploy/test/backups.sh`).
