# Chanak Extensión Local — Cuaderno interactivo

Aplicación web interactiva del 20% local (LOMLOE) del modelo 60/20/20 de Chanak International Academy.

## Qué incluye

- **12 grados**: 1º–6º Primaria, 1º–4º ESO, 1º–2º Bachillerato.
- **Currículum oficial completo**: 3 trimestres × 3 meses = 9 unidades mensuales por grado (108 en total), extraído de las guías PDF oficiales.
- Cada mes: tema, contenidos, 4 sesiones semanales, entregable, rúbrica oficial (Conocimiento 30 + Ejecución 40 + Conexión local y fe 30 = 100 pts), pasaje bíblico y competencias clave LOMLOE.
- Buscador de lecciones por tema, mes o grado.
- Gamificación ligera con ChanakCoins locales (independiente de la billetera del portal).

## Estructura

```
chanak-extension-local/
├── public/
│   ├── index.html
│   ├── data-curriculum.js
│   └── app.js
├── vercel.json
└── README.md
```

## Despliegue

```bash
git init && git add . && git commit -m "feat: Chanak Extensión Local v1"
gh repo create chanak-extension-local --public --source=. --remote=origin --push
vercel --prod
```

---
© Chanak International Academy · Uso interno de la red EducaFe–Chanak.

## Módulo oficial del 20 % (v2)

**Un solo SQL**: `sql/20261042_extension_local_20.sql` (copia en `.claude/backup/28_extension_local_20.sql` del SIS). Se ejecuta una vez en el SQL Editor de Supabase.
Variables de Vercel para la subida de boletines: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

- **Archivos**: `index.html` (selector de ruta, grado/etapa, modo demostración y plantilla `@media print`), `content_extension.js` (catálogo: rutas EE. UU./Panamá, Checkpoints de Cosmovisión y ejes de Lengua), `app_extension.js` (navegación, rúbrica 30/40/30, compuertas de dominio, REST con Supabase, impresión), `extension.css` (marino #0f172a, dorado #f59e0b, A4 vertical) y `el-core.js` (cálculo puro, con pruebas).
- **Etapas**: Primaria (1.º-6.º) sin hominización ni evolucionismo y con enfoque de la creación/diseño inteligente, la dignidad humana y la narrativa providencial; Secundaria y Bachillerato (7.º-12.º) con teorías seculares contrastadas y el **Biblical Worldview Checkpoint** (Imago Dei, Gn 1:26-27, Hch 17:26): ensayo de ≥ 120 palabras, 5 criterios 0-4, dominio ≥ 80 %.
- **Lengua** (España, Panamá): 4 ejes continuos (oral/retórica, gramática y ortografía, redacción y estilo, canon literario clásico, cristiano y moral).
- **Rutas**: España (LOMLOE, currículo anterior intacto), Estados Unidos (Florida History & Deep Civics · **Opción B: World Language & Ibero-American Church History** con Spanish 1/2/Conversational y el proyecto «La Brecha y Cómo Alcanzar» · Personal Finance & Technology) y Panamá/Latinoamérica (Lengua Española · Geografía e Historia nacional).
- **Modalidad A (Homeschool)**: checkups de dominio (cuestionario 30 %), Ejecución 40 % y Conexión local y fe 30 %; unidad imprimible A4 («Descargar / Imprimir Unidad en PDF»). **Modalidad B (Dual Diploma)**: subida de boletines a `student-folders/<student_id>/03 Extensión Local/…` (`/api/upload-report`).
- **URL**: `token`, `student_id`, `student_name`, `school_year`, `country` (abre la ruta), `grade_level` (fija etapa y banda), `mode`, `route`. Sin token: **modo demostración** (muestras de Primaria y de Secundaria con Checkpoint).
- Los puntos se recalculan en el servidor (`submit_extension_local_grade`); toda nota entra «pendiente de revisión».
- Pruebas: `node tests/core.test.mjs && node tests/api.test.mjs && node tests/content.test.mjs`.

## LMS profundo (v3)

- `deep_extension.js` + `deep/*.js`: cada unidad de los 12 grados de España y de la Opción B de EE. UU. (Spanish 1, 2 y Conversational) trae lectura académica, glosario, práctica guiada con respuesta modelo y un Checkpoint de dominio de 5 preguntas.
- **Compuerta**: la lección siguiente se abre con ≥ 80 % (4 de 5) en el checkpoint de la anterior; un supervisor puede desbloquear desde el aviso (no aplica en modo demostración).
- **Impresión A4**: lectura, glosario y renglones para escribir a mano, con rúbrica 30/40/30 y firmas.
- **Longitud de la lectura por grado**: 1.º-2.º 250-350 palabras · 3.º-4.º 400-520 · 5.º-6.º 550-800 · ESO 650-950 · Bachillerato 750-950.
- `docs/VERIFICAR_CONTENIDO.md`: datos que el equipo curricular debe confirmar antes de publicar como oficial.
- Pruebas: `node tests/deep.test.mjs` (más las de núcleo, API y catálogo).
