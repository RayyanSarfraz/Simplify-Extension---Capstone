const { spawn } = require('child_process');

function extractCodeOnly(text) {
  const blocks = [];
  const re = /```(?:javascript)?\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) {
    blocks.push(m[1].trim());
  }
  return blocks.length ? blocks.join('\n\n') : text.trim();
}

async function generateTests(code) {
  const fnName = (code.match(/function\s+(\w+)/) || [])[1] || 'func';
  const prompt = `
You are an expert software engineer.
ONLY return raw Jest test code in JavaScript—no markdown, no comments.
Assume the function will be imported from './${fnName}.js'.

Here is the code:
${code}
`;
  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['run', 'deepseek-coder:6.7b']);
    let out = '', err = '';
    proc.stdout.on('data', c => { out += c; console.log('📥 DeepSeek:', c.toString().trim()); });
    proc.stderr.on('data', c => { err += c; });
    proc.on('error', e => reject(e));
    proc.on('close', c => c === 0 ? resolve(extractCodeOnly(out)) : reject(new Error(err)));
    setTimeout(() => { proc.stdin.write(prompt); proc.stdin.end(); }, 200);
  });
}

module.exports = { generateTests };
