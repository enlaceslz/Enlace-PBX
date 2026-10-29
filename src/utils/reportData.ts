import type {CdrRecord} from '../types/pbx';

/** Células textuais não devem ser interpretadas como fórmulas por planilhas. */
export function csvCell(value:unknown):string {
  let text=typeof value==='number' ? (Number.isFinite(value)?String(value):'') : value==null ? '' : String(value).replace(/\0/g,'');
  if(typeof value!=='number' && (/^[\s\u0000-\u001f\u200b\ufeff]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function csvDocument(headers:unknown[],rows:unknown[][]):string {
  return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
export function downloadCsv(content:string,filename:string){
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function cdrSample(records:CdrRecord[]){
  const numeric=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
  const durations=records.map(row=>row.duration).filter(numeric);
  const answered=records.filter(row=>row.disposition==='ANSWERED');
  const billed=answered.map(row=>row.billsec).filter(numeric);
  const costs=records.map(row=>row.costBrl).filter(numeric);
  const mean=(values:number[])=>values.length?Math.round(values.reduce((sum,value)=>sum+value,0)/values.length):null;
  return {count:records.length,answered:answered.length,noAnswer:records.filter(row=>row.disposition==='NO ANSWER').length,
    answerRate:records.length?Math.round(answered.length/records.length*100):null,
    durationMean:mean(durations),billedAnsweredMean:mean(billed),costCount:costs.length,costTotal:costs.length?costs.reduce((sum,value)=>sum+value,0):null};
}
