# 0003 · Los filtros del catálogo se resuelven en el dominio

- **Estado:** aceptada (fase 2)
- **Contexto:** el catálogo de un taller artesanal tiene decenas de modelos, no miles. Los filtros (talle con stock,
  ocasión, color, precio, búsqueda sin tildes ni plurales, orden) tienen reglas de negocio.
- **Decisión:** `ProductRepository.findPublished()` trae todo lo publicado y `catalog/domain/product.ts → filterProducts`
  filtra y ordena en memoria, con tests unitarios. La búsqueda semántica de Galú (pgvector) va aparte en la fase 7.
- **Consecuencias:** reglas simples y testeadas. Si el catálogo supera ~1.000 modelos, mover los filtros a SQL detrás del
  mismo puerto sin tocar la web.
