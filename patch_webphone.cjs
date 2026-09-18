const fs = require('fs');
let code = fs.readFileSync('src/components/WebphoneModal.tsx', 'utf8');
code = code.replace(
  "const [speechSupported, setSpeechSupported] = useState(true);",
  "const [speechSupported, setSpeechSupported] = useState(true);\n  const [interimTranscript, setInterimTranscript] = useState('');"
);
code = code.replace(
  /recog\.continuous = false;\n\s+recog\.interimResults = false;\n\s+recog\.onresult = \(event: any\) => \{\n\s+const transcript = event\.results\[0\]\[0\]\.transcript;\n\s+if \(transcript\) \{\n\s+handleSendVoiceTurn\(transcript\);\n\s+\}\n\s+setIsListening\(false\);\n\s+\};/,
`recog.continuous = true;
      recog.interimResults = true;
      recog.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }
        if (finalTranscript) {
          setInterimTranscript('');
          handleSendVoiceTurn(finalTranscript);
          setIsListening(false);
          try {
            recognitionRef.current?.stop();
          } catch(e){}
        }
      };`
);

code = code.replace(
  "<span>Ouvindo sua voz... Fale agora.</span>",
  "<span>Ouvindo sua voz... {interimTranscript ? <span className=\"text-rose-900 font-bold ml-1\">\"{interimTranscript}\"</span> : 'Fale agora.'}</span>"
);

fs.writeFileSync('src/components/WebphoneModal.tsx', code);
