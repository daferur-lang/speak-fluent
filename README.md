# Speak Fluent

PWA para practicar HABLAR inglés con progresión real por niveles (A1 → A2 → B1 → B2): conversación real por voz con IA y feedback de pronunciación palabra por palabra, no otro repaso de vocabulario pasivo.

**En producción:** https://speak-fluent-app.web.app

## Método (sep-2026)

La app aplica la metodología de la entrevista «Experta en Aprendizaje Acelerado: Cómo aprender inglés más rápido desde casa» (Wall Street Wolverine): producir antes que estudiar gramática, shadowing, grabarse y reescucharse, escucha activa, relevancia personal + activación emocional + repetición espaciada, exposición diaria y constancia (20 min/día).

| Pestaña | Qué hace | Código |
|---|---|---|
| Hoy | Situación del día (de tus temas), minutos de hoy vs objetivo de 20, racha con 1 día perdonado por semana, consejo de exposición | `src/screens/HoyScreen.tsx`, `src/lib/streak.ts` |
| Shadowing · Imitar | Audio nativo (0.75x/1x, bucle) → te grabas → curvas de entonación superpuestas (semitonos relativos a tu mediana) + escucha A/B + tu primera toma | `src/screens/shadowing/ImitarPanel.tsx`, `src/lib/pitch.ts` |
| Shadowing · Espejo | Lees un texto en voz alta, te grabas, te escuchas; palabras a revisar sin nota numérica | `src/screens/shadowing/EspejoPanel.tsx` |
| Conversar | La conversación por voz con IA de siempre | `src/screens/ConversarScreen.tsx` |
| Mis frases | Capturar una frase oída → traducir una vez → tu propia frase (obligatoria). Repaso espaciado FSRS **hablado**: el acierto de pronunciación se convierte en la nota | `src/screens/FrasesScreen.tsx`, `src/lib/srs.ts` |

- **Audio de referencia**: 42 frases × acento US (Aria) y GB (Sonia) generadas con edge-tts en build (`npm run audio`, requiere `uv` e internet solo al generar). Van en `public/audio/` y se precachean: el shadowing funciona offline. `speechSynthesis` no sirve para esto porque su audio no se puede capturar y no habría curva de referencia.
- **Datos**: perfil (temas + acento) en `localStorage`; frases, grabaciones (primera y última toma) y minutos por día en IndexedDB (`src/lib/db.ts`). Nada sale del dispositivo salvo la conversación con Gemini y el reconocimiento de voz de Chrome.
- **Tests**: `npm test` (tono con señales sintéticas, normalización de curvas, FSRS, racha).

## Cómo funciona (conversación)

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

- La curva de entonación compara la forma de la melodía, no la pronunciación de cada sonido. Si grabas con el audio nativo sonando por el altavoz, el micro lo capta: graba tú solo.
- En algunos Android, Chrome no permite grabar (MediaRecorder) y transcribir (SpeechRecognition) a la vez: el Espejo lo avisa y deja escuchar la grabación igualmente.
- Web Speech API no funciona en Firefox y tiene soporte limitado en Safari/iOS — se avisa en la propia app si el navegador no es compatible.
- El feedback de pronunciación es léxico (qué palabras dijiste bien/mal), no fonético a nivel de sonido. Ampliarlo a scoring fonético real requeriría una API de pago (p. ej. Azure Pronunciation Assessment).
- Sin conexión no funciona la práctica por voz (a diferencia de otras PWA sin backend): requiere red para llamar a Gemini.
- La respuesta de la IA tarda entre ~2 y ~8 segundos según la longitud del prompt.
