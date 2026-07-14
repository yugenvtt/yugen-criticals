/**
 * @file src/index.ts
 * entry point for the yugen-criticals module.
 **/

import { init_hook } from './hooks/init.js';
import { ready_hook } from './hooks/ready.js';
import { scene_controls_hook } from './hooks/scene-controls.js';



/** initialize the module hooks **/
init_hook( );
ready_hook( );
scene_controls_hook( );

/** export the actor configuration class for external macro access **/
export { ActorConfigApp } from './module/actor-config.js';

