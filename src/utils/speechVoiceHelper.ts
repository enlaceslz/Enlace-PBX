/**
 * speechVoiceHelper.ts
 * Motor de Voz Humanizada em Português Brasileiro (pt-BR)
 * 
 * Funcionalidades:
 * - Seleção inteligente de vozes com detecção e diferenciação estrita de gênero:
 *   - MASCULINA: Roberto Mendes (Suporte Técnico Ramal 4102), Carlos Silva (4101), Lucas Barreto.
 *     Prioriza vozes masculinas pt-BR (Antonio, Daniel, Felipe, Jorge, Ricardo).
 *     Caso o sistema operacional ou navegador só disponha de voz feminina padrão, aplica modulação
 *     acústica de pitch (0.74) e taxa (0.94) para transferir a ressonância para timbre barítono/masculino natural.
 *   - FEMININA: MaIA (Assistente Virtual Enlace), Mariana Costa (Comercial 4103), Renata Lima (Financeiro 4201).
 *     Prioriza vozes femininas naturais pt-BR (Francisca, Thalita, Leticia, Luciana, Maria, Google).
 * - Humanização de texto: remoção de markdown, asteriscos, expansão fonética de siglas (URA, N1, PJSIP, VoIP, ramais).
 * - Tratamento assíncrono do evento `onvoiceschanged` do Chromium/Safari.
 */

export type VoiceGender = 'male' | 'female' | 'auto';
export type VoicePersona = 'roberto' | 'maia' | 'mariana' | 'carlos' | 'renata' | 'ura';

export interface SpeakOptions {
  gender?: VoiceGender;
  persona?: VoicePersona;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

// Cache de vozes carregadas no navegador
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const updateVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {
      // Ignora erro em browsers restritivos
    }
  };

  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
}

/**
 * Normaliza e humaniza o texto para telefonia em português do Brasil:
 * Remove formatações de markdown, caracteres que causam pausas mecânicas,
 * e converte siglas técnicas para fonemas naturais em português.
 */
export function humanizeSpeechText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove markdown (negrito, itálico, blocos de código, headers)
  text = text.replace(/[*_#`~[\]()]/g, ' ');
  // Remove links markdown [texto](url)
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove emojis
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');

  // 2. Normaliza siglas e termos de telefonia para pronúncia fluida
  text = text
    .replace(/\bURA\b/gi, 'U R A')
    .replace(/\bPJSIP\b/gi, 'P J SIP')
    .replace(/\bSIP\b/gi, 'SIP')
    .replace(/\bVoIP\b/gi, 'Vóip')
    .replace(/\bARI\b/gi, 'A R I')
    .replace(/\bPBX\b/gi, 'P B X')
    .replace(/\bDTMF\b/gi, 'D T M F')
    .replace(/\bWebRTC\b/gi, 'Web R T C')
    .replace(/\bN1\b/gi, 'N um')
    .replace(/\bN2\b/gi, 'N dois')
    .replace(/\bNOC\b/gi, 'N O C')
    .replace(/\bSAC\b/gi, 'S A C')
    .replace(/\bLGPD\b/gi, 'L G P D')
    .replace(/\b24\/7\b/gi, 'vinte e quatro horas por dia')
    .replace(/\bRamal\s*4101\b/gi, 'Ramal quarenta e um zero um')
    .replace(/\bRamal\s*4102\b/gi, 'Ramal quarenta e um zero dois')
    .replace(/\bRamal\s*4103\b/gi, 'Ramal quarenta e um zero três')
    .replace(/\bFila\s*7001\b/gi, 'Fila sete zero zero um')
    .replace(/\bFila\s*7002\b/gi, 'Fila sete zero zero dois')
    .replace(/\bRamal\s*9001\b/gi, 'Ramal nove zero zero um')
    .replace(/\bOpção\s*1\b/gi, 'Opção um')
    .replace(/\bOpção\s*2\b/gi, 'Opção dois')
    .replace(/\bOpção\s*3\b/gi, 'Opção três')
    .replace(/\bOpção\s*9\b/gi, 'Opção nove')
    .replace(/\bOpção\s*0\b/gi, 'Opção zero');

  // 3. Suaviza pontuação e múltiplos espaços
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,;:?!])/g, '$1')
    .trim();

  return text;
}

