import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {csvCell,csvDocument,cdrSample} from '../src/utils/reportData.js';
import {createInvoicePdf,createFinancialStatementPdf,createCallDossierPdf,createCdrReportPdf} from '../src/utils/pdfExportHelper.js';

test('CSV protege células textuais de fórmula e preserva aspas, separadores, quebras e zeros',()=>{
  for(const value of ['=1+1','+5511987654321','-comando','@SUM(A1)',' \t=HYPERLINK("host")','\n=1','\uFEFF=1','\u200b=1'])assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a;"b"\nc'),'"a;""b""\nc"');assert.equal(csvCell(0),'"0"');assert.equal(csvCell(-2),'"-2"');assert.equal(csvCell(undefined),'""');
  assert.equal(csvDocument(['Nome','Valor'],[['ação;teste',0]]),'\uFEFF"Nome";"Valor"\r\n"ação;teste";"0"\r\n');
});
test('métricas CDR não inventam SLA, abandono, custo ou 100% para amostra vazia',()=>{
  const empty=cdrSample([]);assert.equal(empty.answerRate,null);assert.equal(empty.durationMean,null);assert.equal(empty.costTotal,null);
  const sample=cdrSample([{disposition:'ANSWERED',duration:30,billsec:0,costBrl:0},{disposition:'NO ANSWER',duration:10,billsec:0}] as any);
  assert.equal(sample.answerRate,50);assert.equal(sample.billedAnsweredMean,0);assert.equal(sample.durationMean,20);assert.equal(sample.costTotal,0);assert.equal(sample.costCount,1);assert.equal('sla' in sample,false);assert.equal('abandonRate' in sample,false);
});
test('PDFs preservam zero, paginam textos longos e não criam transcrição, dados fiscais ou pagamento',async()=>{
  const cdr:any={id:'cdr-teste',uniqueId:'123.1',caller:'871001',callee:'871002',startTime:'2026-10-29T12:00:00Z',direction:'internal',duration:30,billsec:0,disposition:'NO ANSWER',costBrl:0};
  const billing:any={tenantId:'empresa',tenantName:'Empresa de teste',plan:'prepaid',balance:0,currency:'BRL',currentMonthCosts:{telephony:0,aiTokens:0,omnichannel:0,licenses:0}};
  const invoice=createInvoicePdf({id:'fatura-1',date:'2026-10',dueDate:'2026-11-01',amount:0,status:'pending'},billing);
  const absent=createCallDossierPdf(cdr,'Empresa de teste');
  assert.ok(absent.output().includes('Nenhuma transcri'));assert.equal(absent.output().includes('[00:01]'),false);
  const dossier=createCallDossierPdf({...cdr,summary:'Texto com caractere 🐙. '+ 'Resumo legado '.repeat(200),transcription:('Trecho original para verificar paginação sem corte.\n').repeat(250)+'FIM_TRANSCRICAO'},'Empresa de teste');
  assert.ok(dossier.output().includes('[U+1F419]'));assert.ok(dossier.getNumberOfPages()>2);assert.ok(dossier.output().includes('FIM_TRANSCRICAO'));
  const report=createCdrReportPdf(Array.from({length:120},(_,i)=>({...cdr,id:'cdr-'+i,uniqueId:'id-'+i})),'Busca e filtros da amostra','Empresa de teste');
  assert.ok(report.getNumberOfPages()>1);
  const statement=createFinancialStatementPdf(billing,[{id:'tx-1',date:'2026-10-29',description:'Transação registrada',category:'recharge',type:'credit',amount:0,balanceAfter:0}]);
  for(const doc of [invoice,dossier,report,statement])assert.doesNotMatch(doc.output(),/12\.345\.678|Paulista|4892\/2022|Chave PIX|34191|Atendente: Atendimento iniciado/);
  if(process.env.PBX_PDF_TEST_DIR){await mkdir(process.env.PBX_PDF_TEST_DIR,{recursive:true});for(const [name,doc] of Object.entries({invoice,dossier,report,statement}))await writeFile(path.join(process.env.PBX_PDF_TEST_DIR,name+'.pdf'),Buffer.from(doc.output('arraybuffer')));}
});
