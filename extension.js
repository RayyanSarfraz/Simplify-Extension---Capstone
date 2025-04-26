const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateTests } = require('./testGenerator');
const { createOrShowPanel } = require('./panelProvider');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('simplify.runTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        return;
      }

      const code = editor.document.getText();
      if (!code.trim()) {
        vscode.window.showErrorMessage("The active file is empty.");
        return;
      }

      vscode.window.showInformationMessage("🔧 Generating unit tests...");

      // 1. Split into individual functions
      const fnRegex = /function\s+(\w+)\s*\([^)]*\)\s*{[^]*?}/g;
      let match;
      const functions = [];
      while ((match = fnRegex.exec(code))) {
        functions.push({ name: match[1], code: match[0] });
      }
      if (!functions.length) {
        vscode.window.showErrorMessage("No functions found in file.");
        return;
      }

      // 2. Generate tests per function
      const testMap = {};
      for (const fn of functions) {
        try {
          const tests = await generateTests(fn.code);
          testMap[fn.name] = tests;
        } catch (e) {
          testMap[fn.name] = `// Error generating tests: ${e.message}`;
        }
      }

      // 3. Show in panel
      const panel = createOrShowPanel(context.extensionUri, testMap);

      // 4. Handle Run button messages
      panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'runTest') {
          const fnName = message.fn;
          // **Stubbed** run: just echo back a placeholder
          const result = `Ran tests for "${fnName}" (stubbed).`;
          panel.webview.postMessage({
            command: 'testResult',
            fn: fnName,
            result
          });
        }
      });

      vscode.window.showInformationMessage("✅ Unit tests generated!");
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
