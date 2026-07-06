const https = require('https');

function searchWikimedia(query) {
  return new Promise((resolve, reject) => {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&format=json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.query && parsed.query.pages) {
            const pages = parsed.query.pages;
            const pageId = Object.keys(pages)[0];
            resolve(pages[pageId].imageinfo[0].url);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const queries = [
    "Masala Dosa",
    "Idli chutney",
    "Medu Vada",
    "Uttapam",
    "Upma"
  ];
  for (const q of queries) {
    const url = await searchWikimedia(q);
    console.log(`${q}: ${url}`);
  }
}
run();
