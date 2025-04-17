const vscode = require('vscode');

let panel = null;

function createOrShowPanel(extensionUri, testResults) {
  if (panel) {
    panel.reveal();
  } else {
    panel = vscode.window.createWebviewPanel(
      'unitTestPanel',
      'Unit Test Results',
      vscode.ViewColumn.One,
      {
        enableScripts: true
      }
    );

    panel.onDidDispose(() => {
      panel = null;
    });
  }

  console.log("🧪 Generated Unit Tests:\n", testResults); // Log the results to the console

  panel.webview.html = getHtmlForWebview(testResults);
}

function getHtmlForWebview(results) {
  const sanitizedResults = results
    ? results.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : 'No test results.';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Unit Test Results</title>
      <style>
        body {
          font-family: monospace;
          padding: 1rem;
        }
        pre {
          background: #f4f4f4;
          padding: 1rem;
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <h2>🧪 Generated Unit Tests</h2>
      <pre>${sanitizedResults}</pre>
    </body>
    </html>
  `;
}

module.exports = { createOrShowPanel };
