# Costos de producción (AWS Lightsail)

Precios de la página oficial de Lightsail y de SES, consultados el 21/10/2026 (en dólares, sin impuestos):
<https://aws.amazon.com/lightsail/pricing/> · <https://aws.amazon.com/ses/pricing/>.
Región: **São Paulo (sa-east-1)**, la más cerca de Argentina. Antes de crear cada cosa, la consola de Lightsail
muestra el precio final: si no coincide con esta tabla, manda la consola.

## Plan mensual

| Qué | Para qué | US$/mes |
|---|---|---:|
| Servidor Linux 2 GB RAM · 2 vCPU · 60 GB SSD (incluye IP pública y 1,5 TB de tráfico en São Paulo) | tienda, API, base, HTTPS y backups (`deploy/docker-compose.yml`) | 12,00 |
| Disco aparte 8 GB (block storage, US$0,10 el GB) | la base y los certificados: sobreviven si el servidor se rompe | 0,80 |
| Snapshots automáticos diarios (US$0,05 el GB guardado; Lightsail guarda los últimos 7 y cobra solo lo que cambia) | volver a levantar el servidor entero | ~1,00 |
| Bucket de fotos (5 GB guardados, 25 GB de tráfico) | fotos de las prendas y la portada | 1,00 |
| Bucket de backups (5 GB guardados, 25 GB de tráfico), privado | copia continua de la base, copias diarias y mensuales | 1,00 |
| Amazon SES (US$0,10 cada 1.000 mails) | mails de pedidos, cartas del taller y avisos | ~0,50 |
| IP fija y zona DNS de Lightsail | dominio apuntando al servidor | 0,00 |
| **Total** | | **~16,30** |

Margen hasta los US$20: ~US$3,70 para crecer (ver abajo).

### Primeros meses

- **Servidor gratis 3 meses**: la oferta de Lightsail cubre el plan de US$12 con IPv4 en cuentas que usan Lightsail
  por primera vez (una instancia por cuenta). Esos meses se paga **~US$4,30**.
- **Un bucket de 5 GB gratis el primer año**: el segundo bucket se paga. Primer año, del mes 4 al 12: **~US$15,30**.
- AWS da además créditos de Free Tier a cuentas nuevas (hasta US$200 según la página de SES); no se cuentan acá.

### Fuera de AWS (no entran en los US$20)

- **Dominio `.com.ar`**: se paga por año a NIC Argentina (revisar la tarifa vigente). Los DNS se manejan gratis en
  Lightsail.
- **Impuestos de la tarjeta**: los pagos en dólares suman las percepciones que cobre el banco.
- **Mercado Pago** cobra su comisión por venta; **Andreani**, cada envío. Ninguno es un costo fijo del servidor.
- **Galú con IA** (opcional): sin `ANTHROPIC_API_KEY` responde por reglas y no cuesta nada.

## Cuándo sube y cuánto

| Si pasa esto | Qué cambiar | Costo |
|---|---|---:|
| Las fotos superan 25 GB de tráfico por mes (~15.000 visitas con fotos) | bucket de fotos al plan de 100 GB / 250 GB de tráfico | +2,00 |
| El servidor anda justo (memoria siempre arriba del 85% en las métricas de Lightsail) | plan de 4 GB RAM | +12,00 |
| La base o las fotos crecen | disco aparte de 16 GB | +0,80 |
| Más de 1.000 mails extra por mes | SES | +0,10 por cada 1.000 |

Con el plan de 4 GB el total queda en ~US$28: recién hace falta con mucho más tráfico que el de hoy.

## Lo que no conviene ahorrar

- **Los backups**: el segundo bucket (US$1) y los snapshots (~US$1) son lo que evita perder pedidos. Ver
  "Backups y avisos" en [DEPLOY.md](DEPLOY.md).
- **El disco aparte** (US$0,80): si el servidor se rompe, la base sigue en ese disco y se conecta a uno nuevo.
