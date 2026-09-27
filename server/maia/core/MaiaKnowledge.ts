/**
 * MaiaKnowledge — Gestão e Grounding da Base de Conhecimento RAG
 * Trata documentos como fontes de dados não-privilegiadas e classifica por autoridade
 */

export interface KnowledgeItem {
  id: string;
  tenantId: string;
  sourceId?: string;
  sourceType: 'document' | 'official_manual' | 'internal_policy' | 'faq';
  title: string;
  category: string;
  content: string;
  version: string;
  classification: 'OFFICIAL' | 'INTERNAL' | 'PUBLIC';
  createdAt?: string;
  updatedAt: string;
  expiresAt?: string;
}

export class MaiaKnowledge {
  /**
   * Formata os trechos de conhecimento garantindo que o modelo os trate como dados externos e não regras
   */
  public static formatKnowledgeGrounding(items: KnowledgeItem[]): string[] {
    const now = new Date();

    return items
      .filter((item) => {
        // Ignora documentos expirados
        if (item.expiresAt) {
          const exp = new Date(item.expiresAt);
          if (exp < now) return false;
        }
        return true;
      })
      .map((item) => {
        const sourceLabel = item.classification === 'OFFICIAL'
          ? 'FONTE OFICIAL HOMOLOGADA'
          : item.classification === 'INTERNAL'
          ? 'DOCUMENTO INTERNO'
          : 'INFORMAÇÃO PÚBLICA';

        return `[${sourceLabel}: ${item.title} | Cat: ${item.category} | Ver: ${item.version || '1.0'}]
${item.content.trim()}`;
      });
  }
}
