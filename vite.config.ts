/**
 * @file vite.config.ts
 * standard build configuration for the module.
 **/

import { defineConfig, type Plugin } from 'vite';
import checker from 'vite-plugin-checker';
import terminal from 'vite-plugin-terminal';
import * as path from 'path';

export default defineConfig( async ( { mode } ) => 
{
	const is_production = mode === 'production';

	let local_plugins: Plugin[] = [ ];

	/** load local developer overrides if present (ignored by git) **/
	try 
	{
		const local = await import( './vite.local.js' );
		local_plugins = local.local_plugins || [ ];
	} 
	catch ( e ) 
	{ 
		/** overrides are optional **/
	}

	return ( 
	{
		root: 'src',
		base: '/modules/yugen-criticals/',
		publicDir: path.resolve( __dirname, 'static' ),
		build: 
		{
			outDir: '../dist',
			emptyOutDir: true,
			sourcemap: !is_production ? 'inline' : false,
			minify: is_production ? 'terser' : false,
			lib: 
			{
				entry: path.resolve( __dirname, 'src/index.ts' ),
				formats: [ 'es' ],
				fileName: 'scripts/module',
			},
			rollupOptions: 
			{
				output: 
				{
					assetFileNames: ( asset_info ) => 
					{
						return asset_info.names?.[ 0 ] || 'assets/[name].[ext]';
					},
				},
			},
		},
		plugins: 
		[
			checker( 
			{
				typescript: true,
			} ),
			terminal( ),
			...local_plugins,
		],
	} );
} );
