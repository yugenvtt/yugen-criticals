/**
 * @file src/hooks/finisher.ts
 * logic for triggering animations when a target drops to 0 hp
 **/

import { CriticalAnimation } from '../module/critical-animation.js';
import { debug_log } from '../module/utils.js';

let last_attacker : any = null;
let last_crit_time : number = 0;
let last_damage_type : string = '';

export const finisher_hooks = ( ) => 
{
	debug_log( 'Finisher hooks initialized!' );

	const track_attacker = ( message : any ) => 
	{
		try 
		{
			debug_log( 'inspecting message for damage:', message.id, message.rolls );

			const is_damage = 
				message.rolls?.some( ( r : any ) => 
				{
					return r.options?.type === 'damage' || r.options?.rollType === 'damage' || r.constructor.name === 'DamageRoll';
				} ) || 
				message.flags?.pf2e?.context?.type?.includes( 'damage' );

			if ( is_damage ) 
			{
				last_attacker = message.actor || ( ChatMessage as any ).getSpeakerActor( message.speaker );
				debug_log( 'finisher tracked damage from attacker:', last_attacker?.name, 'UUID:', last_attacker?.uuid );

				/** attempt to resolve damage type from the rolled item **/
				const item_uuid = message.flags?.dnd5e?.roll?.itemUuid || message.flags?.dnd5e?.itemUuid || message.item?.uuid;
				if ( typeof item_uuid === 'string' ) 
				{
					/** retrieve document by uuid synchronously **/
					const item : any = ( fromUuidSync as any )( item_uuid );
					if ( item ) 
					{
						last_damage_type = item.system?.damage?.parts?.[ 0 ]?.[ 1 ] || '';
					}
				}
			}
		}
		catch ( error )
		{
			console.error( 'yugen-criticals | error in track_attacker:', error );
		}
	};

	/** track the last damage roller **/
	Hooks.on( 'createChatMessage', track_attacker );
	Hooks.on( 'updateChatMessage', track_attacker );

	/** detect hp drops to 0 **/
	Hooks.on( 'updateActor', ( actor : any, update : any, options : any, user_id : string ) => 
	{
		debug_log( 'updateActor hook fired for:', actor.name, 'update:', JSON.stringify( update ) );

		/** check if hp dropped to 0 or below **/
		const hp_value = update?.system?.attributes?.hp?.value ?? update?.[ 'system.attributes.hp.value' ];
		
		if ( hp_value !== undefined && hp_value <= 0 ) 
		{
			debug_log( 'finisher detected hp <= 0 for actor:', actor.name );
			if ( !last_attacker ) 
			{
				debug_log( 'finisher aborted: no last_attacker tracked' );
				return;
			}

			/** check actor flag for showing finisher animations **/
			const show_finisher = last_attacker.getFlag( 'yugen-criticals', 'show-on-finisher' );
			if ( !show_finisher ) 
			{
				debug_log( 'finisher aborted: show-on-finisher flag not enabled for attacker:', last_attacker.name );
				return;
			}

			/** prevent double-trigger if they just critted **/
			const time_since_crit = Date.now( ) - last_crit_time;
			if ( time_since_crit < 5000 ) 
			{
				debug_log( 'finisher aborted: critical hit already triggered recently' );
				return;
			}

			/** verify that the current user is the one who triggered the update (e.g. gm applied damage or attacker applied it) **/
			if ( ( game as any ).user.id !== user_id ) 
			{
				debug_log( 'finisher aborted: current user did not trigger the update' );
				return;
			}

			debug_log( 'finisher executing for attacker:', last_attacker.name );

			/** show the animation for the last attacker **/
			void CriticalAnimation.show_animation( last_attacker, 'finisher', last_damage_type );

			/** emit socket event to broadcast the finisher animation **/
			const user_only = ( game as any ).settings.get( 'yugen-criticals', 'user-only' );
			if ( !user_only ) 
			{
				const socket_data = {
					actor_uuid: last_attacker.uuid,
					type: 'finisher',
					damage_type: last_damage_type,
					sender_id: ( game as any ).user.id
				};
				( game as any ).socket.emit( 'module.yugen-criticals', socket_data );
			}
		}
	} );
};

/**
 * marks the time of the most recent critical hit to prevent double-triggering finishers
 **/
export const mark_recent_crit = ( ) => 
{
	last_crit_time = Date.now( );
};
