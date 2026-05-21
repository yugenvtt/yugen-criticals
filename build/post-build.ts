/**
 * @file build/post-build.ts
 * @description handles post-build tasks like zipping and distribution.
 **/

import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config( );

const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

const post_build = async ( ) => 
{
	try 
	{
		const dist_dir = path.resolve( __dirname, '../dist' );
		const root_dir = path.resolve( __dirname, '..' );
		const zip_path = path.resolve( root_dir, 'module.zip' );
		if ( !fs.existsSync( dist_dir ) ) 
		{
			return;
		}

		/** copy shared assets **/
		if ( fs.existsSync( path.resolve( root_dir, 'LICENSE' ) ) ) 
		{
			await fs.copy( path.resolve( root_dir, 'LICENSE' ), path.resolve( dist_dir, 'LICENSE' ) );
		}
		if ( fs.existsSync( path.resolve( root_dir, 'README.md' ) ) ) 
		{
			await fs.copy( path.resolve( root_dir, 'README.md' ), path.resolve( dist_dir, 'README.md' ) );
		}

		/** live sync deployment **/
		const sync_targets = [
			process.env.FOUNDRY_V14_OUT_DIR || process.env.FOUNDRY_OUT_DIR,
			process.env.FOUNDRY_V13_OUT_DIR,
		].filter( Boolean ) as string[];

		for ( const target of sync_targets ) 
		{
			await fs.ensureDir( target );
			await fs.copy( dist_dir, target, { overwrite: true } );
			console.log( `yugen-criticals | deployed to: ${ target }` );
		}

		/** package release **/
		if ( fs.existsSync( zip_path ) ) 
		{
			await fs.remove( zip_path );
		}

		const output = fs.createWriteStream( zip_path );
		const archive = archiver( 'zip', { zlib: { level: 9 } } );

		output.on( 'close', ( ) => 
		{
			console.log( `yugen-criticals | release packaged: ${ archive.pointer( ) } bytes` );
		} );

		archive.on( 'error', ( err ) => 
		{
			throw err;
		} );

		archive.pipe( output );
		archive.directory( dist_dir, false );
		await archive.finalize( );
	} 

	catch ( error ) 
	{
		console.error( 'yugen-criticals | post-build error:', error );
		process.exit( 1 );
	}
};

post_build( );
