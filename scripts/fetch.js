require('dotenv').config({path: '.env.local'});

const axios = require('axios')
const fs = require('fs')
const {JSDOM} = require("jsdom");
const {window} = new JSDOM("");
const $ = require("jquery")(window);
const convert = require('html-to-jsx')
const log = require('node-pretty-log');
const matter = require('gray-matter');

axios.get('https://hsuan-blog-priv.blogspot.com/feeds/posts/default?alt=json').then((r) => {
    // check updated
    let data = String(fs.readFileSync('data/last'))
    if (data !== r.data.feed.updated.$t) {
        r.data.feed.entry.map(x => ({
            title: x.title.$t,
            content: convert(x.content.$t),
            date: x.published.$t,
            lastmod: x.updated.$t,
            summary: convert($((x.content.$t.split('<a name=\'more\'></a>')[0] ?? '').replaceAll('&nbsp;', '')).text()) ?? '',
            tags: x.category.map(t => t.term) ?? [],
            authors: x.author.map(t => t.name.$t) ?? [],
        })).forEach(data => {
            const content = matter.stringify(
                data.content,
                Object.keys(data)
                    // 過濾不需要的內容
                    .filter(key => !['content'].includes(key))
                    .reduce((o, k) => {
                        o[k] = data[k];
                        return o;
                    }, {})
            )
            if (!fs.existsSync('data/blog')) fs.mkdirSync('data/blog', {recursive: true})
            const filePath = `data/blog/${data.title.replace(/ /g, '-').replace(/-+/g, '-') ?? 'untitled'}.mdx`

            if (fs.existsSync(filePath)) {
                // File exist
                let f = matter(String(fs.readFileSync(filePath)))
                if (f.data?.force) {
                    log('warn', `Post '${data.title}' existed and force changed, skipping.`)
                    return
                }
            }
            fs.writeFile(filePath, content, {flag: 'w'}, (err) => {
                if (err) {
                    throw err
                } else {
                    log('info', `Post '${data.title}' generated successfully at ${filePath}`)
                }
            })

        })

        fs.writeFile('data/last', r.data.feed.updated.$t, function () {
            log('info', `FEED DATE LOGGED ${r.data.feed.updated.$t}`)
        })
    } else {
        log('info', `nothing new`)
    }
})