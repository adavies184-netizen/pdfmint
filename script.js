/*!

JSZip v3.10.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/main/LICENSE
*/

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=e()}}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t="function"==typeof require&&require;if(!e&&t)return t(r,!0);if(l)return l(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h)}return o[r].exports}for(var l="function"==typeof require&&require,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){"use strict";var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=n(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,!0,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s)}return t.zipComment.length&&(h.comment=t.zipComment),h})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,!0);var a="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function h(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){"use strict";t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()})}function f(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function l(){n.call(this,"utf-8 encode")}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){"use strict";var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=!0;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i))}return r.join("/")},a.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&e instanceof Uint8Array?"uint8array":o.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[])})},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&!0!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new h("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(u,0)};else{var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var e,t;n=!0;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length}n=!1}l.exports=function(e){1!==h.push(e)||n||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e)}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e)})}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(t,e){var r=!1;function n(e){r||(r=!0,l.reject(t,e))}function i(e){r||(r=!0,l.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e)},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},h.prototype.callRejected=function(e){l.reject(this.promise,e)},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,l.resolve(o,s))},function(e){i||(i=!0,l.reject(o,e))})}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=!0,l.resolve(s,e))},function(e){n||(n=!0,l.reject(s,e))});var a;return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var h=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return(e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function U(e,t){e.pending_buf[e.pending++]=t}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a]}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,!1),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,!1),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,!1),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else{var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,!1),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=!0;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=!1}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===e||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function L(e,t,r){P(e,r[2*t],r[2*t+1])}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o))}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t)}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--)}}(e,t),Z(s,u,e.bl_count)}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4))}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4)}}n(T);var q=!1;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),n&&(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p)}(),q=!0),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e)},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){(function(e){!function(r,n){"use strict";if(!r.setImmediate){var i,s,t,a,o=1,h={},u=!1,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e)})}:function(){if(r.postMessage&&!r.importScripts){var e=!0,t=r.onmessage;return r.onmessage=function(){e=!1},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,!1):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*")}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data)},function(e){t.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):function(e){setTimeout(c,0,e)},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f}function f(e){delete h[e]}function c(e){if(u)setTimeout(c,0,e);else{var t=h[e];if(t){u=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{f(e),u=!1}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length))}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[10])(10)});

/* ---- PDFBreeze application code ---- */

const tabs = document.querySelectorAll('.tool-tab');
const panels = document.querySelectorAll('.tool-panel');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(item => item.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(tab.dataset.target).classList.add('active');
}));


const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    mobileMenu.hidden = open;
  });
}

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const workspace = document.getElementById('pdf-workspace');
const alertBox = document.getElementById('workspace-alert');
const views = {
  preview: document.getElementById('preview-view'),
  merge: document.getElementById('merge-view'),
  split: document.getElementById('split-view')
};
const titles = {
  preview: ['PAGE EDITOR', 'Organise your PDF', 'Rotate, delete and rearrange pages before downloading.'],
  merge: ['MERGE PDF', 'Combine PDF files', 'Arrange multiple PDFs and download one combined document.'],
  split: ['SPLIT PDF', 'Extract PDF pages', 'Create a new PDF from the pages you choose.']
};

let editor = {
  file: null,
  originalBytes: null,
  pdfjs: null,
  pages: [],
  selectedIndex: 0,
  zoom: 1,
  renderToken: 0,
  mode: 'select',
  annotations: {},
  selectedAnnotationId: null,
  canvasMetrics: null,
  extractedText: {},
  embeddedFonts: {},
  selectedExistingTextId: null,
  editTextBoxMode: false,
  editCreatedText: {},
  selectedEditCreatedTextId: null,
  signatures: {},
  selectedSignatureId: null,
  pendingSignature: null,
  drawings: {},
  drawTool: 'marker',
  drawColour: '#111111',
  drawThickness: 4,
  activeDrawing: null,
  shapes: {},
  shapeTool: 'line',
  shapeStroke: '#111111',
  shapeFill: '#ffffff',
  shapeFillEnabled: false,
  shapeOpacity: 1,
  shapeThickness: 2,
  activeShape: null,
  selectedShapeId: null,
  textHighlights: {},
  highlightColour: '#fff200',
  links: {},
  selectedLinkId: null,
  activeLinkDraft: null,
  notes: {},
  selectedNoteId: null,
  crops: {},
  cropDraft: null,
  cropScope: 'current',
  watermark: { text: 'HELLO WORLD!', size: 100, opacity: 50, colour: '#ef4444', angle: -45, align: 'center', vertical: 50, applied: false },
  splitPoints: [],
  splitApplied: false
};
let splitFile = null;
let splitPageCount = 0;
let mergeFiles = [];

const editorHistory = { undo: [], redo: [], restoring: false };
function cloneEditorState() {
  return JSON.parse(JSON.stringify({
    pages: editor.pages,
    annotations: editor.annotations,
    extractedText: editor.extractedText,
    editCreatedText: editor.editCreatedText,
    signatures: editor.signatures,
    drawings: editor.drawings,
    shapes: editor.shapes,
    textHighlights: editor.textHighlights,
    links: editor.links,
    notes: editor.notes,
    crops: editor.crops,
    watermark: editor.watermark,
    splitPoints: editor.splitPoints,
    splitApplied: editor.splitApplied,
    selectedIndex: editor.selectedIndex,
    selectedAnnotationId: editor.selectedAnnotationId,
    selectedExistingTextId: editor.selectedExistingTextId,
    selectedSignatureId: editor.selectedSignatureId,
    selectedShapeId: editor.selectedShapeId,
    selectedLinkId: editor.selectedLinkId,
    selectedNoteId: editor.selectedNoteId
  }));
}
function restoreEditorState(snapshot) {
  editorHistory.restoring = true;
  editor.pages = snapshot.pages;
  editor.annotations = snapshot.annotations;
  editor.extractedText = snapshot.extractedText || {};
  editor.editCreatedText = snapshot.editCreatedText || {};
  editor.signatures = snapshot.signatures || {};
  editor.drawings = snapshot.drawings || {};
  editor.shapes = snapshot.shapes || {};
  editor.textHighlights = snapshot.textHighlights || {};
  editor.links = snapshot.links || {};
  editor.crops = snapshot.crops || {};
  editor.cropDraft = null;
  editor.watermark = snapshot.watermark || { text: 'HELLO WORLD!', size: 100, opacity: 50, colour: '#ef4444', angle: -45, align: 'center', vertical: 50, applied: false };
  editor.watermark.align = editor.watermark.align || 'center';
  editor.watermark.vertical = Number.isFinite(editor.watermark.vertical) ? editor.watermark.vertical : 50;
  editor.splitPoints = snapshot.splitPoints || [];
  editor.splitApplied = Boolean(snapshot.splitApplied);
  editor.activeLinkDraft = null;
  editor.selectedIndex = Math.min(snapshot.selectedIndex, Math.max(0, editor.pages.length - 1));
  editor.selectedAnnotationId = snapshot.selectedAnnotationId;
  editor.selectedExistingTextId = snapshot.selectedExistingTextId || null;
  editor.selectedSignatureId = snapshot.selectedSignatureId || null;
  editor.selectedShapeId = snapshot.selectedShapeId || null;
  editor.selectedLinkId = snapshot.selectedLinkId || null;
  editorHistory.restoring = false;
  renderThumbnails().then(() => renderSelectedPage());
  updateEditorUi();
updateHistoryButtons();
  updateHistoryButtons();
}
function recordHistory() {
  if (editorHistory.restoring || !editor.pages.length) return;
  editorHistory.undo.push(cloneEditorState());
  if (editorHistory.undo.length > 60) editorHistory.undo.shift();
  editorHistory.redo = [];
  updateHistoryButtons();
}
function undoEditor() {
  if (!editorHistory.undo.length) return;
  editorHistory.redo.push(cloneEditorState());
  restoreEditorState(editorHistory.undo.pop());
}
function redoEditor() {
  if (!editorHistory.redo.length) return;
  editorHistory.undo.push(cloneEditorState());
  restoreEditorState(editorHistory.redo.pop());
}
function updateHistoryButtons() {
  const undo = document.getElementById('undo-tool');
  const redo = document.getElementById('redo-tool');
  if (undo) undo.disabled = editorHistory.undo.length === 0;
  if (redo) redo.disabled = editorHistory.redo.length === 0;
}


function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}
function validPdf(file) {
  return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
function showAlert(message) {
  alertBox.textContent = message;
  alertBox.hidden = false;
  clearTimeout(showAlert.timer);
  showAlert.timer = setTimeout(() => { alertBox.hidden = true; }, 5000);
}
function clearAlert() { alertBox.hidden = true; alertBox.textContent = ''; }
function openWorkspace(tool) {
  clearAlert();

  if (tool !== 'preview') {
    showAlert(`${tool.charAt(0).toUpperCase() + tool.slice(1)} PDF remains available from the homepage tools and will be restored in the next combined editor build.`);
    return;
  }

  Object.entries(views).forEach(([name, view]) => {
    if (view) view.hidden = name !== tool;
  });

  workspace.hidden = false;
  document.body.classList.add('workspace-open');
}
function closeWorkspace() {
  workspace.hidden = true;
  document.body.classList.remove('workspace-open');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !workspace.hidden) closeWorkspace();
});
document.querySelectorAll('[data-open-tool]').forEach(button => {
  button.addEventListener('click', () => openWorkspace(button.dataset.openTool));
});

async function loadEditorPdf(file) {
  if (!validPdf(file)) return showAlert('Please select a valid PDF file.');
  openWorkspace('preview');
  clearAlert();
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfjs = await pdfjsLib.getDocument({data: bytes.slice(), fontExtraProperties: true}).promise;
    editor = {
      file,
      originalBytes: bytes,
      pdfjs,
      pages: Array.from({length: pdfjs.numPages}, (_, index) => ({
        sourceIndex: index,
        rotation: 0
      })),
      selectedIndex: 0,
      zoom: 1,
      renderToken: editor.renderToken + 1,
      mode: 'select',
      annotations: {},
      selectedAnnotationId: null,
      canvasMetrics: null,
      extractedText: {},
      embeddedFonts: {},
      selectedExistingTextId: null,
      editTextBoxMode: false,
      editCreatedText: {},
      selectedEditCreatedTextId: null,
      signatures: {},
      selectedSignatureId: null,
      pendingSignature: null,
      drawings: {},
      drawTool: 'marker',
      drawColour: '#111111',
      drawThickness: 4,
      activeDrawing: null,
      shapes: {},
      shapeTool: 'line',
      shapeStroke: '#111111',
      shapeFill: '#ffffff',
      shapeFillEnabled: false,
      shapeOpacity: 1,
      shapeThickness: 2,
      activeShape: null,
      selectedShapeId: null,
      textHighlights: {},
      highlightColour: '#fff200',
      links: {},
      selectedLinkId: null,
      activeLinkDraft: null,
      notes: {},
      selectedNoteId: null,
      crops: {},
      cropDraft: null,
      cropScope: 'current',
      watermark: { text: 'HELLO WORLD!', size: 100, opacity: 50, colour: '#ef4444', angle: -45, align: 'center', vertical: 50, applied: false },
      splitPoints: [],
      splitApplied: false
    };
    editorHistory.undo = []; editorHistory.redo = []; updateHistoryButtons();
    setEditorMode('select');
    document.getElementById('preview-name').textContent = file.name;
    document.getElementById('preview-size').textContent = formatBytes(file.size);
    updateEditorUi();
    await renderThumbnails();
    await renderSelectedPage();
  } catch (error) {
    console.error('PDF upload or preview error:', error);
    const isPasswordError =
      error?.name === 'PasswordException' ||
      /password/i.test(String(error?.message || ''));

    showAlert(
      isPasswordError
        ? 'This PDF is password protected. Remove the password and try again.'
        : 'PDFBreeze could not finish loading the PDF preview. Please try the file again.'
    );
  }
}


function getPageAnnotations(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.annotations[key]) editor.annotations[key] = [];
  return editor.annotations[key];
}
function getSelectedAnnotation() {
  if (!editor.pages.length || !editor.selectedAnnotationId) return null;
  return getPageAnnotations(editor.pages[editor.selectedIndex].sourceIndex)
    .find(item => item.id === editor.selectedAnnotationId) || null;
}

function clearEditTextInterfaceImmediately() {
  commitExistingTextEditing({render: false});
  editor.editTextBoxMode = false;
  editor.selectedExistingTextId = null;
  editor.selectedEditCreatedTextId = null;

  const editOptionsBar = document.getElementById('edit-text-options-bar');
  const addBoxButton = document.getElementById('edit-add-text-box');
  const colourMenu = document.getElementById('edit-colour-menu');
  const layer = document.getElementById('annotation-layer');

  if (editOptionsBar) editOptionsBar.hidden = true;
  if (addBoxButton) addBoxButton.classList.remove('active');
  if (colourMenu) colourMenu.hidden = true;

  if (layer) {
    layer.classList.remove('edit-text-mode', 'add-edit-box-mode');
  }

  // Remove the visible Edit Text layer now, during the toolbar click itself.
  // Do not wait for a later click on the PDF preview.
  document.querySelectorAll(
    '.existing-text-box:not(.modified), .edit-created-text'
  ).forEach(element => element.remove());
  document.querySelectorAll('.existing-text-box.modified').forEach(box => {
    box.classList.remove('selected', 'editing');
    box.querySelector('.existing-text-content')?.removeAttribute('contenteditable');
  });
}

function setEditorMode(mode) {
  if (mode !== 'crop') editor.cropDraft = null;
  if (mode !== 'edit-existing') {
    clearEditTextInterfaceImmediately();
  }

  editor.mode = mode;
  if (mode !== 'signature-place') {
    editor.selectedSignatureId = null;
    editor.pendingSignature = null;
  }

  const addTextTool = document.getElementById('add-text-tool');
  const editTextTool = document.getElementById('edit-text-tool');
  if (addTextTool) addTextTool.classList.toggle('active', mode === 'text');
  if (editTextTool) editTextTool.classList.toggle('active', mode === 'edit-existing');
  document.getElementById('draw-tool')?.classList.toggle('active', mode === 'draw');
  document.getElementById('line-tool')?.classList.toggle('active', mode === 'shape');
  document.getElementById('text-highlight-tool')?.classList.toggle('active', mode === 'text-highlight');
  document.getElementById('link-tool')?.classList.toggle('active', mode === 'link');
  document.getElementById('note-tool')?.classList.toggle('active', mode === 'note');
  document.getElementById('watermark-tool')?.classList.toggle('active', mode === 'watermark');
  document.getElementById('crop-tool')?.classList.toggle('active', mode === 'crop');
  document.getElementById('manage-tool')?.classList.toggle('active', mode === 'manage');

  const addOptionsBar = document.getElementById('text-options-bar');
  const editOptionsBar = document.getElementById('edit-text-options-bar');
  const drawOptionsBar = document.getElementById('draw-options-bar');
  const lineOptionsBar = document.getElementById('line-options-bar');
  const highlightOptionsBar = document.getElementById('text-highlight-options-bar');
  const watermarkOptionsBar = document.getElementById('watermark-options-bar');
  const cropOptionsBar = document.getElementById('crop-options-bar');
  const managerOptionsBar = document.getElementById('manager-options-bar');
  if (addOptionsBar) addOptionsBar.hidden = mode !== 'text';
  if (editOptionsBar) editOptionsBar.hidden = mode !== 'edit-existing';
  if (drawOptionsBar) drawOptionsBar.hidden = mode !== 'draw';
  if (lineOptionsBar) lineOptionsBar.hidden = mode !== 'shape';
  if (highlightOptionsBar) highlightOptionsBar.hidden = mode !== 'text-highlight';
  if (watermarkOptionsBar) watermarkOptionsBar.hidden = mode !== 'watermark';
  if (cropOptionsBar) cropOptionsBar.hidden = mode !== 'crop';
  if (managerOptionsBar) managerOptionsBar.hidden = mode !== 'manage';

  const normalEditorBody = document.querySelector('.desktop-editor-body');
  const managerWorkspace = document.getElementById('manager-workspace');
  if (normalEditorBody) normalEditorBody.hidden = mode === 'manage';
  if (managerWorkspace) managerWorkspace.hidden = mode !== 'manage';

  if (mode !== 'edit-existing') {
    editor.editTextBoxMode = false;
    editor.selectedExistingTextId = null;
    editor.selectedEditCreatedTextId = null;
    const addBoxButton = document.getElementById('edit-add-text-box');
    if (addBoxButton) addBoxButton.classList.remove('active');
  }

  const layer = document.getElementById('annotation-layer');
  layer.classList.toggle('text-mode', mode === 'text');
  layer.classList.toggle('select-mode', mode === 'select');
  layer.classList.toggle('note-mode', mode === 'note');
  layer.classList.toggle('edit-text-mode', mode === 'edit-existing');
  layer.classList.toggle('add-edit-box-mode', mode === 'edit-existing' && editor.editTextBoxMode);
  layer.classList.toggle('signature-place-mode', mode === 'signature-place');
  layer.classList.toggle('draw-mode', mode === 'draw');
  layer.classList.toggle('eraser-mode', mode === 'draw' && editor.drawTool === 'eraser');
  layer.classList.toggle('shape-mode', mode === 'shape');
  layer.classList.toggle('text-highlight-mode', mode === 'text-highlight');
  layer.classList.toggle('link-mode', mode === 'link');
  layer.classList.toggle('crop-mode', mode === 'crop');
  layer.classList.remove('text-highlight-dragging');

  if (mode === 'text') {
    showEditorHint('Click anywhere on the page to add text.');
  } else if (mode === 'edit-existing') {
    showEditorHint('Click once to select text. Double-click to edit it.');
    ensureExistingTextForCurrentPage().then(renderAnnotations);
  } else if (mode === 'text-highlight') {
    showEditorHint('Drag across any text to highlight it.');
    ensureExistingTextForCurrentPage().then(renderAnnotations);
  } else if (mode === 'link') {
    showEditorHint('Drag a box over the text or area you want to make clickable.');
    renderAnnotations();
  } else if (mode === 'watermark') {
    showEditorHint('Changes are applied live to every page.');
    renderAnnotations();
  } else if (mode === 'crop') {
    showEditorHint('Press and drag on the page to select the area to keep.');
    renderAnnotations();
  } else if (mode === 'manage') {
    showEditorHint('Select pages, then choose an action or drag them into a new position.');
    openManagerWorkspace();
  } else {
    renderAnnotations();
  }
}

function showEditorHint(message) {
  let toast = document.querySelector('.editor-help-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'editor-help-toast';
    (document.querySelector('.desktop-editor') || document.body).appendChild(toast);
  }
  toast.textContent = message;
  clearTimeout(showEditorHint.timer);
  showEditorHint.timer = setTimeout(() => toast.remove(), 2200);
}
function hexToRgb01(hex) {
  const value = hex.replace('#','');
  const full = value.length === 3 ? value.split('').map(c => c+c).join('') : value;
  return {
    r: parseInt(full.slice(0,2),16)/255,
    g: parseInt(full.slice(2,4),16)/255,
    b: parseInt(full.slice(4,6),16)/255
  };
}

function getCurrentSourcePageIndex() {
  if (!editor.pages.length) return null;
  return editor.pages[editor.selectedIndex].sourceIndex;
}

function getExistingTextItems(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.extractedText[key]) editor.extractedText[key] = [];
  return editor.extractedText[key];
}

function approximatePdfFont(fontName = '') {
  const lower = String(fontName).toLowerCase();
  const bold = /bold|black|semibold|demi/.test(lower);
  const italic = /italic|oblique/.test(lower);
  let font = 'Helvetica';
  if (/times|serif|roman/.test(lower)) font = 'TimesRoman';
  else if (/courier|mono/.test(lower)) font = 'Courier';
  return {font, bold, italic};
}

function getEmbeddedFontTraits(data, fallbackName = '') {
  const lowerName = String(fallbackName || '').toLowerCase();
  let weight = /thin/.test(lowerName) ? 100
    : /extra[- ]?light|ultra[- ]?light/.test(lowerName) ? 200
      : /light/.test(lowerName) ? 300
        : /medium/.test(lowerName) ? 500
          : /semi[- ]?bold|demi/.test(lowerName) ? 600
            : /extra[- ]?bold|ultra[- ]?bold/.test(lowerName) ? 800
              : /black|heavy/.test(lowerName) ? 900
                : /bold/.test(lowerName) ? 700
                  : 400;
  let italic = /italic|oblique/.test(lowerName);

  try {
    const parsed = data?.length && window.fontkit?.create
      ? window.fontkit.create(data)
      : null;
    const parsedWeight = Number(parsed?.['OS/2']?.usWeightClass);
    if (Number.isFinite(parsedWeight) && parsedWeight >= 1 && parsedWeight <= 1000) {
      weight = parsedWeight;
    }
    italic = italic || Number(parsed?.post?.italicAngle || 0) !== 0 ||
      /italic|oblique/.test(String(parsed?.subfamilyName || '').toLowerCase());
  } catch (error) {
    console.warn('PDFBreeze could not read embedded font traits.', error);
  }

  return {weight, italic};
}

async function loadExactPdfFont(page, fontName) {
  if (!fontName) return null;
  if (Object.prototype.hasOwnProperty.call(editor.embeddedFonts, fontName)) {
    return editor.embeddedFonts[fontName];
  }

  try {
    const pdfFont = page.commonObjs.get(fontName);
    const rawData = pdfFont?.data;
    const data = rawData
      ? new Uint8Array(rawData.buffer
        ? rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength)
        : rawData)
      : null;
    const family = `PDFBreezeExact_${fontName.replace(/[^a-z0-9_-]/gi, '_')}`;
    const traits = getEmbeddedFontTraits(data, pdfFont?.name || fontName);
    const entry = {
      family,
      name: pdfFont?.name || fontName,
      data,
      weight: traits.weight,
      italic: traits.italic,
      ascent: Number.isFinite(pdfFont?.ascent) ? pdfFont.ascent : null,
      descent: Number.isFinite(pdfFont?.descent) ? pdfFont.descent : null
    };

    if (data?.length && window.FontFace && document.fonts) {
      const face = new FontFace(family, data, {
        weight: String(traits.weight),
        style: traits.italic ? 'italic' : 'normal'
      });
      await face.load();
      document.fonts.add(face);
      entry.face = face;
    }

    editor.embeddedFonts[fontName] = entry;
    return entry;
  } catch (error) {
    console.warn(`PDFBreeze could not load embedded PDF font ${fontName}.`, error);
    editor.embeddedFonts[fontName] = null;
    return null;
  }
}

function cssFamilyForExistingText(item) {
  const exact = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
  if (exact?.face) return `"${exact.family}"`;
  return item.font === 'TimesRoman'
    ? '"Times New Roman", Times, serif'
    : item.font === 'Courier'
      ? '"Courier New", monospace'
      : 'Helvetica, Arial, sans-serif';
}

function measureCanvasInk(context, width, height) {
  const pixels = context.getImageData(0, 0, width, height).data;
  let ink = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (!alpha) continue;
    const luminance = pixels[index] * .2126 + pixels[index + 1] * .7152 + pixels[index + 2] * .0722;
    ink += (255 - luminance) * alpha;
  }
  return ink;
}

function calibrateExistingTextStroke(items) {
  const sourceCanvas = document.getElementById('pdf-preview-canvas');
  const metrics = editor.canvasMetrics;
  if (!sourceCanvas || !metrics?.width || !metrics?.height) return;
  const sourceContext = sourceCanvas.getContext('2d', {willReadFrequently: true});

  items.forEach(item => {
    if (Number.isFinite(item.fontStrokeWidth)) return;
    const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
    if (!exactEntry?.face) {
      item.fontStrokeWidth = 0;
      return;
    }

    const left = Math.max(0, Math.floor(item.originalX * metrics.width));
    const top = Math.max(0, Math.floor(item.originalY * metrics.height));
    const width = Math.max(1, Math.min(sourceCanvas.width - left, Math.ceil(item.originalW * metrics.width)));
    const height = Math.max(1, Math.min(sourceCanvas.height - top, Math.ceil(item.originalH * metrics.height)));
    if (width < 2 || height < 2) {
      item.fontStrokeWidth = 0;
      return;
    }

    let sourcePixels;
    try {
      sourcePixels = sourceContext.getImageData(left, top, width, height).data;
    } catch (_) {
      item.fontStrokeWidth = 0;
      return;
    }
    let sourceInk = 0;
    for (let index = 0; index < sourcePixels.length; index += 4) {
      const luminance = sourcePixels[index] * .2126 + sourcePixels[index + 1] * .7152 + sourcePixels[index + 2] * .0722;
      if (luminance < 248) sourceInk += 255 - luminance;
    }

    const sample = document.createElement('canvas');
    sample.width = width;
    sample.height = Math.max(height, Math.ceil((String(item.text || '').split('\n').length + .5) * item.lineHeight * metrics.scale));
    const context = sample.getContext('2d', {willReadFrequently: true});
    const fontSize = Math.max(4, item.pdfFontSize * metrics.scale);
    const lineHeight = Math.max(5, item.lineHeight * metrics.scale);
    const weight = Number.isFinite(item.fontWeight) ? item.fontWeight : item.bold ? 700 : 400;
    const family = exactEntry.family;
    const lines = String(item.originalText || item.text || '').split('\n');
    const horizontalScale = Number.isFinite(item.fontScaleX) ? item.fontScaleX : 1;
    const candidates = [0, .04, .08, .12, .16, .2, .25, .3, .4, .5, .65, .8];
    let best = {stroke: 0, difference: Infinity};

    candidates.forEach(stroke => {
      context.clearRect(0, 0, sample.width, sample.height);
      context.save();
      context.scale(horizontalScale, 1);
      context.font = `${item.italic ? 'italic ' : ''}${weight} ${fontSize}px "${family}"`;
      context.textBaseline = 'top';
      context.fillStyle = '#000';
      context.strokeStyle = '#000';
      context.lineJoin = 'round';
      context.lineWidth = stroke * metrics.scale * 2;
      lines.forEach((line, lineIndex) => {
        const y = lineIndex * lineHeight;
        if (stroke > 0) context.strokeText(line, 0, y);
        context.fillText(line, 0, y);
      });
      context.restore();
      const candidateInk = measureCanvasInk(context, sample.width, sample.height);
      const difference = Math.abs(candidateInk - sourceInk);
      if (difference < best.difference) best = {stroke, difference};
    });

    item.fontStrokeWidth = best.stroke;
  });
}

async function ensureExistingTextForCurrentPage() {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return [];

  const key = String(sourceIndex);
  if (editor.extractedText[key]?.length) return editor.extractedText[key];

  const page = await editor.pdfjs.getPage(sourceIndex + 1);
  const textContent = await page.getTextContent();
  await page.getOperatorList();
  const fontNames = [...new Set(textContent.items.map(item => item.fontName).filter(Boolean))];
  await Promise.all(fontNames.map(fontName => loadExactPdfFont(page, fontName)));
  const viewport = page.getViewport({scale: 1});

  const runs = textContent.items
    .map((textItem, index) => {
      const text = String(textItem.str || '');
      if (!text.trim()) return null;

      const tx = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
      const fontHeight = Math.max(5, Math.hypot(tx[2], tx[3]));
      const rawX = tx[4];
      const textStyle = textContent.styles?.[textItem.fontName] || {};
      const exactFont = editor.embeddedFonts[textItem.fontName];
      const ascent = Number.isFinite(textStyle.ascent)
        ? textStyle.ascent
        : Number.isFinite(exactFont?.ascent)
          ? exactFont.ascent
          : 1;
      const rawTop = tx[5] - fontHeight * ascent;
      const rawWidth = Math.max(1, Math.abs(textItem.width || 0));
      const x = Math.max(0, Math.min(viewport.width, rawX));
      const right = Math.max(0, Math.min(viewport.width, rawX + rawWidth));
      const top = Math.max(0, Math.min(viewport.height, rawTop));
      const bottom = Math.max(0, Math.min(viewport.height, rawTop + fontHeight));
      const width = right - x;
      const clippedHeight = bottom - top;
      // Some scanned PDFs contain malformed invisible OCR runs positioned far
      // outside the page. They previously produced selection boxes across the
      // editor. Ignore those runs and clip partial runs to the visible page.
      if (width < 1 || clippedHeight < 1) return null;
      const style = approximatePdfFont(exactFont?.name || textItem.fontName);
      const fontWeight = Number.isFinite(exactFont?.weight)
        ? exactFont.weight
        : style.bold ? 700 : 400;
      const italic = exactFont?.face ? Boolean(exactFont.italic) : style.italic;

      return {
        index,
        text,
        x,
        top,
        width,
        height: clippedHeight,
        baselineY: textItem.transform[5],
        visualBaselineY: tx[5],
        pdfX: textItem.transform[4],
        pdfY: textItem.transform[5],
        pdfFontSize: Math.max(5, Math.hypot(textItem.transform[0], textItem.transform[1])),
        fontName: textItem.fontName || '',
        exactFontKey: exactFont?.data?.length ? textItem.fontName : '',
        font: style.font,
        fontWeight,
        bold: fontWeight >= 600,
        italic
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const vertical = a.top - b.top;
      return Math.abs(vertical) > Math.max(a.height, b.height) * .55 ? vertical : a.x - b.x;
    });

  // First group runs into visual lines.
  const lines = [];
  for (const run of runs) {
    let line = lines.find(candidate => {
      const tolerance = Math.max(candidate.avgHeight, run.height) * .55;
      return Math.abs(candidate.top - run.top) <= tolerance;
    });

    if (!line) {
      line = {
        runs: [],
        top: run.top,
        bottom: run.top + run.height,
        left: run.x,
        right: run.x + run.width,
        avgHeight: run.height
      };
      lines.push(line);
    }

    line.runs.push(run);
    line.top = Math.min(line.top, run.top);
    line.bottom = Math.max(line.bottom, run.top + run.height);
    line.left = Math.min(line.left, run.x);
    line.right = Math.max(line.right, run.x + run.width);
    line.avgHeight = line.runs.reduce((sum, item) => sum + item.height, 0) / line.runs.length;
  }

  lines.sort((a, b) => a.top - b.top);
  lines.forEach(line => line.runs.sort((a, b) => a.x - b.x));

  // Then group neighbouring lines into paragraph boxes.
  const paragraphs = [];
  for (const line of lines) {
    const text = line.runs.map((run, i) => {
      if (i === 0) return run.text;
      const prev = line.runs[i - 1];
      const gap = run.x - (prev.x + prev.width);
      return `${gap > Math.max(2, line.avgHeight * .16) ? ' ' : ''}${run.text}`;
    }).join('');

    const firstRun = line.runs[0];
    const paragraphCandidate = paragraphs[paragraphs.length - 1];
    const lineGap = paragraphCandidate ? line.top - paragraphCandidate.bottom : Infinity;
    const sameLeftEdge = paragraphCandidate
      ? Math.abs(line.left - paragraphCandidate.left) <= Math.max(8, line.avgHeight * .85)
      : false;
    const closeVertically = paragraphCandidate
      ? lineGap <= Math.max(line.avgHeight, paragraphCandidate.avgHeight) * .72
      : false;
    const previousFirstRun = paragraphCandidate?.firstRun;
    const sameFontFamily = previousFirstRun
      ? (previousFirstRun.exactFontKey || previousFirstRun.font) === (firstRun.exactFontKey || firstRun.font)
      : false;
    const similarFontSize = previousFirstRun
      ? Math.abs(previousFirstRun.pdfFontSize - firstRun.pdfFontSize) <= Math.max(1.2, firstRun.pdfFontSize * .14)
      : false;

    if (paragraphCandidate && closeVertically && sameLeftEdge && sameFontFamily && similarFontSize) {
      paragraphCandidate.lines.push({text, line});
      paragraphCandidate.text += `\n${text}`;
      paragraphCandidate.originalText = paragraphCandidate.text;
      paragraphCandidate.left = Math.min(paragraphCandidate.left, line.left);
      paragraphCandidate.right = Math.max(paragraphCandidate.right, line.right);
      paragraphCandidate.top = Math.min(paragraphCandidate.top, line.top);
      paragraphCandidate.bottom = Math.max(paragraphCandidate.bottom, line.bottom);
      paragraphCandidate.avgHeight =
        paragraphCandidate.lines.reduce((sum, item) => sum + item.line.avgHeight, 0) /
        paragraphCandidate.lines.length;
    } else {
      paragraphs.push({
        lines: [{text, line}],
        text,
        originalText: text,
        left: line.left,
        right: line.right,
        top: line.top,
        bottom: line.bottom,
        avgHeight: line.avgHeight,
        firstRun
      });
    }
  }

  const items = paragraphs.map((paragraph, index) => {
    const paragraphRuns = paragraph.lines.flatMap(({line}) => line.runs);
    const styleTotals = new Map();
    paragraphRuns.forEach(run => {
      const key = [
        run.exactFontKey || run.fontName || run.font,
        run.fontWeight,
        run.italic ? 1 : 0
      ].join('|');
      const total = styleTotals.get(key) || {run, score: 0};
      total.score += Math.max(1, String(run.text || '').replace(/\s/g, '').length);
      styleTotals.set(key, total);
    });
    // A PDF paragraph can begin with a short run that differs from the main
    // body (for example a normal-weight prefix followed by medium text). The
    // editable overlay must use the paragraph's real dominant embedded style,
    // not whichever run happened to be first in extraction order.
    const firstRun = [...styleTotals.values()]
      .sort((a, b) => b.score - a.score)[0]?.run || paragraph.firstRun;
    const width = Math.max(12, paragraph.right - paragraph.left);
    const height = Math.max(paragraph.avgHeight * 1.15, paragraph.bottom - paragraph.top);
    const normalisedX = Math.max(0, Math.min(.995, paragraph.left / viewport.width));
    const normalisedY = Math.max(0, Math.min(.995, paragraph.top / viewport.height));
    const normalisedWidth = Math.min(1 - normalisedX, Math.max(.005, width / viewport.width));
    const normalisedHeight = Math.min(1 - normalisedY, Math.max(.008, height / viewport.height));

    // Character-level geometry shared by text annotation tools.
    // Widths are measured per glyph and then normalised to the exact PDF run width.
    const highlightCharacters = [];
    const measurementCanvas = document.createElement('canvas');
    const measurementContext = measurementCanvas.getContext('2d');

    const exactEntry = firstRun.exactFontKey && editor.embeddedFonts[firstRun.exactFontKey];
    const editingFamily = exactEntry?.face
      ? exactEntry.family
      : firstRun.font === 'TimesRoman' ? 'Times New Roman'
        : firstRun.font === 'Courier' ? 'Courier New'
          : 'Arial';
    measurementContext.font =
      `${firstRun.italic ? 'italic ' : ''}${firstRun.fontWeight || (firstRun.bold ? 700 : 400)} ` +
      `${firstRun.pdfFontSize}px "${editingFamily}"`;
    const fittedPdfFontSize = firstRun.pdfFontSize;
    const lineWidths = paragraph.lines.map(({line}) => Math.max(1, line.right - line.left));
    const lineOffsets = paragraph.lines.map(({line}) => line.left - paragraph.left);
    const lineScaleSamples = paragraph.lines.map(({text}, lineIndex) => {
      const measuredWidth = Math.max(.01, measurementContext.measureText(text).width);
      return lineWidths[lineIndex] / measuredWidth;
    });
    const fontScaleX = Math.max(
      .5,
      Math.min(2, lineScaleSamples.reduce((sum, value) => sum + value, 0) / Math.max(1, lineScaleSamples.length))
    );

    paragraph.lines.forEach(({line}, paragraphLineIndex) => {
      line.runs.forEach(run => {
        const characters = Array.from(String(run.text || ''));
        if (!characters.length) return;

        const runExactEntry = run.exactFontKey && editor.embeddedFonts[run.exactFontKey];
        const family = runExactEntry?.face
          ? runExactEntry.family
          : run.font === 'TimesRoman' ? 'Times New Roman'
            : run.font === 'Courier' ? 'Courier New'
              : 'Arial';

        measurementContext.font =
          `${run.italic ? 'italic ' : ''}${run.fontWeight || (run.bold ? 700 : 400)} ${run.height}px "${family}"`;

        const measured = characters.map(character => {
          const metrics = measurementContext.measureText(character);
          return {
            character,
            width: Math.max(.01, metrics.width),
            ascent: Number.isFinite(metrics.actualBoundingBoxAscent)
              ? metrics.actualBoundingBoxAscent
              : run.height * .78,
            descent: Number.isFinite(metrics.actualBoundingBoxDescent)
              ? metrics.actualBoundingBoxDescent
              : run.height * .18
          };
        });

        const measuredTotal = Math.max(
          .01,
          measured.reduce((sum, item) => sum + item.width, 0)
        );
        const widthScale = run.width / measuredTotal;

        const maxAscent = Math.max(...measured.map(item => item.ascent), run.height * .7);
        const maxDescent = Math.max(...measured.map(item => item.descent), run.height * .12);
        const metricTotal = Math.max(1, maxAscent + maxDescent);
        const metricScale = run.height / metricTotal;

        // PDF.js tx[5] is the visual baseline in viewport coordinates.
        const baseline = run.top + run.height;
        const glyphAscent = maxAscent * metricScale;
        const glyphDescent = maxDescent * metricScale;

        // Small, even padding above and below the actual glyph bounds.
        const verticalPadding = Math.max(.45, run.height * .055);
        const highlightTop = baseline - glyphAscent - verticalPadding;
        const highlightBottom = baseline + glyphDescent + verticalPadding;
        const highlightHeight = Math.max(2, highlightBottom - highlightTop);

        let cursorX = run.x;

        measured.forEach((item, characterIndex) => {
          const characterWidth = item.width * widthScale;
          const isWhitespace = /\s/.test(item.character);

          highlightCharacters.push({
            text: item.character,
            isWhitespace,
            lineIndex: paragraphLineIndex,
            runIndex: run.index,
            characterIndex,
            x: Math.max(0, cursorX / viewport.width),
            y: Math.max(0, highlightTop / viewport.height),
            w: Math.min(1, Math.max(.0005, characterWidth / viewport.width)),
            h: Math.min(1, Math.max(.004, highlightHeight / viewport.height))
          });

          cursorX += characterWidth;
        });
      });
    });

    return {
      id: `existing-${sourceIndex}-${index}`,
      type: 'existing-text',
      originalText: paragraph.originalText,
      text: paragraph.text,
      x: normalisedX,
      y: normalisedY,
      w: normalisedWidth,
      h: normalisedHeight,
      originalX: normalisedX,
      originalY: normalisedY,
      originalW: normalisedWidth,
      originalH: normalisedHeight,
      pdfX: firstRun.pdfX,
      pdfY: firstRun.pdfY,
      pdfWidth: width,
      pdfFontSize: firstRun.pdfFontSize,
      fittedPdfFontSize,
      fontScaleX,
      lineWidths,
      lineOffsets,
      lineScaleXs: lineScaleSamples,
      lineBaselineOffsets: paragraph.lines.map(({line}) =>
        (line.runs[0]?.visualBaselineY ?? (line.top + line.avgHeight)) - paragraph.top
      ),
      fontName: firstRun.fontName,
      exactFontKey: firstRun.exactFontKey || '',
      font: firstRun.font,
      fontWeight: firstRun.fontWeight,
      originalFontWeight: firstRun.fontWeight,
      bold: firstRun.bold,
      italic: firstRun.italic,
      lineHeight: paragraph.avgHeight,
      highlightCharacters,
      modified: false
    };
  });

  calibrateExistingTextStroke(items);
  editor.extractedText[key] = items;
  return items;
}

function getSelectedExistingText() {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null || !editor.selectedExistingTextId) return null;
  return getExistingTextItems(sourceIndex).find(item => item.id === editor.selectedExistingTextId) || null;
}

