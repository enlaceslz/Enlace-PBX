import test from 'node:test';
import assert from 'node:assert/strict';
import {infraPatch,mergeInfra,infraDto} from '../server/infrastructure/asterisk/InfraMutation.js';
const config={hostname:'pbx.example.invalid',domain:'pbx.example.invalid',publicIp:'192.0.2.10',lanIp:'192.168.1.20',lanSubnet:'255.255.255.0',ports:{sipUdp:5060,sipTls:5061},sslCertificate:{status:'valid',provider:'custom',certPath:'/etc/pbx/cert.pem',keyPath:'/etc/pbx/key.pem'}};
test('edição de infraestrutura exige revisão e campos fechados, sem atestar TLS ou injetar diretivas',()=>{
 assert.deepEqual(infraPatch({expectedRevision:0,hostname:'pbx.example.invalid'}),{expectedRevision:0,patch:{hostname:'pbx.example.invalid'}});
 for(const input of [{hostname:'pbx'}, {expectedRevision:-1,hostname:'pbx'}, {expectedRevision:0,_revision:9},{expectedRevision:0,validationPwa:{status:'passed'}},{expectedRevision:0,sslCertificate:{status:'valid'}},{expectedRevision:0,ports:{sipUdp:'5060'}},{expectedRevision:0,ports:{turnPort:3478}},{expectedRevision:0,stunServer:'https://host'},{expectedRevision:0,sslCertificate:{keyPath:'/etc/../key.pem'}},{expectedRevision:0,domain:'${SHELL(id)}'}])assert.throws(()=>infraPatch(input));
});
test('mescla preserva portas não alteradas e mudança de certificado invalida comprovação anterior',()=>{
 assert.equal(mergeInfra(config,{sslCertificate:{provider:'custom',certPath:config.sslCertificate.certPath,keyPath:config.sslCertificate.keyPath}}).sslCertificate.status,'valid');
 const next=mergeInfra(config,{ports:{sipUdp:5062}});assert.equal(next.ports.sipTls,5061);assert.equal(next.ports.sipUdp,5062);
 assert.equal(mergeInfra(config,{sslCertificate:{certPath:'/etc/pbx/new.pem'}}).sslCertificate.status,'pending');
 assert.throws(()=>mergeInfra(config,{sslCertificate:{keyPath:''}}));assert.throws(()=>mergeInfra(config,{lanSubnet:'255.0.255.0'}));
 const dto=infraDto({...config,_revision:2,validationWhatsapp:{verifyToken:'segredo-interno'},validationPwa:{privateKey:'chave-interna'}});assert.equal(dto.revision,2);assert.equal(dto.validationStatus,'NOT_VERIFIED');assert.equal(JSON.stringify(dto).includes('segredo-interno'),false);assert.equal(JSON.stringify(dto).includes('chave-interna'),false);assert.equal('status' in dto.sslCertificate,false);
 assert.deepEqual(infraDto(undefined),{configured:false,revision:0,validationStatus:'NOT_VERIFIED'});
});
