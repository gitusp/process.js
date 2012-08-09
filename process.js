/*!
 * process.js
 *
 * Copyright 2012, usp
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */
var process = (function(){
	var // regexp
		regBegin = /{\s*@(literal|foreach|if).*?}/,
		regStartFromType = {
			literal : /({\s*@literal\s*})/,
			foreach : /({\s*@foreach.*?})/,
			'if' : /({\s*@if.*?})/
		},
		regEndFromType = {
			literal : /({\s*\/literal\s*})/,
			foreach : /({\s*\/foreach\s*})/,
			'if' : /({\s*\/if\s*})/
		},
		regForeachGet = /{\s*@foreach\s+(?:(-l)\s+)?(.*?)\s*}/,
		regIfGet = /{\s*@if\s+(.*?)\s*}/,
		regElseifGet = /{\s*@elseif\s+(.*?)\s*}/,
		regValue = /{\s*(~?)([\$\^].*?)\s*}/g,
		regWild = /({\s*(@|\/)(if|elseif|else).*?})/,
		regVar = /^(\$|\^+)(\S+)$/,
		regExpr = /^(?:(\S+)\s*\()?(.*?)(\))?$/,
		regAllWhite = /\s/g,
		regSpecial = /<|>|&|'|"/g,
		
		// expr set
		exprSet = {
			not :	function ( a ) { return !a; },

			eq :	function ( a , b ) { return a == b; },
			seq :	function ( a , b ) { return a === b; },

			ne :	function ( a , b ) { return a != b; },
			sne :	function ( a , b ) { return a !== b; },

			lt :	function ( a , b ) { return a < b; },
			elt :	function ( a , b ) { return a <= b; },

			gt :	function ( a , b ) { return a > b; },
			egt :	function ( a , b ) { return a >= b; }
		};

	// entry point
	return function ( str , context , fn , scope ) {
		var kit;

		if ( fn ) {
			var key;
			kit = {};

			for ( key in exprSet ) {
				kit[ key ] = exprSet[ key ];
			}
			for ( key in fn ) {
				kit[ key ] = fn[ key ];
			}
		}
		else {
			kit = exprSet;
		}

		return process( str , context , kit , scope );
	};

	// main processor
	function process ( str , context , fn , scope ) {
		// init scope
		if ( !scope ) {
			scope = [];
		}

		var // strings
			head , body , tail , strHeepA , strHeepB , type , isList ,
			// int
			beginBlock , edge , intHeepA , intHeepB , stack ,
			// array or object
			objHeep ,
			// reg heep
			start , end ;


		beginBlock = str.search( regBegin );

		// any block
		if ( beginBlock != -1 ) {
			// set
			head = str.substr( 0 , beginBlock );
			type = RegExp.$1;

			// lookup
			stack = 1;
			edge = beginBlock;
			start = regStartFromType[ type ];
			end = regEndFromType[ type ];

			while ( stack ) {
				strHeepA = str.substr( edge + 1 );
				intHeepA = strHeepA.search( start );
				intHeepB = strHeepA.search( end );

				if ( intHeepB == -1 ) {
					throw 'compile error';
				}
				if ( intHeepA == -1 || intHeepB < intHeepA ) {
					stack--;
					edge += intHeepB + 1;
				}
				else {
					stack++;
					edge += intHeepA + 1;
				}
			}

			// add close stat
			tail = str.substr( edge + RegExp.$1.length );

			// conditional block
			intHeepA = str.search( start ) + RegExp.$1.length;
			body = str.substr( intHeepA , edge - intHeepA );

			// bypass
			if ( type == 'literal' ) {}

			// foreach
			else if ( type == 'foreach' ) {
				strHeepA = '';
				regForeachGet.test( str );
				isList = RegExp.$1;
				objHeep = get( RegExp.$2 , context , scope ) || [];

				// Array
				if ( objHeep instanceof Array ) {
					for ( edge = 0; edge < objHeep.length; edge++ ) {
						strHeepA += process(
							body ,
							isList ? { key : edge , val : objHeep[ edge ] } : objHeep[ edge ] ,
							fn ,
							scope.concat( [ context ] )
						);
					}
				}
				// may be Object
				else {
					for ( strHeepB in objHeep ) {
						strHeepA += process(
							body ,
							isList ? { key : strHeepB , val : objHeep[ strHeepB ] } : objHeep[ strHeepB ] ,
							fn ,
							scope.concat( [ context ] )
						);
					}
				}

				body = strHeepA;
			}

			// if
			else if ( type == 'if' ) {
				// find "else"
				stack = 1;
				edge = 0;

				while ( stack ) {
					strHeepA = body.substr( edge + 1 );
					intHeepA = strHeepA.search( regWild );
					
					// no siblings
					if ( intHeepA == -1 ) {
						edge = body.length;
						break;
					}

					// stack control
					if ( RegExp.$3 == 'if' ) {
						if ( RegExp.$2 == '/' ) {
							stack--;
						}
						else {
							stack++;
						}
					}

					// else or elseif
					else if ( stack == 1 ) {
						stack--;
					}

					edge += intHeepA + 1;
				}

				// split : A -> true pattern , B -> false pattern
				strHeepA = body.substr( 0 , edge );
				strHeepB = body.substr( edge );

				// interpret elseif
				if ( RegExp.$3 == 'elseif' ) {
					strHeepB = strHeepB.replace(
							regElseifGet ,
							function( a , m ){
								return '{@if ' + m + '}';
							} ) + '{/if}';
				}

				// offset
				else {
					strHeepB = strHeepB.substr( RegExp.$1.length );
				}

				// cond
				regIfGet.test( str );
				if ( expr( RegExp.$1 , context , fn , scope ) ) {
					body = process( strHeepA , context , fn , scope );
				}
				else {
					body = process( strHeepB , context , fn , scope );
				}
			}

			// result
			return extract( head , context , scope ) + body + process( tail , context , fn , scope );
		}
		else {
			return extract( str , context , scope );
		}
	}

	// simple extracter of vars
	function extract ( str , context , scope ) {
		return str.replace( regValue , function( a , n , m ){
			var r = get( m , context , scope );
			r = r === undefined ? '' : r;
			if ( !n ) {
				r = escapeHtml( r );
			}
			return r;
		} );
	}

	// expr true or false
	function expr ( cond , context , fn , scope ) {
		regExpr.test( cond );
		var withFn = RegExp.$1 && RegExp.$3,
			fnName = RegExp.$1,
			trimmedKey = RegExp.$2.replace( regAllWhite , '' );

		if ( withFn ) {
			var theFn = fn[ fnName ],
				keys = trimmedKey.split( ',' ),
				i = 0,
				args = [];

			for ( ; i < keys.length; i++ ) {
				args.push( get( keys[ i ] , context , scope ) );
			}
			return theFn.apply( this , args );
		}
		return get( trimmedKey , context , scope );
	}

	// get real value from ~$^key.key
	function get ( cond , context , scope ) {
		if ( cond == '$this' ) {
			return context;
		}

		regVar.test( cond );
		var type = RegExp.$1,
			keys = RegExp.$2.split( '.' ),
			base = type == '$' ? context : scope[ scope.length - type.length ],
			i = 0;

		for ( ; i < keys.length; i++ ) {
			base = base[ keys[ i ] ];
		}
		return base;
	}
	function escapeHtml ( str ) {
		str += "";
		return str.replace( regSpecial , function( a ){
			switch ( a ) {
				case '<' : return '&lt;';
				case '>' : return '&gt;';
				case '&' : return '&amp;';
				case "'" : return '&#039;';
				case '"' : return '&quot;';
			}
		} );
	}
})();
