export const PROMPT_TEMPLATES = [
  {
    id: 'explain',
    category: 'Learning',
    label: 'Explain simply',
    prompt: 'Explain {{topic}} in simple terms, as if to a beginner.',
    variables: ['topic'],
  },
  {
    id: 'code-challenge',
    category: 'Code',
    label: 'Coding challenge',
    prompt: 'Write a {{language}} function to {{task}}. Include comments and edge case handling.',
    variables: ['language', 'task'],
  },
  {
    id: 'debug',
    category: 'Code',
    label: 'Debug code',
    prompt: 'Debug this code and explain the issue:\n\n```\n{{code}}\n```',
    variables: ['code'],
  },
  {
    id: 'compare',
    category: 'Analysis',
    label: 'Compare options',
    prompt: 'Compare {{optionA}} vs {{optionB}} with pros, cons, and a recommendation.',
    variables: ['optionA', 'optionB'],
  },
  {
    id: 'summarize',
    category: 'Writing',
    label: 'Summarize',
    prompt: 'Summarize the following in 3 bullet points:\n\n{{text}}',
    variables: ['text'],
  },
  {
    id: 'story',
    category: 'Writing',
    label: 'Creative story',
    prompt: 'Write a creative short story about {{topic}}.',
    variables: ['topic'],
  },
];

export const QUICK_ACTIONS = [
  { prompt: 'Explain quantum computing in simple terms', label: 'Explain quantum computing', category: 'Learning' },
  { prompt: 'Write a Python function to find the longest palindromic substring', label: 'Write a coding challenge', category: 'Code' },
  { prompt: 'Compare REST vs GraphQL vs gRPC with pros and cons', label: 'Compare API architectures', category: 'Analysis' },
  { prompt: 'Create a creative short story about an AI that discovers music', label: 'Write a creative story', category: 'Writing' },
];
