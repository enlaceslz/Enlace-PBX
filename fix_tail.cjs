const fs = require('fs');

let webphone = fs.readFileSync('src/components/WebphoneModal.tsx', 'utf-8');

webphone = webphone.replace(
  /            <\/div>\n          <\/div>\n        \)}\n      <\/div>\n    \);\n  };\n?$/,
  `            </div>\n          </div>\n        )}\n      </div>\n    </div>\n  );\n};\n`
);

fs.writeFileSync('src/components/WebphoneModal.tsx', webphone);
console.log('Fixed WebphoneModal tail');
