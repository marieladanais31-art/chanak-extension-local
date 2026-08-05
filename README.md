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
