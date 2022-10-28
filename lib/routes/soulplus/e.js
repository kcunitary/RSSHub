export default {
    async fetch(request, env, ctx) {
        let boardID = 135
        if (request.url) {
            try {
                boardID = getThreadID(request.url)
            } catch {
                //
            }

        }

        const feed = await handle(boardID)

        return new Response(JSON.stringify(feed), {
            headers: {
                'content-type': 'application/feed+json',
            },
        })
    },
};


const moment = require("moment");
const cheerio = require('cheerio');




async function getRSSData(id) {
    const url = `https://www.south-plus.net/rss.php?fid=` + id
    const resp = await fetch(url);
    const raw_rss = await resp.text();
    return raw_rss
}
async function getThreadData(id) {
    const url = `https://www.south-plus.net/simple/index.php?t${id}.html`
    const resp = await fetch(url);
    const raw_html = await resp.text();
    return raw_html
}

function checkItemDate(item) {
    const itemDate = moment(item.pubdate[0])
    return itemDate.isAfter(today)
}

function getThreadID(link) {
    const r = link.match(/\d+$/)
    if (r.length == 0) {
        return -1
    } else {
        return r[0]
    }
}
async function getContent(id) {
    const resp = await getThreadData(id)
    const $ = cheerio.load(resp);
    return $('.card-text').html().trim();
}
async function replaceContent(item) {
    const id = getThreadID(item.link[0])
    const contentData = await getContent(id)
    item.content = contentData
    item.id = id
    return item
}

function toJSONFeed(data) {

    const items = data.item.map(r => {
        const item = {
            id: r.id,
            url: "https:" + r.link[0],
            title: r.title[0],
            content_html: r.content,
            summary: r.description[0],
            date_published: moment(r.pubdate[0]).format(),
            authors: [{ name: r.author[0] }],
            tags: r.categories
        }
        return item
    })
    const feed = {
        version: "https://jsonfeed.org/version/1.1",
        title: data.title[0],
        home_page_url: "https:" + data.link[0],
        items: items
    }
    return feed
}

const xml2js = require('xml2js');
async function handle(id) {
    const feedxml = await getRSSData(id).then(r => xml2js.parseStringPromise(r))
    let channel = feedxml.rss.channel[0]
    let items = channel.item.slice(0, 10)
    if (items.length != 0) {
        items = await Promise.all(items.map(replaceContent))
    }
    channel.item = items

    return toJSONFeed(channel)
} 