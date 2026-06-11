const { getGuaci, getGuaciByName } = require('../data/guaci')
const { hexFromYaoLines } = require('../lib/hexFromYao')

function resolveHexMeta(meta, facts) {
  const fromYao = meta.yao?.length === 6 ? hexFromYaoLines(meta.yao) : null
  const fromFactsBen = facts?.benGua
  const fromFactsBian = facts?.bianGua
  const benEntry = getGuaciByName(meta.benName)
  const bianEntry = meta.bianName ? getGuaciByName(meta.bianName) : null

  const benName =
    meta.benName && meta.benName !== '?'
      ? meta.benName
      : fromYao?.benName || fromFactsBen?.name || benEntry?.name
  const benChar =
    meta.benChar && meta.benChar !== '?'
      ? meta.benChar
      : fromYao?.benChar || fromFactsBen?.char || benEntry?.char
  const bianName =
    meta.bianName && meta.bianName !== '?'
      ? meta.bianName
      : fromYao?.bianName || fromFactsBian?.name || bianEntry?.name
  const bianChar =
    meta.bianChar && meta.bianChar !== '?'
      ? meta.bianChar
      : fromYao?.bianChar || fromFactsBian?.char || bianEntry?.char

  const benEntryResolved = benName ? getGuaciByName(benName) : benEntry
  const bianEntryResolved = bianName ? getGuaciByName(bianName) : bianEntry

  return {
    benName,
    benChar,
    bianName,
    bianChar,
    benEntry: benEntryResolved,
    bianEntry: bianEntryResolved,
  }
}