function refreshExistingTextSelectionClasses() {
  document.querySelectorAll('.existing-text-box').forEach(box => {
    const selected = box.dataset.id === editor.selectedExistingTextId;
    box.classList.toggle('selected', selected);
    if (!selected) {
      box.classList.remove('editing');
      const content = box.querySelector('.existing-text-content');
      if (content) content.removeAttribute('contenteditable');
    }
  });
}

function selectExistingText(id) {
  editor.selectedExistingTextId = id;
  editor.selectedAnnotationId = null;
  refreshExistingTextSelectionClasses();
}

function deselectExistingText() {
  editor.selectedExistingTextId = null;
  refreshExistingTextSelectionClasses();
}

function commitExistingTextEditing({render = true} = {}) {
  const box = document.querySelector('.existing-text-box.editing');
  if (!box) return false;
  const sourceIndex = getCurrentSourcePageIndex();
  const item = sourceIndex === null ? null : getExistingTextItems(sourceIndex)
    .find(candidate => candidate.id === box.dataset.id);
  if (!item) return false;

  const content = box.querySelector('.existing-text-content');
  const nextText = (content?.textContent || '').replace(/\r/g, '');
  const changed = nextText !== item.originalText || Boolean(item.html);
  item.editing = false;
  item.modified = changed;

  if (changed) {
    item.text = nextText;
    const requiredHeight = Math.max(
      16,
      item.h * (editor.canvasMetrics?.height || 0),
      content?.scrollHeight || 0
    );
    if (editor.canvasMetrics?.height) {
      item.h = Math.min(1 - item.y, requiredHeight / editor.canvasMetrics.height);
    }
  } else {
    item.text = item.originalText;
    item.html = '';
    item.x = item.originalX;
    item.y = item.originalY;
    item.w = item.originalW;
    item.h = item.originalH;
  }

  if (render) renderAnnotations();
  return true;
}

function beginExistingTextEditing(item, clientX, clientY) {
  commitExistingTextEditing({render: false});
  editor.selectedExistingTextId = item.id;
  editor.selectedAnnotationId = null;
  editor.selectedEditCreatedTextId = null;
  if (!item.editing) recordHistory();
  item.editing = true;
  renderAnnotations();
  syncEditTextToolbar();

  requestAnimationFrame(() => {
    const box = document.querySelector(`.existing-text-box[data-id="${CSS.escape(item.id)}"]`);
    const content = box?.querySelector('.existing-text-content');
    if (!content) return;
    content.setAttribute('contenteditable', 'plaintext-only');
    if (content.contentEditable !== 'plaintext-only') content.setAttribute('contenteditable', 'true');
    content.focus({preventScroll: true});

    let range = null;
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(clientX, clientY);
      if (position && content.contains(position.offsetNode)) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    } else if (document.caretRangeFromPoint) {
      const candidate = document.caretRangeFromPoint(clientX, clientY);
      if (candidate && content.contains(candidate.startContainer)) range = candidate;
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(content);
      range.collapse(false);
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
}

function startExistingTextResize(event, item, side, box, content) {
  event.preventDefault();
  event.stopPropagation();
  selectExistingText(item.id);
  recordHistory();

  const metrics = editor.canvasMetrics;
  const startX = event.clientX;
  const originalX = item.x;
  const originalW = item.w;

  const updateBox = () => {
    box.classList.add('modified');
    content.style.display = 'block';

    box.style.left = `${item.x * metrics.width}px`;
    box.style.width = `${item.w * metrics.width}px`;

    // Ensure a whiteout exists over the full original paragraph while the
    // resized replacement is being previewed.
    let whiteout = document.querySelector(`.existing-text-whiteout[data-for="${item.id}"]`);
    if (!whiteout) {
      whiteout = document.createElement('div');
      whiteout.className = 'existing-text-whiteout';
      whiteout.dataset.for = item.id;
      document.getElementById('annotation-layer').insertBefore(whiteout, box);
    }
    whiteout.style.left = `${item.originalX * metrics.width - 3}px`;
    whiteout.style.top = `${item.originalY * metrics.height - 3}px`;
    whiteout.style.width = `${item.originalW * metrics.width + 6}px`;
    whiteout.style.height = `${Math.max(16, item.originalH * metrics.height) + 6}px`;

    const requiredHeight = Math.max(
      item.h * metrics.height,
      content.scrollHeight
    );
    box.style.minHeight = `${requiredHeight}px`;
    item.h = Math.min(1 - item.y, requiredHeight / metrics.height);
  };

  const move = moveEvent => {
    const delta = (moveEvent.clientX - startX) / metrics.width;

    if (side === 'left') {
      const newX = Math.max(0, Math.min(originalX + originalW - .03, originalX + delta));
      item.w = originalW + (originalX - newX);
      item.x = newX;
    } else {
      item.w = Math.max(.03, Math.min(1 - item.x, originalW + delta));
    }

    item.modified = true;
    updateBox();
  };

  const up = () => {
    updateBox();
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };

  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}


function getEditCreatedTextItems(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.editCreatedText[key]) editor.editCreatedText[key] = [];
  return editor.editCreatedText[key];
}

function getSelectedEditTarget() {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return null;

  if (editor.selectedExistingTextId) {
    return getExistingTextItems(sourceIndex).find(item => item.id === editor.selectedExistingTextId) || null;
  }

  if (editor.selectedEditCreatedTextId) {
    return getEditCreatedTextItems(sourceIndex).find(item => item.id === editor.selectedEditCreatedTextId) || null;
  }

  return null;
}

function syncEditTextToolbar() {
  const item = getSelectedEditTarget();
  if (!item) return;

  const font = document.getElementById('edit-text-font');
  const size = document.getElementById('edit-text-size');
  const bold = document.getElementById('edit-text-bold');
  const italic = document.getElementById('edit-text-italic');
  const colourLine = document.getElementById('edit-colour-line');

  if (font) font.value = item.font || 'Helvetica';

  if (size) {
    const requested = Math.max(4, Math.min(200, Math.round(item.pdfFontSize || item.size || 18)));
    let option = Array.from(size.options).find(opt => Number(opt.value) === requested);
    if (!option) {
      option = document.createElement('option');
      option.value = String(requested);
      option.textContent = String(requested);
      size.appendChild(option);
    }
    size.value = String(requested);
  }

  if (bold) bold.classList.toggle('active', Boolean(item.bold));
  if (italic) italic.classList.toggle('active', Boolean(item.italic));
  if (colourLine) colourLine.style.background = item.color || '#111827';
}

function updateEditTarget(mutator) {
  const item = getSelectedEditTarget();
  if (!item) return;
  recordHistory();
  mutator(item);
  item.modified = true;
  renderAnnotations();
}

function applyColourToCurrentSelection(colour) {
  const active = document.activeElement;
  const isEditable =
    active &&
    (active.classList.contains('existing-text-content') || active.classList.contains('edit-created-text')) &&
    active.isContentEditable;

  if (isEditable) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && active.contains(selection.anchorNode)) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colour);
      const target = getSelectedEditTarget();
      if (target) {
        target.html = active.innerHTML;
        target.text = active.innerText.replace(/\r/g, '');
        target.modified = true;
      }
      return;
    }
  }

  updateEditTarget(item => {
    item.color = colour;
    item.html = '';
  });
}

function placeCaretAtEnd(element) {
  element.focus({preventScroll: true});
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function addEditTextBoxAt(clientX, clientY) {
  const sourceIndex = getCurrentSourcePageIndex();
  const layer = document.getElementById('annotation-layer');
  const rect = layer.getBoundingClientRect();
  if (sourceIndex === null || !rect.width || !rect.height) return;

  const item = {
    id: `edit-created-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type: 'edit-created-text',
    text: '',
    html: '',
    x: Math.max(0, Math.min(.82, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(.93, (clientY - rect.top) / rect.height)),
    w: .18,
    h: .045,
    font: document.getElementById('edit-text-font').value || 'Helvetica',
    pdfFontSize: Number(document.getElementById('edit-text-size').value) || 18,
    bold: document.getElementById('edit-text-bold').classList.contains('active'),
    italic: document.getElementById('edit-text-italic').classList.contains('active'),
    color: document.getElementById('edit-colour-line').style.background || '#111827',
    modified: true
  };

  recordHistory();
  getEditCreatedTextItems(sourceIndex).push(item);
  editor.selectedExistingTextId = null;
  editor.selectedEditCreatedTextId = item.id;
  editor.editTextBoxMode = false;
  document.getElementById('edit-add-text-box').classList.remove('active');
  layer.classList.remove('add-edit-box-mode');

  renderAnnotations();

  requestAnimationFrame(() => {
    const element = document.querySelector(`.edit-created-text[data-id="${item.id}"]`);
    if (!element) return;
    element.classList.add('editing');
    element.setAttribute('contenteditable', 'plaintext-only');
    if (element.contentEditable !== 'plaintext-only') element.setAttribute('contenteditable', 'true');
    placeCaretAtEnd(element);
  });
}

function startEditCreatedResize(event, item, side, box) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();

  const metrics = editor.canvasMetrics;
  const startX = event.clientX;
  const originalX = item.x;
  const originalW = item.w;

  const move = moveEvent => {
    const delta = (moveEvent.clientX - startX) / metrics.width;
    if (side === 'left') {
      const newX = Math.max(0, Math.min(originalX + originalW - .03, originalX + delta));
      item.w = originalW + (originalX - newX);
      item.x = newX;
    } else {
      item.w = Math.max(.03, Math.min(1 - item.x, originalW + delta));
    }

    box.style.left = `${item.x * metrics.width}px`;
    box.style.width = `${item.w * metrics.width}px`;
    const height = Math.max(30, box.scrollHeight);
    box.style.minHeight = `${height}px`;
    item.h = Math.min(1 - item.y, height / metrics.height);
  };

  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };

  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

function renderEditCreatedTextBoxes(layer, metrics) {
  if (editor.mode !== 'edit-existing') return;
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return;

  getEditCreatedTextItems(sourceIndex).forEach(item => {
    const box = document.createElement('div');
    box.className = 'edit-created-text';
    if (item.id === editor.selectedEditCreatedTextId) box.classList.add('selected');
    box.dataset.id = item.id;
    box.style.left = `${item.x * metrics.width}px`;
    box.style.top = `${item.y * metrics.height}px`;
    box.style.width = `${item.w * metrics.width}px`;
    box.style.minHeight = `${Math.max(30, item.h * metrics.height)}px`;
    box.style.fontFamily = item.font === 'TimesRoman'
      ? '"Times New Roman", Times, serif'
      : item.font === 'Courier'
        ? '"Courier New", monospace'
        : 'Helvetica, Arial, sans-serif';
    box.style.fontWeight = item.bold ? '700' : '400';
    box.style.fontStyle = item.italic ? 'italic' : 'normal';
    box.style.fontSize = `${Math.max(4, item.pdfFontSize * metrics.scale)}px`;
    box.style.color = item.color || '#111827';

    if (item.html) box.innerHTML = item.html;
    else box.textContent = item.text || '';

    const leftHandle = document.createElement('span');
    leftHandle.className = 'existing-handle left-handle';
    leftHandle.contentEditable = 'false';

    const rightHandle = document.createElement('span');
    rightHandle.className = 'existing-handle right-handle';
    rightHandle.contentEditable = 'false';

    box.append(leftHandle, rightHandle);

    box.addEventListener('click', event => {
      event.stopPropagation();

      if (box.classList.contains('editing')) return;

      editor.selectedExistingTextId = null;
      editor.selectedEditCreatedTextId = item.id;
      document.querySelectorAll('.existing-text-box').forEach(el => el.classList.remove('selected'));
      document.querySelectorAll('.edit-created-text').forEach(el => el.classList.toggle('selected', el === box));
      syncEditTextToolbar();
    });

    box.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();

      editor.selectedExistingTextId = null;
      editor.selectedEditCreatedTextId = item.id;
      box.classList.add('selected', 'editing');
      box.setAttribute('contenteditable', 'plaintext-only');
      if (box.contentEditable !== 'plaintext-only') box.setAttribute('contenteditable', 'true');

      requestAnimationFrame(() => placeCaretAtEnd(box));
    });

    box.addEventListener('input', () => {
      const handles = box.querySelectorAll('.existing-handle');
      handles.forEach(handle => handle.remove());

      item.html = box.innerHTML;
      item.text = box.innerText.replace(/\r/g, '');
      item.modified = true;

      box.append(leftHandle, rightHandle);
      const height = Math.max(30, box.scrollHeight);
      box.style.minHeight = `${height}px`;
      item.h = Math.min(1 - item.y, height / metrics.height);
    });

    box.addEventListener('blur', () => {
      if (!box.classList.contains('editing')) return;
      box.removeAttribute('contenteditable');
      box.classList.remove('editing');

      const handles = box.querySelectorAll('.existing-handle');
      handles.forEach(handle => handle.remove());
      item.html = box.innerHTML;
      item.text = box.innerText.replace(/\r/g, '');
      box.append(leftHandle, rightHandle);
    });

    leftHandle.addEventListener('mousedown', event => startEditCreatedResize(event, item, 'left', box));
    rightHandle.addEventListener('mousedown', event => startEditCreatedResize(event, item, 'right', box));

    layer.appendChild(box);
  });
}


function getPageTextHighlights(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.textHighlights[key]) editor.textHighlights[key] = [];
  return editor.textHighlights[key];
}

function getHighlightCharactersForPage(sourceIndex) {
  const characters = [];

  getExistingTextItems(sourceIndex).forEach(paragraph => {
    (paragraph.highlightCharacters || []).forEach(character => {
      characters.push({
        ...character,
        paragraphId: paragraph.id
      });
    });
  });

  return characters
    .sort((a,b) => {
      const sameVisualLine =
        Math.abs(a.y - b.y) <= Math.max(a.h,b.h) * .42;

      if (!sameVisualLine) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      if (a.runIndex !== b.runIndex) return a.runIndex - b.runIndex;
      return a.characterIndex - b.characterIndex;
    })
    .map((character,index) => ({...character, order:index}));
}

function renderSavedTextHighlights(layer, metrics) {
  if (!editor.pages.length) return;
  const sourceIndex = getCurrentSourcePageIndex();

  getPageTextHighlights(sourceIndex).forEach(highlight => {
    highlight.rects.forEach(rect => {
      const element = document.createElement('div');
      element.className = 'saved-text-highlight';
      element.style.left = `${rect.x * metrics.width}px`;
      element.style.top = `${rect.y * metrics.height}px`;
      element.style.width = `${rect.w * metrics.width}px`;
      element.style.height = `${rect.h * metrics.height}px`;
      element.style.background = highlight.colour;
      element.style.opacity = '.48';
      layer.appendChild(element);
    });
  });
}

function mergeHighlightCharacterRects(selectedCharacters) {
  const sorted = [...selectedCharacters].sort((a,b) => a.order - b.order);
  const rows = [];

  sorted.forEach(word => {
    let row = rows.find(candidate =>
      Math.abs(candidate.y - word.y) <= Math.max(candidate.h,word.h) * .48
    );

    if (!row) {
      row = {y:word.y, h:word.h, words:[]};
      rows.push(row);
    }

    row.words.push(word);
    row.y = Math.min(row.y,word.y);
    row.h = Math.max(row.h,word.h);
  });

  return rows
    .sort((a,b) => a.y - b.y)
    .map(row => {
      row.words.sort((a,b) => a.x - b.x);
      const visible = row.words.filter(character => !character.isWhitespace);
      const source = visible.length ? visible : row.words;
      const left = Math.min(...source.map(character => character.x));
      const right = Math.max(...source.map(character => character.x + character.w));
      const top = Math.min(...source.map(character => character.y));
      const bottom = Math.max(...source.map(character => character.y + character.h));

      return {
        x:left,
        y:top,
        w:right-left,
        h:bottom-top
      };
    });
}

function renderTextHighlightInteraction(layer, metrics) {
  if (editor.mode !== 'text-highlight' || !editor.pages.length) return;

  const sourceIndex = getCurrentSourcePageIndex();
  const characters = getHighlightCharactersForPage(sourceIndex);
  if (!characters.length) {
    showEditorHint('No selectable text was found on this PDF page.');
    return;
  }

  const shield = document.createElement('div');
  shield.className = 'text-highlight-drag-shield';
  layer.appendChild(shield);

  let startOrder = null;
  let currentOrder = null;
  let pointerId = null;
  let previewElements = [];

  const clearPreview = () => {
    previewElements.forEach(element => element.classList.remove('preview'));
    previewElements = [];
  };

  const showPreview = () => {
    clearPreview();
    if (startOrder === null || currentOrder === null) return;

    const first = Math.min(startOrder,currentOrder);
    const last = Math.max(startOrder,currentOrder);

    layer.querySelectorAll('.text-highlight-hit').forEach(element => {
      const order = Number(element.dataset.order);
      if (
        order >= first &&
        order <= last &&
        element.dataset.whitespace !== 'true'
      ) {
        element.classList.add('preview');
        previewElements.push(element);
      }
    });
  };

  const orderAtPoint = (clientX,clientY) => {
    const bounds = layer.getBoundingClientRect();
    const x = (clientX - bounds.left) / bounds.width;
    const y = (clientY - bounds.top) / bounds.height;

    let best = null;
    let bestDistance = Infinity;

    characters.forEach(character => {
      const centreX = character.x + character.w / 2;
      const centreY = character.y + character.h / 2;
      const dx = Math.max(0,Math.abs(x-centreX)-character.w/2);
      const dy = Math.max(0,Math.abs(y-centreY)-character.h/2);
      const distance = dx*dx + dy*dy*5;

      if (distance < bestDistance) {
        bestDistance = distance;
        best = character;
      }
    });

    return best?.order ?? null;
  };

  const move = event => {
    if (startOrder === null) return;
    currentOrder = orderAtPoint(event.clientX,event.clientY);
    showPreview();
  };

  const finish = event => {
    if (startOrder === null) return;

    currentOrder = orderAtPoint(event.clientX,event.clientY) ?? currentOrder ?? startOrder;
    const first = Math.min(startOrder,currentOrder);
    const last = Math.max(startOrder,currentOrder);
    const selectedCharacters = characters.filter(character =>
      character.order >= first &&
      character.order <= last
    );

    if (selectedCharacters.length) {
      recordHistory();
      getPageTextHighlights(sourceIndex).push({
        id:`highlight-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        colour:editor.highlightColour,
        rects:mergeHighlightCharacterRects(selectedCharacters)
      });
    }

    startOrder = null;
    currentOrder = null;
    clearPreview();
    layer.classList.remove('text-highlight-dragging');

    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',finish);
    window.removeEventListener('pointercancel',finish);
    renderAnnotations();
  };

  characters.forEach(character => {
    const hit = document.createElement('div');
    hit.className = 'text-highlight-hit';
    hit.dataset.order = String(character.order);
    hit.dataset.whitespace = character.isWhitespace ? 'true' : 'false';
    hit.style.left = `${character.x * metrics.width}px`;
    hit.style.top = `${character.y * metrics.height}px`;
    hit.style.width = `${Math.max(1,character.w * metrics.width)}px`;
    hit.style.height = `${Math.max(6,character.h * metrics.height)}px`;

    if (!character.isWhitespace) {
      hit.addEventListener('pointerdown',event => {
        if (editor.mode !== 'text-highlight') return;

        event.preventDefault();
        event.stopPropagation();

        pointerId = event.pointerId;
        startOrder = character.order;
        currentOrder = character.order;
        layer.classList.add('text-highlight-dragging');
        showPreview();

        window.addEventListener('pointermove',move);
        window.addEventListener('pointerup',finish);
        window.addEventListener('pointercancel',finish);
      });
    } else {
      hit.style.pointerEvents = 'none';
    }

    layer.appendChild(hit);
  });
}


function renderExistingTextCanvas(canvas, item, metrics, content = null) {
  const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
  const cssWidth = Math.max(1, item.w * metrics.width);
  const cssHeight = Math.max(16, item.h * metrics.height, content?.scrollHeight || 0);
  const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.max(1, Math.ceil(cssWidth * pixelRatio));
  canvas.height = Math.max(1, Math.ceil(cssHeight * pixelRatio));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.scale(pixelRatio, pixelRatio);
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  context.fillStyle = item.color || '#000000';
  context.strokeStyle = item.color || '#000000';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(0, Number(item.fontStrokeWidth) || 0) * metrics.scale * 2;

  const preservedWeight = Number.isFinite(item.fontWeight)
    ? item.fontWeight
    : Number.isFinite(item.originalFontWeight)
      ? item.originalFontWeight
      : item.bold ? 700 : 400;
  const family = exactEntry?.face
    ? `"${exactEntry.family}"`
    : cssFamilyForExistingText(item);
  const fontSize = Math.max(4, item.pdfFontSize * metrics.scale);
  context.font = `${item.italic ? 'italic ' : ''}${preservedWeight} ${fontSize}px ${family}`;

  const lines = String(item.text || '').split('\n');
  const baselineFallback = Math.max(fontSize * .75, (item.lineHeight || item.pdfFontSize) * metrics.scale * .75);
  lines.forEach((line, lineIndex) => {
    const lineOffset = Number.isFinite(Number(item.lineOffsets?.[lineIndex]))
      ? Number(item.lineOffsets[lineIndex]) * metrics.scale
      : 0;
    const baseline = Number.isFinite(Number(item.lineBaselineOffsets?.[lineIndex]))
      ? Number(item.lineBaselineOffsets[lineIndex]) * metrics.scale
      : baselineFallback + lineIndex * item.lineHeight * metrics.scale;
    const horizontalScale = Number.isFinite(Number(item.lineScaleXs?.[lineIndex]))
      ? Number(item.lineScaleXs[lineIndex])
      : Number.isFinite(item.fontScaleX) ? item.fontScaleX : 1;

    context.save();
    context.translate(lineOffset, baseline);
    context.scale(horizontalScale, 1);
    if (context.lineWidth > 0) context.strokeText(line, 0, 0);
    context.fillText(line, 0, 0);
    context.restore();
  });
}

function renderExistingTextBoxes(layer, metrics) {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return;

  const editModeActive = editor.mode === 'edit-existing';
  getExistingTextItems(sourceIndex)
    .filter(item => editModeActive || item.modified)
    .forEach(item => {
    const isSelected = item.id === editor.selectedExistingTextId;
    const isModified = Boolean(item.modified);
    const isEditing = Boolean(item.editing);

    // Whenever the text is selected, resized or edited, hide the original PDF
    // text beneath the complete original paragraph area.
    if (isEditing || isModified) {
      const whiteout = document.createElement('div');
      whiteout.className = 'existing-text-whiteout';
      whiteout.dataset.for = item.id;
      whiteout.style.left = `${item.originalX * metrics.width - 3}px`;
      whiteout.style.top = `${item.originalY * metrics.height - 3}px`;
      whiteout.style.width = `${item.originalW * metrics.width + 6}px`;
      whiteout.style.height = `${Math.max(16, item.originalH * metrics.height) + 6}px`;
      layer.appendChild(whiteout);
    }

    const box = document.createElement('div');
    box.className = 'existing-text-box';
    if (isSelected) box.classList.add('selected');
    if (isModified) box.classList.add('modified');
    if (isEditing) box.classList.add('editing');
    box.dataset.id = item.id;
    box.style.left = `${item.x * metrics.width}px`;
    box.style.top = `${item.y * metrics.height}px`;
    box.style.width = `${item.w * metrics.width}px`;
    box.style.minHeight = `${Math.max(16, item.h * metrics.height)}px`;

    const content = document.createElement('div');
    content.className = 'existing-text-content';
    if (item.html) content.innerHTML = item.html;
    else content.textContent = item.text;
    content.spellcheck = false;
    content.style.fontFamily = cssFamilyForExistingText(item);
    const preservedFontWeight = Number.isFinite(item.fontWeight)
      ? item.fontWeight
      : Number.isFinite(item.originalFontWeight)
        ? item.originalFontWeight
        : item.bold ? 700 : 400;
    content.style.fontWeight = String(preservedFontWeight);
    const preservedStroke = Number.isFinite(item.fontStrokeWidth) ? item.fontStrokeWidth : 0;
    content.style.webkitTextStrokeWidth = `${preservedStroke * metrics.scale}px`;
    content.style.webkitTextStrokeColor = item.color || '#000000';
    content.style.paintOrder = 'stroke fill';
    content.style.fontStyle = item.italic ? 'italic' : 'normal';
    const visualPdfFontSize = item.pdfFontSize;
    content.style.fontSize = `${Math.max(4, visualPdfFontSize * metrics.scale)}px`;
    content.style.lineHeight = `${Math.max(5, item.lineHeight * metrics.scale)}px`;
    content.style.setProperty('color', item.color || '#000000', 'important');
    const horizontalScale = Number.isFinite(item.fontScaleX) ? item.fontScaleX : 1;
    content.style.transformOrigin = 'left top';
    content.style.transform = `scaleX(${horizontalScale})`;
    content.style.width = `${100 / horizontalScale}%`;

    const visualCanvas = document.createElement('canvas');
    visualCanvas.className = 'existing-text-render';
    renderExistingTextCanvas(visualCanvas, item, metrics, content);

    const leftHandle = document.createElement('span');
    leftHandle.className = 'existing-handle left-handle';
    const rightHandle = document.createElement('span');
    rightHandle.className = 'existing-handle right-handle';

    box.append(visualCanvas, content, leftHandle, rightHandle);

    box.addEventListener('click', event => {
      if (!editModeActive) return;
      if (box.classList.contains('editing')) {
        event.stopPropagation();
        return;
      }
      beginExistingTextEditing(item, event.clientX, event.clientY);
    });

    box.addEventListener('dblclick', event => {
      // Once the first click has enabled content editing, leave the browser's
      // native double-click word selection intact.
      event.stopPropagation();
    });

    content.addEventListener('mousedown', event => {
      if (box.classList.contains('editing')) event.stopPropagation();
    });

    content.addEventListener('click', event => {
      if (box.classList.contains('editing')) event.stopPropagation();
    });

    content.addEventListener('input', () => {
      item.text = content.textContent.replace(/\r/g, '');
      item.modified = item.text !== item.originalText || Boolean(item.html);
      box.classList.toggle('modified', item.modified);

      const requiredHeight = Math.max(16, item.h * metrics.height, content.scrollHeight);
      box.style.minHeight = `${requiredHeight}px`;
      item.h = Math.min(1 - item.y, requiredHeight / metrics.height);
      renderExistingTextCanvas(visualCanvas, item, metrics, content);
    });

    content.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        content.blur();
      }
    });

    content.addEventListener('blur', () => {
      if (!item.editing || !box.classList.contains('editing')) return;
      commitExistingTextEditing();
    });

    leftHandle.addEventListener('mousedown', event => {
      if (!editModeActive) return;
      item.modified = true;
      box.classList.add('modified');
      startExistingTextResize(event, item, 'left', box, content);
    });
    rightHandle.addEventListener('mousedown', event => {
      if (!editModeActive) return;
      item.modified = true;
      box.classList.add('modified');
      startExistingTextResize(event, item, 'right', box, content);
    });

    layer.appendChild(box);
  });
}


function getPageSignatures(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.signatures[key]) editor.signatures[key] = [];
  return editor.signatures[key];
}

function getSelectedSignature() {
  if (!editor.selectedSignatureId || !editor.pages.length) return null;
  const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;
  return getPageSignatures(sourceIndex).find(item => item.id === editor.selectedSignatureId) || null;
}

function selectSignature(id) {
  editor.selectedSignatureId = id;
  editor.selectedAnnotationId = null;
  editor.selectedExistingTextId = null;
  editor.selectedEditCreatedTextId = null;
  renderAnnotations();
}

function startDragSignature(event, item, element) {
  event.preventDefault();
  event.stopPropagation();

  const metrics = editor.canvasMetrics;
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const startLeft = item.x;
  const startTop = item.y;
  const dragThreshold = 5;
  let dragging = false;
  let historyRecorded = false;

  try {
    element.setPointerCapture(event.pointerId);
  } catch (_) {}

  const move = moveEvent => {
    const pixelDx = moveEvent.clientX - startClientX;
    const pixelDy = moveEvent.clientY - startClientY;

    if (!dragging && Math.hypot(pixelDx, pixelDy) < dragThreshold) {
      return;
    }

    if (!dragging) {
      dragging = true;
      element.classList.add('dragging');

      if (!historyRecorded) {
        recordHistory();
        historyRecorded = true;
      }
    }

    item.x = Math.max(
      0,
      Math.min(1 - item.w, startLeft + pixelDx / metrics.width)
    );
    item.y = Math.max(
      0,
      Math.min(1 - item.h, startTop + pixelDy / metrics.height)
    );

    // Update the existing element directly while dragging. Rebuilding the
    // annotation layer on every pointer move made the handles difficult to use.
    element.style.left = `${item.x * metrics.width}px`;
    element.style.top = `${item.y * metrics.height}px`;
  };

  const up = upEvent => {
    try {
      element.releasePointerCapture(event.pointerId);
    } catch (_) {}

    element.classList.remove('dragging');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);

    // A simple click/tap only selects and anchors the signature in place.
    // The blue handles remain available immediately afterwards.
    if (!dragging) {
      editor.selectedSignatureId = item.id;
      element.classList.add('selected');
    }
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function startResizeSignature(event, item, handleName, element) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();

  const metrics = editor.canvasMetrics;
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {x:item.x, y:item.y, w:item.w, h:item.h};
  const aspect = item.aspect || (item.w / item.h) || 3;
  const minW = .06;
  const minH = .025;

  try {
    element.setPointerCapture(event.pointerId);
  } catch (_) {}

  const move = moveEvent => {
    const dx = (moveEvent.clientX - startX) / metrics.width;
    const dy = (moveEvent.clientY - startY) / metrics.height;

    let x = original.x;
    let y = original.y;
    let w = original.w;
    let h = original.h;

    const corner = ['nw','ne','sw','se'].includes(handleName);

    if (corner) {
      let proposedW = original.w;
      if (handleName.includes('e')) proposedW = original.w + dx;
      if (handleName.includes('w')) proposedW = original.w - dx;

      proposedW = Math.max(minW, proposedW);
      let proposedH = proposedW / aspect;

      if (handleName.includes('w')) x = original.x + (original.w - proposedW);
      if (handleName.includes('n')) y = original.y + (original.h - proposedH);

      w = proposedW;
      h = Math.max(minH, proposedH);
    } else {
      if (handleName === 'e') w = Math.max(minW, original.w + dx);
      if (handleName === 'w') {
        w = Math.max(minW, original.w - dx);
        x = original.x + (original.w - w);
      }
      if (handleName === 's') h = Math.max(minH, original.h + dy);
      if (handleName === 'n') {
        h = Math.max(minH, original.h - dy);
        y = original.y + (original.h - h);
      }
    }

    if (x < 0) {
      w += x;
      x = 0;
    }
    if (y < 0) {
      h += y;
      y = 0;
    }
    if (x + w > 1) w = 1 - x;
    if (y + h > 1) h = 1 - y;

    item.x = x;
    item.y = y;
    item.w = Math.max(minW, w);
    item.h = Math.max(minH, h);

    element.style.left = `${item.x * metrics.width}px`;
    element.style.top = `${item.y * metrics.height}px`;
    element.style.width = `${item.w * metrics.width}px`;
    element.style.height = `${item.h * metrics.height}px`;
  };

  const up = () => {
    try {
      element.releasePointerCapture(event.pointerId);
    } catch (_) {}

    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);

    editor.selectedSignatureId = item.id;
    element.classList.add('selected');
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function renderSignatures(layer, metrics) {
  if (!editor.pages.length) return;
  const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;

  getPageSignatures(sourceIndex).forEach(item => {
    const element = document.createElement('div');
    element.className = `signature-annotation${item.id === editor.selectedSignatureId ? ' selected' : ''}`;
    element.dataset.id = item.id;
    element.style.left = `${item.x * metrics.width}px`;
    element.style.top = `${item.y * metrics.height}px`;
    element.style.width = `${item.w * metrics.width}px`;
    element.style.height = `${item.h * metrics.height}px`;

    const image = document.createElement('img');
    image.src = item.dataUrl;
    image.alt = 'Signature';

    element.appendChild(image);

    ['nw','n','ne','w','e','sw','s','se'].forEach(name => {
      const handle = document.createElement('span');
      handle.className = `signature-resize-handle ${name}`;
      handle.dataset.handle = name;
      handle.addEventListener('pointerdown', event => {
        editor.selectedSignatureId = item.id;
        element.classList.add('selected');
        startResizeSignature(event, item, name, element);
      });
      element.appendChild(handle);
    });

    element.addEventListener('pointerdown', event => {
      if (event.target.closest('.signature-resize-handle')) return;
      // First tap/click selects. Movement beyond a small threshold drags.
      editor.selectedSignatureId = item.id;
      document.querySelectorAll('.signature-annotation').forEach(node => {
        node.classList.toggle('selected', node === element);
      });
      startDragSignature(event, item, element);
    });

    layer.appendChild(element);
  });
}

function placePendingSignatureCentered() {
  if (!editor.pendingSignature || !editor.pages.length) return;

  recordHistory();

  const aspect = editor.pendingSignature.aspect || 3;
  const w = Math.min(.52, Math.max(.34, editor.pendingSignature.defaultWidth || .42));
  const h = Math.max(.055, Math.min(.32, w / aspect));
  const x = Math.max(0, (1 - w) / 2);
  const y = Math.max(0, (1 - h) / 2);

  const item = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type: 'signature',
    dataUrl: editor.pendingSignature.dataUrl,
    source: editor.pendingSignature.source,
    x, y, w, h, aspect
  };

  getPageSignatures(editor.pages[editor.selectedIndex].sourceIndex).push(item);
  editor.selectedSignatureId = item.id;
  editor.pendingSignature = null;
  editor.mode = 'select';
  document.getElementById('sign-tool')?.classList.remove('active');
  document.getElementById('annotation-layer')?.classList.remove('signature-place-mode');
  renderAnnotations();
}


