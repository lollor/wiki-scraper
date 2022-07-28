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


app.get("/:nome", async (req, res)=> {
    let filmName = req.params.nome;
    let response = await scrape("https://it.wikipedia.org/wiki/" + filmName);
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