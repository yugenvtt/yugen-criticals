/**
 * @file src/hooks/init.ts
 * registers modular hooks for critical animations.
 **/

import { attack_roll_hook } from './attack-roll.js';
import { pf2e_hooks } from './pf2e.js';

import { CriticalAnimation } from '../module/critical-animation.js';

export const init_hook = ( ) => 
{
	/** register the initialization hook **/
	Hooks.once( 'init', async ( ) => 
	{
		register_settings( );

		/** initialize system-specific critical animation hooks **/
		attack_roll_hook( );
		pf2e_hooks( );

		/** register socket listener early (in init) for v14 stability **/
		( game as any ).socket.on( 'module.yugen-criticals', async ( data: any ) => 
		{
			/** ignore events emitted by the current user to prevent double-triggering **/
			if ( data?.sender_id === ( game as any ).user.id ) 
			{ 
				return; 
			}

			if ( !data?.actor_uuid ) 
			{ 
				return; 
			}

			/** resolve the actor from UUID (handles unlinked tokens) **/
			const actor = await ( fromUuid as any )( data.actor_uuid );
			
			if ( actor ) 
			{
				void CriticalAnimation.show_animation( actor, data.type || 'critical', data.damage_type || '' );
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
		default: 'CRITICAL HIT'
	} );

	/** register the default fumble message **/
	settings.register( 'yugen-criticals', 'fumble-message', 
	{
		name: 'yugen-criticals.settings.fumble-message.name',
		hint: 'yugen-criticals.settings.fumble-message.hint',
		scope: 'world',
		config: true,
		type: String,
		default: 'FUMBLE'
	} );

	/** register setting for the critical animation color **/
	settings.register( 'yugen-criticals', 'critical-color', 
	{
		name: 'yugen-criticals.settings.critical-color.name',
		hint: 'yugen-criticals.settings.critical-color.hint',
		scope: 'client',
		config: true,
		type: String,
		default: '#ffffff'
	} );

	/** register setting for the critical animation size **/
	settings.register( 'yugen-criticals', 'critical-size', 
	{
		name: 'yugen-criticals.settings.critical-size.name',
		hint: 'yugen-criticals.settings.critical-size.hint',
		scope: 'client',
		config: true,
		type: Number,
		range: {
			min: 0.5,
			max: 2.0,
			step: 0.1
		},
		default: 1.0
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
		default: 'modules/yugen-criticals/sounds/crit.ogg'
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
		default: 'sounds/dice.wav'
	} );

	/** register the sound volume for sound effects **/
	settings.register( 'yugen-criticals', 'critical-volume', 
	{
		name: 'yugen-criticals.settings.critical-volume.name',
		hint: 'yugen-criticals.settings.critical-volume.hint',
		scope: 'client',
		config: true,
		type: Number,
		range: {
			min: 0,
			max: 1,
			step: 0.1
		},
		default: 0.5
	} );

	/** user setting: always show criticals **/
	settings.register( 'yugen-criticals', 'always-show-crit', 
	{
		name: 'yugen-criticals.settings.always-show-crit.name',
		hint: 'yugen-criticals.settings.always-show-crit.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false
	} );

	/** user setting: always show fumbles **/
	settings.register( 'yugen-criticals', 'always-show-fumble', 
	{
		name: 'yugen-criticals.settings.always-show-fumble.name',
		hint: 'yugen-criticals.settings.always-show-fumble.hint',
		scope: 'client',
		config: true,
		type: Boolean,
		default: false
	} );

	/** gm setting: user-only animations **/
	settings.register( 'yugen-criticals', 'user-only', 
	{
		name: 'yugen-criticals.settings.user-only.name',
		hint: 'yugen-criticals.settings.user-only.hint',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false
	} );
};
