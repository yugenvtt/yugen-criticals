/**
 * @file src/module/utils.ts
 * pure utility functions for data transformation.
 **/

/**
 * capitalizes the first letter of a string.
 **/
export const capitalize = ( str: string ): string => 
{
	if ( !str ) 
	{
		return str;
	}

	return str.charAt( 0 ).toUpperCase( ) + str.slice( 1 );
};
