import events from 'events';
events.captureRejections = true;

import { Mokkun } from './lib/mokkun.js';
import { LoggedError, SilentError } from './lib/util/errors/errors.js';
(await import('dotenv')).config();

process.on('unhandledRejection', (err: any) => 
    !(err instanceof SilentError) && !(err instanceof LoggedError) &&
    console.error("Unhanded Rejection: " + err.stack)
);

new Mokkun();