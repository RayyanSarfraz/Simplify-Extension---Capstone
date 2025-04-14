const { exec } = require('child_process');

async function generateTests(code) {
  return new Promise((resolve, reject) => {
    const prompt = `Write JavaScript unit tests using Jest for the following code:\n\n${code}`;
    exec(`echo "${prompt}" | ollama run deepseek-coder`, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

module.exports = { generateTests };
