const rp = require("request-promise");
const fs = require("fs");
const path = require("path");
const $ = require('cheerio');
const stopF = path.join(__dirname, "ZTMstops.json");

async function getStops(){
    async function updateStops(){
        let req = await rp("https://ckan.multimediagdansk.pl/dataset/c24aa637-3619-4dc2-a171-a23eec8f2172/resource/4c4025f0-01bf-41f7-a39f-d156d201b82b/download/stops.json", {rejectUnauthorized: false});
        req = JSON.parse(req);
        for(dates in req) {
            req = req[dates].stops;
            break;
        }
        req = JSON.stringify(req);
        fs.writeFileSync(stopF, req);
        updated = true;
        console.log("updated stop.json");
    }

    let updated = false;
    if(!fs.existsSync(stopF)) await updateStops();                       
    if(Date.now() - new Date(fs.statSync(stopF).mtime).getTime() > 86400000) await updateStops(); 

    let stops = JSON.parse(fs.readFileSync(stopF));
    stops.updated = updated;
    return stops;
}

exports.checkZTMNews = async function(source)                                      //sprawdza "bieżącą sytuację komunikacyjną" (isUrl = czy sprawdzić online? (bool), source = html jeśli nie używamy isUrl (do debugowania)). zwraca tabelę
{
    if(!source)
    {
        let body = await rp("https://ztm.gda.pl/files/xml/bsk.json", {rejectUnauthorized: false, encoding: null});
        body = body.toString();
        body = body.replace(/<[\S\s][^<>]*>/g, "");
        body = JSON.parse(body);

        for (var x = 0; x < body.komunikaty.length; x++)
            body.komunikaty[x].tresc = $.load(body.komunikaty[x].tresc).text();

        return body;
    }
}

exports.getShort = async function(short)
{
    if(!fs.existsSync(stopF)) await getStops();
    let stop = fs.readFileSync(stopF);
    stop = JSON.parse(stop);

    if(/[A-zĄĆĘŁŃÓŚŻŹąćęłńóśżź0-9]{2,20}/.test(short))
    {
        let stopNumer = short[short.length - 1];
        if(!/[0-9]/.test(stopNumer)) stopNumer = undefined;
        else short = short.slice(0, -1).toLowerCase();
        let short1 = short.slice(0, short.length / 2);
        let short2 = short.slice(short.length / 2);
        let out = [];
        let cnt = 1;
        for (i in stop)
        {
            let nFromL = stop[i].stopDesc.trim().toLowerCase();
            let halfs = nFromL.split(" ");
            if(stop[i].zoneName == "Gdańsk" && ((!stopNumer || stop[i].stopCode == "0" + stopNumer) && (nFromL.startsWith(short) || (halfs[1] != undefined && halfs[0].startsWith(short1) && halfs[1].startsWith(short2)))))
            {
                out.push({"num": cnt, "name": stop[i].stopDesc + ` ${stop[i].stopCode}`, "code": stop[i].stopShortName, "res": await this.getSIP(stop[i].stopShortName)});
                cnt++;
            }
        }
    
        return out;
    }
    return [];
}

exports.getSIP = async function(numerTras, arg2)                                           //"bierze" numerTrasy a zwraca tabelę z aproksymacjami odjazdu z danego przystanku + główka nazwa prz., numer prz., numerTrasy
{
    let stop = await getStops();

    if(arg2)                                                                                //jeśli sprecyzowano arg2(nazwa przystanku, przy czym numerTras == stopCode) to wyszukuje stopShortName 
        for(i in stop)
         if(stop[i].zoneName == "Gdańsk" && stop[i].stopCode == numerTras && stop[i].stopDesc.trim().toLowerCase() == arg2.toLowerCase())
          numerTras = stop[i].stopShortName;
         else return;

    body = await rp({uri: "http://87.98.237.99:88/delays?stopId=" + numerTras, encoding: null, rejectUnauthorized: false});
    if(body == 0) return;
    body = JSON.parse(body.toString());

    if(body.hasOwnProperty("delay")) { 
    
        infs = {};
        infs.updated = stop.updated;
        infs.estimates = [];

        for (i of body.delay)
        {
            infs.estimates.push({
                "routeId": i.routeId,
                "headsign": i.headsign,
                "estTime": i.estimatedTime,
                "vehId": i.vehicleCode,
                "delay": i.delayInSeconds,
                "time": i.lastUpdate
            });
        }

        for(i in stop)
            if(stop[i].stopShortName == numerTras && stop[i].zoneName == "Gdańsk") {
                stopName = stop[i].stopDesc;
                stopNumer = stop[i].stopCode;
                break;
            }

        infs.numerTras = numerTras;
        infs.stopNumer = (stopNumer != 0) ? stopNumer : "";
        infs.stopName = stopName;
    
        return infs;
    }

    else return 0;
}