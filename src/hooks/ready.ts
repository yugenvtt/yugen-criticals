/**
 * @file src/hooks/ready.ts
 * handles the ready hook for yugen-criticals.
 **/

import { ActorConfigApp } from '../module/actor-config.js';

export const ready_hook = ( ) => 
{
	/** listen for the ready hook **/
	Hooks.once( 'ready', async ( ) => 
	{
		/** look for the signature config macro in the world collection **/
		const existing = ( game as any ).macros.find( ( m : any ) => 
		{
			return m.name === 'yugen-criticals config';
		} );

		if ( !existing && ( game as any ).user.isGM ) 
		{
			/** create the configuration macro programmatically **/
			await Macro.create( {
				name: 'yugen-criticals config',
				type: 'script',
				img: 'icons/svg/gear.svg',
				command: `/**
 * open the yugen-criticals config editor for the controlled token or character.
 * created automatically by yugen. to configure actor quotes.
 **/
const module = game.modules.get( 'yugen-criticals' );

if ( !module?.active ) 
{
	ui.notifications.error( 'yugen-criticals is not active.' );
}
else 
{
	const actor = canvas.tokens.controlled[ 0 ]?.actor || game.user.character;
	if ( !actor ) 
	{
		ui.notifications.warn( 'yugen-criticals | please select a token or assign a character to your user first.' );
	}
	else 
	{
		const { ActorConfigApp } = await import( '/modules/yugen-criticals/scripts/module.js' );
		const app = new ActorConfigApp( actor );
		if ( game.release?.generation >= 14 ) 
		{
			app.render( { force: true } );
		}
		else 
		{
			app.render( true );
		}
	}
}`
			} );
		}
	} );

	/** 
	 * sidebar context menu injection
	 * right-clicking an actor in the sidebar will now show the configuration sheet.
	 **/
	Hooks.on( 'getActorDirectoryEntryContext', ( _html : any, options : any[] ) => 
	{
		options.push( {
			name: 'yugen-criticals',
			icon: '<i class="fa-solid fa-sparkles"></i>',
			condition: ( li : any ) => 
			{
				/** find the target actor document from the world collection **/
				const actor = ( game as any ).actors.get( li.data( 'document-id' ) );
				if ( actor ) 
				{
					/** test ownership permissions before showing option **/
					return actor.testUserPermission( ( game as any ).user, 'OWNER' );
				}
				return false;
			},
			callback: ( li : any ) => 
			{
				/** find the target actor document from the world collection **/
				const actor = ( game as any ).actors.get( li.data( 'document-id' ) );
				if ( actor ) 
				{
					const app = new ActorConfigApp( actor );
					if ( ( game as any ).release?.generation >= 14 ) 
					{
						/** render the config editor window with version-specific options **/
						app.render( { force: true } );
					}
					else 
					{
						/** render the config editor window with version-specific options **/
						app.render( true );
					}
				}
			}
		} );
	} );
};

