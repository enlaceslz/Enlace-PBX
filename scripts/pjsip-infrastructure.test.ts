import test from 'node:test';
import assert from 'node:assert/strict';
import {pjsipInfrastructure} from '../server/infrastructure/asterisk/PjsipInfrastructure.js';
const config={hostname:'pbx.example.invalid',domain:'pbx.example.invalid',publicIp:'192.0.2.10',lanIp:'192.168.1.100',lanSubnet:'255.255.255.0',ports:{sipUdp:5060,sipTls:5061},sslCertificate:{status:'not_configured'}};
test('infraestrutura PJSIP exige cadastro explícito e deriva rede CIDR da máscara LAN',()=>{
 assert.equal(pjsipInfrastructure(config).localNet,'192.168.1.0/24');
 assert.equal(pjsipInfrastructure({...config,lanSubnet:'10.23.45.67/16'}).localNet,'10.23.0.0/16');
 assert.equal(pjsipInfrastructure({...config,lanSubnet:'255.255.255.255'}).localNet,'192.168.1.100/32');
 for(const value of [null,{...config,publicIp:'host;diretiva=x'},{...config,domain:'${SHELL(id)}'},{...config,lanSubnet:'255.0.255.0'},{...config,lanSubnet:'0.0.0.0/0'},{...config,ports:{sipUdp:'5060',sipTls:5061}},{...config,ports:{sipUdp:5060,sipTls:5060}}])assert.throws(()=>pjsipInfrastructure(value));
});
test('caminhos TLS não aceitam variáveis, diretivas, URLs ou travessia',()=>{
 const certificate={status:'valid',certPath:'/etc/letsencrypt/live/pbx/fullchain.pem',keyPath:'/etc/letsencrypt/live/pbx/privkey.pem'};
 assert.equal(pjsipInfrastructure({...config,sslCertificate:certificate}).sslCertificate.certPath,certificate.certPath);
 for(const path of ['../chave','/etc/../chave','https://host/chave','/etc/chave;diretiva=x','/etc/${SHELL(id)}','/etc/chave\nexec=x'])assert.throws(()=>pjsipInfrastructure({...config,sslCertificate:{...certificate,keyPath:path}}));
});