/**
 * Detecta o gênero do locutor baseado no persona ou pistas no texto falado.
 */
export function detectVoiceGender(text: string, persona?: VoicePersona, fallback: VoiceGender = 'female'): 'male' | 'female' {
  if (persona === 'roberto' || persona === 'carlos') return 'male';
  if (persona === 'maia' || persona === 'mariana' || persona === 'renata' || persona === 'ura') return 'female';

  const lower = (text || '').toLowerCase();

  // Pistas prioritárias de identidade masculina (Roberto Mendes / Suporte N1 / Carlos)
  const maleKeywords = [
    'roberto falando',
    'roberto mendes',
    'meu nome é roberto',
    'sou o roberto',
    'aqui é o roberto',
    'roberto do suporte',
    'carlos falando',
    'carlos silva',
    'meu nome é carlos',
    'sou o carlos',
    'aqui é o carlos',
    'lucas falando',
    'meu nome é lucas',
    'sou o lucas',
    'sou o especialista',
    'atendente masculino',
  ];

  if (maleKeywords.some((k) => lower.includes(k))) {
    return 'male';
  }

  // Pistas explícitas de identidade feminina (MaIA / Mariana / Renata)
  const femaleKeywords = [
    'sou a maia',
    'maia falando',
    'assistente virtual da enlace',
    'mariana falando',
    'mariana costa',
    'renata falando',
    'renata lima',
    'obrigada',
    'bem-vinda',
    'atendente feminina',
  ];

  if (femaleKeywords.some((k) => lower.includes(k))) {
    return 'female';
  }

  return fallback === 'male' ? 'male' : 'female';
}

export interface DetectedSpeakerInfo {
  gender: 'male' | 'female';
  persona: VoicePersona;
  speakerName: string;
  geminiVoice: 'Fenrir' | 'Zephyr' | 'Puck' | 'Kore';
}

/**
 * Identifica formalmente o atendente com base na transcrição falada ou ramal de destino
 */
export function detectSpeakerPersona(text: string, destination?: string): DetectedSpeakerInfo {
  const lower = (text || '').toLowerCase();
  const dest = (destination || '').toLowerCase();

  // Roberto Mendes (Suporte Técnico N1/N2, NOC, Ramal 4102)
  if (
    lower.includes('roberto falando') ||
    lower.includes('roberto mendes') ||
    lower.includes('aqui é o roberto') ||
    lower.includes('sou o roberto') ||
    lower.includes('roberto do suporte') ||
    dest.includes('4102') ||
    dest.includes('roberto')
  ) {
    return {
      gender: 'male',
      persona: 'roberto',
      speakerName: 'Roberto Mendes (Voz Masculina • Suporte N1)',
      geminiVoice: 'Fenrir',
    };
  }

  // Carlos Silva (Central Telefônica, Ramal 4101)
  if (
    lower.includes('carlos falando') ||
    lower.includes('carlos silva') ||
    lower.includes('aqui é o carlos') ||
    lower.includes('sou o carlos') ||
    dest.includes('4101') ||
    dest.includes('carlos')
  ) {
    return {
      gender: 'male',
      persona: 'carlos',
      speakerName: 'Carlos Silva (Voz Masculina • Central)',
      geminiVoice: 'Puck',
    };
  }

  // Mariana Costa (Comercial, Ramal 4103)
  if (
    lower.includes('mariana falando') ||
    lower.includes('mariana costa') ||
    dest.includes('4103') ||
    dest.includes('mariana')
  ) {
    return {
      gender: 'female',
      persona: 'mariana',
      speakerName: 'Mariana Costa (Voz Feminina • Comercial)',
      geminiVoice: 'Zephyr',
    };
  }

  // Renata Lima (Financeiro, Ramal 4201)
  if (
    lower.includes('renata falando') ||
    lower.includes('renata lima') ||
    dest.includes('4201') ||
    dest.includes('renata')
  ) {
    return {
      gender: 'female',
      persona: 'renata',
      speakerName: 'Renata Lima (Voz Feminina • Financeiro)',
      geminiVoice: 'Kore',
    };
  }

  // Outros marcadores masculinos
  if (
    lower.includes('especialista masculino') ||
    lower.includes('atendente masculino') ||
    lower.includes('lucas falando')
  ) {
    return {
      gender: 'male',
      persona: 'roberto',
      speakerName: 'Atendente Técnico (Voz Masculina)',
      geminiVoice: 'Fenrir',
    };
  }

  // Padrão: MaIA 24/7
  return {
    gender: 'female',
    persona: 'maia',
    speakerName: 'MaIA (Voz Feminina • Assistente Virtual 24/7)',
    geminiVoice: 'Zephyr',
  };
}

