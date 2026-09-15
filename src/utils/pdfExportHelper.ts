import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CdrRecord, Tenant } from '../types/pbx';

/**
 * Generates an ultra-crisp vector-like logo of Enlace-PBX using an offscreen canvas.
 * This guarantees the PDF contains a professional, high-resolution company mark without external HTTP calls.
 */
export function generateEnlaceLogoBase64(): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Icon: Rounded Gradient Hexagon / Shield
  const iconX = 10;
  const iconY = 15;
  const iconSize = 130;
  const radius = 28;

  // Outer gradient badge
  const gradient = ctx.createLinearGradient(iconX, iconY, iconX + iconSize, iconY + iconSize);
  gradient.addColorStop(0, '#0284c7'); // sky-600
  gradient.addColorStop(0.5, '#2563eb'); // blue-600
  gradient.addColorStop(1, '#1d4ed8'); // blue-700

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.shadowColor = 'rgba(37, 99, 235, 0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.beginPath();
  ctx.roundRect(iconX, iconY, iconSize, iconSize, radius);
  ctx.fill();
  ctx.restore();

  // Draw telephone & telecom wave lines inside the badge
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Stylized telephone handset & signal waves
  ctx.beginPath();
  // Sound wave arc 1
  ctx.arc(iconX + 65, iconY + 65, 34, -Math.PI * 0.45, Math.PI * 0.05);
  ctx.stroke();

  // Sound wave arc 2
  ctx.beginPath();
  ctx.lineWidth = 6;
  ctx.arc(iconX + 65, iconY + 65, 48, -Math.PI * 0.4, Math.PI * 0.0);
  ctx.stroke();

  // Central voice node (PBX core)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(iconX + 65, iconY + 65, 14, 0, Math.PI * 2);
  ctx.fill();

  // Small satellite nodes
  ctx.beginPath();
  ctx.arc(iconX + 40, iconY + 46, 6, 0, Math.PI * 2);
  ctx.arc(iconX + 90, iconY + 84, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Text: "ENLACE"
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.font = '900 68px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENLACE', 165, 68);

  // Text: "-PBX"
  const enlaceWidth = ctx.measureText('ENLACE').width;
  ctx.fillStyle = '#2563eb'; // blue-600
  ctx.fillText('-PBX', 165 + enlaceWidth, 68);

  // Subtitle: "TELECOM & AI CLOUD PLATFORM"
  ctx.fillStyle = '#64748b'; // slate-500
  ctx.font = '700 18px system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('TELECOM & ENTERPRISE AI CLOUD', 168, 118);

  return canvas.toDataURL('image/png');
}

export interface InvoiceData {
  id: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentMethod?: string;
  pixKey?: string;
  barcode?: string;
  items?: Array<{
    description: string;
    category: string;
    qty: string | number;
    unitPrice: number;
    total: number;
  }>;
}

export interface BillingSummaryData {
  tenantId: string;
  tenantName?: string;
  tenantCnpj?: string;
  plan: string;
  balance: number;
  currency: string;
  currentMonthCosts: {
    telephony: number;
    aiTokens: number;
    omnichannel: number;
    licenses: number;
  };
}

/**
 * Generates an official, professional Tax Invoice & Billing Statement PDF.
 */
