/**
 * @file src/hooks/init.ts
 * registers modular hooks for critical animations.
 **/

import { attack_roll_hook } from './attack-roll.js';
import { pf2e_hooks } from './pf2e.js';
import { finisher_hooks } from './finisher.js';

import { CriticalAnimation } from '../module/critical-animation.js';
import { ActorConfigApp } from '../module/actor-config.js';

export const init_hook = ( ) => 
{
	/** register the initialization hook **/
	Hooks.once( 'init', async ( ) => 
	{
		register_settings( );

		/** expose the public API for external macro access **/
		const module = ( game as any ).modules.get( 'yugen-criticals' );
		if ( module ) 
		{
			module.api = {
				ActorConfigApp
			};
		}

		/** initialize system-specific critical animation hooks **/
		attack_roll_hook( );
		pf2e_hooks( );
		finisher_hooks( );


		/**
		 * register socket listener early (in init) for v14 stability
		 **/
		( game as any ).socket.on( 'module.yugen-criticals', async ( data : any ) => 
		{
			/**
			 * ignore events emitted by the current user to prevent double-triggering
			 **/
			/** check current user id **/
			if ( data?.sender_id === ( game as any ).user.id ) 
			{ 
				return; 
			}

			if ( !data?.actor_uuid && !data?.actor_uuids ) 
			{ 
				return; 
			}

			if ( data.type === 'team-critical' && data.actor_uuids )
			{
				/** resolve multiple actors for team attack **/
				const actors = [ ];
				for ( const uuid of data.actor_uuids )
				{
					const actor = await ( fromUuid as any )( uuid );
					if ( actor )
					{
						actors.push( actor );
					}
				}
				
				if ( actors.length > 0 )
				{
					void CriticalAnimation.show_team_animation( actors, data.theme || 'persona', data.message || 'Team Attack' );
				}
				return;
			}

			/**
			 * verify that the socket event's associated chat message exists, is visible, and the recipient has permission to see the rolls (respecting secret/blind roll settings)
			 **/
			if ( data.roll_id ) 
			{
				/** retrieve chat message from messages collection **/
				const message = ( game as any ).messages.get( data.roll_id );
				if ( !message || !message.visible ) 
				{
					return;
				}

				/** check setting for hiding private rolls **/
				const hide_private = ( game as any ).settings.get( 'yugen-criticals', 'hide-private-rolls' );
				if ( hide_private ) 
				{
					const is_whisper = message.whisper && message.whisper.length > 0;
					if ( is_whisper ) 
					{
						/** check current user id **/
						const user_id = ( game as any ).user.id;
						const is_recipient = message.whisper.includes( user_id );
						const is_author = message.author?.id === user_id;
						
						/** check if current user is gm **/
						const is_gm = ( game as any ).user.isGM;
						if ( !is_recipient && !is_author && !is_gm ) 
						{
							return;
						}
					}

					/** check if current user is gm **/
					const is_gm = ( game as any ).user.isGM;
					if ( message.blind && !is_gm ) 
					{
						return;
					}
				}
			}

			/**
			 * resolve the actor from UUID (handles unlinked tokens)
			 **/
			/** resolve document by uuid **/
			const actor = await ( fromUuid as any )( data.actor_uuid );
			
			if ( actor ) 
			{
				/** check if dice so nice module is active **/
				const is_dsn_active = ( game as any ).modules.get( 'dice-so-nice' )?.active && ( game as any ).dice3d?.isEnabled?.( );
				if ( is_dsn_active && data.roll_id ) 
				{
					CriticalAnimation.queue_animation( data.roll_id, actor, data.type || 'critical', data.damage_type || '' );
				}
				else 
				{
					void CriticalAnimation.show_animation( actor, data.type || 'critical', data.damage_type || '' );
				}
			}
		} );
	} );
};

