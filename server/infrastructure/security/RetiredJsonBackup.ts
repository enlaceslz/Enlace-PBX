import type {Request,Response} from 'express';
export function retiredJsonBackup(_req:Request,res:Response){
  return res.status(501).json({code:'LEGACY_BACKUP_RETIRED',error:'Backup JSON e restauração pela API foram retirados. Utilize a rotina operacional de cópia integral criptografada e recuperação em banco e diretório novos.'});
}
