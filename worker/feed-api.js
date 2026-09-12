import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
function bearerToken(request) { const header = request.headers.get('authorization') || request.headers.get('Authorization') || ''; return header.startsWith('Bearer ') ? header.slice(7).trim() : ''; }
function getEmail(request, env) { const token = bearerToken(request); const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : ''; if (!token || !secret) return ''; try { const payload = jwt.verify(token, secret); return typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : ''; } catch { return ''; } }
async function getDb(env) { const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || ''; if (!connectionString) throw new Error('Database connection is not configured.'); const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect(); return client; }
function parseId(value) { const id = Number.parseInt(String(value), 10); return Number.isSafeInteger(id) && id > 0 ? id : 0; }
function parseFeedId(value) { const raw = String(value || ''); if (raw.startsWith('p:')) return { kind: 'post', id: parseId(raw.slice(2)) }; if (raw.startsWith('s:')) return { kind: 'sermon', id: parseId(raw.slice(2)) }; return { kind: 'sermon', id: parseId(raw) }; }
function youtubeId(value) { if (typeof value !== 'string') return ''; const patterns = [/(?:youtube\.com\/watch\?v=)([\w-]{11})/i,/(?:youtu\.be\/)([\w-]{11})/i,/(?:youtube(?:-nocookie)?\.com\/embed\/)([\w-]{11})/i,/(?:youtube\.com\/shorts\/)([\w-]{11})/i,/(?:youtube\.com\/live\/)([\w-]{11})/i]; for (const pattern of patterns) { const match = value.match(pattern); if (match) return match[1]; } return ''; }
async function authorName(client, email) { const result = await client.query('SELECT full_name FROM public.users WHERE LOWER(email) = $1 LIMIT 1', [email]); return String(result.rows[0]?.full_name || email).trim().slice(0, 120); }
async function canViewOwnPostInsights(client, email) { if (!email) return false; const result = await client.query('SELECT is_admin,title FROM public.users WHERE LOWER(email)=LOWER($1) LIMIT 1',[email]); if (!result.rows.length) return false; if (result.rows[0].is_admin) return true; const title = String(result.rows[0].title || '').toLowerCase(); return /leader|secretary|coordinator|pastor|president|director|chair|supervisor|administrator/.test(title); }
async function postSocialCounts(client, id, email) { const [likes,saves,comments,liked,saved,recentLikers] = await Promise.all([client.query('SELECT COUNT(*)::int AS count FROM public.feed_post_likes WHERE post_id = $1',[id]),client.query('SELECT COUNT(*)::int AS count FROM public.feed_post_saves WHERE post_id = $1',[id]),client.query('SELECT COUNT(*)::int AS count FROM public.feed_post_comments WHERE post_id = $1',[id]),client.query('SELECT 1 FROM public.feed_post_likes WHERE post_id = $1 AND LOWER(user_email) = $2 LIMIT 1',[id,email]),client.query('SELECT 1 FROM public.feed_post_saves WHERE post_id = $1 AND LOWER(user_email) = $2 LIMIT 1',[id,email]),recentLikerNames(client,'feed_post_likes','post_id',id)]); return { likeCount: likes.rows[0].count, saveCount: saves.rows[0].count, commentCount: comments.rows[0].count, liked: liked.rows.length > 0, saved: saved.rows.length > 0, recentLikers }; }
async function recentLikerNames(client, table, column, id) { const result = await client.query(`SELECT u.full_name AS name FROM public.${table} l JOIN public.users u ON LOWER(u.email) = LOWER(l.user_email) WHERE l.${column} = $1 ORDER BY l.created_at DESC LIMIT 2`, [id]); return result.rows.map((row) => String(row.name || '').trim()).filter(Boolean); }

