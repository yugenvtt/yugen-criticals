/**
 * @file src/hooks/scene-controls.ts
 * registers the scene control button for initiating team criticals and configuring actor quotes.
 **/

import { TeamCriticalApp } from '../module/team-app.js';
import { ActorConfigApp } from '../module/actor-config.js';

export const scene_controls_hook = ( ) => 
{
	Hooks.on( 'getSceneControlButtons', ( controls : any ) => 
	{
		const team_tool = {
			name: 'yugen-team-critical',
			title: 'yugen-criticals.team-critical.title',
			icon: 'fa-solid fa-users',
			button: true,
			onClick: ( ) => 
			{
				new TeamCriticalApp( ).render( true );
			}
		};

		( globalThis as any ).yugen_utils?.register_control_tool( controls, 'tokens', team_tool );

		const config_tool = {
			name: 'yugen-criticals-config',
			title: 'yugen-criticals.actor-config.title',
			icon: 'fa-solid fa-swords',
			button: true,
			onClick: ( ) => 
			{
				/** find the target actor from the selected token or the user's character **/
				const actor = ( canvas as any ).tokens.controlled[ 0 ]?.actor || ( game as any ).user.character;
				if ( !actor ) 
				{
					( ui as any ).notifications.warn( 'yugen-criticals | Please select a token or assign a character to your user first.' );
					return;
				}

				/** verify ownership permission **/
				if ( !actor.testUserPermission( ( game as any ).user, 'OWNER' ) )
				{
					( ui as any ).notifications.warn( 'yugen-criticals | You do not have permission to configure this character.' );
					return;
				}

				const app = new ActorConfigApp( actor );
				if ( ( game as any ).release?.generation >= 14 ) 
				{
					app.render( { force: true } );
				}
				else 
				{
					app.render( true );
				}
			}
		};

		( globalThis as any ).yugen_utils?.register_control_tool( controls, 'tokens', config_tool );
	} );
};
