/**
 * @file src/module/team-app.ts
 * application for initiating team critical animations.
 **/

import { CriticalAnimation } from './critical-animation.js';

const FormApplicationClass = ( window as any ).FormApplication || class { };

export class TeamCriticalApp extends ( FormApplicationClass as any ) 
{
	constructor( options : any = { } ) 
	{
		super( { }, options );
	}

	static get defaultOptions( ) 
	{
		return ( foundry.utils as any ).mergeObject( super.defaultOptions, {
			id: 'yugen-team-critical-app',
			title: 'yugen-criticals.team-critical.title',
			classes: [ 
				'sheet', 
				'yugen-app' 
			],
			template: 'modules/yugen-criticals/templates/team-app.hbs',
			width: 400,
			height: 'auto',
			closeOnSubmit: false,
			resizable: true
		} );
	}

	async getData( ) 
	{
		/** retrieve all valid tokens on the current scene **/
		const tokens = canvas?.tokens?.placeables || [ ];
		
		/** filter out tokens without actors, and sort by name **/
		const allies = tokens
			.map( ( t : any ) => t.actor )
			.filter( ( actor : any ) => actor !== null )
			.filter( ( value : any, index : number, self : any[] ) => 
			{
				/** remove duplicates if multiple tokens share the same actor **/
				return self.findIndex( ( a : any ) => a.id === value.id ) === index;
			} )
			.map( ( actor : any ) => 
			{
				return {
					id: actor.id,
					uuid: actor.uuid,
					name: actor.name,
					img: actor.img,
					type: actor.type
				};
			} )
			.sort( ( a : any, b : any ) => 
			{
				const get_weight = ( type : string ) => 
				{
					if ( type === 'character' ) 
					{
						return 1;
					}
					if ( type === 'npc' ) 
					{
						return 2;
					}
					return 3;
				};

				const weight_a = get_weight( a.type );
				const weight_b = get_weight( b.type );

				if ( weight_a !== weight_b ) 
				{
					return weight_a - weight_b;
				}

				return a.name.localeCompare( b.name );
			} );

		return {
			allies
		};
	}

	activateListeners( html : any ) 
	{
		super.activateListeners( html );
		const el = html[ 0 ] || html;

		/** real-time search filtering of the actors grid **/
		const search_input = el.querySelector( '.yugen-tc-search' );
		search_input?.addEventListener( 'input', ( event : Event ) => 
		{
			const query = ( event.target as HTMLInputElement ).value.toLowerCase( );
			const cards = el.querySelectorAll( '.yugen-tc-card-label' );
			cards.forEach( ( card : HTMLElement ) => 
			{
				const name = card.querySelector( '.yugen-tc-name' )?.textContent?.toLowerCase( ) || '';
				if ( name.includes( query ) ) 
				{
					card.style.display = '';
				}
				else 
				{
					card.style.display = 'none';
				}
			} );
		} );

		el.querySelector( '.execute-team-critical' )?.addEventListener( 'click', async ( event : Event ) => 
		{
			event.preventDefault( );
			
			/** gather selected actors **/
			const checkboxes = el.querySelectorAll( 'input[name="selected_allies"]:checked' );
			const selected_uuids = Array.from( checkboxes ).map( ( cb : any ) => 
			{
				return cb.value;
			} );

			if ( selected_uuids.length < 2 ) 
			{
				( ui as any ).notifications?.warn( 'yugen-criticals | You must select at least two characters for a team critical.' );
				return;
			}

			if ( selected_uuids.length > 4 ) 
			{
				( ui as any ).notifications?.warn( 'yugen-criticals | You can only select up to 4 characters for a team critical.' );
				return;
			}

			const theme = el.querySelector( 'select[name="theme"]' )?.value || 'persona';
			const message = el.querySelector( 'input[name="custom_message"]' )?.value?.trim( ) || 'Team Attack';

			/** send socket event to trigger team animation globally **/
			( game as any ).socket.emit( 'module.yugen-criticals', {
				type: 'team-critical',
				actor_uuids: selected_uuids,
				theme,
				message,
				sender_id: ( game as any ).user.id
			} );

			/** trigger locally as well **/
			const actors = [ ];
			for ( const uuid of selected_uuids )
			{
				const actor = await ( fromUuid as any )( uuid );
				if ( actor )
				{
					actors.push( actor );
				}
			}

			if ( actors.length > 0 )
			{
				void CriticalAnimation.show_team_animation( actors, theme, message );
			}

			this.close( );
		} );
	}
}
