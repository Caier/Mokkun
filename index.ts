import { Mokkun } from './lib/mokkun';
import { LoggedError, SilentError } from './lib/util/errors/errors';
require('dotenv').config();

process.on('unhandledRejection', (err: any) => 
    !(err instanceof SilentError) && !(err instanceof LoggedError) &&
    console.error("Unhanded Rejection: " + err.stack)
);

new Mokkun();