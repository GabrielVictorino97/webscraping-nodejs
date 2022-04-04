const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { resolve } = require('path');
const BASE_URL = 'https://gamefaqs.gamespot.com'


const browserHeader = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'cache-control': 'max-age=0',
    'cookie': 'gf_dvi=ZjYyNGEzNTYwMDA5ZmYwMDM0YzYwZjMxNmRhY2U3OWNjMzVhZWE0MTc0YWI5NDE0NjJmOWYwZjMxYjBlNjI0YTM1NjA%3D; gf_geo=MjAxLjEuMTQzLjk5Ojc2OjcyNg%3D%3D; fv20220404=1; spt=yes; _BB.bs=p|3; AMCVS_3C66570E5FE1A4AB0A495FFC%40AdobeOrg=1; s_vnum=1651622497894%26vn%3D1; s_invisit=true; s_lv_undefined_s=First%20Visit; chsn_cnsnt=gamefaqs.gamespot.com%3AC0001%2CC0002%2CC0003%2CC0004%2CC0005; tglr_sess_id=ce5fe913-5bd5-41f4-9329-9e9c78bdbf58; tglr_req=https://gamefaqs.gamespot.com/; tglr_ref=https://www.google.com/; tglr_sess_count=1; tglr_tenant_id=src_1kYs5kGF0gH8ObQlZU8ldA7KFYZ; tglr_anon_id=3c425d62-a438-4b7a-b2f2-f05fb01e1e97; cohsn_xs_id=fcb2f8a2-b7e6-45ef-b5e6-0adbf6fb86dc; s_cc=true; AMCV_3C66570E5FE1A4AB0A495FFC%40AdobeOrg=1585540135%7CMCIDTS%7C19087%7CMCMID%7C39901097108939777003545340207095463304%7CMCAAMLH-1649635297%7C4%7CMCAAMB-1649635297%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1649037698s%7CNONE%7CMCAID%7CNONE%7CvVersion%7C4.4.0; aam_uuid=44486090741136935644310087660859943568; _BB.enr=0; __gads=ID=2265d0a9a2c3c3ce:T=1649030507:S=ALNI_Ma8bl1AQAZR3UU3Yaw3dc4S0sFrEA; dw-tag=sysdrop; s_sq=%5B%5BB%5D%5D; prevPageType=platform_game_list; OptanonConsent=isIABGlobal=false&datestamp=Sun+Apr+03+2022+21%3A03%3A54+GMT-0300+(Hora+padr%C3%A3o+de+Bras%C3%ADlia)&version=6.7.0&hosts=&consentId=0cdfb5d1-e1b7-45e3-90c0-43b91c9e9634&interactionCount=1&landingPath=NotLandingPage&groups=C0002%3A1%2CC0003%3A1%2CC0004%3A1%2CC0005%3A1&AwaitingReconsent=false&geolocation=BR%3BSP; OptanonAlertBoxClosed=2022-04-04T00:03:54.371Z; _BB.d=0|||6; s_getNewRepeat=1649030634683-New; s_lv_undefined=1649030634683; utag_main=v_id:017ff1e085b70016f6ffa91837b005073001e06b00bd0$_sn:1$_se:12$_ss:0$_st:1649032435170$ses_id:1649030497720%3Bexp-session$_pn:6%3Bexp-session$vapi_domain:gamespot.com; RT="z=1&dm=gamefaqs.gamespot.com&si=8276844d-a267-4c8e-9d94-390609774791&ss=l1jy6hxp&sl=4&tt=4qi&bcn=%2F%2F17de4c14.akstat.io%2F&ld=yro&ul=4xjw"',
    'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="100", "Google Chrome";v="100"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36'
}

const slug = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to = "aaaaeeeeiiiioooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}


const writeToFile = (data, fileName) => {
    const promiseCallback = (resolve, reject) => {
        fs.writeFile(fileName, data, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(true)
        });
    };
    return new Promise(promiseCallback);
}

const readFromFile = (fileName) => {
    const promiseCallback = (resolve) => {
        fs.readFile(fileName, 'utf-8', (error, contents) => {
            if (error) {
                resolve(null);
                return;
            };
            resolve(contents);
        });
    };
    return new Promise(promiseCallback);
};

const getPage = (path) => {
    const url = `${BASE_URL}${path}`

    const options = {
        Headers: browserHeader
    }
    return axios.get(url, options).then((response) => response.data);
}

const getCachePage = (path) => {
    const fileName = `cache/${slug(path)}.html`;
    const promiseCallback = async (resolve, reject) => {

        const cacheHtml = await readFromFile(fileName);
        if (!cacheHtml) {
            console.log('*** getCachePage.fresh')
            const html = await getPage(path);
            await writeToFile(html, fileName);
            resolve(html);
            return;
        };
        console.log('*** getCachePage.cached')
        resolve(cacheHtml);
    };
    return new Promise(promiseCallback);
};

const saveData = (data, path) => {
    const promiseCallback = async (resolve, reject) => {
        if(!data || data.length == 0) return resolve(true);
        const dataToStore = JSON.stringify({data: data}, null, 2);
        const created = await writeToFile (dataToStore, path);
        resolve(true);
    };
    return new Promise(promiseCallback);
    
}

const getPageItems = (html) => {
    const $ = cheerio.load(html);
    const promiseCallback = (resolve, reject) => {
        const selector = '#content > div.post_content.row > div > div:nth-child(1) > div.body > table > tbody > tr';

        const games = [];
        $(selector).each((i, element) => {
            const a = $('td.rtitle > a', element);
            const title = a.text();
            const href = a.attr('href');
            const id = href.split('/').pop();
            games.push({id, title, path: href});
        });

        resolve(games);
    };
    return new Promise(promiseCallback);
};

const getAllPages = async (start, finish) => {
    let page = start;
    do{
        const path = `/n64/category/999-ali?page=${page}`;
       await getCachePage(path)
       .then(getPageItems)
       .then((data) => saveData(data, `dbJson/./db-${page}.json`))
       .then(console.log)
       .catch(console.error);
        page++;
    }while(page < finish);
}

getAllPages(0, 10);