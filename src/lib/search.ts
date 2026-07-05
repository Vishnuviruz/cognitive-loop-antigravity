/**
 * Free, lightweight, and keyless DuckDuckGo search utility.
 * Scrapes DuckDuckGo HTML search page to retrieve context grounding.
 */
export async function searchDuckDuckGo(query: string): Promise<string[]> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!res.ok) {
      console.warn('DuckDuckGo search failed with status:', res.status);
      return [];
    }

    const html = await res.text();
    const snippets: string[] = [];
    
    // Match the result__snippet class content
    const regex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      // Decode simple HTML entities and strip tags
      const text = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      
      if (text) {
        snippets.push(text);
      }
    }

    return snippets;
  } catch (err) {
    console.error('Error executing DuckDuckGo search:', err);
    return [];
  }
}
