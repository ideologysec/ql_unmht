/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is UnMHT for QuickLook.
 *
 * The Initial Developer of the Original Code is arai.
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): arai <arai_a@mac.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * ***** END LICENSE BLOCK ***** */

#include "unmht.h"

#include <stdint.h>
#include <jsapi.h>
#include <jsfriendapi.h>

#include "conv.h"
#include "JSWrapper.hh"

/**
 * JavaScript 用の print 関数
 * 文字列を出力する
 * デバッグ用
 *
 * @param   cx
 *          実行コンテキスト
 * @param   argc
 *          引数の数
 * @param   vp
 *          スタック
 * @returns 成功したか
 */
static JSBool
printFunc(JSContext *cx, unsigned argc, jsval *vp) {
  JS::CallArgs args = CallArgsFromVp(argc, vp);
  unsigned i;
  for (i = 0; i < args.length(); i++) {
    JSString *str = JS_ValueToString(cx, args[i]);
    if (!str) {
      return false;
    }
    char *bytes;
    size_t length;
    if (!ConvertToBinary(cx, str, &bytes, &length)) {
      return false;
    }
    if (i) {
      fputc(' ', stdout);
    }
    fwrite(bytes, 1, length, stdout);
    free(bytes);
  }
  fputc('\n', stdout);
  fflush(stdout);

  args.rval().setUndefined();
  return true;
}

/**
 * エンコードされた文字列をデコードする
 *
 * @param   ascii
 *          BASE64 エンコードされた文字列
 * @param   asciiLength
 *          BASE64 エンコードされた文字列の長さ
 * @param   binary
 *          (出力) デコードした文字列
 * @param   binaryLength
 *          (出力) デコードした文字列の長さ
 * @returns 成功したか
 */
bool
atob(const char *ascii, size_t asciiLength,
     char **binary, size_t *binaryLength) {
  (*binary) = reinterpret_cast<char *>(malloc(sizeof(char) * (asciiLength + 1)));
  const char *b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  size_t i, j;

  for (i = 0, j = 0; i < asciiLength; i += 4) {
    char part1, part2, part3, part4;
    char *pos = strchr(b, ascii[i]);
    if (pos != NULL) {
      part1 = pos - b;
    } else {
      return false;
    }
    pos = strchr(b, ascii[i + 1]);
    if (pos != NULL) {
      part2 = pos - b;
    } else {
      return false;
    }
    pos = strchr(b, ascii[i + 2]);
    if (pos != NULL) {
      part3 = pos - b;
    } else {
      return false;
    }
    pos = strchr(b, ascii[i + 3]);
    if (pos != NULL) {
      part4 = pos - b;
    } else {
      return false;
    }

    (*binary)[j] = (part1 << 2) | (part2 >> 4);
    j ++;
    if (part3 != 64) {
      (*binary)[j] = ((part2 & 0x0f) << 4) | (part3 >> 2);
      j ++;
    }
    if (part3 != 64 && part4 != 64) {
      (*binary)[j] = ((part3 & 0x03) << 6) | (part4);
      j ++;
    }
  }
  *binaryLength = j;
  return true;
}

/**
 * JavaScript 用の atob 関数
 * BASE64 をデコードする
 *
 * @param   cx
 *          実行コンテキスト
 * @param   argc
 *          引数の数
 * @param   vp
 *          スタック
 * @returns 成功したか
 */
static JSBool
atobFunc(JSContext *cx, unsigned argc, jsval *vp) {
  JS::CallArgs args = CallArgsFromVp(argc, vp);
  if (argc != 1) {
    return false;
  }
  char *ascii;
  size_t asciiLength;
  ConvertToString(cx, JS_ValueToString(cx, args[0]), &ascii, &asciiLength);

  char *binary;
  size_t binaryLength;
  if (!atob(ascii, asciiLength, &binary, &binaryLength)) {
    free(ascii);
    args.rval().setUndefined();

    JS_ReportError(cx, "Failed to decode base64 string!");
    return false;
  }

  free(ascii);

  args.rval().setString(JS_NewStringCopyN(cx, binary, binaryLength));

  free(binary);

  return true;
}

