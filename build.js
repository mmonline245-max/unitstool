// Simple SSG for UnitsTool (reads blog posts from /content/blog/*.md using marked)
const fs = require('fs-extra');
const ejs = require('ejs');
const path = require('path');
const slugify = require('slugify');
const marked = require('marked');

const DIST = path.join(__dirname, 'dist');
const TEMPLATE = path.join(__dirname, 'templates', 'tool.ejs');
const INDEX_TEMPLATE = path.join(__dirname, 'templates', 'index.ejs');
const BLOG_TEMPLATE = path.join(__dirname, 'templates', 'blog.ejs');
const POST_TEMPLATE = path.join(__dirname, 'templates', 'post.ejs');

async function readMarkdownPosts() {
  const dir = path.join(__dirname, 'content', 'blog');
  const files = (await fs.readdir(dir)).filter(f=>f.endsWith('.md'));
  const posts = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), 'utf8');
    // simple frontmatter parse
    const m = raw.match(/^---\\n([\\s\\S]*?)\\n---\\n([\\s\\S]*)$/);
    if (!m) continue;
    const yaml = m[1];
    const body = m[2];
    const meta = {};
    yaml.split(/\\n/).forEach(line=>{
      const idx = line.indexOf(':');
      if (idx>0) {
        const key = line.slice(0,idx).trim();
        let val = line.slice(idx+1).trim();
        if (val.startsWith('\"') && val.endsWith('\"')) val = val.slice(1,-1);
        meta[key]=val;
      }
    });
    meta.html = marked.parse(body);
    posts.push(meta);
  }
  // sort by date desc
  posts.sort((a,b)=> new Date(b.date) - new Date(a.date));
  return posts;
}

async function build() {
  await fs.remove(DIST);
  await fs.copy('public', DIST);
  const tools = await fs.readJson('content/tools.json');
  const categories = [...new Set(tools.map(t => t.category))];

  // Build index
  const indexT = await fs.readFile(INDEX_TEMPLATE, 'utf8');
  const indexHtml = ejs.render(indexT, { tools, categories, site: SITE });
  await fs.outputFile(path.join(DIST, 'index.html'), indexHtml);

  // Build categories pages
  for (const cat of categories) {
    const catSlug = slugify(cat, { lower: true });
    const catHtml = ejs.render(indexT, { tools: tools.filter(t => t.category===cat), categories, currentCategory: cat, site: SITE });
    await fs.outputFile(path.join(DIST, 'category-' + catSlug + '.html'), catHtml);
  }

  // Build tool pages
  const tmpl = await fs.readFile(TEMPLATE, 'utf8');
  for (const t of tools) {
    const slug = slugify(t.name, { lower: true });
    const html = ejs.render(tmpl, { tool: t, site: SITE });
    await fs.outputFile(path.join(DIST, 'tools', slug + '.html'), html);
  }

  // Build blog list + posts from markdown
  const posts = await readMarkdownPosts();
  const blogT = await fs.readFile(BLOG_TEMPLATE, 'utf8');
  const blogIndex = ejs.render(blogT, { posts, site: SITE });
  await fs.outputFile(path.join(DIST, 'blog', 'index.html'), blogIndex);
  for (const p of posts) {
    const pslug = slugify(p.title, { lower: true });
    const postHtml = ejs.render(await fs.readFile(POST_TEMPLATE, 'utf8'), { post: p, site: SITE });
    await fs.outputFile(path.join(DIST, 'blog', pslug + '.html'), postHtml);
  }

  // sitemap
  const urls = [];
  urls.push({ loc: '/', lastmod: new Date().toISOString() });
  for (const t of tools) { urls.push({ loc: '/tools/' + slugify(t.name, { lower: true }) + '.html', lastmod: new Date().toISOString() }); }
  for (const p of posts) { urls.push({ loc: '/blog/' + slugify(p.title, { lower: true }) + '.html', lastmod: p.date || new Date().toISOString() }); }
  const sitemap = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${urls.map(u => `  <url>\n    <loc>https://unitstool.com${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`).join('\n')}\n</urlset>`;
  await fs.outputFile(path.join(DIST, 'sitemap.xml'), sitemap);

  // robots
  await fs.outputFile(path.join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://unitstool.com/sitemap.xml');

  console.log('Built site in', DIST);
}

const SITE = {
  name: 'UnitsTool',
  domain: 'unitstool.com',
  tagline: 'Smart Tools for Everyday Calculations',
  description: 'Free online calculators & converters for everyday use.'
};

build().catch(err => { console.error(err); process.exit(1); });
