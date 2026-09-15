const fs = require('fs');
let readme = fs.readFileSync('README.md', 'utf8');

const newDeploySection = `
## ⚙️ Instalação e Deploy (Produção)

Preparamos um script automatizado de deploy, desenhado para rodar em modo \`root\` em qualquer VPS ou Máquina Virtual rodando **Debian** (ou Ubuntu). 

O script age de forma prudente e autônoma: ele instala o Node.js (caso não exista), compila o projeto, configura variáveis de ambiente (via prompt interativo), libera as portas no firewall (UFW) e sobe a aplicação utilizando o **PM2** (garantindo que o sistema reinicie automaticamente com a máquina).

### Passo a Passo

1. Conecte-se via SSH em seu servidor Debian.
2. Certifique-se de estar como root (use \`sudo su\`).
3. Clone ou faça o download deste repositório na pasta desejada (ex: \`/opt/enlace-pbx\`).
4. Dê permissão e execute o script de deploy:

\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

5. Durante a execução, o script pode solicitar a sua chave de API do Gemini (opcional) para ativar os recursos de IA.
6. **Pronto!** O script entregará um link \`http://<IP_DO_SERVIDOR>:3000\` com a plataforma 100% no ar.

**Comandos Úteis Pós-Deploy:**
- Ver logs em tempo real: \`pm2 logs enlace-pbx\`
- Reiniciar o sistema: \`pm2 restart enlace-pbx\`
- Parar o sistema: \`pm2 stop enlace-pbx\`

## 🛠️ Ambiente de Desenvolvimento (Local)

Se você deseja rodar o projeto localmente para testes ou edições:

\`\`\`bash
# 1. Instale as dependências
npm install

# 2. Inicie o servidor de desenvolvimento com Hot-Reload (Frontend + Backend)
npm run dev
\`\`\`
O projeto estará disponível em \`http://localhost:3000\`.
`;

readme = readme.replace(/## ⚙️ Como Executar[\s\S]*?(?=## 🔒 Segurança e API Keys)/, newDeploySection);
fs.writeFileSync('README.md', readme);
console.log('README.md patched successfully');
