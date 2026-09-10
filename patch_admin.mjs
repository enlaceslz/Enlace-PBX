import fs from 'fs';
const file = 'src/components/views/AdminAndSecurityView.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Administração, Segurança & Conformidade LGPD
            </h1>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
              RBAC • Multi-Tenant • Auditoria Imutável
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Controle de acessos, perfis de usuários, isolamento de dados por empresa e rastreabilidade de acessos a dados sensíveis.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 self-start overflow-x-auto shadow-sm">
          <button`;

const replacement1 = `  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-blue-600 fill-blue-600" />
            Administração, Segurança & LGPD
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Controle de acessos (RBAC), isolamento Multi-Tenant e rastreabilidade imutável de acessos sensíveis.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <Lock className="w-4 h-4 text-blue-500" /> RBAC
            </span>
            <span className="px-3 py-1.5 bg-slate-800 text-white border border-slate-700 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-emerald-400" /> Auditoria Imutável
            </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sub Navigation Sidebar */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-2">Central de Governança</div>
          
          <button`;

content = content.replace(target1, replacement1);


const target2 = `        </div>
      </div>

      {/* 1. USERS TAB */}
      {currentTab === 'users' && (`;

const replacement2 = `        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">

      {/* 1. USERS TAB */}
      {currentTab === 'users' && (`;

content = content.replace(target2, replacement2);


const target3 = `        </div>
      )}
    </div>
  );
};`;

const replacement3 = `        </div>
      )}
      </div>
    </div>
  );
};`;

// Also fix the button styling inside the tabs
content = content.replace(
  `            id="tab-users-btn"
            onClick={() => setCurrentTab('users')}
            className={\`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 \${
              currentTab === 'users'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }\`}`,
  `            id="tab-users-btn"
            onClick={() => setCurrentTab('users')}
            className={\`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group \${
              currentTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }\`}`
);

content = content.replace(
  `            id="tab-tenants-btn"
            onClick={() => setCurrentTab('tenants')}
            className={\`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 \${
              currentTab === 'tenants'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }\`}`,
  `            id="tab-tenants-btn"
            onClick={() => setCurrentTab('tenants')}
            className={\`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group \${
              currentTab === 'tenants'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }\`}`
);

content = content.replace(
  `            id="tab-audit-btn"
            onClick={() => setCurrentTab('audit_logs')}
            className={\`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 \${
              currentTab === 'audit_logs'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }\`}`,
  `            id="tab-audit-btn"
            onClick={() => setCurrentTab('audit_logs')}
            className={\`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group \${
              currentTab === 'audit_logs'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200'
            }\`}`
);

content = content.replace(
  `            id="tab-health-btn"
            onClick={() => setCurrentTab('health_check')}
            className={\`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 \${
              currentTab === 'health_check'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }\`}`,
  `            id="tab-health-btn"
            onClick={() => setCurrentTab('health_check')}
            className={\`px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-between group mt-4 \${
              currentTab === 'health_check'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200'
            }\`}`
);

fs.writeFileSync(file, content);
console.log('Patched AdminAndSecurityView');
