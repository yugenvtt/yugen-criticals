/**
 * @file src/module/utils.ts
 * custom utility functions for yugen-criticals.
 **/

/**
 * logs a debug message to the browser console if debug mode is enabled
 **/
export const debug_log = ( message : string, ...data : any[] ) : void => 
{
	const is_debug = ( game as any ).settings?.get( 'yugen-criticals', 'debug-mode' ) ?? false;
	if ( is_debug ) 
	{
		console.log( `yugen-criticals | ${ message }`, ...data );
	}
};
