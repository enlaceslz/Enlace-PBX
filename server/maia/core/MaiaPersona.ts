/**
 * MaiaPersona — Definição de Personas e Vozes Cognitivas da MaIA
 * Alinhado às diretrizes do Português Brasileiro (pt-BR) e telefonia em tempo real
 */

export interface MaiaVoiceProfile {
  name: string;
  gender: 'male' | 'female';
  label: string;
  timbre: string;
  recommendedFor: string;
  pitchMultiplier: number;
  rateMultiplier: number;
}

export const MAIA_VOICE_PROFILES: Record<string, MaiaVoiceProfile> = {
  Zephyr: {
    name: 'Zephyr',
    gender: 'female',
    label: 'Zephyr (Feminina Equilibrada / Natural)',
    timbre: 'Soprano suave, fluida, acolhedora e expressiva',
    recommendedFor: 'MaIA — Atendimento & Triagem Geral 24/7',
    pitchMultiplier: 1.04,
    rateMultiplier: 0.98,
  },
  Kore: {
    name: 'Kore',
    gender: 'female',
    label: 'Kore (Feminina Calma / Empática)',
    timbre: 'Mezzo-soprano paciente, articulação cristalina e calorosa',
    recommendedFor: 'Ouvidoria, SAC e Atendimento Humanizado',
    pitchMultiplier: 1.02,
    rateMultiplier: 0.96,
  },
  Aoede: {
    name: 'Aoede',
    gender: 'female',
    label: 'Aoede (Feminina Melódica / Comercial)',
    timbre: 'Luminosa, melódica, calorosa e engajadora',
    recommendedFor: 'Vendas, Planos Corporativos e Negociações',
    pitchMultiplier: 1.06,
    rateMultiplier: 0.99,
  },
  Fenrir: {
    name: 'Fenrir',
    gender: 'male',
    label: 'Fenrir (Masculina Encorpada / Grave)',
    timbre: 'Barítono firme, tom acolhedor, grave e seguro',
    recommendedFor: 'NOC, Suporte N1/N2 Especializado e Roberto Mendes',
    pitchMultiplier: 0.88,
    rateMultiplier: 0.95,
  },
  Puck: {
    name: 'Puck',
    gender: 'male',
    label: 'Puck (Masculina Dinâmica)',
    timbre: 'Tenor ágil, jovem, ritmo moderno e conversacional assertivo',
    recommendedFor: 'Diagnóstico Ágil, Pré-vendas e SDR Técnico',
    pitchMultiplier: 0.94,
    rateMultiplier: 0.97,
  },
  Charon: {
    name: 'Charon',
    gender: 'male',
    label: 'Charon (Masculina Sóbria / Institucional)',
    timbre: 'Maduro, sóbrio, cadência pausada e autoridade serena',
    recommendedFor: 'Central Corporativa, Compliance e Cobrança Institucional',
    pitchMultiplier: 0.86,
    rateMultiplier: 0.93,
  },
};

export class MaiaPersona {
  public static resolveVoice(agent: {
    name?: string;
    voice?: string;
    voiceGender?: 'male' | 'female';
    avatarType?: string;
  }): {
    voiceName: string;
    gender: 'male' | 'female';
    avatarType: string;
    pitchMultiplier: number;
    rateMultiplier: number;
    timbre: string;
    guidancePrompt: string;
  } {
    let gender: 'male' | 'female' = agent.voiceGender || 'female';
    if (!agent.voiceGender && agent.name) {
      const lower = agent.name.toLowerCase();
      if (
        lower.includes('roberto') ||
        lower.includes('carlos') ||
        lower.includes('lucas') ||
        lower.includes('mendes') ||
        lower.includes('masculino')
      ) {
        gender = 'male';
      }
    }

    const maleVoices = ['Fenrir', 'Puck', 'Charon'];
    const femaleVoices = ['Zephyr', 'Kore', 'Aoede'];

    let resolvedVoice = agent.voice || (gender === 'male' ? 'Fenrir' : 'Zephyr');
    if (gender === 'male' && !maleVoices.includes(resolvedVoice)) {
      resolvedVoice = 'Fenrir';
    } else if (gender === 'female' && !femaleVoices.includes(resolvedVoice)) {
      resolvedVoice = 'Zephyr';
    }

    const profile = MAIA_VOICE_PROFILES[resolvedVoice] || {
      name: resolvedVoice,
      gender,
      label: resolvedVoice,
      timbre: gender === 'male' ? 'Barítono encorpado e acolhedor' : 'Soprano suave e expressiva',
      recommendedFor: 'Atendimento Geral',
      pitchMultiplier: gender === 'male' ? 0.88 : 1.04,
      rateMultiplier: gender === 'male' ? 0.95 : 0.98,
    };

    const avatarType = agent.avatarType || (gender === 'male' ? 'male_tech' : 'female_ai');
    const speakerName = (agent.name || (gender === 'male' ? 'Roberto Mendes' : 'MaIA')).split('—')[0].trim();

    const guidancePrompt =
      gender === 'male'
        ? `DIRETRIZ DE VOZ MASCULINA HUMANIZADA:
- Você é ${speakerName}, especialista de atendimento e suporte técnico da Enlace Telecom.
- Fale com voz masculina segura, firme, acolhedora e natural (timbre: ${profile.timbre}).
- Evite entonação mecânica, tom robótico ou monotonia. Cada resposta deve ter entre 1 e 3 frases curtas e objetivas em português do Brasil.`
        : `DIRETRIZ DE VOZ FEMININA HUMANIZADA:
- Você é ${speakerName}, assistente virtual de inteligência artificial da Enlace Telecom.
- Fale com voz feminina clara, fluida, empática e expressiva (timbre: ${profile.timbre}).
- Evite tom robótico ou frio. Cada resposta deve ter entre 1 e 3 frases curtas e objetivas em português do Brasil.`;

    return {
      voiceName: resolvedVoice,
      gender,
      avatarType,
      pitchMultiplier: profile.pitchMultiplier,
      rateMultiplier: profile.rateMultiplier,
      timbre: profile.timbre,
      guidancePrompt,
    };
  }
}