function getPageDrawings(sourceIndex){
  const key=String(sourceIndex);
  if(!editor.drawings[key]) editor.drawings[key]=[];
  return editor.drawings[key];
}
function paintStroke(ctx,stroke,w,h){
  if(!stroke.points||stroke.points.length<2)return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=stroke.colour;ctx.globalAlpha=stroke.tool==='highlighter'?.32:1;
  ctx.lineWidth=Math.max(1,stroke.thickness*w/1000);
  ctx.beginPath();ctx.moveTo(stroke.points[0].x*w,stroke.points[0].y*h);
  for(let i=1;i<stroke.points.length;i++){
    const p=stroke.points[i-1],q=stroke.points[i];
    ctx.quadraticCurveTo(p.x*w,p.y*h,(p.x+q.x)*w/2,(p.y+q.y)*h/2);
  }
  const last=stroke.points.at(-1);ctx.lineTo(last.x*w,last.y*h);ctx.stroke();ctx.restore();
}
function redrawDrawingCanvas(canvas){
  if(!editor.pages.length)return;
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  getPageDrawings(editor.pages[editor.selectedIndex].sourceIndex).forEach(s=>paintStroke(ctx,s,rect.width,rect.height));
  if(editor.activeDrawing)paintStroke(ctx,editor.activeDrawing,rect.width,rect.height);
}
function eraseDrawingAt(x,y){
  const strokes=getPageDrawings(editor.pages[editor.selectedIndex].sourceIndex);
  let hit=-1,best=Infinity;
  strokes.forEach((s,i)=>s.points.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y);if(d<best){best=d;hit=i}}));
  if(hit>=0&&best<=Math.max(.015,editor.drawThickness/650)){strokes.splice(hit,1);return true}
  return false;
}
function attachDrawingCanvas(layer){
  const canvas=document.createElement('canvas');canvas.className='drawing-canvas';layer.appendChild(canvas);
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}};
  canvas.addEventListener('pointerdown',e=>{
    if(editor.mode!=='draw')return;e.preventDefault();e.stopPropagation();canvas.setPointerCapture?.(e.pointerId);
    const p=point(e);
    if(editor.drawTool==='eraser'){recordHistory();eraseDrawingAt(p.x,p.y);redrawDrawingCanvas(canvas);return}
    recordHistory();editor.activeDrawing={id:`draw-${Date.now()}`,tool:editor.drawTool,colour:editor.drawColour,
      thickness:editor.drawTool==='highlighter'?Math.max(14,editor.drawThickness*4):editor.drawThickness,points:[p]};
    redrawDrawingCanvas(canvas);
  });
  canvas.addEventListener('pointermove',e=>{
    if(editor.mode!=='draw')return;const p=point(e);
    if(editor.drawTool==='eraser'&&e.buttons){if(eraseDrawingAt(p.x,p.y))redrawDrawingCanvas(canvas);return}
    if(!editor.activeDrawing)return;editor.activeDrawing.points.push(p);redrawDrawingCanvas(canvas);
  });
  const finish=e=>{
    if(!editor.activeDrawing)return;
    if(editor.activeDrawing.points.length===1)editor.activeDrawing.points.push({...editor.activeDrawing.points[0]});
    getPageDrawings(editor.pages[editor.selectedIndex].sourceIndex).push(editor.activeDrawing);
    editor.activeDrawing=null;redrawDrawingCanvas(canvas);
  };
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  requestAnimationFrame(()=>redrawDrawingCanvas(canvas));
}


function getPageShapes(sourceIndex){const key=String(sourceIndex);if(!editor.shapes[key])editor.shapes[key]=[];return editor.shapes[key]}
function getSelectedShape(){if(!editor.pages.length)return null;return getPageShapes(editor.pages[editor.selectedIndex].sourceIndex).find(s=>s.id===editor.selectedShapeId)||null}
function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}
function shapeBounds(s){return{x:Math.min(s.x1,s.x2),y:Math.min(s.y1,s.y2),w:Math.abs(s.x2-s.x1),h:Math.abs(s.y2-s.y1)}}
function updateShapeToolbar(){const s=getSelectedShape();if(!s)return;document.getElementById('line-stroke-colour').value=s.stroke;document.getElementById('line-fill-colour').value=s.fill;document.getElementById('line-fill-enabled').checked=s.fillEnabled;document.getElementById('line-opacity').value=Math.round(s.opacity*100);document.getElementById('line-opacity-value').textContent=`${Math.round(s.opacity*100)}%`;document.getElementById('line-thickness').value=String(s.thickness)}
function startShapeDrag(e,s,svg){e.preventDefault();e.stopPropagation();const r=svg.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,o={x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2};let moved=false;const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<4)return;if(!moved){recordHistory();moved=true}const dx=(ev.clientX-sx)/r.width,dy=(ev.clientY-sy)/r.height;s.x1=Math.max(0,Math.min(1,o.x1+dx));s.x2=Math.max(0,Math.min(1,o.x2+dx));s.y1=Math.max(0,Math.min(1,o.y1+dy));s.y2=Math.max(0,Math.min(1,o.y2+dy));renderAnnotations()};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)}
function startShapeResize(e,s,handle,svg){e.preventDefault();e.stopPropagation();recordHistory();const r=svg.getBoundingClientRect();const move=ev=>{const x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));if(s.type==='line'||s.type==='arrow'){if(handle==='start'){s.x1=x;s.y1=y}else{s.x2=x;s.y2=y}}else{const b=shapeBounds(s);let left=b.x,right=b.x+b.w,top=b.y,bottom=b.y+b.h;if(handle.includes('w'))left=x;if(handle.includes('e'))right=x;if(handle.includes('n'))top=y;if(handle.includes('s'))bottom=y;s.x1=left;s.x2=right;s.y1=top;s.y2=bottom}renderAnnotations()};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)}
function renderShapes(layer,metrics){if(!editor.pages.length)return;const svg=svgEl('svg',{class:'shape-svg-layer',viewBox:`0 0 ${metrics.width} ${metrics.height}`,preserveAspectRatio:'none'});const defs=svgEl('defs');const marker=svgEl('marker',{id:'pdfmint-arrowhead',markerWidth:'10',markerHeight:'10',refX:'8',refY:'3',orient:'auto',markerUnits:'strokeWidth'});marker.appendChild(svgEl('path',{d:'M0,0 L0,6 L9,3 z',fill:'context-stroke'}));defs.appendChild(marker);svg.appendChild(defs);
 const shapes=getPageShapes(editor.pages[editor.selectedIndex].sourceIndex);if(editor.activeShape)shapes.concat([editor.activeShape]).forEach(s=>renderOne(s));else shapes.forEach(s=>renderOne(s));
 function renderOne(s){const x1=s.x1*metrics.width,y1=s.y1*metrics.height,x2=s.x2*metrics.width,y2=s.y2*metrics.height,b=shapeBounds(s),bx=b.x*metrics.width,by=b.y*metrics.height,bw=b.w*metrics.width,bh=b.h*metrics.height;let shape;if(s.type==='line'||s.type==='arrow'){shape=svgEl('line',{x1,y1,x2,y2})}else if(s.type==='box'){shape=svgEl('rect',{x:bx,y:by,width:bw,height:bh,rx:'1'})}else{shape=svgEl('ellipse',{cx:bx+bw/2,cy:by+bh/2,rx:bw/2,ry:bh/2})}shape.setAttribute('class',`shape-object${s.fillEnabled?' has-fill':''}`);shape.setAttribute('stroke',s.stroke);shape.setAttribute('stroke-width',s.thickness);shape.setAttribute('fill',s.type==='line'||s.type==='arrow'?'none':(s.fillEnabled?s.fill:'transparent'));shape.setAttribute('opacity',s.opacity);shape.setAttribute('vector-effect','non-scaling-stroke');if(s.type==='arrow')shape.setAttribute('marker-end','url(#pdfmint-arrowhead)');svg.appendChild(shape);
 let zone;if(s.type==='line'||s.type==='arrow')zone=svgEl('line',{x1,y1,x2,y2,class:'shape-drag-zone'});else if(s.type==='box')zone=svgEl('rect',{x:bx,y:by,width:bw,height:bh,class:'shape-drag-zone area'});else zone=svgEl('ellipse',{cx:bx+bw/2,cy:by+bh/2,rx:bw/2,ry:bh/2,class:'shape-drag-zone area'});zone.addEventListener('pointerdown',e=>{editor.selectedShapeId=s.id;updateShapeToolbar();startShapeDrag(e,s,svg)});svg.appendChild(zone);
 if(s.id===editor.selectedShapeId&&!editor.activeShape){if(s.type==='line'||s.type==='arrow'){[['start',x1,y1],['end',x2,y2]].forEach(([h,x,y])=>{const c=svgEl('circle',{cx:x,cy:y,r:6,class:'shape-handle'});c.addEventListener('pointerdown',e=>startShapeResize(e,s,h,svg));svg.appendChild(c)})}else{svg.appendChild(svgEl('rect',{x:bx,y:by,width:bw,height:bh,class:'shape-selection'}));[['nw',bx,by],['n',bx+bw/2,by],['ne',bx+bw,by],['w',bx,by+bh/2],['e',bx+bw,by+bh/2],['sw',bx,by+bh],['s',bx+bw/2,by+bh],['se',bx+bw,by+bh]].forEach(([h,x,y])=>{const c=svgEl('circle',{cx:x,cy:y,r:6,class:'shape-handle'});c.addEventListener('pointerdown',e=>startShapeResize(e,s,h,svg));svg.appendChild(c)})}}
 }
 svg.addEventListener('pointerdown',e=>{if(e.target!==svg||editor.mode!=='shape')return;e.preventDefault();const r=svg.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};recordHistory();editor.selectedShapeId=null;editor.activeShape={id:`shape-${Date.now()}`,type:editor.shapeTool,x1:p.x,y1:p.y,x2:p.x,y2:p.y,stroke:editor.shapeStroke,fill:editor.shapeFill,fillEnabled:editor.shapeFillEnabled,opacity:editor.shapeOpacity,thickness:editor.shapeThickness};const move=ev=>{editor.activeShape.x2=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));editor.activeShape.y2=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));renderAnnotations()};const up=()=>{const made=editor.activeShape;editor.activeShape=null;if(Math.hypot(made.x2-made.x1,made.y2-made.y1)>.006){getPageShapes(editor.pages[editor.selectedIndex].sourceIndex).push(made);editor.selectedShapeId=made.id}window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAnnotations()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)});layer.appendChild(svg)}


function getPageLinks(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.links || typeof editor.links !== 'object') editor.links = {};
  if (!editor.links[key]) editor.links[key] = [];
  return editor.links[key];
}
function getSelectedLink() {
  if (!editor.pages.length || !editor.selectedLinkId) return null;
  return getPageLinks(editor.pages[editor.selectedIndex].sourceIndex)
    .find(item => item.id === editor.selectedLinkId) || null;
}
function normaliseWebsiteUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
function positionLinkSettings(item, element) {
  const popover = document.getElementById('link-settings-popover');
  const rect = element.getBoundingClientRect();

  popover.hidden = false;

  requestAnimationFrame(() => {
    const width = popover.offsetWidth || 330;
    const height = popover.offsetHeight || 220;
    const gap = 12;

    let left = rect.left + rect.width / 2 - width / 2;
    let top = rect.bottom + gap;

    left = Math.max(12, Math.min(window.innerWidth - width - 12, left));

    if (top + height > window.innerHeight - 12) {
      top = rect.top - height - gap;
      popover.classList.add('above');
    } else {
      popover.classList.remove('above');
    }

    top = Math.max(12, Math.min(window.innerHeight - height - 12, top));

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  });
}
function updateLinkSettingsRows() {
  const kind = document.querySelector('input[name="link-kind"]:checked')?.value || 'website';
  document.getElementById('link-website-row').hidden = kind !== 'website';
  document.getElementById('link-page-row').hidden = kind !== 'page';
}
function openLinkSettings(item, element) {
  editor.selectedLinkId = item.id;
  const websiteRadio = document.querySelector('input[name="link-kind"][value="website"]');
  const pageRadio = document.querySelector('input[name="link-kind"][value="page"]');
  const websiteInput = document.getElementById('link-website-value');
  const pageInput = document.getElementById('link-page-value');
  websiteRadio.checked = item.kind !== 'page';
  pageRadio.checked = item.kind === 'page';
  websiteInput.value = item.url || '';
  pageInput.value = item.page || 1;
  pageInput.max = editor.pages.length;
  updateLinkSettingsRows();
  positionLinkSettings(item, element);
  setTimeout(() => (item.kind === 'page' ? pageInput : websiteInput).focus(), 0);
}
function closeLinkSettings() {
  document.getElementById('link-settings-popover').hidden = true;
}
function removeLinkById(id) {
  const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;
  editor.links[String(sourceIndex)] = getPageLinks(sourceIndex).filter(item => item.id !== id);
  editor.selectedLinkId = null;
  closeLinkSettings();
  renderAnnotations();
}
function startLinkResize(event, item, handle, element) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const startX = event.clientX, startY = event.clientY;
  const original = {x:item.x,y:item.y,w:item.w,h:item.h};
  const minW=.025,minH=.018;
  const move = moveEvent => {
    const dx=(moveEvent.clientX-startX)/metrics.width;
    const dy=(moveEvent.clientY-startY)/metrics.height;
    let left=original.x,top=original.y,right=original.x+original.w,bottom=original.y+original.h;
    if(handle.includes('w')) left=Math.max(0,Math.min(right-minW,original.x+dx));
    if(handle.includes('e')) right=Math.min(1,Math.max(left+minW,original.x+original.w+dx));
    if(handle.includes('n')) top=Math.max(0,Math.min(bottom-minH,original.y+dy));
    if(handle.includes('s')) bottom=Math.min(1,Math.max(top+minH,original.y+original.h+dy));
    item.x=left;item.y=top;item.w=right-left;item.h=bottom-top;
    element.style.left=`${item.x*metrics.width}px`;
    element.style.top=`${item.y*metrics.height}px`;
    element.style.width=`${item.w*metrics.width}px`;
    element.style.height=`${item.h*metrics.height}px`;
    if(!document.getElementById('link-settings-popover').hidden) positionLinkSettings(item,element);
  };
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up);
}
function renderLinks(layer, metrics) {
  if (!editor.pages.length) return;
  const sourceIndex=editor.pages[editor.selectedIndex].sourceIndex;
  const links=getPageLinks(sourceIndex);
  const all=editor.activeLinkDraft?links.concat([editor.activeLinkDraft]):links;
  all.forEach(item=>{
    const el=document.createElement('div');
    const selected=item.id===editor.selectedLinkId;
    el.className=`pdf-link-region${selected?' selected':''}${item.draft?' draft':''}`;
    el.dataset.linkId=item.id;
    el.style.left=`${item.x*metrics.width}px`;
    el.style.top=`${item.y*metrics.height}px`;
    el.style.width=`${item.w*metrics.width}px`;
    el.style.height=`${item.h*metrics.height}px`;
    if(!item.draft&&item.kind==='website'&&item.url){
      const tip=document.createElement('span');
      tip.className='pdf-link-tooltip';
      tip.textContent=item.url;
      el.appendChild(tip);
    }
    if(selected&&!item.draft){
      ['nw','n','ne','w','e','sw','s','se'].forEach(name=>{
        const h=document.createElement('i');
        h.className=`pdf-link-handle ${name}`;
        h.addEventListener('pointerdown',event=>startLinkResize(event,item,name,el));
        el.appendChild(h);
      });
    }
    el.addEventListener('click',event=>{
      if(item.draft||event.target.closest('.pdf-link-handle'))return;
      event.preventDefault();
      event.stopPropagation();

      if(!item.saved){
        editor.selectedLinkId=item.id;
        renderAnnotations();
        const fresh=document.querySelector(`[data-link-id="${item.id}"]`);
        if(fresh)openLinkSettings(item,fresh);
        return;
      }

      if(item.kind==='website'&&item.url){
        window.open(item.url,'_blank','noopener,noreferrer');
      }else if(item.kind==='page'){
        editor.selectedIndex=Math.max(0,Math.min(editor.pages.length-1,Number(item.page)-1));
        editor.selectedLinkId=null;
        closeLinkSettings();
        renderThumbnails().then(()=>renderSelectedPage());
      }
    });
    layer.appendChild(el);
  });
}
function beginLinkDraw(event) {
  if (editor.mode !== 'link' || !editor.canvasMetrics) return;
  if (event.button !== undefined && event.button !== 0) return;

  const layer = document.getElementById('annotation-layer');
  if (!layer || !layer.contains(event.target)) return;
  if (event.target.closest?.('.pdf-link-region, .pdf-link-handle, .link-settings-popover')) return;

  event.preventDefault();
  event.stopPropagation();
  closeLinkSettings();

  const rect = layer.getBoundingClientRect();
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const sx = Math.max(0, Math.min(1, (startClientX - rect.left) / rect.width));
  const sy = Math.max(0, Math.min(1, (startClientY - rect.top) / rect.height));

  editor.selectedLinkId = null;

  const draft = document.createElement('div');
  draft.className = 'pdf-link-region draft';
  draft.style.left = `${sx * rect.width}px`;
  draft.style.top = `${sy * rect.height}px`;
  draft.style.width = '0px';
  draft.style.height = '0px';
  layer.appendChild(draft);

  let current = {x:sx, y:sy, w:0, h:0};

  try { layer.setPointerCapture(event.pointerId); } catch (_) {}

  const move = moveEvent => {
    moveEvent.preventDefault();

    const x = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (moveEvent.clientY - rect.top) / rect.height));

    current = {
      x: Math.min(sx, x),
      y: Math.min(sy, y),
      w: Math.abs(x - sx),
      h: Math.abs(y - sy)
    };

    draft.style.left = `${current.x * rect.width}px`;
    draft.style.top = `${current.y * rect.height}px`;
    draft.style.width = `${current.w * rect.width}px`;
    draft.style.height = `${current.h * rect.height}px`;
  };

  const finish = () => {
    try { layer.releasePointerCapture(event.pointerId); } catch (_) {}
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', finish, true);
    window.removeEventListener('pointercancel', cancel, true);
    draft.remove();

    if (current.w < .012 || current.h < .01) {
      renderAnnotations();
      return;
    }

    const item = {
      id:`link-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      draft:false,
      kind:'website',
      url:'',
      page:1,
      saved:false,
      x:current.x,
      y:current.y,
      w:current.w,
      h:current.h
    };

    recordHistory();
    getPageLinks(editor.pages[editor.selectedIndex].sourceIndex).push(item);
    editor.selectedLinkId = item.id;
    renderAnnotations();

    const element = document.querySelector(`[data-link-id="${item.id}"]`);
    if (element) openLinkSettings(item, element);
  };

  const cancel = () => {
    try { layer.releasePointerCapture(event.pointerId); } catch (_) {}
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', finish, true);
    window.removeEventListener('pointercancel', cancel, true);
    draft.remove();
  };

  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', finish, true);
  window.addEventListener('pointercancel', cancel, true);
}


function getPageNotes(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.notes[key]) editor.notes[key] = [];
  return editor.notes[key];
}
function renderNotes(layer, metrics) {
  const page = editor.pages[editor.selectedIndex];
  if (!page) return;
  getPageNotes(page.sourceIndex).forEach(note => {
    const wrap = document.createElement('div');
    wrap.className = 'pdf-note' + (note.id === editor.selectedNoteId ? ' open' : '');
    wrap.dataset.noteId = note.id;
    wrap.style.left = `${note.x * metrics.width}px`;
    wrap.style.top = `${note.y * metrics.height}px`;

    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pdf-note-pin';
    pin.title = note.text ? note.text.slice(0,180) : 'Note';
    pin.setAttribute('aria-label','Open note');
    pin.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="pin-head" d="M8 3h8l-1 7 3 3v2H6v-2l3-3z"></path><path class="pin-stem" d="M12 15v7"></path></svg>';

    const card = document.createElement('section');
    card.className = 'pdf-note-card';
    card.innerHTML = '<header><strong>Note</strong><button type="button" class="pdf-note-close" aria-label="Close note">×</button></header><textarea aria-label="Note text" placeholder="Write your note here..."></textarea>';
    const textarea = card.querySelector('textarea');
    textarea.value = note.text || '';
    let historyRecorded = false;
    textarea.addEventListener('focus', () => {
      if (!historyRecorded) { recordHistory(); historyRecorded = true; }
    });
    textarea.addEventListener('input', () => {
      note.text = textarea.value;
      pin.title = note.text ? note.text.slice(0,180) : 'Note';
    });
    textarea.addEventListener('pointerdown', e => e.stopPropagation());
    textarea.addEventListener('click', e => e.stopPropagation());

    let pinDrag = null;
    let suppressPinClick = false;

    pin.addEventListener('pointerdown', e => {
      if (editor.selectedNoteId === note.id) return;
      e.preventDefault();
      e.stopPropagation();

      const layerRect = layer.getBoundingClientRect();
      pin.setPointerCapture?.(e.pointerId);
      pinDrag = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: note.x,
        startY: note.y,
        layerRect,
        moved: false,
        historyRecorded: false
      };
      wrap.classList.remove('hover-open');
      wrap.classList.add('dragging');
    });

    pin.addEventListener('pointermove', e => {
      if (!pinDrag || pinDrag.pointerId !== e.pointerId) return;

      const dx = e.clientX - pinDrag.startClientX;
      const dy = e.clientY - pinDrag.startClientY;

      if (!pinDrag.moved && Math.hypot(dx, dy) >= 4) {
        pinDrag.moved = true;
        suppressPinClick = true;
        if (!pinDrag.historyRecorded) {
          recordHistory();
          pinDrag.historyRecorded = true;
        }
      }
      if (!pinDrag.moved) return;

      note.x = Math.max(0, Math.min(.97, pinDrag.startX + dx / pinDrag.layerRect.width));
      note.y = Math.max(0, Math.min(.97, pinDrag.startY + dy / pinDrag.layerRect.height));
      wrap.style.left = `${note.x * metrics.width}px`;
      wrap.style.top = `${note.y * metrics.height}px`;
    });

    const finishPinDrag = e => {
      if (!pinDrag || pinDrag.pointerId !== e.pointerId) return;
      pin.releasePointerCapture?.(e.pointerId);
      const wasMoved = pinDrag.moved;
      pinDrag = null;
      wrap.classList.remove('dragging');
      if (wasMoved) {
        setTimeout(() => { suppressPinClick = false; }, 0);
      }
    };

    pin.addEventListener('pointerup', finishPinDrag);
    pin.addEventListener('pointercancel', finishPinDrag);

    pin.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (suppressPinClick) return;

      editor.selectedNoteId = note.id;
      renderAnnotations();
      requestAnimationFrame(() => {
        const fresh = document.querySelector(`[data-note-id="${note.id}"] textarea`);
        if (fresh) { fresh.focus(); fresh.setSelectionRange(fresh.value.length,fresh.value.length); }
      });
    });

    pin.addEventListener('mouseenter', () => {
      if (!editor.selectedNoteId && !pinDrag) wrap.classList.add('hover-open');
    });
    wrap.addEventListener('mouseleave', () => {
      if (editor.selectedNoteId !== note.id) wrap.classList.remove('hover-open');
    });
    card.querySelector('.pdf-note-close').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      editor.selectedNoteId = null;
      renderAnnotations();
    });
    card.addEventListener('pointerdown', e => e.stopPropagation());
    card.addEventListener('click', e => e.stopPropagation());

    wrap.append(pin,card);
    layer.appendChild(wrap);
  });
}
function placeNoteAt(event) {
  if (editor.mode !== 'note' || !editor.pages.length || event.target.closest('.pdf-note')) return;
  if (editor.selectedNoteId) {
    editor.selectedNoteId = null;
    renderAnnotations();
    return;
  }
  const layer = document.getElementById('annotation-layer');
  const rect = layer.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  event.preventDefault(); event.stopPropagation();
  recordHistory();
  const note = {
    id:`note-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    x:Math.max(0,Math.min(.97,(event.clientX-rect.left)/rect.width)),
    y:Math.max(0,Math.min(.97,(event.clientY-rect.top)/rect.height)),
    text:''
  };
  getPageNotes(editor.pages[editor.selectedIndex].sourceIndex).push(note);
  editor.selectedNoteId = note.id;
  renderAnnotations();
  requestAnimationFrame(() => document.querySelector(`[data-note-id="${note.id}"] textarea`)?.focus());
}

function renderAnnotations() {
  const layer = document.getElementById('annotation-layer');
  layer.innerHTML = '';
  if (!editor.pages.length || !editor.canvasMetrics) return;
  const pageState = editor.pages[editor.selectedIndex];
  const items = getPageAnnotations(pageState.sourceIndex);
  const metrics = editor.canvasMetrics;

  if (editor.watermark?.applied && editor.watermark.text && editor.watermark.size > 0 && editor.watermark.opacity > 0) {
    const watermark = document.createElement('div');
    watermark.className = 'watermark-preview';
    watermark.textContent = editor.watermark.text;
    watermark.style.color = editor.watermark.colour;
    watermark.style.opacity = String(editor.watermark.opacity / 100);
    const measured = Math.max(1, editor.watermark.text.length * .61);
    watermark.style.fontSize = `${metrics.width * (editor.watermark.size / 100) / measured}px`;
    const alignment = editor.watermark.align || 'center';
    const horizontal = alignment === 'left' ? 5 : alignment === 'right' ? 95 : 50;
    const translateX = alignment === 'left' ? 0 : alignment === 'right' ? -100 : -50;
    watermark.style.left = `${horizontal}%`;
    watermark.style.top = `${5 + Math.max(0, Math.min(100, editor.watermark.vertical ?? 50)) * .9}%`;
    watermark.style.transform = `translate(${translateX}%,-50%) rotate(${editor.watermark.angle}deg)`;
    layer.appendChild(watermark);
  }

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'text-annotation' + (item.id === editor.selectedAnnotationId ? ' selected' : '');
    el.dataset.id = item.id;
    el.contentEditable = item.editing ? 'true' : 'false';
    el.spellcheck = false;
    el.textContent = item.text;
    el.style.left = `${item.x * metrics.width}px`;
    el.style.top = `${item.y * metrics.height}px`;
    el.style.width = `${item.w * metrics.width}px`;
    el.style.minHeight = `${item.h * metrics.height}px`;
    const fontFamilies = {
      Helvetica: 'Helvetica, Arial, sans-serif',
      Arial: 'Arial, sans-serif',
      Verdana: 'Verdana, sans-serif',
      Tahoma: 'Tahoma, sans-serif',
      Trebuchet: '"Trebuchet MS", sans-serif',
      TimesRoman: '"Times New Roman", Times, serif',
      Georgia: 'Georgia, serif',
      Garamond: 'Garamond, Georgia, serif',
      Courier: '"Courier New", monospace',
      LucidaConsole: '"Lucida Console", monospace',
      Impact: 'Impact, sans-serif',
      ComicSans: '"Comic Sans MS", cursive'
    };
    el.style.fontFamily = fontFamilies[item.font] || 'Helvetica, Arial, sans-serif';
    el.style.backgroundColor = item.fillColor || 'transparent';
    el.style.fontSize = `${item.size * metrics.scale}px`;
    el.style.fontWeight = item.bold ? '700' : '400';
    el.style.fontStyle = item.italic ? 'italic' : 'normal';
    el.style.textAlign = item.align;
    el.style.color = item.color;
    el.style.opacity = item.opacity;
    el.style.lineHeight = '1.15';
    el.style.transform = `rotate(${Number(item.rotation || 0)}deg)`;

    const resizeHandles = ['nw','ne','sw','se'].map(direction => {
      const handle = document.createElement('span');
      handle.className = `resize-handle resize-${direction}`;
      handle.dataset.resize = direction;
      handle.contentEditable = 'false';
      return handle;
    });
    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'rotate-handle';
    rotateHandle.contentEditable = 'false';
    el.append(...resizeHandles, rotateHandle);

    el.addEventListener('mousedown', event => {
      if (event.target.closest('.resize-handle,.rotate-handle')) return;
      event.stopPropagation();
      editor.selectedAnnotationId = item.id;
      editor.mode = 'select';
      document.getElementById('add-text-tool')?.classList.remove('active');
      document.getElementById('annotation-layer')?.classList.remove('text-mode');
      document.getElementById('annotation-layer')?.classList.add('select-mode');
      document.getElementById('text-options-bar').hidden = false;
      document.querySelectorAll('.text-annotation').forEach(node => node.classList.toggle('selected', node === el));
      syncTextInspector();
      if (event.detail > 1) return;
      if (el.isContentEditable && document.activeElement === el) return;
      startDragAnnotation(event, item, el);
    });
    el.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      item.editing = true;
      el.contentEditable = 'true';
      requestAnimationFrame(() => {
        el.focus({preventScroll:true});
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
    });
    el.addEventListener('focus', () => { if (!el.dataset.historyRecorded) { recordHistory(); el.dataset.historyRecorded = '1'; } });
    el.addEventListener('input', () => {
      item.text = Array.from(el.childNodes).filter(node => !node.classList?.contains('resize-handle') && !node.classList?.contains('rotate-handle')).map(node => node.textContent).join('');
    });
    el.addEventListener('blur', () => {
      delete el.dataset.historyRecorded;
      item.text = el.innerText.replace(/\n+$/,'');
      item.editing = false;
      el.contentEditable = 'false';
    });
    resizeHandles.forEach(handle => handle.addEventListener('mousedown', event => {
      event.stopPropagation();
      selectAnnotation(item.id);
      startResizeAnnotation(event, item, handle.dataset.resize);
    }));
    rotateHandle.addEventListener('mousedown', event => {
      selectAnnotation(item.id);
      startRotateAnnotation(event, item);
    });
    layer.appendChild(el);
  });
  renderSavedTextHighlights(layer, metrics);
  renderExistingTextBoxes(layer, metrics);
  renderEditCreatedTextBoxes(layer, metrics);
  renderSignatures(layer, metrics);
  renderLinks(layer, metrics);
  renderShapes(layer, metrics);
  renderNotes(layer, metrics);
  attachDrawingCanvas(layer);
  renderTextHighlightInteraction(layer, metrics);
  renderCropSelection(layer, metrics);
  syncTextInspector();
  syncEditTextToolbar();
}