export async function handleFeed(request, env, url) {
  if (!url.pathname.startsWith('/api/feed')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  try {
    const email = getEmail(request, env);
    if (url.pathname === '/api/feed' && request.method === 'GET') {
      const rawLimit = Number.parseInt(url.searchParams.get('limit') || '20', 10);
      const rawOffset = Number.parseInt(url.searchParams.get('offset') || '0', 10);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 30);
      const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);
      const followingOnly = url.searchParams.get('following') === '1' && Boolean(email);
      const rawFeedType = url.searchParams.get('type') || '';
      const feedType = rawFeedType === 'reel' || rawFeedType === 'ministry' ? rawFeedType : '';
      const client = await getDb(env);
      try {
        const canSeeViews = await canViewOwnPostInsights(client,email);
        const result = await client.query(`SELECT * FROM (
          SELECT CONCAT('s:',s.id) AS id,s.title,s.speaker AS author,s.description AS body,s.youtube_url,NULL::text AS media_url,NULL::text AS media_type,s.created_at,s.is_featured,'sermon' AS type,'sermon' AS source_type,false AS is_user_post,false AS is_owner,false AS following,NULL::text AS author_email,0::int AS view_count,
          (SELECT COUNT(*)::int FROM public.feed_likes x WHERE x.sermon_id=s.id) AS like_count,
          (SELECT COUNT(*)::int FROM public.feed_comments x WHERE x.sermon_id=s.id) AS comment_count,
          (SELECT COUNT(*)::int FROM public.feed_saves x WHERE x.sermon_id=s.id) AS save_count,
          CASE WHEN $1 <> '' AND EXISTS(SELECT 1 FROM public.feed_likes x WHERE x.sermon_id=s.id AND LOWER(x.user_email)=$1) THEN true ELSE false END AS liked,
          CASE WHEN $1 <> '' AND EXISTS(SELECT 1 FROM public.feed_saves x WHERE x.sermon_id=s.id AND LOWER(x.user_email)=$1) THEN true ELSE false END AS saved,
          (SELECT COALESCE(array_agg(name),'{}') FROM (SELECT u.full_name AS name FROM public.feed_likes x JOIN public.users u ON LOWER(u.email)=LOWER(x.user_email) WHERE x.sermon_id=s.id ORDER BY x.created_at DESC LIMIT 2) t) AS recent_likers
          FROM public.sermons s
          UNION ALL
          SELECT CONCAT('p:',p.id) AS id,p.title,p.author_name AS author,p.body,p.youtube_url,p.media_url,p.media_type,p.created_at,false AS is_featured,p.type,'user' AS source_type,true AS is_user_post,
          CASE WHEN $1 <> '' AND LOWER(p.user_email)=LOWER($1) THEN true ELSE false END AS is_owner,
          CASE WHEN $1 <> '' AND EXISTS(SELECT 1 FROM public.feed_user_follows f WHERE LOWER(f.follower_email)=LOWER($1) AND LOWER(f.followed_email)=LOWER(p.user_email)) THEN true ELSE false END AS following,
          p.user_email AS author_email,
          CASE WHEN $1 <> '' AND LOWER(p.user_email)=LOWER($1) AND $4 THEN (SELECT COUNT(*)::int FROM public.feed_post_views x WHERE x.post_id=p.id AND LOWER(x.user_email)<>LOWER(p.user_email)) ELSE 0 END AS view_count,
          (SELECT COUNT(*)::int FROM public.feed_post_likes x WHERE x.post_id=p.id) AS like_count,
          (SELECT COUNT(*)::int FROM public.feed_post_comments x WHERE x.post_id=p.id) AS comment_count,
          (SELECT COUNT(*)::int FROM public.feed_post_saves x WHERE x.post_id=p.id) AS save_count,
          CASE WHEN $1 <> '' AND EXISTS(SELECT 1 FROM public.feed_post_likes x WHERE x.post_id=p.id AND LOWER(x.user_email)=$1) THEN true ELSE false END AS liked,
          CASE WHEN $1 <> '' AND EXISTS(SELECT 1 FROM public.feed_post_saves x WHERE x.post_id=p.id AND LOWER(x.user_email)=$1) THEN true ELSE false END AS saved,
          (SELECT COALESCE(array_agg(name),'{}') FROM (SELECT u.full_name AS name FROM public.feed_post_likes x JOIN public.users u ON LOWER(u.email)=LOWER(x.user_email) WHERE x.post_id=p.id ORDER BY x.created_at DESC LIMIT 2) t) AS recent_likers
          FROM public.feed_posts p
        ) feed_items WHERE ($5 = false OR following = true) AND ($6 = '' OR ($6 = 'reel' AND type = 'reel') OR ($6 = 'ministry' AND (source_type = 'sermon' OR is_featured = true))) ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[email,limit+1,offset,canSeeViews,followingOnly,feedType]);
        const hasMore = result.rows.length > limit;
        const posts = result.rows.slice(0,limit).map(row => ({ ...row, youtube_id: youtubeId(row.youtube_url) }));
        return json({ posts, hasMore, limit, offset },200,headers);
      } finally { await client.end().catch(()=>{}); }
    }
    if (url.pathname === '/api/feed/posts' && request.method === 'POST') {
      if (!email) return json({ error:'Sign in required to publish to the Feed.' },401,headers);
      const body = await request.json().catch(()=>({}));
      const type = body?.type === 'reel' ? 'reel' : 'post';
      const title = typeof body?.title === 'string' ? body.title.trim().slice(0,160) : '';
      const text = typeof body?.body === 'string' ? body.body.trim().slice(0,5000) : '';
      const imageUrl = typeof body?.imageUrl === 'string' ? body.imageUrl.trim().slice(0,1000) : '';
      const youtubeUrl = typeof body?.youtubeUrl === 'string' ? body.youtubeUrl.trim().slice(0,1000) : '';
      const mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim().slice(0,1500) : '';
      const mediaType = body?.mediaType === 'video' ? 'video' : body?.mediaType === 'image' ? 'image' : '';
      if (!title) return json({ error:'Please add a title.' },400,headers);
      if (!text && !imageUrl && !youtubeUrl && !mediaUrl) return json({ error:'Add some content before publishing.' },400,headers);
      if (type === 'reel' && !youtubeId(youtubeUrl) && !(mediaUrl && mediaType === 'video')) return json({ error:'Choose a video for your Reel.' },400,headers);
      const client = await getDb(env);
      try {
        const name = await authorName(client,email);
        const inserted = await client.query(`INSERT INTO public.feed_posts (user_email,author_name,type,title,body,image_url,youtube_url,media_url,media_type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,user_email,author_name,type,title,body,image_url,youtube_url,media_url,media_type,created_at`,[email,name,type,title,text,imageUrl,youtubeUrl,mediaUrl,mediaType || null]);
        const post = inserted.rows[0];
        return json({ post:{...post,id:`p:${post.id}`,source_type:'user',is_user_post:true,is_owner:true,youtube_id:youtubeId(post.youtube_url),like_count:0,save_count:0,comment_count:0,view_count:0,liked:false,saved:false} },201,headers);
      } finally { await client.end().catch(()=>{}); }
    }
    const followMatch = url.pathname.match(/^\/api\/feed\/users\/([^/]+)\/follow$/);
    if (followMatch && request.method === 'POST') {
      if (!email) return json({ error:'Sign in required to follow members.' },401,headers);
      const followedEmail = decodeURIComponent(followMatch[1] || '').trim().toLowerCase();
      if (!followedEmail || followedEmail === email) return json({ error:'You cannot follow yourself.' },400,headers);
      const client = await getDb(env);
      try {
        const target = await client.query('SELECT 1 FROM public.users WHERE LOWER(email)=LOWER($1) LIMIT 1',[followedEmail]);
        if (!target.rows.length) return json({ error:'Member not found.' },404,headers);
        const current = await client.query('SELECT 1 FROM public.feed_user_follows WHERE LOWER(follower_email)=LOWER($1) AND LOWER(followed_email)=LOWER($2) LIMIT 1',[email,followedEmail]);
        if (current.rows.length) await client.query('DELETE FROM public.feed_user_follows WHERE LOWER(follower_email)=LOWER($1) AND LOWER(followed_email)=LOWER($2)',[email,followedEmail]);
        else await client.query('INSERT INTO public.feed_user_follows(follower_email,followed_email) VALUES($1,$2) ON CONFLICT DO NOTHING',[email,followedEmail]);
        const following = !(current.rows.length > 0);
        return json({ following },200,headers);
      } finally { await client.end().catch(()=>{}); }
    }
    const viewMatch = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)\/view$/);
    if (viewMatch && request.method === 'POST') {
      const feedId = parseFeedId(viewMatch[1]);
      if (feedId.kind !== 'post' || !feedId.id) return json({ error:'Invalid Feed post.' },400,headers);
      if (!email) return json({ error:'Sign in required to view posts.' },401,headers);
      const client = await getDb(env);
      try {
        const inserted = await client.query(`INSERT INTO public.feed_post_views(post_id,user_email) SELECT $1,$2 WHERE EXISTS(SELECT 1 FROM public.feed_posts WHERE id=$1 AND LOWER(user_email)<>LOWER($2)) ON CONFLICT(post_id,user_email) DO NOTHING RETURNING id`,[feedId.id,email]);
        return json({ ok:true,recorded:inserted.rows.length>0 },200,headers);
      } finally { await client.end().catch(()=>{}); }
    }
    if (url.pathname === '/api/feed/reports' && request.method === 'GET') {
      if (!email) return json({ error:'Sign in required.' },401,headers);
      const client = await getDb(env);
      try {
        if (!(await canViewOwnPostInsights(client,email))) return json({ error:'Admins only.' },403,headers);
        const result = await client.query(`SELECT r.id,r.feed_item_id,r.reporter_email,r.reason,r.detail,r.created_at,u.full_name AS reporter_name FROM public.feed_content_reports r LEFT JOIN public.users u ON LOWER(u.email)=LOWER(r.reporter_email) WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 100`);
        return json({ reports: result.rows },200,headers);
      } finally { await client.end().catch(()=>{}); }
    }
    const dismissMatch = url.pathname.match(/^\/api\/feed\/reports\/([^/]+)\/dismiss$/);
    if (dismissMatch && request.method === 'POST') {
      if (!email) return json({ error:'Sign in required.' },401,headers);
      const reportId = parseId(dismissMatch[1]); if (!reportId) return json({ error:'Invalid report.' },400,headers);
      const client = await getDb(env);
      try {
        if (!(await canViewOwnPostInsights(client,email))) return json({ error:'Admins only.' },403,headers);
        const updated = await client.query(`UPDATE public.feed_content_reports SET status='dismissed' WHERE id=$1 RETURNING id`,[reportId]);
        if (!updated.rows.length) return json({ error:'Report not found.' },404,headers);
        return json({ ok:true },200,headers);
      } finally { await client.end().catch(()=>{}); }
    }
    const match = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)(?:\/(like|save|comments|report))?$/);
    if (!match) return json({error:'Not found.'},404,headers);
    const feedId = parseFeedId(match[1]); if (!feedId.id) return json({error:'Invalid post.'},400,headers); const action=match[2]||''; const client=await getDb(env); const canonicalId=`${feedId.kind==='post'?'p':'s'}:${feedId.id}`;
    try {
      if (feedId.kind === 'post') {
        const exists=await client.query('SELECT id FROM public.feed_posts WHERE id=$1 LIMIT 1',[feedId.id]); if(!exists.rows.length)return json({error:'Post not found.'},404,headers);
        if(action==='like'&&request.method==='POST'){if(!email)return json({error:'Sign in required to like posts.'},401,headers);const current=await client.query('SELECT 1 FROM public.feed_post_likes WHERE post_id=$1 AND LOWER(user_email)=$2 LIMIT 1',[feedId.id,email]);if(current.rows.length)await client.query('DELETE FROM public.feed_post_likes WHERE post_id=$1 AND LOWER(user_email)=$2',[feedId.id,email]);else await client.query('INSERT INTO public.feed_post_likes(post_id,user_email) VALUES($1,$2) ON CONFLICT(post_id,user_email) DO NOTHING',[feedId.id,email]);return json(await postSocialCounts(client,feedId.id,email),200,headers);}
        if(action==='save'&&request.method==='POST'){if(!email)return json({error:'Sign in required to save posts.'},401,headers);const current=await client.query('SELECT 1 FROM public.feed_post_saves WHERE post_id=$1 AND LOWER(user_email)=$2 LIMIT 1',[feedId.id,email]);if(current.rows.length)await client.query('DELETE FROM public.feed_post_saves WHERE post_id=$1 AND LOWER(user_email)=$2',[feedId.id,email]);else await client.query('INSERT INTO public.feed_post_saves(post_id,user_email) VALUES($1,$2) ON CONFLICT(post_id,user_email) DO NOTHING',[feedId.id,email]);return json(await postSocialCounts(client,feedId.id,email),200,headers);}
        if(action==='comments'&&request.method==='GET'){const result=await client.query('SELECT id,user_email,author_name,body,created_at FROM public.feed_post_comments WHERE post_id=$1 ORDER BY created_at ASC,id ASC LIMIT 100',[feedId.id]);return json({comments:result.rows},200,headers);}
        if(action==='comments'&&request.method==='POST'){if(!email)return json({error:'Sign in required to comment.'},401,headers);const body=await request.json().catch(()=>({}));const text=typeof body?.body==='string'?body.body.trim().slice(0,1000):'';if(!text)return json({error:'Comment cannot be empty.'},400,headers);const name=await authorName(client,email);const inserted=await client.query('INSERT INTO public.feed_post_comments(post_id,user_email,author_name,body) VALUES($1,$2,$3,$4) RETURNING id,user_email,author_name,body,created_at',[feedId.id,email,name,text]);return json({comment:inserted.rows[0]},201,headers);}
        if(action==='comments'&&request.method==='DELETE'){if(!email)return json({error:'Sign in required.'},401,headers);const commentId=parseId(url.searchParams.get('commentId'));if(!commentId)return json({error:'Invalid comment.'},400,headers);const deleted=await client.query('DELETE FROM public.feed_post_comments c WHERE c.id=$1 AND (LOWER(c.user_email)=$2 OR EXISTS(SELECT 1 FROM public.feed_posts p WHERE p.id=c.post_id AND LOWER(p.user_email)=$2)) RETURNING c.id',[commentId,email]);if(!deleted.rows.length)return json({error:'Comment not found, or you are not allowed to delete it.'},404,headers);return json({ok:true},200,headers);}
        if(action==='report'&&request.method==='POST'){if(!email)return json({error:'Sign in required to report content.'},401,headers);const body=await request.json().catch(()=>({}));const reason=typeof body?.reason==='string'?body.reason.trim().slice(0,60):'';const detail=typeof body?.detail==='string'?body.detail.trim().slice(0,500):'';if(!reason)return json({error:'Please choose a reason.'},400,headers);await client.query('INSERT INTO public.feed_content_reports(feed_item_id,reporter_email,reason,detail) VALUES($1,$2,$3,$4) ON CONFLICT(feed_item_id,reporter_email) DO NOTHING',[canonicalId,email,reason,detail||null]);return json({ok:true},200,headers);}
        return json({error:'Method not allowed.'},405,headers);
      }
      const exists=await client.query('SELECT id FROM public.sermons WHERE id=$1 LIMIT 1',[feedId.id]);if(!exists.rows.length)return json({error:'Post not found.'},404,headers);
      if(action==='like'&&request.method==='POST'){if(!email)return json({error:'Sign in required to like posts.'},401,headers);const current=await client.query('SELECT 1 FROM public.feed_likes WHERE sermon_id=$1 AND LOWER(user_email)=$2 LIMIT 1',[feedId.id,email]);if(current.rows.length)await client.query('DELETE FROM public.feed_likes WHERE sermon_id=$1 AND LOWER(user_email)=$2',[feedId.id,email]);else await client.query('INSERT INTO public.feed_likes(sermon_id,user_email) VALUES($1,$2) ON CONFLICT(sermon_id,user_email) DO NOTHING',[feedId.id,email]);const count=await client.query('SELECT COUNT(*)::int AS count FROM public.feed_likes WHERE sermon_id=$1',[feedId.id]);const liked=await client.query('SELECT 1 FROM public.feed_likes WHERE sermon_id=$1 AND LOWER(user_email)=$2 LIMIT 1',[feedId.id,email]);const recentLikers=await recentLikerNames(client,'feed_likes','sermon_id',feedId.id);return json({liked:liked.rows.length>0,likeCount:count.rows[0].count,recentLikers},200,headers);}
      if(action==='save'&&request.method==='POST'){if(!email)return json({error:'Sign in required to save posts.'},401,headers);const current=await client.query('SELECT 1 FROM public.feed_saves WHERE sermon_id=$1 AND LOWER(user_email)=$2 LIMIT 1',[feedId.id,email]);if(current.rows.length)await client.query('DELETE FROM public.feed_saves WHERE sermon_id=$1 AND LOWER(user_email)=$2',[feedId.id,email]);else await client.query('INSERT INTO public.feed_saves(sermon_id,user_email) VALUES($1,$2) ON CONFLICT(sermon_id,user_email) DO NOTHING',[feedId.id,email]);const count=await client.query('SELECT COUNT(*)::int AS count FROM public.feed_saves WHERE sermon_id=$1',[feedId.id]);const saved=await client.query('SELECT 1 FROM public.feed_saves WHERE sermon_id=$1 AND LOWER(user_email)=$2 LIMIT 1',[feedId.id,email]);return json({saved:saved.rows.length>0,saveCount:count.rows[0].count},200,headers);}
      if(action==='comments'&&request.method==='GET'){const result=await client.query('SELECT id,user_email,author_name,body,created_at FROM public.feed_comments WHERE sermon_id=$1 ORDER BY created_at ASC,id ASC LIMIT 100',[feedId.id]);return json({comments:result.rows},200,headers);}
      if(action==='comments'&&request.method==='POST'){if(!email)return json({error:'Sign in required to comment.'},401,headers);const body=await request.json().catch(()=>({}));const text=typeof body?.body==='string'?body.body.trim().slice(0,1000):'';if(!text)return json({error:'Comment cannot be empty.'},400,headers);const name=await authorName(client,email);const inserted=await client.query('INSERT INTO public.feed_comments(sermon_id,user_email,author_name,body) VALUES($1,$2,$3,$4) RETURNING id,user_email,author_name,body,created_at',[feedId.id,email,name,text]);return json({comment:inserted.rows[0]},201,headers);}
      if(action==='comments'&&request.method==='DELETE'){if(!email)return json({error:'Sign in required.'},401,headers);const commentId=parseId(url.searchParams.get('commentId'));if(!commentId)return json({error:'Invalid comment.'},400,headers);const deleted=await client.query('DELETE FROM public.feed_comments WHERE id=$1 AND LOWER(user_email)=$2 RETURNING id',[commentId,email]);if(!deleted.rows.length)return json({error:'Comment not found, or it is not yours to delete.'},404,headers);return json({ok:true},200,headers);}
      if(action==='report'&&request.method==='POST'){if(!email)return json({error:'Sign in required to report content.'},401,headers);const body=await request.json().catch(()=>({}));const reason=typeof body?.reason==='string'?body.reason.trim().slice(0,60):'';const detail=typeof body?.detail==='string'?body.detail.trim().slice(0,500):'';if(!reason)return json({error:'Please choose a reason.'},400,headers);await client.query('INSERT INTO public.feed_content_reports(feed_item_id,reporter_email,reason,detail) VALUES($1,$2,$3,$4) ON CONFLICT(feed_item_id,reporter_email) DO NOTHING',[canonicalId,email,reason,detail||null]);return json({ok:true},200,headers);}
      return json({error:'Method not allowed.'},405,headers);
    } finally { await client.end().catch(()=>{}); }
  } catch(error) { console.error('[worker] feed API failed',{message:error?.message,path:url.pathname}); return json({error:'Unable to load Feed right now.'},503,headers); }
}