/**
 * JavaScript 用の ConvertToUnicode 関数
 * 指定したエンコーディングの文字列を UTF16 に変換する
 *
 * @param   cx
 *          実行コンテキスト
 * @param   argc
 *          引数の数
 * @param   vp
 *          スタック
 * @returns 成功したか
 */
static JSBool
ConvertToUnicodeFunc(JSContext *cx, unsigned argc, jsval *vp) {
  JS::CallArgs args = CallArgsFromVp(argc, vp);
  if (argc != 2) {
    return false;
  }

  char *text;
  size_t textLength;
  ConvertToBinary(cx, JS_ValueToString(cx, args[0]), &text, &textLength);

  char *charset;
  size_t charsetLength;
  ConvertToBinary(cx, JS_ValueToString(cx, args[1]), &charset, &charsetLength);

  unsigned short *result;
  uint32_t resultLength;
  if (!convertToUnicode(text, textLength, charset, &result, &resultLength)) {
    free(text);
    free(charset);
    args.rval().setUndefined();

    JS_ReportError(cx, "Failed to convert to unicode!");
    return false;
  }
  free(text);
  free(charset);

  args.rval().setString(JS_NewUCStringCopyN(cx, result, resultLength));

  free(result);

  return true;
}

/**
 * JavaScript 用の ConvertToUnicode 関数
 * UTF16 の文字列を指定したエンコーディングに変換する
 *
 * @param   cx
 *          実行コンテキスト
 * @param   argc
 *          引数の数
 * @param   vp
 *          スタック
 * @returns 成功したか
 */
static JSBool
ConvertFromUnicodeFunc(JSContext *cx, unsigned argc, jsval *vp) {
  JS::CallArgs args = CallArgsFromVp(argc, vp);
  if (argc != 2) {
    return false;
  }

  jschar *text;
  size_t textLength;
  ConvertToUCBinary(cx, JS_ValueToString(cx, args[0]), &text, &textLength);

  char *charset;
  size_t charsetLength;
  ConvertToBinary(cx, JS_ValueToString(cx, args[1]), &charset, &charsetLength);

  char *result;
  uint32_t resultLength;
  if (!convertFromUnicode(text, textLength, charset, &result, &resultLength)) {
    free(text);
    free(charset);
    args.rval().setUndefined();

    JS_ReportError(cx, "Failed to convert from unicode!");
    return false;
  }
  free(text);
  free(charset);

  args.rval().setString(JS_NewStringCopyN(cx, result, resultLength));

  free(result);

  return true;
}

/**
 * 関数情報
 */
static JSFunctionSpecWithHelp funcs[] = {
  JS_FN_HELP("print", printFunc, 0, 0,
             "print([exp ...])",
             "  Evaluate and print expressions to stdout."),
  JS_FN_HELP("atob", atobFunc, 0, 0,
             "atob(str)",
             "  Decode BASE64 encoded string."),
  JS_FN_HELP("ConvertFromUnicode", ConvertFromUnicodeFunc, 0, 0,
             "ConvertFromUnicode(str, charset)",
             "  Convert String from Unicode to specified charset."),
  JS_FN_HELP("ConvertToUnicode", ConvertToUnicodeFunc, 0, 0,
             "ConvertToUnicode(str, charset)",
             "  Convert String from specified charset to Unicode."),
  JS_FS_HELP_END
};

