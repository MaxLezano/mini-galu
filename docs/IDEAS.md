# Mini Galú — Ideas y recomendaciones (Fase 0)

Qué podría sumar la web, ordenado por impacto. ✅ = ya está en los mockups. 🔜 = recomendado para v1. 💡 = para más adelante.

## Para vender más (tienda)

| | Idea | Por qué sirve |
|---|---|---|
| ✅ | **"Mis nenas"**: talle y cumple de cada nena | El catálogo y Galú filtran por su talle; mail 15 días antes del cumple con ideas en su talle |
| ✅ | **Avisame cuando vuelva** (lista de espera por talle) | Convierte un "no hay" en una venta futura y le dice a Gaby qué coser |
| ✅ | **Lanzamientos con cuenta regresiva** + aviso 1 h antes a las anotadas | Las colecciones salen pocas por talle: premia a las clientas fieles y genera expectativa |
| ✅ | **Lista de cumple compartible** | Mamá arma la lista, la familia compra sin repetir regalos |
| ✅ | **Gift cards** con diseño elegible | Resuelve "no sé el talle"; se pagan con crédito, débito o dinero en cuenta |
| ✅ | **Calculadora de talle** (edad + altura vs. tabla del modelo) | Menos cambios, más confianza al comprar online |
| ✅ | **Reseñas con "el talle es justo / grande / chico"** | Ayuda a elegir y da prueba social |
| ✅ | **Completá el look** (moños, sets) | Sube el ticket promedio |
| ✅ | **Retiro en el taller con turnos** | Gratis para la clienta y ordenado para Gaby |
| 🔜 | **Cupones automáticos**: bienvenida, después de reseña, cumpleaños | Ya están en el panel; falta la regla de cada uno |
| 🔜 | **Recordatorio de bolsa abandonada** (24 h, mail con fotos) | Recupera ventas sin esfuerzo |
| 🔜 | **Catálogo sincronizado con Instagram/Facebook Shops** (feed de productos) | Etiquetar productos en las publicaciones con el stock real |
| 🔜 | **Google Merchant Center (fichas gratuitas)** | Aparecer en Google Shopping sin pagar anuncios |
| 💡 | **Fotos de clientas** ("Así las lucen") moderadas desde el panel | Contenido real para la home y para Instagram |
| 💡 | **Programa de referidas**: código para regalar 10% y ganar 10% | Boca en boca, que es como se vende ropa infantil |
| 💡 | **Club Mini Galú**: puntos por compra canjeables por moños/accesorios | Fidelidad sin descuentos agresivos |
| 💡 | **Talles que crecen**: "a Olivia en 6 meses le va el 8, ¿te avisamos?" | Recompra natural según la edad |

## Para que Gaby trabaje menos (panel del taller)

| | Idea | Por qué sirve |
|---|---|---|
| ✅ | **Tablero de pedidos** (arrastrar entre estados) + vista lista con acciones masivas | Ver todo de un vistazo, en compu o celular |
| ✅ | **Siguiente paso en un clic** (preparar → etiqueta → despachado) | Cada pedido dice qué falta hacer |
| ✅ | **Picking con tilde por prenda** + **lista de preparación imprimible** agrupada por modelo y talle | Menos errores al armar paquetes |
| ✅ | **Links de pago automáticos**: cada pedido sin pagar genera su link de Mercado Pago y se reenvía solo | Nadie arma links a mano |
| ✅ | **Plantillas de WhatsApp** con datos del pedido | Responder rápido y siempre igual de cálido |
| ✅ | **Automatizaciones** con registro de lo que se hizo solo | Confirmación de pago, seguimiento, retiro, reseñas, avisos de talle |
| ✅ | **Lanzamientos**: crear, editar y programar adelantos (home con cuenta regresiva, aviso a anotados, texto para redes) | Lo que viene se muestra en la web, no solo en redes |
| ✅ | **Clientas** con nenas, cumples próximos y total comprado | CRM simple sin planillas |
| ✅ | **Galú: "enseñale"** las preguntas que no supo | La asistente mejora con el uso |
| ✅ | **Notificaciones** y **búsqueda global** (atajo `/`) | Encontrar cualquier pedido o clienta en segundos |
| 🔜 | **Panel instalable en el celular (PWA)** con aviso push de pedido nuevo | Gaby opera desde el teléfono como si fuera una app |
| 🔜 | **Etiquetas Andreani en lote** (un PDF con todas) | Despachar 10 pedidos en un minuto |
| 🔜 | **Reporte mensual** por mail: ventas, más vendidos, talles agotados | Decisiones con números, sin abrir el panel |
| 💡 | **Costos por prenda** (tela, horas, avíos) y margen real | Saber qué modelos convienen |
| 💡 | **Stock de materiales** (telas, puntillas) vinculado a las tandas | Evitar quedarse sin insumos |
| 💡 | **Varias usuarias** con permisos (ej. alguien que solo despacha) | Para cuando el taller crezca |

## Técnicas

- **Analítica sin cookies invasivas**: Umami self-hosted (gratis) para saber qué se mira y qué se compra.
- **Imágenes**: subir una vez, generar AVIF/WebP en varios tamaños automáticamente (sharp) y servir con `srcset`.
- **Backups diarios** de Postgres (Neon los incluye; local con `pg_dump` + cron).
- **Accesibilidad**: contraste AA verificado, navegación por teclado, `prefers-reduced-motion`.
- **Pruebas visuales**: Playwright saca capturas en 375 / 820 / 1440 / 2560 px en cada PR (ya hay un script de base usado en la Fase 0).
- **Dominio y mail propios** (`hola@minigalu.com.ar`) para que los avisos no caigan en spam.

## Decisiones tomadas en la Fase 0

- **Solo venta minorista con stock disponible.** Sin preventa ni producción a pedido (la venta mayorista es en persona). Se quitó "Qué coser" del panel.
- **Clientes**, no "clientas": compran mujeres y hombres.

- **Pagos**: Mercado Pago dentro de la web (tarjeta de crédito, débito y dinero en cuenta) + links de pago + gift cards.
  Se descartaron señas/reservas, packaging de regalo y etiquetas de "pieza única".
- **Sin íconos de "IA"** en ningún lado. Galú se presenta como "la asistente del taller", con el foco (filamento de corazón) como ícono.
- **WhatsApp e Instagram** como contacto flotante discreto: barra lateral en escritorio, un botón que se despliega en celular.
- **Todo en la paleta**: ningún botón o estado usa colores de marca de terceros (azul MP, rojo Andreani, etc.).
