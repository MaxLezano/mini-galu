# local-assets/ (ignorada por git)

Contenido de prueba que **no va al repo**. En producción las fotos se cargan desde el panel del taller y viven en el
ImageStorage (disco local en desarrollo, Cloudinary/R2 en producción).

```
local-assets/
├─ mockups/img/     fotos que usan los mockups (design/mockups) y el seed de la base
└─ legacy/          export del proyecto viejo: products.json, site_config.json, images/, home_content/
```

- `pnpm mockups` sirve `design/mockups` y toma las fotos de `local-assets/mockups/img`.
- `pnpm db:seed` copia de `local-assets/mockups/img` a `apps/api/storage/media`. Si la carpeta no está, el seed
  igual carga los productos (sin fotos).
- Si clonás el repo en otra máquina, copiá esta carpeta a mano (no está en GitHub).
