// Cloudflare Pages Function: /api/lang
// 根据 request.cf.country 返回建议语言
// 中文区(CN/HK/MO/TW)返回 zh,其他返回 en

const CHINESE_REGIONS = new Set(['CN', 'HK', 'MO', 'TW']);

export const onRequestGet = async ({ request }) => {
    const country = (request.cf && request.cf.country) || 'XX';
    const lang = CHINESE_REGIONS.has(country) ? 'zh' : 'en';
    return new Response(JSON.stringify({ country, lang }), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
};
