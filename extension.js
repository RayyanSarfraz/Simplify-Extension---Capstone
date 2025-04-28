const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { generateTests } = require('./testGenerator');
const { createOrShowPanel } = require('./panelProvider');

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('simplify.runTests', async () => {
      // 1) Get editor & code
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return vscode.window.showErrorMessage("No active editor found.");
      }
      const code = editor.document.getText();
      if (!code.trim()) {
        return vscode.window.showErrorMessage("The active file is empty.");
      }

      // 2) Find workspace folder
      const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (!folder) {
        return vscode.window.showErrorMessage("Open a workspace folder first.");
      }
      const workspaceRoot = folder.uri.fsPath;

      // 3) Ensure package.json & Jest
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

      // 4) Extract functions
      const fnRegex = /function\s+(\w+)\s*\([^)]*\)\s*{[^]*?}/g;
      let m, functions = [];
      while ((m = fnRegex.exec(code))) {
        functions.push({ name: m[1], code: m[0] });
      }
      if (!functions.length) {
        return vscode.window.showErrorMessage("No functions found in this file.");
      }

      // 5) Ensure tests/ exists
      const testsDir = path.join(workspaceRoot, 'tests');
      if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir);

      // 6) Generate & write tests
      const testMap = {};
      for (const fn of functions) {
        try {
          let tests = await generateTests(fn.code);

          // compute correct relative path from tests/ to the source file
          const sourceFile = editor.document.uri.fsPath;
          let rel = path.relative(testsDir, sourceFile).replace(/\.js$/, '');
          rel = rel.split(path.sep).join('/');
          if (!rel.startsWith('.')) rel = './' + rel;

          // **PATCH THE FIRST REQUIRE** to destructure the exact function name:
          const lines = tests.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (/^\s*const\s+\w+\s*=\s*require\(.+\);/.test(lines[i])) {
              lines[i] = `const { ${fn.name} } = require('${rel}');`;
              break;
            }
          }
          tests = lines.join('\n');

          testMap[fn.name] = tests;
          fs.writeFileSync(path.join(testsDir, `${fn.name}.test.js`), tests, 'utf8');
        } catch (e) {
          testMap[fn.name] = `// Error generating tests: ${e.message}`;
        }
      }

      // 7) Show panel
      const panel = createOrShowPanel(context.extensionUri, testMap);

      // 8) Wire Run buttons
      panel.webview.onDidReceiveMessage(msg => {
        if (msg.command === 'runTest') {
          const term = vscode.window.createTerminal({ name: `Jest: ${msg.fn}`, cwd: workspaceRoot });
          term.show();
          term.sendText(`npm test tests/${msg.fn}.test.js`);
        }
        if (msg.command === 'runAll') {
          const term = vscode.window.createTerminal({ name: 'Jest All', cwd: workspaceRoot });
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
