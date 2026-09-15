const fs = require('fs');

let content = fs.readFileSync('src/components/views/AiGatewayView.tsx', 'utf-8');

// Step 1: Add a "Novo Provedor" button
const providerTabStartRegex = /      \{\/\* 2\. PROVIDERS TAB \*\/\}\n      \{currentTab === 'providers' && \(\n        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">/g;

const providerTabStartReplacement = `      {/* 2. PROVIDERS TAB */}
      {currentTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                alert('Funcionalidade de adicionar novo provedor via interface será implementada. API Keys são salvas via Server-Side.');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Novo Provedor
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`;

content = content.replace(providerTabStartRegex, providerTabStartReplacement);

// Step 2: Show baseUrl if it exists
const apiKeyMaskedRegex = /                <div className="flex items-center justify-between text-slate-500">\n                  <span className="flex items-center gap-1">\n                    <Lock className="w-3 h-3 text-blue-600" \/> API Key Protegida:\n                  <\/span>\n                  <span className="text-slate-700">\{prov\.apiKeyMasked\}<\/span>\n                <\/div>/g;

const apiKeyMaskedReplacement = `                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-600" /> API Key Protegida:
                  </span>
                  <span className="text-slate-700">{prov.apiKeyMasked}</span>
                </div>
                {prov.baseUrl && (
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-emerald-600" /> Endpoint URL:
                    </span>
                    <span className="text-emerald-700 font-bold truncate max-w-[150px]" title={prov.baseUrl}>{prov.baseUrl}</span>
                  </div>
                )}`;

content = content.replace(apiKeyMaskedRegex, apiKeyMaskedReplacement);

// Step 3: Close the extra div for the providers grid
content = content.replace(/          \)\)}\n        <\/div>\n      \)}/g, "          ))}\n        </div>\n        </div>\n      )}");

fs.writeFileSync('src/components/views/AiGatewayView.tsx', content);
console.log('AiGatewayView updated');