function getCurrentAppliedCrop() {
  if (!editor.pages.length) return null;
  return editor.crops[String(editor.pages[editor.selectedIndex].sourceIndex)] || null;
}
function syncCropDimensions(rect) {
  const values = {
    'crop-left-value': rect ? `${Math.round(rect.x * 100)}%` : '—',
    'crop-top-value': rect ? `${Math.round(rect.y * 100)}%` : '—',
    'crop-width-value': rect ? `${Math.round(rect.w * 100)}%` : '—',
    'crop-height-value': rect ? `${Math.round(rect.h * 100)}%` : '—'
  };
  Object.entries(values).forEach(([id,value]) => { const output=document.getElementById(id); if(output) output.textContent=value; });
  const apply = document.getElementById('crop-apply');
  if (apply) apply.disabled = !editor.cropDraft;
}
function renderCropSelection(layer, metrics) {
  if (editor.mode !== 'crop') return;
  if (metrics.appliedCrop && !editor.cropDraft) {
    syncCropDimensions(metrics.appliedCrop);
    return;
  }
  const rect = editor.cropDraft || getCurrentAppliedCrop();
  syncCropDimensions(rect);
  if (!rect) return;
  const x=rect.x*metrics.width,y=rect.y*metrics.height,w=rect.w*metrics.width,h=rect.h*metrics.height;
  const shades = [
    {left:0,top:0,width:metrics.width,height:y},
    {left:0,top:y,width:x,height:h},
    {left:x+w,top:y,width:Math.max(0,metrics.width-x-w),height:h},
    {left:0,top:y+h,width:metrics.width,height:Math.max(0,metrics.height-y-h)}
  ];
  shades.forEach(bounds => { const shade=document.createElement('div'); shade.className='crop-shade'; Object.assign(shade.style,{left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`}); layer.appendChild(shade); });
  const selection=document.createElement('div');
  selection.className=`crop-selection${editor.cropDraft ? '' : ' applied'}`;
  Object.assign(selection.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
  layer.appendChild(selection);
}
function selectAnnotation(id) {
  editor.selectedAnnotationId = id;
  const textOptionsBar = document.getElementById('text-options-bar');
  if (textOptionsBar) textOptionsBar.hidden = !id;
  renderAnnotations();
}
function deselectAnnotation() {
  editor.selectedAnnotationId = null;
  const textOptionsBar = document.getElementById('text-options-bar');
  if (textOptionsBar && editor.mode !== 'text') textOptionsBar.hidden = true;
  renderAnnotations();
}
function startDragAnnotation(event, item) {
  event.preventDefault();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const startX = event.clientX, startY = event.clientY;
  const startLeft = item.x, startTop = item.y;
  const move = e => {
    item.x = Math.max(0, Math.min(1 - item.w, startLeft + (e.clientX - startX)/metrics.width));
    item.y = Math.max(0, Math.min(1 - item.h, startTop + (e.clientY - startY)/metrics.height));
    renderAnnotations();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
function startResizeAnnotation(event, item, direction = 'se') {
  event.preventDefault();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const startX = event.clientX, startY = event.clientY;
  const startLeft = item.x, startTop = item.y;
  const startW = item.w, startH = item.h;
  const move = e => {
    const dx = (e.clientX-startX)/metrics.width;
    const dy = (e.clientY-startY)/metrics.height;
    if (direction.includes('e')) item.w = Math.max(.06, Math.min(1-item.x, startW + dx));
    if (direction.includes('s')) item.h = Math.max(.035, Math.min(1-item.y, startH + dy));
    if (direction.includes('w')) {
      const nextX = Math.max(0, Math.min(startLeft + startW - .06, startLeft + dx));
      item.x = nextX;
      item.w = startW + startLeft - nextX;
    }
    if (direction.includes('n')) {
      const nextY = Math.max(0, Math.min(startTop + startH - .035, startTop + dy));
      item.y = nextY;
      item.h = startH + startTop - nextY;
    }
    renderAnnotations();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
function startRotateAnnotation(event, item) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const layerRect = document.getElementById('annotation-layer').getBoundingClientRect();
  const centreX = layerRect.left + (item.x + item.w / 2) * metrics.width;
  const centreY = layerRect.top + (item.y + item.h / 2) * metrics.height;
  const move = e => {
    item.rotation = Math.atan2(e.clientY - centreY, e.clientX - centreX) * 180 / Math.PI - 90;
    renderAnnotations();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
function addTextAt(clientX, clientY) {
  recordHistory();
  const layer = document.getElementById('annotation-layer');
  const rect = layer.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = Math.max(0, Math.min(.82, (clientX - rect.left)/rect.width));
  const y = Math.max(0, Math.min(.93, (clientY - rect.top)/rect.height));
  const item = {
    id: `txt-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type: 'text',
    text: 'Type here',
    x, y, w: .18, h: .045,
    size: 18,
    font: 'Helvetica',
    color: '#111827',
    fillColor: 'transparent',
    opacity: 1,
    bold: false,
    italic: false,
    align: 'left',
    rotation: 0,
    editing: true
  };
  getPageAnnotations(editor.pages[editor.selectedIndex].sourceIndex).push(item);
  editor.selectedAnnotationId = item.id;
  setEditorMode('text');
  renderAnnotations();
  setTimeout(() => {
    const el = document.querySelector(`.text-annotation[data-id="${item.id}"]`);
    if (el) {
      el.contentEditable = 'true';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, 0);
}
function syncTextInspector() {
  const item = getSelectedAnnotation();
  if (!item) return;

  const font = document.getElementById('text-font');
  const size = document.getElementById('text-size');
  const colour = document.getElementById('text-color');
  const fill = document.getElementById('text-fill-color');
  const opacity = document.getElementById('text-opacity');
  const opacityValue = document.getElementById('text-opacity-value');
  const fillSwatch = document.getElementById('fill-swatch');

  if (font) font.value = item.font || 'Helvetica';
  if (size) size.value = item.size || 18;
  if (colour) colour.value = item.color || '#111827';
  const colourCircle = document.getElementById('font-colour-circle');
  if (colourCircle) colourCircle.style.background = item.color || '#111827';
  document.querySelectorAll('[data-font-colour]').forEach(button => {
    button.classList.toggle('selected', button.dataset.fontColour.toLowerCase() === (item.color || '#111827').toLowerCase());
  });

  const fillValue = item.fillColor && item.fillColor !== 'transparent' ? item.fillColor : '#ffffff';
  if (fill) fill.value = fillValue;
  if (fillSwatch) fillSwatch.style.background = item.fillColor || 'transparent';

  const opacityPercent = Math.round((item.opacity ?? 1) * 100);
  if (opacity) opacity.value = opacityPercent;
  if (opacityValue) opacityValue.textContent = `${opacityPercent}%`;

  ['left', 'center', 'right'].forEach(alignment => {
    const button = document.getElementById(`text-align-${alignment}`);
    if (button) button.classList.toggle('active', item.align === alignment);
  });
}

function updateSelectedText(mutator) {
  const item = getSelectedAnnotation();
  if (!item) return;
  mutator(item);
  renderAnnotations();
}

function updateEditorUi() {
  const count = editor.pages.length;

  const previewPages = document.getElementById('preview-pages');
  const pageTotal = document.getElementById('page-total-label');
  const pageInput = document.getElementById('current-page-input');
  const zoomReset = document.getElementById('zoom-reset');

  if (previewPages) previewPages.textContent = count || '—';
  if (pageTotal) pageTotal.textContent = count || '—';

  if (pageInput) {
    pageInput.max = Math.max(1, count);
    pageInput.value = count ? editor.selectedIndex + 1 : 1;
  }

  if (zoomReset) zoomReset.textContent = `${Math.round(editor.zoom * 100)}%`;

  const noPages = count === 0;
  const disableWhenEmpty = [
    'page-prev', 'page-next', 'rotate-page', 'delete-page',
    'download-edited-pdf', 'zoom-in', 'zoom-out', 'zoom-reset'
  ];

  disableWhenEmpty.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.disabled = noPages;
  });

  const previous = document.getElementById('page-prev');
  const next = document.getElementById('page-next');
  const deletePage = document.getElementById('delete-page');

  if (previous) previous.disabled = noPages || editor.selectedIndex === 0;
  if (next) next.disabled = noPages || editor.selectedIndex === count - 1;
  if (deletePage) deletePage.disabled = count <= 1;
}

async function renderSelectedPage() {
  const canvas = document.getElementById('pdf-preview-canvas');
  const placeholder = document.getElementById('preview-placeholder');
  if (!editor.pages.length || !editor.pdfjs) {
    canvas.hidden = true;
    placeholder.hidden = false;
    return;
  }
  const token = ++editor.renderToken;
  const pageState = editor.pages[editor.selectedIndex];
  const page = await editor.pdfjs.getPage(pageState.sourceIndex + 1);
  const baseViewport = page.getViewport({scale: 1, rotation: pageState.rotation});
  const stage = document.getElementById('document-stage');
  const fitWidth = Math.max(320, Math.min(860, stage.clientWidth - 80));
  const baseScale = fitWidth / baseViewport.width;
  const viewport = page.getViewport({scale: baseScale * editor.zoom, rotation: pageState.rotation});
  if (token !== editor.renderToken) return;
  const appliedCrop = editor.crops[String(pageState.sourceIndex)] || null;
  if (appliedCrop) {
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = Math.floor(viewport.width);
    fullCanvas.height = Math.floor(viewport.height);
    await page.render({canvasContext: fullCanvas.getContext('2d'), viewport}).promise;
    if (token !== editor.renderToken) return;
    const sourceX = Math.round(appliedCrop.x * fullCanvas.width);
    const sourceY = Math.round(appliedCrop.y * fullCanvas.height);
    const sourceWidth = Math.max(1, Math.round(appliedCrop.w * fullCanvas.width));
    const sourceHeight = Math.max(1, Math.round(appliedCrop.h * fullCanvas.height));
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    canvas.getContext('2d').drawImage(fullCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  } else {
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
  }
  canvas.hidden = false;
  placeholder.hidden = true;
  const layer = document.getElementById('annotation-layer');
  layer.style.width = `${canvas.width}px`;
  layer.style.height = `${canvas.height}px`;
  editor.canvasMetrics = {
    width: canvas.width,
    height: canvas.height,
    scale: viewport.scale,
    rotation: pageState.rotation,
    originalWidth: baseViewport.width,
    originalHeight: baseViewport.height,
    appliedCrop
  };
  if (editor.mode === 'edit-existing') {
    await ensureExistingTextForCurrentPage();
  }
  renderAnnotations();
  updateEditorUi();
}

async function renderThumbnails() {
  const list = document.getElementById('thumbnail-list');
  list.innerHTML = '';
  if (!editor.pages.length) {
    list.innerHTML = '<div class="editor-empty">No pages</div>';
    return;
  }
  for (let index = 0; index < editor.pages.length; index++) {
    const state = editor.pages[index];
    const item = document.createElement('div');
    item.className = `thumbnail-item${index === editor.selectedIndex ? ' active' : ''}`;
    item.draggable = true;
    item.dataset.index = index;
    item.innerHTML = `<canvas></canvas><div class="thumbnail-meta"><span>Page ${index + 1}</span><span class="thumbnail-rotation">${state.rotation ? state.rotation + '°' : ''}</span></div>`;
    list.appendChild(item);

    item.addEventListener('click', async () => {
      editor.selectedIndex = Number(item.dataset.index);
      refreshThumbnailStates();
      updateEditorUi();
      await renderSelectedPage();
    });
    item.addEventListener('dragstart', event => {
      item.classList.add('dragging');
      event.dataTransfer.setData('text/plain', item.dataset.index);
      event.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.thumbnail-item').forEach(el => el.classList.remove('drag-target'));
    });
    item.addEventListener('dragover', event => {
      event.preventDefault();
      item.classList.add('drag-target');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-target'));
    item.addEventListener('drop', async event => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData('text/plain'));
      const to = Number(item.dataset.index);
      item.classList.remove('drag-target');
      if (Number.isInteger(from) && from !== to) {
        recordHistory();
        const [moved] = editor.pages.splice(from, 1);
        editor.pages.splice(to, 0, moved);
        editor.selectedIndex = to;
        await renderThumbnails();
        updateEditorUi();
        await renderSelectedPage();
      }
    });

    try {
      const page = await editor.pdfjs.getPage(state.sourceIndex + 1);
      const base = page.getViewport({scale: 1, rotation: state.rotation});
      const viewport = page.getViewport({scale: 132 / base.width, rotation: state.rotation});
      const thumbCanvas = item.querySelector('canvas');
      const crop = editor.crops[String(state.sourceIndex)];
      if (crop) {
        const fullCanvas=document.createElement('canvas');
        fullCanvas.width=Math.floor(viewport.width); fullCanvas.height=Math.floor(viewport.height);
        await page.render({canvasContext:fullCanvas.getContext('2d'),viewport}).promise;
        const sx=Math.round(crop.x*fullCanvas.width),sy=Math.round(crop.y*fullCanvas.height);
        const sw=Math.max(1,Math.round(crop.w*fullCanvas.width)),sh=Math.max(1,Math.round(crop.h*fullCanvas.height));
        thumbCanvas.width=sw; thumbCanvas.height=sh;
        thumbCanvas.getContext('2d').drawImage(fullCanvas,sx,sy,sw,sh,0,0,sw,sh);
      } else {
        thumbCanvas.width = Math.floor(viewport.width);
        thumbCanvas.height = Math.floor(viewport.height);
        await page.render({canvasContext: thumbCanvas.getContext('2d'), viewport}).promise;
      }
    } catch (_) {}
  }
}

function refreshThumbnailStates() {
  document.querySelectorAll('.thumbnail-item').forEach((item, index) => {
    item.classList.toggle('active', index === editor.selectedIndex);
  });
}
async function selectRelative(delta) {
  const next = editor.selectedIndex + delta;
  if (next < 0 || next >= editor.pages.length) return;
  editor.selectedIndex = next;
  editor.selectedAnnotationId = null;
  editor.selectedExistingTextId = null;
  refreshThumbnailStates();
  updateEditorUi();
  await renderSelectedPage();
}
async function rotateSelected() {
  if (!editor.pages.length) return;
  recordHistory();
  editor.pages[editor.selectedIndex].rotation =
    (editor.pages[editor.selectedIndex].rotation + 90) % 360;
  await renderThumbnails();
  updateEditorUi();
  await renderSelectedPage();
}
async function deleteSelected() {
  if (editor.pages.length <= 1) return showAlert('A PDF must contain at least one page.');
  recordHistory();
  editor.pages.splice(editor.selectedIndex, 1);
  editor.selectedIndex = Math.min(editor.selectedIndex, editor.pages.length - 1);
  await renderThumbnails();
  updateEditorUi();
  await renderSelectedPage();
}
async function moveSelected(delta) {
  const from = editor.selectedIndex;
  const to = from + delta;
  if (to < 0 || to >= editor.pages.length) return;
  recordHistory();
  [editor.pages[from], editor.pages[to]] = [editor.pages[to], editor.pages[from]];
  editor.selectedIndex = to;
  await renderThumbnails();
  updateEditorUi();
  await renderSelectedPage();
}
async function changeZoom(delta) {
  editor.zoom = Math.min(2.5, Math.max(.4, editor.zoom + delta));
  updateEditorUi();
  await renderSelectedPage();
}

document.getElementById('page-prev').addEventListener('click', () => selectRelative(-1));
document.getElementById('page-next').addEventListener('click', () => selectRelative(1));
document.getElementById('current-page-input').addEventListener('change', async event => {
  const page = Math.max(1, Math.min(editor.pages.length, Number(event.target.value) || 1));
  editor.selectedIndex = page - 1;
  editor.selectedAnnotationId = null;
  editor.selectedExistingTextId = null;
  refreshThumbnailStates(); updateEditorUi(); await renderSelectedPage();
});
document.getElementById('zoom-out').addEventListener('click', () => changeZoom(-.15));
document.getElementById('zoom-in').addEventListener('click', () => changeZoom(.15));
document.getElementById('zoom-reset').addEventListener('click', async () => {
  editor.zoom = 1; updateEditorUi(); await renderSelectedPage();
});
const rotateButton = document.getElementById('rotate-page');
const deletePageButton = document.getElementById('delete-page');
if (rotateButton) rotateButton.addEventListener('click', rotateSelected);
if (deletePageButton) deletePageButton.addEventListener('click', deleteSelected);


const undoTool = document.getElementById('undo-tool');
const redoTool = document.getElementById('redo-tool');
if (undoTool) undoTool.addEventListener('click', undoEditor);
if (redoTool) redoTool.addEventListener('click', redoEditor);
document.addEventListener('keydown', event => {
  if (workspace.hidden) return;
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redoEditor(); else undoEditor();
  } else if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault(); redoEditor();
  } else if ((event.key === 'Delete' || event.key === 'Backspace') &&
             editor.selectedSignatureId &&
             !event.target.matches('input,textarea,[contenteditable="true"]')) {
    event.preventDefault();
    recordHistory();
    const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;
    editor.signatures[String(sourceIndex)] =
      getPageSignatures(sourceIndex).filter(item => item.id !== editor.selectedSignatureId);
    editor.selectedSignatureId = null;
    renderAnnotations();
  }
});
document.getElementById('add-text-tool').addEventListener('click', () => setEditorMode('text'));
document.getElementById('note-tool')?.addEventListener('click', () => {
  editor.selectedNoteId = null;
  setEditorMode('note');
  renderAnnotations();
  showEditorHint('Click anywhere on the PDF to place a note.');
});

document.getElementById('edit-text-tool').addEventListener('click', () => setEditorMode('edit-existing'));

function ensureWatermarkUi() {
  if (!document.getElementById('watermark-tool')) {
    const editTool = document.getElementById('edit-text-tool');
    if (editTool) {
      const tool = document.createElement('button');
      tool.className = 'ribbon-tool'; tool.id = 'watermark-tool'; tool.type = 'button';
      tool.innerHTML = '<span class="tool-icon watermark-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19 9.2 5h2.2l3.1 8.5L17.7 5H20l-5.1 14h-2.2L10 11.5 7.2 19z"/><path d="M3 21h18"/></svg></span><span class="tool-label">Watermark</span>';
      editTool.after(tool);
    }
  }
  if (!document.getElementById('watermark-options-bar')) {
    const drawBar = document.getElementById('draw-options-bar');
    if (drawBar) {
      const bar = document.createElement('div');
      bar.className = 'watermark-options-bar'; bar.id = 'watermark-options-bar'; bar.hidden = true; bar.setAttribute('aria-label','Watermark options');
      bar.innerHTML = `<label class="watermark-control watermark-text-control"><span>Text</span><input id="watermark-text" type="text" value="HELLO WORLD!" maxlength="160"></label><label class="watermark-control watermark-range-control"><span>Size</span><input id="watermark-size" type="range" min="0" max="100" value="100"><output id="watermark-size-value">100%</output></label><label class="watermark-control watermark-range-control"><span>Opacity</span><input id="watermark-opacity" type="range" min="0" max="100" value="50"><output id="watermark-opacity-value">50%</output></label><div class="watermark-colour-control"><span>Colour</span><div class="watermark-swatches" role="group" aria-label="Watermark colour">${[['#ef4444','Red'],['#f97316','Orange'],['#eab308','Yellow'],['#22c55e','Green'],['#3b82f6','Blue'],['#ec4899','Pink'],['#111827','Black']].map(([colour,label]) => `<button type="button" class="watermark-swatch${label === 'Red' ? ' active' : ''}" data-watermark-colour="${colour}" style="--watermark-colour:${colour}" aria-label="${label}"></button>`).join('')}</div></div><label class="watermark-control watermark-custom-control"><span>Custom RGB</span><input id="watermark-custom-colour" type="color" value="#ef4444" aria-label="Custom watermark colour"></label><div class="watermark-control watermark-align-control"><span>Align</span><div class="watermark-align-buttons" role="group" aria-label="Horizontal position"><button type="button" data-watermark-align="left" title="Align left">≡</button><button type="button" class="active" data-watermark-align="center" title="Align centre">≡</button><button type="button" data-watermark-align="right" title="Align right">≡</button></div></div><label class="watermark-control watermark-vertical-control"><span>Height</span><input id="watermark-vertical" type="range" min="0" max="100" value="50" aria-label="Vertical position"><div class="watermark-height-labels"><small>Top</small><small>Bottom</small></div></label><div class="watermark-control watermark-angle-control"><span>Angle</span><div class="watermark-angle-dial" id="watermark-angle-dial" role="slider" tabindex="0" aria-label="Watermark angle" aria-valuemin="-180" aria-valuemax="180" aria-valuenow="-45"><i id="watermark-angle-knob"></i></div><output id="watermark-angle-value">-45°</output></div><button class="watermark-done" id="watermark-done" type="button">Done</button>`;
      drawBar.before(bar);
    }
  }
}
ensureWatermarkUi();

function ensureCropUi() {
  if (!document.getElementById('crop-tool')) {
    const watermarkTool = document.getElementById('watermark-tool');
    if (watermarkTool) {
      const tool=document.createElement('button'); tool.className='ribbon-tool'; tool.id='crop-tool'; tool.type='button';
      tool.innerHTML='<span class="tool-icon crop-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 2v15a2 2 0 0 0 2 2h13"/><path d="M2 7h15a2 2 0 0 1 2 2v13"/></svg></span><span class="tool-label">Crop</span>';
      watermarkTool.after(tool);
    }
  }
  if (!document.getElementById('crop-options-bar')) {
    const drawBar=document.getElementById('draw-options-bar');
    if (drawBar) {
      const bar=document.createElement('div'); bar.className='crop-options-bar'; bar.id='crop-options-bar'; bar.hidden=true; bar.setAttribute('aria-label','Crop options');
      bar.innerHTML='<div class="crop-scope-control"><span>Pages to crop</span><div class="crop-scope-choices"><label><input type="radio" name="crop-scope" value="current" checked> Current page</label><label><input type="radio" name="crop-scope" value="all"> All pages</label><label><input type="radio" name="crop-scope" value="specific"> Specific page</label><input id="crop-specific-page" type="number" min="1" value="1" disabled aria-label="Specific page number"></div></div><div class="crop-instructions"><strong>Drag to select</strong><small>Press and hold on the page, then drag around the area to keep.</small></div><div class="crop-dimensions"><span>Crop dimensions</span><div><label>Left <output id="crop-left-value">—</output></label><label>Top <output id="crop-top-value">—</output></label><label>Width <output id="crop-width-value">—</output></label><label>Height <output id="crop-height-value">—</output></label></div></div><button class="crop-action secondary" id="crop-cancel" type="button">Cancel</button><button class="crop-action primary" id="crop-apply" type="button" disabled>Apply crop</button>';
      drawBar.before(bar);
    }
  }
}
ensureCropUi();

function syncWatermarkControls() {
  const state = editor.watermark;
  document.getElementById('watermark-text').value = state.text;
  document.getElementById('watermark-size').value = state.size;
  document.getElementById('watermark-size-value').textContent = `${state.size}%`;
  document.getElementById('watermark-opacity').value = state.opacity;
  document.getElementById('watermark-opacity-value').textContent = `${state.opacity}%`;
  document.getElementById('watermark-vertical').value = state.vertical ?? 50;
  document.querySelectorAll('[data-watermark-align]').forEach(button => button.classList.toggle('active', button.dataset.watermarkAlign === (state.align || 'center')));
  syncWatermarkAngleDial();
  document.getElementById('watermark-custom-colour').value = state.colour;
  document.querySelectorAll('[data-watermark-colour]').forEach(button => button.classList.toggle('active', button.dataset.watermarkColour.toLowerCase() === state.colour.toLowerCase()));
}
function updateWatermark(property, value) {
  editor.watermark.applied = true;
  editor.watermark[property] = value;
  renderAnnotations();
}
document.getElementById('watermark-tool')?.addEventListener('click', () => {
  if (!editor.watermark.applied) {
    recordHistory();
    editor.watermark.applied = true;
  }
  syncWatermarkControls();
  setEditorMode('watermark');
});
document.getElementById('watermark-text')?.addEventListener('input', event => updateWatermark('text', event.target.value));
document.getElementById('watermark-size')?.addEventListener('input', event => {
  const value = Math.max(0, Math.min(100, Number(event.target.value)));
  document.getElementById('watermark-size-value').textContent = `${value}%`;
  updateWatermark('size', value);
});
document.getElementById('watermark-opacity')?.addEventListener('input', event => {
  const value = Math.max(0, Math.min(100, Number(event.target.value)));
  document.getElementById('watermark-opacity-value').textContent = `${value}%`;
  updateWatermark('opacity', value);
});
document.querySelectorAll('[data-watermark-colour]').forEach(button => button.addEventListener('click', () => {
  const colour = button.dataset.watermarkColour;
  document.getElementById('watermark-custom-colour').value = colour;
  document.querySelectorAll('[data-watermark-colour]').forEach(item => item.classList.toggle('active', item === button));
  updateWatermark('colour', colour);
}));
document.getElementById('watermark-custom-colour')?.addEventListener('input', event => {
  document.querySelectorAll('[data-watermark-colour]').forEach(item => item.classList.remove('active'));
  updateWatermark('colour', event.target.value);
});
document.querySelectorAll('[data-watermark-align]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-watermark-align]').forEach(item => item.classList.toggle('active', item === button));
  updateWatermark('align', button.dataset.watermarkAlign);
}));
document.getElementById('watermark-vertical')?.addEventListener('input', event => updateWatermark('vertical', Math.max(0, Math.min(100, Number(event.target.value)))));

function normaliseWatermarkAngle(value) {
  let angle = Math.round(value);
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}
function syncWatermarkAngleDial() {
  const angle = normaliseWatermarkAngle(editor.watermark.angle || 0);
  const dial = document.getElementById('watermark-angle-dial');
  const knob = document.getElementById('watermark-angle-knob');
  const output = document.getElementById('watermark-angle-value');
  if (knob) {
    const radians = (angle - 90) * Math.PI / 180;
    knob.style.transform = `translate(${Math.cos(radians) * 15}px,${Math.sin(radians) * 15}px)`;
  }
  if (output) output.textContent = `${angle}°`;
  if (dial) dial.setAttribute('aria-valuenow', String(angle));
}
function setWatermarkAngleFromPointer(event) {
  const dial = document.getElementById('watermark-angle-dial');
  const rect = dial.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  updateWatermark('angle', normaliseWatermarkAngle(Math.atan2(dy, dx) * 180 / Math.PI + 90));
  syncWatermarkAngleDial();
}
document.getElementById('watermark-angle-dial')?.addEventListener('pointerdown', event => {
  event.preventDefault();
  const dial = event.currentTarget;
  dial.setPointerCapture(event.pointerId);
  setWatermarkAngleFromPointer(event);
});
document.getElementById('watermark-angle-dial')?.addEventListener('pointermove', event => {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) setWatermarkAngleFromPointer(event);
});
document.getElementById('watermark-angle-dial')?.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const step = event.shiftKey ? 15 : 1;
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
  updateWatermark('angle', normaliseWatermarkAngle((editor.watermark.angle || 0) + direction * step));
  syncWatermarkAngleDial();
});
document.getElementById('watermark-done')?.addEventListener('click', () => {
  setEditorMode('select');
  openFormatModal();
});

let managerSelection = new Set();
let managerZoom = 1;
let managerSessionSnapshot = null;
const managerHistory = {undo:[],redo:[]};
function managerStateSnapshot(){return {pages:JSON.parse(JSON.stringify(editor.pages)),splitPoints:[...(editor.splitPoints||[])],splitApplied:Boolean(editor.splitApplied)}}
function restoreManagerState(state){editor.pages=JSON.parse(JSON.stringify(state.pages));editor.splitPoints=[...(state.splitPoints||[])];editor.splitApplied=Boolean(state.splitApplied);managerSelection.clear();renderManagerWorkspace()}
function recordManagerHistory(){managerHistory.undo.push(managerStateSnapshot());if(managerHistory.undo.length>40)managerHistory.undo.shift();managerHistory.redo=[]}
function updateManagerButtons(){
  const selected=managerSelection.size;
  ['manager-delete','manager-duplicate','manager-rotate-left','manager-rotate-right','manager-move-left','manager-move-right'].forEach(id=>{const button=document.getElementById(id);if(button)button.disabled=!selected});
  const undo=document.getElementById('manager-undo'),redo=document.getElementById('manager-redo');if(undo)undo.disabled=!managerHistory.undo.length;if(redo)redo.disabled=!managerHistory.redo.length;
  const count=document.getElementById('manager-selection-count');if(count)count.textContent=`${selected} selected`;
  const summary=document.getElementById('manager-split-summary');const splits=(editor.splitPoints||[]).length;if(summary)summary.textContent=splits?`${splits+1} split files`:'No split points';
}
function managerActionName(){return new URLSearchParams(window.location.search).get('action')||'manage'}
function openManagerWorkspace(){
  if(!managerSessionSnapshot){managerSessionSnapshot=managerStateSnapshot();managerHistory.undo=[];managerHistory.redo=[];managerSelection.clear()}
  const action=managerActionName();const title=document.getElementById('manager-title'),instructions=document.getElementById('manager-instructions');
  if(title)title.textContent=action==='rotate'?'Rotate PDF pages':action==='delete'?'Delete PDF pages':action==='split'?'Split and organise pages':'Manage pages';
  if(instructions)instructions.textContent=action==='split'?'Click the scissors between pages to create separate files. Drag pages to reorder.':'Click any page to select it, then choose an action above. Drag pages to reorder.';
  renderManagerWorkspace();
}
function normaliseManagerSplitPoints(){editor.splitPoints=Array.from(new Set(editor.splitPoints||[])).map(Number).filter(point=>Number.isInteger(point)&&point>0&&point<editor.pages.length).sort((a,b)=>a-b)}
async function renderManagerWorkspace(){
  const grid=document.getElementById('manager-page-grid');if(!grid||!editor.pdfjs)return;normaliseManagerSplitPoints();grid.style.setProperty('--manager-zoom',String(managerZoom));grid.innerHTML='';
  for(let index=0;index<editor.pages.length;index++){
    const state=editor.pages[index];const unit=document.createElement('div');unit.className='manager-page-unit';
    const card=document.createElement('article');card.className=`manager-page-card${managerSelection.has(index)?' selected':''}`;card.draggable=true;card.dataset.managerIndex=String(index);card.innerHTML=`<div class="manager-page-paper"><canvas></canvas><span class="manager-drag-handle">⋮⋮</span><span class="manager-selected-check">✓</span></div><strong>${index+1}</strong>`;unit.appendChild(card);
    card.addEventListener('click',()=>{managerSelection.has(index)?managerSelection.delete(index):managerSelection.add(index);renderManagerWorkspace()});
    card.addEventListener('dragstart',event=>{if(!managerSelection.has(index)){managerSelection.clear();managerSelection.add(index)}card.classList.add('dragging');event.dataTransfer.setData('text/plain',String(index));event.dataTransfer.effectAllowed='move'});
    card.addEventListener('dragover',event=>{event.preventDefault();card.classList.add('drop-target')});card.addEventListener('dragleave',()=>card.classList.remove('drop-target'));
    card.addEventListener('drop',event=>{event.preventDefault();const to=Number(card.dataset.managerIndex);const selected=Array.from(managerSelection).sort((a,b)=>a-b);if(!selected.length||selected.includes(to))return;recordManagerHistory();const moving=selected.map(i=>editor.pages[i]);editor.pages=editor.pages.filter((_,i)=>!managerSelection.has(i));const removedBefore=selected.filter(i=>i<to).length;const insertAt=Math.max(0,Math.min(editor.pages.length,to-removedBefore));editor.pages.splice(insertAt,0,...moving);managerSelection=new Set(moving.map((_,i)=>insertAt+i));editor.splitApplied=false;renderManagerWorkspace()});
    try{const page=await editor.pdfjs.getPage(state.sourceIndex+1);const base=page.getViewport({scale:1,rotation:state.rotation});const viewport=page.getViewport({scale:190/base.width,rotation:state.rotation});const canvas=card.querySelector('canvas');canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise}catch(_){}
    if(index<editor.pages.length-1){const marker=document.createElement('button');const point=index+1,active=editor.splitPoints.includes(point);marker.type='button';marker.className=`manager-split-marker${active?' active':''}`;marker.setAttribute('aria-label',active?`Remove split after page ${point}`:`Split after page ${point}`);marker.innerHTML='<span>✂</span><small>Split</small>';marker.addEventListener('click',event=>{event.stopPropagation();recordManagerHistory();editor.splitPoints=active?editor.splitPoints.filter(item=>item!==point):[...editor.splitPoints,point];editor.splitApplied=false;renderManagerWorkspace()});unit.appendChild(marker)}
    grid.appendChild(unit)
  }
  updateManagerButtons()
}
function selectedManagerIndices(){return Array.from(managerSelection).sort((a,b)=>a-b)}
function managerRotate(delta){if(!managerSelection.size)return;recordManagerHistory();selectedManagerIndices().forEach(index=>editor.pages[index].rotation=(editor.pages[index].rotation+delta+360)%360);renderManagerWorkspace()}
function managerDelete(){if(!managerSelection.size)return;if(editor.pages.length-managerSelection.size<1)return showAlert('A PDF must contain at least one page.');recordManagerHistory();editor.pages=editor.pages.filter((_,index)=>!managerSelection.has(index));managerSelection.clear();editor.splitApplied=false;renderManagerWorkspace()}
function managerDuplicate(){if(!managerSelection.size)return;recordManagerHistory();const selected=selectedManagerIndices();let offset=0;selected.forEach(index=>{editor.pages.splice(index+1+offset,0,JSON.parse(JSON.stringify(editor.pages[index+offset])));offset++});managerSelection.clear();editor.splitApplied=false;renderManagerWorkspace()}
function managerMove(direction){const selected=selectedManagerIndices();if(!selected.length)return;const edge=direction<0?selected[0]:selected[selected.length-1];if((direction<0&&edge===0)||(direction>0&&edge===editor.pages.length-1))return;recordManagerHistory();const swap=direction<0?selected:[...selected].reverse();swap.forEach(index=>{const other=index+direction;[editor.pages[index],editor.pages[other]]=[editor.pages[other],editor.pages[index]]});managerSelection=new Set(selected.map(index=>index+direction));editor.splitApplied=false;renderManagerWorkspace()}
document.getElementById('manage-tool')?.addEventListener('click',()=>setEditorMode('manage'));
document.getElementById('manager-delete')?.addEventListener('click',managerDelete);document.getElementById('manager-duplicate')?.addEventListener('click',managerDuplicate);document.getElementById('manager-rotate-left')?.addEventListener('click',()=>managerRotate(-90));document.getElementById('manager-rotate-right')?.addEventListener('click',()=>managerRotate(90));document.getElementById('manager-move-left')?.addEventListener('click',()=>managerMove(-1));document.getElementById('manager-move-right')?.addEventListener('click',()=>managerMove(1));
document.getElementById('manager-select-all')?.addEventListener('click',()=>{managerSelection=new Set(editor.pages.map((_,index)=>index));renderManagerWorkspace()});document.getElementById('manager-select-none')?.addEventListener('click',()=>{managerSelection.clear();renderManagerWorkspace()});
document.getElementById('manager-zoom-out')?.addEventListener('click',()=>{managerZoom=Math.max(.7,managerZoom-.1);renderManagerWorkspace()});document.getElementById('manager-zoom-in')?.addEventListener('click',()=>{managerZoom=Math.min(1.5,managerZoom+.1);renderManagerWorkspace()});
document.getElementById('manager-undo')?.addEventListener('click',()=>{if(!managerHistory.undo.length)return;managerHistory.redo.push(managerStateSnapshot());restoreManagerState(managerHistory.undo.pop())});document.getElementById('manager-redo')?.addEventListener('click',()=>{if(!managerHistory.redo.length)return;managerHistory.undo.push(managerStateSnapshot());restoreManagerState(managerHistory.redo.pop())});
document.getElementById('manager-cancel')?.addEventListener('click',()=>{if(managerSessionSnapshot)restoreManagerState(managerSessionSnapshot);managerSessionSnapshot=null;setEditorMode('select')});
document.getElementById('manager-apply')?.addEventListener('click',async()=>{normaliseManagerSplitPoints();editor.splitApplied=editor.splitPoints.length>0;managerSessionSnapshot=null;managerSelection.clear();editor.selectedIndex=Math.min(editor.selectedIndex,Math.max(0,editor.pages.length-1));await renderThumbnails();await renderSelectedPage();setEditorMode('select');showAlert(`Page changes applied${editor.splitApplied?`. ${editor.splitPoints.length+1} split PDFs will be created on PDF export.`:'.'}`)});