/**
 * Busca a melhor voz do sistema para o gênero e idioma solicitados.
 */
export function findBestVoice(gender: 'male' | 'female'): {
  voice: SpeechSynthesisVoice | null;
  isNativeGenderMatched: boolean;
} {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, isNativeGenderMatched: false };
  }

  const allVoices = window.speechSynthesis.getVoices().length > 0
    ? window.speechSynthesis.getVoices()
    : cachedVoices;

  if (allVoices.length === 0) {
    return { voice: null, isNativeGenderMatched: false };
  }

  // Filtra primeiro vozes em português brasileiro (pt-BR ou pt)
  const ptVoices = allVoices.filter(
    (v) => v.lang.toLowerCase().includes('pt-br') || v.lang.toLowerCase().startsWith('pt')
  );

  const candidatePool = ptVoices.length > 0 ? ptVoices : allVoices;

  const maleNames = [
    'antonio',
    'daniel',
    'felipe',
    'jorge',
    'ricardo',
    'carlos',
    'male',
    'homem',
    'standard-b',
    'wavenet-b',
    'neural2-b',
    'standard-d',
    'wavenet-d',
    'neural2-d',
  ];

  const femaleNames = [
    'francisca',
    'thalita',
    'maria',
    'luciana',
    'leticia',
    'fernanda',
    'vitória',
    'vitoria',
    'zira',
    'female',
    'mulher',
    'standard-a',
    'wavenet-a',
    'neural2-a',
    'standard-c',
  ];

  if (gender === 'male') {
    // Procura voz masculina explícita
    const maleVoice = candidatePool.find((v) => {
      const name = v.name.toLowerCase();
      return maleNames.some((m) => name.includes(m));
    });

    if (maleVoice) {
      return { voice: maleVoice, isNativeGenderMatched: true };
    }

    // Se não encontrou nome masculino explícito, tenta qualquer voz pt-BR
    // que não tenha palavras claramente femininas
    const neutralOrPt = candidatePool.find((v) => {
      const name = v.name.toLowerCase();
      return !femaleNames.some((f) => name.includes(f));
    });

    if (neutralOrPt) {
      return { voice: neutralOrPt, isNativeGenderMatched: false };
    }

    // Fallback: pega a primeira voz pt disponível (será modulada via pitch)
    return { voice: candidatePool[0] || null, isNativeGenderMatched: false };
  } else {
    // Procura voz feminina
    const femaleVoice = candidatePool.find((v) => {
      const name = v.name.toLowerCase();
      return femaleNames.some((f) => name.includes(f));
    });

    if (femaleVoice) {
      return { voice: femaleVoice, isNativeGenderMatched: true };
    }

    return { voice: candidatePool[0] || null, isNativeGenderMatched: true };
  }
}

/**
 * Fala o texto com humanização e adequação estrita de gênero.
 */