extern "C" {

efileinfo *
extract(const char *text, const char *script, int32_t cidMode) {
  efileinfo *info = NULL;
  JSWrapper *js = NULL;

#define CLEANUP()                               \
  if (info) {                                   \
    free(info);                                 \
    info = NULL;                                \
  }                                             \
  if (js) {                                     \
    delete js;                                  \
    js = NULL;                                  \
  }

  js = new JSWrapper();
  if (!js->init()) {
    CLEANUP();
    return NULL;
  }

  if (!js->defineGlobalFuncs(funcs)) {
    CLEANUP();
    return NULL;
  }

  if (!js->defineGlobalStringProp("text", text)) {
    CLEANUP();
    return NULL;
  }

  if (!js->defineGlobalBoolProp("cidMode", cidMode)) {
    CLEANUP();
    return NULL;
  }

  JS::RootedValue eFileInfo(js->cx);
  const char *filename = "ql_unmht.js";
  unsigned lineno = 1;
  if (!js->evaluate(script, filename, lineno, eFileInfo.address())) {
    CLEANUP();
    return NULL;
  }

  if (eFileInfo.isNullOrUndefined()) {
    CLEANUP();
    return NULL;
  }

  JS::RootedValue parts(js->cx);
  JS::RootedValue part(js->cx);
  JS::RootedValue eParam(js->cx);
  size_t length;

  info = reinterpret_cast<efileinfo *>(malloc(sizeof(efileinfo)));
  info->parts = NULL;

  if (!js->getStringProp(eFileInfo, "baseURI", &info->baseURI, &length)) {
    CLEANUP();
    return NULL;
  }

  if (!js->getStringProp(eFileInfo, "subject", &info->subject, &length)) {
    CLEANUP();
    return NULL;
  }

  if (!js->getProp(eFileInfo, "parts", parts.address())) {
    CLEANUP();
    return NULL;
  }
  if (parts.isNullOrUndefined()) {
    CLEANUP();
    return NULL;
  }

  if (!js->getUInt32Prop(parts, "length", &info->partsCount)) {
    CLEANUP();
    return NULL;
  }

  info->parts = reinterpret_cast<mimepart **>(malloc(sizeof(mimepart *) * info->partsCount));
  for (size_t i = 0; i < info->partsCount; i ++) {
    info->parts[i] = NULL;
  }
  info->startPart = NULL;

  char buf[256];

  for (size_t i = 0; i < info->partsCount; i ++) {
    mimepart *p = reinterpret_cast<mimepart *>(malloc(sizeof(mimepart)));
    info->parts[i] = p;
    p->charset = NULL;
    p->mimetype = NULL;
    p->cid = NULL;
    p->content = NULL;

    sprintf(buf, "%lu", i);
    if (!js->getProp(parts, buf, part.address())) {
      CLEANUP();
      return NULL;
    }
    if (part.isNullOrUndefined()) {
      CLEANUP();
      return NULL;
    }

    if (!js->getStringProp(part, "charset", &p->charset, &length)) {
      CLEANUP();
      return NULL;
    }

    if (!js->getStringProp(part, "mimetype", &p->mimetype, &length)) {
      CLEANUP();
      return NULL;
    }

    if (!js->getProp(part, "eParam", eParam.address())) {
      CLEANUP();
      return NULL;
    }
    if (eParam.isNullOrUndefined()) {
      CLEANUP();
      return NULL;
    }

    if (!js->getStringProp(eParam, "cid", &p->cid, &length)) {
      CLEANUP();
      return NULL;
    }

    if (!js->getBinaryProp(eParam, "content", &p->content, &p->contentSize)) {
      CLEANUP();
      return NULL;
    }

    bool isStartPart;
    if (!js->getBoolProp(eParam, "isStartPart", &isStartPart)) {
      CLEANUP();
      return NULL;
    }
    if (isStartPart) {
      info->startPart = p;
    }
  }

  if (info->startPart == NULL) {
    CLEANUP();
    return NULL;
  }

  js->term();
  delete js;

  return info;
}

void
delete_efileinfo(efileinfo *info) {
  if (info->parts) {
    for (int32_t i = 0; i < info->partsCount; i ++) {
      mimepart *p = info->parts[i];
      if (p) {
        if (p->charset != NULL) {
          free(p->charset);
        }
        if (p->mimetype != NULL) {
          free(p->mimetype);
        }
        if (p->cid != NULL) {
          free(p->cid);
        }
        if (p->content != NULL) {
          free(p->content);
        }

        free(p);
      }
    }

    free(info->parts);
  }
  if (info->baseURI != NULL) {
    free(info->baseURI);
  }
  if (info->subject != NULL) {
    free(info->subject);
  }
  free(info);
}

}
