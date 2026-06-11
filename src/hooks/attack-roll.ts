/**
 * @file src/hooks/attack-roll.ts
 * hooks into dnd5e chat messages to trigger critical hit animations.
 * customized by yugen. to integrate with the activities framework and dice so nice.
 **/

import { CriticalAnimation } from '../module/critical-animation.js';
import { debug_log } from '../module/utils.js';

/** track processed roll instances to prevent double-triggering on the same roll **/
const processed_rolls = new WeakSet<any>( );

export const attack_roll_hook = ( ) => 
{
	/** listen for chat messages to capture rolls that have been generated **/
	Hooks.on( 'createChatMessage', ( message : any ) => 
	{
		process_message_rolls( message );
	} );

	/** listen for chat message updates to capture rolls added asynchronously by automation modules **/
	Hooks.on( 'updateChatMessage', ( message : any ) => 
	{
		process_message_rolls( message );
	} );
};

/**
 * processes a chat message to find and trigger critical or fumble animations
 **/
const process_message_rolls = ( message : any ) => 
{
	if ( !message?.id ) 
	{
		return;
	}

	if ( !message.rolls || message.rolls.length === 0 ) 
	{
		return;
	}

	debug_log( 'processing chat message:', message.id );

	/**
	 * ignore initiative rolls to prevent yugen-criticals from incorrectly playing critical hit animations during combat entry
	 **/
	const is_initiative = message.flags?.dnd5e?.roll?.type === 'initiative';
	if ( is_initiative ) 
	{
		debug_log( 'ignored message because it is an initiative roll:', message.id );
		return;
	}

	/**
	 * determine if the message is a valid attack roll
	 **/
	const is_attack = 
		message.flags?.dnd5e?.roll?.type === 'attack' ||
		!!message.flags?.['midi-qol']?.hasAttack ||
		message.rolls?.some( ( r : any ) => r.options?.type === 'attack' || r.options?.rollType === 'attack' );
	
	/** check setting for showing all critical hits **/
	const always_crit = ( game as any ).settings.get( 'yugen-criticals', 'always-show-crit' );
	
	/** check setting for showing all fumble failures **/
	const always_fumble = ( game as any ).settings.get( 'yugen-criticals', 'always-show-fumble' );

	/**
	 * only process if it is a valid attack roll, or if always show crit/fumble is active on any roll
	 **/
	if ( !is_attack && !always_crit && !always_fumble ) 
	{
		debug_log( 'ignored message because it is not an attack roll and always-show is disabled:', message.id );
		return;
	}

	/** resolve the actor from the message **/
	/** fetch actor by id ifspeaker actor is defined **/
	const actor = message.actor || ( message.speaker?.actor ? ( game as any ).actors.get( message.speaker.actor ) : null );
	if ( !actor ) 
	{
		debug_log( 'ignored message because no actor could be resolved:', message.id );
		return;
	}

	/** check setting for ignoring discarded d20 dice **/
	const ignore_discarded = ( game as any ).settings.get( 'yugen-criticals', 'ignore-discarded-dice' );
	
	/** check setting for ignoring multi dice pools **/
	const ignore_multi = ( game as any ).settings.get( 'yugen-criticals', 'ignore-multi-dice' );
	
	/** check setting for showing animations locally only **/
	const user_only = ( game as any ).settings.get( 'yugen-criticals', 'user-only' );

	let type : 'critical' | 'fumble' | null = null;
	let matching_roll : any = null;
	let unprocessed_count = 0;

	/** find the first unprocessed roll with a natural critical/fumble **/
	for ( const roll of message.rolls ) 
	{
		if ( processed_rolls.has( roll ) ) 
		{
			continue;
		}

		unprocessed_count++;
		const roll_type = check_single_roll( roll, { ignore_discarded, ignore_multi } );
		if ( roll_type ) 
		{
			type = roll_type;
			matching_roll = roll;
			break;
		}
	}

	const is_natural = type !== null;

	/** fallback to always show options if no natural result was detected **/
	if ( !type ) 
	{
		const new_roll = message.rolls.find( ( r : any ) => !processed_rolls.has( r ) );
		if ( new_roll ) 
		{
			if ( always_crit ) 
			{
				type = 'critical';
				matching_roll = new_roll;
			}
			else if ( always_fumble ) 
			{
				type = 'fumble';
				matching_roll = new_roll;
			}
		}
	}

	if ( !type || !matching_roll ) 
	{
		debug_log( 'ignored message because no new or matching critical/fumble rolls were found. unprocessed rolls count:', unprocessed_count );
		return;
	}

	/** mark this roll instance as processed to prevent double-triggering **/
	processed_rolls.add( matching_roll );

	let damage_type = '';
	
	/** attempt to resolve damage type from the rolled item **/
	const item_uuid = message.flags?.dnd5e?.roll?.itemUuid || message.flags?.dnd5e?.itemUuid;
	if ( typeof item_uuid === 'string' ) 
	{
		/** retrieve document by uuid synchronously **/
		const item : any = ( fromUuidSync as any )( item_uuid );
		if ( item ) 
		{
			damage_type = item.system?.damage?.parts?.[ 0 ]?.[ 1 ] || damage_type;
		}
	}

	debug_log( 'triggering local animation:', {
		actor: actor.name,
		type,
		damage_type,
		is_natural,
		is_attack
	} );

	/** trigger locally for the rolling player **/
	/** fetch dice so nice module to check if it is active **/
	const is_dsn_active = ( game as any ).modules.get( 'dice-so-nice' )?.active && ( game as any ).dice3d?.isEnabled?.( );
	if ( is_dsn_active ) 
	{
		debug_log( 'queueing animation (dice so nice is active):', message.id );
		CriticalAnimation.queue_animation( message.id, actor, type, damage_type );
	}
	else 
	{
		debug_log( 'showing animation immediately (dice so nice is inactive or client-disabled)' );
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

		debug_log( 'broadcasting animation to other clients via socket:', socket_data );
		/** emit critical animation socket event to all clients **/
		( game as any ).socket.emit( 'module.yugen-criticals', socket_data );
	}
};

