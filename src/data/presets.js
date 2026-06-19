export const PARAMETER_PRESETS = {
  creative: {
    label: 'Creative',
    description: 'Higher temperature, more varied output',
    temperature: 1.2,
    topP: 0.95,
    frequencyPenalty: 0.3,
    presencePenalty: 0.3,
    reasoningMode: false,
  },
  precise: {
    label: 'Precise',
    description: 'Low temperature, focused responses',
    temperature: 0.3,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    reasoningMode: false,
  },
  coding: {
    label: 'Coding',
    description: 'Balanced for code generation',
    temperature: 0.2,
    topP: 0.95,
    frequencyPenalty: 0,
    presencePenalty: 0,
    reasoningMode: true,
    reasoningEffort: 'medium',
  },
};

export const SYSTEM_PROMPT_PRESETS = {
  concise: {
    label: 'Concise',
    description: 'Short, direct answers with no filler',
    prompt:
      'You are a helpful assistant. Give direct, brief answers. Use short sentences and bullet points when helpful. Skip preamble, repetition, and unnecessary detail. Prefer the minimum text needed to answer clearly.',
  },
  explanatory: {
    label: 'Explanatory',
    description: 'Clear, thorough explanations with examples',
    prompt:
      'You are a helpful assistant. Explain concepts clearly and thoroughly. Break complex ideas into steps, define terms when needed, and use concrete examples. Prioritize understanding over brevity.',
  },
  storytelling: {
    label: 'Storytelling',
    description: 'Narrative voice with analogies and vivid framing',
    prompt:
      'You are a helpful assistant with a narrative voice. When appropriate, frame answers as stories, analogies, or vivid scenarios. Use engaging language and a clear arc — setup, development, and conclusion — while staying accurate and helpful.',
  },
};

/** Combined profiles for minimal settings UI */
export const RESPONSE_PROFILES = {
  balanced: {
    label: 'Balanced',
    temperature: 0.7,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
    reasoningMode: false,
    reasoningEffort: 'medium',
    systemPrompt: SYSTEM_PROMPT_PRESETS.concise.prompt,
  },
  creative: {
    label: 'Creative',
    ...PARAMETER_PRESETS.creative,
    systemPrompt: SYSTEM_PROMPT_PRESETS.storytelling.prompt,
  },
  precise: {
    label: 'Precise',
    ...PARAMETER_PRESETS.precise,
    systemPrompt: SYSTEM_PROMPT_PRESETS.concise.prompt,
  },
  coding: {
    label: 'Coding',
    ...PARAMETER_PRESETS.coding,
    systemPrompt: 'You are an expert programmer. Write clean, correct code with brief explanations when helpful.',
  },
};
