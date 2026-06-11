import fs from 'fs';
import path from 'path';

const url = 'https://congcutoanhoc.com/api/data.js.php';

async function scrapeTools() {
  console.log(`[Scraping] Fetching ${url} ...`);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch API: ${response.statusText}`);
  }
  
  let text = await response.text();
  console.log(`[Scraping] Got ${text.length} bytes of JS data.`);

  // Extract the JSON part from 'const csvData = [...]'
  const jsonMatch = text.match(/const\s+csvData\s*=\s*(\[\s*\{[\s\S]*\}\s*\])\s*;/);
  if (!jsonMatch) {
     throw new Error("Could not find JSON array in the response");
  }

  const rawData = JSON.parse(jsonMatch[1]);
  console.log(`[Scraping] Found ${rawData.length} items in API.`);

  const tools = [];
  const seenIds = new Set();

  for (const item of rawData) {
    let link = item["Link"];
    let name = item["Tên công cụ"];
    let topic = item["Nội dung chi tiết"] || item["Mạch kiến thức"] || 'general';
    let gradeLevel = parseInt(item["Khối"]) || 10;
    
    if (!link || !name) continue;

    // Remove whitespace from link
    link = link.trim();

    // Generate ID
    const urlObj = new URL(link);
    let id = "";
    if (link.includes("geogebra.org")) {
      id = "geogebra_" + urlObj.pathname.split('/').pop().replace(/[^a-zA-Z0-9]/g, '');
    } else {
      id = path.basename(urlObj.pathname, '.php').replace(/[^a-zA-Z0-9_-]/g, '');
    }
    
    if (!id || id.length < 2) id = "tool_" + Math.random().toString(36).substring(7);

    if (seenIds.has(id)) {
      id = id + "_" + Math.floor(Math.random() * 1000);
    }
    seenIds.add(id);

    tools.push({
      id: id,
      name: name,
      url: link,
      source: link.includes('geogebra') ? 'geogebra' : 'congcutoanhoc',
      embedMode: 'iframe',
      topic: topic,
      gradeLevel: gradeLevel,
      license: 'Nguyễn Cung Hoàng Nam — miễn phí',
      author: 'Nguyễn Cung Hoàng Nam',
      isEmbeddable: true // default, check below
    });
  }

  console.log(`[Scraping] Found ${tools.length} unique tools from HTML.`);

  // Check headers for top 5 (as proof of concept, full check takes too long)
  // For the actual script we should check all, but let's check concurrently.
  console.log(`[Scraping] Checking X-Frame-Options headers...`);
  
  const checkConcurrency = 20;
  for (let i = 0; i < tools.length; i += checkConcurrency) {
    const chunk = tools.slice(i, i + checkConcurrency);
    await Promise.all(chunk.map(async (tool) => {
      try {
        const headRes = await fetch(tool.url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const xFrame = headRes.headers.get('x-frame-options');
        const csp = headRes.headers.get('content-security-policy');
        
        if (xFrame && (xFrame.toUpperCase() === 'DENY' || xFrame.toUpperCase() === 'SAMEORIGIN')) {
          tool.isEmbeddable = false;
        } else if (csp && csp.toLowerCase().includes('frame-ancestors')) {
           tool.isEmbeddable = false;
        } else {
          tool.isEmbeddable = true;
        }
      } catch (e) {
        console.warn(`[Warning] Could not check headers for ${tool.url}`);
        tool.isEmbeddable = false;
      }
    }));
    process.stdout.write('.');
  }
  
  console.log(`\n[Scraping] Header checks completed.`);
  
  const blockedCount = tools.filter(t => !t.isEmbeddable).length;
  console.log(`[Stats] Total tools: ${tools.length} | Embeddable: ${tools.length - blockedCount} | Blocked: ${blockedCount}`);

  const outputPath = path.resolve('src/data/externalToolsData.json');
  fs.writeFileSync(outputPath, JSON.stringify(tools, null, 2), 'utf-8');
  console.log(`[Scraping] Saved results to ${outputPath}`);
}

scrapeTools().catch(console.error);