let selectedSplitPage = 0;
function normaliseSplitPoints() {
  editor.splitPoints = Array.from(new Set(editor.splitPoints || []))
    .map(Number)
    .filter(point => Number.isInteger(point) && point > 0 && point < editor.pages.length)
    .sort((a, b) => a - b);
}
function updateSplitSummary() {
  normaliseSplitPoints();
  const count = editor.splitPoints.length;
  const sectionCount = document.getElementById('split-section-count');
  const pointCount = document.getElementById('split-point-count');
  const apply = document.getElementById('split-apply');
  if (sectionCount) sectionCount.textContent = `${count + 1} output file${count ? 's' : ''}`;
  if (pointCount) pointCount.textContent = count ? `${count} split point${count === 1 ? '' : 's'} selected` : 'No split points selected';
  if (apply) apply.disabled = count === 0;
}
async function renderSplitWorkspace() {
  const grid = document.getElementById('split-page-grid');
  if (!grid || !editor.pdfjs) return;
  normaliseSplitPoints();
  grid.innerHTML = '';
  for (let index = 0; index < editor.pages.length; index++) {
    const state = editor.pages[index];
    const card = document.createElement('article');
    card.className = `split-page-card${index === selectedSplitPage ? ' selected' : ''}`;
    card.draggable = true;
    card.dataset.splitIndex = String(index);
    card.innerHTML = `<div class="split-page-paper"><canvas></canvas><span class="split-drag-handle" aria-hidden="true">⋮⋮</span></div><strong>Page ${index + 1}</strong>`;
    grid.appendChild(card);
    card.addEventListener('click', () => {
      selectedSplitPage = index;
      grid.querySelectorAll('.split-page-card').forEach((item, itemIndex) => item.classList.toggle('selected', itemIndex === index));
    });
    card.addEventListener('dragstart', event => {
      card.classList.add('dragging');
      event.dataTransfer.setData('text/plain', String(index));
      event.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragover', event => { event.preventDefault(); card.classList.add('drop-target'); });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('dragend', () => grid.querySelectorAll('.split-page-card').forEach(item => item.classList.remove('dragging','drop-target')));
    card.addEventListener('drop', async event => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData('text/plain'));
      const to = Number(card.dataset.splitIndex);
      if (!Number.isInteger(from) || from === to) return;
      recordHistory();
      const [moved] = editor.pages.splice(from, 1);
      editor.pages.splice(to, 0, moved);
      selectedSplitPage = to;
      editor.splitApplied = false;
      await renderSplitWorkspace();
    });
    try {
      const page = await editor.pdfjs.getPage(state.sourceIndex + 1);
      const base = page.getViewport({scale:1,rotation:state.rotation});
      const viewport = page.getViewport({scale:180/base.width,rotation:state.rotation});
      const canvas = card.querySelector('canvas');
      canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    } catch (_) {}
    if (index < editor.pages.length - 1) {
      const cut = document.createElement('button');
      const active = editor.splitPoints.includes(index + 1);
      cut.type = 'button';
      cut.className = `split-marker${active ? ' active' : ''}`;
      cut.dataset.splitPoint = String(index + 1);
      cut.setAttribute('aria-label', active ? `Remove split after page ${index + 1}` : `Split after page ${index + 1}`);
      cut.innerHTML = `<span>✂</span><small>${active ? 'Split here' : 'Add split'}</small>`;
      grid.appendChild(cut);
      cut.addEventListener('click', () => {
        const point = Number(cut.dataset.splitPoint);
        editor.splitPoints = editor.splitPoints.includes(point) ? editor.splitPoints.filter(item => item !== point) : [...editor.splitPoints, point];
        editor.splitApplied = false;
        renderSplitWorkspace();
      });
    }
  }
  updateSplitSummary();
}
document.getElementById('split-tool')?.addEventListener('click', () => setEditorMode('split'));
document.getElementById('split-reset')?.addEventListener('click', () => {
  editor.splitPoints = [];
  editor.splitApplied = false;
  renderSplitWorkspace();
});
document.getElementById('split-apply')?.addEventListener('click', () => {
  if (!editor.splitPoints.length) return;
  recordHistory();
  editor.splitApplied = true;
  const files = editor.splitPoints.length + 1;
  setEditorMode('select');
  showAlert(`Split applied. ${files} files will be created when you export as PDF.`);
});

document.getElementById('crop-tool')?.addEventListener('click', () => {
  editor.cropDraft = null;
  document.getElementById('crop-specific-page').max = Math.max(1, editor.pages.length);
  setEditorMode('crop');
});
document.querySelectorAll('input[name="crop-scope"]').forEach(input => input.addEventListener('change', event => {
  editor.cropScope = event.target.value;
  document.getElementById('crop-specific-page').disabled = editor.cropScope !== 'specific';
}));
document.getElementById('crop-cancel')?.addEventListener('click', () => {
  editor.cropDraft = null;
  setEditorMode('select');
});
document.getElementById('crop-apply')?.addEventListener('click', () => {
  if (!editor.cropDraft) return;
  const modal = document.getElementById('crop-confirm-modal');
  if (modal) modal.hidden = false;
});
function closeCropConfirmModal() {
  const modal = document.getElementById('crop-confirm-modal');
  if (modal) modal.hidden = true;
}
document.querySelectorAll('[data-close-crop-confirm]').forEach(button => button.addEventListener('click', closeCropConfirmModal));
document.getElementById('crop-confirm-ok')?.addEventListener('click', async () => {
  if (!editor.cropDraft) return closeCropConfirmModal();
  recordHistory();
  let crop = {...editor.cropDraft};
  const baseCrop = getCurrentAppliedCrop();
  if (baseCrop) {
    crop = {
      x:baseCrop.x + crop.x * baseCrop.w,
      y:baseCrop.y + crop.y * baseCrop.h,
      w:crop.w * baseCrop.w,
      h:crop.h * baseCrop.h
    };
  }
  if (editor.cropScope === 'all') {
    editor.pages.forEach(page => { editor.crops[String(page.sourceIndex)] = {...crop}; });
  } else if (editor.cropScope === 'specific') {
    const pageNumber = Math.max(1, Math.min(editor.pages.length, Number(document.getElementById('crop-specific-page').value) || 1));
    editor.crops[String(editor.pages[pageNumber - 1].sourceIndex)] = {...crop};
  } else {
    editor.crops[String(editor.pages[editor.selectedIndex].sourceIndex)] = {...crop};
  }
  editor.cropDraft = null;
  closeCropConfirmModal();
  await renderThumbnails();
  await renderSelectedPage();
  showEditorHint(editor.cropScope === 'all' ? 'Crop applied to all pages.' : 'Crop applied. Press Done when you are ready to export.');
});
document.getElementById('annotation-layer').addEventListener('pointerdown', event => {
  if (editor.mode !== 'crop' || event.button !== 0) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const layer = event.currentTarget;
  const bounds = layer.getBoundingClientRect();
  const startX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const startY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  layer.setPointerCapture(event.pointerId);
  editor.cropDraft = {x:startX,y:startY,w:0,h:0};
  const move = moveEvent => {
    const currentX=Math.max(0,Math.min(1,(moveEvent.clientX-bounds.left)/bounds.width));
    const currentY=Math.max(0,Math.min(1,(moveEvent.clientY-bounds.top)/bounds.height));
    editor.cropDraft={x:Math.min(startX,currentX),y:Math.min(startY,currentY),w:Math.abs(currentX-startX),h:Math.abs(currentY-startY)};
    renderAnnotations();
  };
  const finish = finishEvent => {
    layer.removeEventListener('pointermove',move);
    layer.removeEventListener('pointerup',finish);
    layer.removeEventListener('pointercancel',finish);
    if (editor.cropDraft && (editor.cropDraft.w < .02 || editor.cropDraft.h < .02)) editor.cropDraft=null;
    renderAnnotations();
  };
  layer.addEventListener('pointermove',move);
  layer.addEventListener('pointerup',finish);
  layer.addEventListener('pointercancel',finish);
  renderAnnotations();
}, true);

document.getElementById('text-highlight-tool').addEventListener('click', () => {
  setEditorMode('text-highlight');
});
document.getElementById('link-tool').addEventListener('click',()=>{
  closeLinkSettings();editor.selectedLinkId=null;setEditorMode('link');
});
document.querySelectorAll('input[name="link-kind"]').forEach(input=>input.addEventListener('change',updateLinkSettingsRows));
document.getElementById('link-settings-cancel').addEventListener('click',()=>{
  const item=getSelectedLink();
  if(item&&!item.url&&item.kind==='website') removeLinkById(item.id);
  else closeLinkSettings();
});
document.getElementById('link-settings-save').addEventListener('click',()=>{
  const item=getSelectedLink();if(!item)return;
  const kind=document.querySelector('input[name="link-kind"]:checked')?.value||'website';
  if(kind==='website'){
    const url=normaliseWebsiteUrl(document.getElementById('link-website-value').value);
    if(!url){showAlert('Enter a website address.');return}
    recordHistory();item.kind='website';item.url=url;item.page=null;
  }else{
    const page=Math.max(1,Math.min(editor.pages.length,Number(document.getElementById('link-page-value').value)||1));
    recordHistory();item.kind='page';item.page=page;item.url='';
  }
  item.saved=true;
  editor.selectedLinkId=null;
  closeLinkSettings();
  renderAnnotations();
  showEditorHint(kind==='website'?'Website link added. Hover to preview, then click to open.':`Page ${item.page} link added. Click it to navigate.`);
});
document.getElementById('link-settings-popover').addEventListener('keydown',event=>{
  if(event.key==='Enter'&&event.target.tagName==='INPUT'){event.preventDefault();document.getElementById('link-settings-save').click()}
});


document.querySelectorAll('[data-highlight-colour]').forEach(button => {
  button.addEventListener('click', () => {
    editor.highlightColour = button.dataset.highlightColour;
    document.querySelectorAll('[data-highlight-colour]').forEach(item => {
      item.classList.toggle('active',item === button);
    });
  });
});
document.getElementById('annotation-layer').addEventListener('pointerdown', beginLinkDraw, true);

document.getElementById('annotation-layer').addEventListener('mousedown', event => {
  if (event.target !== event.currentTarget) return;
  if (editor.mode === 'text') {
    if (editor.selectedAnnotationId) {
      document.activeElement?.blur?.();
      editor.selectedAnnotationId = null;
      setEditorMode('select');
      document.getElementById('text-options-bar').hidden = true;
      return;
    }
    addTextAt(event.clientX, event.clientY);
  } else if (editor.mode === 'edit-existing') {
    if (editor.editTextBoxMode) {
      addEditTextBoxAt(event.clientX, event.clientY);
    } else {
      commitExistingTextEditing({render: false});
      deselectExistingText();
      editor.selectedEditCreatedTextId = null;
      document.querySelectorAll('.edit-created-text').forEach(el => el.classList.remove('selected'));
      renderAnnotations();
    }
  } else {
    if (editor.mode === 'link') return;
    editor.selectedSignatureId = null;
    editor.selectedShapeId = null;
    deselectAnnotation();
    renderAnnotations();
  }
});
document.getElementById('text-font').addEventListener('change', e => {
  recordHistory();
  updateSelectedText(item => item.font = e.target.value);
});
document.getElementById('text-size').addEventListener('change', e => {
  recordHistory();
  updateSelectedText(item => item.size = Math.max(8, Math.min(96, Number(e.target.value) || 18)));
});
document.getElementById('text-color').addEventListener('input', e => {
  document.getElementById('font-colour-circle').style.background = e.target.value;
  updateSelectedText(item => item.color = e.target.value);
});
document.getElementById('text-color').addEventListener('change', recordHistory);
document.getElementById('font-colour-button')?.addEventListener('click', event => {
  event.stopPropagation();
  const menu = document.getElementById('font-colour-menu');
  menu.hidden = !menu.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!menu.hidden));
});
document.querySelectorAll('[data-font-colour]').forEach(button => button.addEventListener('click', event => {
  event.stopPropagation();
  recordHistory();
  const colour = button.dataset.fontColour;
  document.getElementById('text-color').value = colour;
  document.getElementById('font-colour-circle').style.background = colour;
  updateSelectedText(item => item.color = colour);
  document.getElementById('font-colour-menu').hidden = true;
  document.getElementById('font-colour-button').setAttribute('aria-expanded', 'false');
}));
document.getElementById('custom-font-colour')?.addEventListener('click', event => {
  event.stopPropagation();
  document.getElementById('text-color')?.click();
});
document.addEventListener('click', event => {
  if (event.target.closest('.font-colour-option')) return;
  const menu = document.getElementById('font-colour-menu');
  if (menu) menu.hidden = true;
  document.getElementById('font-colour-button')?.setAttribute('aria-expanded', 'false');
});
document.getElementById('text-fill-color').addEventListener('input', e => {
  const swatch = document.getElementById('fill-swatch');
  if (swatch) swatch.style.background = e.target.value;
  updateSelectedText(item => item.fillColor = e.target.value);
});
document.getElementById('text-fill-color').addEventListener('change', recordHistory);
document.getElementById('text-opacity').addEventListener('input', e => {
  const value = Number(e.target.value);
  document.getElementById('text-opacity-value').textContent = `${value}%`;
  updateSelectedText(item => item.opacity = value / 100);
});
document.getElementById('text-opacity').addEventListener('change', recordHistory);
document.getElementById('text-align-left').addEventListener('click', () => {
  recordHistory();
  updateSelectedText(item => item.align = 'left');
});
document.getElementById('text-align-center').addEventListener('click', () => {
  recordHistory();
  updateSelectedText(item => item.align = 'center');
});
document.getElementById('text-align-right').addEventListener('click', () => {
  recordHistory();
  updateSelectedText(item => item.align = 'right');
});


let preparedExportBytes = null;
let preparedExportFilename = '';
let pendingDashboardFileSave = Promise.resolve();

function isDashboardEditorSession() {
  try {
    const params = new URLSearchParams(window.location.search);
    return Boolean(window.PDFMintAuth?.isSignedIn?.()) &&
      params.get('source') === 'dashboard';
  } catch (_) {
    return false;
  }
}

async function hasUnlimitedPaidAccess() {
  try {
    const auth = window.PDFMintAuth;
    const user = await auth?.getUser?.();
    if (!user || !auth?.client) return false;
    const {data, error} = await auth.client
      .from('subscriptions')
      .select('plan_code,status,trial_ends_at')
      .eq('user_id', user.id)
      .in('status', ['trialing', 'active']);
    if (error) throw error;
    const now = Date.now();
    return (data || []).some(subscription => {
      if (subscription.plan_code === 'unlimited_trial' || subscription.plan_code === 'annual') return true;
      return subscription.plan_code === 'document_trial' &&
        subscription.status === 'active' &&
        (!subscription.trial_ends_at || Date.parse(subscription.trial_ends_at) <= now);
    });
  } catch (error) {
    console.warn('PDFBreeze could not verify membership access.', error);
    return false;
  }
}

function saveFileToDashboard(blob, filename) {
  if (!isDashboardEditorSession()) return Promise.resolve();
  if (window.PDFMintAuth?.saveDocument) {
    const params = new URLSearchParams(window.location.search);
    return window.PDFMintAuth.saveDocument(blob, filename, params.get('tool') || params.get('action') || 'editor')
      .catch(error => console.warn('PDFBreeze could not add the finished file to My Files.', error));
  }
  if (!window.indexedDB) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pdfmint-dashboard-files', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('files')) {
        request.result.createObjectStore('files', { keyPath: 'id' });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const db = request.result;
      try {
        const bytes = await blob.arrayBuffer();
        const record = {
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          name: filename,
          type: blob.type || 'application/octet-stream',
          size: blob.size,
          lastModified: Date.now(),
          bytes
        };
        const transaction = db.transaction('files', 'readwrite');
        transaction.objectStore('files').put(record);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  }).catch(error => console.warn('PDFBreeze could not add the finished file to My Files.', error));
}

function openFormatModal() {
  if (!editor.pages.length) return;
  preparedExportBytes = null;
  const pdfChoice = document.querySelector('input[name="export-format"][value="pdf"]');
  if (pdfChoice) {
    pdfChoice.checked = true;
    pdfChoice.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const originalBase = editor.file.name.replace(/\.pdf$/i, '');
  document.getElementById('export-filename').value = originalBase;
  document.getElementById('format-modal').hidden = false;
}

function closeFormatModal() {
  document.getElementById('format-modal').hidden = true;
}

function openEmailModal() {
  closeFormatModal();
  document.getElementById('email-error').hidden = true;
  document.getElementById('download-email').classList.remove('invalid');
  document.getElementById('email-modal').hidden = false;
  setTimeout(() => document.getElementById('download-email').focus(), 50);
}

function closeEmailModal() {
  document.getElementById('email-modal').hidden = true;
}

async function createEditedPdfBytes() {
  const source = await PDFLib.PDFDocument.load(editor.originalBytes.slice());
  const output = await PDFLib.PDFDocument.create();
  const fontCache = {};

  if (window.fontkit && typeof output.registerFontkit === 'function') {
    output.registerFontkit(window.fontkit);
  }

  async function createExistingTextPng(item, lines, width, height, fontSize, lineHeight, baselineOffset) {
    const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
    if (!exactEntry?.face) return null;

    await exactEntry.face.loaded;
    const pixelScale = 4;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * pixelScale));
    canvas.height = Math.max(1, Math.ceil(height * pixelScale));
    const context = canvas.getContext('2d');
    context.scale(pixelScale, pixelScale);
    // The replacement must be opaque. A transparent text image can leave the
    // original PDF glyphs visible underneath, making an unchanged 400-weight
    // font look artificially bold after export.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    context.fillStyle = item.color || '#000000';
    context.strokeStyle = item.color || '#000000';
    context.lineJoin = 'round';
    context.lineWidth = Math.max(0, Number(item.fontStrokeWidth) || 0) * 2;
    const preservedWeight = Number.isFinite(item.fontWeight)
      ? item.fontWeight
      : Number.isFinite(item.originalFontWeight)
        ? item.originalFontWeight
        : item.bold ? 700 : 400;
    context.font = `${item.italic ? 'italic ' : ''}${preservedWeight} ${fontSize}px "${exactEntry.family}"`;

    lines.forEach((line, index) => {
      const measuredWidth = Math.max(.01, context.measureText(line).width);
      const requestedWidth = Number(item.lineWidths?.[index]);
      const storedLineScale = Number(item.lineScaleXs?.[index]);
      const lineScaleX = Number.isFinite(storedLineScale) && storedLineScale > 0
        ? storedLineScale
        : Number.isFinite(requestedWidth) && requestedWidth > 0
          ? requestedWidth / measuredWidth
          : Number.isFinite(item.fontScaleX) ? item.fontScaleX : 1;
      const lineOffset = Number.isFinite(Number(item.lineOffsets?.[index]))
        ? Number(item.lineOffsets[index])
        : 0;
      const storedBaseline = Number(item.lineBaselineOffsets?.[index]);
      const lineBaseline = Number.isFinite(storedBaseline)
        ? storedBaseline
        : baselineOffset + index * lineHeight;
      context.save();
      context.translate(lineOffset, lineBaseline);
      context.scale(lineScaleX, 1);
      if (context.lineWidth > 0) context.strokeText(line, 0, 0);
      context.fillText(line, 0, 0);
      context.restore();
    });

    return output.embedPng(canvas.toDataURL('image/png'));
  }

  async function getFont(item) {
    const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
    if (exactEntry?.data?.length && window.fontkit) {
      const exactKey = `exact:${item.exactFontKey}`;
      if (!fontCache[exactKey]) {
        fontCache[exactKey] = await output.embedFont(exactEntry.data, {subset: false});
      }
      return fontCache[exactKey];
    }

    const sansFonts = ['Helvetica','Arial','Verdana','Tahoma','Trebuchet','Impact','ComicSans'];
    const serifFonts = ['TimesRoman','Georgia','Garamond'];
    const monoFonts = ['Courier','LucidaConsole'];
    let key = sansFonts.includes(item.font) ? 'Helvetica'
      : serifFonts.includes(item.font) ? 'TimesRoman'
      : monoFonts.includes(item.font) ? 'Courier'
      : 'Helvetica';

    if (key === 'Helvetica' && item.bold && item.italic) key = 'HelveticaBoldOblique';
    else if (key === 'Helvetica' && item.bold) key = 'HelveticaBold';
    else if (key === 'Helvetica' && item.italic) key = 'HelveticaOblique';
    else if (key === 'TimesRoman' && item.bold && item.italic) key = 'TimesRomanBoldItalic';
    else if (key === 'TimesRoman' && item.bold) key = 'TimesRomanBold';
    else if (key === 'TimesRoman' && item.italic) key = 'TimesRomanItalic';
    else if (key === 'Courier' && item.bold && item.italic) key = 'CourierBoldOblique';
    else if (key === 'Courier' && item.bold) key = 'CourierBold';
    else if (key === 'Courier' && item.italic) key = 'CourierOblique';

    if (!fontCache[key]) fontCache[key] = await output.embedFont(PDFLib.StandardFonts[key]);
    return fontCache[key];
  }

  for (const state of editor.pages) {
    const [page] = await output.copyPages(source, [state.sourceIndex]);
    const originalRotation = page.getRotation().angle || 0;
    page.setRotation(PDFLib.degrees((originalRotation + state.rotation) % 360));
    output.addPage(page);

    const annotations = getPageAnnotations(state.sourceIndex);
    const existingEdits = getExistingTextItems(state.sourceIndex).filter(item => item.modified);
    const {width, height} = page.getSize();

    const crop = editor.crops[String(state.sourceIndex)];
    if (crop && crop.w > 0 && crop.h > 0) {
      page.setCropBox(
        crop.x * width,
        (1 - crop.y - crop.h) * height,
        crop.w * width,
        crop.h * height
      );
    }

    if (editor.watermark?.applied && editor.watermark.text && editor.watermark.size > 0 && editor.watermark.opacity > 0) {
      const watermarkFont = await getFont({font:'Helvetica', bold:true, italic:false});
      const text = String(editor.watermark.text);
      const unitWidth = Math.max(.001, watermarkFont.widthOfTextAtSize(text, 1));
      const fontSize = width * (editor.watermark.size / 100) / unitWidth;
      const textWidth = watermarkFont.widthOfTextAtSize(text, fontSize);
      const angle = -Number(editor.watermark.angle || 0);
      const radians = angle * Math.PI / 180;
      const cos = Math.cos(radians), sin = Math.sin(radians);
      const corners = [[0,0],[textWidth,0],[0,fontSize],[textWidth,fontSize]].map(([x,y]) => ({x:x*cos-y*sin,y:x*sin+y*cos}));
      const minX = Math.min(...corners.map(point => point.x));
      const maxX = Math.max(...corners.map(point => point.x));
      const minY = Math.min(...corners.map(point => point.y));
      const maxY = Math.max(...corners.map(point => point.y));
      const alignment = editor.watermark.align || 'center';
      const marginX = width * .05;
      const targetX = alignment === 'left' ? marginX : alignment === 'right' ? width - marginX : width / 2;
      const x = targetX - (alignment === 'left' ? minX : alignment === 'right' ? maxX : (minX + maxX) / 2);
      const boxHeight = maxY - minY;
      const marginY = height * .05;
      const vertical = Math.max(0, Math.min(100, editor.watermark.vertical ?? 50));
      const targetCentreY = marginY + boxHeight / 2 + (1 - vertical / 100) * Math.max(0, height - marginY * 2 - boxHeight);
      const y = targetCentreY - (minY + maxY) / 2;
      const colour = hexToRgb01(editor.watermark.colour || '#111827');
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font: watermarkFont,
        color: PDFLib.rgb(colour.r, colour.g, colour.b),
        opacity: editor.watermark.opacity / 100,
        rotate: PDFLib.degrees(angle)
      });
    }

    for (const item of existingEdits) {
      const fontSize = item.pdfFontSize || 12;
      const targetWidth = Math.max(10, item.w * width);
      const lineHeight = item.lineHeight || fontSize * 1.15;
      const x = Math.max(0, item.x * width);
      const firstBaselineY = Number.isFinite(item.pdfY)
        ? item.pdfY
        : height - item.y * height - fontSize;
      const replacementTopY = height - item.y * height;

      const rawLines = String(item.text || '').split(/\r?\n/);
      const wrappedLines = [];

      const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
      const measurementCanvas = document.createElement('canvas');
      const measurementContext = measurementCanvas.getContext('2d');
      measurementContext.font = exactEntry?.face
        ? `${item.italic ? 'italic ' : ''}${item.fontWeight || (item.bold ? 700 : 400)} ${fontSize}px "${exactEntry.family}"`
        : `${fontSize}px Helvetica`;

      const fallbackFont = exactEntry?.face ? null : await getFont(item);

      for (const rawLine of rawLines) {
        if (exactEntry?.face) {
          // PDF.js has already reconstructed the document's visual line breaks.
          // Preserve them verbatim for embedded-font edits; re-wrapping with a
          // second metrics engine introduces different breaks and vertical drift.
          wrappedLines.push(rawLine);
          continue;
        }
        const words = rawLine.split(/\s+/);
        let current = '';

        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          const measuredWidth = exactEntry?.face
            ? measurementContext.measureText(test).width
            : fallbackFont.widthOfTextAtSize(test, fontSize);
          if (measuredWidth > targetWidth && current) {
            wrappedLines.push(current);
            current = word;
          } else {
            current = test;
          }
        }

        wrappedLines.push(current || '');
      }

      const replacementHeight = Math.max(
        item.h * height,
        wrappedLines.length * lineHeight + fontSize * .35
      );

      // Always cover the complete original paragraph footprint first.
      const originalX = item.originalX * width;
      const originalTopY = height - item.originalY * height;
      const originalWidth = item.originalW * width;
      const originalHeight = item.originalH * height;

      page.drawRectangle({
        x: Math.max(0, originalX - 2),
        y: Math.max(0, originalTopY - originalHeight - 2),
        width: Math.min(width - originalX + 2, originalWidth + 4),
        height: originalHeight + 4,
        color: PDFLib.rgb(1, 1, 1)
      });

      // If the replacement wraps lower than the original paragraph, cover that
      // additional vertical area too.
      if (replacementHeight > originalHeight) {
        page.drawRectangle({
          x: Math.max(0, x - 2),
          y: Math.max(0, replacementTopY - replacementHeight - 2),
          width: Math.min(width - x + 2, targetWidth + 4),
          height: replacementHeight + 4,
          color: PDFLib.rgb(1, 1, 1)
        });
      }

      const baselineOffset = Math.max(0, replacementTopY - firstBaselineY);
      const exactTextImage = await createExistingTextPng(
        item,
        wrappedLines,
        targetWidth,
        replacementHeight,
        fontSize,
        lineHeight,
        baselineOffset
      );

      if (exactTextImage) {
        page.drawImage(exactTextImage, {
          x,
          y: replacementTopY - replacementHeight,
          width: targetWidth,
          height: replacementHeight
        });
      } else {
        wrappedLines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x,
            y: firstBaselineY - lineIndex * lineHeight,
            size: fontSize,
            font: fallbackFont,
            color: (() => {
              const c = hexToRgb01(item.color || '#000000');
              return PDFLib.rgb(c.r, c.g, c.b);
            })(),
            maxWidth: targetWidth
          });
        });
      }
    }

    const createdEditItems = getEditCreatedTextItems(state.sourceIndex);

    for (const item of createdEditItems) {
      const font = await getFont(item);
      const rgb = hexToRgb01(item.color || '#000000');
      const fontSize = item.pdfFontSize || 18;
      const lineHeight = fontSize * 1.15;
      const maxWidth = Math.max(10, item.w * width);
      const startX = item.x * width;
      const topY = height - item.y * height;

      const rawLines = String(item.text || '').split(/\r?\n/);
      const wrapped = [];

      for (const raw of rawLines) {
        const words = raw.split(/\s+/);
        let line = '';

        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
            wrapped.push(line);
            line = word;
          } else {
            line = test;
          }
        }

        wrapped.push(line || '');
      }

      wrapped.forEach((line, idx) => {
        page.drawText(line, {
          x: startX,
          y: topY - fontSize - idx * lineHeight,
          size: fontSize,
          font,
          color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
        });
      });
    }

    const pageShapes = getPageShapes(state.sourceIndex);
    for (const shape of pageShapes) {
      const c=hexToRgb01(shape.stroke||'#111111'), fill=hexToRgb01(shape.fill||'#ffffff');
      const x1=shape.x1*width,y1=height-shape.y1*height,x2=shape.x2*width,y2=height-shape.y2*height;
      const x=Math.min(x1,x2), y=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
      if(shape.type==='line'||shape.type==='arrow'){
        page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:shape.thickness,color:PDFLib.rgb(c.r,c.g,c.b),opacity:shape.opacity});
        if(shape.type==='arrow'){
          const angle=Math.atan2(y2-y1,x2-x1),size=Math.max(8,shape.thickness*4),a1=angle+Math.PI*.82,a2=angle-Math.PI*.82;
          page.drawLine({start:{x:x2,y:y2},end:{x:x2+Math.cos(a1)*size,y:y2+Math.sin(a1)*size},thickness:shape.thickness,color:PDFLib.rgb(c.r,c.g,c.b),opacity:shape.opacity});
          page.drawLine({start:{x:x2,y:y2},end:{x:x2+Math.cos(a2)*size,y:y2+Math.sin(a2)*size},thickness:shape.thickness,color:PDFLib.rgb(c.r,c.g,c.b),opacity:shape.opacity});
        }
      } else if(shape.type==='box') page.drawRectangle({x,y,width:w,height:h,borderWidth:shape.thickness,borderColor:PDFLib.rgb(c.r,c.g,c.b),color:shape.fillEnabled?PDFLib.rgb(fill.r,fill.g,fill.b):undefined,opacity:shape.opacity,borderOpacity:shape.opacity});
      else page.drawEllipse({x:x+w/2,y:y+h/2,xScale:w/2,yScale:h/2,borderWidth:shape.thickness,borderColor:PDFLib.rgb(c.r,c.g,c.b),color:shape.fillEnabled?PDFLib.rgb(fill.r,fill.g,fill.b):undefined,opacity:shape.opacity,borderOpacity:shape.opacity});
    }

    const pageHighlights = getPageTextHighlights(state.sourceIndex);
    for (const highlight of pageHighlights) {
      const colour = hexToRgb01(highlight.colour || '#fff200');

      for (const rect of highlight.rects) {
        page.drawRectangle({
          x:rect.x * width,
          y:height - (rect.y + rect.h) * height,
          width:rect.w * width,
          height:rect.h * height,
          color:PDFLib.rgb(colour.r,colour.g,colour.b),
          opacity:.48
        });
      }
    }

    const drawingStrokes = getPageDrawings(state.sourceIndex);
    for (const stroke of drawingStrokes) {
      const c = hexToRgb01(stroke.colour || '#111111');
      for (let i=1;i<stroke.points.length;i++) {
        const a=stroke.points[i-1], b=stroke.points[i];
        page.drawLine({
          start:{x:a.x*width,y:height-a.y*height},
          end:{x:b.x*width,y:height-b.y*height},
          thickness:Math.max(.5,(stroke.thickness||4)*width/1000),
          color:PDFLib.rgb(c.r,c.g,c.b),
          opacity:stroke.tool==='highlighter'?.32:1
        });
      }
    }

    const signatures = getPageSignatures(state.sourceIndex);

    for (const item of signatures) {
      const data = item.dataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
      const image = item.dataUrl.startsWith('data:image/jpeg')
        ? await output.embedJpg(bytes)
        : await output.embedPng(bytes);

      page.drawImage(image, {
        x: item.x * width,
        y: height - (item.y + item.h) * height,
        width: item.w * width,
        height: item.h * height
      });
    }



    const pageNotes = getPageNotes(state.sourceIndex);
    for (const note of pageNotes) {
      if (!String(note.text || '').trim()) continue;
      try {
        const pinSize = Math.max(16, Math.min(width,height) * .025);
        const x = Math.max(0, Math.min(width-pinSize, note.x*width));
        const y = Math.max(0, Math.min(height-pinSize, height-note.y*height-pinSize));
        const annotation = output.context.obj({
          Type:'Annot',
          Subtype:'Text',
          Rect:[x,y,x+pinSize,y+pinSize],
          Contents:PDFLib.PDFString.of(String(note.text)),
          Name:PDFLib.PDFName.of('PushPin'),
          C:[0.88,0.12,0.12],
          Open:false,
          F:4
        });
        page.node.addAnnot(output.context.register(annotation));
      } catch(error) {
        console.error('Could not export note annotation',error);
      }
    }

    const pageLinks = getPageLinks(state.sourceIndex);
    for (const item of pageLinks) {
      const x1=item.x*width;
      const y1=height-(item.y+item.h)*height;
      const x2=(item.x+item.w)*width;
      const y2=height-item.y*height;
      try{
        let annotation;
        if(item.kind==='page'){
          const targetIndex=Math.max(0,Math.min(output.getPageCount()-1,Number(item.page||1)-1));
          const targetPage=output.getPage(targetIndex);
          annotation=output.context.obj({
            Type:'Annot',Subtype:'Link',Rect:[x1,y1,x2,y2],Border:[0,0,0],
            A:{Type:'Action',S:'GoTo',D:[targetPage.ref,PDFLib.PDFName.of('Fit')]}
          });
        }else if(item.url){
          annotation=output.context.obj({
            Type:'Annot',Subtype:'Link',Rect:[x1,y1,x2,y2],Border:[0,0,0],
            A:{Type:'Action',S:'URI',URI:PDFLib.PDFString.of(item.url)}
          });
        }
        if(annotation){
          const ref=output.context.register(annotation);
          page.node.addAnnot(ref);
        }
      }catch(error){console.error('Could not export link annotation',error)}
    }

    for (const item of annotations) {
      const font = await getFont(item);
      const rgb = hexToRgb01(item.color);
      const fontSize = item.size;
      const lineHeight = fontSize * 1.15;
      const maxWidth = Math.max(10, item.w * width);
      const startX = item.x * width;
      const topY = height - item.y * height;

      if (item.fillColor && item.fillColor !== 'transparent') {
        const fillRgb = hexToRgb01(item.fillColor);
        page.drawRectangle({
          x: startX,
          y: height - (item.y + item.h) * height,
          width: item.w * width,
          height: item.h * height,
          color: PDFLib.rgb(fillRgb.r, fillRgb.g, fillRgb.b),
          opacity: item.opacity
        });
      }

      const rawLines = String(item.text || '').split(/\r?\n/);
      const lines = [];
      for (const raw of rawLines) {
        const words = raw.split(/\s+/);
        let line = '';
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        lines.push(line || '');
      }

      lines.forEach((line, idx) => {
        let x = startX;
        if (item.align === 'center') {
          x += Math.max(0, (maxWidth - font.widthOfTextAtSize(line, fontSize)) / 2);
        } else if (item.align === 'right') {
          x += Math.max(0, maxWidth - font.widthOfTextAtSize(line, fontSize));
        }

        page.drawText(line, {
          x,
          y: topY - fontSize - idx * lineHeight,
          size: fontSize,
          font,
          color: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
          opacity: item.opacity,
          rotate: PDFLib.degrees(-Number(item.rotation || 0))
        });
      });
    }
  }

  return output.save();
}






function selectShapeTool(type){editor.shapeTool=type;const labels={line:'Line',arrow:'Arrow',box:'Box',circle:'Circle'},icons={line:'／',arrow:'↗',box:'▢',circle:'○'};document.getElementById('line-tool-label').textContent=labels[type];document.getElementById('line-tool-icon').textContent=icons[type];document.getElementById('line-current-shape').textContent=labels[type];document.querySelectorAll('[data-line-shape]').forEach(b=>b.classList.toggle('active',b.dataset.lineShape===type));document.getElementById('line-shape-menu').hidden=true;setEditorMode('shape');showEditorHint(`Drag on the PDF to add a ${labels[type].toLowerCase()}.`)}
function positionLineShapeMenu(){
  const button=document.getElementById('line-tool');
  const menu=document.getElementById('line-shape-menu');
  if(!button||!menu||menu.hidden)return;

  const rect=button.getBoundingClientRect();
  const menuWidth=158;
  const viewportPadding=8;
  const left=Math.min(
    window.innerWidth-menuWidth-viewportPadding,
    Math.max(viewportPadding,rect.left)
  );

  menu.style.left=`${left}px`;
  menu.style.top=`${rect.bottom+4}px`;
}

