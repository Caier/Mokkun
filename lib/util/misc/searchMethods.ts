import ax, { AxiosRequestConfig } from 'axios';
import $ from 'cheerio';
import https from 'https';
import Utils from '../utils';
const agent = new https.Agent({  
    rejectUnauthorized: false
});

export async function fromBooru(booru: string, tags?: string) {
    async function getSrc(url: string): Promise<gbRet> {
        let req;
        try {
            req = await ax.get(url, { httpsAgent: agent });
        } catch {
            throw Error(base + " nie istnieje 😡");
        }
        let body = req.data;
        let link = ((fur && !r34) ? "https://images.weserv.nl/?url=" : '') + $("#image", body).attr('src')?.replace("furry.booru.org/", "190.2.148.183");
        let tags = fur ? $("#image", body).attr('alt') : $("#tags", body).text();
        let comments: any[] = [];
        if(!link || link == 'undefined') {
            link = $("#gelcomVideoPlayer > source", body).attr('src');
            tags = "video";
        }
        if(!link)
            return await getSrc(base + `index.php?page=post&s=random`);
       
        $(r34 ? '#comment-list > div[id^="c"]' : fur ? '#content div[id^="c"]' : '#note-container > div[id^="c"]', body).each((i, elem) => {
            comments.push({
                name: $('a', elem).eq(0).text(),
                score: +$(elem).text().replace(/\n/g, '').split("Score: ").pop().split("(v")[0].trim(),
                comment: $(elem).text().replace(/\n/g, '').split(r34 ? "mment)" : "spam)").pop().split('posts[')[0].trim()
            });
        });
        comments = comments.sort((a,b) => b.score - a.score);
        
        let stats = fur ? $('#stats', body).text() : $('#tag_list', body).text();
        return {
            base,
            page: req.request.res.responseUrl,
            link: link,
            tags: tags,
            score: stats.split('Score:')[1].split('(')[0].trim(),
            rating: stats.split('Rating:')[1].split('Sc')[0].trim(),
            posted: stats.split('Posted:')[1].split(fur ? 'b' : 'B')[0].trim(),
            id: stats.split('Id:')[1].split('P')[0].trim(),
            artist: stats.split(fur ? 'by' : 'By:')[1].split('S')[0].trim() || 'Unknown',
            comments: comments
        };
    }

    booru = booru.toLowerCase().trim().replace(/\W/g, '');
    let r34 = booru == 'r34';
    let fur = r34 || booru == 'furry';
    let base = r34 ? 'https://rule34.xxx/' : fur ? `https://190.2.148.183/` : `https://${booru}.booru.org/`;
    
    if(!tags)
        return [await getSrc(base + 'index.php?page=post&s=random')];
    
    let body, links: string[] = [];
    try {
        body = (await ax.get(base + `index.php?page=post&s=list&tags=${encodeURI(tags.replace(/ /g, "+"))}`, { httpsAgent: agent })).data;
    } catch {
        throw Error(base + " nie istnieje 😡");
    }
    let post = +$(!fur ? '#paginator > a' : "#paginator > div > a", body).last().attr('href')?.replace(/\D/g, '') || 0;
    if(post > (r34 ? 200000 : 2000000)) post = (r34 ? 200000 : 2000000);
    post = (post > (r34 ? 42 : fur ? 40 : 20)) ? Utils.rand(0, post) : 0;

    body = (await ax.get(base + `index.php?page=post&s=list&tags=${encodeURI(tags.replace(/ /g, "+"))}&pid=${post}`, { httpsAgent: agent })).data;
    $(!fur ? ".content > div > div > span > a" : ".content > div > span a", body).each((i, elem) => links.push(base + $(elem).attr('href')));
    
    return links.length ? [await getSrc(links[Utils.rand(0, links.length - 1)])] : [];
}

interface gbRet {
    base?: string
    page: string
    link: string,
    tags: string,
    score: string,
    rating: string,
    posted: string,
    id: string,
    artist: string,
    comments: {
        name: string,
        score: number,
        comment: string
    }[]
}

