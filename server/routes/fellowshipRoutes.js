import express from 'express';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const clean = (v, max = 240) => typeof v === 'string' ? v.trim().replace(/[<>]/g, '').slice(0, max) : '';
const corsHeaders = (res) => { res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); };
const dto = (r) => ({ id:r.id, fellowshipName:r.fellowship_name || r.venue || r.chapter || '', country:r.country || '', city:r.city || '', town:r.town || '', area:r.area || '', university:r.university || '', address:r.address || r.venue || '', description:r.description || '', serviceTime:r.service_time || '', latitude:r.latitude == null ? null : Number(r.latitude), longitude:r.longitude == null ? null : Number(r.longitude), isActive:r.is_active !== false, updatedAt:r.updated_at });
const parse = (b) => {
  const fellowshipName=clean(b?.fellowshipName || b?.venue || b?.chapter,180), country=clean(b?.country,80), city=clean(b?.city,100), town=clean(b?.town,100), area=clean(b?.area,120), university=clean(b?.university,180), address=clean(b?.address,240), description=clean(b?.description,500), serviceTime=clean(b?.serviceTime,100), latitude=Number(b?.latitude), longitude=Number(b?.longitude), isActive=b?.isActive !== false;
  if (!fellowshipName) return 'Fellowship name is required.';
  if (!country) return 'Country is required.';
  if (!city && !town) return 'Add a city or town.';
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return 'Enter a valid latitude.';
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return 'Enter a valid longitude.';
  return { fellowshipName,country,city,town,area,university,address,description,serviceTime,latitude,longitude,isActive };
};

router.options('*', (_req,res) => res.sendStatus(204));
router.get('/', async (req,res) => {
  try {
    const q=clean(req.query.q,120).toLowerCase(), country=clean(req.query.country,80).toLowerCase();
    const params=[], where=['is_active = TRUE'];
    if(q){params.push(`%${q}%`);where.push(`LOWER(COALESCE(fellowship_name,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(town,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(university,'') || ' ' || COALESCE(address,'')) LIKE $${params.length}`)}
    if(country){params.push(`%${country}%`);where.push(`LOWER(country) LIKE $${params.length}`)}
    const r=await query(`SELECT * FROM chapter_venues WHERE ${where.join(' AND ')} ORDER BY country, COALESCE(city,town), fellowship_name, id LIMIT 50`,params); res.json({fellowships:r.rows.map(dto)});
  } catch(e){ console.error('[fellowships] public list',e); res.status(503).json({error:'Unable to access fellowship locations right now.'}); }
});

router.use('/admin', authenticateToken, async (req,res,next) => {
  try {
    const result = await query('SELECT is_admin FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [req.user.email]);
    if (result.rows[0]?.is_admin !== true) return res.status(403).json({error:'Administrator authorization is required.'});
    corsHeaders(res);
    next();
  } catch (error) {
    console.error('[fellowships] admin authorization failed', error?.message || error);
    return res.status(503).json({error:'Authentication service temporarily unavailable.'});
  }
});

router.get('/admin', async (_req,res)=>{ try { const r=await query('SELECT * FROM chapter_venues ORDER BY is_active DESC, country, COALESCE(city,town), fellowship_name, id'); res.json({fellowships:r.rows.map(dto)}); } catch(e){console.error('[fellowships] admin list',e);res.status(503).json({error:'Unable to access fellowship locations right now.'});} });
router.post('/admin', async (req,res)=>{ try { const v=parse(req.body); if(typeof v==='string') return res.status(400).json({error:v}); const r=await query(`INSERT INTO chapter_venues (chapter,venue,service_time,fellowship_name,country,city,town,area,university,address,description,latitude,longitude,is_active,updated_at) VALUES ($1,$2,$3,$1,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW()) RETURNING *`,[v.fellowshipName,v.address||v.fellowshipName,v.serviceTime,v.country,v.city,v.town,v.area,v.university,v.address,v.description,v.latitude,v.longitude,v.isActive]); res.status(201).json({fellowship:dto(r.rows[0])}); } catch(e){console.error('[fellowships] create',e);res.status(503).json({error:'Unable to save fellowship location right now.'});} });
router.patch('/admin/:id', async (req,res)=>{ try { const v=parse(req.body); if(typeof v==='string') return res.status(400).json({error:v}); const r=await query(`UPDATE chapter_venues SET chapter=$1,venue=$2,service_time=$3,fellowship_name=$1,country=$4,city=$5,town=$6,area=$7,university=$8,address=$9,description=$10,latitude=$11,longitude=$12,is_active=$13,updated_at=NOW() WHERE id=$14 RETURNING *`,[v.fellowshipName,v.address||v.fellowshipName,v.serviceTime,v.country,v.city,v.town,v.area,v.university,v.address,v.description,v.latitude,v.longitude,v.isActive,Number(req.params.id)]); if(!r.rows.length)return res.status(404).json({error:'Fellowship location not found.'}); res.json({fellowship:dto(r.rows[0])}); } catch(e){console.error('[fellowships] update',e);res.status(503).json({error:'Unable to save fellowship location right now.'});} });
router.delete('/admin/:id', async (req,res)=>{ try { const r=await query('DELETE FROM chapter_venues WHERE id=$1 RETURNING id',[Number(req.params.id)]); if(!r.rows.length)return res.status(404).json({error:'Fellowship location not found.'}); res.json({deleted:true}); } catch(e){console.error('[fellowships] delete',e);res.status(503).json({error:'Unable to delete fellowship location right now.'});} });
export default router;
