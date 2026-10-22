// POST /api/upload-report — sube el boletín trimestral del colegio presencial (modalidad B) a la carpeta SIS "03 Extensión Local".
// Cabeceras: x-el-token (token firmado del SIS), x-el-quarter (Q1-Q3), x-el-school, x-el-grade (0-100, opcional), x-el-filename. Cuerpo: el archivo (≤ 4 MB).
// Variables de entorno en Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. El token se valida en la base (ext_local_verify_token); la clave de servicio nunca sale de aquí.
const MAX = 4 * 1024 * 1024;
const TYPES = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const sig = (b) => b.slice(0, 4).toString('hex');
const MAGIC = { pdf: (b) => b.slice(0, 4).toString() === '%PDF', jpg: (b) => sig(b).startsWith('ffd8ff'), png: (b) => sig(b) === '89504e47', webp: (b) => b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP' };
const readBody = (req) => new Promise((resolve, reject) => {
  if (Buffer.isBuffer(req.body)) return resolve(req.body);
  const chunks = []; let n = 0;
  req.on('data', (c) => { n += c.length; if (n > MAX + 1024) { reject(new Error('too-large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});
const dec = (v) => { try { return decodeURIComponent(String(v || '')); } catch { return ''; } };

module.exports = async function handler(req, res) {
  const json = (code, body) => res.status(code).json(body);
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Método no permitido' });
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(500, { ok: false, error: 'El servidor no está configurado (falta SUPABASE_SERVICE_ROLE_KEY).' });

  const quarter = String(req.headers['x-el-quarter'] || '');
  if (!['Q1', 'Q2', 'Q3'].includes(quarter)) return json(400, { ok: false, error: 'Trimestre no válido.' });
  const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return json(415, { ok: false, error: 'Formato no permitido (PDF, JPG, PNG o WebP).' });
  let buf;
  try { buf = await readBody(req); } catch (e) { return json(413, { ok: false, error: 'El archivo supera 4 MB.' }); }
  if (!buf || !buf.length) return json(400, { ok: false, error: 'Archivo vacío.' });
  if (buf.length > MAX) return json(413, { ok: false, error: 'El archivo supera 4 MB.' });
  if (!MAGIC[ext](buf)) return json(415, { ok: false, error: 'El contenido no coincide con el formato del archivo.' });
  const gradeRaw = String(req.headers['x-el-grade'] || '').trim();
  const grade = gradeRaw === '' ? null : Number(gradeRaw);
  if (grade !== null && !(grade >= 0 && grade <= 100)) return json(400, { ok: false, error: 'La nota debe estar entre 0 y 100.' });

  const H = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const v = await fetch(`${url}/rest/v1/rpc/ext_local_verify_token`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: String(req.headers['x-el-token'] || '') }) });
    if (!v.ok) return json(401, { ok: false, error: 'Enlace no válido o vencido. Vuelve a abrir el módulo desde el SIS.' });
    const [who] = await v.json();
    if (!who?.student_id) return json(401, { ok: false, error: 'Enlace no válido o vencido.' });

    const base = dec(req.headers['x-el-filename']).replace(/\.[^.]+$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'boletin';
    const fileName = `${quarter}-${Date.now()}-${base}.${ext}`;
    const path = `${who.student_id}/03 Extensión Local/${who.school_year}/${fileName}`;
    const up = await fetch(`${url}/storage/v1/object/student-folders/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { ...H, 'Content-Type': type, 'x-upsert': 'false' }, body: buf });
    if (!up.ok) return json(502, { ok: false, error: 'No se pudo guardar el archivo en el SIS.' });

    const reg = await fetch(`${url}/rest/v1/rpc/register_extension_local_report`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_student_id: who.student_id, p_school_year: who.school_year, p_quarter: quarter, p_school_name: dec(req.headers['x-el-school']).slice(0, 200) || null, p_school_grade: grade, p_file_path: path, p_file_name: fileName }) });
    if (!reg.ok) return json(502, { ok: false, error: 'El archivo se guardó pero no se pudo registrar. Avisa a administración.' });
    return json(200, { ok: true, file_name: fileName });
  } catch (e) {
    return json(502, { ok: false, error: 'No se pudo contactar con el SIS.' });
  }
};
module.exports.config = { api: { bodyParser: false } }; // leemos el cuerpo en bruto (PDF/imagen)
