/**
 * @file src/hooks/pf2e.ts
 * hooks into pf2e attack rolls to trigger animations.
 **/

import { CriticalAnimation } from '../module/critical-animation.js';

export const pf2e_hooks = ( ) => 
{
	/** 1. check roll hook (standard pf2e checks) **/
	Hooks.on( 'pf2e.rollCheck', ( roll : any ) => 
	{
		handle_pf2e_data( roll.options, roll.actor, roll );
	} );

	/** 2. damage roll hook (for critical damage) **/
	Hooks.on( 'pf2e.damageRoll', ( roll : any ) => 
	{
		handle_pf2e_data( roll.options, roll.actor, roll );
	} );

	/** 3. chat message fallback (most reliable for degree of success) **/
	Hooks.on( 'createChatMessage', ( message : any ) => 
	{
		const context = message.flags.pf2e?.context;
		if ( !context ) 
		{ 
			return; 
		}

		handle_pf2e_data( context, message.actor, message );
	} );
};

/** track the last processed event ID and time to prevent double-triggering **/
let last_event_id = '';
let last_trigger_time = 0;

/**
 * handles pf2e specific roll data and triggers animations
 **/
const handle_pf2e_data = ( data : any, actor : any, roll : any = null ) => 
{
	if ( !actor ) 
	{ 
		return; 
	}

	const now = Date.now( );

	/** debounce: resolve a unique ID for this event (roll ID or message ID) **/
	const event_id = roll?._id || roll?.id || data?.id || '';
	
	if ( event_id && event_id === last_event_id ) 
	{
		return;
	}
	
	if ( !event_id && ( now - last_trigger_time < 100 ) ) 
	{
		return;
	}

	if ( event_id ) 
	{
		last_event_id = event_id;
	}
	last_trigger_time = now;

	/** 
	 * resolve degree of success from multiple potential locations.
	 * v14 often hides these in the nested roll instances within the message.
	 **/
	let dos = data?.degreeOfSuccess ?? roll?.options?.degreeOfSuccess ?? roll?.degreeOfSuccess;
	let outcome = data?.outcome ?? roll?.options?.outcome;
	
	/** fallback: if it's a message, check its internal rolls array **/
	const message_rolls = roll?.rolls || data?.rolls || [ ];
	if ( ( dos === undefined || dos === null ) && message_rolls.length > 0 ) 
	{
		const first_roll = message_rolls[ 0 ];
		dos = first_roll.options?.degreeOfSuccess ?? first_roll.degreeOfSuccess;
		outcome = first_roll.options?.outcome;

		/** ultimate fallback: check the actual dice faces for natural 1/20 **/
		if ( dos === undefined || dos === null ) 
		{
			const d20 = first_roll.dice?.find( ( d : any ) => d.faces === 20 );
			if ( d20 ) 
			{
				const face_value = d20.results[ 0 ]?.result;
				if ( face_value === 20 ) 
				{ 
					dos = 3; 
				}
				else if ( face_value === 1 ) 
				{ 
					dos = 0; 
				}
			}
		}
	}

	const always_crit = ( game as any ).settings.get( 'yugen-criticals', 'always-show-crit' );
	const always_fumble = ( game as any ).settings.get( 'yugen-criticals', 'always-show-fumble' );
	const user_only = ( game as any ).settings.get( 'yugen-criticals', 'user-only' );

	let type : 'critical' | 'fumble' | null = null;
	let is_natural = false;

	/** 1. check for natural outcomes (0=Crit Fail, 3=Crit Success) **/
	if ( dos === 3 || outcome === 'criticalSuccess' ) 
	{
		type = 'critical';
		is_natural = true;
	}
	else if ( dos === 0 || outcome === 'criticalFailure' ) 
	{
		type = 'fumble';
		is_natural = true;
	}

	/** 2. check for 'always show' overrides if no natural outcome was found **/
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

	if ( !type ) 
	{ 
		return; 
	}

	/** 3. trigger animation and broadcast **/
	void CriticalAnimation.show_animation( actor, type, '' );

	if ( !user_only && is_natural ) 
	{
		const socket_data = {
			actor_uuid: actor.uuid,
			type: type,
			damage_type: '',
			sender_id: ( game as any ).user.id
		};

		( game as any ).socket.emit( 'module.yugen-criticals', socket_data );
	}
};
