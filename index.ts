import { Mokkun } from './lib/mokkun';
import { SilentError } from './lib/util/errors/errors';
require('dotenv').config();

process.on('unhandledRejection', (err: any) => 
    !(err instanceof SilentError) &&
    console.error("Unhanded Rejection: " + err.stack)
);

new Mokkun();