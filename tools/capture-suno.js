const { chromium } = require('playwright');
const fs = require('fs');
const OUT = require('path').join(__dirname, '..', 'lessons', 'img') + '/';
const LY = "[Verse]\nבחוג של AI יושבים ולומדים\nאיך המחשב כותב לנו שירים\n\n[Chorus]\nסונו, סונו, שיר לנו עכשיו\nשיר מצחיק שכולם ישירו איתו";
const ST = "happy pop, kids choir, ukulele, funny";
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
  const pg = await ctx.newPage();
  const boxes = {};
  const box = async (name, loc) => { const r = await loc.boundingBox(); if (r) boxes[name] = [r.x, r.y, r.width, r.height].map(v => Math.round(v)); };
  const shot = async (n) => { await pg.waitForTimeout(1200); await pg.screenshot({ path: OUT + n + '.jpg', type: 'jpeg', quality: 82 }); console.log('shot', n); };
  const vis = (sel) => pg.locator(sel).locator('visible=true').first();
  await pg.goto('https://suno.com', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(6000);
  boxes.home = {};
  await box('home.login', vis('button:has-text("Log in")'));
  await box('home.join', vis('button:has-text("Join Suno for free"), a:has-text("Join Suno for free")'));
  await box('home.advanced', vis('text=Advanced'));
  await box('home.prompt', vis('textarea[placeholder="Chat to make music"]'));
  await shot('1-home');
  // login dialog
  try { await vis('button:has-text("Log in")').click(); await pg.waitForTimeout(3000); 
    const g = vis('text=/Google/i'); await box('login.google', g); await shot('2-login'); } catch (e) { console.log('login ERR', String(e).split('\n')[0]); }
  await pg.goto('https://suno.com', { waitUntil: 'domcontentloaded' }); await pg.waitForTimeout(6000);
  await vis('text=Advanced').click(); await pg.waitForTimeout(1500);
  await box('adv.write', vis('text=Write Lyrics'));
  await box('adv.styles', vis('text=Styles'));
  await box('adv.create', vis('button:has-text("Create")'));
  await shot('3-advanced');
  await vis('text=Write Lyrics').click(); await pg.waitForTimeout(800);
  const ly = vis('textarea[placeholder="Add your own lyrics here"]');
  await ly.click(); await ly.fill(LY);
  await box('lyrics.box', ly);
  await shot('4-lyrics');
  await vis('text=Styles').click(); await pg.waitForTimeout(1200);
  const st = vis('textarea[placeholder="Enter style tags"]');
  try { await st.click({ timeout: 5000 }); await st.fill(ST); } catch (e) { console.log('styles ERR', String(e).split('\n')[0]); }
  await st.scrollIntoViewIfNeeded().catch(()=>{});
  await pg.waitForTimeout(800);
  await box('styles.box', st);
  await box('styles.create', vis('button:has-text("Create")'));
  await shot('5-styles');
  await pg.mouse.wheel(0, 400); await pg.waitForTimeout(1200);
  await box('create.box', vis('button:has-text("Create")'));
  await box('create.styles', st);
  await shot('6-create');
  console.log(JSON.stringify(boxes));
  await b.close();
})();
