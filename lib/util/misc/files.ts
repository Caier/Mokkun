import path from 'path';

let files = {
    prevRes: path.join(process.cwd(), 'files', 'global', 'prevRes'),
    temp: path.join(process.cwd(), 'files', 'temp'),
    stopF: path.join(process.cwd(), 'files', 'global', 'ZTMstops.json')
}

export default files;