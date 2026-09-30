import type { ContextId } from './contexts'

/** Short read-aloud texts for the "Espejo" exercise (record yourself, listen back, fix). */
export interface MirrorText {
  id: string
  context: ContextId
  title: string
  text: string
}

export const MIRROR_TEXTS: MirrorText[] = [
  {
    id: 'mirror-intro',
    context: 'smalltalk',
    title: 'Preséntate',
    text: "Hi, I'm from Spain. I live near the coast, and I love it because the weather is great almost all year. I'm learning English because I want to speak with people from all over the world.",
  },
  {
    id: 'mirror-work',
    context: 'work',
    title: 'Tu trabajo',
    text: "I've been working in the same company for a few years. My job is quite busy, but I like it. Every morning I check my emails, and then I meet my team to plan the day.",
  },
  {
    id: 'mirror-travel',
    context: 'travel',
    title: 'Un viaje',
    text: "Last summer we went to London for a week. We walked a lot, visited some museums and tried the food. The best part was talking to people in English without being afraid.",
  },
  {
    id: 'mirror-food',
    context: 'food',
    title: 'En el restaurante',
    text: "Good evening. Could we have a table for two, please? We'd like to see the menu. I think I'm gonna have the fish, and could we get some water for the table?",
  },
  {
    id: 'mirror-family',
    context: 'family',
    title: 'Tu familia',
    text: "I have a small family. My kids are growing up fast, and every weekend we try to do something together. Sometimes we go to the beach, and sometimes we just stay at home and watch a film.",
  },
  {
    id: 'mirror-hobbies',
    context: 'hobbies',
    title: 'Lo que te gusta',
    text: "In my free time I like going to the gym and listening to podcasts. Lately I've been watching series in English with subtitles. At first it was hard, but now I understand much more.",
  },
]
