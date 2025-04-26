const vscode = require('vscode');

let panel = null;

/**
 * @param {vscode.Uri} extensionUri
 * @param {{ [fnName: string]: string }} testMap
 * @returns {vscode.WebviewPanel}
 */
function createOrShowPanel(extensionUri, testMap) {
  if (panel) {
    panel.reveal();
  } else {
    panel = vscode.window.createWebviewPanel(
      'unitTestPanel',
      'Unit Test Results',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.onDidDispose(() => { panel = null; });
  }

  panel.webview.html = getHtmlForWebview(testMap);
  return panel;
}

function getHtmlForWebview(testMap) {
  // Build one cube per function, separated by <hr>
  const cubes = Object.entries(testMap).map(([fn, code]) => {
    const safe = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
      <section class="cube">
        <h3>${fn}()</h3>
        <pre>${safe}</pre>
        <button onclick="runTest('${fn}')">Run</button>
        <div id="out-${fn}" class="output"></div>
      </section>
      <hr/>
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Unit Test Results</title>
      <style>
        body { font-family: monospace; padding: 1rem; background: #1e1e1e; color: #ddd; }
        .cube { background: #2d2d2d; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
        button { margin-top: 0.5rem; padding: 0.4rem 0.8rem; background: #007acc; border: none; color: white; border-radius: 4px; cursor: pointer; }
        .output { margin-top: 0.5rem; color: #0f0; }
        hr { border: none; border-top: 1px solid #444; margin: 1rem 0; }
      </style>
    </head>
    <body>
      <h2>🧪 Generated Unit Tests</h2>
      ${cubes}

      <script>
        const vscode = acquireVsCodeApi();
        function runTest(fn) {
          vscode.postMessage({ command: 'runTest', fn });
        }
        window.addEventListener('message', evt => {
          const msg = evt.data;
          if (msg.command === 'testResult') {
            document.getElementById('out-' + msg.fn).innerText = msg.result;
          }
        });
      </script>
    </body>
    </html>
  `;
}

module.exports = { createOrShowPanel };
