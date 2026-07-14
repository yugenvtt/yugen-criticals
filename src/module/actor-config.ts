/**
 * @file src/module/actor-config.ts
 * configures signature quotes and sounds for individual actors.
 **/

const FormApplicationClass = ( window as any ).FormApplication || class { };

export class ActorConfigApp extends ( FormApplicationClass as any ) 
{
	private actor : any;

	constructor( actor : any, options : any = { } ) 
	{
		super( actor, options );
		this.actor = actor;
	}

	static get defaultOptions( ) 
	{
		return ( foundry.utils as any ).mergeObject( super.defaultOptions, {
			id: 'yugen-criticals-config',
			title: 'yugen-criticals-config',
			classes: [ 
				'sheet', 
				'yugen-app' 
			],
			template: 'modules/yugen-criticals/templates/actor-config.hbs',
			width: 600,
			height: 750,
			closeOnSubmit: true,
			resizable: true
		} );
	}

	async getData( ) 
	{
		/** retrieve the current critical quotes flag **/
		const raw_crit = this.actor.getFlag( 'yugen-criticals', 'crit-quote' );

		/** retrieve the current fumble quotes flag **/
		const raw_fumble = this.actor.getFlag( 'yugen-criticals', 'fumble-quote' );

		let crit_quote = '';
		if ( raw_crit ) 
		{
			if ( Array.isArray( raw_crit ) ) 
			{
				crit_quote = raw_crit.join( '\n' );
			}
			else 
			{
				crit_quote = raw_crit.split( '|' ).map( ( q : string ) => 
				{
					return q.trim( );
				} ).join( '\n' );
			}
		}

		let fumble_quote = '';
		if ( raw_fumble ) 
		{
			if ( Array.isArray( raw_fumble ) ) 
			{
				fumble_quote = raw_fumble.join( '\n' );
			}
			else 
			{
				fumble_quote = raw_fumble.split( '|' ).map( ( q : string ) => 
				{
					return q.trim( );
				} ).join( '\n' );
			}
		}

		/** retrieve the current critical sound override path **/
		const crit_sound = this.actor.getFlag( 'yugen-criticals', 'crit-sound' ) || '';

		/** retrieve the current fumble sound override path **/
		const fumble_sound = this.actor.getFlag( 'yugen-criticals', 'fumble-sound' ) || '';

		/** retrieve the current style override flag **/
		const style_override = this.actor.getFlag( 'yugen-criticals', 'style-override' ) || 'default';

		/** retrieve the image adjustment flags **/
		const img_offset_x = this.actor.getFlag( 'yugen-criticals', 'img-offset-x' ) ?? 0;
		const img_offset_y = this.actor.getFlag( 'yugen-criticals', 'img-offset-y' ) ?? 0;
		const img_zoom = this.actor.getFlag( 'yugen-criticals', 'img-zoom' ) ?? 0;

		/** retrieve the custom critical portrait image flag **/
		const crit_img = this.actor.getFlag( 'yugen-criticals', 'crit-img' ) || '';

		/** retrieve the custom fumble portrait image flag **/
		const fumble_img = this.actor.getFlag( 'yugen-criticals', 'fumble-img' ) || '';

		const show_on_finisher = this.actor.getFlag( 'yugen-criticals', 'show-on-finisher' ) || false;

		/** retrieve the current finisher style override flag **/
		const finisher_style_override = this.actor.getFlag( 'yugen-criticals', 'finisher-style-override' ) || 'default';

		/** retrieve the current finisher quotes flag **/
		const raw_finisher = this.actor.getFlag( 'yugen-criticals', 'finisher-quote' );
		let finisher_quote = '';
		if ( raw_finisher ) 
		{
			if ( Array.isArray( raw_finisher ) ) 
			{
				finisher_quote = raw_finisher.join( '\n' );
			}
			else 
			{
				finisher_quote = raw_finisher.split( '|' ).map( ( q : string ) => 
				{
					return q.trim( );
				} ).join( '\n' );
			}
		}

		return ( {
			actor: this.actor,
			crit_quote,
			fumble_quote,
			finisher_quote,
			crit_sound,
			fumble_sound,
			style_override,
			finisher_style_override,
			img_offset_x,
			img_offset_y,
			img_zoom,
			crit_img,
			fumble_img,
			show_on_finisher
		} );
	}

