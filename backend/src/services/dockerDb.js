const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

function isRunningInDocker() {
  try {
    return fs.existsSync('/.dockerenv')
  } catch {
    return false
  }
}

function getComposeProjectDir() {
  const configured = process.env.ICHING_COMPOSE_DIR
  if (configured && fs.existsSync(configured)) return path.resolve(configured)
  const repoRoot = path.resolve(__dirname, '../../..')
  if (fs.existsSync(path.join(repoRoot, 'docker-compose.yml'))) return repoRoot
  return repoRoot
}

function runCommand(cmd, args, cwd, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: process.env, shell: false })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ ok: false, code: -1, stdout, stderr: stderr || '命令超时' })
    }, timeoutMs)
    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, code, stdout, stderr })
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ ok: false, code: -1, stdout, stderr: e.message })
    })
  })
}

async function tryStartPostgresWithDocker() {
  const cwd = getComposeProjectDir()
  const composeFile = path.join(cwd, 'docker-compose.yml')
  if (!fs.existsSync(composeFile)) {
    return { ok: false, message: `未找到 ${composeFile}，请设置 ICHING_COMPOSE_DIR` }
  }

  const attempts = [
    ['docker', ['compose', 'up', '-d', 'postgres']],
    ['docker-compose', ['up', '-d', 'postgres']],
  ]

  let lastErr = ''
  for (const [cmd, args] of attempts) {
    const result = await runCommand(cmd, args, cwd)
    if (result.ok) {
      return { ok: true, message: '已执行 docker 启动 Postgres', log: result.stdout.trim() }
    }
    lastErr = result.stderr.trim() || result.stdout.trim() || `${cmd} 退出码 ${result.code}`
    if (/not found|ENOENT|command not found/i.test(lastErr)) continue
    return { ok: false, message: lastErr, log: result.stdout.trim() }
  }

  return {
    ok: false,
    message: lastErr || '未找到 docker 命令，请先安装 Docker Desktop 或 Colima',
  }
}

async function waitForDatabaseReady(db, maxWaitMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    try {
      await db.query('SELECT 1')
      return true
    } catch {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  return false
}

module.exports = {
  isRunningInDocker,
  getComposeProjectDir,
  tryStartPostgresWithDocker,
  waitForDatabaseReady,
}
