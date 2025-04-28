const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { generateTests } = require('./testGenerator');
const { createOrShowPanel } = require('./panelProvider');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('simplify.runTests', async () => {
      // 1) Get active editor and its code
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return vscode.window.showErrorMessage("No active editor found.");
      }
      const code = editor.document.getText();
      if (!code.trim()) {
        return vscode.window.showErrorMessage("The active file is empty.");
      }

      // 2) Determine workspace folder for this file
      const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (!folder) {
        return vscode.window.showErrorMessage("Open a workspace folder first.");
      }
      const workspaceRoot = folder.uri.fsPath;

      // 3) Ensure package.json & Jest setup
      const pkgPath = path.join(workspaceRoot, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        vscode.window.showInformationMessage('Initializing package.json & Jest…');
        try {
          execSync('npm init -y', { cwd: workspaceRoot, stdio: 'inherit' });
          execSync('npm install --save-dev jest', { cwd: workspaceRoot, stdio: 'inherit' });
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          pkg.scripts = pkg.scripts || {};
          pkg.scripts.test = 'jest';
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
          vscode.window.showInformationMessage('Jest setup complete.');
        } catch (e) {
          return vscode.window.showErrorMessage("Setup failed: " + e.message);
        }
      }

      vscode.window.showInformationMessage("🔧 Generating unit tests…");

      // 4) Extract top-level functions from code
      const fnRegex = /function\s+(\w+)\s*\([^)]*\)\s*{[^]*?}/g;
      let m, functions = [];
      while ((m = fnRegex.exec(code))) {
        functions.push({ name: m[1], code: m[0] });
      }
      if (!functions.length) {
        return vscode.window.showErrorMessage("No functions found in this file.");
      }

      // 5) Ensure tests/ directory exists
      const testsDir = path.join(workspaceRoot, 'tests');
      if (!fs.existsSync(testsDir)) {
        fs.mkdirSync(testsDir);
      }

      // 6) Generate, patch imports, and write each test file
      const testMap = {};
      for (const fn of functions) {
        try {
          let tests = await generateTests(fn.code);

          // Compute relative path from testsDir to the source file (no .js)
          const sourceFile = editor.document.uri.fsPath;
          let rel = path.relative(testsDir, sourceFile).replace(/\.js$/, '');
          // Normalize to forward slashes for require()
          rel = rel.split(path.sep).join('/');
          if (!rel.startsWith('.')) {
            rel = './' + rel;
          }

          // Replace require('./fn') or require("./fn.js") with require('<rel>')
          tests = tests.replace(
            new RegExp(`require\\(['"]\\.\\/${fn.name}(?:\\.js)?['"]\\)`, 'g'),
            `require('${rel}')`
          );

          testMap[fn.name] = tests;
          fs.writeFileSync(
            path.join(testsDir, `${fn.name}.test.js`),
            tests,
            'utf8'
          );
        } catch (e) {
          testMap[fn.name] = `// Error generating tests: ${e.message}`;
        }
      }

      // 7) Show the webview panel with tests
      const panel = createOrShowPanel(context.extensionUri, testMap);

      // 8) Wire up Run and Run All buttons
      panel.webview.onDidReceiveMessage(msg => {
        if (msg.command === 'runTest') {
          const term = vscode.window.createTerminal({
            name: `Jest: ${msg.fn}`,
            cwd: workspaceRoot
          });
          term.show();
          term.sendText(`npm test tests/${msg.fn}.test.js`);
        }
        if (msg.command === 'runAll') {
          const term = vscode.window.createTerminal({
            name: 'Jest All',
            cwd: workspaceRoot
          });
          term.show();
          term.sendText('npm test');
        }
      });

      vscode.window.showInformationMessage("✅ Unit tests generated!");
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
