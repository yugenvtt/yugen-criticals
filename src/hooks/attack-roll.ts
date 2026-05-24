/**
 * @file src/hooks/attack-roll.ts
 * hooks into dnd5e chat messages to trigger critical hit animations.
 * customized by yugen. to integrate with the activities framework and dice so nice.
 **/

import { CriticalAnimation } from '../module/critical-animation.js';
import { debug_log } from '../module/utils.js';

export const attack_roll_hook = ( ) => 
{
	/** listen for chat messages to capture rolls that have been generated **/
	Hooks.on( 'createChatMessage', ( message : any ) => 
	{
		debug_log( 'createChatMessage hook triggered:', {
			id: message.id,
			has_rolls: !!message.rolls,
			rolls_count: message.rolls?.length || 0
		} );

		if ( !message.rolls || message.rolls.length === 0 ) 
		{
			return;
		}

		/** determine if the message is a valid attack roll **/
		const is_attack = message.flags?.dnd5e?.roll?.type === 'attack';
		const always_crit = ( game as any ).settings.get( 'yugen-criticals', 'always-show-crit' );
		const always_fumble = ( game as any ).settings.get( 'yugen-criticals', 'always-show-fumble' );

		/** only process if it is a valid attack roll, or if always show crit/fumble is active on any roll **/
		if ( !is_attack && !always_crit && !always_fumble ) 
		{
			return;
		}

		/** resolve the actor from the message **/
		const actor = message.actor || ( message.speaker?.actor ? ( game as any ).actors.get( message.speaker.actor ) : null );
		if ( !actor ) 
		{
			return;
		}

		const ignore_discarded = ( game as any ).settings.get( 'yugen-criticals', 'ignore-discarded-dice' );
		const ignore_multi = ( game as any ).settings.get( 'yugen-criticals', 'ignore-multi-dice' );
		const user_only = ( game as any ).settings.get( 'yugen-criticals', 'user-only' );

		let { type, damage_type } = check_roll_result( message.rolls, { ignore_discarded, ignore_multi } );

		const is_natural = type !== null;

		/** force animation type based on local user settings if no natural result was found **/
		if ( !type ) 
		{
			if ( always_crit ) 
			{
				type = 'critical';
			}
			else if ( always_fumble ) 
			{
				type = 'fumble';
			}
		}
		/** if both are on, natural results still take precedence **/
		else if ( type === 'fumble' && always_crit ) 
		{
			type = 'fumble';
		}
		else if ( type === 'critical' && always_fumble ) 
		{
			type = 'critical';
		}

		if ( !type ) 
		{
			return;
		}

		/** attempt to resolve damage type from the rolled item **/
		const item_uuid = message.flags?.dnd5e?.roll?.itemUuid || message.flags?.dnd5e?.itemUuid;
		if ( typeof item_uuid === 'string' ) 
		{
			const item : any = ( fromUuidSync as any )( item_uuid );
			if ( item ) 
			{
				damage_type = item.system?.damage?.parts?.[ 0 ]?.[ 1 ] || damage_type;
			}
		}

		debug_log( 'triggering local animation:', {
			actor: actor.name,
			type,
			damage_type
		} );

		/** trigger locally for the rolling player **/
		const is_dsn_active = ( game as any ).modules.get( 'dice-so-nice' )?.active;
		if ( is_dsn_active ) 
		{
			CriticalAnimation.queue_animation( message.id, actor, type, damage_type );
		}
		else 
		{
			void CriticalAnimation.show_animation( actor, type, damage_type );
		}

		/** broadcast to other clients **/
		if ( !user_only && is_natural ) 
		{
			const socket_data = {
				actor_uuid: actor.uuid,
				type: type,
				damage_type: damage_type,
				sender_id: ( game as any ).user.id,
				roll_id: message.id
			};

			( game as any ).socket.emit( 'module.yugen-criticals', socket_data );
		}
	} );
};

/**
 * checks if any of the provided arguments represent a critical hit or a fumble
 **/
const check_roll_result = ( rolls : any[], options : { ignore_discarded : boolean; ignore_multi : boolean } ) : { type : 'critical' | 'fumble' | null; damage_type : string } => 
{
	let damage_type = '';

	for ( const roll of rolls ) 
	{
		if ( roll && typeof roll === 'object' && ( roll.constructor.name === 'Roll' || roll.dice ) ) 
		{
			debug_log( 'checking roll result terms:', {
				formula: roll.formula,
				total: roll.total,
				is_critical: roll.isCritical,
				is_fumble: roll.isFumble
			} );

			/** 
			 * dnd5e v3/v4 uses isCritical/isFumble properties.
			 * we check for strict boolean true to avoid threshold traps.
			 **/
			if ( roll.isCritical === true ) 
			{ 
				return { type: 'critical', damage_type }; 
			}
			if ( roll.isFumble === true ) 
			{ 
				return { type: 'fumble', damage_type }; 
			}

			/** fallback: check dice results for natural 20/1 **/
			const d20 = roll.dice?.find( ( d : any ) => d.faces === 20 );
			if ( d20 ) 
			{
				/** skip check if it's a massive dice pool and we're ignoring them **/
				if ( options.ignore_multi && d20.results.length > 2 ) 
				{ 
					continue; 
				}

				/** filter for active results if ignoring discarded dice **/
				const valid_results = options.ignore_discarded 
					? d20.results.filter( ( r : any ) => r.active !== false && r.discarded !== true )
					: d20.results;

				if ( valid_results.some( ( r : any ) => r.result === 20 ) ) 
				{ 
					return { type: 'critical', damage_type }; 
				}
				if ( valid_results.some( ( r : any ) => r.result === 1 ) ) 
				{ 
					return { type: 'fumble', damage_type }; 
				}
			}
		}
	}

	return { type: null, damage_type };
};