document.getElementById('line-tool').addEventListener('click',e=>{
  e.stopPropagation();
  const menu=document.getElementById('line-shape-menu');

  if(editor.mode!=='shape'){
    selectShapeTool(editor.shapeTool);
  }

  menu.hidden=!menu.hidden;

  if(!menu.hidden){
    requestAnimationFrame(positionLineShapeMenu);
  }
});

document.querySelectorAll('[data-line-shape]').forEach(b=>b.addEventListener('click',e=>{
  e.stopPropagation();
  selectShapeTool(b.dataset.lineShape);
}));

document.addEventListener('click',e=>{
  if(!e.target.closest('.line-tool-wrap')&&!e.target.closest('.line-shape-menu')){
    document.getElementById('line-shape-menu').hidden=true;
  }
});

window.addEventListener('resize',positionLineShapeMenu);
document.querySelector('.desktop-ribbon')?.addEventListener('scroll',positionLineShapeMenu);

/* PDFBreeze v5.1.1 — task-first toolbar order */
(function arrangeEditorToolbar(){
  const ribbon=document.querySelector('.desktop-ribbon');
  if(!ribbon)return;
  [
    'undo-tool','redo-tool','add-text-tool','edit-text-tool','sign-tool','image-tool',
    'draw-tool','text-highlight-tool','link-tool','note-tool','stamp-tool',
    'watermark-tool','crop-tool','line-tool','manage-tool'
  ].forEach(id=>{
    const item=id==='line-tool'?document.getElementById(id)?.closest('.line-tool-wrap'):document.getElementById(id);
    if(item)ribbon.appendChild(item);
  });
})();

function updateSelectedShapeProperty(fn){const s=getSelectedShape();if(s){recordHistory();fn(s);renderAnnotations()}}
document.getElementById('line-stroke-colour').addEventListener('input',e=>{editor.shapeStroke=e.target.value;const s=getSelectedShape();if(s){s.stroke=e.target.value;renderAnnotations()}});document.getElementById('line-stroke-colour').addEventListener('change',()=>{if(getSelectedShape())recordHistory()});
document.getElementById('line-fill-colour').addEventListener('input',e=>{editor.shapeFill=e.target.value;const s=getSelectedShape();if(s){s.fill=e.target.value;renderAnnotations()}});document.getElementById('line-fill-enabled').addEventListener('change',e=>{editor.shapeFillEnabled=e.target.checked;updateSelectedShapeProperty(s=>s.fillEnabled=e.target.checked)});
document.getElementById('line-opacity').addEventListener('input',e=>{editor.shapeOpacity=Number(e.target.value)/100;document.getElementById('line-opacity-value').textContent=`${e.target.value}%`;const s=getSelectedShape();if(s){s.opacity=editor.shapeOpacity;renderAnnotations()}});document.getElementById('line-thickness').addEventListener('change',e=>{editor.shapeThickness=Number(e.target.value)||2;updateSelectedShapeProperty(s=>s.thickness=editor.shapeThickness)});

function setDrawTool(tool){
  editor.drawTool=tool;
  document.getElementById('draw-marker-tool').classList.toggle('active',tool==='marker');
  document.getElementById('draw-highlighter-tool').classList.toggle('active',tool==='highlighter');
  document.getElementById('draw-eraser-tool').classList.toggle('active',tool==='eraser');
  document.getElementById('annotation-layer').classList.toggle('eraser-mode',tool==='eraser');
}
document.getElementById('draw-tool').addEventListener('click',()=>{
  clearEditTextInterfaceImmediately();editor.selectedSignatureId=null;setEditorMode('draw');setDrawTool(editor.drawTool);renderAnnotations();
});
document.getElementById('draw-marker-tool').addEventListener('click',()=>setDrawTool('marker'));
document.getElementById('draw-highlighter-tool').addEventListener('click',()=>setDrawTool('highlighter'));
document.getElementById('draw-eraser-tool').addEventListener('click',()=>setDrawTool('eraser'));
document.getElementById('draw-thickness').addEventListener('change',e=>editor.drawThickness=Number(e.target.value)||4);
document.querySelectorAll('[data-draw-colour]').forEach(b=>b.addEventListener('click',()=>{
  editor.drawColour=b.dataset.drawColour;document.getElementById('draw-custom-colour').value=editor.drawColour;
  document.querySelectorAll('[data-draw-colour]').forEach(x=>x.classList.toggle('active',x===b));
}));
document.getElementById('draw-custom-colour').addEventListener('input',e=>{
  editor.drawColour=e.target.value;document.querySelectorAll('[data-draw-colour]').forEach(x=>x.classList.remove('active'));
});
document.getElementById('draw-clear-page').addEventListener('click',()=>{
  if(!editor.pages.length)return;const key=String(editor.pages[editor.selectedIndex].sourceIndex);
  if(!(editor.drawings[key]||[]).length)return;recordHistory();editor.drawings[key]=[];renderAnnotations();
});

const signatureState = {
  tab: 'draw',
  colour: '#111111',
  drawing: false,
  hasDrawing: false,
  imageDataUrl: null,
  typedFont: 'Caveat'
};

const signatureModal = document.getElementById('signature-modal');
const signatureCanvas = document.getElementById('signature-draw-canvas');
const signatureContext = signatureCanvas.getContext('2d', {willReadFrequently: true});

function resetSignatureCanvas() {
  signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureContext.lineCap = 'round';
  signatureContext.lineJoin = 'round';
  signatureContext.lineWidth = 7;
  signatureContext.strokeStyle = signatureState.colour;
  signatureState.hasDrawing = false;
  updateSignatureDoneState();
}

function updateTypedSignaturePreview() {
  const input = document.getElementById('signature-name-input');
  const action = document.getElementById('signature-clear-type');
  const value = input.value.trim();
  const hasValue = Boolean(value);

  input.style.fontFamily = `"${signatureState.typedFont}", cursive`;
  input.style.color = signatureState.colour;

  action.textContent = hasValue ? 'Clear Signature' : 'Sign Here';
  action.classList.toggle('has-value', hasValue);

  document.querySelectorAll('.signature-font-choice span').forEach(span => {
    span.textContent = value || 'Signature';
    span.style.color = signatureState.colour;
  });

  updateSignatureDoneState();
}

function updateSignatureDoneState() {
  const done = document.getElementById('signature-done');
  done.disabled =
    signatureState.tab === 'draw' ? !signatureState.hasDrawing :
    signatureState.tab === 'image' ? !signatureState.imageDataUrl :
    !document.getElementById('signature-name-input').value.trim();
}

function switchSignatureTab(tab) {
  signatureState.tab = tab;
  document.querySelectorAll('.signature-tab').forEach(button => {
    button.classList.toggle('active', button.dataset.signatureTab === tab);
  });
  document.querySelectorAll('[data-signature-panel]').forEach(panel => {
    const active = panel.dataset.signaturePanel === tab;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  updateSignatureDoneState();

  if (tab === 'type') {
    requestAnimationFrame(() => {
      const input = document.getElementById('signature-name-input');
      input.focus({preventScroll:true});
    });
  }
}

function openSignatureModal() {
  clearEditTextInterfaceImmediately();
  setEditorMode('select');
  document.getElementById('sign-tool')?.classList.add('active');
  signatureModal.hidden = false;
  switchSignatureTab('draw');
  resetSignatureCanvas();
}

function closeSignatureModal() {
  signatureModal.hidden = true;
  document.getElementById('sign-tool')?.classList.remove('active');
}

function signatureCanvasPoint(event) {
  const rect = signatureCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * signatureCanvas.width / rect.width,
    y: (event.clientY - rect.top) * signatureCanvas.height / rect.height
  };
}

signatureCanvas.addEventListener('pointerdown', event => {
  event.preventDefault();
  signatureState.drawing = true;
  signatureCanvas.setPointerCapture(event.pointerId);
  const point = signatureCanvasPoint(event);
  signatureContext.beginPath();
  signatureContext.moveTo(point.x, point.y);
});

signatureCanvas.addEventListener('pointermove', event => {
  if (!signatureState.drawing) return;
  event.preventDefault();
  const point = signatureCanvasPoint(event);
  signatureContext.strokeStyle = signatureState.colour;
  signatureContext.lineTo(point.x, point.y);
  signatureContext.stroke();
  signatureState.hasDrawing = true;
  updateSignatureDoneState();
});

function endSignatureStroke(event) {
  if (!signatureState.drawing) return;
  signatureState.drawing = false;
  try { signatureCanvas.releasePointerCapture(event.pointerId); } catch (_) {}
}
signatureCanvas.addEventListener('pointerup', endSignatureStroke);
signatureCanvas.addEventListener('pointercancel', endSignatureStroke);

document.querySelectorAll('.signature-tab').forEach(button => {
  button.addEventListener('click', () => switchSignatureTab(button.dataset.signatureTab));
});

document.querySelectorAll('[data-signature-colour]').forEach(button => {
  button.addEventListener('click', () => {
    signatureState.colour = button.dataset.signatureColour;
    document.querySelectorAll('[data-signature-colour]').forEach(item => item.classList.toggle('active', item === button));
    signatureContext.strokeStyle = signatureState.colour;
    updateTypedSignaturePreview();
  });
});

document.getElementById('signature-clear-draw').addEventListener('click', resetSignatureCanvas);
document.getElementById('signature-clear-type').addEventListener('click', () => {
  const input = document.getElementById('signature-name-input');
  if (!input.value.trim()) {
    input.focus();
    return;
  }

  input.value = '';
  updateTypedSignaturePreview();
  input.focus();
});
document.getElementById('signature-name-input').addEventListener('input', updateTypedSignaturePreview);

document.querySelectorAll('input[name="signature-font"]').forEach(input => {
  input.addEventListener('change', () => {
    signatureState.typedFont = input.value;
    document.querySelectorAll('.signature-font-choice').forEach(label => {
      label.classList.toggle('active', label.contains(input) && input.checked);
    });
    updateTypedSignaturePreview();
  });
});

function loadSignatureImage(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
    showAlert('Please choose a PNG, JPG or WEBP image.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    signatureState.imageDataUrl = reader.result;
    const preview = document.getElementById('signature-image-preview');
    preview.src = reader.result;
    preview.hidden = false;
    document.querySelector('.signature-upload-button').hidden = true;
    updateSignatureDoneState();
  };
  reader.readAsDataURL(file);
}

document.getElementById('signature-image-input').addEventListener('change', event => {
  loadSignatureImage(event.target.files[0]);
  event.target.value = '';
});

const signatureUploadZone = document.getElementById('signature-upload-zone');
['dragenter','dragover'].forEach(name => signatureUploadZone.addEventListener(name, event => {
  event.preventDefault();
  signatureUploadZone.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => signatureUploadZone.addEventListener(name, event => {
  event.preventDefault();
  signatureUploadZone.classList.remove('dragover');
}));
signatureUploadZone.addEventListener('drop', event => loadSignatureImage(event.dataTransfer.files[0]));

function trimCanvasToContent(sourceCanvas) {
  const context = sourceCanvas.getContext('2d', {willReadFrequently: true});
  const {width, height} = sourceCanvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width, right = 0, top = height, bottom = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) return sourceCanvas;

  const padding = 18;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);

  const output = document.createElement('canvas');
  output.width = right - left + 1;
  output.height = bottom - top + 1;
  output.getContext('2d').drawImage(
    sourceCanvas,
    left, top, output.width, output.height,
    0, 0, output.width, output.height
  );
  return output;
}

async function createTypedSignatureCanvas() {
  const text = document.getElementById('signature-name-input').value.trim();
  await document.fonts.load(`72px "${signatureState.typedFont}"`);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 300;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = signatureState.colour;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `72px "${signatureState.typedFont}", cursive`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  return trimCanvasToContent(canvas);
}

async function resolveSignatureData() {
  if (signatureState.tab === 'draw') {
    const trimmed = trimCanvasToContent(signatureCanvas);
    return {
      dataUrl: trimmed.toDataURL('image/png'),
      aspect: trimmed.width / trimmed.height,
      source: 'draw'
    };
  }

  if (signatureState.tab === 'image') {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = signatureState.imageDataUrl;
    });
    return {
      dataUrl: signatureState.imageDataUrl,
      aspect: image.naturalWidth / image.naturalHeight,
      source: 'image'
    };
  }

  const typed = await createTypedSignatureCanvas();
  return {
    dataUrl: typed.toDataURL('image/png'),
    aspect: typed.width / typed.height,
    source: 'type'
  };
}

document.getElementById('signature-done').addEventListener('click', async event => {
  const button = event.currentTarget;
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = 'Preparing…';

  try {
    editor.pendingSignature = await resolveSignatureData();
    closeSignatureModal();
    placePendingSignatureCentered();
    showEditorHint('Drag the signature to position it. Use the blue handles to resize.');
  } catch (_) {
    showAlert('PDFBreeze could not prepare that signature.');
  } finally {
    button.textContent = 'Done';
    updateSignatureDoneState();
  }
});

document.getElementById('sign-tool').addEventListener('click', openSignatureModal);
document.getElementById('signature-cancel').addEventListener('click', closeSignatureModal);
document.getElementById('signature-close').addEventListener('click', closeSignatureModal);
document.querySelector('[data-close-signature]').addEventListener('click', closeSignatureModal);


document.addEventListener('click', event => {
  const toolButton = event.target.closest(
    '.editor-tool-button, .tool-button, [data-editor-tool], .ribbon-tool'
  );

  if (!toolButton) return;

  if (editor.mode === 'watermark' && toolButton.id !== 'watermark-tool') {
    setEditorMode('select');
  }

  if (toolButton.id === 'edit-text-tool' || toolButton.id === 'sign-tool' || toolButton.id === 'draw-tool' || toolButton.id === 'text-highlight-tool' || toolButton.id === 'line-tool' || toolButton.id === 'watermark-tool') return;

  if (editor.mode === 'edit-existing') {
    clearEditTextInterfaceImmediately();

    // Placeholder tools do not yet have their own mode handler, so move the
    // editor to neutral select mode while preserving the user's edits.
    if (toolButton.id !== 'add-text-tool') {
      editor.mode = 'select';

      document.getElementById('edit-text-tool')?.classList.remove('active');
      document.getElementById('add-text-tool')?.classList.remove('active');

      const addOptionsBar = document.getElementById('text-options-bar');
      if (addOptionsBar) addOptionsBar.hidden = true;

      const layer = document.getElementById('annotation-layer');
      layer?.classList.remove('text-mode', 'edit-text-mode', 'add-edit-box-mode');
      layer?.classList.add('select-mode');
    }
  }
}, true);

document.getElementById('edit-add-text-box').addEventListener('click', () => {
  editor.editTextBoxMode = !editor.editTextBoxMode;
  const button = document.getElementById('edit-add-text-box');
  button.classList.toggle('active', editor.editTextBoxMode);
  document.getElementById('annotation-layer').classList.toggle('add-edit-box-mode', editor.editTextBoxMode);
  if (editor.editTextBoxMode) showEditorHint('Click anywhere on the document to create a text box.');
});

document.getElementById('edit-text-colour-button').addEventListener('click', event => {
  event.stopPropagation();
  const menu = document.getElementById('edit-colour-menu');
  menu.hidden = !menu.hidden;
});

document.querySelectorAll('[data-edit-colour]').forEach(button => {
  button.addEventListener('click', event => {
    event.stopPropagation();
    const colour = button.dataset.editColour;
    document.getElementById('edit-colour-line').style.background = colour;
    applyColourToCurrentSelection(colour);
    document.getElementById('edit-colour-menu').hidden = true;
  });
});

document.addEventListener('click', event => {
  if (!event.target.closest('.colour-dropdown')) {
    const menu = document.getElementById('edit-colour-menu');
    if (menu) menu.hidden = true;
  }
});

document.getElementById('edit-text-font').addEventListener('change', event => {
  updateEditTarget(item => item.font = event.target.value);
});

document.getElementById('edit-text-size').addEventListener('change', event => {
  updateEditTarget(item => {
    item.pdfFontSize = Math.max(4, Math.min(200, Number(event.target.value) || 18));
    item.fontSizeChanged = true;
  });
});

document.getElementById('edit-text-bold').addEventListener('click', () => {
  updateEditTarget(item => {
    item.bold = !item.bold;
    item.fontWeight = item.bold ? 700 : 400;
  });
});

document.getElementById('edit-text-italic').addEventListener('click', () => {
  updateEditTarget(item => item.italic = !item.italic);
});

document.getElementById('download-edited-pdf').addEventListener('click', openFormatModal);

document.querySelectorAll('[data-close-export]').forEach(button => {
  button.addEventListener('click', closeFormatModal);
});
document.querySelectorAll('[data-close-email]').forEach(button => {
  button.addEventListener('click', closeEmailModal);
});

document.getElementById('continue-to-email').addEventListener('click', async event => {
  const button = event.currentTarget;
  const rawName = document.getElementById('export-filename').value.trim();
  const safeName = (rawName || editor.file.name.replace(/\.pdf$/i, ''))
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\.+$/g, '')
    .trim();

  preparedExportFilename = `${safeName || 'pdfbreeze-document'}.pdf`;
  button.disabled = true;
  button.textContent = 'Preparing…';

  try {
    // A file opened from My Files is already inside an authenticated member
    // workflow. Bypass the public paywall before it is ever rendered.
    if (isDashboardEditorSession() || await hasUnlimitedPaidAccess()) {
      const format = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
      closeFormatModal();
      await exportEditedDocument(format);
      await pendingDashboardFileSave;
      window.location.assign('dashboard.html?updated=1');
      return;
    }
    preparedExportBytes = await createEditedPdfBytes();
    openEmailModal();
  } catch (error) {
    showAlert('PDFBreeze could not prepare this PDF.');
  } finally {
    button.disabled = false;
    button.textContent = 'Download';
  }
});


let selectedAccessPlan = {
  value: 'full',
  name: '7-day full access',
  price: 1.00,
  disclosure: 'Renews at £49.99 every four weeks after seven days unless cancelled beforehand.'
};

function formatPounds(value) {
  return new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'GBP'}).format(value);
}

async function renderCheckoutPreview(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !editor.pdfjs || !editor.pages.length) return;

  const state = editor.pages[0];
  const page = await editor.pdfjs.getPage(state.sourceIndex + 1);
  const base = page.getViewport({scale: 1, rotation: state.rotation});
  const targetWidth = canvasId === 'plan-preview-canvas' ? 430 : 70;
  const viewport = page.getViewport({scale: targetWidth / base.width, rotation: state.rotation});
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
}

function closeEditorCheckoutOverlays() {
  closeEmailModal();
  closeFormatModal();
}

async function openAccessPage() {
  closeEditorCheckoutOverlays();
  document.getElementById('access-page').hidden = false;
  await renderCheckoutPreview('plan-preview-canvas');
}

function closeAccessPage() {
  document.getElementById('access-page').hidden = true;
}

async function openPaymentPage() {
  const checked = document.querySelector('input[name="access-plan"]:checked');
  if (!checked) return;
  const option = checked.closest('.plan-option');
  const planName = option.querySelector('.plan-copy strong').textContent;
  const price = Number(checked.dataset.price);

  let disclosure = 'One-time access with no automatic renewal.';
  if (checked.value === 'limited' || checked.value === 'full') disclosure = 'Renews at £49.99 every four weeks after seven days unless cancelled beforehand.';
  if (checked.value === 'annual') disclosure = 'Billed £299.99 annually until cancelled.';

  selectedAccessPlan = {value: checked.value, name: planName, price, disclosure};

  const summaryValues = {
    'summary-plan-name': planName,
    'summary-plan-price': formatPounds(price),
    'summary-due-today': formatPounds(price),
    'summary-total': formatPounds(price),
    'summary-renewal': disclosure,
    'summary-filename': preparedExportFilename || editor.file?.name || 'document.pdf'
  };
  Object.entries(summaryValues).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  closeAccessPage();
  document.getElementById('payment-page').hidden = false;
  await renderCheckoutPreview('payment-preview-canvas');
  try {
    await prepareStripePaymentElement();
  } catch (error) {
    showStripeError(error.message || 'Secure payment could not be loaded.');
    const payButton = document.getElementById('mock-pay-button');
    if (payButton) payButton.disabled = true;
  }
}

function closePaymentPage() {
  document.getElementById('payment-page').hidden = true;
}

document.querySelectorAll('input[name="access-plan"]').forEach(input => {
  input.addEventListener('change', event => {
    document.querySelectorAll('.plan-option').forEach(option => option.classList.remove('selected'));
    const option = event.currentTarget.closest('.plan-option');
    option.classList.add('selected');

    const disclosure = document.getElementById('plan-disclosure');
    if (event.currentTarget.value === 'limited') {
      disclosure.textContent = 'Seven-day access to this document costs £0.50 today, then renews at £49.99 every four weeks unless cancelled.';
    } else if (event.currentTarget.value === 'annual') {
      disclosure.textContent = 'Annual unlimited access is charged at £299.99 today and every year until cancelled.';
    } else {
      disclosure.textContent = 'Seven-day unlimited access costs £1 today. Unless cancelled, it renews at £49.99 every four weeks after the trial.';
    }
  });
});

document.getElementById('plan-continue').addEventListener('click', openPaymentPage);
document.getElementById('back-to-plans').addEventListener('click', () => {
  closePaymentPage();
  document.getElementById('access-page').hidden = false;
});

document.querySelectorAll('.payment-method').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.payment-method').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const isCard = button.dataset.paymentMethod === 'card';
    document.getElementById('card-payment-panel').hidden = !isCard;
    document.getElementById('paypal-payment-panel').hidden = isCard;
  });
});

function openDemoPaymentNotice() {
  document.getElementById('demo-payment-modal').hidden = false;
}
let pendingCheckoutBlob = null;
let pendingCheckoutFilename = '';
let stripeClient = null;
let stripeElements = null;
let stripeIntentType = null;
let stripeElementPlan = null;
const stripeCheckoutDocumentKey = crypto.randomUUID?.() || `document-${Date.now()}`;

function loadStripeLibrary() {
  if (window.Stripe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pdfbreeze-stripe]');
    if (existing) {
      existing.addEventListener('load', resolve, {once: true});
      existing.addEventListener('error', reject, {once: true});
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.dataset.pdfbreezeStripe = 'true';
    script.addEventListener('load', resolve, {once: true});
    script.addEventListener('error', () => reject(new Error('Stripe could not load.')), {once: true});
    document.head.appendChild(script);
  });
}

function stripePlanCode() {
  if (selectedAccessPlan.value === 'limited') return 'document_trial';
  if (selectedAccessPlan.value === 'annual') return 'annual';
  return 'unlimited_trial';
}

function showStripeError(message) {
  let error = document.getElementById('stripe-payment-error');
  if (!error) {
    error = document.createElement('p');
    error.id = 'stripe-payment-error';
    error.className = 'payment-consent-warning';
    document.getElementById('stripe-payment-element')?.insertAdjacentElement('afterend', error);
  }
  error.textContent = message || '';
  error.hidden = !message;
}

async function prepareStripePaymentElement() {
  const panel = document.getElementById('card-payment-panel');
  const config = window.PDFMINT_CONFIG?.stripe;
  if (!panel || !config?.publishableKey) throw new Error('Stripe checkout is not configured.');

  [...panel.querySelectorAll('.payment-field, .payment-field-row, .express-payment-row')]
    .forEach(element => {
      element.hidden = true;
      element.style.setProperty('display', 'none', 'important');
    });
  let mount = document.getElementById('stripe-payment-element');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'stripe-payment-element';
    mount.textContent = 'Loading secure payment…';
    panel.prepend(mount);
  }

  const session = await window.PDFMintAuth?.getSession?.();
  if (!session?.access_token) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    window.location.assign(`login.html?mode=signup&returnTo=${returnTo}`);
    return;
  }

  const plan = stripePlanCode();
  if (stripeElements && stripeElementPlan === plan) return;
  await loadStripeLibrary();

  const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl}/v1/billing/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      plan,
      document_key: plan === 'document_trial' ? stripeCheckoutDocumentKey : null
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || 'PDFBreeze could not start secure checkout.');

  mount.replaceChildren();
  stripeClient = window.Stripe(config.publishableKey);
  stripeIntentType = result.intent_type;
  stripeElements = stripeClient.elements({
    clientSecret: result.client_secret,
    appearance: {
      theme: 'stripe',
      variables: {colorPrimary: '#21b887', borderRadius: '8px', fontFamily: 'Poppins, Arial, sans-serif'}
    }
  });
  stripeElements.create('payment', {layout: 'tabs'}).mount('#stripe-payment-element');
  stripeElementPlan = plan;
  showStripeError('');
}

function triggerPreparedDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function finishMockCheckout() {
  try {
    const cardInputs = [...document.querySelectorAll('#card-payment-panel input:not([type="checkbox"])')];
    const cardDigits = String(cardInputs[1]?.value || '').replace(/\D/g, '');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
    localStorage.setItem('pdfmintSelectedPlan', JSON.stringify(selectedAccessPlan || {}));
    localStorage.setItem('pdfmintAccountCreatedAt', new Date().toISOString());
    localStorage.setItem('pdfmintPaymentCard', JSON.stringify({
      name: String(cardInputs[0]?.value || '').trim(),
      lastFour: cardDigits.slice(-4) || '2721',
      expiry: String(cardInputs[2]?.value || '08/31').replace(/\s/g, ''),
      timezone
    }));
    localStorage.setItem('pdfmintPaymentTimezone', timezone);
  } catch (error) {
    console.warn('PDFBreeze could not save the local account preview state.', error);
  }

  // Give the browser time to accept the download before replacing the editor.
  window.setTimeout(() => {
    if (window.PDFMintAuth?.isSignedIn?.()) {
      window.location.assign('dashboard.html?welcome=1');
      return;
    }
    const email = sessionStorage.getItem('pdfmintPendingEmail') || '';
    sessionStorage.setItem('pdfmintCheckoutAccess', JSON.stringify({
      email,
      completedAt: Date.now()
    }));
    window.location.assign('dashboard.html?welcome=1');
  }, 350);
}

function validateMockCheckout() {
  const consent = document.querySelector('#card-payment-panel .payment-consent input');
  const consentLabel = consent?.closest('.payment-consent');
  const warning = document.getElementById('payment-consent-warning');
  const requiredFields = [...document.querySelectorAll('#card-payment-panel input:not([type="checkbox"])')]
    .filter(input => input.dataset.paymentField !== 'billingPostcode');
  let valid = true;

  requiredFields.forEach(input => {
    const empty = !String(input.value || '').trim();
    input.classList.toggle('payment-invalid', empty);
    if (empty) valid = false;
  });

  const consentMissing = !consent?.checked;
  consentLabel?.classList.toggle('payment-consent-error', consentMissing);
  if (warning) warning.hidden = !consentMissing;
  if (consentMissing) valid = false;

  return valid;
}

document.getElementById('mock-pay-button').addEventListener('click', async () => {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const consent = document.querySelector('#card-payment-panel .payment-consent input');
  const warning = document.getElementById('payment-consent-warning');
  if (!consent?.checked) {
    if (warning) warning.hidden = false;
    return;
  }
  try {
    if (!stripeElements) await prepareStripePaymentElement();
    const confirmation = stripeIntentType === 'setup' ? stripeClient.confirmSetup : stripeClient.confirmPayment;
    const {error} = await confirmation({
      elements: stripeElements,
      confirmParams: {return_url: `${location.origin}/dashboard.html?payment=complete`},
      redirect: 'if_required'
    });
    if (error) {
      showStripeError(error.message || 'Payment could not be completed.');
      return;
    }
    if (pendingCheckoutBlob && pendingCheckoutFilename) {
      triggerPreparedDownload(pendingCheckoutBlob, pendingCheckoutFilename);
      await window.PDFMintAuth?.saveDocument?.(pendingCheckoutBlob, pendingCheckoutFilename, 'paid-download')
        .catch(saveError => console.warn('PDFBreeze could not save the paid document.', saveError));
      pendingCheckoutBlob = null;
      pendingCheckoutFilename = '';
    }
    window.setTimeout(() => window.location.assign('dashboard.html?payment=complete'), 350);
  } catch (error) {
    showStripeError(error.message || 'Payment could not be completed.');
  }
});
document.getElementById('mock-paypal-button').addEventListener('click', openDemoPaymentNotice);
document.getElementById('close-demo-payment').addEventListener('click', () => {
  document.getElementById('demo-payment-modal').hidden = true;
});
document.getElementById('return-to-payment').addEventListener('click', () => {
  document.getElementById('demo-payment-modal').hidden = true;
});

function preparePaymentPrototypeUi() {
  const accessTitle = document.getElementById('access-title');
  const paymentTitle = document.getElementById('payment-title');
  const payButton = document.getElementById('mock-pay-button');
  const cardPanel = document.getElementById('card-payment-panel');
  const consent = cardPanel?.querySelector('.payment-consent input');
  const consentCopy = cardPanel?.querySelector('.payment-consent span');
  const orderSummary = document.querySelector('.order-summary-card');

  document.querySelectorAll('.recommended-ribbon').forEach(ribbon => {
    ribbon.textContent = 'Top Choice';
  });
  document.querySelectorAll('.secure-payment-note').forEach(note => {
    note.textContent = 'Secure, encrypted payment processing.';
  });

  const paymentInputs = [...(cardPanel?.querySelectorAll('input:not([type="checkbox"])') || [])];
  const paymentFieldConfig = [
    ['cardholderName', 'cc-name'],
    ['cardNumber', 'cc-number'],
    ['cardExpiry', 'cc-exp'],
    ['cardCvc', 'cc-csc'],
    ['billingPostcode', 'postal-code']
  ];
  paymentInputs.forEach((input, index) => {
    const config = paymentFieldConfig[index];
    if (!config) return;
    input.name = config[0];
    input.autocomplete = config[1];
    input.setAttribute('data-payment-field', config[0]);
  });

  if (accessTitle) accessTitle.textContent = 'Select a plan to download your document';
  if (paymentTitle) paymentTitle.textContent = "You're on the last step before receiving your document";
  if (payButton) payButton.textContent = '🔒  Pay and download document';

  const annualInput = document.querySelector('input[name="access-plan"][value="annual"]');
  if (annualInput) annualInput.dataset.price = '299.99';
  const annualSubtext = annualInput?.closest('.plan-option')?.querySelector('.plan-copy small');
  if (annualSubtext) annualSubtext.textContent = 'Unlimited access · billed £299.99 yearly';
  const annualPrice = annualInput?.closest('.plan-option')?.querySelector('.plan-price');
  if (annualPrice) annualPrice.innerHTML = '£25.00<span>/month equivalent</span>';

  document.querySelectorAll('.plan-benefits div').forEach(item => {
    if (item.textContent.includes('Convert PDFs to and from common formats')) {
      item.lastChild.textContent = ' Convert all popular file formats';
    }
  });

  const planBenefits = document.querySelector('.plan-benefits');
  if (planBenefits && !planBenefits.querySelector('[data-benefit="form-templates"]')) {
    const templatesBenefit = document.createElement('div');
    templatesBenefit.dataset.benefit = 'form-templates';
    templatesBenefit.innerHTML = '<span>✓</span> Access to ready-made form templates';
    planBenefits.appendChild(templatesBenefit);
  }

  const updatePlanBenefits = planValue => {
    const benefitItems = [...document.querySelectorAll('.plan-benefits > div')];
    benefitItems.forEach((item, index) => {
      let copy = item.querySelector('.benefit-copy');
      if (!copy) {
        const textNodes = [...item.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        copy = document.createElement('span');
        copy.className = 'benefit-copy';
        copy.textContent = textNodes.map(node => node.textContent.trim()).join(' ');
        textNodes.forEach(node => node.remove());
        item.appendChild(copy);
      }
      const unavailable = planValue === 'limited' && index >= benefitItems.length - 3;
      item.classList.toggle('benefit-unavailable', unavailable);
      const icon = item.querySelector('span:not(.benefit-copy)');
      if (icon) icon.textContent = unavailable ? '×' : '✓';
    });
  };
  document.querySelectorAll('input[name="access-plan"]').forEach(input => {
    input.addEventListener('change', () => updatePlanBenefits(input.value));
  });
  updatePlanBenefits(document.querySelector('input[name="access-plan"]:checked')?.value || 'full');

  const planDisclosure = document.getElementById('plan-disclosure');
  if (planDisclosure) {
    planDisclosure.innerHTML = '<p>After 7 days, the price is £49 with auto-renewal. Billed every 4 weeks. Cancel anytime.</p><p><strong>7-day money-back guarantee.</strong> You may cancel by contacting our customer support team via email at <a href="mailto:support@pdfbreeze.net">support@pdfbreeze.net</a> or by phone at <a href="tel:+442079460182">+44 (0)20 7946 0182</a>.</p><p>To access your first document for free after a 3 hour delay please <a href="mailto:support@pdfbreeze.net?subject=Free%20document%20download">click here</a>.</p>';
    document.querySelectorAll('input[name="access-plan"]').forEach(input => input.addEventListener('change', () => {
      planDisclosure.innerHTML = '<p>After 7 days, the price is £49 with auto-renewal. Billed every 4 weeks. Cancel anytime.</p><p><strong>7-day money-back guarantee.</strong> You may cancel by contacting our customer support team via email at <a href="mailto:support@pdfbreeze.net">support@pdfbreeze.net</a> or by phone at <a href="tel:+442079460182">+44 (0)20 7946 0182</a>.</p><p>To access your first document for free after a 3 hour delay please <a href="mailto:support@pdfbreeze.net?subject=Free%20document%20download">click here</a>.</p>';
    }));
  }

  if (consent) consent.checked = false;
  if (consentCopy) {
    consentCopy.innerHTML = 'By continuing, you agree to the <a href="terms-of-use.html" target="_blank">Terms of Use &amp; Service</a>, <a href="privacy-policy.html" target="_blank">Privacy Policy</a>, and confirm that if you do not cancel at least 24 hours before the end of the 7-day trial for £1, you will be charged £49 per 28 days until you cancel your subscription by contacting our customer support team via email at <a href="mailto:billing@pdfbreeze.net">billing@pdfbreeze.net</a> or in your account settings. Payments will be charged from the card you specified above. This charge will appear on your credit card statement as pdfbreeze.net.';
  }

  if (orderSummary) {
    orderSummary.querySelector('#summary-renewal')?.remove();
    orderSummary.querySelector('.summary-line.muted')?.remove();
    const firstPrice = orderSummary.querySelector('.summary-line');
    const guarantees = orderSummary.querySelector('.summary-guarantees');
    const totalToday = orderSummary.querySelector('.summary-total');
    if (firstPrice && guarantees) {
      guarantees.innerHTML = '<div><span>&#10003;</span><p><strong>Unlimited edits</strong></p></div><div><span>&#10003;</span><p><strong>Unlimited downloads</strong></p></div><div><span>&#10003;</span><p><strong>Convert to any format</strong></p></div><div><span>&#10003;</span><p><strong>Sign your docs online</strong></p></div><div><span>&#10003;</span><p><strong>Create your own forms</strong></p></div>';
      firstPrice.insertAdjacentElement('afterend', guarantees);
      if (totalToday) guarantees.insertAdjacentElement('afterend', totalToday);
    }
  }

  if (cardPanel && !document.getElementById('payment-consent-warning')) {
    const warning = document.createElement('p');
    warning.id = 'payment-consent-warning';
    warning.className = 'payment-consent-warning';
    warning.hidden = true;
    warning.textContent = '⚠ You must check the box below';
    const consentLabel = cardPanel.querySelector('.payment-consent');
    cardPanel.insertBefore(warning, consentLabel);
  }

  if (cardPanel && !document.querySelector('.express-payment-row')) {
    const express = document.createElement('div');
    express.className = 'express-payment-row';
    express.innerHTML = '<button type="button" aria-label="Google Pay">G Pay</button><button type="button" aria-label="Apple Pay">● Pay</button><div><span></span><strong>Pay with card</strong><span></span></div>';
    cardPanel.prepend(express);
    express.querySelectorAll('button').forEach(button => button.addEventListener('click', openDemoPaymentNotice));
  }

  cardPanel?.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    input.classList.remove('payment-invalid');
    if (input.type === 'checkbox' && input.checked) {
      input.closest('.payment-consent')?.classList.remove('payment-consent-error');
      const warning = document.getElementById('payment-consent-warning');
      if (warning) warning.hidden = true;
    }
  }));

  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') === 'plans') document.getElementById('access-page').hidden = false;
  if (params.get('preview') === 'payment') document.getElementById('payment-page').hidden = false;
}

