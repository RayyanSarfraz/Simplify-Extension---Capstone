const vscode = require('vscode');
const { generateTests } = require('./testGenerator');
const { createOrShowPanel } = require('./panelProvider');

function activate(context) {
  console.log("✅ Extension activated");

  context.subscriptions.push(
    vscode.commands.registerCommand('simplify.runTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor found.");
        console.log("❌ No active editor.");
        return;
      }

      const code = editor.document.getText();
      console.log("📄 Code extracted:\n", code);

      if (!code.trim()) {
        vscode.window.showErrorMessage("The active file is empty.");
        console.log("⚠️ The file is empty.");
        return;
      }

      vscode.window.showInformationMessage("🔧 Generating unit tests...");
      console.log("🔄 Starting unit test generation...");

      try {
        const tests = await generateTests(code);
        console.log("✅ Unit test generation complete");
        createOrShowPanel(context.extensionUri, tests);
        vscode.window.showInformationMessage("✅ Unit tests generated!");
      } catch (err) {
        vscode.window.showErrorMessage("❌ Test generation failed: " + err.message);
        console.error("🚨 Error generating tests:", err);
      }
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
