const vscode = require('vscode');
const SidebarProvider = require('./sidebarProvider');
const { generateTests } = require('./testGenerator');

function activate(context) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("unitTestSidebar", sidebarProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.generateUnitTests', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const code = editor.document.getText();
        const tests = await generateTests(code);
        sidebarProvider.updateTests(tests);
      }
    })
  );

  vscode.workspace.onDidSaveTextDocument(doc => {
    vscode.commands.executeCommand('extension.generateUnitTests');
  });
}
exports.activate = activate;
