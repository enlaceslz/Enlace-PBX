const fs = require('fs');
let content = fs.readFileSync('server/db.ts', 'utf-8');

const methods = `

  private _lastSnapshot = '';
  private _dbFilePath = path.join(process.cwd(), 'database.json');

  constructor() {
    this.loadFromDisk();
    // Iniciar loop de backup automático a cada 10 segundos
    setInterval(() => this.saveToDisk(), 10000);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this._dbFilePath)) {
        const fileData = fs.readFileSync(this._dbFilePath, 'utf-8');
        const parsed = JSON.parse(fileData);
        
        for (const [key, value] of Object.entries(parsed)) {
          if (key !== '_lastSnapshot' && key !== '_dbFilePath') {
            (this as any)[key] = value;
          }
        }
        this._lastSnapshot = fileData;
        console.log(\`[Database] Banco de dados self-hosted carregado do disco local (\${this._dbFilePath}).\`);
      }
    } catch (err) {
      console.error(\`[Database] Erro ao carregar banco de dados local:\`, err);
    }
  }

  public saveToDisk() {
    try {
      const dataToSave = {};
      for (const [key, value] of Object.entries(this)) {
        if (key !== '_lastSnapshot' && key !== '_dbFilePath') {
          dataToSave[key] = value;
        }
      }
      
      const currentJson = JSON.stringify(dataToSave);
      
      if (currentJson !== this._lastSnapshot) {
        fs.writeFileSync(this._dbFilePath, currentJson, 'utf-8');
        this._lastSnapshot = currentJson;
        // console.log(\`[Database] Sincronização self-hosted concluída.\`);
      }
    } catch (err) {
      console.error(\`[Database] Erro ao salvar no disco:\`, err);
    }
  }
}

export const db = new Database();
`;

// Just look for the final "}\nexport const db = new Database();"
content = content.replace(/}\s*export const db = new Database\(\);[\s\S]*$/, methods);

fs.writeFileSync('server/db.ts', content);
console.log('Fixed DB');