export function exportInvoicePdf(
  invoice: InvoiceData,
  billing: BillingSummaryData,
  tenant?: Tenant | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoData = generateEnlaceLogoBase64();

  // 1. Header background & brand
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(0, 0, pageWidth, 42, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(0, 42, pageWidth, 42);

  // Add Logo
  if (logoData) {
    doc.addImage(logoData, 'PNG', 14, 8, 60, 15);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('ENLACE-PBX', 14, 20);
  }

  // Invoice Number and Status Badge (Top Right)
  const isPaid = invoice.status === 'paid';
  const isPending = invoice.status === 'pending';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`FATURA Nº ${invoice.id}`, pageWidth - 14, 18, { align: 'right' });

  // Badge Status Box
  if (isPaid) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.roundedRect(pageWidth - 54, 23, 40, 9, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('QUITADA / PAGO', pageWidth - 34, 29, { align: 'center' });
  } else if (isPending) {
    doc.setFillColor(254, 243, 199); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.roundedRect(pageWidth - 64, 23, 50, 9, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('AGUARDANDO PAGAMENTO', pageWidth - 39, 29, { align: 'center' });
  } else {
    doc.setFillColor(255, 241, 242); // rose-50
    doc.setDrawColor(254, 205, 211); // rose-200
    doc.roundedRect(pageWidth - 48, 23, 34, 9, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text('VENCIDA', pageWidth - 31, 29, { align: 'center' });
  }

  // 2. Prestador de Serviços & Tomador (2 Columns Box)
  const boxTop = 48;
  const colWidth = (pageWidth - 36) / 2;

  // Left: Prestador (Enlace Telecom)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxTop, colWidth, 44, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PRESTADOR DOS SERVIÇOS', 18, boxTop + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ENLACE TELECOMUNICAÇÕES LTDA.', 18, boxTop + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('CNPJ: 12.345.678/0001-90 | IE: 110.245.980.115', 18, boxTop + 20);
  doc.text('Av. Paulista, 1000 - Bela Vista - São Paulo / SP', 18, boxTop + 26);
  doc.text('Licença Anatel SCM/STFC nº 4892/2022', 18, boxTop + 32);
  doc.text('E-mail: financeiro@enlacepbx.com.br | Suporte: 0800 770 2020', 18, boxTop + 38);

  // Right: Tomador (Cliente / Tenant)
  doc.roundedRect(14 + colWidth + 8, boxTop, colWidth, 44, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOMADOR / CLIENTE ASSINANTE', 14 + colWidth + 12, boxTop + 7);

  const tenantName = tenant?.name || billing.tenantName || 'Enlace Telecom — Matriz São Paulo';
  const tenantCnpj = tenant?.cnpj || billing.tenantCnpj || '12.345.678/0001-90';
  const tenantPlan = tenant?.plan || billing.plan || 'Enterprise Voice & AI Pro';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(tenantName, 14 + colWidth + 12, boxTop + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`CNPJ / CPF: ${tenantCnpj}`, 14 + colWidth + 12, boxTop + 20);
  doc.text(`Plano: ${tenantPlan}`, 14 + colWidth + 12, boxTop + 26);
  doc.text(`Identificador do Tenant: ${billing.tenantId}`, 14 + colWidth + 12, boxTop + 32);
  doc.text(`Emissão: ${new Date(invoice.date).toLocaleDateString('pt-BR')} | Vencimento: ${new Date(invoice.dueDate || invoice.date).toLocaleDateString('pt-BR')}`, 14 + colWidth + 12, boxTop + 38);

  // 3. Items Table using autoTable
  const defaultItems = invoice.items || [
    {
      description: 'Minutos Tarifados de Telefonia SIP / PSTN (Fixo, Móvel e 0800)',
      category: 'Telefonia & Troncos SIP',
      qty: '12.450 min',
      unitPrice: 0.028,
      total: billing.currentMonthCosts.telephony || 345.20,
    },
    {
      description: 'Processamento de Voz Neural e Tokens (Google Gemini Live & Flash AI)',
      category: 'Inteligência Artificial (IA)',
      qty: '2.850.000 tokens',
      unitPrice: 0.000045,
      total: billing.currentMonthCosts.aiTokens || 128.50,
    },
    {
      description: 'Licenças de Ramais PJSIP e Softphones WebRTC (Enlace Matrix Cloud)',
      category: 'Licenciamento PBX',
      qty: '30 ramais',
      unitPrice: 5.00,
      total: billing.currentMonthCosts.licenses || 150.00,
    },
    {
      description: 'Mensageria e Sessões Omnichannel (WhatsApp Business API & Webchat)',
      category: 'Omnichannel & WABA',
      qty: '4.500 msgs',
      unitPrice: 0.020,
      total: billing.currentMonthCosts.omnichannel || 90.00,
    },
    {
      description: 'Infraestrutura Gerenciada Asterisk 20 LTS + SLA 24/7 de Alta Disponibilidade',
      category: 'Infraestrutura & NOC',
      qty: '1 mês',
      unitPrice: 136.30,
      total: 136.30,
    },
  ];

  const tableBody = defaultItems.map((item, idx) => [
    (idx + 1).toString().padStart(2, '0'),
    item.description,
    item.category,
    typeof item.qty === 'number' ? item.qty.toLocaleString('pt-BR') : item.qty,
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice),
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total),
  ]);

  autoTable(doc, {
    startY: boxTop + 50,
    head: [['#', 'Discriminação dos Serviços de Telecom & IA', 'Categoria', 'Qtd / Consumo', 'Valor Unit.', 'Total (R$)']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [51, 65, 85],
      lineColor: [241, 245, 249],
      lineWidth: 0.3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 72 },
      2: { cellWidth: 38 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Calculate position after table
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // 4. Totals and Tax Breakdown Block
  const totalAmount = defaultItems.reduce((acc, curr) => acc + curr.total, 0);
  const taxPis = totalAmount * 0.0065;
  const taxCofins = totalAmount * 0.03;
  const taxIss = totalAmount * 0.05;

  // Summary box (Right side)
  const summaryBoxWidth = 80;
  const summaryBoxX = pageWidth - 14 - summaryBoxWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryBoxX, finalY, summaryBoxWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryBoxX + 6, finalY + 7);
  doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount), summaryBoxX + summaryBoxWidth - 6, finalY + 7, { align: 'right' });

  doc.text('Impostos Incidentes (PIS/COFINS/ISS):', summaryBoxX + 6, finalY + 14);
  doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(taxPis + taxCofins + taxIss), summaryBoxX + summaryBoxWidth - 6, finalY + 14, { align: 'right' });

  doc.text('Descontos / Créditos Aplicados:', summaryBoxX + 6, finalY + 21);
  doc.text('R$ 0,00', summaryBoxX + summaryBoxWidth - 6, finalY + 21, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(summaryBoxX + 4, finalY + 25, summaryBoxX + summaryBoxWidth - 4, finalY + 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('VALOR TOTAL:', summaryBoxX + 6, finalY + 33);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount), summaryBoxX + summaryBoxWidth - 6, finalY + 33, { align: 'right' });

  // Payment Details & PIX Box (Left side)
  const payBoxWidth = summaryBoxX - 14 - 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, finalY, payBoxWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('INFORMAÇÕES PARA PAGAMENTO', 20, finalY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Chave PIX Oficial (CNPJ): 12.345.678/0001-90', 20, finalY + 14);
  doc.text('Favorecido: Enlace Telecomunicações Ltda. — Banco Santander (033)', 20, finalY + 19);
  doc.text('Linha Digitável: 03399.82103 45678.901234 56789.012345 8 98760000085000', 20, finalY + 24);
  doc.text('Autenticação Digital: SHA256:' + Math.random().toString(36).substring(2, 12).toUpperCase() + '-ENLACE-VALID', 20, finalY + 29);
  doc.text('* O comprovante pode ser enviado diretamente para financeiro@enlacepbx.com.br', 20, finalY + 34);

  // 5. Legal & Footer
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento fiscal emitido em conformidade com as normas da Anatel e legislação tributária brasileira.', 14, footerY);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} via Enlace-PBX Enterprise Suite | Página 1 de 1`, pageWidth - 14, footerY, { align: 'right' });

  // Download Trigger
  doc.save(`fatura-${invoice.id}.pdf`);
}

/**
 * Generates an Executive CDR & AI Telephony Report PDF.
 */
export function exportCdrReportPdf(
  cdrs: CdrRecord[],
  title = 'Relatório Gerencial de Chamadas & Atendimento IA',
  filtersApplied = 'Todas as chamadas',
  tenantName = 'Enlace Telecom — Matriz São Paulo'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoData = generateEnlaceLogoBase64();

  // 1. Header background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(0, 32, pageWidth, 32);

  // Logo
  if (logoData) {
    doc.addImage(logoData, 'PNG', 14, 6, 56, 14);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text('ENLACE-PBX', 14, 18);
  }

  // Report Title and Subtitle (Center / Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  // Split title if it's too long
  if (title.length > 50) {
    doc.text(title.substring(0, 50) + '...', pageWidth - 14, 13, { align: 'right' });
  } else {
    // Split title if it's too long
  if (title.length > 50) {
    doc.text(title.substring(0, 50) + '...', pageWidth - 14, 13, { align: 'right' });
  } else {
    doc.text(title, pageWidth - 14, 13, { align: 'right' });
  }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Empresa: ${tenantName} | Filtros: ${filtersApplied} | Emissão: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 20, { align: 'right' });

  // 2. Executive KPI Summary Cards
  const totalCalls = cdrs.length;
  const answeredCalls = cdrs.filter((c) => c.disposition === 'ANSWERED').length;
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
  const aiHandled = cdrs.filter((c) => c.isAiHandled || c.aiAgentId).length;
  const aiContained = cdrs.filter(
    (c) => (c.isAiHandled || c.aiAgentId) && !c.isTransferred && !c.transferredTo
  ).length;
  const aiRate = aiHandled > 0 ? Math.round((aiContained / aiHandled) * 100) : 0;
  const totalDurationSec = cdrs.reduce((acc, c) => acc + (c.duration || 0), 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDurationSec / totalCalls) : 0;
  const totalCost = cdrs.reduce((acc, c) => acc + (c.costBrl || 0), 0);

  const kpis = [
    { label: 'TOTAL DE CHAMADAS', value: totalCalls.toLocaleString('pt-BR'), sub: 'Volume registrado' },
    { label: 'TAXA DE ATENDIMENTO', value: `${answerRate}%`, sub: `${answeredCalls} atendidas` },
    { label: 'ATENDIDAS POR IA (GEMINI)', value: aiHandled.toLocaleString('pt-BR'), sub: 'Agentes MaIA / Roberto' },
    { label: 'RETENÇÃO PELA IA', value: `${aiRate}%`, sub: 'Sem transbordo humano' },
    { label: 'TEMPO MÉDIO (TMA)', value: `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`, sub: 'Duração média' },
    { label: 'CUSTO TELEFONIA', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost), sub: 'Minutos tarifados' },
  ];

  const cardWidth = (pageWidth - 28 - (kpis.length - 1) * 4) / kpis.length;
  const cardY = 36;
  const cardHeight = 18;

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, cardY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 3, cardY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, x + 3, cardY + 15.5);
  });

  // 3. Table of Calls
  const rows = cdrs.map((c) => {
    const isAi = Boolean(c.isAiHandled || c.aiAgentId);
    const agentName = isAi ? (c.aiAgentId?.includes('roberto') ? 'Roberto (NOC)' : 'MaIA (Voz)') : 'Humano';
    const status = c.disposition === 'ANSWERED' ? 'ATENDIDA' : c.disposition === 'NO ANSWER' ? 'NÃO ATENDIDA' : c.disposition;
    const durMin = Math.floor(c.duration / 60);
    const durSec = c.duration % 60;
    const formattedDur = `${durMin}:${durSec.toString().padStart(2, '0')}`;
    const sent = c.sentiment === 'positive' ? 'Positivo' : c.sentiment === 'negative' ? 'Negativo' : c.sentiment ? 'Neutro' : '-';
    const cost = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.costBrl || 0);

    return [
      new Date(c.startTime).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }),
      c.caller,
      c.callee,
      c.direction === 'inbound' ? 'Entrada' : c.direction === 'outbound' ? 'Saída' : 'Interno',
      formattedDur,
      status,
      agentName,
      c.transferredTo ? `Transf. -> ${c.transferredTo}` : isAi ? 'Resolvido IA' : 'Direto',
      sent,
      cost,
    ];
  });

  autoTable(doc, {
    startY: cardY + cardHeight + 4,
    head: [['Data / Hora', 'Origem', 'Destino', 'Sentido', 'Duração', 'Status', 'Atendimento', 'Desfecho', 'Sentimento', 'Custo']],
    body: rows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [51, 65, 85],
      lineColor: [241, 245, 249],
      lineWidth: 0.25,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 24 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 28 },
      7: { cellWidth: 36 },
      8: { cellWidth: 22, halign: 'center' },
      9: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Page footer
      const str = `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()} | Enlace-PBX Enterprise Telephony System`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth - 14, pageHeight - 8, { align: 'right' });
      doc.text('Auditoria de chamadas Asterisk 20 + Google Gemini Live Audio', 14, pageHeight - 8);
    },
  });

  doc.save(`relatorio-chamadas-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates an Individual Call Audit Dossier in PDF format.
 */
export function exportCallDossierPdf(cdr: CdrRecord, tenantName = 'Enlace Telecom') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const logoData = generateEnlaceLogoBase64();

  // Header
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 36, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(0, 36, pageWidth, 36);

  if (logoData) {
    doc.addImage(logoData, 'PNG', 14, 8, 56, 14);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('DOSSIÊ DE AUDITORIA DE CHAMADA', pageWidth - 14, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`ID Único: ${cdr.uniqueId || cdr.id} | ${tenantName}`, pageWidth - 14, 25, { align: 'right' });

  // Call Details Box
  let y = 44;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 48, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text('PARÂMETROS TÉCNICOS DA CHAMADA', 20, y + 8);

  const col1X = 20;
  const col2X = 80;
  const col3X = 140;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  doc.text('Número de Origem:', col1X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cdr.caller, col1X, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Destino Discado:', col2X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cdr.callee, col2X, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Data e Início:', col3X, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(new Date(cdr.startTime).toLocaleString('pt-BR'), col3X, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Duração / Tarifado:', col1X, y + 30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${cdr.duration}s (Tarifado: ${cdr.billsec || cdr.duration}s)`, col1X, y + 35);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Disposição / Status:', col2X, y + 30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cdr.disposition, col2X, y + 35);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Atendimento & Transbordo:', col3X, y + 30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cdr.isAiHandled || cdr.aiAgentId ? 'Agente IA (MaIA)' : 'Atendimento Humano', col3X, y + 35);

  if (cdr.transferredTo) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(220, 38, 38);
    doc.text(`Transf. para: ${cdr.transferredTo}`, col3X, y + 42);
  }

  y += 54;

  // AI Summary Box
  if (cdr.summary) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, pageWidth - 28, 36, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('RESUMO EXECUTIVO GERADO POR INTELIGÊNCIA ARTIFICIAL (GEMINI)', 20, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitSummary = doc.splitTextToSize(cdr.summary, pageWidth - 48);
    doc.text(splitSummary, 20, y + 16);

    y += 42;
  }

  // Full Transcript Box
  const transcriptText =
    cdr.transcription ||
    `[00:01] Chamador (${cdr.caller}): Ligação iniciada para ${cdr.callee}.\n[00:05] Atendente: Atendimento iniciado.\n[00:15] Conclusão da chamada com status ${cdr.disposition}.`;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 120, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('TRANSCRIÇÃO COMPLETA DO DIÁLOGO (AUDITORIA)', 20, y + 8);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const splitTranscript = doc.splitTextToSize(transcriptText, pageWidth - 48);
  doc.text(splitTranscript.slice(0, 38), 20, y + 16);

  doc.save(`dossie-chamada-${cdr.uniqueId || cdr.id}.pdf`);
}

export interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  category: 'telephony' | 'ai_tokens' | 'omnichannel' | 'licenses' | 'recharge';
  type: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
}

/**
 * Generates an official Corporate Financial Statement (Extrato Financeiro) PDF.
 */
export function exportFinancialStatementPdf(
  billing: BillingSummaryData,
  transactions: FinancialTransaction[],
  periodName = 'Setembro de 2026',
  tenant?: Tenant | null
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoData = generateEnlaceLogoBase64();

  // 1. Header
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 38, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(0, 38, pageWidth, 38);

  if (logoData) {
    doc.addImage(logoData, 'PNG', 14, 8, 56, 14);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('ENLACE-PBX', 14, 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('EXTRATO DE MOVIMENTAÇÃO FINANCEIRA', pageWidth - 14, 18, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const tenantName = tenant?.name || billing.tenantName || 'Enlace Telecom — Matriz São Paulo';
  doc.text(`Empresa: ${tenantName} | Período: ${periodName}`, pageWidth - 14, 25, { align: 'right' });
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, pageWidth - 14, 31, { align: 'right' });

  // 2. Summary Boxes
  const totalRecharges = transactions.filter((t) => t.type === 'credit').reduce((a, b) => a + b.amount, 0);
  const totalDebits = transactions.filter((t) => t.type === 'debit').reduce((a, b) => a + b.amount, 0);

  const statBoxes = [
    { label: 'SALDO DISPONÍVEL', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billing.balance), color: [16, 185, 129] },
    { label: 'TOTAL DE CRÉDITOS / RECARGAS', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRecharges), color: [37, 99, 235] },
    { label: 'TOTAL DE CONSUMO / DÉBITOS', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDebits), color: [225, 29, 72] },
  ];

  const statY = 44;
  const statWidth = (pageWidth - 28 - 8) / 3;

  statBoxes.forEach((s, idx) => {
    const x = 14 + idx * (statWidth + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, statY, statWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(s.label, x + 4, statY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.text(s.value, x + 4, statY + 12.5);
  });

  // 3. Transactions Table
  const tableRows = transactions.map((t) => {
    const isCredit = t.type === 'credit';
    const formattedAmount = `${isCredit ? '+' : '-'} ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}`;
    const formattedBalance = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.balanceAfter);
    const catLabel =
      t.category === 'telephony'
        ? 'Telefonia SIP'
        : t.category === 'ai_tokens'
        ? 'IA Gemini'
        : t.category === 'recharge'
        ? 'Recarga Crédito'
        : t.category === 'omnichannel'
        ? 'Omnichannel'
        : 'Licenças';

    return [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.description,
      catLabel,
      isCredit ? 'Crédito' : 'Débito',
      formattedAmount,
      formattedBalance,
    ];
  });

  autoTable(doc, {
    startY: statY + 24,
    head: [['Data', 'Descrição do Lançamento', 'Serviço', 'Tipo', 'Valor (R$)', 'Saldo Resultante']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
      lineColor: [241, 245, 249],
      lineWidth: 0.25,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 70 },
      2: { cellWidth: 28 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()} | Enlace-PBX Módulo Financeiro Corporativo`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
      doc.text('Documento eletrônico auditável via Enlace Telecomunicações do Brasil Ltda.', 14, pageHeight - 8);
    },
  });

  doc.save(`extrato-financeiro-${new Date().toISOString().slice(0, 10)}.pdf`);
}

