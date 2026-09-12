const fs = require('fs');
let code = fs.readFileSync('deploy.sh', 'utf8');

const newDeploy = code.replace(
  '    # Podemos adicionar outras perguntas aqui futuramente (PostgreSQL, Asterisk IP, etc)',
  `    # Podemos adicionar outras perguntas aqui futuramente (PostgreSQL, Asterisk IP, etc)
    read -p "Deseja compilar e instalar o Asterisk 20 LTS localmente nesta máquina agora? (s/n): " install_asterisk
    if [[ "$install_asterisk" =~ ^[Ss]$ ]]; then
        echo "🚀 Iniciando instalação silenciosa do Asterisk 20..."
        chmod +x install-enlace-pbx.sh
        ./install-enlace-pbx.sh || echo "⚠️ A instalação do Asterisk encontrou um erro, verifique os logs."
    fi`
);

fs.writeFileSync('deploy.sh', newDeploy);
console.log('Deploy script patched');
