const axios = require('axios');

async function getImageUrl(query) {
  try {
    const res = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(query)}`);
    const pages = res.data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pageId !== '-1' && pages[pageId].original) {
      return pages[pageId].original.source;
    }
  } catch (e) { }
  
  // Try wikimedia commons search
  try {
    const res = await axios.get(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&format=json`);
    const pages = res.data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pageId && pages[pageId].imageinfo && pages[pageId].imageinfo.length > 0) {
      return pages[pageId].imageinfo[0].url;
    }
  } catch(e) {}
  
  return null;
}

async function main() {
  const queries = [
    "Biryani",
    "Chicken Tikka",
    "Paneer Butter Masala",
    "Naan",
    "Mandi (food)",
    "Shawarma",
    "Kanafeh",
    "Mint lemonade"
  ];
  for (const q of queries) {
    const url = await getImageUrl(q);
    console.log(`${q}: ${url}`);
  }
}

main();
