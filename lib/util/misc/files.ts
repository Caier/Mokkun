import path from 'path';
import fs from 'fs-extra';

const global = (p: string = "") => path.join(process.cwd(), 'files', 'global', p);
const temp = (p: string = "") => path.join(process.cwd(), 'files', 'temp', p);

let files = {
    prevRes: global('prevRes'),
    temp: temp(),
    stopF: global('ZTMstops.json'),
    pojazdy: global('pojazdy.json'),
    guildScripts: global('guildScripts'),
    boorus: global('boorus.json'),
    stops: (f: string) => { fs.ensureDirSync(global('stops')); return global(`stops/${f}`); }
}

export default files;