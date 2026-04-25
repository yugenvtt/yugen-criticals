/**
 * @file src/hooks/attack-roll.ts
 * hooks into dnd5e attack rolls to trigger animations.
 **/

import { CriticalAnimation } from '../module/critical-animation.js';

export const attack_roll_hook = ( ) => 
{
	/** listen for attack rolls in the dnd5e system (standard hook) **/
	Hooks.on( 'dnd5e.rollAttack', ( ...args : any[] ) => 
	{
		handle_hook_params( args );
	} );

	/** listen for post-roll attack in newer dnd5e versions **/
	Hooks.on( 'dnd5e.postRollAttack', ( ...args : any[] ) => 
	{
		handle_hook_params( args );
	} );
};

/**
 * deep-resolves an actor from an unknown object or property
 **/
const resolve_actor = ( obj : any ) : any => 
{
	if ( !obj ) 
	{
		return null;
	}

	/** 1. direct document check **/
	if ( obj.documentName === 'Actor' ) 
	{
		return obj;
	}

	/** 2. item parent resolution **/
	if ( obj.documentName === 'Item' ) 
	{
		return obj.actor || obj.parent;
	}

	/** 3. check common properties **/
	if ( obj.actor?.documentName === 'Actor' ) 
	{
		return obj.actor;
	}

	if ( obj.parent?.documentName === 'Actor' ) 
	{
		return obj.parent;
	}

	if ( obj.item?.actor ) 
	{
		return obj.item.actor;
	}

	/** 4. check for v14 specific roll config properties **/
	if ( obj.subject?.actor ) 
	{
		return obj.subject.actor;
	}

	if ( obj.subject?.documentName === 'Actor' ) 
	{
		return obj.subject;
	}

	/** 5. check for uuid-style references **/
	const uuid = obj.uuid || obj.actorUuid || obj.itemUuid || obj.options?.itemUuid || obj.options?.actorUuid;
	
	if ( typeof uuid === 'string' ) 
	{
		const resolved : any = ( fromUuidSync as any )( uuid );
		
		if ( resolved ) 
		{
			return resolved.documentName === 'Actor' ? resolved : ( resolved.actor || resolved.parent );
		}
	}

	return null;
};

/** track the last processed roll id to prevent double-triggering from multiple hooks **/
let last_roll_id = '';

/**
 * checks if any of the provided arguments represent a critical hit or a fumble
 **/
const check_roll_result = ( args : any[] ) : { type : 'critical' | 'fumble' | null, damage_type : string, roll_id : string } => 
{
	let damage_type = '';
	let roll_id = '';

	/** flatten arguments to handle arrays of objects **/
	const flattened_args = args.flat( );

	for ( const arg of flattened_args ) 
	{
		if ( !arg ) 
		{ 
			continue; 
		}

		/** try to extract damage type from item **/
		if ( arg.documentName === 'Item' || arg.item?.documentName === 'Item' ) 
		{
			const item = arg.documentName === 'Item' ? arg : arg.item;
			damage_type = item.system.damage?.parts?.[ 0 ]?.[ 1 ] || '';
		}

		/** check for the roll object itself **/
		const rolls = Array.isArray( arg ) ? arg : [ arg ];
		
		for ( const roll of rolls ) 
		{
			if ( roll && typeof roll === 'object' && ( roll.constructor.name === 'Roll' || roll.dice ) ) 
			{
				/** track roll id for debouncing **/
				roll_id = roll._id || roll.options?.rollId || '';

				/** 
				 * dnd5e v3/v4 uses isCritical/isFumble properties.
				 * we check for strict boolean true to avoid threshold traps.
				 **/
				if ( roll.isCritical === true ) 
				{ 
					return { type: 'critical', damage_type, roll_id }; 
				}
				if ( roll.isFumble === true ) 
				{ 
					return { type: 'fumble', damage_type, roll_id }; 
				}

				/** fallback: check dice results for natural 20/1 **/
				const d20 = roll.dice?.find( ( d : any ) => d.faces === 20 );
				if ( d20 ) 
				{
					if ( d20.results.some( ( r : any ) => r.result === 20 ) ) 
					{ 
						return { type: 'critical', damage_type, roll_id }; 
					}
					if ( d20.results.some( ( r : any ) => r.result === 1 ) ) 
					{ 
						return { type: 'fumble', damage_type, roll_id }; 
					}
				}
			}
		}

		/** 
		 * check for explicit boolean flags. 
		 * we MUST ignore numbers here as they represent thresholds, not results.
		 **/
		if ( arg.criticalSuccess === true ) 
		{ 
			return { type: 'critical', damage_type, roll_id }; 
		}
		if ( arg.fumble === true ) 
		{ 
			return { type: 'fumble', damage_type, roll_id }; 
		}
	}

	return { type: null, damage_type, roll_id };
};

/**
 * iterates through arguments to find a valid actor and triggers if critical/fumble
 **/
const handle_hook_params = ( args : any[] ) => 
{
	let { type, damage_type, roll_id } = check_roll_result( args );

	/** debounce: if we just processed this specific roll, skip it **/
	if ( roll_id && roll_id === last_roll_id ) 
	{
		return;
	}
	if ( roll_id ) 
	{ 
		last_roll_id = roll_id; 
	}

	const always_crit = ( game as any ).settings.get( 'yugen-criticals', 'always-show-crit' );
	const always_fumble = ( game as any ).settings.get( 'yugen-criticals', 'always-show-fumble' );
	const user_only = ( game as any ).settings.get( 'yugen-criticals', 'user-only' );

	/** handle natural results first **/
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

	/** flatten to handle the nested array dnd5e often sends **/
	const flattened_args = args.flat( );

	for ( const arg of flattened_args ) 
	{
		if ( !arg ) 
		{
			continue;
		}

		let actor = resolve_actor( arg );
		
		if ( actor && ( actor.documentName === 'Actor' || actor instanceof ( window as any ).Actor ) ) 
		{
			/** trigger locally for the rolling player immediately **/
			void CriticalAnimation.show_animation( actor, type, damage_type );

			/** 
			 * broadcast to others only if:
			 * 1. user-only mode is OFF
			 * 2. and it was a NATURAL crit/fumble (we don't spam local 'always show' settings to others)
			 **/
			if ( !user_only && is_natural ) 
			{
				const socket_data = {
					actor_uuid: actor.uuid,
					type: type,
					damage_type: damage_type,
					sender_id: ( game as any ).user.id
				};

				( game as any ).socket.emit( 'module.yugen-criticals', socket_data );
			}
			
			return;
		}
	}
};