preparePaymentPrototypeUi();



const PDFMINT_ENGINE_URL = String(
  window.PDFMINT_CONFIG?.engineBaseUrl ||
  window.PDFMINT_CONFIG?.conversionApiBaseUrl ||
  'https://pdfmint-engine-5dfdx.sevalla.app'
).replace(/\/+$/, '');

let pdfMintEngineHealth = {
  checkedAt: 0,
  available: false
};



let pdfMintExportTimer = null;
let pdfMintExportStartedAt = 0;
let pdfMintExportEstimatedSeconds = 0;
let pdfMintExportDisplayedProgress = 0;
let pdfMintExportFormat = '';

function stopExportCountdown() {
  if (pdfMintExportTimer) {
    clearInterval(pdfMintExportTimer);
    pdfMintExportTimer = null;
  }

  const eta = document.getElementById('export-progress-eta');
  if (eta) eta.hidden = true;
}

function updateSimpleProgressMessage() {
  const eta = document.getElementById('export-progress-eta');
  const message = document.getElementById('export-progress-simple-message');
  if (!eta || !message || !pdfMintExportFormat) return;

  const elapsed = (Date.now() - pdfMintExportStartedAt) / 1000;
  const remaining = Math.max(0, pdfMintExportEstimatedSeconds - elapsed);

  eta.hidden = false;

  if (remaining <= 2) {
    message.textContent = 'Nearly ready…';
  } else if (pdfMintExportFormat === 'doc') {
    message.textContent = 'Usually ready in around 10 seconds';
  } else if (pdfMintExportFormat === 'docx') {
    message.textContent = 'Usually ready in a few seconds';
  } else if (pdfMintExportFormat === 'xlsx') {
    message.textContent = 'Usually ready in a few seconds';
  } else if (pdfMintExportFormat === 'xls') {
    message.textContent = 'Usually ready in around 7 seconds';
  } else if (pdfMintExportFormat === 'pptx') {
    message.textContent = 'Usually ready in a few seconds';
  } else if (pdfMintExportFormat === 'ppt') {
    message.textContent = 'Usually ready in around 7 seconds';
  } else {
    eta.hidden = true;
  }
}

function startExportCountdown(format) {
  stopExportCountdown();

  const estimates = {
    docx: 6,
    doc: 10,
    xlsx: 5,
    xls: 7,
    pptx: 5,
    ppt: 7
  };

  pdfMintExportFormat = format;
  pdfMintExportEstimatedSeconds = estimates[format] || 0;
  pdfMintExportStartedAt = Date.now();
  pdfMintExportDisplayedProgress = 2;

  if (!pdfMintExportEstimatedSeconds) return;

  updateSimpleProgressMessage();

  pdfMintExportTimer = setInterval(() => {
    updateSimpleProgressMessage();

    const elapsed = (Date.now() - pdfMintExportStartedAt) / 1000;
    const ratio = Math.min(1, elapsed / pdfMintExportEstimatedSeconds);
    const eased = 1 - Math.pow(1 - ratio, 2.1);
    const estimatedProgress = Math.min(93, 42 + eased * 51);

    if (estimatedProgress > pdfMintExportDisplayedProgress) {
      pdfMintExportDisplayedProgress = estimatedProgress;
      const bar = document.getElementById('export-progress-bar');
      const percentNode = document.getElementById('export-progress-percent');

      if (bar) bar.style.width = `${estimatedProgress}%`;
      if (percentNode) percentNode.textContent = `${Math.round(estimatedProgress)}%`;
    }
  }, 250);
}

function updateExportProgress(percent, title, detail) {
  const panel = document.getElementById('export-progress-panel');
  const titleNode = document.getElementById('export-progress-title');
  const detailNode = document.getElementById('export-progress-detail');
  const percentNode = document.getElementById('export-progress-percent');
  const bar = document.getElementById('export-progress-bar');

  if (panel) panel.hidden = false;
  const requestedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
  pdfMintExportDisplayedProgress = Math.max(pdfMintExportDisplayedProgress, requestedPercent);
  const safePercent = Math.round(pdfMintExportDisplayedProgress);

  if (requestedPercent >= 100 || String(title || '').toLowerCase().includes('could not')) {
    stopExportCountdown();
  }

  if (titleNode) titleNode.textContent = title || 'Preparing document';
  if (detailNode) detailNode.textContent = detail || '';
  if (percentNode) percentNode.textContent = `${safePercent}%`;
  if (bar) bar.style.width = `${safePercent}%`;
}

function resetExportProgress() {
  stopExportCountdown();
  pdfMintExportStartedAt = 0;
  pdfMintExportEstimatedSeconds = 0;
  pdfMintExportDisplayedProgress = 0;
  pdfMintExportFormat = '';

  const panel = document.getElementById('export-progress-panel');
  if (panel) panel.hidden = true;
  updateExportProgress(0, 'Preparing document', 'Applying your edits…');
  if (panel) panel.hidden = true;
}


async function ensurePdfMintEngineAvailable() {
  if (!PDFMINT_ENGINE_URL) {
    throw new Error('The PDFBreeze Engine URL has not been configured.');
  }

  const now = Date.now();
  if (pdfMintEngineHealth.available && now - pdfMintEngineHealth.checkedAt < 30000) {
    return;
  }

  updateExportProgress(12, 'Connecting to PDFBreeze Engine', 'Checking the conversion service…');

  let response;
  try {
    response = await fetch(`${PDFMINT_ENGINE_URL}/v1/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined
    });
  } catch (error) {
    pdfMintEngineHealth = { checkedAt: now, available: false };
    throw new Error(
      'PDFBreeze Engine is not running or cannot be reached. Start the engine and check the URL in config.js.'
    );
  }

  if (!response.ok) {
    pdfMintEngineHealth = { checkedAt: now, available: false };
    throw new Error(`PDFBreeze Engine health check failed (${response.status}).`);
  }

  const data = await response.json().catch(() => ({}));
  if (data.status !== 'ok') {
    pdfMintEngineHealth = { checkedAt: now, available: false };
    throw new Error('PDFBreeze Engine reported that it is unavailable.');
  }

  pdfMintEngineHealth = { checkedAt: now, available: true };
}

async function convertPdfThroughPdfMintEngine(pdfBlob, operation, filename) {
  await ensurePdfMintEngineAvailable();

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', pdfBlob, `${filename}.pdf`);
    form.append('operation', operation);

    const request = new XMLHttpRequest();
    request.open('POST', `${PDFMINT_ENGINE_URL}/v1/jobs`, true);
    request.responseType = 'blob';
    request.timeout = 240000;

    request.upload.addEventListener('progress', event => {
      if (!event.lengthComputable) return;
      const uploadPercent = event.loaded / event.total;
      updateExportProgress(
        25 + uploadPercent * 20,
        'Uploading securely',
        `Uploading the completed PDF… ${Math.round(uploadPercent * 100)}%`
      );
    });

    request.upload.addEventListener('load', () => {
      const formatLabel = operation.replace('pdf-to-', '').toUpperCase();
      updateExportProgress(
        50,
        `Preparing your ${formatLabel}…`,
        'Please keep this window open while your download is prepared.'
      );
    });

    request.addEventListener('load', async () => {
      if (request.status >= 200 && request.status < 300) {
        updateExportProgress(95, 'Preparing download', 'The converted document is ready.');
        resolve(request.response);
        return;
      }

      let message = `PDFBreeze Engine returned status ${request.status}.`;
      try {
        const text = await request.response.text();
        const parsed = JSON.parse(text);
        if (parsed.detail) message = parsed.detail;
      } catch (_) {}
      reject(new Error(message));
    });

    request.addEventListener('error', () => {
      reject(new Error(
        'The connection to PDFBreeze Engine was interrupted. Check that the engine is running and CORS is configured.'
      ));
    });

    request.addEventListener('timeout', () => {
      reject(new Error('The conversion took too long. Please try again.'));
    });

    request.send(form);
  });
}

async function exportEditedPdfThroughEngine(format) {
  const baseName = safeExportBaseName();
  updateExportProgress(8, `Preparing your ${format.toUpperCase()}…`, 'Please keep this window open.');
  const pdfBlob = await buildFinalEditedPdfBlob();
  updateExportProgress(20, `Preparing your ${format.toUpperCase()}…`, 'Your document is being prepared securely.');

  const operationMap = {
    docx: 'pdf-to-docx',
    doc: 'pdf-to-doc',
    xlsx: 'pdf-to-xlsx',
    xls: 'pdf-to-xls',
    pptx: 'pdf-to-pptx',
    ppt: 'pdf-to-ppt'
  };

  const operation = operationMap[format];
  if (!operation) {
    throw new Error('That server conversion format is not available.');
  }

  let convertedBlob;

  try {
    convertedBlob = await convertPdfThroughPdfMintEngine(
      pdfBlob,
      operation,
      baseName
    );
  } catch (error) {
    // Legacy PPT is the only format that gets one silent retry.
    // LibreOffice Impress can occasionally be killed on the smallest
    // Sevalla instance during a transient memory spike.
    if (format !== 'ppt') {
      throw error;
    }

    const message = String(error && error.message ? error.message : error);
    const transient =
      message.includes('503') ||
      message.toLowerCase().includes('timed out') ||
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('cannot be reached');

    if (!transient) {
      throw error;
    }

    updateExportProgress(
      74,
      'Preparing your PPT…',
      'Nearly ready…'
    );

    await new Promise(resolve => setTimeout(resolve, 2200));

    convertedBlob = await convertPdfThroughPdfMintEngine(
      pdfBlob,
      operation,
      baseName
    );
  }

  updateExportProgress(100, 'Download ready', `${baseName}.${format} is ready.`);
  downloadBlob(convertedBlob, `${baseName}.${format}`);
}

async function exportEditedPdfAsOcrDocx() {
  const baseName = safeExportBaseName();
  updateExportProgress(8, 'Preparing OCR', 'Applying your PDF edits firstâ€¦');
  const pdfBlob = await buildFinalEditedPdfBlob();
  updateExportProgress(20, 'Recognising text', 'Scanned pages may take a little longer.');
  const convertedBlob = await convertPdfThroughPdfMintEngine(pdfBlob, 'ocr-docx', baseName);
  updateExportProgress(100, 'Download ready', `${baseName}.docx is ready.`);
  downloadBlob(convertedBlob, `${baseName}.docx`);
}

async function buildFinalEditedPdfBlob() {
  const bytes = await createEditedPdfBytes();
  return new Blob([bytes], { type: 'application/pdf' });
}

function safeExportBaseName() {
  const input = document.getElementById('export-filename');
  const raw = String(input?.value || editor.file?.name || 'document')
    .replace(/\.[^.]+$/, '')
    .trim();
  return (raw || 'document').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
}

function downloadBlob(blob, filename) {
  if (isDashboardEditorSession()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    pendingDashboardFileSave = saveFileToDashboard(blob, filename);
    return;
  }
  pendingCheckoutBlob = blob;
  pendingCheckoutFilename = filename;
  preparedExportFilename = filename;
  openAccessPage();
}

async function loadPdfDocumentFromBlob(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return pdfjsLib.getDocument({ data: bytes }).promise;
}

function encodeRgbaAsTiff(imageData, width, height) {
  const entryCount = 13;
  const ifdOffset = 8;
  const ifdSize = 2 + entryCount * 12 + 4;
  const bitsOffset = ifdOffset + ifdSize;
  const xResolutionOffset = bitsOffset + 6;
  const yResolutionOffset = xResolutionOffset + 8;
  const pixelOffset = yResolutionOffset + 8;
  const pixelBytes = width * height * 3;
  const buffer = new ArrayBuffer(pixelOffset + pixelBytes);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x49; bytes[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, entryCount, true);

  let entryOffset = ifdOffset + 2;
  const entry = (tag, type, count, value) => {
    view.setUint16(entryOffset, tag, true);
    view.setUint16(entryOffset + 2, type, true);
    view.setUint32(entryOffset + 4, count, true);
    if (type === 3 && count === 1) view.setUint16(entryOffset + 8, value, true);
    else view.setUint32(entryOffset + 8, value, true);
    entryOffset += 12;
  };

  entry(256, 4, 1, width);
  entry(257, 4, 1, height);
  entry(258, 3, 3, bitsOffset);
  entry(259, 3, 1, 1);
  entry(262, 3, 1, 2);
  entry(273, 4, 1, pixelOffset);
  entry(277, 3, 1, 3);
  entry(278, 4, 1, height);
  entry(279, 4, 1, pixelBytes);
  entry(282, 5, 1, xResolutionOffset);
  entry(283, 5, 1, yResolutionOffset);
  entry(284, 3, 1, 1);
  entry(296, 3, 1, 2);
  view.setUint32(entryOffset, 0, true);

  view.setUint16(bitsOffset, 8, true);
  view.setUint16(bitsOffset + 2, 8, true);
  view.setUint16(bitsOffset + 4, 8, true);
  view.setUint32(xResolutionOffset, 300, true);
  view.setUint32(xResolutionOffset + 4, 1, true);
  view.setUint32(yResolutionOffset, 300, true);
  view.setUint32(yResolutionOffset + 4, 1, true);

  const rgba = imageData.data;
  let destination = pixelOffset;
  for (let source = 0; source < rgba.length; source += 4) {
    bytes[destination++] = rgba[source];
    bytes[destination++] = rgba[source + 1];
    bytes[destination++] = rgba[source + 2];
  }
  return new Blob([buffer], { type: 'image/tiff' });
}

async function renderPdfPageToImageBlob(pdf, pageNumber, format) {
  const page = await pdf.getPage(pageNumber);
  const PDF_POINTS_PER_INCH = 72;
  const TARGET_DPI = 300;
  const targetScale = TARGET_DPI / PDF_POINTS_PER_INCH;
  const viewport = page.getViewport({ scale: targetScale });

  const canvas = document.createElement('canvas');
  const MAX_CANVAS_PIXELS = 40_000_000;
  let renderWidth = Math.ceil(viewport.width);
  let renderHeight = Math.ceil(viewport.height);

  if (renderWidth * renderHeight > MAX_CANVAS_PIXELS) {
    const reduction = Math.sqrt(MAX_CANVAS_PIXELS / (renderWidth * renderHeight));
    renderWidth = Math.max(1, Math.floor(renderWidth * reduction));
    renderHeight = Math.max(1, Math.floor(renderHeight * reduction));
  }

  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const renderScaleX = renderWidth / viewport.width;
  const renderScaleY = renderHeight / viewport.height;
  const context = canvas.getContext('2d', { alpha: format === 'png' });

  if (format !== 'png') {
    context.save();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  await page.render({
    canvasContext: context,
    viewport,
    transform: [renderScaleX, 0, 0, renderScaleY, 0, 0]
  }).promise;

  if (format === 'tiff') {
    return encodeRgbaAsTiff(
      context.getImageData(0, 0, canvas.width, canvas.height),
      canvas.width,
      canvas.height
    );
  }

  const mime = format === 'jpg' ? 'image/jpeg'
    : format === 'webp' ? 'image/webp'
    : 'image/png';
  const quality = format === 'jpg' ? 0.92
    : format === 'webp' ? 0.9
    : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error(`Could not create ${format.toUpperCase()} image.`));
    }, mime, quality);
  });
}

async function exportEditedPdfAsImages(format) {
  updateExportProgress(8, 'Preparing document', 'Applying your PDF edits…');
  const pdfBlob = await buildFinalEditedPdfBlob();
  updateExportProgress(18, `Preparing ${format.toUpperCase()}`, 'Loading the completed PDF…');
  const pdf = await loadPdfDocumentFromBlob(pdfBlob);
  const baseName = safeExportBaseName();
  const extension = format;

  if (pdf.numPages === 1) {
    updateExportProgress(35, `Rendering ${format.toUpperCase()}`, 'Rendering page 1 of 1 at high quality…');
    const blob = await renderPdfPageToImageBlob(pdf, 1, format);
    updateExportProgress(100, 'Download ready', `${baseName}.${extension} is ready.`);
    downloadBlob(blob, `${baseName}.${extension}`);
    return;
  }

  if (typeof JSZip === 'undefined') {
    throw new Error('The image packaging library could not be loaded.');
  }

  const zip = new JSZip();
  const digits = String(pdf.numPages).length;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const pageProgress = 20 + (pageNumber - 1) / pdf.numPages * 60;
    updateExportProgress(
      pageProgress,
      `Rendering ${format.toUpperCase()} pages`,
      `Rendering page ${pageNumber} of ${pdf.numPages}…`
    );
    const blob = await renderPdfPageToImageBlob(pdf, pageNumber, format);
    const padded = String(pageNumber).padStart(digits, '0');
    zip.file(`${baseName}-page-${padded}.${extension}`, blob);
  }

  updateExportProgress(84, 'Packaging images', `Creating one ZIP with ${pdf.numPages} images…`);
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  }, metadata => {
    updateExportProgress(
      84 + metadata.percent * .14,
      'Packaging images',
      `Creating ZIP… ${Math.round(metadata.percent)}%`
    );
  });

  updateExportProgress(100, 'Download ready', `${baseName}-images.zip is ready.`);
  downloadBlob(zipBlob, `${baseName}-images.zip`);
}

async function extractEditedPdfText() {
  updateExportProgress(8, 'Preparing document', 'Applying your PDF edits…');
  const pdfBlob = await buildFinalEditedPdfBlob();
  const pdf = await loadPdfDocumentFromBlob(pdfBlob);
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    updateExportProgress(
      20 + pageNumber / pdf.numPages * 70,
      'Extracting text',
      `Reading page ${pageNumber} of ${pdf.numPages}…`
    );
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = [];
    let currentLine = [];
    let lastY = null;

    textContent.items.forEach(item => {
      const y = Math.round(item.transform?.[5] || 0);
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        if (currentLine.length) lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
        currentLine = [];
      }
      if (item.str) currentLine.push(item.str);
      lastY = y;
    });

    if (currentLine.length) lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());

    const pageText = lines.filter(Boolean).join('\n');
    pages.push(pdf.numPages > 1 ? `--- Page ${pageNumber} ---\n${pageText}` : pageText);
  }

  return pages.join('\n\n');
}

async function exportAppliedSplitArchive() {
  const editedBytes = await createEditedPdfBytes();
  const source = await PDFLib.PDFDocument.load(editedBytes);
  normaliseSplitPoints();
  const boundaries = [0, ...editor.splitPoints, source.getPageCount()];
  const archive = new JSZip();
  const baseName = safeExportBaseName();
  for (let section = 0; section < boundaries.length - 1; section++) {
    const start = boundaries[section];
    const end = boundaries[section + 1];
    const output = await PDFLib.PDFDocument.create();
    const indices = Array.from({length:end-start}, (_, offset) => start + offset);
    const pages = await output.copyPages(source, indices);
    pages.forEach(page => output.addPage(page));
    archive.file(`${baseName}-part-${section + 1}.pdf`, await output.save());
  }
  const blob = await archive.generateAsync({type:'blob',compression:'DEFLATE'});
  updateExportProgress(100, 'Download ready', `${boundaries.length - 1} split PDF files are ready.`);
  downloadBlob(blob, `${baseName}-split.zip`);
}

let pendingWordOcr = false;

async function exportEditedDocument(format) {
  if (format === 'pdf' && editor.splitApplied && editor.splitPoints?.length) {
    await exportAppliedSplitArchive();
    return;
  }
  const baseName = safeExportBaseName();

  if (format === 'pdf') {
    updateExportProgress(10, 'Preparing PDF', 'Applying your edits…');
    const blob = await buildFinalEditedPdfBlob();
    updateExportProgress(100, 'Download ready', `${baseName}.pdf is ready.`);
    downloadBlob(blob, `${baseName}.pdf`);
    return;
  }

  if (format === 'docx' && pendingWordOcr) {
    await exportEditedPdfAsOcrDocx();
    return;
  }

  if (
    format === 'docx' || format === 'doc' ||
    format === 'xlsx' || format === 'xls' ||
    format === 'pptx' || format === 'ppt'
  ) {
    await exportEditedPdfThroughEngine(format);
    return;
  }

  if (format === 'jpg' || format === 'png' || format === 'webp' || format === 'tiff') {
    await exportEditedPdfAsImages(format);
    return;
  }

  if (format === 'txt') {
    const text = await extractEditedPdfText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    updateExportProgress(100, 'Download ready', `${baseName}.txt is ready.`);
    downloadBlob(blob, `${baseName}.txt`);
    return;
  }

  throw new Error('That export format is not available yet.');
}

document.getElementById('final-download').addEventListener('click', async () => {
  const emailInput = document.getElementById('download-email');
  const error = document.getElementById('email-error');
  const email = String(emailInput?.value || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (error) error.hidden = false;
    emailInput?.focus();
    return;
  }

  if (error) error.hidden = true;
  sessionStorage.setItem('pdfmintPendingEmail', email);

  const button = document.getElementById('final-download');
  const selectedFormat = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
  const originalText = button.textContent;

  button.disabled = true;
  resetExportProgress();
  startExportCountdown(selectedFormat);
  updateExportProgress(2, 'Starting export', `Preparing ${selectedFormat.toUpperCase()}…`);
  button.textContent = selectedFormat === 'pdf' ? 'Preparing PDF…' : `Preparing ${selectedFormat.toUpperCase()}…`;

  try {
    await exportEditedDocument(selectedFormat);
  } catch (exportError) {
    console.error('Export failed:', exportError);
    updateExportProgress(
      0,
      'Export could not be completed',
      exportError?.message || 'PDFBreeze could not create that download.'
    );
    showAlert(exportError?.message || 'PDFBreeze could not create that download.');
  } finally {
    stopExportCountdown();
    button.disabled = false;
    button.textContent = originalText;
  }
});

document.getElementById('download-email').addEventListener('input', event => {
  event.currentTarget.classList.remove('invalid');
  document.getElementById('email-error').hidden = true;
});

function showOAuthSetupMessage(provider) {
  const error = document.getElementById('email-error');
  error.textContent = `${provider} sign-in requires the ${provider} OAuth connection. Email download is available now.`;
  error.hidden = false;
}

document.getElementById('continue-google')?.addEventListener('click', openAccessPage);


const heroInput = document.getElementById('file-input');
const heroCard = document.getElementById('upload-card');
const heroStatus = document.getElementById('file-status');
['dragenter','dragover'].forEach(name => heroCard.addEventListener(name, event => {
  event.preventDefault(); heroCard.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => heroCard.addEventListener(name, event => {
  event.preventDefault(); heroCard.classList.remove('dragover');
}));
heroCard.addEventListener('drop', event => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  if (
    document.body.dataset.compressFlow === 'true' ||
    document.body.dataset.compressImageFlow === 'true'
  ) {
    window.dispatchEvent(new CustomEvent('pdfmint:compression-drop', { detail: { file } }));
    return;
  }
  if (document.body.dataset.mergeFlow === 'true') {
    window.dispatchEvent(new CustomEvent('pdfmint:merge-drop', { detail: { files: event.dataTransfer.files } }));
    return;
  }
  if (document.body.dataset.ocrFlow === 'true') {
    window.dispatchEvent(new CustomEvent('pdfmint:ocr-drop', { detail: { file } }));
    return;
  }
  loadEditorPdf(file);
});
document.getElementById('preview-file-input').addEventListener('change', event => {
  const file = event.target.files[0];
  if (file) loadEditorPdf(file);
  event.target.value = '';
});

if (document.getElementById('merge-file-input') && document.getElementById('split-file-input')) {
function renderMergeList() {
  const list = document.getElementById('merge-list');
  const summary = document.getElementById('merge-summary');
  const button = document.getElementById('merge-button');
  if (!mergeFiles.length) {
    list.innerHTML = '<div class="merge-empty">No PDF files have been added yet.</div>';
    summary.textContent = 'No files selected'; button.disabled = true; return;
  }
  list.innerHTML = mergeFiles.map((file, index) => `
    <div class="merge-item">
      <div class="merge-item-icon">PDF</div>
      <div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)}</small></div>
      <div class="merge-controls">
        <button class="icon-button" type="button" data-move-up="${index}">↑</button>
        <button class="icon-button" type="button" data-move-down="${index}">↓</button>
        <button class="icon-button" type="button" data-remove="${index}">×</button>
      </div>
    </div>`).join('');
  summary.textContent = `${mergeFiles.length} PDF${mergeFiles.length === 1 ? '' : 's'} selected`;
  button.disabled = mergeFiles.length < 2;
  list.querySelectorAll('[data-move-up]').forEach(btn => btn.onclick = () => moveMergeFile(Number(btn.dataset.moveUp), -1));
  list.querySelectorAll('[data-move-down]').forEach(btn => btn.onclick = () => moveMergeFile(Number(btn.dataset.moveDown), 1));
  list.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = () => {
    mergeFiles.splice(Number(btn.dataset.remove), 1); renderMergeList();
  });
}
function moveMergeFile(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= mergeFiles.length) return;
  [mergeFiles[index], mergeFiles[next]] = [mergeFiles[next], mergeFiles[index]];
  renderMergeList();
}
function addMergeFiles(files) {
  const valid = Array.from(files).filter(validPdf);
  if (!valid.length) return showAlert('Please add PDF files only.');
  mergeFiles.push(...valid); renderMergeList();
}
const mergeInput = document.getElementById('merge-file-input');
mergeInput.addEventListener('change', event => { addMergeFiles(event.target.files); event.target.value = ''; });
const mergeDrop = document.getElementById('merge-drop-zone');
['dragenter','dragover'].forEach(name => mergeDrop.addEventListener(name, event => {
  event.preventDefault(); mergeDrop.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => mergeDrop.addEventListener(name, event => {
  event.preventDefault(); mergeDrop.classList.remove('dragover');
}));
mergeDrop.addEventListener('drop', event => addMergeFiles(event.dataTransfer.files));
document.getElementById('merge-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  if (mergeFiles.length < 2) return;
  button.disabled = true; button.textContent = 'Merging…';
  try {
    const output = await PDFLib.PDFDocument.create();
    for (const file of mergeFiles) {
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
    }
    downloadPdf(await output.save(), 'pdfbreeze-merged.pdf');
  } catch (_) { showAlert('The files could not be merged.'); }
  finally { button.disabled = false; button.textContent = 'Merge and download'; }
});

async function setSplitFile(file) {
  if (!validPdf(file)) return showAlert('Please select a valid PDF file.');
  try {
    const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    splitFile = file; splitPageCount = source.getPageCount();
    document.getElementById('split-file-summary').textContent =
      `${file.name} · ${splitPageCount} page${splitPageCount === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    document.getElementById('split-help').textContent = `Choose pages from 1 to ${splitPageCount}.`;
    document.getElementById('split-button').disabled = false;
  } catch (_) { showAlert('PDFBreeze could not open this file.'); }
}
document.getElementById('split-file-input').addEventListener('change', async event => {
  const file = event.target.files[0]; if (file) await setSplitFile(file); event.target.value = '';
});
function parsePageRanges(text, maxPage) {
  if (!text.trim()) throw new Error('Enter at least one page number or range.');
  const result = [];
  for (const raw of text.split(',')) {
    const part = raw.trim(); if (!part) continue;
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > maxPage) throw new Error(`Page ${page} is outside the available range.`);
      result.push(page - 1); continue;
    }
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) throw new Error(`“${part}” is not a valid page or range.`);
    const start = Number(match[1]), end = Number(match[2]);
    if (start < 1 || end < 1 || start > maxPage || end > maxPage) throw new Error(`Range ${part} is outside pages 1-${maxPage}.`);
    const step = start <= end ? 1 : -1;
    for (let page = start; page !== end + step; page += step) result.push(page - 1);
  }
  if (!result.length) throw new Error('Enter at least one valid page.');
  return result;
}
document.getElementById('split-button').addEventListener('click', async event => {
  const button = event.currentTarget; if (!splitFile) return;
  button.disabled = true; button.textContent = 'Creating PDF…';
  try {
    const indices = parsePageRanges(document.getElementById('split-ranges').value, splitPageCount);
    const source = await PDFLib.PDFDocument.load(await splitFile.arrayBuffer());
    const output = await PDFLib.PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach(page => output.addPage(page));
    downloadPdf(await output.save(), `${splitFile.name.replace(/\.pdf$/i, '')}-selected-pages.pdf`);
  } catch (error) { showAlert(error.message || 'The selected pages could not be extracted.'); }
  finally { button.disabled = false; button.textContent = 'Split and download'; }
});

}
function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], {type: 'application/pdf'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
if (document.getElementById('merge-list')) renderMergeList();
updateEditorUi();


/* PDFBreeze v3.1.2 — basic Image tool
   Reuses the proven Signature image object pipeline without modifying PDF loading. */
(function initialiseBasicImageTool() {
  const button = document.getElementById('image-tool');
  const input = document.getElementById('image-file-input');
  if (!button || !input) return;

  button.addEventListener('click', () => {
    if (!editor.pages.length) {
      showAlert('Upload a PDF before adding an image.');
      return;
    }
    input.click();
  });

  input.addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => showAlert('The selected image could not be read.');
    reader.onload = () => {
      const uploadedImage = new Image();
      uploadedImage.onerror = () => showAlert('The selected image could not be loaded.');
      uploadedImage.onload = () => {
        try {
          // Convert every browser-supported image format to PNG so the existing
          // pdf-lib export path remains reliable for JPG, PNG, WebP, GIF, HEIC
          // where the browser can decode it, and other device image formats.
          const conversionCanvas = document.createElement('canvas');
          conversionCanvas.width = uploadedImage.naturalWidth;
          conversionCanvas.height = uploadedImage.naturalHeight;
          const context = conversionCanvas.getContext('2d');
          context.drawImage(uploadedImage, 0, 0);
          const pngDataUrl = conversionCanvas.toDataURL('image/png');
          const aspect = uploadedImage.naturalWidth / Math.max(1, uploadedImage.naturalHeight);

          editor.pendingSignature = {
            dataUrl: pngDataUrl,
            source: 'image-tool',
            aspect,
            defaultWidth: aspect > 2.5 ? .46 : aspect < .7 ? .24 : .34
          };

          // This stable function already places, selects, moves, resizes,
          // records history and exports image-based page objects correctly.
          placePendingSignatureCentered();
          showEditorHint('Image added. Drag it to move or use the blue handles to resize.');
        } catch (error) {
          console.error('Image placement failed', error);
          showAlert('The selected image could not be added.');
        }
      };
      uploadedImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
})();


/* PDFBreeze v3.2 — Stamp tool
   Premade and custom stamps reuse the stable Signature placement/resize/export pipeline. */
(function initialiseStampTool() {
  const button = document.getElementById('stamp-tool');
  const modal = document.getElementById('stamp-modal');
  const grid = document.getElementById('stamp-grid');
  const libraryView = document.getElementById('stamp-library-view');
  const customView = document.getElementById('stamp-custom-view');
  const modeButton = document.getElementById('stamp-mode-button');
  const title = document.getElementById('stamp-modal-title');
  const cancel = document.getElementById('stamp-cancel');
  const create = document.getElementById('stamp-create');
  const customText = document.getElementById('stamp-custom-text');
  const includeDate = document.getElementById('stamp-include-date');
  const includeTime = document.getElementById('stamp-include-time');
  const preview = document.getElementById('stamp-custom-preview');

  if (!button || !modal || !grid || !preview) return;

  let selectedColour = '#ef3f43';
  let customMode = false;

  const presets = [
    {text:'APPROVED', colour:'#4f8a2c', fill:'#b8dda5'},
    {text:'NOT APPROVED', colour:'#9d1022', fill:'#f47b8d', scale:.78},
    {text:'DRAFT', colour:'#18276b', fill:'#9ba5dc', scale:1.18},
    {text:'FINAL', colour:'#356716', fill:'#badf9f', scale:1.18},
    {text:'COMPLETED', colour:'#397124', fill:'#b8dda5', scale:.82},
    {text:'CONFIDENTIAL', colour:'#18276b', fill:'#9ba5dc', scale:.72},
    {text:'DEPARTMENTAL', colour:'#18276b', fill:'#9ba5dc', scale:.7},
    {text:'EXPERIMENTAL', colour:'#18276b', fill:'#9ba5dc', scale:.72},
    {text:'EXPIRED', colour:'#18276b', fill:'#9ba5dc', scale:1.08},
    {text:'SOLD', colour:'#18276b', fill:'#9ba5dc', scale:1.25},
    {text:'TOP SECRET', colour:'#8b1020', fill:'#f77c8b', scale:.82},
    {text:'REVISED', colour:'#18276b', fill:'#9ba5dc', scale:1.05, date:true},
    {text:'REJECTED', colour:'#8b1020', fill:'#f77c8b', scale:.95, date:true},
    {text:'FOR PUBLIC RELEASE', colour:'#18276b', fill:'#9ba5dc', scale:.57},
    {text:'NOT FOR PUBLIC RELEASE', colour:'#18276b', fill:'#9ba5dc', scale:.48},
    {text:'FOR COMMENT', colour:'#18276b', fill:'#9ba5dc', scale:.75},
    {text:'VOID', colour:'#9d1022', fill:'#f47b8d', scale:1.35},
    {text:'PRELIMINARY RESULTS', colour:'#18276b', fill:'#9ba5dc', scale:.52},
    {text:'INFORMATION ONLY', colour:'#18276b', fill:'#9ba5dc', scale:.58},
    {text:'✕', colour:'#8e0d1d', fill:'#e56874', symbol:true},
    {text:'✓', colour:'#356716', fill:'#a8ce91', symbol:true},
    {text:'INITIAL HERE', colour:'#403184', fill:'#b1a4ef', tag:'left'},
    {text:'SIGN HERE', colour:'#7a1823', fill:'#df929b', tag:'left'},
    {text:'WITNESS', colour:'#c49734', fill:'#fff0a3', tag:'left'},
    {text:'AS IS', colour:'#18276b', fill:'#9ba5dc', scale:1.25}
  ];

  function deviceDate() {
    return new Intl.DateTimeFormat(undefined, {
      year:'numeric', month:'2-digit', day:'2-digit'
    }).format(new Date());
  }

  function deviceTime() {
    return new Intl.DateTimeFormat(undefined, {
      hour:'2-digit', minute:'2-digit'
    }).format(new Date());
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function colourWithAlpha(hex, alpha) {
    const value = hex.replace('#','');
    const r = parseInt(value.slice(0,2),16);
    const g = parseInt(value.slice(2,4),16);
    const b = parseInt(value.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawStamp(canvas, options) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0,0,width,height);

    const pad = Math.round(width * .055);
    const x = pad;
    const y = pad;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const colour = options.colour || '#ef3f43';
    const fill = options.fill || colourWithAlpha(colour,.5);
    const text = String(options.text || '').trim();
    const dateLine = options.dateLine || '';

    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(4, width * .012);

    if (options.tag === 'left') {
      const point = Math.round(w * .16);
      ctx.beginPath();
      ctx.moveTo(x + point, y);
      ctx.lineTo(x + w, y);
      ctx.quadraticCurveTo(x + w + 8, y, x + w + 8, y + 10);
      ctx.lineTo(x + w + 8, y + h - 10);
      ctx.quadraticCurveTo(x + w + 8, y + h, x + w, y + h);
      ctx.lineTo(x + point, y + h);
      ctx.lineTo(x, y + h/2);
      ctx.closePath();
    } else {
      roundedRect(ctx,x,y,w,h,Math.round(height*.07));
    }

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colour;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (options.symbol) {
      ctx.font = `700 ${Math.round(height*.62)}px Arial`;
      ctx.fillText(text, width/2, height/2 + height*.015);
    } else {
      let fontSize = Math.round(height * .37 * (options.scale || 1));
      ctx.font = `italic 700 ${fontSize}px Arial`;
      while (ctx.measureText(text).width > w * .82 && fontSize > 18) {
        fontSize -= 2;
        ctx.font = `italic 700 ${fontSize}px Arial`;
      }
      const mainY = dateLine ? height*.44 : height*.52;
      ctx.fillText(text || deviceDate(), width/2 + (options.tag === 'left' ? width*.035 : 0), mainY);

      if (dateLine) {
        ctx.font = `700 ${Math.round(height*.12)}px Arial`;
        ctx.fillText(dateLine, width/2, height*.72);
      }
    }

    ctx.restore();
    return canvas.toDataURL('image/png');
  }

  function makePresetDataUrl(preset, canvasWidth=620, canvasHeight=230) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    return drawStamp(canvas, {
      ...preset,
      dateLine:preset.date ? `${deviceDate()}, ${deviceTime()}` : ''
    });
  }

  function placeStamp(dataUrl, aspect=2.7) {
    editor.pendingSignature = {
      dataUrl,
      source:'stamp-tool',
      aspect,
      defaultWidth:.34
    };
    placePendingSignatureCentered();
    closeModal();
    showEditorHint('Stamp added. Drag it to move or use the blue handles to resize.');
  }

  function renderPresetGrid() {
    grid.innerHTML = '';
    presets.forEach(preset => {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'stamp-choice';
      choice.setAttribute('aria-label', `Add ${preset.text} stamp`);

      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 135;
      drawStamp(canvas, {
        ...preset,
        dateLine:preset.date ? `${deviceDate()}, ${deviceTime()}` : ''
      });

      choice.appendChild(canvas);
      choice.addEventListener('click', () => {
        placeStamp(makePresetDataUrl(preset), 620/230);
      });
      grid.appendChild(choice);
    });
  }

  function customStampOptions() {
    const lines = [];
    if (includeDate.checked) lines.push(deviceDate());
    if (includeTime.checked) lines.push(deviceTime());

    return {
      text:customText.value.trim(),
      colour:selectedColour,
      fill:colourWithAlpha(selectedColour,.53),
      dateLine:lines.join(', ')
    };
  }

  function renderCustomPreview() {
    drawStamp(preview, customStampOptions());
  }

  function setMode(isCustom) {
    customMode = isCustom;
    libraryView.hidden = isCustom;
    customView.hidden = !isCustom;
    create.hidden = !isCustom;
    title.textContent = isCustom ? 'Custom Stamp' : 'Use an existing stamp design';
    modeButton.textContent = isCustom ? 'Use an existing stamp design' : 'Custom Stamp';
    if (isCustom) renderCustomPreview();
  }

  function openModal() {
    if (!editor.pages.length) {
      showAlert('Upload a PDF before adding a stamp.');
      return;
    }
    renderPresetGrid();
    setMode(false);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  button.addEventListener('click', openModal);
  modeButton.addEventListener('click', () => setMode(!customMode));
  cancel.addEventListener('click', closeModal);
  modal.querySelectorAll('[data-close-stamp]').forEach(node => node.addEventListener('click', closeModal));

  customText.addEventListener('input', renderCustomPreview);
  includeDate.addEventListener('change', renderCustomPreview);
  includeTime.addEventListener('change', renderCustomPreview);

  document.querySelectorAll('[data-stamp-colour]').forEach(colourButton => {
    colourButton.addEventListener('click', () => {
      selectedColour = colourButton.dataset.stampColour;
      document.querySelectorAll('[data-stamp-colour]').forEach(node => {
        node.classList.toggle('active', node === colourButton);
      });
      renderCustomPreview();
    });
  });

  create.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 300;
    const dataUrl = drawStamp(canvas, customStampOptions());
    placeStamp(dataUrl, 760/300);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
})();



document.getElementById('send-to-email')?.addEventListener('click', function(event) {
  event.preventDefault();
  document.getElementById('download-edited-pdf')?.click();
});

document.getElementById('annotation-layer')?.addEventListener('pointerdown', event => {
  if (editor.mode === 'note') placeNoteAt(event);
}, true);


/* PDFBreeze v3.8.0 — one shared editor route */
const PDFMINT_TRANSFER_DB = 'pdfmint-editor-transfer';
const PDFMINT_TRANSFER_STORE = 'uploads';
const PDFMINT_TRANSFER_KEY = 'pending-pdf';

function openPdfMintTransferDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDFMINT_TRANSFER_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDFMINT_TRANSFER_STORE)) {
        db.createObjectStore(PDFMINT_TRANSFER_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storePdfForSharedEditor(file) {
  const db = await openPdfMintTransferDb();
  const bytes = await file.arrayBuffer();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PDFMINT_TRANSFER_STORE, 'readwrite');
    tx.objectStore(PDFMINT_TRANSFER_STORE).put({
      name: file.name,
      type: file.type || 'application/pdf',
      lastModified: file.lastModified || Date.now(),
      bytes
    }, PDFMINT_TRANSFER_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function routeFileToSharedEditor(file, options = {}) {
  if (!file) throw new Error('No file was provided for the editor.');

  await storePdfForSharedEditor(file);

  const params = new URLSearchParams();
  if (options.tool && options.tool !== 'none') params.set('tool', options.tool);
  if (options.managerAction) params.set('action', options.managerAction);
  if (options.exportFormat) {
    params.set('export', '1');
    params.set('format', options.exportFormat);
  }
  if (options.imageConvertFormat) {
    params.set('convert', 'image');
    params.set('format', options.imageConvertFormat);
  }
  if (options.documentConvertType) {
    params.set('convert', options.documentConvertType);
  }

  const query = params.toString();
  window.location.href = `editor.html${query ? `?${query}` : ''}`;
}

window.PDFMintShared = Object.assign(window.PDFMintShared || {}, {
  compressPdfThroughEngine(file, level) {
    const safeLevel = ['light', 'standard', 'high'].includes(level) ? level : 'standard';
    const baseName = String(file?.name || 'document').replace(/\.pdf$/i, '');
    return convertPdfThroughPdfMintEngine(file, `compress-pdf-${safeLevel}`, baseName);
  },
  openEditorWithExport(file, format) {
    return routeFileToSharedEditor(file, { exportFormat: format });
  }
});

async function takePdfForSharedEditor() {
  const db = await openPdfMintTransferDb();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(PDFMINT_TRANSFER_STORE, 'readwrite');
    const store = tx.objectStore(PDFMINT_TRANSFER_STORE);
    const request = store.get(PDFMINT_TRANSFER_KEY);
    request.onsuccess = () => {
      const value = request.result || null;
      store.delete(PDFMINT_TRANSFER_KEY);
      resolve(value);
    };
    request.onerror = () => reject(request.error);
  });
  db.close();

  if (!record) return null;
  return new File([record.bytes], record.name, {
    type: record.type || 'application/pdf',
    lastModified: record.lastModified || Date.now()
  });
}

function sharedEditorUrl(tool) {
  if (!tool || tool === 'none') return 'editor.html';
  return `editor.html?tool=${encodeURIComponent(tool)}`;
}

async function routeLandingUploadToEditor(file) {
  if (!file) return;
  const status = document.getElementById('file-status');
  if (status) status.textContent = `${file.name} selected — opening editor…`;

  try {
    let tool = document.body.dataset.landingTool || 'edit';
    if (tool === 'none' && /(?:^|\/)add-watermark\.html$/i.test(window.location.pathname)) {
      tool = 'watermark';
    }
    if (tool === 'none' && /(?:^|\/)crop-pdf\.html$/i.test(window.location.pathname)) {
      tool = 'crop';
    }
    const path = window.location.pathname.toLowerCase();
    const imageConvertFormat = /(?:^|\/)pdf-to-jpg\.html$/.test(path) ? 'jpg'
      : /(?:^|\/)pdf-to-png\.html$/.test(path) ? 'png'
      : '';
    const documentConvertType = /(?:^|\/)pdf-to-word\.html$/.test(path) ? 'word'
      : /(?:^|\/)pdf-to-excel\.html$/.test(path) ? 'excel'
      : /(?:^|\/)pdf-to-pptx\.html$/.test(path) ? 'powerpoint'
      : '';
    let managerAction = '';
    if (/(?:^|\/)rotate-pdf\.html$/.test(path)) managerAction = 'rotate';
    if (/(?:^|\/)delete-pdf-pages\.html$/.test(path)) managerAction = 'delete';
    if (/(?:^|\/)split-pdf\.html$/.test(path)) managerAction = 'split';
    if (managerAction) tool = 'manage';
    await routeFileToSharedEditor(file, { tool, managerAction, imageConvertFormat, documentConvertType });
  } catch (error) {
    console.error('Could not transfer PDF to editor:', error);
    if (status) status.textContent = 'Could not open the editor. Please try again.';
  }
}

function activateSharedEditorTool(tool) {
  const buttonIds = {
    edit: 'edit-text-tool',
    text: 'add-text-tool',
    sign: 'sign-tool',
    image: 'image-tool',
    link: 'link-tool',
    note: 'note-tool',
    watermark: 'watermark-tool',
    crop: 'crop-tool',
    highlight: 'text-highlight-tool',
    stamp: 'stamp-tool',
    split: 'manage-tool',
    manage: 'manage-tool'
  };
  const id = buttonIds[tool];
  if (id) requestAnimationFrame(() => document.getElementById(id)?.click());
}

function openImageConvertModal(preferredFormat = 'jpg') {
  const modal = document.getElementById('image-convert-modal');
  if (!modal || !editor.pages.length) return;
  const format = ['jpg', 'png', 'webp', 'tiff'].includes(preferredFormat) ? preferredFormat : 'jpg';
  const radio = modal.querySelector(`input[name="image-convert-format"][value="${format}"]`);
  if (radio) radio.checked = true;
  modal.querySelectorAll('.image-convert-choice').forEach(choice => {
    choice.classList.toggle('active', choice.querySelector('input')?.checked);
  });
  const filename = document.getElementById('image-convert-filename');
  filename.value = String(editor.file?.name || 'document').replace(/\.pdf$/i, '');
  document.getElementById('image-convert-extension').textContent = `.${format}`;
  modal.hidden = false;
}

const imageConvertModal = document.getElementById('image-convert-modal');
if (imageConvertModal) {
  imageConvertModal.querySelectorAll('input[name="image-convert-format"]').forEach(input => {
    input.addEventListener('change', () => {
      imageConvertModal.querySelectorAll('.image-convert-choice').forEach(choice => {
        choice.classList.toggle('active', choice.contains(input) && input.checked);
      });
      document.getElementById('image-convert-extension').textContent = `.${input.value}`;
    });
  });
  imageConvertModal.querySelectorAll('[data-close-image-convert]').forEach(button => {
    button.addEventListener('click', () => { imageConvertModal.hidden = true; });
  });
  document.getElementById('image-convert-download')?.addEventListener('click', () => {
    const format = imageConvertModal.querySelector('input[name="image-convert-format"]:checked')?.value || 'jpg';
    const exportRadio = document.querySelector(`input[name="export-format"][value="${format}"]`);
    if (exportRadio) {
      exportRadio.checked = true;
      exportRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const rawName = String(document.getElementById('image-convert-filename').value || 'document').trim();
    document.getElementById('export-filename').value = rawName || 'document';
    imageConvertModal.hidden = true;
    openEmailModal();
  });
}

const documentConversionPresets = {
  word: {
    title: 'Convert PDF to Word',
    defaultFormat: 'docx',
    formats: [
      ['docx', 'DOCX', 'Editable document for modern Microsoft Word.'],
      ['doc', 'DOC', 'Compatible with older versions of Microsoft Word.'],
      ['png', 'PNG', 'Crisp page images with lossless quality.'],
      ['jpg', 'JPG', 'Compact page images that are easy to share.']
    ]
  },
  excel: {
    title: 'Convert PDF to Excel',
    defaultFormat: 'xlsx',
    formats: [
      ['xlsx', 'XLSX', 'Editable spreadsheets for calculations and data analysis.'],
      ['xls', 'XLS', 'Compatible with older versions of Microsoft Excel.'],
      ['docx', 'DOCX', 'Editable Word document with reconstructed content.'],
      ['txt', 'TXT', 'Plain text for quick reuse and data processing.']
    ]
  },
  powerpoint: {
    title: 'Convert PDF to PowerPoint',
    defaultFormat: 'pptx',
    formats: [
      ['pptx', 'PPTX', 'Editable slides for modern PowerPoint.'],
      ['ppt', 'PPT', 'Compatible with older versions of PowerPoint.'],
      ['png', 'PNG', 'Crisp page images for slides and presentations.'],
      ['jpg', 'JPG', 'Compact page images that are easy to share.']
    ]
  }
};

function openDocumentConvertModal(type) {
  const modal = document.getElementById('document-convert-modal');
  const preset = documentConversionPresets[type];
  if (!modal || !preset || !editor.pages.length) return;
  modal.dataset.conversionType = type;
  document.getElementById('document-convert-title').textContent = preset.title;
  document.getElementById('document-convert-options').innerHTML = preset.formats.map((format, index) => {
    const [value, label, description] = format;
    return `<label class="image-convert-choice${index === 0 ? ' active' : ''}"><input type="radio" name="document-convert-format" value="${value}"${index === 0 ? ' checked' : ''}><span class="image-convert-icon format-${value}">${label}</span><strong>${label}<small>${description}</small></strong><i aria-hidden="true"></i></label>`;
  }).join('');
  const filename = document.getElementById('document-convert-filename');
  filename.value = String(editor.file?.name || 'document').replace(/\.pdf$/i, '');
  document.getElementById('document-convert-extension').textContent = `.${preset.defaultFormat}`;
  const wordMethod = document.getElementById('word-convert-method');
  if (wordMethod) {
    wordMethod.hidden = type !== 'word';
    const standard = wordMethod.querySelector('input[value="standard"]');
    if (standard) standard.checked = true;
    pendingWordOcr = false;
    wordMethod.querySelectorAll('.word-convert-method-choice').forEach(choice => {
      choice.classList.toggle('active', choice.querySelector('input')?.checked);
      choice.classList.remove('disabled');
    });
  }
  modal.querySelectorAll('input[name="document-convert-format"]').forEach(input => {
    input.addEventListener('change', () => {
      modal.querySelectorAll('.image-convert-choice').forEach(choice => {
        choice.classList.toggle('active', choice.contains(input) && input.checked);
      });
      document.getElementById('document-convert-extension').textContent = `.${input.value}`;
      updateWordConversionMethodAvailability(input.value);
    });
  });
  updateWordConversionMethodAvailability(preset.defaultFormat);
  modal.hidden = false;
}

function updateWordConversionMethodAvailability(format) {
  const method = document.getElementById('word-convert-method');
  if (!method || method.hidden) return;
  const ocrInput = method.querySelector('input[value="ocr"]');
  const ocrChoice = ocrInput?.closest('.word-convert-method-choice');
  const supportsOcr = format === 'docx';
  if (ocrInput) ocrInput.disabled = !supportsOcr;
  ocrChoice?.classList.toggle('disabled', !supportsOcr);
  if (!supportsOcr && ocrInput?.checked) {
    const standard = method.querySelector('input[value="standard"]');
    if (standard) standard.checked = true;
  }
  method.querySelectorAll('.word-convert-method-choice').forEach(choice => {
    choice.classList.toggle('active', choice.querySelector('input')?.checked);
  });
  const help = document.getElementById('word-convert-method-help');
  if (help) help.textContent = supportsOcr
    ? 'Choose OCR only for scanned PDFs or photographed pages.'
    : 'OCR is available when DOCX is selected.';
}

const documentConvertModal = document.getElementById('document-convert-modal');
if (documentConvertModal) {
  documentConvertModal.querySelectorAll('input[name="word-convert-method"]').forEach(input => {
    input.addEventListener('change', () => {
      documentConvertModal.querySelectorAll('.word-convert-method-choice').forEach(choice => {
        choice.classList.toggle('active', choice.contains(input) && input.checked);
      });
    });
  });
  documentConvertModal.querySelectorAll('[data-close-document-convert]').forEach(button => {
    button.addEventListener('click', () => { documentConvertModal.hidden = true; });
  });
  document.getElementById('document-convert-download')?.addEventListener('click', () => {
    const format = documentConvertModal.querySelector('input[name="document-convert-format"]:checked')?.value;
    if (!format) return;
    const exportRadio = document.querySelector(`input[name="export-format"][value="${format}"]`);
    if (!exportRadio) return showAlert('That conversion format is not available.');
    exportRadio.checked = true;
    exportRadio.dispatchEvent(new Event('change', { bubbles: true }));
    pendingWordOcr = documentConvertModal.dataset.conversionType === 'word'
      && format === 'docx'
      && documentConvertModal.querySelector('input[name="word-convert-method"]:checked')?.value === 'ocr';
    const rawName = String(document.getElementById('document-convert-filename').value || 'document').trim();
    document.getElementById('export-filename').value = rawName || 'document';
    documentConvertModal.hidden = true;
    openEmailModal();
  });
}

async function initialiseSharedEditorRoute() {
  if (document.body.dataset.editorRoute !== 'true') return;

  const tool = new URLSearchParams(window.location.search).get('tool') || 'none';

  try {
    const file = await takePdfForSharedEditor();
    if (!file) {
      window.location.replace('index.html');
      return;
    }

    await loadEditorPdf(file);
    document.body.classList.remove('editor-route-loading');
    activateSharedEditorTool(tool);

    const routeParams = new URLSearchParams(window.location.search);
    if (routeParams.get('convert') === 'image') {
      requestAnimationFrame(() => openImageConvertModal(routeParams.get('format') || 'jpg'));
    }
    if (['word', 'excel', 'powerpoint'].includes(routeParams.get('convert'))) {
      requestAnimationFrame(() => openDocumentConvertModal(routeParams.get('convert')));
    }

    if (new URLSearchParams(window.location.search).get('export') === '1') {
      const params = new URLSearchParams(window.location.search);
      const preferredFormat = params.get('format') || 'pdf';
      const preferredRadio = document.querySelector(
        `input[name="export-format"][value="${CSS.escape(preferredFormat)}"]`
      );
      const fallbackRadio = document.querySelector('input[name="export-format"][value="pdf"]');
      const radio = preferredRadio || fallbackRadio;

      if (radio) {
        radio.checked = true;
        document.querySelectorAll('.format-choice').forEach(choice => {
          choice.classList.toggle('active', choice.contains(radio));
        });
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }

      requestAnimationFrame(() => openFormatModal());
    }
  } catch (error) {
    console.error('Shared editor failed:', error);
    document.body.classList.remove('editor-route-loading');
    showAlert('PDFBreeze could not open this document in the editor.');
  }
}

const mergeLandingFiles = [];
function renderMergeLandingFiles() {
  if (document.body.dataset.mergeFlow !== 'true') return;
  const initial=document.getElementById('merge-initial-upload');
  const selected=document.getElementById('merge-selected-state');
  const grid=document.getElementById('merge-file-grid');
  const button=document.getElementById('merge-main-button');
  const hasFiles=mergeLandingFiles.length>0;
  initial.hidden=hasFiles; selected.hidden=!hasFiles;
  grid.innerHTML=mergeLandingFiles.map((file,index)=>`<article class="merge-file-card"><button class="merge-file-remove" type="button" data-merge-remove="${index}" aria-label="Remove ${escapeHtml(file.name)}">×</button><div class="merge-file-preview"><span>PDF</span></div><strong class="merge-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong></article>`).join('')+(mergeLandingFiles.length<12?'<button class="merge-add-file" id="merge-add-file" type="button"><b>＋</b><span>Add file</span></button>':'');
  button.disabled=mergeLandingFiles.length<2;
  grid.querySelectorAll('[data-merge-remove]').forEach(remove=>remove.addEventListener('click',()=>{mergeLandingFiles.splice(Number(remove.dataset.mergeRemove),1);renderMergeLandingFiles()}));
  document.getElementById('merge-add-file')?.addEventListener('click',()=>document.getElementById('file-input').click());
  document.getElementById('file-status').textContent=hasFiles?`${mergeLandingFiles.length} PDF${mergeLandingFiles.length===1?'':'s'} selected`:'';
}
function addMergeLandingFiles(fileList) {
  const candidates=Array.from(fileList||[]);
  const valid=candidates.filter(file=>validPdf(file)&&file.size<=100*1024*1024);
  const remaining=Math.max(0,12-mergeLandingFiles.length);
  mergeLandingFiles.push(...valid.slice(0,remaining));
  if(valid.length<candidates.length) document.getElementById('file-status').textContent='Only PDF files up to 100 MB can be added.';
  else if(valid.length>remaining) document.getElementById('file-status').textContent='You can merge up to 12 PDF files at once.';
  renderMergeLandingFiles();
}
if (document.body.dataset.mergeFlow === 'true') {
  const input=document.getElementById('file-input');
  document.getElementById('merge-first-file').addEventListener('click',()=>input.click());
  input.addEventListener('change',event=>{addMergeLandingFiles(event.target.files);event.target.value=''});
  window.addEventListener('pdfmint:merge-drop',event=>addMergeLandingFiles(event.detail.files));
  document.getElementById('merge-main-button').addEventListener('click',async event=>{
    if(mergeLandingFiles.length<2)return;
    const button=event.currentTarget;button.disabled=true;button.textContent='Merging…';
    try{
      const output=await PDFLib.PDFDocument.create();
      for(const file of mergeLandingFiles){
        const source=await PDFLib.PDFDocument.load(await file.arrayBuffer());
        const pages=await output.copyPages(source,source.getPageIndices());
        pages.forEach(page=>output.addPage(page));
      }
      const bytes=await output.save();
      const firstName=mergeLandingFiles[0].name.replace(/\.pdf$/i,'');
      const mergedFile=new File([bytes],`${firstName}-merged.pdf`,{type:'application/pdf',lastModified:Date.now()});
      await routeFileToSharedEditor(mergedFile,{});
    }catch(error){console.error('Could not merge PDFs:',error);document.getElementById('file-status').textContent='PDFBreeze could not merge these files. Please try again.';button.disabled=false;button.textContent='Merge PDF'}
  });
  renderMergeLandingFiles();
}

if (document.body.dataset.ocrFlow === 'true') {
  let ocrPendingFile = null;
  let ocrOutputFormat = 'docx';
  const ocrModal = document.getElementById('ocr-format-modal');
  const ocrInput = document.getElementById('file-input');
  const ocrStatus = document.getElementById('file-status');

  function openOcrFormatModal(file) {
    if (!validPdf(file)) {
      ocrStatus.textContent = 'Please select a valid PDF file.';
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      ocrStatus.textContent = 'Please select a PDF no larger than 100 MB.';
      return;
    }
    ocrPendingFile = file;
    ocrOutputFormat = 'docx';
    document.getElementById('ocr-file-name').textContent = file.name;
    document.getElementById('ocr-file-size').textContent = formatBytes(file.size);
    document.querySelectorAll('input[name="ocr-format"]').forEach(input => { input.checked = input.value === 'docx'; });
    document.querySelectorAll('.ocr-format-choice').forEach(choice => choice.classList.toggle('active', choice.querySelector('input').checked));
    ocrStatus.textContent = `${file.name} selected`;
    ocrModal.hidden = false;
  }
  function closeOcrFormatModal() { ocrModal.hidden = true; }

  ocrInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) openOcrFormatModal(file);
    event.target.value = '';
  });
  window.addEventListener('pdfmint:ocr-drop', event => openOcrFormatModal(event.detail.file));
  document.querySelectorAll('[data-close-ocr-format]').forEach(button => button.addEventListener('click', closeOcrFormatModal));
  document.querySelectorAll('input[name="ocr-format"]').forEach(input => input.addEventListener('change', () => {
    ocrOutputFormat = input.value;
    document.querySelectorAll('.ocr-format-choice').forEach(choice => choice.classList.toggle('active', choice.contains(input) && input.checked));
  }));
  document.getElementById('ocr-apply').addEventListener('click', () => {
    if (!ocrPendingFile) return;
    ocrOutputFormat = document.querySelector('input[name="ocr-format"]:checked')?.value || 'docx';
    closeOcrFormatModal();
    document.getElementById('download-email').value = '';
    document.getElementById('email-error').hidden = true;
    document.getElementById('ocr-progress').hidden = true;
    openEmailModal();
  });

  document.getElementById('final-download').addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const emailInput = document.getElementById('download-email');
    const error = document.getElementById('email-error');
    const email = String(emailInput.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = 'Please enter a valid email address.';
      error.hidden = false;
      emailInput.focus();
      return;
    }
    if (!ocrPendingFile) return;
    error.hidden = true;
    const button = event.currentTarget;
    const originalText = button.textContent;
    const operation = {docx:'ocr-docx',pdf:'ocr-pdf',txt:'ocr-txt'}[ocrOutputFormat] || 'ocr-docx';
    const extension = {docx:'docx',pdf:'pdf',txt:'txt'}[ocrOutputFormat] || 'docx';
    const baseName = ocrPendingFile.name.replace(/\.pdf$/i,'').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'_') || 'document';
    const progress = document.getElementById('ocr-progress');
    const progressBar = document.getElementById('ocr-progress-bar');
    const progressTrack = progress.querySelector('[role="progressbar"]');
    const progressPercent = document.getElementById('ocr-progress-percent');
    const progressLabel = document.getElementById('ocr-progress-label');
    let progressValue = 8;
    const setOcrProgress = value => {
      progressValue = Math.max(0, Math.min(100, Math.round(value)));
      progressBar.style.width = `${progressValue}%`;
      progressPercent.textContent = `${progressValue}%`;
      progressTrack.setAttribute('aria-valuenow', String(progressValue));
    };
    button.disabled = true;
    button.textContent = 'Applying OCR…';
    progress.hidden = false;
    progressLabel.textContent = 'Recognising text…';
    setOcrProgress(progressValue);
    const progressTimer = window.setInterval(() => {
      if (progressValue < 70) setOcrProgress(progressValue + Math.max(2, (70 - progressValue) * .12));
      else if (progressValue < 92) setOcrProgress(progressValue + 1);
    }, 350);
    ocrStatus.textContent = 'Recognising text and preparing your download…';
    try {
      const result = await convertPdfThroughPdfMintEngine(ocrPendingFile, operation, baseName);
      window.clearInterval(progressTimer);
      progressLabel.textContent = 'Download ready';
      setOcrProgress(100);
      downloadBlob(result, `${baseName}-ocr.${extension}`);
      await new Promise(resolve => window.setTimeout(resolve, 450));
      closeEmailModal();
      ocrStatus.textContent = `${baseName}-ocr.${extension} downloaded successfully.`;
    } catch (ocrError) {
      window.clearInterval(progressTimer);
      progress.hidden = true;
      console.error('OCR failed:', ocrError);
      error.textContent = ocrError?.message || 'PDFBreeze could not recognise this document. Please try again.';
      error.hidden = false;
      ocrStatus.textContent = 'OCR could not be completed. Please try again.';
    } finally {
      window.clearInterval(progressTimer);
      button.disabled = false;
      button.textContent = originalText;
    }
  }, true);
}

