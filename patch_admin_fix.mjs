import fs from 'fs';
const file = 'src/components/views/AdminAndSecurityView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      {/* MODAL: ADICIONAR / EDITAR USUÁRIO */}`;
const replacement = `      </div>
      </div>
      {/* MODAL: ADICIONAR / EDITAR USUÁRIO */}`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Fixed missing divs in AdminAndSecurityView');
