const bp = require("body-parser");
const cors = require("cors");
const express = require('express');
const puppeteer = require("puppeteer");

const app = express();
const PORT = 3000;

app.use(cors())
app.use(bp.json())

app.listen(PORT, error =>{
	if(error) console.log("Error occurred, server can't start", error);
    else console.log("Partito alla porta "+PORT);
});


app.get("/scrape/:nome", async (req, res)=> {
    let filmName = req.params.nome;
    let response = await scrape("https://it.wikipedia.org/wiki/" + filmName);
    res.status(200).json(response);
})

app.get("/getBasicInfo", async (req, res)=>{
    let linkFilm = req.query.link;
    if (linkFilm === undefined) {
        res.status(305).json("Bad request. Inserire link");
        return;
    }
    if (!linkFilm.includes("it.wikipedia")) {
        res.status(305).json("Bad request. Inserire link di it.wikipedia");
        return;
    }
    let response = await getBasicInfo(linkFilm);
    res.status(200).json(response);
})

async function scrape(url) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    let rows = await page.$x('//*[@id="mw-content-text"]/div[1]/table[1]/tbody/tr');
    rows = rows.slice(2);
    //console.log(rows);
    let response = {};
    for (let i = 0; i < rows.length; i++) {
        const element = rows[i];
        let [th] = await element.$x('./th');
        let [td] = await element.$x('./td');
        if (th === undefined || td === undefined) {
            continue;
        }
        let textTh, textTd;
        textTh = await th.getProperty("textContent");
        textTd = await td.getProperty("textContent");
        textTh = await textTh.jsonValue();
        textTd = await textTd.jsonValue();
        textTh = textTh.trim().toLowerCase().replace(new RegExp(" ","g"),"_");
        textTd = textTd.trim();
        //console.log(textTh, textTd);
        //console.log("\n");
        response[textTh] = textTd;
    }
    browser.close();
    return response;
    //return {"durata":parseInt(text.trim().split(" ")[0])};
}

async function getBasicInfo(url) {
    try {
        let risposta = {
            "titolo":undefined,
            "durata":undefined,
            "anno":undefined,
            "trama":undefined
        };

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url);

        //prendo la durata
        let rows = await page.$x('//*[@id="mw-content-text"]/div[1]/table[1]/tbody/tr');
        rows = rows.slice(2);
        for (let i = 0; i < rows.length; i++){
            const element = rows[i];
            let [th] = await element.$x("./th");
            if (th === undefined) continue;
            let textTh = await th.getProperty("textContent");
            textTh = (await textTh.jsonValue()).toLowerCase();
            if (textTh == "durata"){
                let [td] = await element.$x("./td");
                if (td === undefined) {
                    console.log("td of durata is undefined");
                    continue;
                }
                let textTd = await td.getProperty("textContent");
                textTd = await textTd.jsonValue();
                risposta.durata = parseInt(textTd.trim().split(" ")[0]);
            }

            if (textTh == "anno"){
                let [td] = await element.$x("./td");
                if (td === undefined) {
                    console.log("td of anno is undefined");
                    continue;
                }
                let textTd = await td.getProperty("textContent");
                textTd = await textTd.jsonValue();
                risposta.anno = parseInt(textTd.trim().split(" ")[0]);
            }
        }

        //prendo il titolo
        let [title] = await page.$x('//*[@id="firstHeading"]');
        if (title !== undefined){
            let text = await title.getProperty("textContent");
            risposta.titolo = (await text.jsonValue()).trim();
        }

        //prendo il primo paragrafo della trama
        let [plot] = await (await page.$x('//*[@id="Trama"]'))[0].$x("..");
        while (true) {
            plot = await page.evaluateHandle(el => el.nextElementSibling, plot);
            const tagName = await page.evaluateHandle(
                element => element.tagName,
                plot
                );
            if (await tagName.jsonValue() == "P") {
                break;
            }
        }
        if (plot !== undefined){
            let text = await plot.getProperty("textContent");
            risposta.trama = (await text.jsonValue()).trim();
        }

        return risposta;
    } catch (error) {
        return {"error":error}    
    }
}