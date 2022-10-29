const got = require('@/utils/got');
//const Parser = require('@/utils/rss-parser');
const Parser = require('rss-parser');

const dateParser = require('@/utils/dateParser');

const dayjs = require('dayjs');
const cheerio = require('cheerio');
const lifetimes = require('../lifetimes');

const parser = new Parser();

const domian = "https://www.south-plus.net"


function checkItemDate(item, sinceDate) {
    const itemDate = dayjs(item.pubdate)
    const today = dayjs().startOf('day').subtract(1, 'days');
    return itemDate.isAfter(today)
}

async function getRSSdata(id) {
    const resp = await got(`${domian}/rss.php?fid=${id}`)
    let html = resp.data
    html = html.replace("pubdate", "pubDate")
    const feed = await parser.parseString(html);
    return feed
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
    $(".jumbotron").remove()
    let content = $('.card-text').html().trim();
    return content;
}

async function getThreadData(id) {
    const url = `${domian}/simple/index.php?t${id}.html`
    const resp = await got(url);
    const raw_html = await resp.data;
    return raw_html
}


async function replaceContent(item) {
    const id = getThreadID(item.link)
    item.description = await getContent(id)
    item.guid = id
    return item
}

async function handle(id, sinceDate) {
    let feed = await getRSSdata(id)
    //    console.log(feed.items)
    //    let items = feed.items.filter(checkItemDate)
    let items = feed.items.slice(0, 50)
    if (items.length != 0) {
        items = await Promise.all(items.map(replaceContent))
        items.map(r => {
            r.puDdate = r.pubdate
            delete r.pubdate
            return r
        }
        )
        feed.items = items
        const feedData = makeRSS(feed)
        return feedData
    } else {
        return null
    }
}

module.exports = async (ctx) => {
    const id = ctx.params.id;
    const data = await handle(id)
    ctx.state.data = data
}


function makeRSS(data) {

    return {
        // 源标题
        title: data.title,
        // 源链接
        link: data.link,
        // 源说明
        description: data.description,
        //遍历此前获取的数据
        item: data.items
    };
}