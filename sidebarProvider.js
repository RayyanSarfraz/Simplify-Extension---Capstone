const vscode = require('vscode');

class SidebarProvider {
    constructor(context) {
        this.context = context;
        this._view = null;
    }

    // This method resolves the WebviewView and prepares the HTML content
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        this._view.webview.options = {
            enableScripts: true
        };

        this._view.webview.html = this.getHtmlForWebview();
    }

    // Method to update test results in the sidebar
    updateTestResults(results) {
        console.log('Updating sidebar with test results');
        if (this._view) {
            this._view.webview.postMessage({ type: 'test-results', results: results });
        } else {
            console.error('Webview is not available.');
        }
    }

    // Method to generate the HTML for the sidebar's webview
    getHtmlForWebview() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Unit Test Results</title>
            </head>
            <body>
                <h1>Unit Test Results</h1>
                <div id="test-results">No results yet...</div>
                <script>
                    const vscode = acquireVsCodeApi();

                    // Listen for messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'test-results') {
                            const testResults = message.results;
                            console.log('Received test results:', testResults);
                            document.getElementById('test-results').textContent = testResults;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}

module.exports = SidebarProvider;
