const { spawn } = require('child_process');

/**
 * Extracts only the code between ```javascript ... ``` blocks.
 */
function extractCodeOnly(text) {
  const blocks = [];
  const re = /```(?:javascript)?\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks.length ? blocks.join('\n\n') : text.trim();
}

async function generateTests(code) {
  const fnNameMatch = code.match(/function\s+(\w+)/);
  const fnName = fnNameMatch ? fnNameMatch[1] : 'function';
  const prompt = `
You are an expert software engineer.
ONLY return raw Jest test code in JavaScript for the following function — no explanations, no comments, no markdown.
Assume the function will be imported from './${fnName}.js'.

Here is the code to test:
${code}
`;

  return new Promise((resolve, reject) => {
    // <-- Use the 6.7b variant here:
    const proc = spawn('ollama', ['run', 'deepseek-coder:6.7b']);
    let out = '', err = '';

    proc.stdout.on('data', chunk => {
      const txt = chunk.toString();
      console.log('📥 DeepSeek:', txt.trim());
      out += txt;
    });
    proc.stderr.on('data', chunk => {
      const txt = chunk.toString();
      console.warn('⚠️ DeepSeek stderr:', txt.trim());
      err += txt;
    });
    proc.on('error', e => reject(new Error("Ollama failed: " + e.message)));
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(err || 'DeepSeek error'));
      resolve(extractCodeOnly(out));
    });

    // Give Ollama the prompt
    setTimeout(() => {
      proc.stdin.write(prompt);
      proc.stdin.end();
    }, 200);
  });
}

module.exports = { generateTests };
