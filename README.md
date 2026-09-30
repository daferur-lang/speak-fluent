# Speak Fluent

PWA para practicar HABLAR inglés con progresión real por niveles (A1 → A2 → B1 → B2): conversación real por voz con IA y feedback de pronunciación palabra por palabra, no otro repaso de vocabulario pasivo.

**En producción:** https://speak-fluent-app.web.app

## Cómo funciona

- **Reconocimiento y síntesis de voz**: Web Speech API del navegador (gratis, sin backend de voz). Mejor soporte en Chrome/Edge.
- **Comparación de pronunciación**: alineación léxica (LCS) entre la frase objetivo y lo reconocido — marca palabras correctas, omitidas y de más. Ver `src/lib/pronunciation.ts`.
- **Progresión por niveles**: 6 situaciones por nivel (A1/A2/B1/B2), contenido con gramática y vocabulario progresivamente más exigentes. Se desbloquea el siguiente nivel al superar las 6 situaciones del actual con accuracy ≥ 70% (repetibles). El progreso se guarda en `localStorage` (sin backend ni cuenta) — ver `src/hooks/useProgress.ts`.
- **Conversación y feedback con IA**: llamada directa desde el navegador a la API de Gemini (`gemini-3.1-flash-lite`, con `thinkingBudget: 0` para respuestas rápidas) — ver `src/lib/gemini.ts`.
- **Progresión A1**: banco de situaciones en `src/data/prompts.ts`.

## Por qué no hay backend (decisión deliberada)

La primera versión de este proyecto usaba una Firebase Cloud Function para ocultar la API key. Se descartó porque **cualquier** Cloud Function de Firebase (1ª o 2ª generación) exige tener el proyecto en plan Blaze, es decir, una cuenta de facturación enlazada — aunque el uso real se quede en la capa gratuita. Como la prioridad es coste cero garantizado (no "cero coste mientras no me pase"), la llamada a Gemini se hace directamente desde el cliente con una API key restringida únicamente a `generativelanguage.googleapis.com`, en un proyecto de Google Cloud **sin ninguna cuenta de facturación enlazada**. Sin facturación enlazada, Google no puede cobrar nada — es una garantía estructural, no una promesa.

**Trade-off asumido:** la key es visible en el bundle JS (inspeccionable en el navegador). El riesgo real es que alguien agote tu cuota gratuita, no que te llegue una factura — no hay facturación que activar. Aceptable para un proyecto personal/portfolio con tráfico bajo; si esto se convirtiera en un producto con muchos usuarios, ese sería el momento de reconsiderar un proxy con backend de pago.

## Desarrollo local

```bash
npm install
cp .env.example .env   # rellena VITE_GEMINI_API_KEY
npm run dev
```

La API key actual usada en producción vive en `.env` (no versionado, en `.gitignore`).

## Deploy

```bash
npm run build
firebase deploy --only hosting --project speak-fluent-app
```

## Infraestructura creada

- Proyecto Firebase/GCP: `speak-fluent-app` (plan Spark, sin facturación)
- App web Firebase: `Speak Fluent Web`
- API key de Gemini restringida a Generative Language API (proyecto sin billing)
- Hosting: `speak-fluent-app.web.app`

## Limitaciones conocidas

- Web Speech API no funciona en Firefox y tiene soporte limitado en Safari/iOS — se avisa en la propia app si el navegador no es compatible.
- El feedback de pronunciación es léxico (qué palabras dijiste bien/mal), no fonético a nivel de sonido. Ampliarlo a scoring fonético real requeriría una API de pago (p. ej. Azure Pronunciation Assessment).
- Sin conexión no funciona la práctica por voz (a diferencia de otras PWA sin backend): requiere red para llamar a Gemini.
- La respuesta de la IA tarda entre ~2 y ~8 segundos según la longitud del prompt.