	activateListeners( html : any ) 
	{
		super.activateListeners( html );
		const el = html[ 0 ] || html;

		const FilePickerClass = ( foundry.applications as any )?.apps?.FilePicker?.implementation || ( window as any ).FilePicker;

		el.querySelectorAll( '.yugen-file-picker-btn' ).forEach( ( button : HTMLElement ) => 
		{
			button.addEventListener( 'click', ( event : Event ) => 
			{
				event.preventDefault( );
				const target_name = button.dataset.target;
				if ( !target_name ) 
				{
					return;
				}

				const input = el.querySelector( `input[name="${ target_name }"]` ) as HTMLInputElement;
				if ( !input ) 
				{
					return;
				}

				const file_type = button.dataset.type || 'audio';

				/** browse the server file directory for media **/
				new FilePickerClass( {
					type: file_type,
					field: input,
					current: input.value,
					button: button,
					callback: ( path : string ) => 
					{
						input.value = path;
					}
				} ).browse( );
			} );
		} );

		el.querySelectorAll( '.yugen-sound-preview-btn' ).forEach( ( button : HTMLElement ) => 
		{
			button.addEventListener( 'click', ( event : Event ) => 
			{
				event.preventDefault( );
				const target_name = button.dataset.target;
				if ( !target_name ) 
				{
					return;
				}

				const input = el.querySelector( `input[name="${ target_name }"]` ) as HTMLInputElement;
				const path = input?.value?.trim( );
				if ( path ) 
				{
					/** play the audio preview **/
					void ( game as any ).audio.play( path, { volume: 0.5, loop: false } );
				}
			} );
		} );

		/** live slider value indicators **/
		el.querySelectorAll( 'input[type="range"]' ).forEach( ( slider : HTMLInputElement ) => 
		{
			slider.addEventListener( 'input', ( ) => 
			{
				const display = slider.nextElementSibling as HTMLElement;
				if ( display ) 
				{
					display.textContent = `${ slider.value }%`;
				}
			} );
		} );

		/** local preview animation handler **/
		el.querySelector( '.yugen-preview-animation' )?.addEventListener( 'click', async ( event : Event ) => 
		{
			event.preventDefault( );

			const raw_quote = ( el.querySelector( 'textarea[name="crit_quote"]' ) as HTMLTextAreaElement )?.value || '';
			const quotes = raw_quote.split( '\n' ).map( ( q : string ) => 
			{
				return q.trim( );
			} ).filter( Boolean );
			const quote = quotes.length > 0 ? quotes[ Math.floor( Math.random( ) * quotes.length ) ] : '';

			const style = ( el.querySelector( 'select[name="style_override"]' ) as HTMLSelectElement )?.value || 'default';
			const sound = ( el.querySelector( 'input[name="crit_sound"]' ) as HTMLInputElement )?.value?.trim( ) || '';

			const img_offset_x = parseInt( ( el.querySelector( 'input[name="img_offset_x"]' ) as HTMLInputElement )?.value ) || 0;
			const img_offset_y = parseInt( ( el.querySelector( 'input[name="img_offset_y"]' ) as HTMLInputElement )?.value ) || 0;
			const img_zoom = parseInt( ( el.querySelector( 'input[name="img_zoom"]' ) as HTMLInputElement )?.value ) || 0;

			const crit_img = ( el.querySelector( 'input[name="crit_img"]' ) as HTMLInputElement )?.value?.trim( ) || '';
			const fumble_img = ( el.querySelector( 'input[name="fumble_img"]' ) as HTMLInputElement )?.value?.trim( ) || '';

			const { CriticalAnimation } = await import( './critical-animation.js' );
			void CriticalAnimation.show_animation( this.actor, 'critical', '', {
				quote,
				style,
				sound,
				img_offset_x,
				img_offset_y,
				img_zoom,
				crit_img,
				fumble_img
			} );
		} );


		el.querySelector( '.reset-defaults' )?.addEventListener( 'click', async ( event : Event ) => 
		{
			event.preventDefault( );
			
			/** test user ownership permission for resetting **/
			if ( !this.actor.testUserPermission( ( game as any ).user, 'OWNER' ) ) 
			{
				return;
			}

			/** unset the actor custom critical quote flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'crit-quote' );

			/** unset the actor custom fumble quote flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'fumble-quote' );

			/** unset the actor custom critical sound flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'crit-sound' );

			/** unset the actor custom fumble sound flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'fumble-sound' );

			/** unset the actor custom signature animation style override flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'style-override' );

			/** unset the actor custom critical portrait image flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'crit-img' );

			/** unset the actor custom fumble portrait image flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'fumble-img' );

			await this.actor.unsetFlag( 'yugen-criticals', 'show-on-finisher' );

			/** unset the actor custom finisher quote flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'finisher-quote' );

			/** unset the actor custom finisher style override flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'finisher-style-override' );

			/** unset the image offset and zoom flags **/
			await this.actor.unsetFlag( 'yugen-criticals', 'img-offset-x' );
			await this.actor.unsetFlag( 'yugen-criticals', 'img-offset-y' );
			await this.actor.unsetFlag( 'yugen-criticals', 'img-zoom' );

			( ui as any ).notifications?.info( `yugen-criticals | reset configurations for ${ this.actor.name }` );
			this.close( );
		} );
	}

