# Mockups — Mini Galú

HTML estático, sin build. Usa fotos de prueba y los productos reales del seed. Las fotos **no están en el repo**:
viven en `local-assets/mockups/img` (carpeta ignorada, ver `local-assets/README.md`) y el servidor las sirve como `assets/img/`.
Las librerías están copiadas en `assets/vendor/` (funcionan sin internet, salvo las tipografías de Google Fonts).

## Cómo verlos

```bash
pnpm mockups                  # http://localhost:5500 (scripts/serve-mockups.mjs)
```

Abrir en Chrome o Edge. También funcionan con doble clic (file://), pero las transiciones entre páginas necesitan servidor.

## Tienda

| Página | Qué probar |
|---|---|
| `index.html` | Hero, colecciones, carrusel de novedades, **lanzamiento con cuenta regresiva y aviso**, lookbook con puntos clicables, reseñas, Galú |
| `catalogo.html` | Filtros (talle, ocasión, color, precio, "Mis nenas"), chips activos, Tienda/Lookbook, búsqueda, hoja de filtros en celular |
| `producto.html?p=<slug>` | Galería con zoom, talles con stock, **calculadora de talle**, **avisame cuando vuelva**, envío por CP, reseñas, barra fija en celular |
| `giftcards.html` | Armado con vista previa en vivo (diseño, monto, mensaje, WhatsApp o mail, fecha), cómo funciona, **consulta de saldo** (probá `GALU-7KQ2`) |
| `checkout.html` | 3 pasos, Andreani / sucursal / retiro con turnos, **Mercado Pago: crédito (cuotas), débito o dinero en cuenta**, gift card, pantalla de éxito |
| `seguimiento.html` | Probá MG-1042, MG-1040 (retiro), MG-1044, MG-1046 (sin pagar), MG-1035 (entregado) |
| `cuenta.html` | Mis nenas (agregar), pedidos, favoritos, **lista de cumple compartible**, gift cards, datos |

Slugs: `romantico-rojo`, `maddie`, `samanta`, `catalina`, `catalina-rojo`, `cleo`, `elsa`, `rebeca`, `mariel`, `mono-verde`, `corazon-pana` (borrador de lanzamiento).

**Galú** (moño abajo a la derecha) responde con reglas sobre los datos de `assets/js/data.js`. Probá:
"¿qué hay en talle 6?", "algo para un bautismo", "¿cuánto sale el Samanta?", "¿dónde está mi pedido?", "¿cómo pago?".

**Navbar**: *Tienda* abre un mega menú (colecciones con cantidad, talles, nenas, ocasiones, lo nuevo); *Lanzamiento* muestra los días que faltan. Lupa o tecla `/` abre el buscador con resultados en vivo. Camioncito y usuaria abren popovers. El catálogo entiende `?talle=6`, `?ocasion=bautismo` y `?q=vestido rojo`.

**Contacto**: barra lateral (WhatsApp, Instagram, mail, seguimiento) en escritorio; en celular, un botón que se despliega sobre Galú.

**Detalles de taller** (animaciones de costura): la aguja cose las costuras entre secciones (alternando el sentido), cinta métrica arriba como progreso de lectura, la prenda vuela a la bolsa al agregarla, etiquetas que se balancean, pespuntes al pasar el mouse por fotos y botones, puntadas que estallan al guardar un favorito, moños que se atan y bordados que florecen al aparecer y textura de lino en los fondos de color. Todo se desactiva con `prefers-reduced-motion` y con `?static`.

## Panel del taller (admin)

| Página | Qué probar |
|---|---|
| `admin.html` | Tareas del día, métricas, ventas por semana, últimos pedidos, lanzamiento, stock, registro automático |
| `admin-reporte.html` | Reporte mensual: ventas contra el mes anterior, lo más vendido, canales, talles agotados y más vendidos; elegir el mes, imprimir |
| `admin-pedidos.html` | **Tablero arrastrable**, lista con selección múltiple, lista de preparación, detalle con siguiente paso, picking y WhatsApp |
| `admin-lanzamientos.html` | Próximos lanzamientos, borradores y anteriores; **crear y editar** (portada, fecha y hora, prendas, cuenta regresiva en la home, aviso a anotados, texto para redes) |
| `admin-productos.html` | Talles y stock en columnas separadas, editor con fotos ordenables y stock por talle |
| `admin-clientes.html` | Nenas, cumples próximos, ficha con pedidos |
| `admin-galu.html` | Conversaciones, "enseñale", ajustes |
| `admin-automatizaciones.html` | Reglas activables, editor de mensajes con vista previa, registro |
| `admin-tienda.html` | Mercado Pago (medios, cuotas, prueba/producción), envíos, **portada editable con vista previa**, **cupones (crear, editar, pausar)**, gift cards |

Los links de pago de Mercado Pago **se generan solos** en cada pedido sin pagar y se reenvían a las 24 h.

## Extras

- `?static` en cualquier URL desactiva animaciones (para capturas).
- Los cambios (bolsa, favoritos, estados de pedidos) son de mentira: viven en memoria o en `localStorage`.

## Archivos

- `assets/css/styles.css` — tokens (paleta, tipografías, motion) y componentes. Pasan a `packages/design-tokens`.
- `assets/css/admin.css` — layout y componentes del panel.
- `assets/js/data.js` — productos, pedidos, clientes, conversaciones y automatizaciones de ejemplo.
- `assets/js/app.js` — layout de la tienda, bolsa, favoritos, contacto, modales y Galú.
- `assets/js/admin.js` — armazón del panel, detalle de pedido, plantillas de WhatsApp, links de pago, lista de preparación.
- `assets/vendor/` — Lucide 1.52, Swiper 11, SortableJS 1.15.
