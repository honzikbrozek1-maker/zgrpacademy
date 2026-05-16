// Note: 'flashcards' modul je dočasně skrytý (vypnuté kartičky), ale ponechán v mapování
// pro případné budoucí zapnutí. Aktivní moduly:
export const MODULE_KEYS = ['quiz', 'fillin'] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

const QUESTION_TYPE_TO_MODULE: Record<string, ModuleKey | undefined> = {
  quiz: 'quiz',
  // flashcard: 'flashcards', // dočasně vypnuto
  fill_blank: 'fillin',
};

export function getStartedModuleMarker(module: ModuleKey) {
  return `${module}:started`;
}

export function getCompletedModules(markers: string[] | null | undefined): ModuleKey[] {
  if (!Array.isArray(markers)) return [];
  return MODULE_KEYS.filter((module) => markers.includes(module));
}

export function getAvailableModulesFromQuestionTypes(types: string[] | null | undefined): ModuleKey[] {
  if (!Array.isArray(types)) return [];

  const modules = new Set<ModuleKey>();
  for (const type of types) {
    const module = QUESTION_TYPE_TO_MODULE[type];
    if (module) modules.add(module);
  }

  return MODULE_KEYS.filter((module) => modules.has(module));
}

export function getLevelProgressPercent(
  availableModules: ModuleKey[],
  markers: string[] | null | undefined,
  testCompleted: boolean,
) {
  const completedModules = getCompletedModules(markers).filter((module) => availableModules.includes(module));
  const totalSteps = availableModules.length + 1;
  const completedSteps = completedModules.length + (testCompleted ? 1 : 0);

  if (totalSteps <= 0) return 0;

  return Math.round((completedSteps / totalSteps) * 100);
}
