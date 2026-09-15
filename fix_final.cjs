const fs = require('fs');
let code = fs.readFileSync('src/components/WebphoneModal.tsx', 'utf-8');

// I will remove the closing tags that I added incorrectly
code = code.replace(/          <\/div>\n        <\/div>\n\n        \{\/\* Omnichannel Section/g, '          </div>\n\n        {/* Omnichannel Section');

// Now we need to close it properly at the end
code = code.replace(/      <\/div>\n    <\/div>\n  \);\n};\n?$/, '        </div>\n      )}\n    </div>\n  );\n};\n');

fs.writeFileSync('src/components/WebphoneModal.tsx', code);
