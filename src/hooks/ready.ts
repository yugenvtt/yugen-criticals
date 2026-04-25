/**
 * @file src/hooks/ready.ts
 * handles the ready hook for yugen-criticals.
 **/

import { CriticalAnimation } from '../module/critical-animation.js';

export const ready_hook = ( ) => 
{
	/** listen for the ready hook **/
	Hooks.once( 'ready', ( ) => 
	{
	} );

	/** 
	 * sidebar context menu injection
	 * right-clicking an actor in the sidebar will now show a help notification.
	 **/
	Hooks.on( 'getActorDirectoryEntryContext', ( _html : any, options : any[] ) => 
	{
		options.push( {
			name: 'yugen-criticals',
			icon: '<i class="fa-solid fa-sparkles"></i>',
			condition: ( li : any ) => 
			{
				const actor = ( game as any ).actors.get( li.data( 'document-id' ) );
				if ( actor ) 
				{
					return actor.testUserPermission( ( game as any ).user, 'OWNER' );
				}
				return false;
			},
			callback: ( li : any ) => 
			{
				const actor = ( game as any ).actors.get( li.data( 'document-id' ) );
				if ( actor ) 
				{
					ui.notifications?.info( `yugen-criticals | configuration for ${ actor.name } is handled via macros (see README.md)` );
				}
			}
		} );
	} );
};