function parseAiResponse(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function saveRecord(db, userId, meta) {
  const hex = resolveHexMeta(meta, meta.result?.facts)
  if (!hex.benName || !hex.benChar || hex.benName === '?' || hex.benChar === '?') {
    throw new Error('卦象数据不完整，无法存档')
  }

  const aiResponse = {
    text: meta.result.text,
    sections: meta.result.sections,
    followUp: meta.result.followUp ?? null,
    facts: meta.result.facts ?? null,
    followUpMessages: meta.result.followUpMessages ?? [],
    meta: {
      benName: hex.benName,
      benChar: hex.benChar,
      bianName: hex.bianName ?? null,
      bianChar: hex.bianChar ?? null,
      changingLine: meta.changingLine,
      yao: meta.yao || [],
      fromCache: !!meta.fromCache,
      castMethod: meta.castMethod || null,
    },
  }

  const recent = await db.query(
    `SELECT id FROM divinations
     WHERE user_id=$1 AND question_text=$2
       AND created_at > NOW() - interval '5 minutes'
     ORDER BY created_at DESC LIMIT 1`,
    [userId, meta.question],
  )
  if (recent.rows[0]) {
    const rid = recent.rows[0].id
    await db.query(
      `UPDATE divinations
       SET gua_id=$1, bian_gua_id=$2, changing_line=$3, question_category=$4, ai_response=$5
       WHERE id=$6 AND user_id=$7`,
      [
        hex.benEntry?.id || null,
        hex.bianEntry?.id || null,
        meta.changingLine || 0,
        meta.category,
        JSON.stringify(aiResponse),
        rid,
        userId,
      ],
    )
    return rid
  }

  const createdAt = meta.createdAt ? new Date(meta.createdAt) : null
  const validCreatedAt =
    createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString() : null

  const result = await db.query(
    `INSERT INTO divinations
     (user_id, lower_gua, upper_gua, changing_line, gua_id, bian_gua_id,
      question_category, question_text, ai_response, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, NOW()))
     RETURNING id`,
    [
      userId,
      null,
      null,
      meta.changingLine || 0,
      hex.benEntry?.id || null,
      hex.bianEntry?.id || null,
      meta.category,
      meta.question,
      JSON.stringify(aiResponse),
      validCreatedAt,
    ],
  )
  return result.rows[0].id
}

async function importLocalRecords(db, userId, records) {
  const list = Array.isArray(records) ? records.slice(0, 80) : []
  let imported = 0
  let skipped = 0

  for (const rec of list) {
    if (!rec?.question || !rec?.benName || !rec?.category) {
      skipped += 1
      continue
    }
    const tsSec = Number(rec.createdAt) > 0 ? Number(rec.createdAt) / 1000 : Date.now() / 1000
    const dup = await db.query(
      `SELECT id FROM divinations
       WHERE user_id=$1 AND question_text=$2
         AND created_at BETWEEN to_timestamp($3) - interval '5 minutes'
                            AND to_timestamp($3) + interval '5 minutes'
       LIMIT 1`,
      [userId, rec.question, tsSec],
    )
    if (dup.rows.length) {
      skipped += 1
      continue
    }

    await saveRecord(db, userId, {
      category: rec.category,
      question: rec.question,
      benName: rec.benName,
      bianName: rec.bianName || null,
      changingLine: Number(rec.changingLine) || 0,
      benChar: rec.benChar,
      bianChar: rec.bianChar,
      yao: rec.yao,
      createdAt: rec.createdAt,
      fromCache: true,
      result: {
        text: rec.interpretation || '',
        sections: Array.isArray(rec.sections) ? rec.sections : [],
        followUp: rec.followUp ?? null,
        facts: rec.facts ?? null,
      },
    })
    imported += 1
  }

  return { imported, skipped, total: list.length }
}

async function appendFollowUpMessages(db, userId, recordId, userMessage, assistantReply, persona) {
  const row = (
    await db.query('SELECT ai_response FROM divinations WHERE id=$1 AND user_id=$2', [
      recordId,
      userId,
    ])
  ).rows[0]
  if (!row) return false

  const ai = parseAiResponse(row.ai_response) || {}
  const messages = Array.isArray(ai.followUpMessages) ? ai.followUpMessages : []
  const now = new Date().toISOString()
  messages.push({ role: 'user', content: userMessage, createdAt: now, persona })
  messages.push({ role: 'assistant', content: assistantReply, createdAt: now, persona })

  ai.followUpMessages = messages.slice(-40)

  await db.query('UPDATE divinations SET ai_response=$1 WHERE id=$2 AND user_id=$3', [
    JSON.stringify(ai),
    recordId,
    userId,
  ])
  return true
}

function rowToHistoryRecord(row) {
  const ai = parseAiResponse(row.ai_response)
  const meta = ai?.meta || {}
  const hex = resolveHexMeta(meta, ai?.facts)
  const benEntry = getGuaci(row.gua_id) || hex.benEntry
  const bianEntry = row.bian_gua_id ? getGuaci(row.bian_gua_id) : hex.bianEntry

  return {
    id: String(row.id),
    createdAt: new Date(row.created_at).getTime(),
    category: row.question_category,
    question: row.question_text,
    benName: hex.benName || benEntry?.name || '?',
    benChar: hex.benChar || benEntry?.char || '?',
    bianName: hex.bianName || bianEntry?.name,
    bianChar: hex.bianChar || bianEntry?.char,
    changingLine: meta.changingLine ?? row.changing_line ?? 0,
    yao: meta.yao || [],
    interpretation: ai?.text || '',
    sections: Array.isArray(ai?.sections) ? ai.sections : [],
    followUp: ai?.followUp ?? null,
    facts: ai?.facts ?? null,
    followUpMessages: ai?.followUpMessages ?? [],
  }
}

async function listHistoryRecords(db, userId, { page = 1, limit = 20, category } = {}) {
  const safeLimit = Math.min(50, Math.max(1, limit))
  const offset = (Math.max(1, page) - 1) * safeLimit
  const params = [userId]
  let where = 'WHERE user_id=$1'

  if (category) {
    params.push(category)
    where += ` AND question_category=$${params.length}`
  }

  params.push(safeLimit, offset)
  const result = await db.query(
    `SELECT id, gua_id, bian_gua_id, changing_line, question_category,
            question_text, ai_response, created_at,
            COUNT(*) OVER() AS total_count
     FROM divinations
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  )

  const total = result.rows.length ? Number(result.rows[0].total_count) : 0
  return {
    records: result.rows.map(rowToHistoryRecord),
    total,
    page: Math.max(1, page),
  }
}

function mapAdminDivinationRow(row) {
  const ai = parseAiResponse(row.ai_response)
  const benEntry = getGuaci(row.gua_id)
  const bianEntry = row.bian_gua_id ? getGuaci(row.bian_gua_id) : null
  const meta = ai?.meta || {}
  const text = ai?.text || ''
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userNickname: row.user_nickname,
    isGuest: row.is_guest,
    category: row.question_category,
    question: row.question_text,
    benName: meta.benName || benEntry?.name,
    bianName: meta.bianName || bianEntry?.name,
    changingLine: meta.changingLine ?? row.changing_line,
    createdAt: row.created_at,
    interpretationPreview: text.slice(0, 200),
    hasFullInterpretation: text.length > 0,
    followUpMessageCount: Array.isArray(ai?.followUpMessages) ? ai.followUpMessages.length : 0,
  }
}

module.exports = {
  parseAiResponse,
  saveRecord,
  importLocalRecords,
  appendFollowUpMessages,
  rowToHistoryRecord,
  listHistoryRecords,
  mapAdminDivinationRow,
}
