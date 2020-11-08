import path from 'path';

const global = (p: string = "") => path.join(process.cwd(), 'files', 'global', p);
const temp = (p: string = "") => path.join(process.cwd(), 'files', 'temp', p);

let files = {
    prevRes: global('prevRes'),
    temp: temp(),
    stopF: global('ZTMstops.json'),
    pojazdy: global('pojazdy.json')
}

export default files;