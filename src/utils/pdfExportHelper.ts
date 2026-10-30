import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import type {CdrRecord,Tenant} from '../types/pbx';
import {cdrSample} from './reportData';

export interface InvoiceData {
  id:string;date:string;dueDate:string;amount:number;status:'paid'|'pending'|'overdue';paymentMethod?:string;pixKey?:string;barcode?:string;
  items?:Array<{description:string;category:string;qty:string|number;unitPrice:number;total:number}>;
}
export interface BillingSummaryData {
  tenantId:string;tenantName?:string;tenantCnpj?:string;plan:string;balance:number;currency:string;
  currentMonthCosts:{telephony:number;aiTokens:number;omnichannel:number;licenses:number};
}
export interface FinancialTransaction {
  id:string;date:string;description:string;category:'telephony'|'ai_tokens'|'omnichannel'|'licenses'|'recharge';type:'debit'|'credit';amount:number;balanceAfter:number;
}
const text=(value:unknown)=>(value===undefined||value===null||value===''?'Não informado':String(value)).normalize('NFC').replace(/[\u0100-\u{10ffff}]/gu,char=>`[U+${char.codePointAt(0)!.toString(16).toUpperCase()}]`);
const amount=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'Não informado';
const seconds=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?`${value}s`:'Não informado';
const date=(value:string)=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}):'Não informado';
const fileId=(value:string)=>value.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'registro';
function table(doc:jsPDF,head:string[],body:unknown[][]){
  let y=(doc as any).lastAutoTable?.finalY+7 || 33;
  if(y>doc.internal.pageSize.getHeight()-40){doc.addPage();y=33;}
  autoTable(doc,{startY:y,head:[head],body:body.map(row=>row.map(text)),margin:{top:33,bottom:19,left:14,right:14},
    styles:{font:'helvetica',fontSize:8,cellPadding:3,overflow:'linebreak',textColor:[30,41,59],lineColor:[226,232,240],lineWidth:0.1},
    headStyles:{fillColor:[30,64,110],textColor:[255,255,255],fontSize:8},alternateRowStyles:{fillColor:[248,250,252]},rowPageBreak:'auto'});
}
function finish(doc:jsPDF,title:string){
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    doc.setPage(page);const width=doc.internal.pageSize.getWidth();const height=doc.internal.pageSize.getHeight();
    doc.setTextColor(30,64,110);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('Enlace-PBX',14,14);
    doc.setTextColor(30,41,59);doc.setFontSize(10);doc.text(title,14,23);
    doc.setDrawColor(203,213,225);doc.line(14,27,width-14,27);
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(100,116,139);
    doc.text('Exportação dos dados carregados no painel. Sem certificação fiscal ou de SLA.',14,height-10);
    doc.text('Caracteres fora da fonte são representados por [U+...].',14,height-14);
    doc.text(`${page}/${pages}`,width-14,height-10,{align:'right'});
  }
  return doc;
}
function identity(doc:jsPDF,tenantName?:string){table(doc,['Contexto','Valor'],[['Empresa',tenantName],['Emissão (America/Fortaleza)',date(new Date().toISOString())]]);}

export function createInvoicePdf(invoice:InvoiceData,billing:BillingSummaryData,tenant?:Tenant|null){
  const doc=new jsPDF();identity(doc,tenant?.name||billing.tenantName);
  table(doc,['Campo registrado','Valor'],[['Fatura',invoice.id],['Referência',invoice.date],['Vencimento',invoice.dueDate],['Situação registrada',({paid:'Paga',pending:'Pendente',overdue:'Vencida'})[invoice.status]],['Moeda',billing.currency],['Valor registrado',amount(invoice.amount)],['CNPJ do cliente',tenant?.cnpj||billing.tenantCnpj],['Forma de pagamento registrada',invoice.paymentMethod]]);
  if(invoice.items?.length)table(doc,['Descrição','Categoria','Quantidade','Valor unitário','Total'],invoice.items.map(item=>[item.description,item.category,item.qty,amount(item.unitPrice),amount(item.total)]));
  else table(doc,['Itens'],[['Não há itens detalhados carregados para esta fatura.']]);
  table(doc,['Natureza deste documento'],[['Extrato gerencial da fatura registrada. Não é nota fiscal nem comprovação independente de pagamento. Dados do prestador e instruções de pagamento não são emitidos por este relatório.']]);
  return finish(doc,'Extrato gerencial de fatura');
}
export function exportInvoicePdf(invoice:InvoiceData,billing:BillingSummaryData,tenant?:Tenant|null){createInvoicePdf(invoice,billing,tenant).save(`fatura-${fileId(invoice.id)}.pdf`);}

