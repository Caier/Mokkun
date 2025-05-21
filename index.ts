import { Mokkun } from './lib/mokkun';
require('dotenv').config();

process.on('unhandledRejection', err => 
    console.error("Unhanded Rejection: " + (err as Error).stack)
);

new Mokkun();