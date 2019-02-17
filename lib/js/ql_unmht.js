"use strict";

/* global atob, ConvertFromUnicode, ConvertToUnicode, cidMode, text */

let UnMHTExtractor = (function() {

/* ---- base/arArrayUtils.jsm ---- */

/**
 * 配列ユーティリティ
 *
 * @class
 */
let arArrayUtils = Object.freeze({
  /**
   * Array.prototype.find みたいなヤツ
   * COMPAT: Firefox 25 未満
   *
   * @template ElemType
   * @param   {Array.<ElemType>} a
   *          対象の配列
   * @param   {function(ElemType,number,Array.<ElemType>):boolean} pred
   *          述語
   *            function(item, index, array)
   *              *param   {ElemType} item
   *              *param   {number} index
   *              *param   {Array.<ElemType>} array
   *              *returns {boolean}
   * @returns {(ElemType|undefined)}
   *          a の要素もしくは undefined
   */
  find: function(a, pred) {
    for (let i = 0, length = a.length; i < length; i += 1) {
      let x = a[i];
      if (pred(x, i, a)) {
        return x;
      }
    }

    return undefined;
  },

  /* ==== ql_unmht mod: remove: unused function: mapfind ==== */

  /* ==== ql_unmht mod: remove: unused function: range ==== */
});

/* ---- base/arUconv.jsm ---- */

/**
 * 文字列変換器
 *
 * @class
 */
let arUconv = Object.freeze({
  /**
   * Unicode から変換する
   *
   * @param   {string} text
   *          変換する文字列
   * @param   {string} charset
   *          変換先の文字コード
   * @returns {string}
   *          変換した文字列
   */
  fromUnicode: function(text, charset) {
    try {
      /* ==== ql_unmht mod: use native function: BEGIN ==== */
      return ConvertFromUnicode(text, charset);
      /* ==== ql_unmht mod: use native function: END ==== */
    } catch (e) {
    }

    return text;
  },

  /**
   * Unicode から変換する
   * 変換できないものは実体参照に置き換える
   *
   * @param   {string} text
   *          変換する文字列
   * @param   {string} charset
   *          変換先の文字コード
   * @returns {string}
   *          変換した文字列
   */
  fromUnicodeWithEntity: function(text, charset) {
    let text2
      = this.toUnicode(this.fromUnicode(text, charset), charset);

    let result = "";
    for (;;) {
      let p = text2.indexOf("?");
      if (p == -1) {
        result += text2;
        break;
      }

      if (text[p] != "?") {
        /* 変換できなかったため ? になった */

        result += text2.slice(0, p);

        let code1 = text.charCodeAt(p);
        if (code1 >= 0xd800 && code1 <= 0xdbff) {
          /* サロゲートペア */
          let code2 = text.charCodeAt(p + 1);
          let code = (code1 - 0xd800) * 0x400 + (code2 - 0xdc00) + 0x10000;

          result += "&#x" + code.toString(16).toUpperCase() + ";";

          text = text.slice(p + 2);
          text2 = text2.slice(p + 2);
        } else {
          result += "&#x" + code1.toString(16).toUpperCase() + ";";
          text = text.slice(p + 1);
          text2 = text2.slice(p + 1);
        }
      } else {
        /* 本当に ? だった */
        result += text2.slice(0, p + 1);
        text = text.slice(p + 1);
        text2 = text2.slice(p + 1);
      }
    }

    return this.fromUnicode(result, charset);
  },

  /**
   * Unicode に変換する
   *
   * @param   {string} text
   *          変換する文字列
   * @param   {string} charset
   *          変換元の文字コード
   * @returns {string}
   *          変換した文字列
   */
  toUnicode: function(text, charset) {
    try {
      /* ==== ql_unmht mod: use native function: BEGIN ==== */
      return ConvertToUnicode(text, charset);
      /* ==== ql_unmht mod: use native function: END ==== */
    } catch (e) {
    }

    return text;
  }
});

/**
 * Unicode から UTF-8 に変換する
 *
 * @param   {string} text
 *          Unicode の文字列
 * @returns {string}
 *          UTF-8 の文字列
 */
function toUTF8(text) {
  return arUconv.fromUnicode(text, "utf-8");
}

/**
 * UTF-8 から Unicode に変換する
 *
 * @param   {string} text
 *          UTF-8 の文字列
 * @returns {string}
 *          Unicode の文字列
 */
function fromUTF8(text) {
  return arUconv.toUnicode(text, "utf-8");
}

/* ---- base/arDOMUtils.jsm ---- */

/**
 * DOM 操作ユーティリティ
 *
 * @class
 */
let arDOMUtils = Object.freeze({
  /* ==== ql_unmht mod: remove: unused function: isNodeInSelection ==== */

  /* ==== ql_unmht mod: remove: unused function: findParentNode ==== */

  /**
   * HTML に使えない文字をエスケープする
   *
   * @param   {string} text
   *          エスケープする文字列
   * @returns {string}
   *          エスケープした文字列
   */
  escapeEntity: function(text) {
    return (text
            .replace(/&/g, "&amp;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&#x27;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\xa0/g, "&#xa0;"));
  },

  /**
   * HTML に使えない文字のエスケープを解除する
   *
   * @param   {string} text
   *          エスケープを解除する文字列
   * @returns {string}
   *          エスケープを解除した文字列
   */
  unescapeEntity: function(text) {
    return (text
            .replace(/&gt;/g, ">")
            .replace(/&lt;/g, "<")
            .replace(/&quot;/g, "\"")
            .replace(/&#x27;/g, "\'")
            .replace(/&#xa0;/g, "\xa0")
            .replace(/&nbsp;/g, "\xa0")
            .replace(/&amp;/g, "&"));
  }
});

/* ---- base/arMIMEDecoder.jsm ---- */

/**
 * MIME デコーダ
 *
 * @class
 */
let arMIMEDecoder = Object.freeze({
  /**
   * ext-octet[RFC2231] をデコードする
   *
   * @param   {string} text
   *          デコードする文字列
   * @returns {string}
   *          デコードした文字列
   */
  decodeExtOctet: function(text) {
    return text
      .replace(/%([A-Fa-f0-9]{2})/g,
               function(matched, octet) {
                 return String.fromCharCode(parseInt(octet, 16));
               });
  },

  /**
   * quoted-printable[RFC2045] をデコードする
   *
   * @param   {string} text
   *          デコードする文字列
   * @returns {string}
   *          デコードした文字列
   */
  decodeQ: function(text) {
    /* quoted_printable never fail */
    let context = new arMIMEParser(text);
    return context.quoted_printable();
  },

  /* ==== ql_unmht mod: remove: unused function: decodeWord ==== */

  /**
   * Base64 デコードする
   * 改行を含むものや破損したものにも対応
   *
   * @param   {string} text
   *          デコードする文字列
   * @returns {string}
   *          デコードされた文字列
   */
  decodeBase64: function(text) {
    return safe_atob(text);
  },

  /* ==== ql_unmht mod: remove: unused function: decodeDate ==== */

  /* ==== ql_unmht mod: remove: unused function: decodeLocation ==== */

  /**
   * message [RFC5322] をデコードする
   *
   * @param   {string} text
   *          メッセージ
   *          改行コードは CR LF でなければならない
   * @returns {?arMIMEPart}
   *          トップレベルのパート
   *          データが不正ならば null
   */
  decodeMessage: function(text) {
    let part = null;

    let context = new arMIMEParser(text);
    context._O(() => {
      let tmp = context.message();
      context.__END();
      part = tmp;
    });

    if (!part) {
      return null;
    }

    this.decodeFields(part);

    if (part.isMultipart) {
      let isCorrupted = { value: false };
      part.parts = this._decodeMultipart(part.body, part.boundary, isCorrupted);
      part.isCorrupted = isCorrupted.value;
    } else {
      if (part.format == "flowed") {
        part.body = this.decodeFlowed(part.body, part.delsp);
      }

      if (part.contentTransferEncoding == "quoted-printable") {
        part.body = this.decodeQ(part.body);
      } else if (part.contentTransferEncoding == "base64") {
        part.body = this.decodeBase64(part.body);
      }
    }

    return part;
  },

  /**
   * フィールドをデコードする
   *
   * @param   {arMIMEPart} part
   *          パート
   */
  decodeFields: function(part) {
    if (part.hasField("Content-Type")) {
      let params = this.decodeParam(part.getField("Content-Type"));
      if (params) {
        part.contentTypeParams = params;
        part.contentType       = part.contentTypeParams.type.toLowerCase();
        part.contentSubType    = part.contentTypeParams.subtype.toLowerCase();
        part.mimetype          = part.contentType + "/" + part.contentSubType;
        if (part.contentTypeParams.hasParam("charset")) {
          part.charset = part.contentTypeParams.getParam("charset");
        }
        if (part.contentTypeParams.hasParam("format")) {
          part.format = part.contentTypeParams.getParam("format").toLowerCase();
        }
        if (part.contentTypeParams.hasParam("delsp")) {
          part.delsp = part.contentTypeParams.getParam("delsp").toLowerCase() == "yes";
        }
      }
    }

    if (part.hasField("Subject")) {
      let subject = null;

      let context = new arMIMEParser(part.getField("Subject"));
      context._O(() => {
        let tmp = context.subject__value();
        context.__END();
        subject = tmp;
      });

      if (subject) {
        part.subject = this._tryFromUTF8(subject);
      }
    }

    if (part.hasField("From")) {
      let from = part.getField("From");
      if (from) {
        part.from = this._tryFromUTF8(from);
      }
    }

    /* ==== ql_unmht mod: remove unused: date ==== */

    if (part.hasField("Content-Location")) {
      let loc = part.getField("Content-Location");

      let context = new arMIMEParser(loc);
      context._O(() => {
        let tmp = context.content_location__value();
        context.__END();
        loc = tmp;
      });

      if (loc) {
        part.contentLocation = this._tryFromUTF8(loc);
      }
    }

    if (part.hasField("Content-Disposition")) {
      let params = this.decodeParam(part.getField("Content-Disposition"));
      if (params) {
        part.contentDispositionParams = params;
        part.contentDispositionType
          = part.contentDispositionParams.type.toLowerCase();
        if (part.contentDispositionParams.hasParam("filename")) {
          let filename = part.contentDispositionParams.getParam("filename");
          part.contentDispositionFilename = this._tryFromUTF8(filename);
        }
      }
    }

    if (part.hasField("Content-ID")) {
      let id = part.getField("Content-ID");

      let context = new arMIMEParser(id);
      context._O(() => {
        let tmp = context.id__value();
        context.__END();
        id = tmp;
      });

      if (id) {
        part.contentID = id;
      }
    }

    if (part.contentType == "multipart") {
      part.isMultipart = true;

      if (!(part.contentSubType == "related" ||
            part.contentSubType == "alternative")) {
        part.isMixed = true;
      }

      if (part.contentTypeParams.hasParam("boundary")) {
        part.boundary = part.contentTypeParams.getParam("boundary");
      }

      if (part.contentTypeParams.hasParam("start")) {
        let id = part.contentTypeParams.getParam("start");

        let context = new arMIMEParser(id);
        context._O(() => {
          let tmp = context.related_param_start();
          context.__END();
          id = tmp;
        });

        part.start = id;
      }

      if (part.contentTypeParams.hasParam("type")) {
        part.startMimetype = part.contentTypeParams.getParam("type");
      }
    } else {
      if (part.hasField("Content-Transfer-Encoding")) {
        let encoding = null;

        let context = new arMIMEParser(part.getField("Content-Transfer-Encoding"));
        context._O(() => {
          let tmp = context.encoding__value();
          context.__END();
          encoding = tmp;
        });

        if (encoding) {
          part.contentTransferEncoding = encoding;
        }
      }
    }
  },

  /**
   * content[RFC2045] や disposition[RFC2183] の値を
   * parameter[RFC2231] に従ってデコードする
   *
   * ただし disposition-type[RFC2183] や type/subtype[RFC2045] の位置が
   * 先頭でない事例が存在するのでこれらのデコードも同時に行う
   *
   * @param   {string} value
   *          contentRFC2045] や disposition[RFC2183] の値
   * @returns {arMIMEParams}
   *          パラメータ
   */
  decodeParam: function(value) {
    let params = null;

    let context = new arMIMEParser(value);
    context._O(() => {
      params = context.parameter_list();
      /* パースに失敗しても最低限を返す */
    });

    return params;
  },

  /**
   * format=flowed をデコードする
   *
   * @param   {string} text
   *          デコードする文字列
   * @param   {boolean} delsp
   *          delsp の値
   * @returns {string}
   *          デコードされた文字列
   */
  decodeFlowed: function(text, delsp) {
    let ret = text;

    let context = new arMIMEParser(text);
    context._O(() => {
      let tmp = context.flowed_body(delsp);
      context.__END();
      ret = tmp;
    });

    return ret;
  },

  /* ==== private ==== */

  /**
   * multipart-body[RFC2046] をデコードする
   *
   * @param   {string} body
   *          multipart なメッセージボディ
   *          改行コードは CR LF でなければならない
   * @param   {string} boundary
   *          バウンダリ文字列
   * @param   {object} corrupted
   *          (オプショナル)
   *          {
   *            value: {boolean} 破損したかどうか
   *          }
   * @returns {Array.<arMIMEPart>}
   *          パートの配列
   */
  _decodeMultipart: function(body, boundary, currpted) {
    let ret = [];

    let context = new arMIMEParser(body);
    context._O(() => {
      let tmp = context.multipart_body(boundary, currpted);
      context.__END();
      ret = tmp;
    });

    return ret
      .map(data => this.decodeMessage(data))
      .filter(part => part);
  },

  /**
   * 正しくデコードできるならば UTF-8 からデコードする
   *
   * @param   {string} s
   *          入力文字列
   * @returns {string}
   *          UTF-16 の文字列
   */
  _tryFromUTF8: function(s) {
    let decoded = fromUTF8(s);
    let encoded = toUTF8(decoded);
    if (encoded == s) {
      return decoded;
    }
    return s;
  }
});

/* ---- base/arMIMEParams.jsm ---- */

/**
 * content[RFC2045] や disposition[RFC2183] の値
 *
 * @constructor
 * @param   {string} mimetype
 *          MIME-Type (オプショナル)
 */
function arMIMEParams(mimetype) {
  /**
   * disposition-type[RFC2183]/type[RFC2045]
   * @type {string}
   */
  this.type = "";

  /**
   * subtype[RFC2045]
   * @type {string}
   */
  this.subtype = "";

  if (mimetype) {
    let m = mimetype.match(/^([^\/]+)\/([^\/]+)$/);
    if (m) {
      this.type = m[1];
      this.subtype = m[2];
    } else {
      this.type = mimetype;
    }
  }

  /**
   * パラメータのマップ
   *   { 小文字の名前: [大文字の名前, 値] }
   * @type {Map.<string,Tuple.<string,string>>}
   */
  this._params = new Map();

  Object.seal(this);
}
arMIMEParams.prototype = Object.freeze({
  /**
   * 破棄
   */
  destruct: function() {
    this.type = "";
    this.subtype = "";
    this._params.clear();
  },

  /* ==== ql_unmht mod: remove: unused function: clone ==== */

  /* ==== ql_unmht mod: remove: unused function: paramNames ==== */

  /**
   * フィールドを持っているかを返す
   *
   * @param   {string} name
   *          フィールド名
   * @returns {boolean}
   *          フィールドを持っているか
   */
  hasParam: function(name) {
    let nameL = name.toLowerCase();
    return this._params.has(nameL);
  },

  /**
   * フィールドを持っているかを返す
   *
   * @param   {string} name
   *          フィールド名
   * @returns {string}
   *          フィールド値
   */
  getParam: function(name) {
    let nameL = name.toLowerCase();
    return this._params.get(nameL)[1];
  },

  /**
   * フィールドを追加する
   *
   * @param   {string} name
   *          フィールド名
   * @param   {string} value
   *          フィールド値
   */
  addParam: function(name, value) {
    let nameL = name.toLowerCase();
    this._params.set(nameL, [name, value]);
  },

  /* ==== ql_unmht mod: remove: unused function: removeParam ==== */
});

/* ---- base/arMIMEParser.jsm ---- */

/**
 * Base64 デコードする
 * 改行を含むものや破損したものにも対応
 *
 * @param   {string} text
 *          デコードする文字列
 * @returns {string}
 *          デコードされた文字列
 */
function safe_atob(text) {
  try {
    /* まずは生のデータで試行 */
    return atob(text);
  } catch (e) {
    try {
      /* 不要なデータを削除する */
      text = text.replace(/[^A-Za-z0-9+\/=]+/g, "");
      return atob(text.slice(0, text.length - text.length % 4));
    } catch (e2) {
      /* 途中にパディングがある等、壊れているデータ */
      return "";
    }
  }
}

/**
 * パースエラー
 */
let arMIMEParserError = Object.freeze({
});

/**
 * メールボックス
 */
function arMIMEMailBox() {
  /**
   * グループか
   * @type {boolean}
   */
  this.isGroup = false;

  /**
   * 名前
   * @type {string}
   */
  this.name = null;

  /**
   * アドレス
   * @type {string}
   */
  this.addr = null;

  /**
   * メールボックスのリスト
   * @type {Array.<arMIMEMailBox>}
   */
  this.list = null;

  Object.seal(this);
}

/**
 * パラメータの各セクション
 */
function arMIMEParamSection() {
  /**
   * 名前
   * @type {string}
   */
  this.name = null;

  /**
   * 値
   * @type {string}
   */
  this.value = null;

  /**
   * section[RFC 2231]
   * @type {number}
   */
  this.section = null;

  /**
   * charset[RFC 2231]
   * @type {string}
   */
  this.charset = null;

  /**
   * language[RFC 2231]
   * @type {string}
   */
  this.language = null;

  /**
   * extended-parameter か
   * @type {boolean}
   */
  this.extended = false;

  Object.seal(this);
}

/**
 * パースエラー以外を報告
 *
 * @param   {Error} e
 */
function check_error(e) {
  if (e != arMIMEParserError) {
    /* ==== ql_unmht mod: remove: Cu.reportError ==== */
  }
}

/**
 * パーサ
 *
 * @param   {string} _INPUT
 *          入力文字列
 */
function arMIMEParser(_INPUT) {
  this._INPUT = _INPUT;
  this._INPUT_LEN = _INPUT.length;
  this._POS = 0;

  Object.seal(this);
}
arMIMEParser.prototype = Object.freeze({
  /**
   * 入力の終了にマッチする
   */
  __END: function() {
    if (this._POS < this._INPUT_LEN) {
      throw arMIMEParserError;
    }
  },

  /**
   * 文字列にマッチすれば消費する
   *
   * @param   {string}
   * @returns {string}
   */
  _C: function(c) {
    if (!this._INPUT.slice(this._POS).startsWith(c)) {
      throw arMIMEParserError;
    }
    this._POS += c.length;

    return c;
  },

  /**
   * 1 文字消費する
   *
   * @returns {string}
   */
  _SINGLE_CHAR: function() {
    if (this._POS >= this._INPUT_LEN) {
      throw arMIMEParserError;
    }
    let ret = this._INPUT[this._POS];
    this._POS += 1;

    return ret;
  },

  /**
   * 全て消費する
   *
   * @returns {string}
   */
  _ALL_CHARS: function() {
    let ret = this._INPUT.slice(this._POS);
    this._POS = this._INPUT_LEN;

    return ret;
  },

  /**
   * 全て破棄する
   */
  _DISCARD: function() {
    this._POS = this._INPUT_LEN;
  },

  /**
   * 指定文字数消費する
   *
   * @param   {number} len
   * @returns {string}
   */
  _SKIP: function(len) {
    let ret = this._INPUT.slice(this._POS, this._POS + len);
    this._POS += len;
    if (this._POS > this._INPUT_LEN) {
      throw arMIMEParserError;
    }

    return ret;
  },

  /**
   * 文字列にマッチするまで消費する
   *
   * @param   {string} c
   * @param   {boolean} consume_c
   *          マッチした文字列も消費するか
   * @returns {string}
   */
  _SKIP_TO: function(c, consume_c) {
    let p = this._INPUT.indexOf(c, this._POS);
    if (p == -1) {
      throw arMIMEParserError;
    }
    let s = this._INPUT.slice(this._POS, p);
    if (consume_c) {
      p += c.length;
    }
    this._POS = p;

    return s;
  },

  /**
   * 正規表現にマッチすれば消費する
   *
   * @param   {RegExp}
   * @returns {string}
   */
  _R: function(r) {
    let m = this._INPUT.slice(this._POS).match(r);

    if (!m) {
      throw arMIMEParserError;
    }
    this._POS += m[0].length;

    return m[0];
  },

  /**
   * 正規表現にマッチすれば消費する
   *
   * @param   {RegExp}
   * @returns {MatchObject}
   */
  _R_M: function(r) {
    let m = this._INPUT.slice(this._POS).match(r);

    if (!m) {
      throw arMIMEParserError;
    }
    this._POS += m[0].length;

    return m;
  },

  /**
   * 0 回もしくは 1 回の出現を消費する
   *
   * @param   {function} f
   */
  _O: function(f) {
    let p = this._POS;

    try {
      f();
    } catch (e) {
      check_error(e);
      this._POS = p;
    }
  },

  /**
   * min 回以上 max 回以下の出現を消費する
   *
   * @param   {number} min
   * @param   {number} max
   * @param   {function} f
   */
  _N: function(min, max, f) {
    let i = 0;

    for (; i < min; i += 1) {
      f();
    }

    for (; i < max; i += 1) {
      let p = this._POS;

      try {
        f();

        if (this._POS == p) {
          break;
        }
      } catch (e) {
        check_error(e);
        this._POS = p;
        break;
      }
    }
  },

  /**
   * 0 回以上の出現を消費する
   *
   * @param   {function} f
   */
  _0N: function(f) {
    for (;;) {
      let p = this._POS;

      try {
        f();

        if (this._POS == p) {
          break;
        }
      } catch (e) {
        check_error(e);
        this._POS = p;
        break;
      }
    }
  },

  /**
   * 1 回以上の出現を消費する
   *
   * @param   {function} f
   */
  _1N: function(f) {
    f();

    for (;;) {
      let p = this._POS;

      try {
        f();

        if (this._POS == p) {
          break;
        }
      } catch (e) {
        check_error(e);
        this._POS = p;
        break;
      }
    }
  },

  /**
   * 最初に出現したパターンを消費する
   *
   * @param   {...function} fs
   * @returns {*}
   */
  _ONEOF: function(...fs) {
    let p = this._POS;
    for (let f of fs) {
      try {
        return f();
      } catch (e) {
        this._POS = p;
        check_error(e);
      }
    }
    throw arMIMEParserError;
  },

  /* == RFC 2017: Definition of the URL MIME External-Body Access-Type == */

  /**
   * URL-parameter := <"> URL-word *(*LWSP-char URL-word) <">
   *
   * @returns {string}
   */
  RE_LWSP_char_0N: /^[\t ]*/,
  URL_parameter: function() {
    this._C("\"");
    let ret = this.URL_word();
    this._0N(() => {
      this._O(() => this.FWS());
      this._R(this.RE_LWSP_char_0N);
      this._O(() => this.FWS());
      ret += this.URL_word();
    });
    this._C("\"");

    return ret;
  },

  /**
   * URL-word := token
   *             ; Must not exceed 40 characters in length
   *
   * @returns {string}
   */
  RE_URL_word: /^[^ \t\r\n\"\\]+/,
  URL_word: function() {
    return this._R(this.RE_URL_word);
  },

  /* == RFC 2045: Format of Internet Message Bodies == */

  /* #5.  Content-Type Header Field
   * #5.1.  Syntax of the Content-Type Header Field */

  /**
   * content := "Content-Type" ":" type "/" subtype
   *            *(";" parameter)
   *            ; Matching of media type and subtype
   *            ; is ALWAYS case-insensitive.
   * type := discrete-type / composite-type
   * discrete-type := "text" / "image" / "audio" / "video" /
   *                  "application" / extension-token
   * composite-type := "message" / "multipart" / extension-token
   * extension-token := ietf-token / x-token
   * ietf-token := <An extension token defined by a
   *                standards-track RFC and registered
   *                with IANA.>
   * x-token := <The two characters "X-" or "x-" followed, with
   *             no intervening white space, by any token>
   * subtype := extension-token / iana-token
   * iana-token := <A publicly-defined extension token. Tokens
   *                of this form must be registered with IANA
   *                as specified in RFC 2048.>
   *
   * @returns {arMIMEParam}
   */
  content__value: function() {
    return this.parameter_list();
  },

  /**
   * value := token / quoted-string
   *
   * @returns {string}
   */
  value: function() {
    return this._ONEOF(
      () => this.token(),
      () => this.quoted_string()
    );
  },

  /**
   * token := 1*<any (US-ASCII) CHAR except SPACE, CTLs,
   *             or tspecials>
   * tspecials :=  "(" / ")" / "<" / ">" / "@" /
   *               "," / ";" / ":" / "\" / <"> /
   *               "/" / "[" / "]" / "?" / "="
   *               ; Must be in quoted-string,
   *               ; to use within parameter values
   * Errata ID: 512
   *
   * @returns {string}
   */
  RE_token: /^[^\t\n\r \"\(\),\/:-@\[-\]]+/,
  token: function() {
    return this._R(this.RE_token);
  },

  /* #6.  Content-Transfer-Encoding Header Field
   * #6.1.  Content-Transfer-Encoding Syntax */

  /**
   * encoding := "Content-Transfer-Encoding" ":" mechanism
   * mechanism := "7bit" / "8bit" / "binary" /
   *              "quoted-printable" / "base64" /
   *              ietf-token / x-token
   *
   * @returns {string}
   *          小文字化した文字列
   */
  RE_encoding_7bit: /^7bit/i,
  RE_encoding_8bit: /^8bit/i,
  RE_encoding_binary: /^binary/i,
  RE_encoding_quoted_printable: /^quoted-printable/i,
  RE_encoding_base64: /^base64/i,
  encoding__value: function() {
    this._O(() => this.CFWS());
    let ret = this._ONEOF(
      () => this._R(this.RE_encoding_7bit),
      () => this._R(this.RE_encoding_8bit),
      () => this._R(this.RE_encoding_binary),
      () => this._R(this.RE_encoding_quoted_printable),
      () => this._R(this.RE_encoding_base64),
      () => this.token()
    ).toLowerCase();
    this._O(() => this.CFWS());

    return ret;
  },

  /* #6.7.  Quoted-Printable Content-Transfer-Encoding */

  /**
   * quoted-printable := qp-line *(CRLF qp-line)
   * qp-line := *(qp-segment transport-padding CRLF)
   *            qp-part transport-padding
   * qp-part := qp-section
   *            ; Maximum length of 76 characters
   * qp-segment := qp-section *(SPACE / TAB) "="
   *               ; Maximum length of 76 characters
   * qp-section := [*(ptext / SPACE / TAB) ptext]
   * ptext := hex-octet / safe-char
   * safe-char := <any octet with decimal value of 33 through
   *              60 inclusive, and 62 through 126>
   *              ; Characters not listed as "mail-safe" in
   *              ; RFC 2049 are also not recommended.
   * hex-octet := "=" 2(DIGIT / "A" / "B" / "C" / "D" / "E" / "F")
   *              ; Octet must be used for characters > 127, =,
   *              ; SPACEs or TABs at the ends of lines, and is
   *              ; recommended for any character not listed in
   *              ; RFC 2049 as "mail-safe".
   *
   * [simplified]
   *
   * quoted-printable := *((*(SPACE / TAB) "=" transport-padding CRLF) /
   *                       (transport-padding <end of input>) /
   *                       (transport-padding CRLF) /
   *                       "_" /
   *                       hex-octet /
   *                       (<any octet>
   *                        *<any octet except "=", "_", SPACE, HTAB,
   *                          CR and LF>))
   *
   * @returns {string}
   *          デコードした文字列
   *          未知の部分文字列はそのまま返す
   */
  quoted_printable: function(underscoreToSpace=false) {
    let ret = "";
    let POS = this._POS;
    let INPUT = this._INPUT;
    let INPUT_LEN = this._INPUT_LEN;
    let padding = "";
    let lastPadding = false;
    while (POS < INPUT_LEN) {
      let c = INPUT.charAt(POS);
      POS += 1;
      let code = c.charCodeAt(0);

      if (code == 0x20 || code == 0x09) {
        padding += c;
        lastPadding = true;
        continue;
      }
      if (code == 0x3d) {
        if (lastPadding) {
          ret += padding;
          padding = "";
          lastPadding = false;
        }

        let c1 = INPUT.charAt(POS);
        let code1 = c1.charCodeAt(0);
        if ((code1 >= 0x30 && code1 <= 0x39) ||
            (code1 >= 0x41 && code1 <= 0x46) ||
             (code1 >= 0x61 && code1 <= 0x66)) {
          let c2 = INPUT.charAt(POS + 1);
          let code2 = c2.charCodeAt(0);
          if ((code2 >= 0x30 && code2 <= 0x39) ||
              (code2 >= 0x41 && code2 <= 0x46) ||
              (code2 >= 0x61 && code2 <= 0x66)) {
            POS += 2;
            ret += String.fromCharCode(parseInt(c1 + c2, 16));

            continue;
          }
        }

        let POS2 = POS;
        while (code1 == 0x20 || code1 == 0x09) {
          POS2 += 1;
          c1 = INPUT.charAt(POS2);
          code1 = c1.charCodeAt(0);
        }
        if (code1 == 0x0d) {
          POS = POS2 + 1;
          if (INPUT.charCodeAt(POS) == 0x0a) {
            POS += 1;
          }
          continue;
        }
        if (code1 == 0x0a) {
          POS = POS2 + 1;
          continue;
        }

        ret += c;
        continue;
      }
      if (code == 0x0d) {
        ret += "\r";
        lastPadding = false;
        if (INPUT.charCodeAt(POS) == 0x0a) {
          ret += "\n";
          POS += 1;
        }
        continue;
      }
      if (code == 0x0a) {
        ret += "\n";
        lastPadding = false;
        continue;
      }

      if (lastPadding) {
        ret += padding;
        padding = "";
        lastPadding = false;
      }

      if (code == 0x5f && underscoreToSpace) {
        ret += " ";
      } else {
        ret += c;
      }
    }

    this._POS = POS;

    return ret;
  },

  /**
   * transport-padding := *LWSP-char
   *                      ; Composers MUST NOT generate
   *                      ; non-zero length transport
   *                      ; padding, but receivers MUST
   *                      ; be able to handle padding
   *                      ; added by message transports.
   * LWSP-char   =  SPACE / HTAB
   * (From RFC 822)
   */
  RE_transport_padding: /^[\t ]*/,
  transport_padding: function() {
    this._R(this.RE_transport_padding);
  },

  /* #7.  Content-ID Header Field */

  /**
   * id := "Content-ID" ":" msg-id
   *
   * msg-id の形式になっていないもの、angle が無いものも対応する
   *
   * @returns {string}
   */
  id__value: function() {
    return this.cid();
  },

  /* == RFC 2046: Media Types == */

  /* #5.  Composite Media Type Values
   * #5.1.  Multipart Media Type
   * #5.1.1.  Common Syntax */

  /**
   * boundary := 0*69<bchars> bcharsnospace
   * bchars := bcharsnospace / " "
   * bcharsnospace := DIGIT / ALPHA / "'" / "(" / ")" /
   *                  "+" / "_" / "," / "-" / "." /
   *                  "/" / ":" / "=" / "?"
   * dash-boundary := "--" boundary
   *                  ; boundary taken from the value of
   *                  ; boundary parameter of the
   *                  ; Content-Type field.
   * multipart-body := [preamble CRLF]
   *                   dash-boundary transport-padding CRLF
   *                   body-part *encapsulation
   *                   close-delimiter transport-padding
   *                   [CRLF epilogue]
   * encapsulation := delimiter transport-padding
   *                  CRLF body-part
   * delimiter := CRLF dash-boundary
   * close-delimiter := delimiter "--"
   * preamble := discard-text
   * epilogue := discard-text
   * discard-text := *(*text CRLF) *text
   *                 ; May be ignored or discarded.
   * body-part := MIME-part-headers [CRLF *OCTET]
   *              ; Lines in a body-part must not start
   *              ; with the specified dash-boundary and
   *              ; the delimiter must not appear anywhere
   *              ; in the body part.  Note that the
   *              ; semantics of a body-part differ from
   *              ; the semantics of a message, as
   *              ; described in the text.
   * OCTET := <any 0-255 octet value>
   *
   * [simplified]
   * multipart-body := [preamble CRLF]
   *                   dash-boundary transport-padding CRLF
   *                   *(body-part
   *                     delimiter transport-padding CRLF)
   *                   body-part
   *                   [delimiter "--" <discard>]
   *
   * 破損したファイルをサポートするために close-delimiter をオプショナルにする
   *
   * @param   {string} boundary
   *          boundary
   * @param   {object} isCorrupted
   *          (オプショナル)
   *          {
   *            value: {boolean} 破損したかどうか
   *          }
   * @returns {Array.<string>}
   */
  multipart_body: function(boundary, isCorrupted) {
    let dash_boundary = "--" + boundary;

    this._SKIP_TO(dash_boundary, true);
    this.transport_padding();
    this.CRLF();

    let datas = [];
    let delimiter = "\r\n--" + boundary;
    let delimiter_len = delimiter.length;
    let closed = false;
    while (!closed) {
      let done = false;
      let s = "";

      while (!done) {
        let hasDelimiter = false;
        this._O(() => {
          s += this._SKIP_TO(delimiter, false);
          hasDelimiter = true;
        });
        if (!hasDelimiter) {
          /* close-delimiter を含まない破損したファイル */
          s += this._ALL_CHARS();
          datas.push(s);
          closed = true;
          if (isCorrupted) {
            isCorrupted.value = true;
          }
          break;
        }

        this._ONEOF(
          () => {
            this._SKIP(delimiter_len);
            this._ONEOF(
              () => {
                this.transport_padding();
                this.CRLF();
              },
              () => {
                this._C("--");
                closed = true;
              }
            );

            datas.push(s);
            done = true;
          },
          () => {
            /* delimiter と前方一致するが delimiter でない物が含まれたので
             * 1 文字先まで飛ばす */
            s += this._SINGLE_CHAR();
          }
        );
      }
    }

    this._DISCARD();

    return datas;
  },

  /* == RFC 2047: Message Header Extensions for Non-ASCII Text == */

  /* #2. Syntax of encoded-words */

  /**
   * any 'linear-white-space' that separates a pair of
   * adjacent 'encoded-word's is ignored.
   *
   * ただし、デコードできなかった場合は無視しない
   *
   * [simplified]
   * encoded-word-seq = encoded-word *(FWS encoded-word)
   *
   * @returns {string}
   *          デコードした文字列
   */
  encoded_word_seq: function() {
    let [lastDecoded, ret] = this.encoded_word();
    this._0N(() => {
      let s = this.FWS();
      let [decoded, t] = this.encoded_word();
      if (!lastDecoded || !decoded) {
        ret += s;
      }
      ret += t;
      lastDecoded = decoded;
    });

    return ret;
  },

  /**
   * token = 1*<Any CHAR except SPACE, CTLs, and especials>
   * especials = "(" / ")" / "<" / ">" / "@" / "," / ";" / ":" / "\" /
   *             <"> / "/" / "[" / "]" / "?" / "." / "="
   *
   * RFC 2045 の token と被るので名前を変える
   *
   * @returns {string}
   */
  RE_ew_token: /^[^\t\n\r \"\(\),\.\/:-@\[-\]]+/,
  ew_token: function() {
    return this._R(this.RE_ew_token);
  },

  RE_ew_token_noast: /^[^\t\n\r \"\(\),\.\/:-@\[-\]\*]+/,
  ew_token_noast: function() {
    return this._R(this.RE_ew_token_noast);
  },

  /* #5. Use of encoded-words in message headers */

  /**
   * RFC 2047 で encoded-word が RFC 822 の text 代わりに使えると書いてあるが
   * RFC 5322 で text は unstructured になっているので
   * unstructured 中の encoded-word をデコードできるようにする
   *
   * unstructured-ew =   *(*FWS
   *                       1*(encoded-word-seq / 1*obs-utext-ne / "=")) *WSP
   * obs-utext-ne    =   <obs-utext except "=">
   *
   * 前後の FWS は削除する
   *
   * unstructured-ew =   *FWS
   *                     *(*FWS
   *                       1*(encoded-word-seq / 1*obs-utext-ne / "=")) *FWS
   *
   * @returns {string}
   */
  RE_utext_ne_1n: /^[^\t\n\r \x3d]+/,
  unstructured_ew: function() {
    let ret = "";

    this._0N(() => this.FWS());
    this._0N(() => {
      let s = "";

      this._0N(() => {
        s += this.FWS();
      });
      this._1N(() => {
        s += this._ONEOF(
          () => this.encoded_word_seq(),
          () => this._R(this.RE_utext_ne_1n),
          () => this._C("=")
        );
      });

      ret += s;
    });
    this._0N(() => this.FWS());

    return ret;
  },

  /* == RFC 2183: The Content-Disposition Header Field == */

  /* 2.  The Content-Disposition Header Field */

  /**
   * disposition := "Content-Disposition" ":"
   *                disposition-type
   *                *(";" disposition-parm)
   * disposition-type := "inline"
   *                   / "attachment"
   *                   / extension-token
   *                   ; values are not case-sensitive
   * disposition-parm := filename-parm
   *                   / creation-date-parm
   *                   / modification-date-parm
   *                   / read-date-parm
   *                   / size-parm
   *                   / parameter
   * filename-parm := "filename" "=" value
   * creation-date-parm := "creation-date" "=" quoted-date-time
   * modification-date-parm := "modification-date" "=" quoted-date-time
   * read-date-parm := "read-date" "=" quoted-date-time
   * size-parm := "size" "=" 1*DIGIT
   * quoted-date-time := quoted-string
   *                  ; contents MUST be an RFC 822 `date-time'
   *                  ; numeric timezones (+HHMM or -HHMM) MUST be used
   *
   * [simplified]
   * disposition-type := token
   * disposition-parm := parameter
   *
   * @returns {arMIMEParam}
   */
  content_disposition__value: function() {
    return this.parameter_list();
  },

  /* == RFC 2231: Parameter Value and Encoded Word == */

  /**
   * parameter := regular-parameter / extended-parameter
   *
   * @return {arMIMEParamSection}
   */
  parameter: function() {
    return this._ONEOF(
      () => this.regular_parameter(),
      () => this.extended_parameter(),
      () => {
        /* クォートされるべき文字がクォートされていないものへの暫定対応
         * 以下の文字を許可する
         * ( ) < > @
         * , ; :
         * / [ ]
         */
        let ret = new arMIMEParamSection();

        ret.name = this.attribute();
        this._O(() => {
          ret.section = this.section();
        });
        this._C("=");
        ret.value = this._R(/^[^\t\n\r \";=\?\\]+/);

        return ret;
      }
    );
  },

  /**
   * Content-Type と Content-Disposition で同じものを使うので共通化
   * また、type/subtype と disposition-type が先頭以外にある例があるので
   * これも同時に解析する
   *
   * parameter-list := *(((type "/" subtype) /
   *                      disposition-type /
   *                      parameter) [";"])
   *
   * @returns {arMIMEParam}
   */
  parameter_list: function() {
    let ret = new arMIMEParams();

    let sections = [];
    let type_found = false;

    this._0N(() => {
      this._O(() => this.CFWS());
      this._ONEOF(
        () => {
          sections.push(this.parameter());
        },
        () => {
          if (type_found) {
            throw arMIMEParserError;
          }

          ret.type = this.token().toLowerCase();
          this._O(() => this.CFWS());
          this._C("/");
          this._O(() => this.CFWS());
          ret.subtype = this.token().toLowerCase();

          type_found = true;
        },
        () => {
          if (type_found) {
            throw arMIMEParserError;
          }

          ret.type = this.token().toLowerCase();

          type_found = true;
        }
      );
      this._O(() => this.CFWS());
      /* セミコロンが無いものをサポート */
      this._O(() => this._C(";"));
    });

    if (!type_found) {
      throw arMIMEParserError;
    }

    let ps = new Map();
    for (let s of sections) {
      let name = s.name;
      let p = null;
      if (ps.has(name)) {
        p = ps.get(name);
      } else {
        p = {
          values: [],
          charset: null,
          language: null
        };
        ps.set(name, p);
      }
      if (s.charset) {
        p.charset = s.charset;
      }
      if (s.language) {
        p.language = s.language;
      }
      p.values.push(s);
    }

    for (let [name, p] of ps) {
      let value = "";
      p.values.sort((a, b) => a.section - b.section);

      for (let s of p.values) {
        if (s.extended) {
          value += arUconv.toUnicode(s.value, p.charset);
        } else {
          try {
            /* ここでは encoded-word は使えない事になっているが
             * 使われている事例が沢山ある */
            let context = new arMIMEParser(s.value);
            let t = context.unstructured_ew();
            context.__END();
            value += t;
          } catch (e) {
            value += s.value;
          }
        }
      }

      ret.addParam(name, value);
    }

    return ret;
  },

  /**
   * regular-parameter := regular-parameter-name "=" value
   * regular-parameter-name := attribute [section]
   *
   * @return {arMIMEParamSection}
   */
  regular_parameter: function() {
    let ret = new arMIMEParamSection();

    ret.name = this.attribute();
    this._O(() => {
      ret.section = this.section();
    });
    this._C("=");
    ret.value = this.value();

    return ret;
  },

  /**
   * attribute := 1*attribute-char
   *
   * @returns {string}
   */
  attribute: function() {
    return this.attribute_char_1n();
  },

  /**
   * attribute-char := <any (US-ASCII) CHAR except SPACE, CTLs,
   *                    "*", "'", "%", or tspecials>
   *
   * @returns {string}
   */
  RE_attribute_char: /^[^\t\n\r \"%\'-\*,\/:-@\[-\]]/,
  attribute_char: function() {
    return this._R(this.RE_attribute_char);
  },
  RE_attribute_char_1n: /^[^\t\n\r \"%\'-\*,\/:-@\[-\]]+/,
  attribute_char_1n: function() {
    return this._R(this.RE_attribute_char_1n);
  },

  /**
   * section := initial-section / other-sections
   *
   * @returns {number}
   */
  section: function() {
    return this._ONEOF(
      () => this.initial_section(),
      () => this.other_sections()
    );
  },

  /**
   * initial-section := "*0"
   *
   * @returns {number}
   */
  initial_section: function() {
    this._C("*0");

    return 0;
  },

  /**
   * other-sections := "*" ("1" / "2" / "3" / "4" / "5" /
   *                        "6" / "7" / "8" / "9") *DIGIT)
   *
   * @returns {number}
   */
  RE_other_sections: /^\*([1-9][0-9]*)/,
  other_sections: function() {
    let m = this._R_M(this.RE_other_sections);
    let section = parseInt(m[1], 10);

    return section;
  },

  /**
   * extended-parameter := (extended-initial-name "="
   *                        extended-initial-value) /
   *                       (extended-other-names "="
   *                        extended-other-values)
   * extended-initial-name := attribute [initial-section] "*"
   * extended-other-names := attribute other-sections "*"
   * extended-initial-value := [charset] "'" [language] "'"
   *                           extended-other-values
   * charset := <registered character set name>
   * language := <registered language tag [RFC-1766]>
   * Errata ID: 477
   *
   * @return {arMIMEParamSection}
   */
  RE_charset: /^[^\t\n\r \"\(\),\.\/:-@\[-\]\?\']+/,
  RE_language: /^[^\t\n\r \"\(\),\.\/:-@\[-\]\?\']+/,
  extended_parameter: function() {
    return this._ONEOF(
      () => {
        let ret = new arMIMEParamSection();

        ret.name = this.attribute();
        this._O(() => {
          ret.section = this.initial_section();
        });
        this._C("*");
        ret.extended = true;
        this._C("=");
        this._O(() => {
          ret.charset = this._R(this.RE_charset);
        });
        this._C("'");
        this._O(() => {
          ret.language = this._R(this.RE_language);
        });
        this._C("'");
        ret.value = this.extended_other_values();

        return ret;
      },
      () => {
        let ret = new arMIMEParamSection();

        ret.name = this.attribute();
        this._O(() => {
          ret.section = this.other_sections();
        });
        this._C("*");
        ret.extended = true;
        this._C("=");
        ret.value = this.extended_other_values();

        return ret;
      }
    );
  },

  /**
   * extended-other-values := *(ext-octet / attribute-char)
   *
   * @returns {string}
   */
  extended_other_values: function() {
    let ret = "";

    this._0N(() => {
      ret += this._ONEOF(
        () => this.ext_octet(),
        () => this.attribute_char()
      );
    });

    return ret;
  },

  /**
   * ext-octet := "%" 2(DIGIT / "A" / "B" / "C" / "D" / "E" / "F")
   *
   * @returns {string}
   *          デコードした文字列
   */
  RE_ext_octet: /^%([0-9A-Fa-f]{2})/,
  ext_octet: function() {
    let m = this._R_M(this.RE_ext_octet);
    return String.fromCharCode(parseInt(m[1], 16));
  },

  /**
   * encoded-word := "=?" charset ["*" language] "?" encoding "?"
   *                 encoded-text "?="
   * charset = token    ; see section 3
   * encoding = token   ; see section 4
   * encoded-text = 1*<Any printable ASCII character other than "?"
   *                   or SPACE>
   *                ; (but see "Use of encoded-words in message
   *                ; headers", section 5)
   * (From RFC 2047)
   *
   * @returns {Tuple.<boolean,string>}
   *            [true,デコードした文字列]
   *            [false,デコードしてない文字列]
   */
  RE_encoded_text: /^[^ \?]+/,
  encoded_word: function() {
    let orig = "";

    orig += this._C("=?");
    let charset = this.ew_token_noast(); orig += charset;
    this._O(() => {
      orig += this._C("*");
      let language = this.ew_token_noast(); orig += language;
    });
    orig += this._C("?");
    let encoding = this.ew_token().toUpperCase(); orig += encoding;
    orig += this._C("?");
    let text = this._R(this.RE_encoded_text); orig += text;
    orig += this._C("?=");

    if (encoding == "Q") {
      let context = new arMIMEParser(text);
      let t = context.quoted_printable(true);
      context.__END();
      return [true, arUconv.toUnicode(t, charset)];
    } else if (encoding == "B") {
      let t = safe_atob(text);
      return [true, arUconv.toUnicode(t, charset)];
    }

    return [false, orig];
  },

  /* == RFC 2387: The MIME Multipart/Related Content-type == */

  /**
   * related-param   := [ ";" "start" "=" cid ]
   *                    [ ";" "start-info"  "="
   *                       ( cid-list / value ) ]
   *                    [ ";" "type"  "=" type "/" subtype ]
   *                    ; order independent
   * cid-list        := cid cid-list
   * value           := token / quoted-string    ; c.f. [MIME]
   *                       ; value cannot begin with "<"
   *
   * @return {string}
   */
  related_param_start: function() {
    return this.cid();
  },

  /**
   * cid             := msg-id     ; c.f. [822]
   *
   * @return {string}
   */
  cid: function() {
    return this._ONEOF(
      () => this.msg_id(),
      () => {
        this._O(() => this.CFWS());
        this._C("<");
        let s = this.local_part();
        this._C(">");
        this._O(() => this.CFWS());

        return s;
      },
      () => {
        this._O(() => this.CFWS());
        let s = this.local_part();
        this._O(() => this.CFWS());

        return s;
      }
    );
  },

  /* == RFC 2392: Content-ID and Message-ID Uniform Resource Locators == */

  /*
   * content-id    = url-addr-spec
   * message-id    = url-addr-spec
   * url-addr-spec = addr-spec  ; URL encoding of RFC 822 addr-spec
   * cid-url       = "cid" ":" content-id
   * mid-url       = "mid" ":" message-id [ "/" content-id ]
   */

  /* == RFC 2557: MIME Encapsulation of Aggregate Documents, such as HTML == */

  /**
   * content-location =   "Content-Location:" [CFWS] URI [CFWS]
   *
   * RFC 2017 の URL-parameter か URI
   * encoded-word が含まれている場合があるのでこれも対処する
   *
   * @returns {string}
   */
  content_location__value: function() {
    this._O(() => this.CFWS());
    let ret = this._ONEOF(
      () => this.URL_parameter(),
      () => this.unstructured_ew()
    );
    this._O(() => this.CFWS());

    return ret;
  },

  /* == RFC 3676: The Text/Plain Format and DelSp Parameters == */

  /**
   * flowed-body      = *( paragraph / fixed-line / sig-sep )
   * paragraph        = 1*flowed-line fixed-line
   *                    ; all lines in paragraph MUST be unquoted or
   *                    ; have same quote depth
   * flowed-line      = ( flowed-line-qt / flowed-line-unqt ) flow CRLF
   * flowed-line-qt   = quote ( ( stuffing stuffed-flowed ) /
   *                            unstuffed-flowed )
   * flowed-line-unqt = ( stuffing stuffed-flowed ) / unstuffed-flowed
   * stuffed-flowed   = *text-char
   * unstuffed-flowed = non-sp-quote *text-char
   * fixed-line       = fixed-line-qt / fixed-line-unqt
   * fixed-line-qt    = quote ( ( stuffing stuffed-fixed ) /
   *                            unstuffed-fixed ) CRLF
   * fixed-line-unqt  = ( stuffed-fixed / unstuffed-fixed ) CRLF
   * stuffed-fixed    = *text-char non-sp
   * unstuffed-fixed  = non-sp-quote [ *text-char non-sp ]
   * sig-sep          = [ quote [stuffing] ] "--" SP CRLF
   * quote-mark       = ">"
   * quote            = 1*quote-mark
   * stuffing         = SP ; space-stuffed, added on generation if
   *                       ; needed, deleted on reception
   * flow             = SP ; space before CRLF indicates flowed line,
   *                       ; if DelSp=yes, space was added on generation
   *                       ; and is deleted on reception
   * non-sp-quote     = < any character except NUL, CR, LF, SP, quote-mark >
   * non-sp           = non-sp-quote / quote-mark
   * text-char        = non-sp / SP
   *
   * 末尾の CRLF をオプショナルにする
   *
   * @param   {boolean} delsp
   * @returns {string}
   */
  RE_sig_sep: /^(>*) ?(-- )(?:(\r\n)|$)/,
  RE_flowed_or_fixed_line: /^(>*) ?([^\0\n\r]*?)( ?)(?:(\r\n)|$)/,
  flowed_body: function(delsp) {
    let last_quote = "";
    let last_flowed = false;
    let last_crlf = "";
    let ret = "";

    this._0N(() => {
      this._ONEOF(
        () => {
          let m = this._R_M(this.RE_sig_sep);
          let quote = m[1];
          let line = m[2];
          let crlf = m[3];
          ret += quote + line;
          if (crlf) {
            ret += "\r\n";
          }

          last_flowed = false;
          last_crlf = crlf;
          last_quote = quote;
        },
        () => {
          let m = this._R_M(this.RE_flowed_or_fixed_line);
          let quote = m[1];
          let line = m[2];
          let flow = m[3];
          let crlf = m[4];

          if (last_quote != quote) {
            if (last_flowed) {
              ret += "\r\n";
              last_flowed = false;
            }
          }

          if (!last_flowed) {
            ret += quote;
          }

          ret += line;
          if (!delsp) {
            ret += flow;
          }
          if (!flow) {
            if (crlf) {
              ret += "\r\n";
            }
          }

          last_flowed = flow == " ";
          last_crlf = crlf;
          last_quote = quote;
        }
      );
    });

    return ret;
  },

  /* == RFC 4155: The application/mbox Media Type == */

  /* message[RFC 5322] でまとめて解析する */

  /* == RFC 5234: ABNF == */

  /* #B.1.  Core Rules */

  /**
   * CR             =  %x0D
   *                        ; carriage return
   * CRLF           =  CR LF
   *                        ; Internet standard newline
   * LF             =  %x0A
   *                        ; linefeed
   *
   * @returns {string}
   */
  CRLF: function() {
    return this._C("\r\n");
  },

  /**
   * VCHAR          =  %x21-7E
   *                        ; visible (printing) characters
   *
   * @returns {string}
   */
  RE_VCHAR_1N: /^[\!-\x7e]+/,
  VCHAR_1N: function() {
    return this._R(this.RE_VCHAR_1N);
  },

  /**
   *  WSP            =  SP / HTAB
   *                        ; white space
   *
   * @returns {string}
   */
  RE_WSP_0N: /^[\t ]*/,
  WSP_0N: function() {
    return this._R(this.RE_WSP_0N);
  },
  RE_WSP_1N: /^[\t ]+/,
  WSP_1N: function() {
    return this._R(this.RE_WSP_1N);
  },

  /* == RFC 5322: Internet Message Format == */

  /* #3.  Syntax
   * #3.2.  Lexical Tokens
   * #3.2.1.  Quoted characters */

  /**
   * quoted-pair     =   ("\" (VCHAR / WSP)) / obs-qp
   * obs-NO-WS-CTL   =   %d1-8 /            ; US-ASCII control
   *                     %d11 /             ;  characters that do not
   *                     %d12 /             ;  include the carriage
   *                     %d14-31 /          ;  return, line feed, and
   *                     %d127              ;  white space characters
   * obs-qp          =   "\" (%d0 / obs-NO-WS-CTL / LF / CR)
   *
   * @returns {string}
   *          バックスラッシュを除いた文字
   */
  RE_quoted_pair: /^\\([\0-\x7f])/,
  quoted_pair: function() {
    let m = this._R_M(this.RE_quoted_pair);
    return m[1];
  },

  /* #3.2.2.  Folding White Space and Comments */

  /**
   * FWS             =   ([*WSP CRLF] 1*WSP) /  obs-FWS
   *                                        ; Folding white space
   * obs-FWS         =   1*([CRLF] WSP)
   * Errata ID: 1908
   *
   * obs-FWS だけ使う
   *
   * @returns {string}
   */
  FWS: function() {
    let ret = "";

    this._1N(() => {
      this._O(() => this.CRLF());
      ret += this.WSP_1N();
    });

    return ret;
  },

  /**
   * ctext           =   %d33-39 /          ; Printable US-ASCII
   *                     %d42-91 /          ;  characters not including
   *                     %d93-126 /         ;  "(", ")", or "\"
   *                     obs-ctext
   * obs-ctext       =   obs-NO-WS-CTL
   * ccontent        =   ctext / quoted-pair / comment / encoded_word
   * comment         =   "(" *([FWS] ccontent) [FWS] ")"
   * (Updated by RFC 2047)
   */
  RE_ctext_1n: /^[\x01-\x08\x0b\x0c\x0e-\x1f\!-\'\*-\[\]-\x7f]+/,
  comment: function() {
    this._C("(");
    this._0N(() => {
      this._O(() => this.FWS());

      this._ONEOF(
        /* encoded-word をデコードしても使わないので ctext に消費させる */
        () => this._R(this.RE_ctext_1n),
        () => this.quoted_pair(),
        () => this.comment()
      );
    });
    this._O(() => this.FWS());
    this._C(")");
  },

  /**
   * CFWS            =   (1*([FWS] comment) [FWS]) / FWS
   *
   * @returns {string}
   */
  CFWS: function() {
    return this._ONEOF(() => {
      let s = "";

      this._1N(() => {
        let t = "";
        this._O(() => {
          t += this.FWS();
        });
        this.comment();
        s += t;
      });
      this._O(() => {
        s += this.FWS();
      });

      return s;
    }, () => this.FWS());
  },

  /* #3.2.3.  Atom */

  /**
   * atext           =   ALPHA / DIGIT /    ; Printable US-ASCII
   *                     "!" / "#" /        ;  characters not including
   *                     "$" / "%" /        ;  specials.  Used for atoms.
   *                     "&" / "'" /
   *                     "*" / "+" /
   *                     "-" / "/" /
   *                     "=" / "?" /
   *                     "^" / "_" /
   *                     "`" / "{" /
   *                     "|" / "}" /
   *                     "~"
   *
   * @returns {string}
   */
  RE_atext_1n: /^[\!#-\'\*\+\-\/-9\x3d\?A-Z\^-\x7e]+/,
  atext_1n: function() {
    return this._R(this.RE_atext_1n);
  },

  /**
   * atom            =   [CFWS] 1*atext [CFWS]
   *
   * @param   {boolean=} noCFWS
   * @returns {string}
   */
  atom: function(noCFWS=false) {
    let ret = "";

    if (!noCFWS) {
      this._O(() => this.CFWS());
    }
    ret += this.atext_1n();
    if (!noCFWS) {
      this._O(() => this.CFWS());
    }

    return ret;
  },

  /**
   * dot-atom-text   =   1*atext *("." 1*atext)
   *
   * @returns {string}
   */
  dot_atom_text: function() {
    let ret = this.atext_1n();
    this._0N(() => {
      ret += this._C(".") + this.atext_1n();
    });

    return ret;
  },

  /**
   * dot-atom        =   [CFWS] dot-atom-text [CFWS]
   *
   * @returns {string}
   */
  dot_atom: function() {
    let ret = "";

    this._O(() => this.CFWS());
    ret += this.dot_atom_text();
    this._O(() => this.CFWS());

    return ret;
  },

  /* #3.2.4.  Quoted Strings */

  /**
   * qtext           =   %d33 /             ; Printable US-ASCII
   *                     %d35-91 /          ;  characters not including
   *                     %d93-126 /         ;  "\" or the quote character
   *                     obs-qtext
   * obs-qtext       =   obs-NO-WS-CTL
   * qcontent        =   qtext / quoted-pair
   * quoted-string   =   [CFWS]
   *                     DQUOTE ((1*([FWS] qcontent) [FWS]) / FWS) DQUOTE
   *                     [CFWS]
   * Errata ID: 3135
   *
   * @param   {boolean=} noCFWS
   * @returns {string}
   *          quote を解除した文字列
   */
  RE_qtext_1n: /^[\x01-\x08\x0b\x0c\x0e-\x1f\!#-\[\]-\x7f]+/,
  quoted_string: function(noCFWS=false) {
    let ret = "";

    if (!noCFWS) {
      this._O(() => this.CFWS());
    }
    this._C("\"");
    ret = this._ONEOF(() => {
      let s = "";

      this._1N(() => {
        let t = "";

        this._O(() => {
          t = this.FWS();
        });
        s += t + this._ONEOF(
          () => this._R(this.RE_qtext_1n),
          () => this.quoted_pair()
        );
      });
      this._O(() => {
        s += this.FWS();
      });

      return s;
    }, () => this.FWS());
    this._C("\"");
    if (!noCFWS) {
      this._O(() => this.CFWS());
    }

    return ret;
  },

  /* #3.2.5.  Miscellaneous Tokens */

  /**
   * word            =   atom / quoted-string
   *
   * @param   {boolean=} noCFWS
   * @returns {string}
   */
  word: function(noCFWS=false) {
    return this._ONEOF(
      () => this.atom(noCFWS),
      () => this.quoted_string(noCFWS)
    );
  },

  /**
   * phrase          =   1*(encoded-word-seq / word) / obs-phrase
   * obs-phrase      =   (encoded-word-seq / word)
   *                     *(encoded-word-seq / word / "." / CFWS)
   * (Updated by RFC 2047)
   *
   * obs-phrase だけ使う
   *
   * @returns {string}
   *          スペース区切りの文字列
   */
  phrase: function() {
    let ret = "";

    this._O(() => this.CFWS());
    ret += this._ONEOF(
      () => this.encoded_word_seq(true),
      () => this.word(true)
    );
    this._0N(() => {
      let s = "";

      this._O(() => {
        s += this.CFWS();
      });
      s += this._ONEOF(
        () => this.encoded_word_seq(true),
        () => this.word(true),
        () => this._C(".")
      );

      ret += s;
    });
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * unstructured    =   (*([FWS] VCHAR) *WSP) / obs-unstruct
   * obs-utext       =   %d0 / obs-NO-WS-CTL / VCHAR
   * obs-unstruct    =   *( (*CR 1*(obs-utext / FWS)) / 1*LF ) *CR
   * Errata ID: 1905
   *
   * 入力として CRLF のみを想定するので
   * obs-unstruct の独立した CR と LF は無視する
   *
   * [simplified]
   *
   * 前後の FWS は削除する
   *
   * unstructured =   *FWS
   *                     *(*FWS 1*obs-utext) *FWS
   *
   * @returns {string}
   */
  RE_utext_1n: /^[^\t\n\r ]+/,
  unstructured: function() {
    let ret = "";

    this._0N(() => this.FWS());
    this._0N(() => {
      let s = "";
      this._0N(() => {
        s += this.FWS();
      });
      s += this._R(this.RE_utext_1n);
      ret += s;
    });
    this._0N(() => this.FWS());

    return ret;
  },

  /* #3.3.  Date and Time Specification */

  /**
   * date-time       =   [ day-of-week "," ] date time [CFWS]
   * date            =   day month year
   *
   * @returns {Date}
   */
  date_time: function() {
    let wDay = -1;
    this._O(() => {
      let w = this.day_of_week();
      this._C(",");

      wDay = w;
    });
    let day = this.day();
    let month = this.month();
    let year = this.year();
    let hour = this.hour();
    this._C(":");
    let minute = this.minute();
    let second = 0;
    this._O(() => {
      this._C(":");
      second = this.second();
    });
    let [zone_sign, zone_hour, zone_minute] = this.zone();
    this._O(() => this.CFWS());

    let ret = new Date(Date.UTC(year, month, day,
                                hour - zone_sign * zone_hour,
                                minute - zone_sign * zone_minute,
                                second));

    return ret;
  },

  /**
   * day-of-week     =   ([FWS] day-name) / obs-day-of-week
   * obs-day-of-week =   [CFWS] day-name [CFWS]
   * day-name        =   "Mon" / "Tue" / "Wed" / "Thu" /
   *                     "Fri" / "Sat" / "Sun"
   *
   * obs-day-of-week だけ使う
   *
   * @returns {number}
   *          日曜日からの日数
   */
  RE_day_of_week_Mon: /^Mon/i,
  RE_day_of_week_Tue: /^Tue/i,
  RE_day_of_week_Wed: /^Wed/i,
  RE_day_of_week_Thu: /^Thu/i,
  RE_day_of_week_Fri: /^Fri/i,
  RE_day_of_week_Sat: /^Sat/i,
  RE_day_of_week_Sun: /^Sun/i,
  day_of_week: function() {
    this._O(() => this.CFWS());
    let ret = this._ONEOF(
      () => { this._R(this.RE_day_of_week_Mon); return 1; },
      () => { this._R(this.RE_day_of_week_Tue); return 2; },
      () => { this._R(this.RE_day_of_week_Wed); return 3; },
      () => { this._R(this.RE_day_of_week_Thu); return 4; },
      () => { this._R(this.RE_day_of_week_Fri); return 5; },
      () => { this._R(this.RE_day_of_week_Sat); return 6; },
      () => { this._R(this.RE_day_of_week_Sun); return 0; }
    );
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * day             =   ([FWS] 1*2DIGIT FWS) / obs-day
   * obs-day         =   [CFWS] 1*2DIGIT [CFWS]
   *
   * obs-day だけ使う
   *
   * @returns {number}
   */
  RE_day: /^[0-9]{1,2}/,
  day: function() {
    this._O(() => this.CFWS());
    let ret = parseInt(this._R(this.RE_day), 10);
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * month           =   "Jan" / "Feb" / "Mar" / "Apr" /
   *                     "May" / "Jun" / "Jul" / "Aug" /
   *                     "Sep" / "Oct" / "Nov" / "Dec"
   *
   * @returns {number}
   *          1 月 を 0 とする
   */
  RE_month_Jan: /^Jan/i,
  RE_month_Feb: /^Feb/i,
  RE_month_Mar: /^Mar/i,
  RE_month_Apr: /^Apr/i,
  RE_month_May: /^May/i,
  RE_month_Jun: /^Jun/i,
  RE_month_Jul: /^Jul/i,
  RE_month_Aug: /^Aug/i,
  RE_month_Sep: /^Sep/i,
  RE_month_Oct: /^Oct/i,
  RE_month_Nov: /^Nov/i,
  RE_month_Dec: /^Dec/i,
  month: function() {
    let ret = this._ONEOF(
      () => { this._R(this.RE_month_Jan); return 0; },
      () => { this._R(this.RE_month_Feb); return 1; },
      () => { this._R(this.RE_month_Mar); return 2; },
      () => { this._R(this.RE_month_Apr); return 3; },
      () => { this._R(this.RE_month_May); return 4; },
      () => { this._R(this.RE_month_Jun); return 5; },
      () => { this._R(this.RE_month_Jul); return 6; },
      () => { this._R(this.RE_month_Aug); return 7; },
      () => { this._R(this.RE_month_Sep); return 8; },
      () => { this._R(this.RE_month_Oct); return 9; },
      () => { this._R(this.RE_month_Nov); return 10; },
      () => { this._R(this.RE_month_Dec); return 11; }
    );

    return ret;
  },

  /**
   * year            =   (FWS 4*DIGIT FWS) / obs-year
   * obs-year        =   [CFWS] 2*DIGIT [CFWS]
   *
   * obs-year だけ使う
   *
   * @returns {number}
   */
  RE_year: /^[0-9]{2,}/,
  year: function() {
    this._O(() => this.CFWS());
    let ret = parseInt(this._R(this.RE_year), 10);
    this._O(() => this.CFWS());

    if (ret < 50) {
      ret += 2000;
    } else if (ret < 100) {
      ret += 1900;
    }

    return ret;
  },

  /**
   * hour            =   2DIGIT / obs-hour
   * obs-hour        =   [CFWS] 2DIGIT [CFWS]
   *
   * obs-hour だけ使う
   *
   * @returns {number}
   */
  RE_hour: /^[0-9]{2}/,
  hour: function() {
    this._O(() => this.CFWS());
    let ret = parseInt(this._R(this.RE_hour), 10);
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * minute          =   2DIGIT / obs-minute
   * obs-minute      =   [CFWS] 2DIGIT [CFWS]
   *
   * obs-minute だけ使う
   *
   * @returns {number}
   */
  RE_minute: /^[0-9]{2}/,
  minute: function() {
    this._O(() => this.CFWS());
    let ret = parseInt(this._R(this.RE_minute), 10);
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * second          =   2DIGIT / obs-second
   * obs-second      =   [CFWS] 2DIGIT [CFWS]
   *
   * obs-second だけ使う
   *
   * @returns {number}
   */
  RE_second: /^[0-9]{2}/,
  second: function() {
    this._O(() => this.CFWS());
    let ret = parseInt(this._R(this.RE_second), 10);
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * zone            =   (FWS ( "+" / "-" ) 4DIGIT) / obs-zone
   * obs-zone        =   "UT" / "GMT" /     ; Universal Time
   *                                        ; North American UT
   *                                        ; offsets
   *                     "EST" / "EDT" /    ; Eastern:  - 5/ - 4
   *                     "CST" / "CDT" /    ; Central:  - 6/ - 5
   *                     "MST" / "MDT" /    ; Mountain: - 7/ - 6
   *                     "PST" / "PDT" /    ; Pacific:  - 8/ - 7
   *                                        ;
   *                     %d65-73 /          ; Military zones - "A"
   *                     %d75-90 /          ; through "I" and "K"
   *                     %d97-105 /         ; through "Z", both
   *                     %d107-122          ; upper and lower case
   *
   * obs-minute/obs-second が FWS を消費しているのでオプショナルにする
   *
   * @returns {Tuple.<number,number,number>}
   *          符号、時間、分
   */
  RE_zone: /^([\+\-])([0-9]{2})([0-9]{2})/,
  RE_zone_UT: /^UT/i,
  RE_zone_GMT: /^GMT/i,
  RE_zone_EDT: /^EDT/i,
  RE_zone_EST: /^EST/i,
  RE_zone_CDT: /^CDT/i,
  RE_zone_CST: /^CST/i,
  RE_zone_MDT: /^MDT/i,
  RE_zone_MST: /^MST/i,
  RE_zone_PDT: /^PDT/i,
  RE_zone_PST: /^PST/i,
  RE_zone_other: /^[A-Za-z]{3,5}/,
  RE_zone_single: /^[A-IK-Za-ik-z]/,
  zone: function() {
    this._O(() => this.FWS());

    return this._ONEOF(
      () => {
        let m = this._R_M(this.RE_zone);
        let sign = 1;
        if (m[1] == "-") {
          sign = -1;
        }
        return [sign, parseInt(m[2]), parseInt(m[3])];
      },

      () => { this._R(this.RE_zone_UT); return [+1, 0, 0]; },
      () => { this._R(this.RE_zone_GMT); return [+1, 0, 0]; },

      () => { this._R(this.RE_zone_EDT); return [-1, 4, 0]; },
      () => { this._R(this.RE_zone_EST); return [-1, 5, 0]; },
      () => { this._R(this.RE_zone_CDT); return [-1, 5, 0]; },
      () => { this._R(this.RE_zone_CST); return [-1, 6, 0]; },
      () => { this._R(this.RE_zone_MDT); return [-1, 6, 0]; },
      () => { this._R(this.RE_zone_MST); return [-1, 7, 0]; },
      () => { this._R(this.RE_zone_PDT); return [-1, 7, 0]; },
      () => { this._R(this.RE_zone_PST); return [-1, 8, 0]; },

      /* Other multi-character alphabetic time zones */
      () => { this._R(this.RE_zone_other); return [-1, 0, 0]; },

      () => {
        let c = this._R(this.RE_zone_single).toUpperCase();
        if (c == "A") { return [+1, 1, 0]; }
        if (c == "B") { return [+1, 2, 0]; }
        if (c == "C") { return [+1, 3, 0]; }
        if (c == "D") { return [+1, 4, 0]; }
        if (c == "E") { return [+1, 5, 0]; }
        if (c == "F") { return [+1, 6, 0]; }
        if (c == "G") { return [+1, 7, 0]; }
        if (c == "H") { return [+1, 8, 0]; }
        if (c == "I") { return [+1, 9, 0]; }

        if (c == "K") { return [+1, 10, 0]; }
        if (c == "L") { return [+1, 11, 0]; }
        if (c == "M") { return [+1, 12, 0]; }

        if (c == "N") { return [-1, 1, 0]; }
        if (c == "O") { return [-1, 2, 0]; }
        if (c == "P") { return [-1, 3, 0]; }
        if (c == "Q") { return [-1, 4, 0]; }
        if (c == "R") { return [-1, 5, 0]; }
        if (c == "S") { return [-1, 6, 0]; }
        if (c == "T") { return [-1, 7, 0]; }
        if (c == "U") { return [-1, 8, 0]; }
        if (c == "V") { return [-1, 9, 0]; }
        if (c == "W") { return [-1, 10, 0]; }
        if (c == "X") { return [-1, 11, 0]; }
        if (c == "Y") { return [-1, 12, 0]; }

        /* Z */
        return [+1, 0, 0];
      }
    );
  },

  /* #3.4.  Address Specification */

  /**
   * address         =   mailbox / group
   *
   * @returns {arMIMEMailBox}
   */
  address: function() {
    return this._ONEOF(
      () => this.mailbox(),
      () => this.group()
    );
  },

  /**
   * mailbox         =   name-addr / addr-spec
   *
   * @returns {arMIMEMailBox}
   */
  mailbox: function() {
    return this._ONEOF(
      () => this.name_addr(),
      () => {
        let ret = new arMIMEMailBox();

        ret.addr = this.addr_spec();

        return ret;
      }
    );
  },

  /**
   * name-addr       =   [display-name] angle-addr
   * display-name    =   phrase
   *
   * @returns {arMIMEMailBox}
   */
  name_addr: function() {
    let ret = new arMIMEMailBox();

    this._O(() => {
      ret.name = this.phrase();
    });
    ret.addr = this.angle_addr();

    return ret;
  },

  /**
   * angle-addr      =   [CFWS] "<" addr-spec ">" [CFWS] /
   *                     obs-angle-addr
   * obs-angle-addr  =   [CFWS] "<" obs-route addr-spec ">" [CFWS]
   *
   * @return {string}
   */
  angle_addr: function() {
    this._O(() => this.CFWS());
    this._C("<");
    this._O(() => this.obs_route());
    let ret = this.addr_spec();
    this._C(">");
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * group           =   display-name ":" [group-list] ";" [CFWS]
   *
   * @return {arMIMEMailBox}
   */
  group: function() {
    let ret = new arMIMEMailBox();

    ret.isGroup = true;
    ret.name = this.phrase();
    this._C(":");
    this._O(() => {
      ret.list = this.group_list();
    });
    this._C(";");
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * mailbox-list    =   (mailbox *("," mailbox)) / obs-mbox-list
   * obs-mbox-list   =   *([CFWS] ",") mailbox *("," [mailbox / CFWS])
   *
   * obs-mbox-list だけ使う
   *
   * @return {Array.<arMIMEMailBox>}
   */
  mailbox_list: function() {
    let ret = [];

    this._0N(() => {
      this._O(() => this.CFWS());
      this._C(",");
    });
    ret.push(this.mailbox());
    this._0N(() => {
      this._C(",");
      this._O(() => this._ONEOF(
        () => {
          ret.push(this.mailbox());
        },
        () => this.CFWS()
      ));
    });

    return ret;
  },

  /**
   * address-list    =   (address *("," address)) / obs-addr-list
   * obs-addr-list   =   *([CFWS] ",") address *("," [address / CFWS])
   *
   * obs-addr-list だけ使う
   *
   * @return {Array.<arMIMEMailBox>}
   */
  address_list: function() {
    let ret = [];

    this._0N(() => {
      this._O(() => this.CFWS());
      this._C(",");
    });
    ret.push(this.address());
    this._0N(() => {
      this._C(",");
      this._O(() => this._ONEOF(
        () => {
          ret.push(this.address());
        },
        () => this.CFWS()
      ));
    });

    return ret;
  },

  /**
   * group-list      =   mailbox-list / CFWS / obs-group-list
   * obs-group-list  =   1*([CFWS] ",") [CFWS]
   *
   * @return {Array.<arMIMEMailBox>}
   */
  group_list: function() {
    let ret;

    this._ONEOF(
      () => {
        ret = this.mailbox_list();
      },
      () => {
        this._1N(() => {
          this._O(() => this.CFWS());
          this._C(",");
        });
        this._O(() => this.CFWS());

        ret = [];
      },
      () => {
        this.CFWS();
        ret = [];
      }
    );

    return ret;
  },

  /* #3.4.1.  Addr-Spec Specification */

  /**
   * addr-spec       =   local-part "@" domain
   *
   * @return {string}
   */
  addr_spec: function() {
    let ret = "";

    ret += this.local_part();
    ret += this._C("@");
    ret += this.domain();

    return ret;
  },

  /**
   * local-part      =   dot-atom / quoted-string / obs-local-part
   * obs-local-part  =   word *("." word)
   *
   * @return {string}
   */
  local_part: function() {
    return this._ONEOF(
      () => this.quoted_string(),
      () => {
        let s = this.word();
        this._0N(() => {
          s += this._C(".") + this.word();
        });

        return s;
      }
    );
  },

  /**
   * domain          =   dot-atom / domain-literal / obs-domain
   * obs-domain      =   atom *("." atom)
   *
   * dot-atom の代わりに obs-domain だけ使う
   *
   * @return {string}
   */
  domain: function() {
    return this._ONEOF(
      () => this.domain_literal(),
      () => {
        let s = this.atom();
        this._0N(() => {
          s += this._C(".") + this.atom();
        });

        return s;
      }
    );
  },

  /**
   * domain-literal  =   [CFWS] "[" *([FWS] dtext) [FWS] "]" [CFWS]
   *
   * @return {string}
   */
  domain_literal: function() {
    let ret = "";

    this._O(() => this.CFWS());
    this._C("[");
    this._0N(() => {
      let s = "";

      this._O(() => {
        s = this.FWS();
      });
      ret += s + this._ONEOF(
        () => this.dtext_1n(),
        () => this.quoted_pair()
      );
    });
    this._O(() => {
      ret += this.FWS();
    });
    this._C("]");
    this._O(() => this.CFWS());

    return ret;
  },

  /**
   * dtext           =   %d33-90 /          ; Printable US-ASCII
   *                     %d94-126 /         ;  characters not including
   *                     obs-dtext          ;  "[", "]", or "\"
   * obs-dtext       =   obs-NO-WS-CTL / quoted-pair
   *
   * ただし quoted-pair は含まない
   *
   * @returns {string}
   */
  RE_dtext_1n: /^[\x01-\x08\x0b\x0c\x0e-\x1f\!-Z\^-\x7f]+/,
  dtext_1n: function() {
    return this._R(this.RE_dtext_1n);
  },

  /* #3.5.  Overall Message Syntax */

  /**
   * message         =   (fields / obs-fields)
   *                     [CRLF body]
   * fields          =  *optional-field
   * field-name      =   1*ftext
   * ftext           =   %d33-57 /          ; Printable US-ASCII
   *                     %d59-126           ;  characters not including
   *                                        ;  ":".
   * body            =   (*(*998text CRLF) *998text) / obs-body
   * obs-body        =   *(%d0-127)
   * Errata ID: 1906
   * obs-fields      =  *obs-optional
   * obs-optional    =   field-name *WSP ":" unstructured CRLF
   *
   * mbox-from       = "From" " " *<SPACE or HTAB>
   *                   (<any char except ":", SPACE or HTAB>
   *                    *<any char except CR and LF>) CRLF
   * (From RFC 4155)
   *
   * 解析は後回しなので全て obs-optional として読む
   *
   * @returns {arMIMEPart}
   */
  RE_from_4155: /^From [ \t]*(?:[^: \t\r\n][^\r\n]*)?(?:\r\n|\r|\n)/i,
  RE_ftext_1n: /^[\!-9;-\x7e]+/,
  message: function() {
    let part = new arMIMEPart();

    this._O(() => {
      this._R(this.RE_from_4155);
    });
    this._0N(() => {
      let name = this._R(this.RE_ftext_1n);
      this.WSP_0N();
      this._C(":");
      let value = this.unstructured();
      this.CRLF();

      part.addField(name, value);
    });
    this._O(() => {
      this.CRLF();
      part.body = this._ALL_CHARS();
    });

    return part;
  },

  /* #3.6.  Field Definitions */

  /**
   * msg-id          =   [CFWS] "<" id-left "@" id-right ">" [CFWS]
   * id-left         =   dot-atom-text / obs-id-left
   * obs-id-left     =   local-part
   * id-right        =   dot-atom-text / no-fold-literal / obs-id-right
   * obs-id-right    =   domain
   *
   * @returns {string}
   */
  msg_id: function() {
    let ret = "";

    this._O(() => this.CFWS());
    this._C("<");
    ret += this.local_part();
    ret += this._C("@");
    ret += this.domain();
    this._C(">");
    this._O(() => this.CFWS());

    return ret;
  },

  /* #3.6.1.  The Origination Date Field */

  /**
   * orig-date       =   "Date:" date-time CRLF
   *
   * @returns {Date}
   */
  orig_date__value: function() {
    return this.date_time();
  },

  /* #3.6.5.  Informational Fields */

  /**
   * subject         =   "Subject:" unstructured CRLF
   *
   * encoded-word が入る
   *
   * subject         =   "Subject:" unstructured-ew CRLF
   *
   * @returns__value {string}
   */
  subject__value: function() {
    return this.unstructured_ew();
  },

  /* #4.  Obsolete Syntax
   * #4.4.  Obsolete Addressing */

  /**
   * obs-route       =   obs-domain-list ":"
   * obs-domain-list =   *(CFWS / ",") "@" domain
   *                     *("," [CFWS] ["@" domain])
   */
  obs_route: function() {
    this._0N(() => {
      this._ONEOF(
        () => this.CFWS(),
        () => this._C(",")
      );
    });
    this._C("@");
    this.domain();
    this._0N(() => {
      this._C(",");
      this._O(() => this.CFWS());
      this._O(() => {
        this._C("@");
        this.domain();
      });
    });

    this._C(":");
  },

  /* == RFC 6532: Internationalized Email Headers == */

  /* FIXME */

  /* == RFC 6838: Media Type Specifications and Registration Procedures == */

  /* FIXME */
});

/* ---- base/arMIMEPart.jsm ---- */

/**
 * MIME の各パート情報
 *
 * @constructor
 */
function arMIMEPart() {
  /* ---- Content-Type: (content[RFC2045]) ---- */

  /**
   * 解析結果
   * encode 時に必要
   * @type {arMIMEParams}
   */
  this.contentTypeParams = null;

  /**
   * type[RFC2045]
   * @type {string}
   */
  this.contentType = "";

  /**
   * subtype[RFC2045]
   * @type {string}
   */
  this.contentSubType = "";

  /**
   * MIME-Type
   * @type {string}
   */
  this.mimetype = "";

  /**
   * charset[???]
   * @type {string}
   */
  this.charset = "";

  /**
   * Format Parameter[RFC3676]
   * @type {string}
   */
  this.format = "";

  /**
   * DelSp Parameter[RFC3676]
   * @type {string}
   */
  this.delsp = false;

  /**
   * マルチパートか
   * encode 時に必要
   * @type {boolean}
   */
  this.isMultipart = false;

  /**
   * マルチパートが破損しているか
   * @type {boolean}
   */
  this.isCorrupted = false;

  /**
   * multipart/mixed 相当か
   * 実際には不明な subtype も mixed として扱う
   * @type {boolean}
   */
  this.isMixed = false;

  /**
   * boundary[RFC2046]
   * encode 時に必要
   * @type {string}
   */
  this.boundary = "";

  /**
   * "start"[RFC2387]
   * @type {string}
   */
  this.start = "";

  /**
   * "type"[RFC2387]
   * @type {string}
   */
  this.startMimetype = "";

  /* ---- Content-Location: (content-location[RFC2557]) ---- */

  /**
   * URI[RFC2557]
   * @type {string}
   */
  this.contentLocation = "";

  /* ---- Content-Disposition: (disposition[RFC2138]) ---- */

  /**
   * 解析結果
   * encode 時に必要
   * @type {arMIMEParams}
   */
  this.contentDispositionParams = null;

  /**
   * disposition-type[RFC2138]
   * @type {string}
   */
  this.contentDispositionType = "";

  /**
   * filename-parm[RFC2138]
   * @type {string}
   */
  this.contentDispositionFilename = "";

  /* ---- Date: (orig_date[RFC5322]) ---- */

  /**
   * orig_date[RFC5322]
   * @type {?Date}
   */
  this.date = null;

  /* ---- Subject: (unstructured[RFC5322]) ---- */

  /**
   * Subject
   * @type {string}
   */
  this.subject = "";

  /* ---- From: (mailbox-list[RFC5322]) ---- */

  /**
   * From
   * @type {string}
   */
  this.from = "";

  /* ---- Content-ID: (id[RFC2045]) ---- */

  /**
   * msg-id[RFC2045]
   * @type {string}
   */
  this.contentID = "";

  /* ---- Content-Transfer-Encoding: (encoding[RFC2045]) ---- */

  /**
   * mechanism[RFC2045]
   * encode 時に必要
   * @type {string}
   */
  this.contentTransferEncoding = "";

  /* ---- 他 ---- */

  /**
   * body[RFC5322]
   * encode 時に必要
   * @type {string}
   */
  this.body = "";

  /**
   * マルチパートの場合の body-part[RFC2046] の配列
   * encode 時に必要
   * @type {?Array.<arMIMEPart>}
   */
  this.parts = null;

  /**
   * 展開で使用するパラメータ
   * @type {?UnMHTExtractParam}
   */
  this.eParam = null;

  /**
   * 保存で使用するパラメータ
   * @type {?UnMHTSaveParam}
   */
  this.sParam = null;

  /**
   * フィールドのマップ
   *   { 小文字の名前: [大文字の名前, 値] }
   * @type {Map.<string,Tuple.<string,string>>}
   */
  this._fields = new Map();

  Object.seal(this);
}
arMIMEPart.prototype = Object.freeze({
  /**
   * 開始パートを探す
   *
   * @returns {?arMIMEPart}
   *          開始パート
   *          適切なパートが無ければ null
   */
  findStartPart: function() {
    if (!this.isMultipart) {
      return this;
    }

    if (this.isMixed) {
      return this;
    }

    if (this.start) {
      let startContentID = this.start;
      let start
        = arArrayUtils
        .find(this.parts,
              p => p.contentID == startContentID);
      if (start) {
        return start.findStartPart();
      }
    }

    if (this.contentSubType == "related") {
      let startMimetype = this.startMimetype;
      let start
        = arArrayUtils
        .find(this.parts,
              p => p.mimetype == startMimetype);
      if (start) {
        return start.findStartPart();
      }
    }

    if (this.contentSubType == "alternative") {
      let reversedParts = this.parts.slice().reverse();

      let searchPart = function(type) {
        let start
          = arArrayUtils
          .find(reversedParts,
                p => p.mimetype == type);
        if (start) {
          return start;
        }

        start
          = arArrayUtils
          .find(reversedParts,
                function(p) {
                  if (p.isMultipart) {
                    let startPart = p.findStartPart();
                    if (startPart && startPart.mimetype == type) {
                      return true;
                    }
                  }
                  return false;
                });
        if (start) {
          return start.findStartPart();
        }

        return null;
      };

      let p = searchPart("text/html");
      if (p) {
        return p;
      }
      p = searchPart("text/plain");
      if (p) {
        return p;
      }
    }

    if (this.parts.length) {
      return this.parts[0].findStartPart();
    }

    return null;
  },

  /* ==== ql_unmht mod: remove: unused function: clone ==== */

  /**
   * 破棄
   */
  destruct: function() {
    if (this.parts) {
      for (let p of this.parts) {
        p.destruct();
      }
      this.parts = null;
    }
    this._fields.clear();
    if (this.contentTypeParams) {
      this.contentTypeParams.destruct();
      this.contentTypeParams = null;
    }
    if (this.contentDispositionParams) {
      this.contentDispositionParams.destruct();
      this.contentDispositionParams = null;
    }
    this.body = "";
  },

  /* ==== ql_unmht mod: remove: unused function: fieldNames ==== */

  /**
   * フィールドを持っているかを返す
   *
   * @param   {string} name
   *          フィールド名
   * @returns {boolean}
   *          フィールドを持っているか
   */
  hasField: function(name) {
    let nameL = name.toLowerCase();
    return this._fields.has(nameL);
  },

  /**
   * フィールドを持っているかを返す
   *
   * @param   {string} name
   *          フィールド名
   * @returns {string}
   *          フィールド値
   */
  getField: function(name) {
    let nameL = name.toLowerCase();
    return this._fields.get(nameL)[1];
  },

  /**
   * フィールドを追加する
   *
   * @param   {string} name
   *          フィールド名
   * @param   {string} value
   *          フィールド値
   */
  addField: function(name, value) {
    let nameL = name.toLowerCase();
    this._fields.set(nameL, [name, value]);
  },

  /* ==== ql_unmht mod: remove: unused function: removeField ==== */

  /* ==== ql_unmht mod: remove: unused function: setContentType ==== */
});

/* ---- base/arPathUtils.jsm ---- */

/**
 * パスの種類
 * @enum {number}
 */
const arPathType = Object.freeze({
  /** UNIX のローカル */
  UNIX_LOCAL:               0x001001,
  /** Windows のローカル */
  WINDOWS_LOCAL:            0x001011,
  /** Windows のネットワークドライブ */
  WINDOWS_NETWORK:          0x001012,
  /** Mac OS 9 のローカル */
  MACOS9_LOCAL:             0x001021,
  /** スキーム名の後にスラッシュを含む URI */
  URI:                      0x001101,
  /** スキーム名を含まない URI */
  URI_NO_SCHEME:            0x001102,
  /** スキーム名の後にスラッシュを含まない URI */
  URI_NO_SLASH:             0x011103,
  /** Windows のローカルの URI */
  WINDOWS_LOCAL_FILE_URI:   0x001111,
  /** Windows のネットワークドライブの URI */
  WINDOWS_NETWORK_FILE_URI: 0x001112,
  /** 相対パス */
  RELATIVE:                 0x002001
});

/**
 * パスの種類のマスク
 * @enum {number}
 */
const arPathTypeMask = Object.freeze({
  /** Windows のパス */
  WINDOWS:                  0x000010,
  /** Mac OS 9 のパス */
  MACOX9:                   0x000020,
  /** URI */
  URI:                      0x000100,
  /** 絶対パス */
  ABSOLUTE:                 0x001000,
  /** 相対パス */
  RELATIVE:                 0x002000,
  /** data スキーム */
  DATA:                     0x010000
});

/**
 * パス情報
 *
 * @constructor
 */
function arPathInfo() {
  /**
   * パスの種類
   * @type {arPathType}
  */
  this.type = 0;

  /**
   * パスの区切り
   * @type {string}
   */
  this.sep = "/";

  /**
   * パスの要素
   * @type {Array.<string>}
   */
  this.pathComponents = [];

  /**
   * mhtml: か
   * @type {boolean}
   */
  this.isMHTML = false;

  /**
   * mhtml: のファイル名
   * @type {string}
   */
  this.mhtmlFilename = undefined;

  /**
   * mhtml: のフラグメント
   * @type {string}
   */
  this.mhtmlFragment = undefined;

  /**
   * Windows のドライブ文字
   * @type {string}
   */
  this.driveLetter = undefined;

  /**
   * Windows の file の余分なスラッシュ
   * @type {string}
   */
  this.extraSlash = undefined;

  /**
   * Mac OS 9 のボリュームラベル
   * @type {string}
   */
  this.volumeLabel = undefined;

  /**
   * data: のデータ
   * @type {string}
   */
  this.data = undefined;

  /**
   * URI のスキーム
   * @type {string}
   */
  this.scheme = undefined;

  /**
   * URI のホスト
   * @type {string}
   */
  this.host = undefined;

  /**
   * URI のポート
   * @type {string}
   */
  this.port = undefined;

  /**
   * URI のクエリ
   * @type {string}
   */
  this.query = undefined;

  /**
   * URI のフラグメント
   * @type {string}
   */
  this.fragment = undefined;

  Object.seal(this);
}
arPathInfo.prototype = Object.freeze({
  /**
   * 複製する
   *
   * @returns {arPathInfo}
   */
  clone: function() {
    let info = new arPathInfo();

    info.type = this.type;
    info.sep = this.sep;
    info.pathComponents = this.pathComponents.slice(0);
    info.isMHTML = this.isMHTML;
    info.mhtmlFilename = this.mhtmlFilename;
    info.mhtmlFragment = this.mhtmlFragment;
    info.driveLetter = this.driveLetter;
    info.extraSlash = this.extraSlash;
    info.volumeLabel = this.volumeLabel;
    info.data = this.data;
    info.scheme = this.scheme;
    info.host = this.host;
    info.port = this.port;
    info.query = this.query;
    info.fragment = this.fragment;

    return info;
  }
});

/**
 * 仮想パス操作ユーティリティ
 * ローカルのパスや valid な URI ではない可能性のあるパスを操作する
 *
 * @class
 */
let arPathUtils = Object.freeze({
  /**
   * パスを連結、解決する
   *
   * @param   {string} baseDir
   *          親ディレクトリのパス
   *          末尾にセパレータが無くてもディレクトリ名として扱われる事に注意
   * @param   {string} sub
   *          相対パス、もしくは絶対パス
   * @returns {string}
   *          連結したパス
   */
  resolve: function(baseDir, sub) {
    if (!baseDir) {
      return sub;
    }

    let baseInfo = this.getPathInfo(baseDir);
    let subInfo = this.getPathInfo(sub);

    if (baseInfo.isMHTML &&
        subInfo.type == arPathType.RELATIVE) {
      baseInfo.mhtmlFilename = sub;
      return this.createPath(baseInfo, false);
    }

    if (baseInfo.type & arPathTypeMask.DATA ||
        subInfo.type & arPathTypeMask.DATA) {
      return sub;
    }

    if (subInfo.type == arPathType.URI_NO_SCHEME &&
        baseInfo.scheme !== undefined) {
      return baseInfo.scheme + ":" + sub;
    }

    if (subInfo.type & arPathTypeMask.ABSOLUTE &&
        subInfo.type != arPathType.UNIX_LOCAL) {
      /* TYPE_UNIX_LOCAL は URI のパスでもあるのでそのまま返さない */
      return sub;
    }

    if (subInfo.type == arPathType.UNIX_LOCAL) {
      baseInfo.pathComponents = subInfo.pathComponents;
    } else {
      if (baseInfo.pathComponents.length > 0 &&
          baseInfo.pathComponents[baseInfo.pathComponents.length - 1] === "") {
        baseInfo.pathComponents.pop();
      }

      baseInfo.pathComponents
        = baseInfo.pathComponents.concat(subInfo.pathComponents);
    }

    baseInfo.query = subInfo.query;
    baseInfo.fragment = subInfo.fragment;

    this._simplifyPathComponents(baseInfo);

    return this.createPath(baseInfo, false);
  },

  /**
   * パスを比較しやすいように単純化する
   *
   * @param   {string} origpath
   *          対象のパス
   * @returns {string}
   *          単純化したパス
   */
  unique: function(origpath) {
    let info = this.getPathInfo(origpath);
    let path = "";

    if (info.type == arPathType.URI) {
      if (info.scheme == "http" && info.port == "80") {
        info.port = undefined;
      } else if (info.scheme == "https" && info.port == "443") {
        info.port = undefined;
      }
    }

    switch (info.type) {
      case arPathType.WINDOWS_LOCAL: {
        path = ("file:///" + info.driveLetter.toLowerCase() + ":/"
                + info.pathComponents.join("/"));
        break;
      }
      case arPathType.WINDOWS_NETWORK: {
        path = ("file://///" + info.host + "/"
                + info.pathComponents.join("/"));
        break;
      }
      case arPathType.WINDOWS_LOCAL_FILE_URI: {
        path = ("file:///" + info.driveLetter.toLowerCase() + ":/"
                + info.pathComponents.join("/")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
        break;
      }
      case arPathType.WINDOWS_NETWORK_FILE_URI: {
        path = ("file://///" + info.host + "/"
                + info.pathComponents.join("/")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
        break;
      }
      case arPathType.URI: {
        path = (info.scheme + "://" + info.host
                + ((info.port !== undefined) ? (":" + info.port) : "")
                + "/"
                + info.pathComponents.join("/")
                + ((info.query !== undefined) ? ("?" + info.query) : "")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
        break;
      }
      case arPathType.URI_NO_SCHEME: {
        path = ("//" + info.host
                + ((info.port !== undefined) ? (":" + info.port) : "")
                + "/"
                + info.pathComponents.join("/")
                + ((info.query !== undefined) ? ("?" + info.query) : "")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
        break;
      }
      case arPathType.URI_NO_SLASH: {
        path = (info.scheme + ":" + info.data
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
        break;
      }
      case arPathType.UNIX_LOCAL: {
        path = ("/"
                + info.pathComponents.join("/"));
        break;
      }
      case arPathType.MACOS9_LOCAL: {
        path = (info.volumeLabel + ":"
                + info.pathComponents.join(":"));
        break;
      }
      case arPathType.RELATIVE: {
        path = (info.pathComponents.join("/")
                + ((info.query !== undefined) ? ("?" + info.query) : "")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
        break;
      }
    }

    if (info.isMHTML) {
      path = ("mhtml:" + path
              + ((info.mhtmlFilename !== undefined)
                 ? ("!" + info.mhtmlFilename) : "")
              + ((info.mhtmlFragment !== undefined)
                 ? ("#" + info.mhtmlFragment) : ""));
    }

    return path;
  },

  /**
   * フラグメントを削除する
   *
   * @param   {string} origpath
   *          対象のパス
   * @returns {string}
   *          フラグメントを削除したパス
   */
  removeFragment: function(origpath) {
    let info = this.getPathInfo(origpath);

    info.fragment = undefined;
    info.mhtmlFragment = undefined;

    return this.createPath(info, false);
  },

  /**
   * 親ディレクトリのパスを取得する
   *
   * @param   {string} path
   *          対象のパス
   * @returns {string}
   *          親ディレクトリのパス
   */
  getBaseDir: function(path) {
    let info = this.getPathInfo(path);

    if (info.type & arPathTypeMask.DATA) {
      return path;
    }
    if (info.pathComponents.length) {
      info.pathComponents.pop();
      info.pathComponents.push("");
    }
    info.fragment = undefined;
    info.query = undefined;
    info.mhtmlFragment = undefined;

    return this.createPath(info);
  },

  /**
   * パス情報を取得する
   *
   * @param   {string} path
   *          対象のパス
   * @returns {arPathInfo}
   *          パス情報
   */
  getPathInfo: function(path) {
    let info = new arPathInfo();
    let m;

    /* -- IE の mhtml: -- */

    m = path.match(/^mhtml:([^!#]*)(?:!([^#]*))?(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * mhtml:******!fuga.html
       * mhtml:******!fuga.html#section2
       */
      path = m[1];
      info.isMHTML = true;
      info.mhtmlFilename = m[2];
      if (m[3]) {
        info.mhtmlFragment = m[4];
      }
      /* path について処理を続ける */
    }

    /* -- 絶対パス -- */

    m = path.match(/^([A-Za-z]):([\/\\])((?:.|\r|\n)*)$/);
    if (m) {
      /*
       * C:/hoge/fuga.html
       * C:\hoge\fuga.html
       */
      info.type = arPathType.WINDOWS_LOCAL;
      info.driveLetter = m[1];
      info.sep = m[2];
      info.pathComponents = m[3].split(info.sep);
      return info;
    }

    m = path.match(/^\\\\([^\\]+)\\((?:.|\r|\n)*)$/);
    if (m) {
      /*
       * \\host1\hoge\fuga.html
       */
      info.type = arPathType.WINDOWS_NETWORK;
      info.sep = "\\";
      info.host = m[1];
      info.pathComponents = m[2].split(info.sep);
      return info;
    }

    m = path.match(/^file:\/\/(\/?)([A-Za-z]):([\/\\])([^#]*)(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * file://C:/hoge/fuga.html
       * file:///C:\hoge\fuga.html#section2
       */
      info.type = arPathType.WINDOWS_LOCAL_FILE_URI;
      info.extraSlash = m[1];
      info.driveLetter = m[2];
      info.sep = m[3];
      info.pathComponents = m[4].split(info.sep);
      if (m[5]) {
        info.fragment = m[6];
      }
      return info;
    }

    m = path.match(/^file:\/\/(\/{1,3})([^\/]+)\/([^#]*)(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * file://///host1/hoge/fuga.html
       * file://///host1/hoge/fuga.html#section2
       */
      info.sep = "/";
      info.type = arPathType.WINDOWS_NETWORK_FILE_URI;
      info.extraSlash = m[1];
      info.host = m[2];
      info.pathComponents = m[3].split(info.sep);
      if (m[4]) {
        info.fragment = m[5];
      }
      return info;
    }

    m = path.match(/^([A-Za-z0-9\-]+):\/\/([^\/]*)\/([^\?#]*)(\?([^#]*))?(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * http://host1/hoge/fuga.html
       * http://host1/hoge/fuga.cgi?name=value#section2
       */
      info.type = arPathType.URI;
      info.sep = "/";
      info.scheme = m[1];
      info.host = m[2];
      let m2 = info.host.match(/^(.+):([0-9]+)$/);
      if (m2) {
        info.host = m2[1];
        info.port = m2[2];
      }
      info.pathComponents = m[3].split(info.sep);
      if (m[4]) {
        info.query = m[5];
      }
      if (m[6]) {
        info.fragment = m[7];
      }
      return info;
    }

    m = path.match(/^(about|data):([^#]*)(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * about:blank
       * data:text/html,hogehoge#section2
       */
      info.type = arPathType.URI_NO_SLASH;
      info.sep = "/";
      info.scheme = m[1];
      info.data = m[2];
      if (m[3]) {
        info.fragment = m[4];
      }
      return info;
    }

    m = path.match(/^\/\/([^\/]*)\/([^\?#]*)(\?([^#]*))?(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * //host1/hoge/fuga.html
       * //host1/hoge/fuga.cgi?name=value#section2
       */
      info.type = arPathType.URI_NO_SCHEME;
      info.sep = "/";
      info.host = m[1];
      let m2 = info.host.match(/^(.+):([0-9]+)$/);
      if (m2) {
        info.host = m2[1];
        info.port = m2[2];
      }
      info.pathComponents = m[2].split(info.sep);
      if (m[3]) {
        info.query = m[4];
      }
      if (m[5]) {
        info.fragment = m[6];
      }
      return info;
    }

    m = path.match(/^\/((?:.|\r|\n)*)$/);
    if (m) {
      /*
       * /hoge/fuga.html
       */
      info.type = arPathType.UNIX_LOCAL;
      info.sep = "/";
      info.pathComponents = m[1].split(info.sep);
      return info;
    }

    m = path.match(/^([^:]+):((?:.|\r|\n)+)$/);
    if (m) {
      /*
       * Macintosh HD:hoge:fuga.html
       */
      info.type = arPathType.MACOS9_LOCAL;
      info.sep = ":";
      info.volumeLabel = m[1];
      info.pathComponents = m[2].split(info.sep);
      return info;
    }

    /* -- 相対パス -- */

    m = path.match(/^(\.\.?([\\\/:])[^\?#]*)(\?([^#]*))?(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * ./hoge/fuga.html
       * ./hoge/fuga.html?name=value#section2
       * ..\hoge\fuga.html
       */
      info.type = arPathType.RELATIVE;
      info.sep = m[2];
      if (m[3]) {
        info.query = m[4];
      }
      if (m[5]) {
        info.fragment = m[6];
      }
      info.pathComponents = m[1].split(info.sep);
      return info;
    }

    info.type = arPathType.RELATIVE;

    /* **** FIXME: この方法では誤検出もありうる **** */
    if (path.contains("/")) {
      /* とりあえず最もありうる / を最優先にする */
      info.sep = "/";
    } else if (path.contains("\\")) {
      info.sep = "\\";
    } else {
      info.sep = "/";
    }

    m = path.match(/^([^\?#]*)(\?([^#]*))?(#((?:.|\r|\n)*))?$/);
    if (m) {
      /*
       * hoge/fuga.cgi?name=value#section2
       * hoge\\fuga.cgi?name=value#section2
       */
      info.pathComponents = m[1].split(info.sep);
      if (m[2]) {
        info.query = m[3];
      }
      if (m[4]) {
        info.fragment = m[5];
      }

      return info;
    } else {
      info.pathComponents = [path];
    }

    return info;
  },

  /**
   * パス情報からパスを生成する
   *
   * @param   {arPathInfo} info
   *          対象のパス情報
   * @param   {boolean} ignoreMHTML
   *          isMHTML を無視するか
   * @returns {arPathInfo}
   *          パス
   */
  createPath: function(info, ignoreMHTML) {
    if (!ignoreMHTML && info.isMHTML) {
      return ("mhtml:" + this.createPath(info, true)
              + ((info.mhtmlFilename !== undefined)
                 ? ("!" + info.mhtmlFilename) : "")
              + ((info.mhtmlFragment !== undefined)
                 ? ("#" + info.mhtmlFragment) : ""));
    }

    switch (info.type) {
      case arPathType.WINDOWS_LOCAL: {
        return (info.driveLetter + ":" + info.sep
                + info.pathComponents.join(info.sep));
      }
      case arPathType.WINDOWS_NETWORK: {
        return ("\\\\" + info.host + info.sep
                + info.pathComponents.join(info.sep));
      }
      case arPathType.WINDOWS_LOCAL_FILE_URI: {
        return ("file://" + info.extraSlash
                + info.driveLetter + ":" + info.sep
                + info.pathComponents.join(info.sep)
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
      }
      case arPathType.WINDOWS_NETWORK_FILE_URI: {
        return ("file://" + info.extraSlash
                + info.host + info.sep
                + info.pathComponents.join(info.sep)
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
      }
      case arPathType.URI: {
        return (info.scheme + "://" + info.host
                + ((info.port !== undefined) ? (":" + info.port) : "")
                + info.sep
                + info.pathComponents.join(info.sep)
                + ((info.query !== undefined) ? ("?" + info.query) : "")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
      }
      case arPathType.URI_NO_SCHEME: {
        return ("//" + info.host
                + ((info.port !== undefined) ? (":" + info.port) : "")
                + info.sep
                + info.pathComponents.join(info.sep)
                + ((info.query !== undefined) ? ("?" + info.query) : "")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
      }
      case arPathType.URI_NO_SLASH: {
        return (info.scheme + ":" + info.data
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
      }
      case arPathType.UNIX_LOCAL: {
        return (info.sep
                + info.pathComponents.join(info.sep));
      }
      case arPathType.MACOS9_LOCAL: {
        return (info.volumeLabel + info.sep
                + info.pathComponents.join(info.sep));
      }
      case arPathType.RELATIVE: {
        return (info.pathComponents.join(info.sep)
                + ((info.query !== undefined) ? ("?" + info.query) : "")
                + ((info.fragment !== undefined) ? ("#" + info.fragment) : ""));
      }
    }

    return "";
  },

  /* ==== private ==== */

  /**
   * パスの要素を簡略化する
   *
   * @param   {arPathInfo} info
   *          パス情報
   */
  _simplifyPathComponents: function(info) {
    info.pathComponents
      = info.pathComponents.reduce(function(pathComponents, component) {
        if (component == ".") {
          return pathComponents;
        } else if (component == "..") {
          return pathComponents.slice(0, -1);
        } else if (component) {
          return pathComponents.concat([component]);
        } else {
          return pathComponents.concat([""]);
        }
      }, []);
  }
});

/* ---- base/arPseudoID.jsm ---- */

/**
 * ID のカウンタ
 * @type {number}
 */
let count = 0;

/**
 * そこそこ一意な ID 生成器
 *
 * @class
 */
let arPseudoID = Object.freeze({
  /**
   * そこそこ一意な ID を生成する
   *
   * @returns {string}
   *          そこそこ一意な ID
   */
  gen: function() {
    let id
      = count.toString(16) + "."
      + this.randHex()
      + "." + Date.now().toString(16);
    count = (count + 1) % 0xffffffff;

    return id;
  },

  /**
   * 8 ケタのランダムな 16 進文字列を返す
   *
   * @returns {string}
   *          8 ケタのランダムな 16 進文字列
   */
  randHex: function() {
    return ("0000000" + Math.floor(Math.random() * 0xffffffff).toString(16)).slice(-8);
  }
});

/* ---- UnMHTCache.jsm ---- */

/**
 * ファイルの展開情報のキャッシュ
 *
 * @class
 * @implements arIShutdownEventListener
 */
let UnMHTCache = Object.freeze({
  /* ==== ql_unmht mod: remove: unused function: init ==== */

  /**
   * 一意性を確保するためにファイル名を正規化する
   *
   * @param   {string} original
   *          ファイル名
   * @returns {string}
   *          正規化したファイル名
   */
  normalizeName: function(original) {
    if (!original) {
      return "";
    }

    original = arPathUtils.unique(original);

    for (let i = 0; i < 10; i += 1) {
      let last = original;
      try {
        original = decodeURIComponent(original);
      } catch (e) {
        original = arMIMEDecoder.decodeExtOctet(original);
      }
      original = original
        .replace(/%u([A-Fa-f0-9]{4})/g,
                 function(matched, octet) {
                   return String.fromCharCode(parseInt(octet, 16));
                 });
      original = arDOMUtils.unescapeEntity(original);
      if (last == original) {
        break;
      }
    }

    return original;
  },

  /* ==== ql_unmht mod: remove: unused function: add ==== */

  /* ==== ql_unmht mod: remove: unused function: get ==== */

  /* ==== ql_unmht mod: remove: unused function: removeOld ==== */

  /* ==== ql_unmht mod: remove: unused function: getList ==== */

  /* ==== ql_unmht mod: remove: unused function: getPart ==== */

  /* ==== ql_unmht mod: remove: unused function: getMHTFileURI ==== */

  /**
   * Content-Location に対応するパスからパートを探す
   * 階層や multipart を考慮する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   * @param   {arMIMEPart} originPart
   *          呼び出し元のパート
   * @param   {string} path
   *          対象のパス
   * @param   {boolean} referred
   *          referredBaseDir をチェックするか
   * @returns {Tuple.<?arMIMEPart,string>}
   *          対象のパートとフラグメント(#つき)
   *          見付からなければパートが null
   */
  findPart: function(eFileInfo, originPart, path, referred) {
    let [targetPart, fragment]
      = this.findPartSimple(eFileInfo, originPart, path, referred);
    if (targetPart) {
      let parentPath = targetPart.eParam.parentPath;
      if (originPart.isMixed) {
        if (!originPart.eParam.mixedPath.some(path => path.startsWith(parentPath))) {
          targetPart = null;
        }
      } else if (!originPart.eParam.path.startsWith(parentPath)) {
        targetPart = null;
      }
    }

    if (targetPart) {
      if (targetPart.isMultipart) {
        targetPart = targetPart.eParam.startPart;
      }
    }

    return [targetPart, fragment];
  },

  /**
   * Content-Location に対応するパスからパートを探す
   * 階層や multipart は考慮しない
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   * @param   {arMIMEPart} originPart
   *          呼び出し元のパート
   * @param   {string} path
   *          対象のパス
   * @param   {boolean} referred
   *          referredBaseDir をチェックするか
   * @returns {Tuple.<?arMIMEPart,string>}
   *          対象のパートとフラグメント(#つき)
   *          見付からなければパートが null
   */
  findPartSimple: function(eFileInfo, originPart, path, referred) {
    let fragment = "";
    let sharpFragment = "";
    let m = path.match(/^([^#]*)#(.*)$/);
    if (m) {
      [, path, fragment] = m;
      if (fragment) {
        sharpFragment = "#" + fragment;
      }
    }
    if (fragment && path === "") {
      return [originPart, sharpFragment];
    }

    let normalFragment = this.normalizeName(fragment);

    let normalPath = this.normalizeName(path);

    let part;

    /* Content-ID でチェック */
    m = normalPath.match(/^cid:(.+)$/);
    if (m) {
      let cid = m[1];

      part
        = arArrayUtils
        .find(eFileInfo.parts,
              part => cid == part.contentID);
      if (part) {
        return [part, sharpFragment];
      }
    }

    /* フルパスでの参照をチェック */

    /* フラグメント付き */
    if (normalFragment) {
      part
        = arArrayUtils
        .find(eFileInfo.parts,
              part => (normalPath == part.eParam.normalLocation &&
                       normalFragment == part.eParam.normalFragment));
      if (part) {
        return [part, ""];
      }
    }
    /* フラグメント無し */
    part
      = arArrayUtils
      .find(eFileInfo.parts,
            part => normalPath == part.eParam.normalLocation);
    if (part) {
      return [part, sharpFragment];
    }

    if (originPart.eParam.baseDir) {
      /* フルパス以外での参照をチェック */
      let resolvedPath = arPathUtils.resolve(originPart.eParam.baseDir,
                                             normalPath);
      let normalResolved = this.normalizeName(resolvedPath);

      /* フラグメント付き */
      if (normalFragment) {
        part
          = arArrayUtils
          .find(eFileInfo.parts,
                part => (normalResolved == part.eParam.normalLocation &&
                         normalFragment == part.eParam.normalFragment));
        if (part) {
          return [part, ""];
        }
      }
      /* フラグメント無し */
      part
        = arArrayUtils
        .find(eFileInfo.parts,
              part => normalResolved == part.eParam.normalLocation);
      if (part) {
        return [part, sharpFragment];
      }
    }

    /* ==== ql_unmht mod: remove: unmht scheme ==== */

    /* IE のバグを考慮してチェック */
    if (referred &&
        originPart.eParam.referredBaseDir !== "") {
      let referredPath = arPathUtils.resolve(originPart.eParam.referredBaseDir,
                                             normalPath);
      let normalReferred = this.normalizeName(referredPath);

      part
        = arArrayUtils
        .find(eFileInfo.parts,
              part => normalReferred == part.eParam.normalLocation);
      if (part) {
        return [part, sharpFragment];
      }
    }

    /* 含まれない */
    return [null, ""];
  },

  /* ==== ql_unmht mod: remove: unused function: createDocument ==== */

  /* ==== arIShutdownEventListener ==== */

  /* ==== ql_unmht mod: remove: unused function: onShutdown ==== */

  /* ==== private ==== */

  /* ==== ql_unmht mod: remove: unused prop: _eFileInfoMap ==== */
});
/* ==== ql_unmht mod: remove: unused call: init ==== */

/* ---- UnMHTContentModifier.jsm ---- */

/**
 * コンテンツを修正する
 *
 * @class
 */
let UnMHTContentModifier = Object.freeze({
  /**
   * コンテンツを修正する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   * @param   {arMIMEPart} part
   *          対象のパート
   */
  modifyContents: function(eFileInfo, part) {
    this._modifyAttribute(eFileInfo, part);

    this._modifyCSS(eFileInfo, part);
  },

  /* ==== ql_unmht mod: remove: unused function: unmodifyContents ==== */

  /* ==== private ==== */

  _cssRe: /(@import\s*(?:url\s*\(\s*)?|[^a-zA-Z0-9_]url\s*\(\s*)(?:(\"|&quot;|&#x22;|&#34;)((?:\\\"|[^\"])*?)\2|(\'|&apos;|&#x27;|&#39;)((?:\\\'|[^\'])*?)\4|([^\"\';\(\)]+))/ig,
  _elemRe: /(<([\?A-Za-z0-9_:\-]+))(\s(?:\"(?:\\\"|[^\"])*\"|\'(?:\\\'|[^\'])*\'|[^\"\'\\>])*)(>)/g,
  _attrRe: /(\s(class|src|href|background|action|data)\s*=\s*)(?:(\")((?:\\\"|[^\"])*)\"|(\')((?:\\\'|[^\'])*)\'|([^\"\'\\ >]+))/ig,
  _baseRe: /<base\s(?:\"(?:\\\"|[^\"])*\"|\'(?:\\\'|[^\'])*\'|[^\"\'\\>])*?href\s*=\s*(?:\"((?:\\\"|[^\"])*)\"|\'((?:\\\'|[^\'])*)\'|([^\"\'\\ >]+))(?:\"(?:\\\"|[^\"])*\"|\'(?:\\\'|[^\'])*\'|[^\"\'\\>])*>/ig,
  _pptRe: /<\/?(o|p|oa|v):(?:\"(?:\\\"|[^\"])*\"|\'(?:\\\'|[^\'])*\'|[^\"\'\\>])*?>/g,

  /**
   * CSS 中の URI を unmht: 形式に変換する
   * replace に渡す関数
   *
   * @param   {arMIMEPart} part
   *          対象のパート
   * @param   {string} matched
   *          マッチした全体
   * @param   {string} prev
   * @param   {?string} dquote
   * @param   {?string} dqpath
   * @param   {?string} quote
   * @param   {?string} qpath
   * @param   {?string} path
   *          以下参照
   *
   *         dquote
   *         -
   * @import "12345.jpg";
   * -------- ---------
   * prev     dqpath
   *
   *      quote
   *      -
   * url ('12345.jpg');
   * ----- ---------
   * prev  qpath
   *
   * @returns {string}
   *          変換した結果
   */
  _cssFunc: function(eFileInfo, part,
                     matched, prev, dquote, dqpath, quote, qpath, path) {
    if (dqpath) {
      path = dqpath.replace(/\\\"/g, "\"");
    } else if (qpath) {
      path = qpath.replace(/\\\'/g, "\'");
    }
    quote = quote || dquote || "";
    if (!prev.contains("(")) {
      quote = quote || "\'";
    }

    if (path.startsWith("mailto:") || path.startsWith("data:")) {
      return matched;
    }

    let [targetPart, fragment]
      = UnMHTCache.findPart(eFileInfo, part, path, part.eParam.isCSS);
    if (targetPart) {
      targetPart.eParam.referredBaseDir = part.eParam.baseDir;
      if (targetPart == part && fragment) {
        return prev + quote
          + fragment
          + quote;
      }

      return prev + quote
        + eFileInfo.baseURI + targetPart.eParam.refName + fragment
        + quote;
    }

    if (path.startsWith("file:")) {
      return prev + quote + quote;
    }

    return matched;
  },

  /* ==== ql_unmht mod: remove: unused function: _unCssFunc ==== */

  /**
   * CSS 中の URI を unmht: 形式に変換する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   * @param   {arMIMEPart} part
   *          対象のパート
   */
  _modifyCSS: function(eFileInfo, part) {
    if (part.eParam.isHTML ||
        part.eParam.isCSS) {
      part.eParam.content
        = part.eParam.content
        .replace(this._cssRe, this._cssFunc.bind(this, eFileInfo, part));
    }
  },

  /**
   * HTML 中の URI を unmht: 形式に変換する
   * replace に渡す関数
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   * @param   {arMIMEPart} part
   *          対象のパート
   * @param   {string} matched
   *          マッチした全体
   * @param   {string} prev
   * @param   {string} attrs
   * @param   {string} next
   * @returns {string}
   *          変換した結果
   */
  _elemFunc: function(eFileInfo, part,
                      matched, prev, name, attrs, next) {
    if (/^base$/i.test(name)) {
      return matched;
    }
    let isObject = false;
    if (/^object$/i.test(name) || /^embed$/i.test(name)) {
      isObject = true;
    }
    let isAnchor = false;
    if (/^a$/i.test(name)) {
      isAnchor = true;
    }
    let isLink = false;
    if (/^link$/i.test(name)) {
      isLink = true;
    }
    let isOriginalLink = false;

    attrs
      = attrs
      .replace(this._attrRe, function(matched, prev, attr,
                                      dquote, dqpath, quote, qpath, path) {
        if (dqpath) {
          path = dqpath.replace(/\\\"/g, "\"");
        } else if (qpath) {
          path = qpath.replace(/\\\'/g, "\'");
        }
        quote = quote || dquote || "\"";

        if (attr == "class") {
          if (isAnchor && path == "unmht_link_to_original") {
            isOriginalLink = true;
          }

          return matched;
        }

        if (isOriginalLink && attr == "href") {
          return matched;
        }

        if (path.startsWith("mailto:") || path.startsWith("data:")) {
          return matched;
        }

        if (!isObject && /^data$/i.test(attr)) {
          return matched;
        }

        let isRelative = false;
        if (!/^[A-Za-z0-9\-]+:/.test(path)) {
          isRelative = true;
        }
        /* ==== ql_unmht mod: remove: replace relative here ==== */

        let [targetPart, fragment]
          = UnMHTCache.findPart(eFileInfo, part, path, false);
        if (targetPart) {
          if (isLink) {
            targetPart.eParam.referredBaseDir = part.eParam.baseDir;
          }

          return prev + quote
            + eFileInfo.baseURI + targetPart.eParam.refName + fragment
            + quote;
        }

        if (path.startsWith("file:") ||
            path.startsWith("cid:")) {
          return prev + quote + quote;
        }

        if (isRelative && isAnchor) {
          /* リンク先はあらかじめ展開しておく */
          try {
            /* ==== ql_unmht mod: do not use Services: BEGIN ==== */
            return prev + quote
              + arPathUtils.resolve(arPathUtils.getBaseDir(part.eParam.location), path)
              + quote;
            /* ==== ql_unmht mod: do not use Services: END ==== */
          } catch (e) {
            /* 展開失敗した場合は諦める */
          }
        }

        return matched;
      });

    return prev + attrs + next;
  },

  /* ==== ql_unmht mod: remove: unused function: _unElemFunc ==== */

  /**
   * HTML 中の BASE の値を収集して削除する
   * replace に渡す関数
   *
   * 引数と返り値は _elemFunc と同じ
   */
  _baseFunc: function(eFileInfo, part,
                      matched, dqpath, qpath, path) {
    if (dqpath) {
      path = dqpath.replace(/\\\"/g, "\"");
    } else if (qpath) {
      path = qpath.replace(/\\\'/g, "\'");
    }

    let href = arPathUtils.getBaseDir(arUconv.toUnicode(path,
                                                        part.eParam.charset));
    part.eParam.baseDir = arPathUtils.resolve(part.eParam.baseDir, href);

    return "";
  },

  /**
   * HTML 中の URI を unmht: 形式に変換する
   * また、BASE 要素と Office 用の要素を削除する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   * @param   {arMIMEPart} part
   *          対象のパート
   */
  _modifyAttribute: function(eFileInfo, part) {
    if (part.eParam.isHTML) {
      part.eParam.content
        = part.eParam.content
        .replace(this._baseRe, this._baseFunc.bind(this, eFileInfo, part))
        .replace(this._elemRe, this._elemFunc.bind(this, eFileInfo, part));

      if (part.eParam.content.contains("xmlns:v=\"urn:schemas-microsoft-com:vml\"")) {
        part.eParam.content = part.eParam.content.replace(this._pptRe, "");
      }
    }
  },

  /* ==== ql_unmht mod: remove: unused function: _unmodifyCSS ==== */

  /* ==== ql_unmht mod: remove: unused function: _unmodifyAttribute ==== */
});

/* ---- UnMHTExtractor.jsm ---- */

/**
 * パートの展開情報
 *
 * @constructor
 */
function UnMHTExtractParam() {
  /* ---- 階層 ---- */

  /**
   * 親パートのパス
   * @type {string}
   */
  this.parentPath = "";

  /**
   * パス
   * @type {string}
   */
  this.path = "";

  /* ---- 元のパートのヘッダの補完 ---- */

  /**
   * Content-Type のキャラクタセット
   * multipart/mixed で元のパートと異なる
   * @type {string}
   */
  this.charset = "";

  /**
   * Content-Type の MIME-Type
   * ボディが HTML である application/octet-stream や
   * multipart/mixed で元のパートと異なる
   * @type {string}
   */
  this.mimetype = "";

  /**
   * Content-Location
   * 元のパートが Content-Location を持たない場合や
   * multipart/mixed で元のパートと異なる
   * @type {string}
   */
  this.location = "";

  /**
   * Content-ID
   * 元のパートが Content-ID を持つ場合は同じ
   * 持たない場合は自動生成
   * @type {string}
   */
  this.cid = "part." + arPseudoID.gen() + "@unmht.org";

  /* ---- 種類 ---- */

  /**
   * HTML かどうか
   * @type {boolean}
   */
  this.isHTML = false;

  /**
   * CSS かどうか
   * @type {boolean}
   */
  this.isCSS = false;

  /**
   * multipart/mixed かどうか
   * @type {boolean}
   */
  this.isMixed = false;

  /**
   * mixed なドキュメントに使用したパートのパス
   * @type {Array.<string>}
   */
  this.mixedPath = [];

  /* ---- 元のパートのヘッダから生成する情報 ---- */

  /**
   * Content-Location の親ディレクトリ
   * @type {string}
   */
  this.baseDir = "";

  /**
   * Content-Location のファイル名
   * @type {string}
   */
  this.leafName = "";

  /**
   * Content-Location のフラグメント
   * @type {string}
   */
  this.fragment = "";

  /* ---- 元のパートのボディから生成する情報 ---- */

  /**
   * 修正済みのファイルの中身
   * @type {string}
   */
  this.content = "";

  /* ---- 参照用 ---- */

  /**
   * 正規化した Content-Location
   * フラグメントは含まない
   * @type {string}
   */
  this.normalLocation = "";

  /**
   * 正規化した Content-Location のファイル名
   * @type {string}
   */
  this.normalLeafName = "";

  /**
   * 正規化した Content-Location のフラグメント
   * @type {string}
   */
  this.normalFragment = "";

  /**
   * 参照用のファイル名
   * @type {string} */
  this.refName = "";

  /**
   * 参照元のファイルの親ディレクトリ
   * referredBaseDir は
   * IE で保存された MHT ファイルにおける以下の問題を回避するためのもの
   *
   * [状況]
   *   ファイル
   *     http://unmht.org/x.html
   *     http://unmht.org/style/a.css
   *     http://unmht.org/style/b.css
   *     http://unmht.org/style/x.png
   *   x.html 中の記述
   *     <link href="./style/a.css" ... />
   *   a.css 中の記述
   *     @import url("./b.css");
   *   b.css 中の記述
   *     background: url("./x.png");
   *
   * [期待される結果]
   *   相対パス "./b.css" を a.css の URI から解決した URL が
   *   b.css の Content-Location に記述される
   *
   *   Content-Location: http://unmht.org/style/b.css
   *
   *   これにより a.css から b.css が参照できる
   *   また b.css から x.png が参照できる
   *
   * [実際の結果]
   *   相対パス "./b.css" を x.html の URI から解決した URL が
   *   b.css の Content-Location に記述される
   *
   *   Content-Location: http://unmht.org/b.css
   *
   *   これにより a.css から b.css が参照できない
   *   また b.css から x.png が参照できない
   *
   * [対策]
   *   1. すべての X から参照されているすべての Y について
   *      Y.referredBaseDir を X.baseDir とする
   *   2. Z.referredBaseDir が空でない Z について
   *      Z 内の相対パス R による参照について
   *      Z.baseDir から R を解決した URI を A とする
   *      Z.referredBaseDir から R を解決した URI を B とする
   *   3. F.contentLocation が A に一致するような F が存在しない、かつ
   *      G.contentLocation が B に一致するような G が存在する場合
   *      R による参照先を G とする
   *      この時、G.referredBaseDir は F.baseDir となり 2 から再度適用する
   *
   * [例]
   *   0. {x.html}.baseDir = "http://unmht.org/"
   *      {a.css}.baseDir = "http://unmht.org/style/"
   *      {b.css}.contentLocation = "http://unmht.org/b.css"
   *      {x.png}.contentLocation = "http://unmht.org/style/x.png"
   *   1. {a.css}.referredBaseDir = {x.html}.baseDir
   *                                "http://unmht.org/"
   *   2. Z = {a.css}
   *      R = "./b.css"
   *      A = {a.css}.baseDir + R
   *        = "http://unmht.org/style/b.css"
   *      B = {a.css}.referredBaseDir + R
   *        = "http://unmht.org/b.css"
   *   3. A != {b.css}.contentLocation
   *      B == {b.css}.contentLocation
   *      # a.css から b.css が参照できる
   *      {b.css}.referredBaseDir = {a.css}.baseDir
   *                                "http://unmht.org/style/"
   *   2. Z = {b.css}
   *      A = {b.css}.baseDir + R
   *        = "http://unmht.org/" + R
   *      B = {b.css}.referredBaseDir + R
   *        = "http://unmht.org/style/" + R
   *      # b.css から "./x.png" で参照されたファイル x.png が
   *      #   {x.png}.contentLocation = "http://unmht.org/x.png"
   *      # となっていても
   *      #   {x.png}.contentLocation = "http://unmht.org/style/x.png"
   *      # となっていても参照できる
   *
   * [問題]
   *   誤って生成された Content-Location に一致するファイルが
   *   同 MHT 内に存在した場合これらを区別する事はできない
   * @type {string}
   */
  this.referredBaseDir = "";

  /**
   * findStartPart のキャッシュ
   * @type {arMIMEPart}
   */
  this.startPart = null;

  /* ==== ql_unmht mod: isStartPart: BEGIN ==== */
  /**
   * 開始パートか
   * @type {boolean}
   */
  this.isStartPart = false;
  /* ==== ql_unmht mod: isStartPart: END ==== */

  Object.seal(this);
}
UnMHTExtractParam.prototype = Object.freeze({
});

/**
 * ファイル全体の展開情報
 *
 * @constructor
 */
function UnMHTExtractFileInfo() {
  /**
   * 展開したファイル名の URI
   * @type {string}
   */
  this.original = "";

  /**
   * 元のファイルのソース
   * @type {string}
   */
  this.source = "";

  /**
   * 開始ページの URI
   * @type {string}
   */
  this.baseURI = "";

  /**
   * 開始ページのパート
   * @type {arMIMEPart}
   */
  this.startPart = null;

  /**
   * トップレベルのパート
   * @type {arMIMEPart}
   */
  this.topPart = null;

  /**
   * Subject の値
   * @type {string}
   */
  this.subject = "";

  /**
   * Date の値
   * @type {Date}
   */
  this.date = null;

  /**
   * mht ファイルの中にあるパート
   * @type {Array.<arMIMEPart>}
   */
  this.parts = [];

  /**
   * 参照できるパート
   * @type {Map.<string,arMIMEPart>}
   */
  this.refParts = new Map();

  /**
   * Content-ID とパートのマップ
   * @type {Map.<string,arMIMEPart>}
   */
  this.cids = new Map();

  /**
   * 展開時刻
   * @type {Date}
   */
  this.extractDate = null;

  /**
   * 最終アクセス時刻
   * @type {Date}
   */
  this.lastAccessDate = null;

  /**
   * 全キャッシュのサイズ
   * @type {number}
   */
  this.size = 0;

  Object.seal(this);
}
UnMHTExtractFileInfo.prototype = Object.freeze({
  /**
   * データを開放する
   */
  destruct: function() {
    for (let part of this.parts) {
      part.eParam.content = null;
      part.eParam = null;
    }
    this.parts = null;

    if (this.topPart) {
      this.topPart.destruct();
      this.topPart = null;
    }

    this.startPart = null;
    this.refParts = null;
    this.source = null;
  }
});

/**
 * ファイルの展開
 *
 * @class
 */
let UnMHTExtractor = Object.freeze({
  /**
   * mht ファイルを展開する
   *
   * @param   {string} originalURISpec
   *          展開したファイル名の URI 表記
   * @param   {string} text
   *          mht ファイルの内容
   * @returns {UnMHTExtractFileInfo}
   *          展開情報
   */
  extractMHT: function(originalURISpec, text) {
    let eFileInfo = new UnMHTExtractFileInfo();

    /* とりあえず特殊な文字はエスケープしておく */
    eFileInfo.original
      = originalURISpec
      .replace(/[\(\)\'\"\[\] ]/g, function(matched) {
        let hexString
          = "0" + matched.charCodeAt(0).toString(16).toUpperCase();
        return "%" + hexString.slice(-2);
      });

    /* ==== ql_unmht mod: remove: unmht scheme: BEGIN ==== */
    eFileInfo.baseURI = eFileInfo.original;
    /* ==== ql_unmht mod: remove: unmht scheme: END ==== */

    eFileInfo.source = text;

    /* ==== ql_unmht mod: remove unused: date ==== */

    eFileInfo.topPart = arMIMEDecoder.decodeMessage(text);
    if (!eFileInfo.topPart) {
      /* 改行が LF のみ、CR のみを想定してもう一度変換 */
      let crlfText = text.replace(/\r|\n/g, "\r\n");
      eFileInfo.topPart = arMIMEDecoder.decodeMessage(crlfText);
    }

    if (!eFileInfo.topPart || !eFileInfo.topPart.findStartPart()) {
      /* 展開に失敗した場合 */

      let createDummyMessage = function(mimetype, body) {
        let data
          = "From: <Created by UnMHT>" + "\r\n"
          + "Content-Type: " + mimetype + "\r\n"
          + "\r\n"
          + body;

        return data;
      };

      let maybeHTML= false;
      if (!/\.(eml|mbs)$/i.test(originalURISpec) && /^\s*</.test(text)) {
        maybeHTML = true;
      }

      if (maybeHTML) {
        eFileInfo.topPart
          = arMIMEDecoder.decodeMessage(createDummyMessage("text/html; charset=\"UTF-8\"", text));
      } else {
        eFileInfo.topPart
          = arMIMEDecoder.decodeMessage(createDummyMessage("text/plain; charset=\"UTF-8\"", text));
      }
    }

    eFileInfo.subject = eFileInfo.topPart.subject;

    eFileInfo.date = eFileInfo.topPart.date;

    let baseDir = "thismessage:///";
    if (originalURISpec) {
      baseDir = arPathUtils.getBaseDir(originalURISpec);
    }
    this._createExtractParam(eFileInfo, eFileInfo.topPart,
                             baseDir, "", "1");

    eFileInfo.startPart = eFileInfo.topPart.eParam.startPart;

    this._setRefName(eFileInfo);

    for (let part of eFileInfo.parts) {
      UnMHTContentModifier.modifyContents(eFileInfo, part);
    }

    /* ==== ql_unmht mod: remove: pref: BEGIN ==== */
    this._skipPPTWarning(eFileInfo);
    /* ==== ql_unmht mod: remove: pref: END ==== */

    this._createMixedDocument(eFileInfo);

    this._gatherPartsInfo(eFileInfo);

    /* ==== ql_unmht mod: remove unused: date ==== */

    /* ==== ql_unmht mod: remove code: cache ==== */

    return eFileInfo;
  },

  /* ==== private ==== */

  /**
   * パートの情報を作成する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   * @param   {arMIMEPart} part
   *          対象のパート
   * @param   {string} parentLocation
   *          親パートの解決済みの URI
   * @param   {string} parentPath
   *          親パートのパス
   * @param   {string} path
   *          パス
   */
  _createExtractParam: function(eFileInfo, part, parentLocation,
                                parentPath, path) {
    let eParam = new UnMHTExtractParam();

    eParam.parentPath = parentPath;
    eParam.path = path;

    if (part.contentID) {
      eParam.cid = part.contentID;
    }

    if (part.isMixed) {
      eParam.isMixed = true;
      eParam.content = "";

      eParam.mimetype = "text/html";
      eParam.charset = "utf-8";

      eParam.isHTML = true;
    } else {
      eParam.content = part.body;

      eParam.mimetype = part.mimetype;
      eParam.charset = part.charset;
      if (!eParam.mimetype) {
        eParam.mimetype = "text/plain";
        if (!eParam.charset) {
          eParam.charset = "us-ascii";
        }
      }
      if (eParam.mimetype == "text/css") {
        eParam.isCSS = true;
      } else if (eParam.mimetype == "text/html" ||
                 eParam.mimetype == "application/xhtml+xml") {
        eParam.isHTML = true;
      }

      if (eParam.mimetype == "application/octet-stream" &&
          part.body.slice(0, 32).contains("<")) {
        /* CGI 生成のページ等が application/octet-stream として
         * 保存されている場合がある */
        if (part.body.search(/<html/i) != -1) {
          eParam.mimetype = "text/html";
          eParam.isHTML = true;
        }
      }
    }

    eParam.location = arPathUtils.resolve(arPathUtils.getBaseDir(parentLocation),
                                          part.contentLocation);
    part.eParam = eParam;

    this._getPathInfo(part);

    eFileInfo.parts.push(part);

    if (part.isMultipart) {
      let i = 1;
      for (let p of part.parts) {
        this._createExtractParam(eFileInfo, p, eParam.location,
                                 path + ".", path + "." + i);
        i += 1;
      }
    }

    part.eParam.startPart = part.findStartPart();
  },

  /**
   * パスの情報を取得する
   *
   * @param   {arMIMEPart} part
   *          対象のパート
   */
  _getPathInfo: function(part) {
    let eParam = part.eParam;

    let location = eParam.location;

    let info = arPathUtils.getPathInfo(location);

    if (info.isMHTML) {
      eParam.leafName = info.mhtmlFilename || "";
      eParam.fragment = info.mhtmlFragment || "";

      let baseInfo = info.clone();
      baseInfo.mhtmlFilename = undefined;
      baseInfo.mhtmlFragment = undefined;
      eParam.baseDir = arPathUtils.createPath(baseInfo);
    } else if (info.type & arPathTypeMask.DATA) {
      eParam.baseDir = location;
      eParam.leafName = "";
      eParam.fragment = "";
    } else {
      // DATA 以外は pathComponents が必ず 1 個以上存在する
      eParam.leafName = info.pathComponents[info.pathComponents.length - 1];
      eParam.fragment = info.fragment || "";

      let baseInfo = info.clone();
      if (baseInfo.pathComponents.length) {
        baseInfo.pathComponents.pop();
      }
      baseInfo.query = undefined;
      baseInfo.fragment = undefined;
      eParam.baseDir = arPathUtils.createPath(baseInfo);
    }

    if (part.contentDispositionFilename) {
      eParam.leafName = part.contentDispositionFilename;
    }

    eParam.referredBaseDir = "";

    let noFragmentInfo = info.clone();
    noFragmentInfo.mhtmlFragment = undefined;
    noFragmentInfo.fragment = undefined;
    let noFragment = arPathUtils.createPath(noFragmentInfo, false);

    eParam.normalLocation = UnMHTCache.normalizeName(noFragment);
    eParam.normalLeafName = UnMHTCache.normalizeName(eParam.leafName);
    eParam.normalFragment = UnMHTCache.normalizeName(eParam.fragment);
  },

  /**
   * 参照名を重複しないように設定する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   */
  _setRefName: function(eFileInfo) {
    /* ==== ql_unmht mod: use cid as refName: BEGIN ==== */
    eFileInfo.parts.forEach(function(part) {
        part.eParam.refName = part.eParam.cid;
      });
    /* ==== ql_unmht mod: use cid as refName: END ==== */
  },

  /* ==== ql_unmht mod: remove: unused function: _getRefBaseAndExt ==== */

  /**
   * PowerPoint の警告ページをスキップする
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   */
  _skipPPTWarning: function(eFileInfo) {
    let isPPT = false;
    let framePart = null;

    for (let part of eFileInfo.parts) {
      if (part.eParam.refName == "frame.htm") {
        framePart = part;
      }

      if (part.eParam.isHTML &&
          part.eParam.content.contains("xmlns:v=\"urn:schemas-microsoft-com:vml\"")) {
        isPPT = true;
      }
    }

    if (isPPT && framePart) {
      eFileInfo.startPart = framePart;
    }
  },

  /**
   * multipart/mixed なドキュメントを作成する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   */
  _createMixedDocument: function(eFileInfo) {
    let createBody = function(part,
                              charsets,
                              doctype, htmlAttrs, headContents, bodyAttrs) {
      let isAttachment = false;
      if (part.contentDispositionType &&
          part.contentDispositionType != "inline") {
        isAttachment = true;
      }

      let getUTF8Content = function(part) {
        let content = part.eParam.content;

        if (part.eParam.charset &&
            part.eParam.charset.toLowerCase() == "utf-8") {
          return content;
        }

        if (part.eParam.charset) {
          return toUTF8(arUconv.toUnicode(content, part.eParam.charset));
        }

        return content;
      };

      let content;
      if ((!isAttachment && part.eParam.mimetype == "text/html") ||
          part.eParam.isMixed) {
        if (part.eParam.charset) {
          charsets.add(part.eParam.charset);
        }

        content
          = getUTF8Content(part)
          .replace(this._htmlbodyRe, function(matched, name, attrs) {
            attrs
              .replace(this._attrRe, function(matched, attr,
                                              dqvalue,
                                              qvalue,
                                              value) {
                if (dqvalue) {
                  value = dqvalue;
                } else if (qvalue) {
                  value = qvalue;
                }

                if (name.toLowerCase() == "html") {
                  htmlAttrs.set(attr.toLowerCase(), value);
                } else if (name.toLowerCase() == "body") {
                  bodyAttrs.set(attr.toLowerCase(), value);
                }
              });

            return "";
          }.bind(this))
          .replace(this._headRe, function(matched, content) {
            headContents.push(content);

            return "";
          })
          .replace(this._doctypeRe, function(matched, name) {
            if (name.toLowerCase() == "doctype") {
              doctype.value = matched;
            }
            return "";
          });
      } else if (!isAttachment && part.eParam.mimetype == "text/plain") {
        if (part.eParam.charset) {
          charsets.add(part.eParam.charset);
        }

        content
          = "<pre>"
          + arDOMUtils.escapeEntity(getUTF8Content(part))
          .replace(/[ \t]/g, "&#xa0;")
          + "</pre>";
      } else {
        let href
          = arDOMUtils.escapeEntity(eFileInfo.baseURI + part.eParam.refName);
        let filename
          = arDOMUtils.escapeEntity(part.eParam.leafName || "???");

        if (!isAttachment && part.contentType == "image") {
          content
            = "<div style=\"text-align: center;\">"
            + "<img src=\"" + href + "\" alt=\"" + filename + "\" />"
            + "</div>";
        } else {
          content = "<a href=\"" + href + "\">" + filename + "</a>";
        }

        content = toUTF8(content);
      }

      if (part.contentDispositionFilename) {
        content
          = "<fieldset style=\"border: 1px solid graytext;\">"
          + "<legend style=\"color: graytext; font-size: 80%;\">"
          + toUTF8(part.contentDispositionFilename)
          + "</legend>"
          + content
          + "</fieldset>";
      }

      return content;
    }.bind(this);

    /* ネストした multipart/mixed のために後ろから解決する */
    for (let part of eFileInfo.parts.slice().reverse()) {
      if (!part.eParam.isMixed) {
        continue;
      }

      let charsets = new Set();
      let doctype = { value: "" };
      let htmlAttrs = new Map();
      let headContents = [];
      let bodyAttrs = new Map();
      let body = part.parts
        .map(p => createBody(p.eParam.startPart,
                             charsets,
                             doctype, htmlAttrs, headContents, bodyAttrs))
        .join("");

      let a = [];
      for (let p of part.parts) {
        a.push(p.eParam.path);
        for (let path of p.eParam.mixedPath) {
          a.push(path);
        }
        a.push(p.eParam.startPart.eParam.path);
      }
      part.eParam.mixedPath = a;

      let htmlAttrString
        = [...htmlAttrs].map(([k, v]) => (" " + k + "=" + v + ""));
      let bodyAttrString
        = [...bodyAttrs].map(([k, v]) => (" " + k + "=" + v + ""));

      part.eParam.content
        = (doctype.value ? (doctype.value + "\r\n") : "")
        + "<html" + htmlAttrString + ">\r\n"
        + "<head>\r\n"
        + headContents.join("\r\n")
        + "</head>\r\n"
        + "<body" + bodyAttrString + ">\r\n"
        + body
        + "</body>\r\n"
        + "</html>\r\n";

      if (charsets.size == 1) {
        part.eParam.charset = [...charsets.keys()][0];

        part.eParam.content
          = arUconv.fromUnicodeWithEntity(part.eParam.content,
                                          part.eParam.charset);
      }
    }
  },

  /**
   * パートの情報を収集する
   *
   * @param   {UnMHTExtractFileInfo} eFileInfo
   *          展開情報
   */
  _gatherPartsInfo: function(eFileInfo) {
    eFileInfo.size = eFileInfo.source.length;

    for (let part of eFileInfo.parts) {
      eFileInfo.refParts.set(part.eParam.refName, part);
      if (part.eParam.cid) {
        eFileInfo.cids.set(part.eParam.cid, part);
      }

      eFileInfo.size += part.eParam.content.length;
    }
  },

  _attrRe: /\s*([\?A-Za-z0-9_:\-]+)\s*=\s*(?:(\"(?:\\\"|[^\"])*\")|(\'(?:\\\'|[^\'])*\')|([^\"\'\\ >]+))/g,
  _htmlbodyRe: /<\/?(html|body)(\s(?:\"(?:\\\"|[^\"])*\"|\'(?:\\\'|[^\'])*\'|[^\"\'\\>])*)?>/ig,
  _headRe: /<head>([^\0]*)<\/head>/i,
  _doctypeRe: /<!([\?A-Za-z0-9_:\-]+)(?:\s(?:\"(?:\\\"|[^\"])*\"|\'(?:\\\'|[^\'])*\'|[^\"\'\\>])*)?>/ig
});

return UnMHTExtractor;

})();

/* ---- main ---- */

/* global cidMod */
/* global text */

let eFileInfo = null;
try {
  eFileInfo = UnMHTExtractor.extractMHT(cidMode ? "cid:" : "http://ql_unmht/", text, true);

  for (let p of eFileInfo.parts) {
    if (p.eParam && p == eFileInfo.startPart) {
      p.eParam.isStartPart = true;
    }
  }
} catch (e) {
}

eFileInfo;