const register_settings = ( ) => 
{
	const settings = ( game as any ).settings;

	/** register setting for the custom critical message **/
	settings.register( 'yugen-criticals', 'critical-message', 
	{
		name: 'yugen-criticals.settings.critical-message.name',
		hint: 'yugen-criticals.settings.critical-message.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'CRITICAL HIT',
		requiresReload: true
	} );

	/** register the default fumble message **/
	settings.register( 'yugen-criticals', 'fumble-message', 
	{
		name: 'yugen-criticals.settings.fumble-message.name',
		hint: 'yugen-criticals.settings.fumble-message.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'FUMBLE',
		requiresReload: true
	} );

	/** register setting for the animation style (client preference) **/
	settings.register( 'yugen-criticals', 'animation-style', 
	{
		name: 'yugen-criticals.settings.animation-style.name',
		hint: 'yugen-criticals.settings.animation-style.hint',
		scope: 'client',
		config: true,
		type: String,
		choices: 
		{
			'cinematic': 'yugen-criticals.settings.animation-style.choices.cinematic',
			'anime': 'yugen-criticals.settings.animation-style.choices.anime',
			'cyberpunk': 'yugen-criticals.settings.animation-style.choices.cyberpunk',
			'mk': 'yugen-criticals.settings.animation-style.choices.mk',
			'fire': 'yugen-criticals.settings.animation-style.choices.fire',
			'impacts': 'yugen-criticals.settings.animation-style.choices.impacts',
			'barbarian': 'yugen-criticals.settings.animation-style.choices.barbarian',
			'bard': 'yugen-criticals.settings.animation-style.choices.bard',
			'cleric': 'yugen-criticals.settings.animation-style.choices.cleric',
			'druid': 'yugen-criticals.settings.animation-style.choices.druid',
			'fighter': 'yugen-criticals.settings.animation-style.choices.fighter',
			'warlock': 'yugen-criticals.settings.animation-style.choices.warlock',
			'wizard': 'yugen-criticals.settings.animation-style.choices.wizard'
		},
		default: 'cinematic',
		requiresReload: true
	} );

	/** register setting for the global animation style (gm choice) **/
	settings.register( 'yugen-criticals', 'global-animation-style', 
	{
		name: 'yugen-criticals.settings.global-animation-style.name',
		hint: 'yugen-criticals.settings.global-animation-style.hint',
		scope: 'world',
		config: true,
		type: String,
		choices: 
		{
			'cinematic': 'yugen-criticals.settings.animation-style.choices.cinematic',
			'anime': 'yugen-criticals.settings.animation-style.choices.anime',
			'cyberpunk': 'yugen-criticals.settings.animation-style.choices.cyberpunk',
			'mk': 'yugen-criticals.settings.animation-style.choices.mk',
			'fire': 'yugen-criticals.settings.animation-style.choices.fire',
			'impacts': 'yugen-criticals.settings.animation-style.choices.impacts',
			'barbarian': 'yugen-criticals.settings.animation-style.choices.barbarian',
			'bard': 'yugen-criticals.settings.animation-style.choices.bard',
			'cleric': 'yugen-criticals.settings.animation-style.choices.cleric',
			'druid': 'yugen-criticals.settings.animation-style.choices.druid',
			'fighter': 'yugen-criticals.settings.animation-style.choices.fighter',
			'warlock': 'yugen-criticals.settings.animation-style.choices.warlock',
			'wizard': 'yugen-criticals.settings.animation-style.choices.wizard'
		},
		default: 'cinematic',
		requiresReload: true
	} );

	/** gm setting: override client animation style **/
	settings.register( 'yugen-criticals', 'gm-style-override', 
	{
		name: 'yugen-criticals.settings.gm-style-override.name',
		hint: 'yugen-criticals.settings.gm-style-override.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true
	} );

	/** register setting for the critical animation color **/
	settings.register( 'yugen-criticals', 'critical-color', 
	{
		name: 'yugen-criticals.settings.critical-color.name',
		hint: 'yugen-criticals.settings.critical-color.hint',
		scope: 'client',
		config: true,
		type: String,
		default: '#ffffff',
		requiresReload: true
	} );

	/** register setting for the critical animation size **/
	settings.register( 'yugen-criticals', 'critical-size', 
	{
		name: 'yugen-criticals.settings.critical-size.name',
		hint: 'yugen-criticals.settings.critical-size.hint',
		scope: 'client',
		config: true,
		type: Number,
		range: 
		{
			min: 0.5,
			max: 2.0,
			step: 0.1
		},
		default: 1.0,
		requiresReload: true
	} );

	/** register setting for the critical animation sound **/
	settings.register( 'yugen-criticals', 'critical-sound', 
	{
		name: 'yugen-criticals.settings.critical-sound.name',
		hint: 'yugen-criticals.settings.critical-sound.hint',
		scope: 'world',
		config: true,
		type: String,
		filePicker: 'audio',
		default: 'modules/yugen-criticals/sounds/crit.ogg',
		requiresReload: true
	} );

	/** register the sound effect for fumbles **/
	settings.register( 'yugen-criticals', 'fumble-sound', 
	{
		name: 'yugen-criticals.settings.fumble-sound.name',
		hint: 'yugen-criticals.settings.fumble-sound.hint',
		scope: 'world',
		config: true,
		type: String,
		filePicker: 'audio',
		default: 'sounds/dice.wav',
		requiresReload: true
	} );

	/** register the sound volume for sound effects **/
	settings.register( 'yugen-criticals', 'critical-volume', 
	{
		name: 'yugen-criticals.settings.critical-volume.name',
		hint: 'yugen-criticals.settings.critical-volume.hint',
		scope: 'client',
		config: true,
		type: Number,
		range: 
		{
			min: 0,
			max: 1,
			step: 0.1
		},
		default: 0.5,
		requiresReload: true
	} );

	/** user setting: always show criticals **/
	settings.register( 'yugen-criticals', 'always-show-crit', 
	{
		name: 'yugen-criticals.settings.always-show-crit.name',
		hint: 'yugen-criticals.settings.always-show-crit.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true
	} );

	/** user setting: always show fumbles **/
	settings.register( 'yugen-criticals', 'always-show-fumble', 
	{
		name: 'yugen-criticals.settings.always-show-fumble.name',
		hint: 'yugen-criticals.settings.always-show-fumble.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true
	} );

	/** gm setting: user-only animations **/
	settings.register( 'yugen-criticals', 'user-only', 
	{
		name: 'yugen-criticals.settings.user-only.name',
		hint: 'yugen-criticals.settings.user-only.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true
	} );

	/** gm setting: ignore discarded dice in advantage/disadvantage **/
	settings.register( 'yugen-criticals', 'ignore-discarded-dice', 
	{
		name: 'yugen-criticals.settings.ignore-discarded-dice.name',
		hint: 'yugen-criticals.settings.ignore-discarded-dice.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: true,
		requiresReload: true
	} );

	/** gm setting: ignore large dice pools **/
	settings.register( 'yugen-criticals', 'ignore-multi-dice', 
	{
		name: 'yugen-criticals.settings.ignore-multi-dice.name',
		hint: 'yugen-criticals.settings.ignore-multi-dice.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: true,
		requiresReload: true
	} );

	/** user setting: enable screen shake and zoom **/
	settings.register( 'yugen-criticals', 'screen-shake', 
	{
		name: 'yugen-criticals.settings.screen-shake.name',
		hint: 'yugen-criticals.settings.screen-shake.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: true,
		requiresReload: true
	} );

	/** user setting: enable debug mode **/
	settings.register( 'yugen-criticals', 'debug-mode', 
	{
		name: 'yugen-criticals.settings.debug-mode.name',
		hint: 'yugen-criticals.settings.debug-mode.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false,
		requiresReload: true
	} );

	/** gm setting: hide private rolls **/
	settings.register( 'yugen-criticals', 'hide-private-rolls', 
	{
		name: 'yugen-criticals.settings.hide-private-rolls.name',
		hint: 'yugen-criticals.settings.hide-private-rolls.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: true,
		requiresReload: true
	} );

	/** gm setting: critical threshold type **/
	settings.register( 'yugen-criticals', 'critical-threshold-type', 
	{
		name: 'yugen-criticals.settings.critical-threshold-type.name',
		hint: 'yugen-criticals.settings.critical-threshold-type.hint',
		scope: 'world',
		config: true,
		type: String,
		choices: 
		{
			'die': 'yugen-criticals.settings.critical-threshold-type.choices.die',
			'total': 'yugen-criticals.settings.critical-threshold-type.choices.total'
		},
		default: 'die',
		requiresReload: true
	} );

	/** gm setting: critical threshold value **/
	settings.register( 'yugen-criticals', 'critical-threshold-value', 
	{
		name: 'yugen-criticals.settings.critical-threshold-value.name',
		hint: 'yugen-criticals.settings.critical-threshold-value.hint',
		scope: 'world',
		config: true,
		type: Number,
		default: 20,
		requiresReload: true
	} );
};
