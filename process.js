/*!
 * process.js
 *
 * Copyright 2012, usp
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */
var process = (function(){

	return process;

	function process ( str , context ) {
		var // strings
			head , body , tail , strHeepA , strHeepB , type ,
			// int
			beginBlock , edge , intHeepA , intHeepB , stack ,
			// array
			arrayHeep ,
			// regexp
			start , end , wild;

		beginBlock = str.search( /{\s*@(literal|foreach|if).*?}/ );

		// any block
		if ( beginBlock != -1 ) {
			// set
			head = str.substr( 0 , beginBlock );
			type = RegExp.$1;

			// lookup
			stack = 1;
			edge = beginBlock;
			start = new RegExp( '({\\s*@' + type + '.*?})' );
			end = new RegExp( '({\\s*/' + type + '\\s*})' );

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
				/{\s*@foreach\s+(.*?)\s*}/.test( str );
				arrayHeep = get( RegExp.$1 , context ) || [];

				for ( edge = 0 ; edge < arrayHeep.length ; edge++ ) {
					strHeepA += process( body , arrayHeep[ edge ] );
				}
				body = strHeepA;
			}

			// if
			else if ( type == 'if' ) {
				// find "else"
				stack = 1;
				edge = 0;
				wild = /({\s*(@|\/)(if|elseif|else).*?})/;

				while ( stack ) {
					strHeepA = body.substr( edge + 1 );
					intHeepA = strHeepA.search( wild );
					
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
							/{\s*@elseif\s+(.*?)\s*}/ ,
							function( a , m ){
								return '{@if ' + m + '}';
							} ) + '{/if}';
				}

				// offset
				else {
					strHeepB = strHeepB.substr( RegExp.$1.length );
				}

				// cond
				/{\s*@if\s+(.*?)\s*}/.test( str );
				if ( get( RegExp.$1 , context ) ) {
					body = process( strHeepA , context );
				}
				else {
					body = process( strHeepB , context );
				}
			}

			// result
			return extract( head , context ) + body + process( tail , context );
		}
		else {
			return extract( str , context );
		}
	}
	function extract ( str , context ) {
		return str.replace( /{\s*(\$?)(\$.*?)\s*}/g , function( a , n , m ){
			var r = get( m , context );
			r = r === undefined ? '' : r;
			if ( !n ) {
				r = escapeHtml( r );
			}
			return r;
		} );
	}
	function get ( cond , context ) {
		cond = cond.replace( /\$this/g , 'context' );
		cond = cond.replace( /\$/g , 'context.' );
		return eval( cond );
	}
	function escapeHtml ( str ) {
		str += "";
		return str.replace( /<|>|&|'|"/g , function( a ){
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
