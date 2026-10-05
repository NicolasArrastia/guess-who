import { spawn } from 'node:child_process'

const targets = [
  { name: 'server', color: '\x1b[36m', args: ['run', 'dev', '--workspace', 'server'] },
  { name: 'client', color: '\x1b[35m', args: ['run', 'dev', '--workspace', 'client'] },
]

const isWindows = process.platform === 'win32'
const npm = isWindows ? 'npm.cmd' : 'npm'
const children = targets.map(({ name, color, args }) => {
  const child = spawn(npm, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: isWindows })
  const prefix = `${color}[${name}]\x1b[0m `
  const pipe = (stream, out) => {
    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) out.write(prefix + line + '\n')
    })
  }
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('exit', (code) => {
    process.stdout.write(`${prefix}exited with code ${code}\n`)
    shutdown(code ?? 0)
  })
  return child
})

let closing = false
function shutdown(code) {
  if (closing) return
  closing = true
  for (const child of children) child.kill()
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))