	protected async _updateObject( _event : any, form_data : any ) 
	{
		/** test user ownership permission for editing **/
		if ( !this.actor.testUserPermission( ( game as any ).user, 'OWNER' ) ) 
		{
			return;
		}

		const crit_quotes = form_data.crit_quote
			.split( '\n' )
			.map( ( q : string ) => 
			{
				return q.trim( );
			} )
			.filter( Boolean );

		const fumble_quotes = form_data.fumble_quote
			.split( '\n' )
			.map( ( q : string ) => 
			{
				return q.trim( );
			} )
			.filter( Boolean );

		const finisher_quotes = form_data.finisher_quote
			.split( '\n' )
			.map( ( q : string ) => 
			{
				return q.trim( );
			} )
			.filter( Boolean );

		const crit_sound = form_data.crit_sound?.trim( ) || '';
		const fumble_sound = form_data.fumble_sound?.trim( ) || '';
		const style_override = form_data.style_override || 'default';
		const finisher_style_override = form_data.finisher_style_override || 'default';
		const crit_img = form_data.crit_img?.trim( ) || '';
		const fumble_img = form_data.fumble_img?.trim( ) || '';
		const show_on_finisher = form_data.show_on_finisher === true;

		if ( crit_quotes.length > 0 ) 
		{
			/** save the custom critical quotes flags **/
			await this.actor.setFlag( 'yugen-criticals', 'crit-quote', crit_quotes );
		}
		else 
		{
			/** unset the custom critical quotes flags **/
			await this.actor.unsetFlag( 'yugen-criticals', 'crit-quote' );
		}

		if ( fumble_quotes.length > 0 ) 
		{
			/** save the custom fumble quotes flags **/
			await this.actor.setFlag( 'yugen-criticals', 'fumble-quote', fumble_quotes );
		}
		else 
		{
			/** unset the custom fumble quotes flags **/
			await this.actor.unsetFlag( 'yugen-criticals', 'fumble-quote' );
		}

		if ( finisher_quotes.length > 0 ) 
		{
			/** save the custom finisher quotes flags **/
			await this.actor.setFlag( 'yugen-criticals', 'finisher-quote', finisher_quotes );
		}
		else 
		{
			/** unset the custom finisher quotes flags **/
			await this.actor.unsetFlag( 'yugen-criticals', 'finisher-quote' );
		}

		if ( crit_sound ) 
		{
			/** save the custom critical sound override flags **/
			await this.actor.setFlag( 'yugen-criticals', 'crit-sound', crit_sound );
		}
		else 
		{
			/** unset the custom critical sound override flags **/
			await this.actor.unsetFlag( 'yugen-criticals', 'crit-sound' );
		}

		if ( fumble_sound ) 
		{
			/** save the custom fumble sound override flags **/
			await this.actor.setFlag( 'yugen-criticals', 'fumble-sound', fumble_sound );
		}
		else 
		{
			/** unset the custom fumble sound override flags **/
			await this.actor.unsetFlag( 'yugen-criticals', 'fumble-sound' );
		}

		if ( style_override && style_override !== 'default' ) 
		{
			/** save the custom signature animation style override flag **/
			await this.actor.setFlag( 'yugen-criticals', 'style-override', style_override );
		}
		else 
		{
			/** unset the custom signature animation style override flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'style-override' );
		}

		if ( finisher_style_override && finisher_style_override !== 'default' ) 
		{
			/** save the custom finisher animation style override flag **/
			await this.actor.setFlag( 'yugen-criticals', 'finisher-style-override', finisher_style_override );
		}
		else 
		{
			/** unset the custom finisher animation style override flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'finisher-style-override' );
		}

		if ( crit_img ) 
		{
			/** save the custom critical portrait flag **/
			await this.actor.setFlag( 'yugen-criticals', 'crit-img', crit_img );
		}
		else 
		{
			/** unset the custom critical portrait flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'crit-img' );
		}

		if ( fumble_img ) 
		{
			/** save the custom fumble portrait flag **/
			await this.actor.setFlag( 'yugen-criticals', 'fumble-img', fumble_img );
		}
		else 
		{
			/** unset the custom fumble portrait flag **/
			await this.actor.unsetFlag( 'yugen-criticals', 'fumble-img' );
		}

		if ( show_on_finisher ) 
		{
			await this.actor.setFlag( 'yugen-criticals', 'show-on-finisher', true );
		}
		else 
		{
			await this.actor.unsetFlag( 'yugen-criticals', 'show-on-finisher' );
		}

		/** save the custom image offset and zoom flags **/
		const img_offset_x = parseInt( form_data.img_offset_x );
		const img_offset_y = parseInt( form_data.img_offset_y );
		const img_zoom = parseInt( form_data.img_zoom );

		if ( !isNaN( img_offset_x ) )
		{
			await this.actor.setFlag( 'yugen-criticals', 'img-offset-x', img_offset_x );
		}
		if ( !isNaN( img_offset_y ) )
		{
			await this.actor.setFlag( 'yugen-criticals', 'img-offset-y', img_offset_y );
		}
		if ( !isNaN( img_zoom ) )
		{
			await this.actor.setFlag( 'yugen-criticals', 'img-zoom', img_zoom );
		}
	}
}