function pdfMintLandingUploadLabel() {
  const path = window.location.pathname.toLowerCase();

  if (path.endsWith('/pdf-to-jpg.html') || path.endsWith('pdf-to-jpg.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-png.html') || path.endsWith('pdf-to-png.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-excel.html') || path.endsWith('pdf-to-excel.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-pptx.html') || path.endsWith('pdf-to-pptx.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-word.html') || path.endsWith('pdf-to-word.html')) return 'Upload to convert';
  if (path.endsWith('/sign-pdf.html') || path.endsWith('sign-pdf.html')) return 'Upload to sign';
  if (path.endsWith('/rotate-pdf.html') || path.endsWith('rotate-pdf.html')) return 'Upload to rotate';
  if (path.endsWith('/merge-pdf.html') || path.endsWith('merge-pdf.html')) return 'Upload to merge';
  if (path.endsWith('/split-pdf.html') || path.endsWith('split-pdf.html')) return 'Upload to split';
  if (path.endsWith('/crop-pdf.html') || path.endsWith('crop-pdf.html')) return 'Upload to crop';
  if (path.endsWith('/add-watermark.html') || path.endsWith('add-watermark.html')) return 'Upload to watermark';
  if (path.endsWith('/compress-image.html') || path.endsWith('compress-image.html')) return 'Upload to compress';
  if (path.endsWith('/compress-pdf.html') || path.endsWith('compress-pdf.html')) return 'Upload to compress';

  return null;
}

function applyPdfMintLandingUploadLabel() {
  const label = pdfMintLandingUploadLabel();
  if (!label) return;

  const candidates = [
    document.querySelector('[data-upload-button]'),
    document.querySelector('.upload-btn'),
    document.querySelector('.upload-button'),
    document.querySelector('.hero-upload-button'),
    document.querySelector('.landing-upload-button')
  ].filter(Boolean);

  for (const button of candidates) {
    const currentText = (button.textContent || '').trim().toLowerCase();

    if (
      currentText.includes('upload to edit') ||
      currentText === 'upload' ||
      currentText.includes('upload pdf') ||
      currentText.includes('upload to sign') ||
      currentText.includes('upload to rotate') ||
      currentText.includes('upload to merge') ||
      currentText.includes('upload to split') ||
      currentText.includes('upload to crop') ||
      currentText.includes('upload to watermark') ||
      currentText.includes('upload to compress')
    ) {
      // IMPORTANT: many landing-page upload buttons are <label> elements
      // containing the hidden <input type="file">. Never use
      // button.textContent = ... here, because that deletes the file input.
      const textNodes = Array.from(button.childNodes).filter(
        node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      );

      if (textNodes.length) {
        textNodes[0].textContent = `\n            ${label}\n            `;
        return;
      }

      // If the visible label is in a span, change only that span.
      const spans = Array.from(button.querySelectorAll('span'));
      const textSpan = spans.find(span =>
        (span.textContent || '').toLowerCase().includes('upload')
      );

      if (textSpan) {
        textSpan.textContent = label;
        return;
      }
    }
  }
}

function addUploadPageSupportDetails() {
  const path = window.location.pathname.toLowerCase();
  const isHome = path === '/' || path.endsWith('/index.html') || path.endsWith('index.html');
  const hasPrimaryUpload = Boolean(document.querySelector('.hero #file-input, .upload-card #file-input'));
  const heroCopy = document.querySelector('.hero-copy');
  if (isHome || !hasPrimaryUpload || !heroCopy || heroCopy.querySelector('.upload-support-details')) return;

  const details = document.createElement('div');
  details.className = 'upload-support-details';
  details.setAttribute('aria-label', 'PDFBreeze support');
  details.innerHTML = '<a href="tel:+442079460182">+44 (0)20 7946 0182</a><span class="support-divider">|</span><span>Phone Support 24/7</span><span class="support-divider">|</span><a href="mailto:support@pdfbreeze.net">Email Support 24/7</a>';
  heroCopy.appendChild(details);
}

document.addEventListener('DOMContentLoaded', initialiseSharedEditorRoute);

document.querySelectorAll('input[name="export-format"]').forEach(input => {
  input.addEventListener('change', () => {
    document.querySelectorAll('.format-choice').forEach(choice => {
      choice.classList.toggle('active', choice.contains(input) && input.checked);
    });

    const extension = document.getElementById('export-extension');
    if (extension) {
      const format = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
      extension.textContent = `.${format}`;
    }
  });
});

/* PDFBreeze v3.9.6 — Contact page */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('contact-form-status');
  const button = form.querySelector('.contact-submit-button');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = form.querySelector('#contact-name')?.value.trim() || '';
    const email = form.querySelector('#contact-email')?.value.trim() || '';
    const subject = form.querySelector('#contact-subject')?.value.trim() || '';
    const message = form.querySelector('#contact-message')?.value.trim() || '';
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !validEmail || !subject || !message) {
      status.hidden = false;
      status.className = 'contact-form-status error';
      status.textContent = 'Please complete all fields and enter a valid email address.';
      return;
    }

    status.hidden = false;
    status.className = 'contact-form-status success';
    status.textContent = 'Opening your email app to send this message to PDFBreeze Support…';
    status.textContent = 'Sending your message…';
    button.disabled = true;
    try {
      const engine = (window.PDFMINT_CONFIG?.engineBaseUrl || '').replace(/\/$/, '');
      const response = await fetch(`${engine}/v1/support/message`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,subject,message,source:'contact-page',website:form.elements.website?.value || ''})});
      if (!response.ok) throw new Error();
      form.reset(); status.textContent = 'Your message has been sent. PDFBreeze Support will reply by email.';
    } catch (_) {
      status.className = 'contact-form-status error'; status.textContent = 'Your message could not be sent. Please try again.';
    } finally { button.disabled = false; }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  applyPdfMintLandingUploadLabel();
  addUploadPageSupportDetails();

  const input = document.getElementById('file-input');
  const usesDedicatedUploadFlow =
    document.body.dataset.editorRoute === 'true' ||
    document.body.dataset.compressFlow === 'true' ||
    document.body.dataset.compressImageFlow === 'true' ||
    document.body.dataset.mergeFlow === 'true' ||
    document.body.dataset.ocrFlow === 'true';

  if (input && !usesDedicatedUploadFlow) {
    input.addEventListener('change', event => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      routeLandingUploadToEditor(file);
      event.currentTarget.value = '';
    });
  }
});


document.addEventListener('DOMContentLoaded', () => {
  const dropdowns = Array.from(document.querySelectorAll('.desktop-nav .nav-dropdown'));

  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      const shouldOpen = !dropdown.classList.contains('is-open');

      dropdowns.forEach(other => {
        other.classList.remove('is-open');
        const otherToggle = other.querySelector('.nav-dropdown-toggle');
        if (otherToggle) otherToggle.setAttribute('aria-expanded', 'false');
      });

      if (shouldOpen) {
        dropdown.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.desktop-nav .nav-dropdown')) {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('is-open');
        const toggle = dropdown.querySelector('.nav-dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('is-open');
      const toggle = dropdown.querySelector('.nav-dropdown-toggle');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });
});
