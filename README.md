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

- **Rutas geográficas**: España (LOMLOE, currículo anterior), Estados Unidos (Florida State History & Deep Civics · World Language Spanish 1/2 · Personal Finance & Technology) y Panamá/Latinoamérica (Lengua Española · Geografía e Historia nacional). Datos en `public/data-routes.js` (borrador para revisión del equipo curricular).
- **Modalidad A (Homeschool guiado)**: cuestionario (Conocimiento 30 %) + niveles de rúbrica para Ejecución (40 %) y Conexión local y fe (30 %). Dominio (Mastery) ≥ 80.
- **Modalidad B (Dual Diploma / colegio local)**: subida de boletines trimestrales (`/api/upload-report`) a Storage `student-folders/<student_id>/03 Extensión Local/…`.
- **SIS**: lee `token`, `student_id`, `student_name`, `school_year` (y opcionalmente `mode`, `route`) de la URL; envía cada unidad con `submit_extension_local_grade` (los puntos se recalculan en el servidor). Requiere la migración `20261042_extension_local_20.sql` del repo SIS.
- **Ficha trimestral imprimible** (`@media print`).
- Variables en Vercel para la subida: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Pruebas: `node tests/core.test.mjs && node tests/api.test.mjs`.