export function createCdrReportPdf(cdrs:CdrRecord[],filters='Amostra carregada',tenantName?:string){
  const doc=new jsPDF({orientation:'landscape'});identity(doc,tenantName);const sample=cdrSample(cdrs);
  table(doc,['Escopo','Descrição'],[['Filtros informados',filters],['Cobertura','Somente os registros carregados e filtrados no painel; a API lista até 100 CDRs. Não representa necessariamente todo o período.']]);
  table(doc,['Métrica da amostra','Valor'],[['Registros',sample.count],['ANSWERED',sample.answered],['NO ANSWER (não comprova abandono de fila)',sample.noAnswer],['Percentual ANSWERED',sample.answerRate===null?'Sem dados':sample.answerRate+'%'],['Duração média registrada',seconds(sample.durationMean)],['Billsec médio dos registros ANSWERED',seconds(sample.billedAnsweredMean)],['Soma de custos registrados',amount(sample.costTotal)],['Registros com custo informado',`${sample.costCount}/${sample.count}`],['SLA e espera em fila','Não apurados: requerem eventos de fila e metas configuradas.']]);
  table(doc,['ID','Origem','Destino','Início','Duração','Billsec','Status','Agente IA registrado'],cdrs.map(cdr=>[cdr.uniqueId||cdr.id,cdr.caller,cdr.callee,date(cdr.startTime),seconds(cdr.duration),seconds(cdr.billsec),cdr.disposition,cdr.aiAgentId||'Não informado']));
  if(!cdrs.length)table(doc,['Amostra'],[['Nenhum CDR carregado para estes filtros.']]);
  return finish(doc,'Relatório da amostra de chamadas');
}
export function exportCdrReportPdf(cdrs:CdrRecord[],_title?:string,filters?:string,tenantName?:string){createCdrReportPdf(cdrs,filters,tenantName).save('relatorio-amostra-cdr.pdf');}

export function createCallDossierPdf(cdr:CdrRecord,tenantName?:string){
  const doc=new jsPDF();identity(doc,tenantName);
  table(doc,['Campo registrado','Valor'],[['ID',cdr.uniqueId||cdr.id],['Origem',cdr.caller],['Destino',cdr.callee],['Início',date(cdr.startTime)],['Duração',seconds(cdr.duration)],['Billsec',seconds(cdr.billsec)],['Status',cdr.disposition],['Agente IA registrado',cdr.aiAgentId],['Transferência registrada',cdr.transferredTo],['Referência de gravação',cdr.recordingUrl?'Vinculada no CDR; arquivo não incluído no PDF':'Não informada']]);
  table(doc,['Resumo legado - sem verificação de origem ou revisão'],[[cdr.summary||'Nenhum resumo registrado.']]);
  table(doc,['Transcrição registrada - não certifica fidelidade ao áudio'],[[cdr.transcription||'Nenhuma transcrição registrada.']]);
  return finish(doc,'Detalhes do registro de chamada');
}
export function exportCallDossierPdf(cdr:CdrRecord,tenantName?:string){createCallDossierPdf(cdr,tenantName).save(`registro-chamada-${fileId(cdr.uniqueId||cdr.id)}.pdf`);}

export function createFinancialStatementPdf(billing:BillingSummaryData,transactions:FinancialTransaction[],periodName='Amostra carregada',tenant?:Tenant|null){
  const doc=new jsPDF();identity(doc,tenant?.name||billing.tenantName);
  table(doc,['Escopo','Valor'],[['Período/filtro informado',periodName],['Cobertura','Somente transações carregadas no painel. A API limita o histórico; não representa extrato bancário completo.'],['Moeda',billing.currency],['Saldo registrado',amount(billing.balance)]]);
  table(doc,['Data','ID','Descrição','Tipo','Valor','Saldo posterior'],transactions.map(item=>[item.date,item.id,item.description,item.type==='credit'?'Crédito':'Débito',amount(item.amount),amount(item.balanceAfter)]));
  if(!transactions.length)table(doc,['Transações'],[['Nenhuma transação carregada.']]);
  return finish(doc,'Extrato gerencial das transações');
}
export function exportFinancialStatementPdf(billing:BillingSummaryData,transactions:FinancialTransaction[],periodName?:string,tenant?:Tenant|null){createFinancialStatementPdf(billing,transactions,periodName,tenant).save('extrato-transacoes.pdf');}