/**
 * checks if any of the provided arguments represent a critical hit or a fumble
 **/
const check_single_roll = ( roll : any, options : { ignore_discarded : boolean; ignore_multi : boolean } ) : 'critical' | 'fumble' | null => 
{
	if ( !roll || typeof roll !== 'object' ) 
	{
		return null;
	}

	debug_log( 'checking roll result:', {
		formula: roll.formula,
		total: roll.total,
		isCritical: roll.isCritical,
		isFumble: roll.isFumble
	} );

	/** 
	 * dnd5e v3/v4 uses isCritical/isFumble properties.
	 * we check for strict boolean true to avoid threshold traps.
	 **/
	if ( roll.isCritical === true ) 
	{ 
		debug_log( 'natural critical hit detected via isCritical flag' );
		return 'critical'; 
	}
	if ( roll.isFumble === true ) 
	{ 
		debug_log( 'natural fumble detected via isFumble flag' );
		return 'fumble'; 
	}

	/** fallback: check dice results for natural 20/1 **/
	const d20 = roll.dice?.find( ( d : any ) => d.faces === 20 );
	if ( d20 ) 
	{
		/** skip check if it's a massive dice pool and we're ignoring them **/
		if ( options.ignore_multi && d20.results.length > 2 ) 
		{ 
			debug_log( 'ignored d20 roll due to large dice pool (multi-dice ignore active)', d20.results );
			return null; 
		}

		/** filter for active results if ignoring discarded dice **/
		const valid_results = options.ignore_discarded 
			? d20.results.filter( ( r : any ) => r.active !== false && r.discarded !== true )
			: d20.results;

		debug_log( 'checking d20 results:', valid_results );

		if ( valid_results.some( ( r : any ) => r.result === 20 ) ) 
		{ 
			debug_log( 'natural critical hit detected via dice results (20)' );
			return 'critical'; 
		}
		if ( valid_results.some( ( r : any ) => r.result === 1 ) ) 
		{ 
			debug_log( 'natural fumble detected via dice results (1)' );
			return 'fumble'; 
		}
	}

	return null;
};
