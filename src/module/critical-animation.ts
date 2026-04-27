/**
 * @file src/module/critical-animation.ts
 * handles the fire emblem style critical animation overlay with enhanced cinematic features.
 **/

export class CriticalAnimation 
{
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

		const scale = settings.get( 'yugen-criticals', 'critical-size' ) || 1.0;
		const volume = settings.get( 'yugen-criticals', 'critical-volume' ) ?? 0.5;

		/** resolve style: world override -> client preference **/
		const gm_override = settings.get( 'yugen-criticals', 'gm-style-override' );
		const style = gm_override ? settings.get( 'yugen-criticals', 'global-animation-style' ) : ( settings.get( 'yugen-criticals', 'animation-style' ) || 'cinematic' );

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
					<div class="yugen-anime-portrait" style="background-image: url('${ actor.img }');"></div>
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
				<div class="yugen-cyber-portrait" style="background-image: url('${ actor.img }');"></div>
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
				<div class="yugen-mk-portrait" style="background-image: url('${ actor.img }');"></div>
				<div class="yugen-critical-text-container mk">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}
		else
		{
			/** default cinematic style **/
			overlay.innerHTML = `
				<div class="yugen-impact-flash animate"></div>
				<div class="yugen-critical-bar"></div>
				<div class="yugen-critical-avatar" style="background-image: url('${ actor.img }');"></div>
				<div class="yugen-critical-text-container">
					<div class="yugen-critical-text">${ message.toUpperCase( ) }</div>
				</div>
			`;
		}

		document.body.appendChild( overlay );

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
