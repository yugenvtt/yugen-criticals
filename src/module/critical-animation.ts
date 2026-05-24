/**
 * @file src/module/critical-animation.ts
 * handles the fire emblem style critical animation overlay with enhanced cinematic features.
 **/

import { debug_log } from './utils.js';

export class CriticalAnimation 
{
	private static _pending = new Map<string, { actor : Actor; type : 'critical' | 'fumble'; damage_type : string }>( );

	/**
	 * queues a critical/fumble animation waiting for dice rolling completion
	 **/
	public static queue_animation( id : string, actor : Actor, type : 'critical' | 'fumble', damage_type : string ) : void 
	{
		this._pending.set( id, { actor, type, damage_type } );

		/** safety cleanup fallback: trigger after 5 seconds if not resolved to prevent memory leak **/
		setTimeout( ( ) => 
		{
			if ( this._pending.has( id ) ) 
			{
				const data = this._pending.get( id );
				this._pending.delete( id );
				if ( data ) 
				{
					void this.show_animation( data.actor, data.type, data.damage_type );
				}
			}
		}, 5000 );
	}

	/**
	 * checks if an animation is pending for a given ID
	 **/
	public static has_pending( id : string ) : boolean 
	{
		return this._pending.has( id );
	}

	/**
	 * triggers a pending animation by its ID
	 **/
	public static trigger_pending( id : string ) : void 
	{
		const data = this._pending.get( id );
		if ( data ) 
		{
			this._pending.delete( id );
			void this.show_animation( data.actor, data.type, data.damage_type );
		}
	}

