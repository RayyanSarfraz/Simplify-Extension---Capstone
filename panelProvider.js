const vscode = require('vscode');

let panel = null;

function createOrShowPanel(extensionUri, testMap) {
  if (panel) panel.reveal();
  else {
    panel = vscode.window.createWebviewPanel(
      'unitTestPanel',
      'Unit Test Results',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.onDidDispose(() => panel = null);
  }
  panel.webview.html = getHtmlForWebview(testMap);
  return panel;
}

function getHtmlForWebview(testMap) {
  const cubes = Object.entries(testMap).map(([fn, code]) => {
    const safe = code.replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `
      <section class="cube">
        <h3>${fn}()</h3>
        <pre>${safe}</pre>
        <button onclick="runTest('${fn}')">Run</button>
        <div id="out-${fn}" class="output"></div>
      </section><hr/>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Unit Test Results</title>
      <style>
        body { background:#1e1e1e; color:#ddd; font-family:monospace; padding:1rem; }
        .cube { background:#2d2d2d; padding:1rem; border-radius:6px; margin-bottom:1rem;}
        pre { white-space:pre-wrap; word-wrap:break-word; }
        button {
          margin-top:.5rem; padding:.4rem .8rem;
          background:#007acc; color:#fff; border:none; border-radius:4px; cursor:pointer;
        }
        .output { margin-top:.5rem; color:#0f0; }
        hr { border:none; border-top:1px solid#444; margin:1rem0; }
        #runAll {
          margin-bottom:1rem; padding:.5rem1rem;
          background:#00bb00; color:#fff; border:none; border-radius:4px; cursor:pointer;
        }
      </style>
    </head>
    <body>
      <h2>🧪 Generated Unit Tests</h2>
      <button id="runAll" onclick="runAllTests()">Run All Tests</button>
      ${cubes}
      <script>
        const vscode = acquireVsCodeApi();
        function runTest(fn){ vscode.postMessage({command:'runTest',fn}); }
        function runAllTests(){ vscode.postMessage({command:'runAll'}); }
        window.addEventListener('message',e=>{
          const m=e.data;
          if(m.command==='testResult'){
            document.getElementById('out-'+m.fn).innerText=m.result;
          }
        });
      </script>
    </body>
    </html>
  `;
}

module.exports = { createOrShowPanel };