export function speakHumanized(text: string, options: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (options.onEnd) options.onEnd();
    return null;
  }

  // Cancela qualquer fala em andamento imediatamente (barge-in / anti-overlap)
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignorado
  }

  const cleanText = humanizeSpeechText(text);
  if (!cleanText) {
    if (options.onEnd) options.onEnd();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'pt-BR';

  // Determina gênero
  let targetGender: 'male' | 'female';
  if (options.gender === 'male' || options.gender === 'female') {
    targetGender = options.gender;
  } else {
    targetGender = detectVoiceGender(text, options.persona, 'female');
  }

  const { voice, isNativeGenderMatched } = findBestVoice(targetGender);
  if (voice) {
    utterance.voice = voice;
  }

  // Configuração acústica de entonação e velocidade:
  // - Evita o tom mecânico e acelerado (taxa 1.05+ é robótica em pt-BR)
  // - Aplica modulação de tom para garantir fidelidade de gênero
  if (targetGender === 'male') {
    if (isNativeGenderMatched) {
      // Voz masculina nativa: tom encorpado e cadência natural
      utterance.pitch = options.pitch ?? 0.94;
      utterance.rate = options.rate ?? 0.96;
    } else {
      // Se o navegador só possui voz padrão/feminina:
      // O pitch 0.74 desloca a frequência fundamental para a região barítona masculina (115-130Hz)
      // eliminando completamente o som agudo/feminino e soando como Roberto!
      utterance.pitch = options.pitch ?? 0.74;
      utterance.rate = options.rate ?? 0.93;
    }
  } else {
    // Voz feminina (MaIA, Mariana, Renata, URA)
    utterance.pitch = options.pitch ?? 1.03;
    utterance.rate = options.rate ?? 0.98;
  }

  utterance.onstart = () => {
    if (options.onStart) options.onStart();
  };

  utterance.onend = () => {
    if (options.onEnd) options.onEnd();
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis error:', e);
    if (options.onError) options.onError(e);
    if (options.onEnd) options.onEnd();
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Falha ao acionar speechSynthesis:', err);
    if (options.onError) options.onError(err);
    if (options.onEnd) options.onEnd();
  }

  return utterance;
}

/**
 * Interrompe qualquer reprodução de voz ativa (Gemini áudio ou Web Speech API).
 */
let activeAudioElement: HTMLAudioElement | null = null;

export function stopAnyVoice(): void {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {
      // Ignora
    }
    activeAudioElement = null;
  }
  stopSpeaking();
}

/**
 * Reproduz voz de altíssima qualidade utilizando prioritariamente o Gemini TTS (WAV 24kHz)
 * com fallback imediato para o motor local humanizado Web Speech API.
 */
export async function playStudioOrWebVoice(
  text: string,
  options: SpeakOptions & {
    voiceName?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (e: unknown) => void;
  } = {}
): Promise<void> {
  stopAnyVoice();

  const detected = detectSpeakerPersona(text);
  const targetGender = options.gender && options.gender !== 'auto' ? options.gender : detected.gender;
  const targetVoice = options.voiceName || (targetGender === 'male' ? 'Fenrir' : 'Zephyr');

  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('enlace_jwt_token') : null;
    const res = await fetch('/api/v1/ai/preview-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        text,
        voiceGender: targetGender,
        voice: targetVoice,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        activeAudioElement = audio;
        if (options.onStart) options.onStart();

        audio.onended = () => {
          activeAudioElement = null;
          if (options.onEnd) options.onEnd();
        };

        audio.onerror = (e) => {
          activeAudioElement = null;
          console.warn('Erro ao reproduzir áudio Gemini, usando fallback Web Speech:', e);
          speakHumanized(text, { ...options, gender: targetGender });
        };

        await audio.play();
        return;
      }
    }
  } catch (err) {
    console.warn('Falha na requisição de voz de estúdio Gemini, aplicando fallback local:', err);
  }

  // Fallback para Web Speech API local humanizada
  speakHumanized(text, {
    ...options,
    gender: targetGender,
    persona: options.persona || detected.persona,
  });
}

/**
 * Interrompe qualquer reprodução de voz ativa.
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignora
    }
  }
}
