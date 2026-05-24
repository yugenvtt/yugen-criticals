/**
 * @file src/hooks/ready.ts
 * handles the ready hook for yugen-criticals.
 **/

import { ActorConfigApp } from '../module/actor-config.js';
import { CriticalAnimation } from '../module/critical-animation.js';
import { debug_log } from '../module/utils.js';

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

		/** register Dice So Nice hook if active **/
		if ( ( game as any ).modules.get( 'dice-so-nice' )?.active ) 
		{
			Hooks.on( 'diceSoNiceRollComplete', ( message_id : string ) => 
			{
				debug_log( 'diceSoNiceRollComplete hook fired:', { message_id } );
				const message = ( game as any ).messages.get( message_id );
				if ( !message ) 
				{
					debug_log( 'message not found for ID:', message_id );
					return;
				}

				/** check if the message ID itself is queued **/
				if ( CriticalAnimation.has_pending( message_id ) ) 
				{
					debug_log( 'pending animation matched message ID:', message_id );
					CriticalAnimation.trigger_pending( message_id );
					return;
				}

				/** check if any of the rolls in the message are queued **/
				for ( const roll of message.rolls || [ ] ) 
				{
					const roll_id = roll._id || roll.id || '';
					if ( roll_id && CriticalAnimation.has_pending( roll_id ) ) 
					{
						debug_log( 'pending animation matched roll ID:', roll_id );
						CriticalAnimation.trigger_pending( roll_id );
					}
				}
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

