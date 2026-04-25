/**
 * @file src/index.ts
 * entry point for the yugen-criticals module.
 **/

import { init_hook } from './hooks/init.js';
import { ready_hook } from './hooks/ready.js';

/** initialize the module hooks **/
init_hook( );
ready_hook( );
