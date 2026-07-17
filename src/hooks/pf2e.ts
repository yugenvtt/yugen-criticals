/**
 * @file src/hooks/pf2e.ts
 * hooks into pf2e attack rolls to trigger animations.
 * customized by yugen. to integrate with the activities framework and dice so nice.
 **/

import { CriticalAnimation } from '../module/critical-animation.js';

/**
 * consolidate pf2e animation triggers into a single chat message hook to resolve duplicate animations on damage rolls and respect secret roll permissions
 **/
export const pf2e_hooks = ( ) => 
{
	/**
	 * chat message hook
	 **/
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

/**
 * handles pf2e specific roll data and triggers animations
 **/
const handle_pf2e_data = ( data : any, actor : any, roll : any = null ) => 
{
	if ( !actor || !roll ) 
	{ 
		return; 
	}

	/**
	 * only process rolls created by the current user to prevent duplicate triggers across clients
	 **/
	if ( !roll.isAuthor ) 
	{
		return;
	}

	/**
	 * ignore damage rolls to prevent double triggering on damage
	 **/
	const is_damage = typeof data?.type === 'string' && data.type.includes( 'damage' );
	if ( is_damage ) 
	{
		return;
	}

	/** check setting for hiding private rolls **/
	const hide_private = ( game as any ).settings.get( 'yugen-criticals', 'hide-private-rolls' );
	if ( hide_private ) 
	{
		/**
		 * check if the current user should see the message rolls (handles secret and blind rolls)
		 **/
		const is_whisper = roll.whisper && roll.whisper.length > 0;
		if ( is_whisper ) 
		{
			const is_recipient = roll.whisper.includes( ( game as any ).user.id );
			const is_author = roll.author?.id === ( game as any ).user.id;
			if ( !is_recipient && !is_author && !( game as any ).user.isGM ) 
			{
				return;
			}
		}

		/**
		 * blind rolls should only be visible to gms
		 **/
		if ( roll.blind && !( game as any ).user.isGM ) 
		{
			return;
		}
	}

	/**
	 * ignore pf2e initiative checks to prevent yugen-criticals from playing animations during combat entry, checking domains, options, and roll type metadata
	 **/
	const is_initiative = 
		data?.type === 'initiative' || 
		roll?.options?.type === 'initiative' ||
		( Array.isArray( data?.domains ) && data.domains.includes( 'initiative' ) ) ||
		( Array.isArray( roll?.options ) && roll.options.includes( 'initiative' ) ) ||
		( roll?.options instanceof Set && roll.options.has( 'initiative' ) ) ||
		( Array.isArray( data?.options ) && data.options.includes( 'initiative' ) ) ||
		( data?.options instanceof Set && data.options.has( 'initiative' ) );

	if ( is_initiative ) 
	{
		return;
	}

	const event_id = roll?._id || roll?.id || data?.id || '';

	/** 
	 * resolve degree of success from multiple potential locations.
	 * v14 often hides these in the nested roll instances within the message.
	 **/
	let dos = data?.degreeOfSuccess ?? roll?.options?.degreeOfSuccess ?? roll?.degreeOfSuccess;
	let outcome = data?.outcome ?? roll?.options?.outcome;
	
	/**
	 * fallback: if it is a message, check its internal rolls array
	 **/
	const message_rolls = roll?.rolls || data?.rolls || [ ];
	if ( ( dos === undefined || dos === null ) && message_rolls.length > 0 ) 
	{
		const first_roll = message_rolls[ 0 ];
		dos = first_roll.options?.degreeOfSuccess ?? first_roll.degreeOfSuccess;
		outcome = first_roll.options?.outcome;

		/**
		 * ultimate fallback: check the actual dice faces for natural 1/20
		 **/
		if ( dos === undefined || dos === null ) 
		{
			const d20 = first_roll.dice?.find( ( d : any ) => 
			{
				return d.faces === 20;
			} );
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

	/**
	 * check setting for showing all critical hits
	 **/
	const always_crit = ( game as any ).settings.get( 'yugen-criticals', 'always-show-crit' );
	
	/**
	 * check setting for showing all fumble failures
	 **/
	const always_fumble = ( game as any ).settings.get( 'yugen-criticals', 'always-show-fumble' );
	
	/**
	 * check setting for pf2e natural critical hits only
	 **/
	const pf2e_natural_only = ( game as any ).settings.get( 'yugen-criticals', 'pf2e-natural-only' );

	/**
	 * check setting for showing animations locally only
	 **/
	const user_only = ( game as any ).settings.get( 'yugen-criticals', 'user-only' );

	let type : 'critical' | 'fumble' | null = null;
	let is_natural = false;

	if ( pf2e_natural_only ) 
	{
		const first_roll = message_rolls[ 0 ];
		if ( first_roll ) 
		{
			const d20 = first_roll.dice?.find( ( d : any ) => 
			{
				return d.faces === 20;
			} );
			if ( d20 ) 
			{
				const active_results = d20.results?.filter( ( r : any ) => 
				{
					return r.active !== false && r.discarded !== true;
				} ) || [ ];

				const has_natural_20 = active_results.some( ( r : any ) => 
				{
					return r.result === 20;
				} );
				const has_natural_1 = active_results.some( ( r : any ) => 
				{
					return r.result === 1;
				} );

				if ( has_natural_20 && ( dos === 3 || outcome === 'criticalSuccess' ) ) 
				{
					type = 'critical';
					is_natural = true;
				}
				else if ( has_natural_1 && ( dos === 0 || outcome === 'criticalFailure' ) ) 
				{
					type = 'fumble';
					is_natural = true;
				}
			}
		}
	}
	else 
	{
		/**
		 * 1. check for natural outcomes (0=crit fail, 3=crit success)
		 **/
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
	}

	/**
	 * 2. check for always show overrides if no natural outcome was found
	 **/
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

	/**
	 * check if dice so nice module is active
	 **/
	const is_dsn_active = ( game as any ).modules.get( 'dice-so-nice' )?.active && ( game as any ).dice3d?.isEnabled?.( );
	if ( is_dsn_active && event_id ) 
	{
		CriticalAnimation.queue_animation( event_id, actor, type, '' );
	}
	else 
	{
		void CriticalAnimation.show_animation( actor, type, '' );
	}

	if ( !user_only && is_natural ) 
	{
		const socket_data = {
			actor_uuid: actor.uuid,
			type: type,
			damage_type: '',
			sender_id: ( game as any ).user.id,
			roll_id: event_id
		};

		/**
		 * emit critical animation socket event to all clients
		 **/
		( game as any ).socket.emit( 'module.yugen-criticals', socket_data );
	}
};
