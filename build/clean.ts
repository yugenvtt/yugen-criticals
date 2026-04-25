/**
 * @file build/clean.ts
 * @description cleans build artifacts.
 **/

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const clean = async ( ) => 
{
	try 
	{
		const dist_dir = path.resolve( __dirname, '../dist' );
		const zip_path = path.resolve( __dirname, '../module.zip' );

		/** remove dist directory **/
		if ( fs.existsSync( dist_dir ) ) 
		{
			await fs.remove( dist_dir );
			console.log( '[yugen-criticals] | cleaned dist directory' );
		}

		/** remove module.zip **/
		if ( fs.existsSync( zip_path ) ) 
		{
			await fs.remove( zip_path );
			console.log( '[yugen-criticals] | cleaned module.zip' );
		}
	} 
	catch ( error ) 
	{
		console.error( '[yugen-criticals] | clean failed:', error );
		process.exit( 1 );
	}
};

clean( );
