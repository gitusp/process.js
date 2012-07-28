var process = (function(){

	return process;

	function process ( str , context ) {
		var s1 , s2 , s3 , t1 , t2 , t3 , start , end , stack , type;
		t1 = str.search( /{\s*@(literal|foreach|if).*?}/ );

		// any block
		if ( t1 != -1 ) {
			// set
			s1 = str.substr( 0 , t1 );
			type = RegExp.$1;

			// lookup
			stack = 1;
			start = new RegExp( '({\\s*@' + type + '.*?})' );
			end = new RegExp( '({\\s*/' + type + '\\s*})' );

			while ( stack ) {
				s2 = str.substr( t1 + 1 );
				t2 = s2.search( start );
				t3 = s2.search( end );

				if ( t3 == -1 ) {
					throw 'compile error';
				}
				if ( t2 == -1 || t3 < t2 ) {
					stack--;
					t1 += t3 + 1;
				}
				else {
					stack++;
					t1 += t2 + 1;
				}
			}

			// add close stat
			s3 = str.substr( t1 + RegExp.$1.length );

			// conditional block
			t2 = str.search( start ) + RegExp.$1.length;
			s2 = str.substr( t2 , t1 - t2 );

			// bypass
			if ( type == 'literal' ) {}

			// foreach
			else if ( type == 'foreach' ) {
				t1 = '';
				str.search( /{\s*@foreach\s+(.*?)\s*}/ );
				t2 = get( RegExp.$1 , context ) || [];

				for ( t3 = 0 ; t3 < t2.length ; t3++ ) {
					t1 += process( s2 , t2[ t3 ] );
				}
				s2 = t1;
			}

			// if
			else if ( type == 'if' ) {
				t1 = 0;

				// interpret elseif
				s2 = s2.replace(
						/{\s*@elseif\s+(.*?)\s*}/g ,
						function( a , m ){
							t1++;
							return '{@else}{@if ' + m + '}';
						} );
				for ( t2 = 0 ; t2 < t1 ; t2++ ) {
					s2 += '{/if}';
				}

				// search else
				t1 = s2.search( /({\s*@else\s*})/ );
				if ( t1 != -1 ) {
					t2 = s2.substr( 0 , t1 );
					t3 = s2.substr( t1 + RegExp.$1.length );
				}
				else {
					t2 = s2;
					t3 = '';
				}

				// cond
				str.search( /{\s*@if\s+(.*?)\s*}/ );
				if ( get( RegExp.$1 , context ) ) {
					s2 = process( t2 , context );
				}
				else {
					s2 = process( t3 , context );
				}
			}

			// result
			return extract( s1 , context ) + s2 + process( s3 , context );
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