export async function fromGB(tags?: string, rand = true) {
    let options: AxiosRequestConfig = {
        headers: {
            'cookie': 'fringeBenefits=yup'
        }
    }
    async function getSrc(url: string): Promise<gbRet>
        {
            async function getComs(body: string, noRq?: boolean) {
                if(!noRq) body = (await ax.get(body, options)).data;
                
                $(".comment-box td:nth-child(2)", body.toString()).each((i,elem) => {
                    comments.push({
                        name: $('a', elem).eq(0).text(),
                        score: +$(elem).text().split("   Score: ").pop().split(" (Vote Up)")[0],
                        comment: $(elem).text().split("(Vote Up)").pop()
                    });
                });
            }
            let req = await ax.get(url, options);
            
            let body = req.data;
            let link = $("#image", body.toString()).attr('src');
            let tags = $(".image-container.note-container", body.toString()).attr('data-tags');
            let comments: any[] = [];
            let commentJobs: any[] = [];
            if(!link) {
                link = $("#gelcomVideoPlayer > source", body.toString()).attr('src');
                tags = "video";
            }
            if(!link)
                return await getSrc(`http://gelbooru.com/index.php?page=post&s=random`);
           
            await getComs(body, true);
            
            $(".pagination > a", body.toString()).each((i, elem) => commentJobs.push('https://gelbooru.com/index.php' + $(elem).attr('href')));
            for (let x of commentJobs)
                await getComs(x);
            comments = comments.sort((a,b) => b.score - a.score);
            let stats = $('#tag-list > li', body).text().split('Statistics')[1];
            return {
                    page: req.request.res.responseUrl,
                    link: link,
                    tags: tags,
                    score: stats.split('Score: ')[1].replace(/\D/g, ''),
                    rating: stats.split('Rating: ')[1].split('Score')[0],
                    posted: stats.split('Posted: ')[1].split('Upl')[0].trim(),
                    id: stats.split('Id: ')[1].split('P')[0],
                    artist: $('.tag-type-artist > a', body).text() || 'Unknown',
                    comments: comments
                   };
        }
        let imglinks: string[] = [];
        let ret = [];
        
        if(!tags) 
        {
            ret.push(() => getSrc(`http://gelbooru.com/index.php?page=post&s=random`));
            return ret;
        }
        
        let body = (await ax.get(`http://gelbooru.com/index.php?page=post&s=list&tags=${encodeURI(tags.replace(/ /g, "+"))}${rand ? '%20sort:random' : ''}`, options)).data;
        
        $(".thumbnail-preview > a", body.toString()).each((i, elem) => {
            imglinks.push($(elem).attr('href'));
        });
        
        if(imglinks.length > 0 && rand) {
            let rand = Math.floor(Math.random() * (imglinks.length - 1));
            ret.push(() => getSrc(encodeURI(imglinks[rand])));
        }
        else if(imglinks.length > 0) {
            ret.push(...imglinks.map(l => () => getSrc(encodeURI(l))));
        }
    
        return ret;
}

export async function fromNH(src?: string, tags?: string) {
    async function fromSearch(tags: string)
    {
        let body = (await ax.get("https://nhentai.net/search/?q=" + encodeURI(tags.replace(/ /g, "+")))).data;
        let max = Math.ceil(parseInt($("#content > h1", body.toString()).text().replace(/[ ,A-z]/g, "")) / 25);
        if(!max) return;
        
        body = (await ax.get(`https://nhentai.net/search/?q=${encodeURI(tags.replace(/ /g, "+"))}&page=${Math.floor(Math.random() * max) + 1}`)).data;
        
        let elems = $("#content > div.container.index-container > div > a", body.toString()).get().length;
        return "https://nhentai.net" + $("#content > div.container.index-container > div > a", body.toString()).eq(Math.floor(Math.random() * elems)).attr('href');
    }
    let url = (src) ? src : (tags) ? await fromSearch(tags) : "https://nhentai.net/random";
    if(!url) return;
    let body = (await ax.get(url)).data;
    if(!body) return;
    let ret = {
        "link": "https://nhentai.net" + $("#cover > a", body.toString()).attr('href').slice(0, -2),
        "name": $("#info > h1", body.toString()).text(),
        "tags": $(".tag-container:nth-child(3) .name", body.toString()).map((i, elem) => $(elem).text()).toArray().join(', '),
        "thumb": $("#cover > a > img", body.toString()).attr('data-src'),
        "maxPage": +$(".tag-container:nth-child(8) .name", body.toString()).text(),
        "format": $(".thumb-container > a > img", body.toString()).eq(1).attr('data-src').split(".").pop()
    };
    return ret;
}

export async function fromPH(gay?: boolean, tags?: string, much?: number) {
    let body = (await ax.get(`https://www.pornhub.com/${gay ? 'gay/' : ''}video/search?search=${encodeURI(tags.replace(/ /g, '+'))}`, {headers: {"user-agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/41.0.2228.0 Safari/537.36"}})).data;
    try {body = body.toString();}
    catch (e) {return [];}
    let links: { link: string; title: string; thumb: string; duration: string; }[] = [];
    $("#videoSearchResult div.img.fade.videoPreviewBg.fadeUp > a", body).each((i, elem) => {
        links.push({
                        "link": "https://www.pornhub.com" + $(elem).attr('href'),
                        "title": $(elem).attr('title'),
                        "thumb": $(elem).children('img').attr("data-thumb_url"),
                        "duration": $(elem).parent().children('.marker-overlays').text().replace(/[ \nA-z]/g, "")
                    });
    });
    much = (!much) ? 1 : (much > 5) ? 5 : much;
    while(links.length > much)
        links.splice(Math.floor(Math.random() * (links.length)), 1);
    
    return links;
}