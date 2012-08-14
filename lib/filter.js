var filter = ( function () {
	var regMail = /^([*+!.&#$|\'\\%\/0-9a-z^_`{}=?~:-]+)@(([0-9a-z-]+\.)+[0-9a-z]{2,})$/i,
		regUrl = /^(https?|ftp)(:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#]+)$/,
		regSpecial = /<|>|&|'|"/g,
		regZen = /[Ａ-Ｚａ-ｚ０-９！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～]/g,
		regNaN = /\D/g,
		regInt = /[0-9-]/g;

	return {
		mail : function ( s , z ) { 
			if ( z ) { 
				s = this.zen2han( s );
			}
			if ( !regMail.test( s ) ) {
				return false;
			}
			return s;
		},  
		url : function ( s , z ) {
			if ( z ) { 
				s = this.zen2han( s );
			}
			if ( !regUrl.test( s ) ) {
				return false;
			}
			return s;
		},
		cooked : function( s , z ) {
			if ( z ) { 
				s = this.zen2han( s );
			}
			return s.replace( regSpecial , function( a ){
				switch ( a ) {
					case '<' : return '&lt;';
					case '>' : return '&gt;';
					case '&' : return '&amp;';
					case "'" : return '&#039;';
					case '"' : return '&quot;';
				}
			} );
		},
		inty : function ( s , z ) { 
			var result = '';
			if ( z ) { 
				s = this.zen2han( s );
			}
			s.replace( regInt , function( a ){
				if ( a != '-' || !result ) {
					result += a;
				}
			} );
			return result || false;
		},
		uinty : function ( s , z ) { 
			if ( z ) { 
				s = this.zen2han( s );
			}
			return s.replace( regNaN , '' );
		},
		zen2han : function ( s ) { 
			return s.replace( regZen , function( a ) {
				return String.fromCharCode( a.charCodeAt(0) - 0xFEE0 );
			} );
		}  
	};
} )();