	/**
	 * displays the critical animation for a given actor
	 **/
	public static async show_animation( actor : Actor, type : 'critical' | 'fumble' = 'critical', damage_type : string = '' ) : Promise<void>
	{
		/** ensure we are on the client side and canvas is ready **/
		if ( !canvas?.ready ) 
		{
			return;
		}

		/** prevent overlapping animations to avoid visual layering/clutter **/
		if ( document.querySelector( '.yugen-critical-overlay' ) ) 
		{
			return;
		}

		debug_log( 'showing animation:', {
			actor: actor.name,
			type: type,
			damage_type: damage_type
		} );

		/** retrieve settings and localization **/
		const settings = ( game as any ).settings;
		const is_fumble = type === 'fumble';
		
		const default_crit_msg = settings.get( 'yugen-criticals', 'critical-message' ) || "CRITICAL HIT";
		const default_fumble_msg = settings.get( 'yugen-criticals', 'fumble-message' ) || "FUMBLE";
		
		/** resolve the actor quote: supports strings, arrays, or delimited strings **/
		const raw_quote = ( actor as any ).getFlag( 'yugen-criticals', is_fumble ? 'fumble-quote' : 'crit-quote' );
		let actor_quote = '';

		if ( raw_quote ) 
		{
			let quotes : string[] = [ ];

			if ( Array.isArray( raw_quote ) ) 
			{
				/** handle array of strings **/
				quotes = raw_quote;
			}
			else if ( typeof raw_quote === 'string' ) 
			{
				/** handle delimited or single string **/
				quotes = raw_quote.split( '|' ).map( ( q : string ) => 
				{
					return q.trim( );
				} );
			}

			if ( quotes.length > 0 ) 
			{
				/** pick a random message from the pool **/
				const random_index = Math.floor( Math.random( ) * quotes.length );
				actor_quote = quotes[ random_index ];
			}
		}
		
		/** use the actor's quote if present, otherwise fallback to defaults **/
		const message = actor_quote || ( is_fumble ? default_fumble_msg : default_crit_msg );
		
		/** resolve theme color based on damage type or default settings **/
		let color = is_fumble ? '#333333' : ( settings.get( 'yugen-criticals', 'critical-color' ) || '#ffffff' );
		
		if ( !is_fumble && damage_type ) 
		{
			color = this._get_color_for_damage( damage_type ) || color;
		}

		/** retrieve the critical animation scale setting **/
		const scale = settings.get( 'yugen-criticals', 'critical-size' ) || 1.0;

		/** retrieve the critical sound volume setting **/
		const volume = settings.get( 'yugen-criticals', 'critical-volume' ) ?? 0.5;

		/** retrieve the custom signature style override flag **/
		const actor_style = ( actor as any ).getFlag( 'yugen-criticals', 'style-override' );

		/** retrieve the force global style setting **/
		const gm_override = settings.get( 'yugen-criticals', 'gm-style-override' );

		const style = gm_override ? settings.get( 'yugen-criticals', 'global-animation-style' ) : ( actor_style && actor_style !== 'default' ? actor_style : ( settings.get( 'yugen-criticals', 'animation-style' ) || 'cinematic' ) );


		/** resolve sound source: actor override -> type default (supports arrays or delimited strings) **/
		const raw_sound = ( actor as any ).getFlag( 'yugen-criticals', is_fumble ? 'fumble-sound' : 'crit-sound' ) || ( is_fumble ? settings.get( 'yugen-criticals', 'fumble-sound' ) : settings.get( 'yugen-criticals', 'critical-sound' ) );
		let sound_src = '';

		if ( raw_sound ) 
		{
			let sounds : string[] = [ ];

			if ( Array.isArray( raw_sound ) ) 
			{
				/** handle array of strings **/
				sounds = raw_sound;
			}
			else if ( typeof raw_sound === 'string' ) 
			{
				/** handle delimited or single string **/
				sounds = raw_sound.split( '|' ).map( ( s : string ) => 
				{
					return s.trim( );
				} );
			}

			if ( sounds.length > 0 ) 
			{
				/** pick a random sound from the pool **/
				const random_index = Math.floor( Math.random( ) * sounds.length );
				sound_src = sounds[ random_index ];
			}
		}

		/** play the sound effect **/
		if ( sound_src ) 
		{
			void ( game as any ).audio.play( sound_src, { volume: volume, loop: false } );
		}

		/**
		 * resolve the portrait image, falling back to token texture if portrait is mystery man
		 **/
		let portrait_img = actor.img || '';

		const token_img = ( actor as any ).prototypeToken?.texture?.src;

		if ( !portrait_img || portrait_img.includes( 'mystery-man.svg' ) ) 
		{
			if ( token_img ) 
			{
				portrait_img = token_img;
			}
		}

		/** create the overlay container **/
		const overlay = document.createElement( 'div' );
		overlay.classList.add( 'yugen-critical-overlay' );
		overlay.classList.add( `style-${ style }` );

		if ( is_fumble ) 
		{ 
			overlay.classList.add( 'fumble' ); 
		}
		
		/** apply custom variables for css to consume **/
		overlay.style.setProperty( '--yugen-crit-color', color );
		overlay.style.setProperty( '--yugen-crit-scale', scale.toString( ) );
		
		/** 
		 * construct the inner html 
		 * switches between styles based on user preference.
		 **/
		if ( style === 'anime' ) 
		{
			overlay.innerHTML = `
				<div class="yugen-speed-lines"></div>
				<div class="yugen-anime-portrait-container">
					<div class="yugen-anime-portrait" style="background-image: url('${ portrait_img }');"></div>
				</div>
				<div class="yugen-critical-text-container anime">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'cyberpunk' )
		{
			overlay.innerHTML = `
				<div class="yugen-cyber-bg"></div>
				<div class="yugen-scanlines"></div>
				<div class="yugen-cyber-portrait" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container cyber">
					<div class="yugen-cyber-label">// CRITICAL HIT DETECTED //</div>
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'mk' )
		{
			overlay.innerHTML = `
				<div class="yugen-mk-overlay"></div>
				<div class="yugen-mk-portrait" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container mk">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'barbarian' )
		{
			overlay.innerHTML = `
				<div class="yugen-class-bg yugen-barbarian"></div>
				<div class="yugen-class-effect yugen-barbarian"></div>
				<div class="yugen-class-portrait yugen-barbarian" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container yugen-class-barbarian">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'bard' )
		{
			overlay.innerHTML = `
				<div class="yugen-class-bg yugen-bard"></div>
				<div class="yugen-music-staff"></div>
				<div class="yugen-class-effect yugen-bard"></div>
				<div class="yugen-class-portrait yugen-bard" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container yugen-class-bard">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'cleric' )
		{
			overlay.innerHTML = `
				<div class="yugen-class-bg yugen-cleric"></div>
				<div class="yugen-holy-pillar"></div>
				<div class="yugen-class-effect yugen-cleric"></div>
				<div class="yugen-class-portrait yugen-cleric" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container yugen-class-cleric">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'druid' )
		{
			overlay.innerHTML = `
				<div class="yugen-class-bg yugen-druid"></div>
				<div class="yugen-class-effect yugen-druid"></div>
				<div class="yugen-class-portrait yugen-druid" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-druid-quote-wrapper">
					<div class="yugen-critical-text-container yugen-class-druid">
						<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
						<div class="yugen-druid-vine"></div>
					</div>
				</div>
			`;
		}
		else if ( style === 'fighter' )
		{
			overlay.innerHTML = `
				<div class="yugen-class-bg yugen-fighter"></div>
				<div class="yugen-slash-bar"></div>
				<div class="yugen-class-effect yugen-fighter"></div>
				<div class="yugen-class-portrait yugen-fighter" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container yugen-class-fighter">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'warlock' )
		{
			overlay.innerHTML = `
				<div class="yugen-class-bg yugen-warlock"></div>
				<div class="yugen-void-crack"></div>
				<div class="yugen-class-effect yugen-warlock"></div>
				<div class="yugen-class-portrait yugen-warlock" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container yugen-class-warlock">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else if ( style === 'wizard' )
		{
			overlay.innerHTML = `
				<div class="yugen-class-bg yugen-wizard"></div>
				<div class="yugen-rune-circle-1"></div>
				<div class="yugen-rune-circle-2"></div>
				<div class="yugen-class-effect yugen-wizard"></div>
				<div class="yugen-class-portrait yugen-wizard" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-wizard-quote-wrapper">
					<div class="yugen-wizard-spell-ward"></div>
					<div class="yugen-critical-text-container yugen-class-wizard">
						<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
					</div>
				</div>
			`;
		}
		else
		{
			/** default cinematic style **/
			overlay.innerHTML = `
				<div class="yugen-impact-flash animate"></div>
				<div class="yugen-critical-bar"></div>
				<div class="yugen-critical-avatar" style="background-image: url('${ portrait_img }');"></div>
				<div class="yugen-critical-text-container">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}

		document.body.appendChild( overlay );

		/** trigger screen shake and zoom if enabled **/
		const is_shake_enabled = settings.get( 'yugen-criticals', 'screen-shake' ) ?? true;
		if ( is_shake_enabled ) 
		{
			const board = document.getElementById( 'board' );
			if ( board ) 
			{
				board.classList.add( 'yugen-board-shake' );
				setTimeout( ( ) => 
				{
					board.classList.remove( 'yugen-board-shake' );
				}, 1200 );
			}
		}

		/** remove the overlay after the animation completes **/
		setTimeout( ( ) => 
		{
			overlay.classList.add( 'fade-out' );
			
			setTimeout( ( ) => 
			{
				overlay.remove( );
			}, 1000 );

		}, 3500 );
	}

	/**
	 * maps damage types to specific theme colors
	 **/
	private static _get_color_for_damage( damage_type : string ) : string | null 
	{
		const type = damage_type.toLowerCase( );
		const colors : Record<string, string> = 
		{
			fire: '#ff4400',
			cold: '#00ccff',
			lightning: '#ffff00',
			acid: '#00ff00',
			poison: '#aa00ff',
			necrotic: '#440044',
			radiant: '#ffffcc',
			force: '#ff00ff',
			thunder: '#cccccc',
			psychic: '#ff66aa'
		};

		return colors[ type ] || null;
	}
}
